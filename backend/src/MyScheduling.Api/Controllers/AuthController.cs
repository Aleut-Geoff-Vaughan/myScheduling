using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Core.Entities;
using BCrypt.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MyScheduling.Core.Entities;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private const int MaxFailedLoginAttempts = 5;
    private const int LockoutDurationMinutes = 30;

    public AuthController(
        MySchedulingDbContext context,
        ILogger<AuthController> logger,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Find user by email with their tenant memberships
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                _logger.LogWarning("Login attempt for non-existent email: {Email}", request.Email);
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Check if user is inactive
            if (!user.IsActive)
            {
                _logger.LogWarning("Login attempt for inactive user: {Email}", request.Email);
                return Unauthorized(new { message = "Account is inactive. Please contact your administrator." });
            }

            // Check if account is locked out
            if (user.LockedOutUntil.HasValue && user.LockedOutUntil.Value > DateTime.UtcNow)
            {
                var remainingMinutes = (int)(user.LockedOutUntil.Value - DateTime.UtcNow).TotalMinutes + 1;
                _logger.LogWarning("Login attempt for locked out user: {Email}. Locked until {LockedOutUntil}",
                    request.Email, user.LockedOutUntil.Value);
                return Unauthorized(new
                {
                    message = $"Account is temporarily locked due to too many failed login attempts. Please try again in {remainingMinutes} minutes."
                });
            }

            // Verify password
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                _logger.LogError("User {Email} has no password hash set", request.Email);
                return Unauthorized(new { message = "Account configuration error. Please contact your administrator." });
            }

            bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!passwordValid)
            {
                // Increment failed login attempts
                user.FailedLoginAttempts++;

                if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
                {
                    user.LockedOutUntil = DateTime.UtcNow.AddMinutes(LockoutDurationMinutes);
                    _logger.LogWarning("User {Email} locked out after {Attempts} failed attempts. Locked until {LockedOutUntil}",
                        request.Email, user.FailedLoginAttempts, user.LockedOutUntil.Value);
                }
                else
                {
                    _logger.LogWarning("Failed login attempt {Attempt}/{Max} for user {Email}",
                        user.FailedLoginAttempts, MaxFailedLoginAttempts, request.Email);
                }

                await _context.SaveChangesAsync();

                var remaining = MaxFailedLoginAttempts - user.FailedLoginAttempts;
                var message = user.FailedLoginAttempts >= MaxFailedLoginAttempts
                    ? $"Account locked due to too many failed login attempts. Please try again in {LockoutDurationMinutes} minutes."
                    : remaining > 0
                        ? $"Invalid email or password. {remaining} attempt(s) remaining before account lockout."
                        : "Invalid email or password.";

                return Unauthorized(new { message });
            }

            // Successful login - reset failed attempts and update last login
            user.FailedLoginAttempts = 0;
            user.LockedOutUntil = null;
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successful login for user {Email}", request.Email);

            // Build tenant access list
            var tenantAccess = user.TenantMemberships
                .Where(tm => tm.IsActive)
                .Select(tm => new TenantAccessInfo
                {
                    TenantId = tm.TenantId,
                    TenantName = tm.Tenant.Name,
                    Roles = tm.Roles.Select(r => r.ToString()).ToArray()
                })
                .ToList();

            // Generate JWT token
            var token = GenerateJwtToken(user, tenantAccess);

            var response = new LoginResponse
            {
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                UserId = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                IsSystemAdmin = user.IsSystemAdmin,
                TenantAccess = tenantAccess
            };

            await LogLoginAsync(user, true);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", request.Email);
            await LogLoginAsync(null, false, request.Email);
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Since we're not using JWT yet, just return success
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            // Get user ID from header (will be from JWT in next phase)
            if (!Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) ||
                !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not provided" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Verify current password
            if (string.IsNullOrEmpty(user.PasswordHash) ||
                !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                _logger.LogWarning("Failed password change attempt for user {UserId}: incorrect current password", userId);
                return BadRequest(new { message = "Current password is incorrect" });
            }

            // Validate new password
            var validationError = ValidatePassword(request.NewPassword);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            // Hash and save new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
            user.PasswordChangedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedByUserId = userId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed successfully for user {UserId}", userId);
            return Ok(new { message = "Password changed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new { message = "An error occurred while changing password" });
        }
    }

    private async Task LogLoginAsync(User? user, bool isSuccess, string? emailOverride = null)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var ip = httpContext?.Connection?.RemoteIpAddress?.ToString();
            var userAgent = httpContext?.Request?.Headers["User-Agent"].FirstOrDefault();

            var audit = new LoginAudit
            {
                Id = Guid.NewGuid(),
                UserId = user?.Id,
                Email = emailOverride ?? user?.Email,
                IsSuccess = isSuccess,
                IpAddress = ip,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow
            };

            _context.LoginAudits.Add(audit);
            await _context.SaveChangesAsync();
        }
        catch (Exception logEx)
        {
            _logger.LogWarning(logEx, "Failed to log login audit");
        }
    }

    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Validate password
            var validationError = ValidatePassword(request.Password);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            // Hash and save password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);
            user.PasswordChangedAt = DateTime.UtcNow;
            user.FailedLoginAttempts = 0;
            user.LockedOutUntil = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password set for user {UserId}", request.UserId);
            return Ok(new { message = "Password set successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting password for user {UserId}", request.UserId);
            return StatusCode(500, new { message = "An error occurred while setting password" });
        }
    }

    [HttpPost("unlock-account")]
    public async Task<IActionResult> UnlockAccount([FromBody] UnlockAccountRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.FailedLoginAttempts = 0;
            user.LockedOutUntil = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Account unlocked for user {UserId}", request.UserId);
            return Ok(new { message = "Account unlocked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking account for user {UserId}", request.UserId);
            return StatusCode(500, new { message = "An error occurred while unlocking account" });
        }
    }

    private string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Password is required";
        }

        if (password.Length < 8)
        {
            return "Password must be at least 8 characters long";
        }

        if (password.Length > 128)
        {
            return "Password must not exceed 128 characters";
        }

        if (!password.Any(char.IsUpper))
        {
            return "Password must contain at least one uppercase letter";
        }

        if (!password.Any(char.IsLower))
        {
            return "Password must contain at least one lowercase letter";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Password must contain at least one number";
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return "Password must contain at least one special character";
        }

        return null;
    }

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user, List<TenantAccessInfo> tenantAccess)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "MyScheduling-Super-Secret-Key-For-Development-Only-Change-In-Production-2024";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MyScheduling";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "MyScheduling";
        var jwtExpirationHours = int.Parse(_configuration["Jwt:ExpirationHours"] ?? "8");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim("IsSystemAdmin", user.IsSystemAdmin.ToString())
        };

        // Add tenant-specific claims
        foreach (var tenant in tenantAccess)
        {
            claims.Add(new Claim("TenantId", tenant.TenantId.ToString()));
            claims.Add(new Claim($"Tenant_{tenant.TenantId}_Name", tenant.TenantName));

            foreach (var role in tenant.Roles)
            {
                claims.Add(new Claim($"Tenant_{tenant.TenantId}_Role", role));
            }
        }

        var expiresAt = DateTime.UtcNow.AddHours(jwtExpirationHours);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}

public class LoginRequest
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

public class LoginResponse
{
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public Guid UserId { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public bool IsSystemAdmin { get; set; }
    public List<TenantAccessInfo> TenantAccess { get; set; } = new();
}

public class TenantAccessInfo
{
    public Guid TenantId { get; set; }
    public required string TenantName { get; set; }
    public string[] Roles { get; set; } = Array.Empty<string>();
}

public class ChangePasswordRequest
{
    public required string CurrentPassword { get; set; }
    public required string NewPassword { get; set; }
}

public class SetPasswordRequest
{
    public required Guid UserId { get; set; }
    public required string Password { get; set; }
}

public class UnlockAccountRequest
{
    public required Guid UserId { get; set; }
}

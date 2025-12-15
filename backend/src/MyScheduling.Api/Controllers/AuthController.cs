using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using BCrypt.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MyScheduling.Api.Services;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMagicLinkService _magicLinkService;
    private readonly IEmailService _emailService;
    private readonly IAzureAdTokenValidator? _azureAdTokenValidator;
    private const int MaxFailedLoginAttempts = 5;
    private const int LockoutDurationMinutes = 30;

    public AuthController(
        MySchedulingDbContext context,
        ILogger<AuthController> logger,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor,
        IMagicLinkService magicLinkService,
        IEmailService emailService,
        IAzureAdTokenValidator? azureAdTokenValidator = null)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _magicLinkService = magicLinkService;
        _emailService = emailService;
        _azureAdTokenValidator = azureAdTokenValidator;
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

            // Return detailed error info to help diagnose production issues
            var errorDetails = new
            {
                message = "An error occurred during login",
                error = ex.Message,
                innerError = ex.InnerException?.Message,
                stackTrace = ex.StackTrace?.Split('\n').Take(5).ToArray()
            };
            return StatusCode(500, errorDetails);
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

    // ==================== MAGIC LINK ENDPOINTS ====================

    /// <summary>
    /// Request a magic link for passwordless login
    /// </summary>
    [HttpPost("magic-link/request")]
    public async Task<IActionResult> RequestMagicLink([FromBody] MagicLinkRequest request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            var result = await _magicLinkService.RequestMagicLinkAsync(request.Email, ip, userAgent);

            if (!result.Success)
            {
                // Still return OK to prevent enumeration
                return Ok(new { message = "If an account exists with this email, a login link has been sent." });
            }

            // If we have a token, send the email
            if (!string.IsNullOrEmpty(result.Token))
            {
                var baseUrl = _configuration["App:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
                var magicLinkUrl = $"{baseUrl}/auth/magic-link?token={result.Token}";

                var emailResult = await _emailService.SendMagicLinkEmailAsync(
                    result.Email!,
                    magicLinkUrl,
                    result.ExpiresAt ?? DateTime.UtcNow.AddMinutes(15),
                    ip);

                if (!emailResult.Success)
                {
                    _logger.LogError("Failed to send magic link email to {Email}: {Error}", result.Email, emailResult.ErrorMessage);
                    // Still return success to prevent enumeration
                }
            }

            return Ok(new { message = "If an account exists with this email, a login link has been sent." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting magic link for email: {Email}", request.Email);
            return Ok(new { message = "If an account exists with this email, a login link has been sent." });
        }
    }

    /// <summary>
    /// Verify a magic link token and log the user in
    /// </summary>
    [HttpPost("magic-link/verify")]
    public async Task<ActionResult<LoginResponse>> VerifyMagicLink([FromBody] MagicLinkVerifyRequest request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            var result = await _magicLinkService.ValidateMagicLinkAsync(request.Token, ip, userAgent);

            if (!result.Success || result.User == null)
            {
                return Unauthorized(new { message = result.ErrorMessage ?? "Invalid or expired link." });
            }

            var user = result.User;

            // Load tenant memberships if not already loaded
            await _context.Entry(user)
                .Collection(u => u.TenantMemberships)
                .Query()
                .Include(tm => tm.Tenant)
                .LoadAsync();

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

            await LogLoginAsync(user, true, loginMethod: "MagicLink");
            _logger.LogInformation("Successful magic link login for user {Email}", user.Email);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying magic link");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    /// <summary>
    /// Check if a magic link token is valid (without consuming it)
    /// </summary>
    [HttpGet("magic-link/check")]
    public async Task<IActionResult> CheckMagicLink([FromQuery] string token)
    {
        try
        {
            // We'll do a lightweight check - just see if the token format is valid
            // and hasn't been used. This doesn't consume the token.
            if (string.IsNullOrWhiteSpace(token))
            {
                return Ok(new { valid = false, message = "No token provided" });
            }

            // For now, just return a basic check - actual validation happens on verify
            return Ok(new { valid = true, message = "Token format is valid. Please complete login." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking magic link");
            return Ok(new { valid = false, message = "Error validating token" });
        }
    }

    // ==================== AZURE AD SSO ENDPOINTS ====================

    /// <summary>
    /// Check if Azure AD SSO is enabled and return configuration
    /// </summary>
    [HttpGet("sso/config")]
    public IActionResult GetSsoConfig()
    {
        var ssoEnabled = _azureAdTokenValidator?.IsEnabled ?? false;
        var clientId = _configuration["AzureAd:ClientId"] ?? "";
        var tenantId = _configuration["AzureAd:TenantId"] ?? "";
        var instance = _configuration["AzureAd:Instance"] ?? "https://login.microsoftonline.com/";

        return Ok(new SsoConfigResponse
        {
            Enabled = ssoEnabled,
            ClientId = ssoEnabled ? clientId : "",
            TenantId = ssoEnabled ? tenantId : "",
            Authority = ssoEnabled ? $"{instance.TrimEnd('/')}/{tenantId}" : "",
            RedirectUri = "" // Frontend will set this based on window.location.origin
        });
    }

    /// <summary>
    /// Exchange an Azure AD access token for a MyScheduling JWT
    /// The frontend obtains an Azure AD token via MSAL, then calls this endpoint
    /// </summary>
    [HttpPost("sso/login")]
    public async Task<ActionResult<LoginResponse>> SsoLogin([FromBody] SsoLoginRequest request)
    {
        try
        {
            if (_azureAdTokenValidator == null || !_azureAdTokenValidator.IsEnabled)
            {
                return BadRequest(new { message = "Azure AD SSO is not enabled" });
            }

            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Access token is required" });
            }

            // Validate the Azure AD token
            var validationResult = await _azureAdTokenValidator.ValidateTokenAsync(request.AccessToken);

            if (!validationResult.IsValid)
            {
                _logger.LogWarning("SSO login failed: {Error}", validationResult.ErrorMessage);
                await LogLoginAsync(null, false, validationResult.Email ?? "unknown", loginMethod: "AzureAD");
                return Unauthorized(new { message = validationResult.ErrorMessage ?? "Invalid token" });
            }

            // Get the email from the token - this is the SSO identifier
            var ssoEmail = validationResult.Email?.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(ssoEmail))
            {
                _logger.LogWarning("SSO login failed: No email in Azure AD token");
                return Unauthorized(new { message = "Unable to determine user email from Azure AD token" });
            }

            // Find user by:
            // 1. EntraObjectId field (contains the SSO email for the user)
            // 2. Fallback to Email field
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .FirstOrDefaultAsync(u =>
                    u.EntraObjectId.ToLower() == ssoEmail ||
                    u.Email.ToLower() == ssoEmail);

            if (user == null)
            {
                _logger.LogWarning("SSO login failed: No user found for email {Email}", ssoEmail);
                await LogLoginAsync(null, false, ssoEmail, loginMethod: "AzureAD");
                return Unauthorized(new
                {
                    message = "No account found for this Microsoft account. Please contact your administrator to create an account."
                });
            }

            // Check if user is active
            if (!user.IsActive)
            {
                _logger.LogWarning("SSO login attempt for inactive user: {Email}", ssoEmail);
                await LogLoginAsync(user, false, loginMethod: "AzureAD");
                return Unauthorized(new { message = "Account is inactive. Please contact your administrator." });
            }

            // Update EntraObjectId if it was matched by Email but EntraObjectId is empty
            if (string.IsNullOrEmpty(user.EntraObjectId) || user.EntraObjectId.ToLower() != ssoEmail)
            {
                user.EntraObjectId = ssoEmail;
                _logger.LogInformation("Updated EntraObjectId for user {UserId} to {Email}", user.Id, ssoEmail);
            }

            // Successful SSO login - update last login
            user.LastLoginAt = DateTime.UtcNow;
            user.FailedLoginAttempts = 0;
            user.LockedOutUntil = null;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successful SSO login for user {Email}", user.Email);

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

            // Generate our JWT token
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

            await LogLoginAsync(user, true, loginMethod: "AzureAD");
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during SSO login");
            return StatusCode(500, new { message = "An error occurred during SSO login" });
        }
    }

    private async Task LogLoginAsync(User? user, bool isSuccess, string? emailOverride = null, string loginMethod = "Password")
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
                Device = loginMethod, // Reusing Device field for login method
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

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(
        User user,
        List<TenantAccessInfo> tenantAccess,
        ImpersonationContext? impersonation = null)
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

        // Add impersonation claims if applicable
        if (impersonation != null)
        {
            claims.Add(new Claim("IsImpersonating", "true"));
            claims.Add(new Claim("OriginalUserId", impersonation.OriginalUserId.ToString()));
            claims.Add(new Claim("ImpersonationSessionId", impersonation.SessionId.ToString()));
        }

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

public class MagicLinkRequest
{
    public required string Email { get; set; }
}

public class MagicLinkVerifyRequest
{
    public required string Token { get; set; }
}

public class ImpersonationContext
{
    public Guid OriginalUserId { get; set; }
    public Guid SessionId { get; set; }
}

// SSO DTOs
public class SsoConfigResponse
{
    public bool Enabled { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Authority { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

public class SsoLoginRequest
{
    public required string AccessToken { get; set; }
}

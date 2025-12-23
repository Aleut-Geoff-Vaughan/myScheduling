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
using System.Security.Cryptography;
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
    private const int RefreshTokenExpirationDays = 7; // Refresh tokens valid for 7 days

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

            // Generate refresh token
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();
            var refreshToken = await GenerateRefreshTokenAsync(user, ip, userAgent);

            var response = new LoginResponse
            {
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                RefreshToken = refreshToken.Token,
                RefreshTokenExpiresAt = refreshToken.ExpiresAt,
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
            // Get user ID from JWT token (secure, token-based identity)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
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
                // Use configured frontend URL, falling back to Referer header or localhost for dev
                var baseUrl = _configuration["App:FrontendUrl"];
                if (string.IsNullOrEmpty(baseUrl))
                {
                    var referer = Request.Headers["Referer"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
                    {
                        baseUrl = $"{refererUri.Scheme}://{refererUri.Host}";
                        if (!refererUri.IsDefaultPort)
                            baseUrl += $":{refererUri.Port}";
                    }
                    else
                    {
                        baseUrl = "http://localhost:5173";
                    }
                }
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

            // Generate refresh token
            var refreshTokenResult = await GenerateRefreshTokenAsync(user, ip, userAgent);

            var response = new LoginResponse
            {
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                RefreshToken = refreshTokenResult.Token,
                RefreshTokenExpiresAt = refreshTokenResult.ExpiresAt,
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

            // Generate refresh token
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();
            var refreshTokenResult = await GenerateRefreshTokenAsync(user, ip, userAgent);

            var response = new LoginResponse
            {
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                RefreshToken = refreshTokenResult.Token,
                RefreshTokenExpiresAt = refreshTokenResult.ExpiresAt,
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

    /// <summary>
    /// Generate a cryptographically secure refresh token
    /// </summary>
    private async Task<(string Token, DateTime ExpiresAt)> GenerateRefreshTokenAsync(User user, string? ip, string? userAgent)
    {
        // Generate a cryptographically secure random token
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var token = Convert.ToBase64String(randomBytes);

        // Hash the token for storage
        using var sha256 = SHA256.Create();
        var tokenHash = Convert.ToHexString(sha256.ComputeHash(Encoding.UTF8.GetBytes(token)));

        var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpirationDays);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ip,
            UserAgent = userAgent
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return (token, expiresAt);
    }

    /// <summary>
    /// Validate a refresh token and return the associated user if valid
    /// </summary>
    private async Task<RefreshToken?> ValidateRefreshTokenAsync(string token)
    {
        using var sha256 = SHA256.Create();
        var tokenHash = Convert.ToHexString(sha256.ComputeHash(Encoding.UTF8.GetBytes(token)));

        var refreshToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .ThenInclude(u => u.TenantMemberships)
            .ThenInclude(tm => tm.Tenant)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

        if (refreshToken == null)
        {
            return null;
        }

        // Check if token is expired or revoked
        if (refreshToken.ExpiresAt < DateTime.UtcNow || refreshToken.RevokedAt.HasValue)
        {
            return null;
        }

        return refreshToken;
    }

    /// <summary>
    /// Revoke a refresh token
    /// </summary>
    private async Task RevokeRefreshTokenAsync(RefreshToken token, string? ip, string reason, Guid? replacedByTokenId = null)
    {
        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ip;
        token.RevokedReason = reason;
        token.ReplacedByTokenId = replacedByTokenId;
        await _context.SaveChangesAsync();
    }

    // ==================== REFRESH TOKEN ENDPOINTS ====================

    /// <summary>
    /// Refresh an access token using a valid refresh token
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            // Validate the refresh token
            var existingToken = await ValidateRefreshTokenAsync(request.RefreshToken);

            if (existingToken == null)
            {
                _logger.LogWarning("Invalid or expired refresh token attempt from IP: {IP}", ip);
                return Unauthorized(new { message = "Invalid or expired refresh token" });
            }

            var user = existingToken.User;

            // Check if user is still active
            if (!user.IsActive)
            {
                await RevokeRefreshTokenAsync(existingToken, ip, "User account deactivated");
                return Unauthorized(new { message = "Account is inactive" });
            }

            // Revoke the old refresh token (rotation for security)
            var (newToken, newExpiresAt) = await GenerateRefreshTokenAsync(user, ip, userAgent);

            // Get the new token ID from the database
            using var sha256 = SHA256.Create();
            var newTokenHash = Convert.ToHexString(sha256.ComputeHash(Encoding.UTF8.GetBytes(newToken)));
            var newRefreshToken = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == newTokenHash);

            await RevokeRefreshTokenAsync(existingToken, ip, "Replaced by new token", newRefreshToken?.Id);

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

            // Generate new JWT access token
            var jwtToken = GenerateJwtToken(user, tenantAccess);

            _logger.LogInformation("Access token refreshed for user {Email}", user.Email);

            return Ok(new LoginResponse
            {
                Token = jwtToken.Token,
                ExpiresAt = jwtToken.ExpiresAt,
                RefreshToken = newToken,
                RefreshTokenExpiresAt = newExpiresAt,
                UserId = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                IsSystemAdmin = user.IsSystemAdmin,
                TenantAccess = tenantAccess
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return StatusCode(500, new { message = "An error occurred while refreshing the token" });
        }
    }

    /// <summary>
    /// Revoke a refresh token (logout from a specific device)
    /// </summary>
    [HttpPost("revoke")]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequest request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

            var token = await ValidateRefreshTokenAsync(request.RefreshToken);

            if (token == null)
            {
                return BadRequest(new { message = "Invalid token" });
            }

            await RevokeRefreshTokenAsync(token, ip, "Manually revoked");

            _logger.LogInformation("Refresh token revoked for user {UserId}", token.UserId);

            return Ok(new { message = "Token revoked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking token");
            return StatusCode(500, new { message = "An error occurred while revoking the token" });
        }
    }

    /// <summary>
    /// Revoke all refresh tokens for the current user (logout from all devices)
    /// </summary>
    [HttpPost("revoke-all")]
    public async Task<IActionResult> RevokeAllTokens()
    {
        try
        {
            // Get user ID from JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

            // Get all active refresh tokens for this user
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var token in activeTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedByIp = ip;
                token.RevokedReason = "Revoked all tokens";
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("All refresh tokens revoked for user {UserId}. Count: {Count}", userId, activeTokens.Count);

            return Ok(new { message = $"Revoked {activeTokens.Count} active tokens" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking all tokens");
            return StatusCode(500, new { message = "An error occurred while revoking tokens" });
        }
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
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
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

// Refresh Token DTOs
public class RefreshTokenRequest
{
    public required string RefreshToken { get; set; }
}

public class RevokeTokenRequest
{
    public required string RefreshToken { get; set; }
}

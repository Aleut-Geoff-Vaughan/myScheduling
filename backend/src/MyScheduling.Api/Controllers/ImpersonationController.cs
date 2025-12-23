using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Administrative impersonation endpoints for support and troubleshooting
/// </summary>
[ApiController]
[Route("api/admin/[controller]")]
public class ImpersonationController : ControllerBase
{
    private readonly IImpersonationService _impersonationService;
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ImpersonationController> _logger;
    private readonly IConfiguration _configuration;

    public ImpersonationController(
        IImpersonationService impersonationService,
        MySchedulingDbContext context,
        ILogger<ImpersonationController> logger,
        IConfiguration configuration)
    {
        _impersonationService = impersonationService;
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Start impersonating a user
    /// </summary>
    [HttpPost("start")]
    public async Task<ActionResult<ImpersonationResponse>> StartImpersonation([FromBody] StartImpersonationRequest request)
    {
        try
        {
            // Get the current admin user ID from header/token
            if (!TryGetCurrentUserId(out var adminUserId))
            {
                return Unauthorized(new { message = "Admin user ID not found" });
            }

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            // Check eligibility first
            var eligibility = await _impersonationService.CanImpersonateAsync(adminUserId, request.TargetUserId);
            if (!eligibility.CanImpersonate)
            {
                return BadRequest(new { message = eligibility.Reason });
            }

            // Start impersonation
            var result = await _impersonationService.StartImpersonationAsync(
                adminUserId,
                request.TargetUserId,
                request.Reason,
                ip,
                userAgent);

            if (!result.Success || result.Session == null)
            {
                return BadRequest(new { message = result.ErrorMessage });
            }

            // Get target user for token generation
            var targetUser = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .FirstOrDefaultAsync(u => u.Id == request.TargetUserId);

            if (targetUser == null)
            {
                return NotFound(new { message = "Target user not found" });
            }

            // Build tenant access for target user
            var tenantAccess = targetUser.TenantMemberships
                .Where(tm => tm.IsActive)
                .Select(tm => new TenantAccessInfo
                {
                    TenantId = tm.TenantId,
                    TenantName = tm.Tenant.Name,
                    Roles = tm.Roles.Select(r => r.ToString()).ToArray()
                })
                .ToList();

            // Generate token with impersonation context
            var impersonationContext = new ImpersonationContext
            {
                OriginalUserId = adminUserId,
                SessionId = result.Session.Id
            };

            var token = GenerateJwtToken(targetUser, tenantAccess, impersonationContext);

            // AUDIT LOG: Impersonation started - critical security event
            _logger.LogWarning(
                "AUDIT: SECURITY - Impersonation started. AdminUserId={AdminUserId}, TargetUserId={TargetUserId}, " +
                "TargetEmail={TargetEmail}, Reason={Reason}, SessionId={SessionId}, ClientIp={ClientIp}, " +
                "UserAgent={UserAgent}, ExpiresAt={ExpiresAt}",
                adminUserId, request.TargetUserId, targetUser.Email, request.Reason,
                result.Session.Id, ip, userAgent, token.ExpiresAt);

            return Ok(new ImpersonationResponse
            {
                Success = true,
                SessionId = result.Session.Id,
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                ImpersonatedUser = new ImpersonatedUserInfo
                {
                    UserId = targetUser.Id,
                    Email = targetUser.Email,
                    DisplayName = targetUser.DisplayName
                },
                TenantAccess = tenantAccess
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: Impersonation start failed. TargetUserId={TargetUserId}", request.TargetUserId);
            return StatusCode(500, new { message = "An error occurred starting impersonation" });
        }
    }

    /// <summary>
    /// End current impersonation session and return to admin context
    /// </summary>
    [HttpPost("end")]
    public async Task<ActionResult<EndImpersonationResponse>> EndImpersonation()
    {
        try
        {
            // Get session ID from token claims
            if (!TryGetImpersonationSessionId(out var sessionId))
            {
                return BadRequest(new { message = "No active impersonation session found" });
            }

            var result = await _impersonationService.EndImpersonationAsync(sessionId, ImpersonationEndReason.Manual);

            if (!result.Success)
            {
                return BadRequest(new { message = result.ErrorMessage });
            }

            // Get the original admin user to generate new token
            var adminUserId = result.Session?.AdminUserId;
            if (adminUserId == null)
            {
                return BadRequest(new { message = "Could not determine original admin user" });
            }

            var adminUser = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .FirstOrDefaultAsync(u => u.Id == adminUserId);

            if (adminUser == null)
            {
                return NotFound(new { message = "Admin user not found" });
            }

            // Build tenant access for admin
            var tenantAccess = adminUser.TenantMemberships
                .Where(tm => tm.IsActive)
                .Select(tm => new TenantAccessInfo
                {
                    TenantId = tm.TenantId,
                    TenantName = tm.Tenant.Name,
                    Roles = tm.Roles.Select(r => r.ToString()).ToArray()
                })
                .ToList();

            // Generate new token for admin (no impersonation context)
            var token = GenerateJwtToken(adminUser, tenantAccess, null);

            // AUDIT LOG: Impersonation ended - critical security event
            _logger.LogWarning(
                "AUDIT: SECURITY - Impersonation ended. AdminUserId={AdminUserId}, AdminEmail={AdminEmail}, " +
                "SessionId={SessionId}, EndReason={EndReason}, SessionDuration={SessionDuration}",
                adminUserId, adminUser.Email, sessionId, "Manual",
                result.Session?.EndedAt.HasValue == true && result.Session?.StartedAt != null
                    ? (result.Session.EndedAt.Value - result.Session.StartedAt).TotalMinutes.ToString("F1") + " minutes"
                    : "unknown");

            return Ok(new EndImpersonationResponse
            {
                Success = true,
                Token = token.Token,
                ExpiresAt = token.ExpiresAt,
                User = new ImpersonatedUserInfo
                {
                    UserId = adminUser.Id,
                    Email = adminUser.Email,
                    DisplayName = adminUser.DisplayName
                },
                TenantAccess = tenantAccess
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: Impersonation end failed. SessionId={SessionId}",
                TryGetImpersonationSessionId(out var sid) ? sid.ToString() : "unknown");
            return StatusCode(500, new { message = "An error occurred ending impersonation" });
        }
    }

    /// <summary>
    /// Check if a user can be impersonated
    /// </summary>
    [HttpGet("can-impersonate/{targetUserId}")]
    public async Task<ActionResult<CanImpersonateResponse>> CanImpersonate(Guid targetUserId)
    {
        try
        {
            if (!TryGetCurrentUserId(out var adminUserId))
            {
                return Unauthorized(new { message = "Admin user ID not found" });
            }

            var result = await _impersonationService.CanImpersonateAsync(adminUserId, targetUserId);

            return Ok(new CanImpersonateResponse
            {
                CanImpersonate = result.CanImpersonate,
                Reason = result.Reason
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking impersonation eligibility for target user {TargetUserId}", targetUserId);
            return StatusCode(500, new { message = "An error occurred checking eligibility" });
        }
    }

    /// <summary>
    /// Get active impersonation session for current admin
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<ImpersonationSessionInfo>> GetActiveSession()
    {
        try
        {
            if (!TryGetCurrentUserId(out var adminUserId))
            {
                return Unauthorized(new { message = "Admin user ID not found" });
            }

            var session = await _impersonationService.GetActiveSessionAsync(adminUserId);

            if (session == null)
            {
                return Ok(new { active = false });
            }

            return Ok(new ImpersonationSessionInfo
            {
                Active = true,
                SessionId = session.Id,
                ImpersonatedUserId = session.ImpersonatedUserId,
                ImpersonatedUserEmail = session.ImpersonatedUser?.Email,
                ImpersonatedUserName = session.ImpersonatedUser?.DisplayName,
                StartedAt = session.StartedAt,
                Reason = session.Reason,
                Duration = session.Duration
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active impersonation session");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    /// <summary>
    /// Get recent impersonation sessions (admin audit view)
    /// </summary>
    [HttpGet("sessions")]
    public async Task<ActionResult<List<ImpersonationSessionInfo>>> GetRecentSessions([FromQuery] int count = 50)
    {
        try
        {
            if (!TryGetCurrentUserId(out var adminUserId))
            {
                return Unauthorized(new { message = "Admin user ID not found" });
            }

            // Verify caller is a system admin
            var admin = await _context.Users.FindAsync(adminUserId);
            if (admin == null || !admin.IsSystemAdmin)
            {
                return Forbid();
            }

            var sessions = await _impersonationService.GetRecentSessionsAsync(count);

            var result = sessions.Select(s => new ImpersonationSessionInfo
            {
                Active = s.IsActive,
                SessionId = s.Id,
                AdminUserId = s.AdminUserId,
                AdminUserEmail = s.AdminUser?.Email,
                AdminUserName = s.AdminUser?.DisplayName,
                ImpersonatedUserId = s.ImpersonatedUserId,
                ImpersonatedUserEmail = s.ImpersonatedUser?.Email,
                ImpersonatedUserName = s.ImpersonatedUser?.DisplayName,
                StartedAt = s.StartedAt,
                EndedAt = s.EndedAt,
                Reason = s.Reason,
                EndReason = s.EndReason?.ToString(),
                Duration = s.Duration
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent impersonation sessions");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;

        // Get user ID from JWT claims only (secure, token-based identity)
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out userId))
        {
            // If impersonating, get the original admin user ID
            var originalUserIdClaim = User.FindFirst("OriginalUserId")?.Value;
            if (!string.IsNullOrEmpty(originalUserIdClaim) && Guid.TryParse(originalUserIdClaim, out var originalUserId))
            {
                userId = originalUserId;
            }
            return true;
        }

        return false;
    }

    private bool TryGetImpersonationSessionId(out Guid sessionId)
    {
        sessionId = Guid.Empty;
        var sessionIdClaim = User.FindFirst("ImpersonationSessionId")?.Value;
        return !string.IsNullOrEmpty(sessionIdClaim) && Guid.TryParse(sessionIdClaim, out sessionId);
    }

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(
        User user,
        List<TenantAccessInfo> tenantAccess,
        ImpersonationContext? impersonation)
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

// DTOs
public class StartImpersonationRequest
{
    public Guid TargetUserId { get; set; }
    public required string Reason { get; set; }
}

public class ImpersonationResponse
{
    public bool Success { get; set; }
    public Guid SessionId { get; set; }
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public required ImpersonatedUserInfo ImpersonatedUser { get; set; }
    public List<TenantAccessInfo> TenantAccess { get; set; } = new();
}

public class EndImpersonationResponse
{
    public bool Success { get; set; }
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public required ImpersonatedUserInfo User { get; set; }
    public List<TenantAccessInfo> TenantAccess { get; set; } = new();
}

public class ImpersonatedUserInfo
{
    public Guid UserId { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
}

public class CanImpersonateResponse
{
    public bool CanImpersonate { get; set; }
    public string? Reason { get; set; }
}

public class ImpersonationSessionInfo
{
    public bool Active { get; set; }
    public Guid SessionId { get; set; }
    public Guid? AdminUserId { get; set; }
    public string? AdminUserEmail { get; set; }
    public string? AdminUserName { get; set; }
    public Guid ImpersonatedUserId { get; set; }
    public string? ImpersonatedUserEmail { get; set; }
    public string? ImpersonatedUserName { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public required string Reason { get; set; }
    public string? EndReason { get; set; }
    public TimeSpan? Duration { get; set; }
}

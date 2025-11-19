using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Infrastructure.Data;
using AleutStaffing.Core.Entities;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AleutStaffingDbContext context, ILogger<AuthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Find user by email with their tenant memberships
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // For now, accept any password for development
            // TODO: Implement proper password hashing and verification

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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

            var response = new LoginResponse
            {
                UserId = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                IsSystemAdmin = user.IsSystemAdmin,
                TenantAccess = tenantAccess
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Since we're not using JWT yet, just return success
        return Ok(new { message = "Logged out successfully" });
    }
}

public class LoginRequest
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

public class LoginResponse
{
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

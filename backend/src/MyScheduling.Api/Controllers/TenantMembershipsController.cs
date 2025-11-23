using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/tenant-memberships")]
public class TenantMembershipsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<TenantMembershipsController> _logger;

    public TenantMembershipsController(
        MySchedulingDbContext context,
        ILogger<TenantMembershipsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/tenant-memberships/{id}
    // Get a specific tenant membership with details
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Read)]
    public async Task<ActionResult<TenantMembership>> GetTenantMembership(Guid id)
    {
        try
        {
            var membership = await _context.TenantMemberships
                .Include(tm => tm.Tenant)
                .Include(tm => tm.User)
                .FirstOrDefaultAsync(tm => tm.Id == id);

            if (membership == null)
            {
                return NotFound($"Tenant membership with ID {id} not found");
            }

            return Ok(membership);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant membership {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the tenant membership");
        }
    }

    // POST: api/tenant-memberships
    // Add a user to a tenant with specified roles
    [HttpPost]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Create)]
    public async Task<ActionResult<TenantMembership>> CreateTenantMembership([FromBody] CreateTenantMembershipRequest request)
    {
        try
        {
            // Validate user exists
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound($"User with ID {request.UserId} not found");
            }

            // Validate tenant exists
            var tenant = await _context.Tenants.FindAsync(request.TenantId);
            if (tenant == null)
            {
                return NotFound($"Tenant with ID {request.TenantId} not found");
            }

            // Check if membership already exists
            var existingMembership = await _context.TenantMemberships
                .FirstOrDefaultAsync(tm => tm.UserId == request.UserId && tm.TenantId == request.TenantId);

            if (existingMembership != null)
            {
                return Conflict("User is already a member of this tenant");
            }

            // Validate roles
            if (request.Roles == null || request.Roles.Count == 0)
            {
                return BadRequest("At least one role must be assigned");
            }

            // Create new membership
            var membership = new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                TenantId = request.TenantId,
                Roles = request.Roles,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TenantMemberships.Add(membership);
            await _context.SaveChangesAsync();

            // Load navigation properties for response
            await _context.Entry(membership)
                .Reference(tm => tm.Tenant)
                .LoadAsync();
            await _context.Entry(membership)
                .Reference(tm => tm.User)
                .LoadAsync();

            _logger.LogInformation("Created tenant membership {MembershipId} for user {UserId} in tenant {TenantId}",
                membership.Id, request.UserId, request.TenantId);

            return CreatedAtAction(
                nameof(GetTenantMembership),
                new { id = membership.Id },
                membership);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant membership");
            return StatusCode(500, "An error occurred while creating the tenant membership");
        }
    }

    // PUT: api/tenant-memberships/{id}/roles
    // Update roles for an existing tenant membership
    [HttpPut("{id}/roles")]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Update)]
    public async Task<ActionResult<TenantMembership>> UpdateTenantMembershipRoles(
        Guid id,
        [FromBody] UpdateRolesRequest request)
    {
        try
        {
            var membership = await _context.TenantMemberships
                .Include(tm => tm.Tenant)
                .Include(tm => tm.User)
                .FirstOrDefaultAsync(tm => tm.Id == id);

            if (membership == null)
            {
                return NotFound($"Tenant membership with ID {id} not found");
            }

            // Validate roles
            if (request.Roles == null || request.Roles.Count == 0)
            {
                return BadRequest("At least one role must be assigned");
            }

            // Update roles
            membership.Roles = request.Roles;
            membership.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated roles for tenant membership {MembershipId}", id);

            return Ok(membership);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating roles for tenant membership {Id}", id);
            return StatusCode(500, "An error occurred while updating the roles");
        }
    }

    // PUT: api/tenant-memberships/{id}/status
    // Activate or deactivate a tenant membership
    [HttpPut("{id}/status")]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Update)]
    public async Task<ActionResult<TenantMembership>> UpdateTenantMembershipStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request)
    {
        try
        {
            var membership = await _context.TenantMemberships
                .Include(tm => tm.Tenant)
                .Include(tm => tm.User)
                .FirstOrDefaultAsync(tm => tm.Id == id);

            if (membership == null)
            {
                return NotFound($"Tenant membership with ID {id} not found");
            }

            membership.IsActive = request.IsActive;
            membership.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated status for tenant membership {MembershipId} to {Status}",
                id, request.IsActive ? "Active" : "Inactive");

            return Ok(membership);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status for tenant membership {Id}", id);
            return StatusCode(500, "An error occurred while updating the status");
        }
    }

    // DELETE: api/tenant-memberships/{id}
    // Remove a user from a tenant
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteTenantMembership(Guid id)
    {
        try
        {
            var membership = await _context.TenantMemberships.FindAsync(id);

            if (membership == null)
            {
                return NotFound($"Tenant membership with ID {id} not found");
            }

            _context.TenantMemberships.Remove(membership);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted tenant membership {MembershipId}", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant membership {Id}", id);
            return StatusCode(500, "An error occurred while deleting the tenant membership");
        }
    }

    // GET: api/tenant-memberships/roles
    // Get list of available roles with descriptions
    [HttpGet("roles")]
    [RequiresPermission(Resource = "TenantMembership", Action = PermissionAction.Read)]
    public ActionResult<IEnumerable<RoleInfo>> GetAvailableRoles()
    {
        try
        {
            var roles = new List<RoleInfo>
            {
                // Tenant-Level Roles
                new RoleInfo(AppRole.Employee, "Employee", "Standard user access, manage own profile and bookings", "tenant"),
                new RoleInfo(AppRole.ViewOnly, "View Only", "Read-only access to tenant data", "tenant"),
                new RoleInfo(AppRole.TeamLead, "Team Lead", "View team data, manage team assignments", "tenant"),
                new RoleInfo(AppRole.ProjectManager, "Project Manager", "Manage projects, WBS elements, and assignments", "tenant"),
                new RoleInfo(AppRole.ResourceManager, "Resource Manager", "Manage people, skills, and resource allocation", "tenant"),
                new RoleInfo(AppRole.OfficeManager, "Office Manager", "Manage offices, spaces, and hoteling within tenant", "tenant"),
                new RoleInfo(AppRole.TenantAdmin, "Tenant Admin", "Full administrative access within the tenant", "tenant"),
                new RoleInfo(AppRole.Executive, "Executive", "View all data, approve overrides, access executive reports", "tenant"),
                new RoleInfo(AppRole.OverrideApprover, "Override Approver", "Approve assignment and booking overrides", "tenant"),

                // System-Level Roles (for reference, but cannot be assigned via this endpoint)
                new RoleInfo(AppRole.SystemAdmin, "System Admin", "Full system access, can manage all tenants and users", "system"),
                new RoleInfo(AppRole.Support, "Support", "Read-only access across all tenants for support purposes", "system"),
                new RoleInfo(AppRole.Auditor, "Auditor", "Read-only access to audit logs and reports across all tenants", "system")
            };

            return Ok(roles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available roles");
            return StatusCode(500, "An error occurred while retrieving roles");
        }
    }
}

// Request DTOs
public class CreateTenantMembershipRequest
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();
}

public class UpdateRolesRequest
{
    public List<AppRole> Roles { get; set; } = new();
}

public class UpdateStatusRequest
{
    public bool IsActive { get; set; }
}

// Response DTO
public record RoleInfo(AppRole Value, string Name, string Description, string Level);

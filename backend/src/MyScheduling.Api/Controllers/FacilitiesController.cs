using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FacilitiesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<FacilitiesController> _logger;

    public FacilitiesController(MySchedulingDbContext context, ILogger<FacilitiesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== SPACES ====================

    // GET: api/facilities/spaces
    [HttpGet("spaces")]
    [RequiresPermission(Resource = "Space", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Space>>> GetSpaces(
        [FromQuery] Guid? officeId = null,
        [FromQuery] SpaceType? type = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] Guid? managerId = null,
        [FromQuery] bool? requiresApproval = null)
    {
        try
        {
            var query = _context.Spaces
                .Include(s => s.Office)
                .Include(s => s.Manager)
                .AsNoTracking()
                .AsQueryable();

            if (officeId.HasValue)
            {
                query = query.Where(s => s.OfficeId == officeId.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(s => s.Type == type.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(s => s.IsActive == isActive.Value);
            }

            if (managerId.HasValue)
            {
                query = query.Where(s => s.ManagerUserId == managerId.Value);
            }

            if (requiresApproval.HasValue)
            {
                query = query.Where(s => s.RequiresApproval == requiresApproval.Value);
            }

            var spaces = await query
                .OrderBy(s => s.Office.Name)
                .ThenBy(s => s.Name)
                .ToListAsync();

            return Ok(spaces);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving spaces");
            return StatusCode(500, "An error occurred while retrieving spaces");
        }
    }

    // GET: api/facilities/spaces/{id}
    [HttpGet("spaces/{id}")]
    [RequiresPermission(Resource = "Space", Action = PermissionAction.Read)]
    public async Task<ActionResult<Space>> GetSpace(Guid id)
    {
        try
        {
            var space = await _context.Spaces
                .Include(s => s.Office)
                .Include(s => s.Manager)
                .Include(s => s.Bookings.Where(b => b.Status == BookingStatus.Reserved || b.Status == BookingStatus.CheckedIn))
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (space == null)
            {
                return NotFound($"Space with ID {id} not found");
            }

            return Ok(space);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving space with ID {SpaceId}", id);
            return StatusCode(500, "An error occurred while retrieving the space");
        }
    }

    // POST: api/facilities/spaces
    [HttpPost("spaces")]
    [RequiresPermission(Resource = "Space", Action = PermissionAction.Create)]
    public async Task<ActionResult<Space>> CreateSpace([FromBody] Space space)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Verify office exists
            var officeExists = await _context.Offices.AnyAsync(o => o.Id == space.OfficeId);
            if (!officeExists)
            {
                return BadRequest($"Office with ID {space.OfficeId} not found");
            }

            // Verify manager exists if specified
            if (space.ManagerUserId.HasValue)
            {
                var managerExists = await _context.Users.AnyAsync(u => u.Id == space.ManagerUserId.Value);
                if (!managerExists)
                {
                    return BadRequest($"Manager with ID {space.ManagerUserId} not found");
                }
            }

            space.Id = Guid.NewGuid();
            space.CreatedAt = DateTime.UtcNow;

            _context.Spaces.Add(space);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSpace), new { id = space.Id }, space);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating space");
            return StatusCode(500, "An error occurred while creating the space");
        }
    }

    // PUT: api/facilities/spaces/{id}
    [HttpPut("spaces/{id}")]
    [RequiresPermission(Resource = "Space", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateSpace(Guid id, [FromBody] Space space)
    {
        try
        {
            if (id != space.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingSpace = await _context.Spaces.FindAsync(id);
            if (existingSpace == null)
            {
                return NotFound($"Space with ID {id} not found");
            }

            // Update properties
            existingSpace.Name = space.Name;
            existingSpace.Type = space.Type;
            existingSpace.Capacity = space.Capacity;
            existingSpace.Metadata = space.Metadata;
            existingSpace.ManagerUserId = space.ManagerUserId;
            existingSpace.RequiresApproval = space.RequiresApproval;
            existingSpace.IsActive = space.IsActive;
            existingSpace.Equipment = space.Equipment;
            existingSpace.Features = space.Features;
            existingSpace.DailyCost = space.DailyCost;
            existingSpace.MaxBookingDays = space.MaxBookingDays;
            existingSpace.BookingRules = space.BookingRules;
            existingSpace.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating space with ID {SpaceId}", id);
            return StatusCode(500, "An error occurred while updating the space");
        }
    }

    // DELETE: api/facilities/spaces/{id}
    [HttpDelete("spaces/{id}")]
    [RequiresPermission(Resource = "Space", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteSpace(Guid id)
    {
        try
        {
            var space = await _context.Spaces.FindAsync(id);
            if (space == null)
            {
                return NotFound($"Space with ID {id} not found");
            }

            // Check for active bookings
            var hasActiveBookings = await _context.Bookings
                .AnyAsync(b => b.SpaceId == id &&
                             (b.Status == BookingStatus.Reserved || b.Status == BookingStatus.CheckedIn));

            if (hasActiveBookings)
            {
                return BadRequest("Cannot delete space with active bookings. Cancel or complete bookings first.");
            }

            _context.Spaces.Remove(space);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting space with ID {SpaceId}", id);
            return StatusCode(500, "An error occurred while deleting the space");
        }
    }

    // ==================== PERMISSIONS ====================

    // GET: api/facilities/permissions
    [HttpGet("permissions")]
    [RequiresPermission(Resource = "FacilityPermission", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<FacilityPermission>>> GetPermissions(
        [FromQuery] Guid? officeId = null,
        [FromQuery] Guid? spaceId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] AppRole? role = null)
    {
        try
        {
            var query = _context.FacilityPermissions
                .Include(p => p.Office)
                .Include(p => p.Space)
                .Include(p => p.User)
                .AsNoTracking()
                .AsQueryable();

            if (officeId.HasValue)
            {
                query = query.Where(p => p.OfficeId == officeId.Value);
            }

            if (spaceId.HasValue)
            {
                query = query.Where(p => p.SpaceId == spaceId.Value);
            }

            if (userId.HasValue)
            {
                query = query.Where(p => p.UserId == userId.Value);
            }

            if (role.HasValue)
            {
                query = query.Where(p => p.Role == role.Value);
            }

            var permissions = await query.ToListAsync();

            return Ok(permissions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving facility permissions");
            return StatusCode(500, "An error occurred while retrieving permissions");
        }
    }

    // GET: api/facilities/permissions/user/{userId}
    [HttpGet("permissions/user/{userId}")]
    [RequiresPermission(Resource = "FacilityPermission", Action = PermissionAction.Read)]
    public async Task<ActionResult<object>> GetUserPermissions(Guid userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound($"User with ID {userId} not found");
            }

            // Get user-specific permissions
            var userPermissions = await _context.FacilityPermissions
                .Where(p => p.UserId == userId)
                .Include(p => p.Office)
                .Include(p => p.Space)
                .AsNoTracking()
                .ToListAsync();

            // Get role-based permissions
            var roles = user.TenantMemberships.SelectMany(tm => tm.Roles).Distinct().ToList();
            var rolePermissions = await _context.FacilityPermissions
                .Where(p => p.Role != null && roles.Contains(p.Role.Value))
                .Include(p => p.Office)
                .Include(p => p.Space)
                .AsNoTracking()
                .ToListAsync();

            return Ok(new
            {
                UserPermissions = userPermissions,
                RolePermissions = rolePermissions,
                EffectiveAccessLevel = GetEffectiveAccessLevel(userPermissions, rolePermissions)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving permissions for user {UserId}", userId);
            return StatusCode(500, "An error occurred while retrieving user permissions");
        }
    }

    // POST: api/facilities/permissions
    [HttpPost("permissions")]
    [RequiresPermission(Resource = "FacilityPermission", Action = PermissionAction.Create)]
    public async Task<ActionResult<FacilityPermission>> GrantPermission([FromBody] FacilityPermission permission)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Validate that either UserId or Role is provided, not both
            if ((permission.UserId.HasValue && permission.Role.HasValue) ||
                (!permission.UserId.HasValue && !permission.Role.HasValue))
            {
                return BadRequest("Either UserId or Role must be provided, but not both");
            }

            // Verify referenced entities exist
            if (permission.OfficeId.HasValue)
            {
                var officeExists = await _context.Offices.AnyAsync(o => o.Id == permission.OfficeId.Value);
                if (!officeExists)
                {
                    return BadRequest($"Office with ID {permission.OfficeId} not found");
                }
            }

            if (permission.SpaceId.HasValue)
            {
                var spaceExists = await _context.Spaces.AnyAsync(s => s.Id == permission.SpaceId.Value);
                if (!spaceExists)
                {
                    return BadRequest($"Space with ID {permission.SpaceId} not found");
                }
            }

            if (permission.UserId.HasValue)
            {
                var userExists = await _context.Users.AnyAsync(u => u.Id == permission.UserId.Value);
                if (!userExists)
                {
                    return BadRequest($"User with ID {permission.UserId} not found");
                }
            }

            permission.Id = Guid.NewGuid();
            permission.CreatedAt = DateTime.UtcNow;

            _context.FacilityPermissions.Add(permission);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPermissions), new { id = permission.Id }, permission);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error granting facility permission");
            return StatusCode(500, "An error occurred while granting permission");
        }
    }

    // DELETE: api/facilities/permissions/{id}
    [HttpDelete("permissions/{id}")]
    [RequiresPermission(Resource = "FacilityPermission", Action = PermissionAction.Delete)]
    public async Task<IActionResult> RevokePermission(Guid id)
    {
        try
        {
            var permission = await _context.FacilityPermissions.FindAsync(id);
            if (permission == null)
            {
                return NotFound($"Permission with ID {id} not found");
            }

            _context.FacilityPermissions.Remove(permission);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking permission with ID {PermissionId}", id);
            return StatusCode(500, "An error occurred while revoking permission");
        }
    }

    // ==================== MAINTENANCE ====================

    // GET: api/facilities/maintenance
    [HttpGet("maintenance")]
    [RequiresPermission(Resource = "SpaceMaintenance", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SpaceMaintenanceLog>>> GetMaintenanceLogs(
        [FromQuery] Guid? spaceId = null,
        [FromQuery] MaintenanceStatus? status = null,
        [FromQuery] MaintenanceType? type = null,
        [FromQuery] DateTime? scheduledAfter = null,
        [FromQuery] DateTime? scheduledBefore = null)
    {
        try
        {
            var query = _context.SpaceMaintenanceLogs
                .Include(m => m.Space)
                    .ThenInclude(s => s.Office)
                .Include(m => m.ReportedBy)
                .Include(m => m.AssignedTo)
                .AsNoTracking()
                .AsQueryable();

            if (spaceId.HasValue)
            {
                query = query.Where(m => m.SpaceId == spaceId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(m => m.Status == status.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(m => m.Type == type.Value);
            }

            if (scheduledAfter.HasValue)
            {
                query = query.Where(m => m.ScheduledDate >= scheduledAfter.Value);
            }

            if (scheduledBefore.HasValue)
            {
                query = query.Where(m => m.ScheduledDate <= scheduledBefore.Value);
            }

            var maintenanceLogs = await query
                .OrderByDescending(m => m.ScheduledDate)
                .ToListAsync();

            return Ok(maintenanceLogs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving maintenance logs");
            return StatusCode(500, "An error occurred while retrieving maintenance logs");
        }
    }

    // GET: api/facilities/spaces/{spaceId}/maintenance
    [HttpGet("spaces/{spaceId}/maintenance")]
    [RequiresPermission(Resource = "SpaceMaintenance", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SpaceMaintenanceLog>>> GetSpaceMaintenanceLogs(Guid spaceId)
    {
        try
        {
            var spaceExists = await _context.Spaces.AnyAsync(s => s.Id == spaceId);
            if (!spaceExists)
            {
                return NotFound($"Space with ID {spaceId} not found");
            }

            var maintenanceLogs = await _context.SpaceMaintenanceLogs
                .Include(m => m.ReportedBy)
                .Include(m => m.AssignedTo)
                .Where(m => m.SpaceId == spaceId)
                .OrderByDescending(m => m.ScheduledDate)
                .AsNoTracking()
                .ToListAsync();

            return Ok(maintenanceLogs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving maintenance logs for space {SpaceId}", spaceId);
            return StatusCode(500, "An error occurred while retrieving maintenance logs");
        }
    }

    // POST: api/facilities/spaces/{spaceId}/maintenance
    [HttpPost("spaces/{spaceId}/maintenance")]
    [RequiresPermission(Resource = "SpaceMaintenance", Action = PermissionAction.Create)]
    public async Task<ActionResult<SpaceMaintenanceLog>> ReportMaintenance(Guid spaceId, [FromBody] SpaceMaintenanceLog maintenanceLog)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var spaceExists = await _context.Spaces.AnyAsync(s => s.Id == spaceId);
            if (!spaceExists)
            {
                return NotFound($"Space with ID {spaceId} not found");
            }

            // Verify reported by user exists
            var reporterExists = await _context.Users.AnyAsync(u => u.Id == maintenanceLog.ReportedByUserId);
            if (!reporterExists)
            {
                return BadRequest($"Reporter user with ID {maintenanceLog.ReportedByUserId} not found");
            }

            // Verify assigned to user exists if specified
            if (maintenanceLog.AssignedToUserId.HasValue)
            {
                var assigneeExists = await _context.Users.AnyAsync(u => u.Id == maintenanceLog.AssignedToUserId.Value);
                if (!assigneeExists)
                {
                    return BadRequest($"Assignee user with ID {maintenanceLog.AssignedToUserId} not found");
                }
            }

            maintenanceLog.Id = Guid.NewGuid();
            maintenanceLog.SpaceId = spaceId;
            maintenanceLog.CreatedAt = DateTime.UtcNow;

            _context.SpaceMaintenanceLogs.Add(maintenanceLog);
            await _context.SaveChangesAsync();

            // Load navigation properties for response
            var createdLog = await _context.SpaceMaintenanceLogs
                .Include(m => m.Space)
                .Include(m => m.ReportedBy)
                .Include(m => m.AssignedTo)
                .FirstOrDefaultAsync(m => m.Id == maintenanceLog.Id);

            return CreatedAtAction(nameof(GetSpaceMaintenanceLogs), new { spaceId = spaceId }, createdLog);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reporting maintenance for space {SpaceId}", spaceId);
            return StatusCode(500, "An error occurred while reporting maintenance");
        }
    }

    // PUT: api/facilities/maintenance/{id}
    [HttpPut("maintenance/{id}")]
    [RequiresPermission(Resource = "SpaceMaintenance", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateMaintenance(Guid id, [FromBody] SpaceMaintenanceLog maintenanceLog)
    {
        try
        {
            if (id != maintenanceLog.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingLog = await _context.SpaceMaintenanceLogs.FindAsync(id);
            if (existingLog == null)
            {
                return NotFound($"Maintenance log with ID {id} not found");
            }

            // Update properties
            existingLog.ScheduledDate = maintenanceLog.ScheduledDate;
            existingLog.CompletedDate = maintenanceLog.CompletedDate;
            existingLog.Type = maintenanceLog.Type;
            existingLog.Status = maintenanceLog.Status;
            existingLog.AssignedToUserId = maintenanceLog.AssignedToUserId;
            existingLog.Description = maintenanceLog.Description;
            existingLog.Resolution = maintenanceLog.Resolution;
            existingLog.Cost = maintenanceLog.Cost;
            existingLog.UpdatedAt = DateTime.UtcNow;

            // If status changed to Completed, set completed date if not already set
            if (existingLog.Status == MaintenanceStatus.Completed && !existingLog.CompletedDate.HasValue)
            {
                existingLog.CompletedDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating maintenance log with ID {MaintenanceId}", id);
            return StatusCode(500, "An error occurred while updating the maintenance log");
        }
    }

    // ==================== HELPER METHODS ====================

    private static FacilityAccessLevel GetEffectiveAccessLevel(
        List<FacilityPermission> userPermissions,
        List<FacilityPermission> rolePermissions)
    {
        var allPermissions = userPermissions.Concat(rolePermissions);

        if (!allPermissions.Any())
        {
            return FacilityAccessLevel.View; // Default to view
        }

        // Return the highest access level
        return allPermissions.Max(p => p.AccessLevel);
    }
}

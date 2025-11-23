using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssignmentsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<AssignmentsController> _logger;
    private readonly IAuthorizationService _authService;

    public AssignmentsController(
        MySchedulingDbContext context,
        ILogger<AssignmentsController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }


    // GET: api/assignments
    [HttpGet]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Assignment>>> GetAssignments(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] Guid? personId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] AssignmentStatus? status = null)
    {
        try
        {
            var query = _context.Assignments
                .AsNoTracking()
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId.Value);
            }

            if (personId.HasValue)
            {
                query = query.Where(a => a.PersonId == personId.Value);
            }

            if (projectId.HasValue)
            {
                query = query.Where(a => a.WbsElement.ProjectId == projectId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(a => a.Status == status.Value);
            }

            var assignments = await query
                .OrderByDescending(a => a.StartDate)
                .ToListAsync();

            return Ok(assignments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving assignments");
            return StatusCode(500, "An error occurred while retrieving assignments");
        }
    }

    // GET: api/assignments/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<Assignment>> GetAssignment(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments
                .Include(a => a.Person)
                .Include(a => a.WbsElement)
                    .ThenInclude(w => w.Project)
                .Include(a => a.ProjectRole)
                .Include(a => a.ApprovedByUser)
                .Include(a => a.History)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            return Ok(assignment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while retrieving the assignment");
        }
    }

    // POST: api/assignments
    [HttpPost]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Create)]
    public async Task<ActionResult<Assignment>> CreateAssignment(Assignment assignment)
    {
        try
        {

            // Check for overlapping assignments
            var hasOverlap = await _context.Assignments
                .AnyAsync(a =>
                    a.PersonId == assignment.PersonId &&
                    a.Id != assignment.Id &&
                    a.Status == AssignmentStatus.Active &&
                    ((assignment.StartDate >= a.StartDate && assignment.StartDate <= a.EndDate) ||
                     (assignment.EndDate >= a.StartDate && assignment.EndDate <= a.EndDate) ||
                     (assignment.StartDate <= a.StartDate && assignment.EndDate >= a.EndDate)));

            if (hasOverlap)
            {
                return BadRequest("Assignment overlaps with existing active assignment for this person");
            }

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAssignment), new { id = assignment.Id }, assignment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating assignment");
            return StatusCode(500, "An error occurred while creating the assignment");
        }
    }

    // PUT: api/assignments/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateAssignment(Guid id, Assignment assignment)
    {
        if (id != assignment.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {

            _context.Entry(assignment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await AssignmentExists(id))
                {
                    return NotFound($"Assignment with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while updating the assignment");
        }
    }

    // DELETE: api/assignments/{id} (Soft Delete)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteAssignment(Guid id, [FromQuery] string? reason = null)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            assignment.IsDeleted = true;
            assignment.DeletedAt = DateTime.UtcNow;
            assignment.DeletedByUserId = GetCurrentUserId();
            assignment.DeletionReason = reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Assignment {AssignmentId} soft-deleted by user {UserId}", id, assignment.DeletedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft-deleting assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while deleting the assignment");
        }
    }

    // DELETE: api/assignments/{id}/hard (Hard Delete - Platform Admin Only)
    [HttpDelete("{id}/hard")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> HardDeleteAssignment(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            var archive = new DataArchive
            {
                Id = Guid.NewGuid(),
                TenantId = assignment.TenantId,
                EntityType = "Assignment",
                EntityId = assignment.Id,
                EntitySnapshot = System.Text.Json.JsonSerializer.Serialize(assignment),
                ArchivedAt = DateTime.UtcNow,
                ArchivedByUserId = GetCurrentUserId(),
                Status = DataArchiveStatus.PermanentlyDeleted,
                PermanentlyDeletedAt = DateTime.UtcNow,
                PermanentlyDeletedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow
            };

            _context.DataArchives.Add(archive);
            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            _logger.LogWarning("Assignment {AssignmentId} HARD DELETED by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard-deleting assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while permanently deleting the assignment");
        }
    }

    // POST: api/assignments/{id}/restore (Restore Soft-Deleted)
    [HttpPost("{id}/restore")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Restore)]
    public async Task<IActionResult> RestoreAssignment(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == id && a.IsDeleted);

            if (assignment == null)
            {
                return NotFound($"Soft-deleted assignment with ID {id} not found");
            }

            assignment.IsDeleted = false;
            assignment.DeletedAt = null;
            assignment.DeletedByUserId = null;
            assignment.DeletionReason = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Assignment {AssignmentId} restored by user {UserId}", id, GetCurrentUserId());

            return Ok(assignment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while restoring the assignment");
        }
    }

    // POST: api/assignments/{id}/approve
    [HttpPost("{id}/approve")]
    [RequiresPermission(Resource = "Assignment", Action = PermissionAction.Approve)]
    public async Task<IActionResult> ApproveAssignment(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            assignment.Status = AssignmentStatus.Active;
            assignment.ApprovedByUserId = GetCurrentUserId();

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while approving the assignment");
        }
    }

    private async Task<bool> AssignmentExists(Guid id)
    {
        return await _context.Assignments.AnyAsync(e => e.Id == id);
    }
}

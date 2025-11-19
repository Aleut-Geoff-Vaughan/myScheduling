using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssignmentsController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(AleutStaffingDbContext context, ILogger<AssignmentsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/assignments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Assignment>>> GetAssignments(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] Guid? personId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] AssignmentStatus? status = null)
    {
        try
        {
            var query = _context.Assignments
                .Include(a => a.Person)
                .Include(a => a.WbsElement)
                    .ThenInclude(w => w.Project)
                .Include(a => a.ProjectRole)
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

    // DELETE: api/assignments/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssignment(Guid id)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting assignment {AssignmentId}", id);
            return StatusCode(500, "An error occurred while deleting the assignment");
        }
    }

    // POST: api/assignments/{id}/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveAssignment(Guid id, [FromBody] Guid approvedByUserId)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound($"Assignment with ID {id} not found");
            }

            assignment.Status = AssignmentStatus.Active;
            assignment.ApprovedByUserId = approvedByUserId;

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

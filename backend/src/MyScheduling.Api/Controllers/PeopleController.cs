using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeopleController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<PeopleController> _logger;
    private readonly IAuthorizationService _authService;

    public PeopleController(
        MySchedulingDbContext context,
        ILogger<PeopleController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }


    // GET: api/people
    [HttpGet]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Person>>> GetPeople(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] PersonStatus? status = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var query = _context.People
                .Include(p => p.User)
                .Include(p => p.PersonSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(p => p.PersonCertifications)
                    .ThenInclude(pc => pc.Certification)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(p => p.TenantId == tenantId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(p => p.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(p =>
                    p.Name.Contains(search) ||
                    p.Email.Contains(search) ||
                    (p.JobTitle != null && p.JobTitle.Contains(search)));
            }

            var people = await query
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(people);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving people");
            return StatusCode(500, "An error occurred while retrieving people");
        }
    }

    // GET: api/people/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Read)]
    public async Task<ActionResult<Person>> GetPerson(Guid id)
    {
        try
        {
            var person = await _context.People
                .Include(p => p.User)
                .Include(p => p.ResumeProfile)
                .Include(p => p.PersonSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(p => p.PersonCertifications)
                    .ThenInclude(pc => pc.Certification)
                .Include(p => p.Assignments)
                .Include(p => p.Bookings)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (person == null)
            {
                return NotFound($"Person with ID {id} not found");
            }

            return Ok(person);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving person {PersonId}", id);
            return StatusCode(500, "An error occurred while retrieving the person");
        }
    }

    /// Get current user's person record
    /// <param name="userId">Current user's ID</param>
    /// <returns>Person record for the current user</returns>
    [HttpGet("me")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(Person), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<Person>> GetCurrentPerson([FromQuery] Guid userId)
    {
        try
        {
            var person = await _context.People
                .Include(p => p.User)
                .Include(p => p.ResumeProfile)
                .Include(p => p.PersonSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(p => p.PersonCertifications)
                    .ThenInclude(pc => pc.Certification)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (person == null)
            {
                _logger.LogWarning("Person record not found for user {UserId}", userId);
                return NotFound("Person record not found for current user");
            }

            return Ok(person);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving person for user {UserId}", userId);
            return StatusCode(500, "An error occurred while retrieving the person");
        }
    }

    // POST: api/people
    [HttpPost]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Create)]
    public async Task<ActionResult<Person>> CreatePerson(Person person)
    {
        try
        {
            if (person.Type == PersonType.Employee && person.UserId == null)
            {
                return BadRequest("Employees must have a User account");
            }

            // Check for duplicate email within tenant
            var existingPerson = await _context.People
                .FirstOrDefaultAsync(p => p.TenantId == person.TenantId && p.Email == person.Email);

            if (existingPerson != null)
            {
                return Conflict($"A person with email {person.Email} already exists in this tenant");
            }

            _context.People.Add(person);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPerson), new { id = person.Id }, person);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating person");
            return StatusCode(500, "An error occurred while creating the person");
        }
    }

    // PUT: api/people/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdatePerson(Guid id, Person person)
    {
        if (id != person.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            if (person.Type == PersonType.Employee && person.UserId == null)
            {
                return BadRequest("Employees must have a User account");
            }

            _context.Entry(person).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await PersonExists(id))
                {
                    return NotFound($"Person with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating person {PersonId}", id);
            return StatusCode(500, "An error occurred while updating the person");
        }
    }

    // DELETE: api/people/{id} (Soft Delete)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeletePerson(Guid id, [FromQuery] string? reason = null)
    {
        try
        {
            var person = await _context.People.FindAsync(id);
            if (person == null)
            {
                return NotFound($"Person with ID {id} not found");
            }

            // Soft delete - set flags but don't remove from database
            person.IsDeleted = true;
            person.DeletedAt = DateTime.UtcNow;
            person.DeletedByUserId = GetCurrentUserId();
            person.DeletionReason = reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Person {PersonId} soft-deleted by user {UserId}", id, person.DeletedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft-deleting person {PersonId}", id);
            return StatusCode(500, "An error occurred while deleting the person");
        }
    }

    // DELETE: api/people/{id}/hard (Hard Delete - Platform Admin Only)
    [HttpDelete("{id}/hard")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> HardDeletePerson(Guid id)
    {
        try
        {
            // Use IgnoreQueryFilters to get soft-deleted records
            var person = await _context.People
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (person == null)
            {
                return NotFound($"Person with ID {id} not found");
            }

            // Create archive record before hard delete
            var archive = new DataArchive
            {
                Id = Guid.NewGuid(),
                TenantId = person.TenantId,
                EntityType = "Person",
                EntityId = person.Id,
                EntitySnapshot = System.Text.Json.JsonSerializer.Serialize(person),
                ArchivedAt = DateTime.UtcNow,
                ArchivedByUserId = GetCurrentUserId(),
                Status = DataArchiveStatus.PermanentlyDeleted,
                PermanentlyDeletedAt = DateTime.UtcNow,
                PermanentlyDeletedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow
            };

            _context.DataArchives.Add(archive);
            _context.People.Remove(person);
            await _context.SaveChangesAsync();

            _logger.LogWarning("Person {PersonId} HARD DELETED by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard-deleting person {PersonId}", id);
            return StatusCode(500, "An error occurred while permanently deleting the person");
        }
    }

    // POST: api/people/{id}/restore (Restore Soft-Deleted)
    [HttpPost("{id}/restore")]
    [RequiresPermission(Resource = "Person", Action = PermissionAction.Restore)]
    public async Task<IActionResult> RestorePerson(Guid id)
    {
        try
        {
            // Use IgnoreQueryFilters to get soft-deleted records
            var person = await _context.People
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.IsDeleted);

            if (person == null)
            {
                return NotFound($"Soft-deleted person with ID {id} not found");
            }

            // Restore the person
            person.IsDeleted = false;
            person.DeletedAt = null;
            person.DeletedByUserId = null;
            person.DeletionReason = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Person {PersonId} restored by user {UserId}", id, GetCurrentUserId());

            return Ok(person);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring person {PersonId}", id);
            return StatusCode(500, "An error occurred while restoring the person");
        }
    }

    // GET: api/people/{id}/resume
    [HttpGet("{id}/resume")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeProfile>> GetPersonResume(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.PersonId == id);

            if (resume == null)
            {
                return NotFound($"Resume profile not found for person {id}");
            }

            return Ok(resume);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving resume for person {PersonId}", id);
            return StatusCode(500, "An error occurred while retrieving the resume");
        }
    }

    private async Task<bool> PersonExists(Guid id)
    {
        return await _context.People.AnyAsync(e => e.Id == id);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeopleController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<PeopleController> _logger;

    public PeopleController(AleutStaffingDbContext context, ILogger<PeopleController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/people
    [HttpGet]
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

    // POST: api/people
    [HttpPost]
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

    // DELETE: api/people/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePerson(Guid id)
    {
        try
        {
            var person = await _context.People.FindAsync(id);
            if (person == null)
            {
                return NotFound($"Person with ID {id} not found");
            }

            _context.People.Remove(person);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting person {PersonId}", id);
            return StatusCode(500, "An error occurred while deleting the person");
        }
    }

    // GET: api/people/{id}/resume
    [HttpGet("{id}/resume")]
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

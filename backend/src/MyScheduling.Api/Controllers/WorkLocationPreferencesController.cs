using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkLocationPreferencesController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<WorkLocationPreferencesController> _logger;

    public WorkLocationPreferencesController(MySchedulingDbContext context, ILogger<WorkLocationPreferencesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/worklocationpreferences
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkLocationPreference>>> GetWorkLocationPreferences(
        [FromQuery] Guid? personId = null,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        [FromQuery] WorkLocationType? locationType = null)
    {
        try
        {
            var query = _context.WorkLocationPreferences
                .Include(w => w.Person)
                .Include(w => w.Office)
                .Include(w => w.Booking)
                    .ThenInclude(b => b.Space)
                .AsNoTracking()
                .AsQueryable();

            if (personId.HasValue)
            {
                query = query.Where(w => w.PersonId == personId.Value);
            }

            if (startDate.HasValue)
            {
                query = query.Where(w => w.WorkDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(w => w.WorkDate <= endDate.Value);
            }

            if (locationType.HasValue)
            {
                query = query.Where(w => w.LocationType == locationType.Value);
            }

            var preferences = await query
                .OrderBy(w => w.WorkDate)
                .ToListAsync();

            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving work location preferences");
            return StatusCode(500, "An error occurred while retrieving work location preferences");
        }
    }

    // GET: api/worklocationpreferences/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<WorkLocationPreference>> GetWorkLocationPreference(Guid id)
    {
        try
        {
            var preference = await _context.WorkLocationPreferences
                .Include(w => w.Person)
                .Include(w => w.Office)
                .Include(w => w.Booking)
                    .ThenInclude(b => b.Space)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (preference == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            return Ok(preference);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving work location preference {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the work location preference");
        }
    }

    // POST: api/worklocationpreferences
    [HttpPost]
    public async Task<ActionResult<WorkLocationPreference>> CreateWorkLocationPreference(WorkLocationPreference preference)
    {
        try
        {
            // Check if preference already exists for this person on this date
            var existing = await _context.WorkLocationPreferences
                .FirstOrDefaultAsync(w =>
                    w.PersonId == preference.PersonId &&
                    w.WorkDate == preference.WorkDate &&
                    w.TenantId == preference.TenantId);

            if (existing != null)
            {
                return Conflict($"A work location preference already exists for this person on {preference.WorkDate}");
            }

            // Validate based on location type
            if (preference.LocationType == WorkLocationType.OfficeWithReservation && preference.BookingId == null)
            {
                return BadRequest("BookingId is required for OfficeWithReservation location type");
            }

            if ((preference.LocationType == WorkLocationType.OfficeNoReservation ||
                 preference.LocationType == WorkLocationType.ClientSite) &&
                preference.OfficeId == null)
            {
                return BadRequest("OfficeId is required for OfficeNoReservation and ClientSite location types");
            }

            preference.Id = Guid.NewGuid();
            preference.CreatedAt = DateTime.UtcNow;

            _context.WorkLocationPreferences.Add(preference);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetWorkLocationPreference),
                new { id = preference.Id },
                preference);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating work location preference");
            return StatusCode(500, "An error occurred while creating the work location preference");
        }
    }

    // PUT: api/worklocationpreferences/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWorkLocationPreference(Guid id, WorkLocationPreference preference)
    {
        if (id != preference.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var existing = await _context.WorkLocationPreferences.FindAsync(id);
            if (existing == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            // Validate based on location type
            if (preference.LocationType == WorkLocationType.OfficeWithReservation && preference.BookingId == null)
            {
                return BadRequest("BookingId is required for OfficeWithReservation location type");
            }

            if ((preference.LocationType == WorkLocationType.OfficeNoReservation ||
                 preference.LocationType == WorkLocationType.ClientSite) &&
                preference.OfficeId == null)
            {
                return BadRequest("OfficeId is required for OfficeNoReservation and ClientSite location types");
            }

            // Update properties
            existing.LocationType = preference.LocationType;
            existing.OfficeId = preference.OfficeId;
            existing.BookingId = preference.BookingId;
            existing.RemoteLocation = preference.RemoteLocation;
            existing.City = preference.City;
            existing.State = preference.State;
            existing.Country = preference.Country;
            existing.Notes = preference.Notes;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await WorkLocationPreferenceExists(id))
            {
                return NotFound();
            }
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating work location preference {Id}", id);
            return StatusCode(500, "An error occurred while updating the work location preference");
        }
    }

    // DELETE: api/worklocationpreferences/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkLocationPreference(Guid id)
    {
        try
        {
            var preference = await _context.WorkLocationPreferences.FindAsync(id);
            if (preference == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            _context.WorkLocationPreferences.Remove(preference);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting work location preference {Id}", id);
            return StatusCode(500, "An error occurred while deleting the work location preference");
        }
    }

    // POST: api/worklocationpreferences/bulk
    [HttpPost("bulk")]
    public async Task<ActionResult<IEnumerable<WorkLocationPreference>>> CreateBulkWorkLocationPreferences(
        [FromBody] List<WorkLocationPreference> preferences)
    {
        try
        {
            var created = new List<WorkLocationPreference>();

            foreach (var preference in preferences)
            {
                // Check if preference already exists
                var existing = await _context.WorkLocationPreferences
                    .FirstOrDefaultAsync(w =>
                        w.PersonId == preference.PersonId &&
                        w.WorkDate == preference.WorkDate &&
                        w.TenantId == preference.TenantId);

                if (existing != null)
                {
                    // Update existing
                    existing.LocationType = preference.LocationType;
                    existing.OfficeId = preference.OfficeId;
                    existing.BookingId = preference.BookingId;
                    existing.RemoteLocation = preference.RemoteLocation;
                    existing.City = preference.City;
                    existing.State = preference.State;
                    existing.Country = preference.Country;
                    existing.Notes = preference.Notes;
                    existing.UpdatedAt = DateTime.UtcNow;
                    created.Add(existing);
                }
                else
                {
                    // Create new
                    preference.Id = Guid.NewGuid();
                    preference.CreatedAt = DateTime.UtcNow;
                    _context.WorkLocationPreferences.Add(preference);
                    created.Add(preference);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating bulk work location preferences");
            return StatusCode(500, "An error occurred while creating bulk work location preferences");
        }
    }

    private async Task<bool> WorkLocationPreferenceExists(Guid id)
    {
        return await _context.WorkLocationPreferences.AnyAsync(e => e.Id == id);
    }
}

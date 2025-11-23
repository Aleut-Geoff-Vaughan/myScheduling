using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkLocationPreferencesController : AuthorizedControllerBase
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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<WorkLocationPreference>>> GetWorkLocationPreferences(
        [FromQuery] Guid? personId = null,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        [FromQuery] WorkLocationType? locationType = null,
        [FromQuery] Guid? tenantId = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var query = _context.WorkLocationPreferences
                .Include(w => w.Person)
                .Include(w => w.Office)
                .Include(w => w.Booking)
                    .ThenInclude(b => b!.Space)
                .AsNoTracking()
                .AsQueryable();

            // Filter by tenant access
            if (tenantId.HasValue)
            {
                if (!userTenantIds.Contains(tenantId.Value) && !IsSystemAdmin())
                {
                    return StatusCode(403, "You do not have access to this tenant");
                }
                query = query.Where(w => w.TenantId == tenantId.Value);
            }
            else
            {
                // Show preferences from all tenants user has access to
                query = query.Where(w => userTenantIds.Contains(w.TenantId));
            }

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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Read)]
    public async Task<ActionResult<WorkLocationPreference>> GetWorkLocationPreference(Guid id)
    {
        try
        {
            var userTenantIds = GetUserTenantIds();

            var preference = await _context.WorkLocationPreferences
                .Include(w => w.Person)
                .Include(w => w.Office)
                .Include(w => w.Booking)
                    .ThenInclude(b => b!.Space)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (preference == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(preference.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Create)]
    public async Task<ActionResult<WorkLocationPreference>> CreateWorkLocationPreference(
        WorkLocationPreference preference)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            // Get the person to check tenant and ownership
            var person = await _context.People.FindAsync(preference.PersonId);
            if (person == null)
            {
                return NotFound("Person not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(person.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Users can only create their own preferences unless they are system admin
            if (person.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Users can only create their own work location preferences");
            }

            // Set the tenant ID from the person record
            preference.TenantId = person.TenantId;

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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateWorkLocationPreference(
        Guid id,
        WorkLocationPreference preference)
    {
        if (id != preference.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var existing = await _context.WorkLocationPreferences
                .Include(w => w.Person)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (existing == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(existing.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Users can only update their own preferences unless they are system admin
            if (existing.Person?.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Users can only update their own work location preferences");
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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteWorkLocationPreference(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var preference = await _context.WorkLocationPreferences
                .Include(w => w.Person)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (preference == null)
            {
                return NotFound($"Work location preference with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(preference.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Users can only delete their own preferences unless they are system admin
            if (preference.Person?.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Users can only delete their own work location preferences");
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
    [RequiresPermission(Resource = "WorkLocationPreference", Action = PermissionAction.Create)]
    public async Task<ActionResult<IEnumerable<WorkLocationPreference>>> CreateBulkWorkLocationPreferences(
        [FromBody] List<WorkLocationPreference> preferences)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();
            var created = new List<WorkLocationPreference>();

            // Validate all preferences first
            foreach (var preference in preferences)
            {
                // Check tenant access
                if (!userTenantIds.Contains(preference.TenantId) && !IsSystemAdmin())
                {
                    return StatusCode(403, $"You do not have access to tenant {preference.TenantId}");
                }

                // Get the person to check ownership
                var person = await _context.People.FindAsync(preference.PersonId);
                if (person == null)
                {
                    return NotFound($"Person with ID {preference.PersonId} not found");
                }

                // Users can only create their own preferences unless they are system admin
                if (person.UserId != userId && !IsSystemAdmin())
                {
                    return StatusCode(403, "Users can only create their own work location preferences");
                }
            }

            // Process each preference
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

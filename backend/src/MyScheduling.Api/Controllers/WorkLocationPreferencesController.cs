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
        [FromQuery] Guid? userIdFilter = null,
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
                .Include(w => w.User)
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

            var targetUserId = userIdFilter ?? personId;
            if (targetUserId.HasValue)
            {
                query = query.Where(w => w.UserId == targetUserId.Value);
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
                .Include(w => w.User)
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
        [FromBody] CreateWorkLocationPreferenceRequest request)
    {
        try
        {
            _logger.LogInformation("Creating work location preference for user {UserId} on {WorkDate}", request.UserId, request.WorkDate);

            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            if (request.UserId == Guid.Empty)
            {
                return BadRequest("UserId is required");
            }

            if (request.TenantId == Guid.Empty)
            {
                return BadRequest("TenantId is required");
            }

            // Parse the work date
            if (!DateOnly.TryParse(request.WorkDate, out var workDate))
            {
                return BadRequest($"Invalid date format: {request.WorkDate}. Expected YYYY-MM-DD format.");
            }

            // Tenant check
            if (!userTenantIds.Contains(request.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Users can only create their own preferences unless system admin
            if (request.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Users can only create their own work location preferences");
            }

            // Check if preference already exists for this person on this date with the same day portion
            var existing = await _context.WorkLocationPreferences
                .FirstOrDefaultAsync(w =>
                    w.UserId == request.UserId &&
                    w.WorkDate == workDate &&
                    w.TenantId == request.TenantId &&
                    w.DayPortion == request.DayPortion);

            if (existing != null)
            {
                return Conflict($"A work location preference already exists for this person on {workDate} for {request.DayPortion}");
            }

            // If creating AM or PM, check if a FullDay preference exists and delete it
            if (request.DayPortion != DayPortion.FullDay)
            {
                var fullDayPreference = await _context.WorkLocationPreferences
                    .FirstOrDefaultAsync(w =>
                        w.UserId == request.UserId &&
                        w.WorkDate == workDate &&
                        w.TenantId == request.TenantId &&
                        w.DayPortion == DayPortion.FullDay);

                if (fullDayPreference != null)
                {
                    _context.WorkLocationPreferences.Remove(fullDayPreference);
                }
            }
            // If creating FullDay, delete any AM/PM preferences for that day
            else
            {
                var partialDayPreferences = await _context.WorkLocationPreferences
                    .Where(w =>
                        w.UserId == request.UserId &&
                        w.WorkDate == workDate &&
                        w.TenantId == request.TenantId &&
                        w.DayPortion != DayPortion.FullDay)
                    .ToListAsync();

                if (partialDayPreferences.Any())
                {
                    _context.WorkLocationPreferences.RemoveRange(partialDayPreferences);
                }
            }

            // Validate based on location type
            if (request.LocationType == WorkLocationType.OfficeWithReservation && request.BookingId == null)
            {
                return BadRequest("BookingId is required for OfficeWithReservation location type");
            }

            if ((request.LocationType == WorkLocationType.OfficeNoReservation ||
                 request.LocationType == WorkLocationType.ClientSite) &&
                request.OfficeId == null)
            {
                return BadRequest("OfficeId is required for OfficeNoReservation and ClientSite location types");
            }

            var preference = new WorkLocationPreference
            {
                Id = Guid.NewGuid(),
                TenantId = request.TenantId,
                UserId = request.UserId,
                WorkDate = workDate,
                LocationType = request.LocationType,
                DayPortion = request.DayPortion,
                OfficeId = request.OfficeId,
                BookingId = request.BookingId,
                RemoteLocation = request.RemoteLocation,
                City = request.City,
                State = request.State,
                Country = request.Country,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow
            };

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
        [FromBody] UpdateWorkLocationPreferenceRequest request)
    {
        if (id != request.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var existing = await _context.WorkLocationPreferences
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
            if (existing.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Users can only update their own work location preferences");
            }

            // Validate based on location type
            if (request.LocationType == WorkLocationType.OfficeWithReservation && request.BookingId == null)
            {
                return BadRequest("BookingId is required for OfficeWithReservation location type");
            }

            if ((request.LocationType == WorkLocationType.OfficeNoReservation ||
                 request.LocationType == WorkLocationType.ClientSite) &&
                request.OfficeId == null)
            {
                return BadRequest("OfficeId is required for OfficeNoReservation and ClientSite location types");
            }

            // Update properties
            existing.LocationType = request.LocationType;
            existing.DayPortion = request.DayPortion;
            existing.OfficeId = request.OfficeId;
            existing.BookingId = request.BookingId;
            existing.RemoteLocation = request.RemoteLocation;
            existing.City = request.City;
            existing.State = request.State;
            existing.Country = request.Country;
            existing.Notes = request.Notes;
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
            if (preference.UserId != userId && !IsSystemAdmin())
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
                if (preference.UserId == Guid.Empty)
                {
                    return BadRequest("UserId is required for each preference");
                }

                // Check tenant access
                if (!userTenantIds.Contains(preference.TenantId) && !IsSystemAdmin())
                {
                    return StatusCode(403, $"You do not have access to tenant {preference.TenantId}");
                }

                // Users can only create their own preferences unless they are system admin
                if (preference.UserId != userId && !IsSystemAdmin())
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
                        w.UserId == preference.UserId &&
                        w.WorkDate == preference.WorkDate &&
                        w.TenantId == preference.TenantId);

                if (existing != null)
                {
                    // Update existing
                    existing.LocationType = preference.LocationType;
                    existing.DayPortion = preference.DayPortion;
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

// DTOs for request/response
public class CreateWorkLocationPreferenceRequest
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string WorkDate { get; set; } = string.Empty; // YYYY-MM-DD format
    public WorkLocationType LocationType { get; set; }
    public DayPortion DayPortion { get; set; } = DayPortion.FullDay; // Full day, AM only, or PM only
    public Guid? OfficeId { get; set; }
    public Guid? BookingId { get; set; }
    public string? RemoteLocation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Notes { get; set; }
}

public class UpdateWorkLocationPreferenceRequest
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string WorkDate { get; set; } = string.Empty; // YYYY-MM-DD format
    public WorkLocationType LocationType { get; set; }
    public DayPortion DayPortion { get; set; } = DayPortion.FullDay; // Full day, AM only, or PM only
    public Guid? OfficeId { get; set; }
    public Guid? BookingId { get; set; }
    public string? RemoteLocation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Notes { get; set; }
}


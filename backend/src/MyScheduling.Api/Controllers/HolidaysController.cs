using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<HolidaysController> _logger;

    public HolidaysController(MySchedulingDbContext context, ILogger<HolidaysController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/holidays
    [HttpGet]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<CompanyHoliday>>> GetHolidays(
        [FromQuery] Guid tenantId,
        [FromQuery] int? year = null,
        [FromQuery] HolidayType? type = null,
        [FromQuery] bool? isObserved = null)
    {
        try
        {
            var query = _context.CompanyHolidays
                .AsNoTracking()
                .Where(h => h.TenantId == tenantId);

            if (year.HasValue)
            {
                query = query.Where(h => h.HolidayDate.Year == year.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(h => h.Type == type.Value);
            }

            if (isObserved.HasValue)
            {
                query = query.Where(h => h.IsObserved == isObserved.Value);
            }

            var holidays = await query
                .OrderBy(h => h.HolidayDate)
                .ToListAsync();

            return Ok(holidays);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving holidays for tenant {TenantId}", tenantId);
            return StatusCode(500, "An error occurred while retrieving holidays");
        }
    }

    // GET: api/holidays/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Read)]
    public async Task<ActionResult<CompanyHoliday>> GetHoliday(Guid id)
    {
        try
        {
            var holiday = await _context.CompanyHolidays
                .FirstOrDefaultAsync(h => h.Id == id);

            if (holiday == null)
            {
                return NotFound($"Holiday with ID {id} not found");
            }

            return Ok(holiday);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving holiday {HolidayId}", id);
            return StatusCode(500, "An error occurred while retrieving the holiday");
        }
    }

    // POST: api/holidays
    [HttpPost]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Create)]
    public async Task<ActionResult<CompanyHoliday>> CreateHoliday(CompanyHoliday holiday)
    {
        try
        {
            _context.CompanyHolidays.Add(holiday);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetHoliday), new { id = holiday.Id }, holiday);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating holiday");
            return StatusCode(500, "An error occurred while creating the holiday");
        }
    }

    // PUT: api/holidays/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateHoliday(Guid id, CompanyHoliday holiday)
    {
        if (id != holiday.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var existing = await _context.CompanyHolidays.FindAsync(id);
            if (existing == null)
            {
                return NotFound($"Holiday with ID {id} not found");
            }

            _context.Entry(existing).CurrentValues.SetValues(holiday);
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating holiday {HolidayId}", id);
            return StatusCode(500, "An error occurred while updating the holiday");
        }
    }

    // DELETE: api/holidays/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteHoliday(Guid id)
    {
        try
        {
            var holiday = await _context.CompanyHolidays.FindAsync(id);
            if (holiday == null)
            {
                return NotFound($"Holiday with ID {id} not found");
            }

            _context.CompanyHolidays.Remove(holiday);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting holiday {HolidayId}", id);
            return StatusCode(500, "An error occurred while deleting the holiday");
        }
    }
}

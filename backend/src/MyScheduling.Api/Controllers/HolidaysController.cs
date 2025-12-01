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
        [FromQuery] bool? isObserved = null,
        [FromQuery] bool? isActive = null)
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

            if (isActive.HasValue)
            {
                query = query.Where(h => h.IsActive == isActive.Value);
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

    // POST: api/holidays/seed-us-holidays
    [HttpPost("seed-us-holidays")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Create)]
    public async Task<ActionResult<SeedHolidaysResponse>> SeedUSHolidays([FromBody] SeedUSHolidaysRequest request)
    {
        try
        {
            var createdHolidays = new List<CompanyHoliday>();
            var skippedCount = 0;

            for (int year = request.StartYear; year <= request.EndYear; year++)
            {
                var holidaysToCreate = GetUSFederalHolidays(year, request.TenantId, request.IncludeDayAfterThanksgiving);

                foreach (var holiday in holidaysToCreate)
                {
                    // Check if holiday already exists for this tenant/date
                    var exists = await _context.CompanyHolidays
                        .AnyAsync(h => h.TenantId == request.TenantId
                                    && h.HolidayDate == holiday.HolidayDate
                                    && h.Name == holiday.Name);

                    if (exists)
                    {
                        skippedCount++;
                        continue;
                    }

                    holiday.IsActive = request.MarkAsActive;
                    holiday.AutoApplyToSchedule = request.AutoApplyToSchedule;
                    holiday.AutoApplyToForecast = request.AutoApplyToForecast;

                    _context.CompanyHolidays.Add(holiday);
                    createdHolidays.Add(holiday);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new SeedHolidaysResponse
            {
                CreatedCount = createdHolidays.Count,
                SkippedCount = skippedCount,
                Holidays = createdHolidays
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding US holidays");
            return StatusCode(500, "An error occurred while seeding US holidays");
        }
    }

    // POST: api/holidays/apply-to-schedules
    [HttpPost("apply-to-schedules")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Update)]
    public async Task<ActionResult<ApplyHolidaysResponse>> ApplyHolidaysToSchedules([FromBody] ApplyHolidaysRequest request)
    {
        try
        {
            // Get holidays to apply
            var holidays = await _context.CompanyHolidays
                .Where(h => h.TenantId == request.TenantId
                         && h.IsActive
                         && h.AutoApplyToSchedule
                         && h.HolidayDate.Year == request.Year)
                .ToListAsync();

            if (request.HolidayIds != null && request.HolidayIds.Count > 0)
            {
                holidays = holidays.Where(h => request.HolidayIds.Contains(h.Id)).ToList();
            }

            // Get all active users for this tenant
            var users = await _context.TenantMemberships
                .Where(tm => tm.TenantId == request.TenantId && tm.IsActive)
                .Select(tm => tm.UserId)
                .ToListAsync();

            var createdCount = 0;
            var skippedCount = 0;
            var holidayResults = new List<HolidayApplyResult>();

            foreach (var holiday in holidays)
            {
                var holidayResult = new HolidayApplyResult
                {
                    HolidayId = holiday.Id,
                    HolidayName = holiday.Name,
                    HolidayDate = holiday.HolidayDate
                };

                foreach (var userId in users)
                {
                    // Check if user already has a preference for this date
                    var existingPref = await _context.WorkLocationPreferences
                        .FirstOrDefaultAsync(w => w.UserId == userId
                                               && w.TenantId == request.TenantId
                                               && w.WorkDate == holiday.HolidayDate
                                               && w.DayPortion == DayPortion.FullDay);

                    if (existingPref != null && !request.OverwriteExisting)
                    {
                        skippedCount++;
                        holidayResult.SkippedUsers++;
                        continue;
                    }

                    if (existingPref != null && request.OverwriteExisting)
                    {
                        // Update existing
                        existingPref.LocationType = WorkLocationType.PTO;
                        existingPref.Notes = $"Federal Holiday: {holiday.Name}";
                        existingPref.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // Create new
                        var preference = new WorkLocationPreference
                        {
                            UserId = userId,
                            TenantId = request.TenantId,
                            WorkDate = holiday.HolidayDate,
                            LocationType = WorkLocationType.PTO,
                            DayPortion = DayPortion.FullDay,
                            Notes = $"Federal Holiday: {holiday.Name}"
                        };
                        _context.WorkLocationPreferences.Add(preference);
                    }

                    createdCount++;
                    holidayResult.AffectedUsers++;
                }

                holidayResults.Add(holidayResult);
            }

            await _context.SaveChangesAsync();

            return Ok(new ApplyHolidaysResponse
            {
                TotalUsersAffected = users.Count,
                EntriesCreated = createdCount,
                EntriesSkipped = skippedCount,
                HolidayResults = holidayResults
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying holidays to schedules");
            return StatusCode(500, "An error occurred while applying holidays to schedules");
        }
    }

    // GET: api/holidays/by-date/{date}
    [HttpGet("by-date/{date}")]
    [RequiresPermission(Resource = "Holiday", Action = PermissionAction.Read)]
    public async Task<ActionResult<HolidayCheckResponse>> CheckHolidayByDate(
        [FromRoute] DateOnly date,
        [FromQuery] Guid tenantId)
    {
        try
        {
            var holiday = await _context.CompanyHolidays
                .FirstOrDefaultAsync(h => h.TenantId == tenantId
                                       && h.HolidayDate == date
                                       && h.IsActive);

            return Ok(new HolidayCheckResponse
            {
                IsHoliday = holiday != null,
                Holiday = holiday
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking holiday for date {Date}", date);
            return StatusCode(500, "An error occurred while checking the date");
        }
    }

    // Helper method to calculate US Federal Holidays
    private List<CompanyHoliday> GetUSFederalHolidays(int year, Guid tenantId, bool includeDayAfterThanksgiving)
    {
        var holidays = new List<CompanyHoliday>
        {
            // New Year's Day - January 1
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "New Year's Day",
                HolidayDate = new DateOnly(year, 1, 1),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 1,
                RecurringDay = 1,
                RecurrenceRule = HolidayRecurrenceRule.FixedDate,
                IsObserved = true
            },
            // MLK Day - Third Monday of January
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Martin Luther King Jr. Day",
                HolidayDate = GetNthWeekdayOfMonth(year, 1, DayOfWeek.Monday, 3),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 1,
                RecurrenceRule = HolidayRecurrenceRule.ThirdMondayOf,
                IsObserved = true
            },
            // Presidents Day - Third Monday of February
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Presidents Day",
                HolidayDate = GetNthWeekdayOfMonth(year, 2, DayOfWeek.Monday, 3),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 2,
                RecurrenceRule = HolidayRecurrenceRule.ThirdMondayOf,
                IsObserved = true
            },
            // Memorial Day - Last Monday of May
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Memorial Day",
                HolidayDate = GetLastWeekdayOfMonth(year, 5, DayOfWeek.Monday),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 5,
                RecurrenceRule = HolidayRecurrenceRule.LastMondayOf,
                IsObserved = true
            },
            // Juneteenth - June 19
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Juneteenth National Independence Day",
                HolidayDate = new DateOnly(year, 6, 19),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 6,
                RecurringDay = 19,
                RecurrenceRule = HolidayRecurrenceRule.FixedDate,
                IsObserved = true
            },
            // Independence Day - July 4
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Independence Day",
                HolidayDate = new DateOnly(year, 7, 4),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 7,
                RecurringDay = 4,
                RecurrenceRule = HolidayRecurrenceRule.FixedDate,
                IsObserved = true
            },
            // Labor Day - First Monday of September
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Labor Day",
                HolidayDate = GetNthWeekdayOfMonth(year, 9, DayOfWeek.Monday, 1),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 9,
                RecurrenceRule = HolidayRecurrenceRule.FirstMondayOf,
                IsObserved = true
            },
            // Columbus Day - Second Monday of October
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Columbus Day",
                HolidayDate = GetNthWeekdayOfMonth(year, 10, DayOfWeek.Monday, 2),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 10,
                RecurrenceRule = HolidayRecurrenceRule.SecondMondayOf,
                IsObserved = true
            },
            // Veterans Day - November 11
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Veterans Day",
                HolidayDate = new DateOnly(year, 11, 11),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 11,
                RecurringDay = 11,
                RecurrenceRule = HolidayRecurrenceRule.FixedDate,
                IsObserved = true
            },
            // Thanksgiving - Fourth Thursday of November
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Thanksgiving Day",
                HolidayDate = GetNthWeekdayOfMonth(year, 11, DayOfWeek.Thursday, 4),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 11,
                RecurrenceRule = HolidayRecurrenceRule.FourthThursdayOf,
                IsObserved = true
            },
            // Christmas Day - December 25
            new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Christmas Day",
                HolidayDate = new DateOnly(year, 12, 25),
                Type = HolidayType.Federal,
                IsRecurring = true,
                RecurringMonth = 12,
                RecurringDay = 25,
                RecurrenceRule = HolidayRecurrenceRule.FixedDate,
                IsObserved = true
            }
        };

        if (includeDayAfterThanksgiving)
        {
            var thanksgiving = GetNthWeekdayOfMonth(year, 11, DayOfWeek.Thursday, 4);
            holidays.Add(new CompanyHoliday
            {
                TenantId = tenantId,
                Name = "Day After Thanksgiving",
                HolidayDate = thanksgiving.AddDays(1),
                Type = HolidayType.Company,
                IsRecurring = true,
                RecurringMonth = 11,
                RecurrenceRule = HolidayRecurrenceRule.DayAfterThanksgiving,
                IsObserved = true
            });
        }

        return holidays;
    }

    private static DateOnly GetNthWeekdayOfMonth(int year, int month, DayOfWeek dayOfWeek, int n)
    {
        var firstOfMonth = new DateOnly(year, month, 1);
        var firstDayOfWeek = firstOfMonth.DayOfWeek;

        var daysUntilTarget = ((int)dayOfWeek - (int)firstDayOfWeek + 7) % 7;
        var firstOccurrence = firstOfMonth.AddDays(daysUntilTarget);

        return firstOccurrence.AddDays((n - 1) * 7);
    }

    private static DateOnly GetLastWeekdayOfMonth(int year, int month, DayOfWeek dayOfWeek)
    {
        var lastOfMonth = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
        var daysToSubtract = ((int)lastOfMonth.DayOfWeek - (int)dayOfWeek + 7) % 7;

        return lastOfMonth.AddDays(-daysToSubtract);
    }
}

// Request/Response DTOs
public class SeedUSHolidaysRequest
{
    public Guid TenantId { get; set; }
    public int StartYear { get; set; }
    public int EndYear { get; set; }
    public bool IncludeDayAfterThanksgiving { get; set; } = true;
    public bool MarkAsActive { get; set; } = true;
    public bool AutoApplyToSchedule { get; set; } = true;
    public bool AutoApplyToForecast { get; set; } = true;
}

public class SeedHolidaysResponse
{
    public int CreatedCount { get; set; }
    public int SkippedCount { get; set; }
    public List<CompanyHoliday> Holidays { get; set; } = new();
}

public class ApplyHolidaysRequest
{
    public Guid TenantId { get; set; }
    public int Year { get; set; }
    public List<Guid>? HolidayIds { get; set; }  // If null, apply all active holidays
    public bool OverwriteExisting { get; set; } = false;
}

public class ApplyHolidaysResponse
{
    public int TotalUsersAffected { get; set; }
    public int EntriesCreated { get; set; }
    public int EntriesSkipped { get; set; }
    public List<HolidayApplyResult> HolidayResults { get; set; } = new();
}

public class HolidayApplyResult
{
    public Guid HolidayId { get; set; }
    public string HolidayName { get; set; } = string.Empty;
    public DateOnly HolidayDate { get; set; }
    public int AffectedUsers { get; set; }
    public int SkippedUsers { get; set; }
}

public class HolidayCheckResponse
{
    public bool IsHoliday { get; set; }
    public CompanyHoliday? Holiday { get; set; }
}

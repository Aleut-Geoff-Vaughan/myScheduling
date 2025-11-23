using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DashboardController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<DashboardController> _logger;
    private readonly IAuthorizationService _authService;

    public DashboardController(
        MySchedulingDbContext context,
        ILogger<DashboardController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    /// Get dashboard data for current user including work location preferences and statistics
    /// <param name="userId">Current user's ID</param>
    /// <param name="startDate">Optional start date (defaults to Monday of current week)</param>
    /// <param name="endDate">Optional end date (defaults to Friday of next week)</param>
    /// <returns>Dashboard data with person info, preferences, and statistics</returns>
    [HttpGet]
    [RequiresPermission(Resource = "Dashboard", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(DashboardData), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<DashboardData>> GetDashboard(
        [FromQuery] Guid userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            // Get current user's person record
            var person = await _context.People
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (person == null)
            {
                _logger.LogWarning("Person record not found for user {UserId}", userId);
                return NotFound("Person record not found for current user");
            }

            // Calculate default date range (Monday of current week to Friday of next week)
            var today = DateTime.UtcNow.Date;
            var defaultStart = GetMondayOfCurrentWeek(today);

            var start = startDate.HasValue
                ? (startDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc)
                    : startDate.Value.ToUniversalTime())
                : defaultStart;

            var end = endDate.HasValue
                ? (endDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc)
                    : endDate.Value.ToUniversalTime())
                : start.AddDays(11); // 10 weekdays + 1 day

            // Get preferences for date range
            var preferences = await _context.WorkLocationPreferences
                .Include(p => p.Office)
                .Where(p => p.PersonId == person.Id
                         && p.WorkDate >= DateOnly.FromDateTime(start)
                         && p.WorkDate <= DateOnly.FromDateTime(end))
                .OrderBy(p => p.WorkDate)
                .ToListAsync();

            // Calculate statistics
            var remoteDays = preferences.Count(p =>
                p.LocationType == WorkLocationType.Remote ||
                p.LocationType == WorkLocationType.RemotePlus);

            var officeDays = preferences.Count(p =>
                p.LocationType == WorkLocationType.OfficeNoReservation ||
                p.LocationType == WorkLocationType.OfficeWithReservation);

            var clientSites = preferences.Count(p =>
                p.LocationType == WorkLocationType.ClientSite);

            var totalWeekdays = 10; // 2 weeks * 5 days
            var notSet = totalWeekdays - preferences.Count;

            var stats = new DashboardStats
            {
                RemoteDays = remoteDays,
                OfficeDays = officeDays,
                ClientSites = clientSites,
                NotSet = notSet,
                TotalWeekdays = totalWeekdays
            };

            var dashboardData = new DashboardData
            {
                Person = person,
                Preferences = preferences,
                Stats = stats,
                StartDate = start,
                EndDate = end
            };

            _logger.LogInformation("Dashboard data retrieved for user {UserId}", userId);

            return Ok(dashboardData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard data for user {UserId}", userId);
            return StatusCode(500, "An error occurred while retrieving dashboard data");
        }
    }

    private static DateTime GetMondayOfCurrentWeek(DateTime date)
    {
        var dayOfWeek = (int)date.DayOfWeek;
        var diff = date.Date.AddDays(-(dayOfWeek == 0 ? 6 : dayOfWeek - 1));
        return diff;
    }
}

/// <summary>
/// Dashboard data response containing user info, preferences, and statistics
/// </summary>
public class DashboardData
{
    public Person Person { get; set; } = null!;
    public List<WorkLocationPreference> Preferences { get; set; } = new();
    public DashboardStats Stats { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

/// <summary>
/// Dashboard statistics for work location preferences
/// </summary>
public class DashboardStats
{
    public int RemoteDays { get; set; }
    public int OfficeDays { get; set; }
    public int ClientSites { get; set; }
    public int NotSet { get; set; }
    public int TotalWeekdays { get; set; }
}

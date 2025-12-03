using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Infrastructure.Data.Seeds;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Development-only controller for database seeding operations
/// </summary>
[ApiController]
[Route("api/dev/[controller]")]
public class DevSeedController : ControllerBase
{
    private readonly DatabaseSeeder _seeder;
    private readonly StaffingSeeder _staffingSeeder;
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<DevSeedController> _logger;
    private readonly IWebHostEnvironment _environment;

    public DevSeedController(
        DatabaseSeeder seeder,
        StaffingSeeder staffingSeeder,
        MySchedulingDbContext context,
        ILogger<DevSeedController> logger,
        IWebHostEnvironment environment)
    {
        _seeder = seeder;
        _staffingSeeder = staffingSeeder;
        _context = context;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Clear all data from the database
    /// Only available in Development environment
    /// </summary>
    [HttpPost("clear")]
    public async Task<IActionResult> ClearDatabase()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Database clearing is only available in Development environment");
        }

        try
        {
            _logger.LogInformation("Clearing database via API endpoint");

            // Delete all data in reverse dependency order
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE bookings CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE work_location_preferences CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE work_location_templates CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE company_holidays CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE assignments CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE assignment_requests CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE project_assignments CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE project_roles CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE wbs_change_history CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE wbs_elements CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE projects CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE spaces CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE offices CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE tenant_memberships CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE group_memberships CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE groups CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE delegation_of_authority CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE resume_approvals CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE resume_sections CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE resume_profiles CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE resume_templates CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE user_invitations CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE users CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE tenants CASCADE");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE login_audits CASCADE");

            _logger.LogInformation("Database cleared successfully");
            return Ok(new { message = "Database cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing database");
            return StatusCode(500, new { message = "Database clearing failed", error = ex.Message });
        }
    }

    /// <summary>
    /// Trigger database seeding
    /// Only available in Development environment
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Seeding is only available in Development environment");
        }

        try
        {
            _logger.LogInformation("Manual seed triggered via API endpoint");
            await _seeder.SeedAsync();
            return Ok(new { message = "Database seeding completed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during manual seeding");
            return StatusCode(500, new { message = "Seeding failed", error = ex.Message });
        }
    }

    /// <summary>
    /// Clear and reseed the database
    /// Only available in Development environment
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetDatabase()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Database reset is only available in Development environment");
        }

        try
        {
            _logger.LogInformation("Resetting database (clear + seed) via API endpoint");

            // Clear first
            await ClearDatabase();

            // Then seed
            await _seeder.SeedAsync();

            return Ok(new { message = "Database reset completed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database reset");
            return StatusCode(500, new { message = "Database reset failed", error = ex.Message });
        }
    }

    /// <summary>
    /// View seed data stats
    /// Only available in Development environment
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetSeedStats()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Seed stats are only available in Development environment");
        }

        try
        {
            var projects = await _context.Projects.Take(5).Select(p => new
            {
                p.Name,
                p.ProgramCode,
                p.StartDate,
                p.EndDate,
                p.Status
            }).ToListAsync();

            var wbs = await _context.WbsElements.Take(5).Select(w => new
            {
                w.Code,
                w.Description,
                w.ValidFrom,
                w.ValidTo,
                w.StartDate,
                w.EndDate,
                w.Type,
                w.Status
            }).ToListAsync();

            var stats = new
            {
                TenantCount = await _context.Tenants.CountAsync(),
                UserCount = await _context.Users.CountAsync(),
                ProjectCount = await _context.Projects.CountAsync(),
                WbsCount = await _context.WbsElements.CountAsync(),
                AssignmentCount = await _context.Assignments.CountAsync(),
                SampleProjects = projects,
                SampleWbs = wbs
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting seed stats");
            return StatusCode(500, new { message = "Failed to get stats", error = ex.Message });
        }
    }

    /// <summary>
    /// Seed office data
    /// Only available in Development environment
    /// </summary>
    [HttpPost("seed-offices")]
    public async Task<IActionResult> SeedOffices()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Office seeding is only available in Development environment");
        }

        try
        {
            _logger.LogInformation("Seeding offices via API endpoint");

            // Get the first tenant to assign offices to
            var tenant = await _context.Tenants.FirstOrDefaultAsync();
            if (tenant == null)
            {
                return BadRequest(new { message = "No tenant found. Please seed the database first." });
            }

            // Check if offices already exist
            var existingOffices = await _context.Offices.Where(o => o.TenantId == tenant.Id).CountAsync();
            if (existingOffices > 0)
            {
                return Ok(new { message = $"Offices already seeded. Found {existingOffices} existing offices." });
            }

            var offices = new List<Office>
            {
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "National Headquarters",
                    Address = "12355 Sunrise Valley Drive, Suite 300, Reston, VA 20191-3497",
                    Timezone = "America/New_York",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Colorado Springs, CO",
                    Address = "5775 Mark Dabling Blvd., Suite 105, Colorado Springs, CO 80919-2240",
                    Timezone = "America/Denver",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Oak Ridge, TN",
                    Address = "667 Emory Valley Road, Oak Ridge, TN 37830-7762",
                    Timezone = "America/New_York",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Paducah, KY",
                    Address = "148 Stuart Nelson Park Rd, Paducah, KY 42001",
                    Timezone = "America/Chicago",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Anchorage, AK",
                    Address = "810 N Street, Suite 302, Anchorage, AK 99501",
                    Timezone = "America/Anchorage",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Albuquerque, NM",
                    Address = "4100 Osuna Road NE, Suite 1-103, Albuquerque, NM 87109",
                    Timezone = "America/Denver",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Office
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = "Arlington, VA",
                    Address = "1735 N Lynn Street, Suite 840, Arlington, VA 22209",
                    Timezone = "America/New_York",
                    Status = OfficeStatus.Active,
                    IsClientSite = false,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await _context.Offices.AddRangeAsync(offices);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully seeded {Count} offices", offices.Count);
            return Ok(new { message = $"Successfully seeded {offices.Count} offices", offices = offices.Select(o => new { o.Name, o.Address }) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding offices");
            return StatusCode(500, new { message = "Office seeding failed", error = ex.Message });
        }
    }

    /// <summary>
    /// Seed staffing module data (CareerJobFamilies, Subcontractors, ProjectRoleAssignments, Forecasts)
    /// Only available in Development environment
    /// </summary>
    [HttpPost("seed-staffing")]
    public async Task<IActionResult> SeedStaffing()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Staffing seeding is only available in Development environment");
        }

        try
        {
            _logger.LogInformation("Seeding staffing data via API endpoint");
            await _staffingSeeder.SeedAsync();

            // Return stats
            var stats = new
            {
                CareerJobFamilies = await _context.CareerJobFamilies.CountAsync(),
                SubcontractorCompanies = await _context.SubcontractorCompanies.CountAsync(),
                Subcontractors = await _context.Subcontractors.CountAsync(),
                LaborCategories = await _context.LaborCategories.CountAsync(),
                ProjectRoleAssignments = await _context.ProjectRoleAssignments.CountAsync(),
                ForecastVersions = await _context.ForecastVersions.CountAsync(),
                Forecasts = await _context.Forecasts.CountAsync(),
                ForecastApprovalSchedules = await _context.ForecastApprovalSchedules.CountAsync()
            };

            return Ok(new { message = "Staffing data seeded successfully", stats });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding staffing data");
            return StatusCode(500, new { message = "Staffing seeding failed", error = ex.Message });
        }
    }

    /// <summary>
    /// Get staffing module stats
    /// Only available in Development environment
    /// </summary>
    [HttpGet("staffing-stats")]
    public async Task<IActionResult> GetStaffingStats()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Staffing stats are only available in Development environment");
        }

        try
        {
            var tenant = await _context.Tenants.FirstOrDefaultAsync();
            if (tenant == null) return NotFound("No tenant found");

            var stats = new
            {
                CareerJobFamilies = await _context.CareerJobFamilies.CountAsync(c => c.TenantId == tenant.Id),
                SubcontractorCompanies = await _context.SubcontractorCompanies.CountAsync(s => s.TenantId == tenant.Id),
                Subcontractors = await _context.Subcontractors.CountAsync(s => s.TenantId == tenant.Id),
                LaborCategories = await _context.LaborCategories.CountAsync(l => l.TenantId == tenant.Id),
                ProjectRoleAssignments = await _context.ProjectRoleAssignments.CountAsync(p => p.TenantId == tenant.Id),
                ForecastVersions = await _context.ForecastVersions.CountAsync(v => v.TenantId == tenant.Id),
                Forecasts = await _context.Forecasts.CountAsync(f => f.TenantId == tenant.Id),
                ForecastsByStatus = await _context.Forecasts
                    .Where(f => f.TenantId == tenant.Id)
                    .GroupBy(f => f.Status)
                    .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync(),
                TotalForecastedHours = await _context.Forecasts
                    .Where(f => f.TenantId == tenant.Id)
                    .SumAsync(f => f.ForecastedHours)
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staffing stats");
            return StatusCode(500, new { message = "Failed to get staffing stats", error = ex.Message });
        }
    }
}

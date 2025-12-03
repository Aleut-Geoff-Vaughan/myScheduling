using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Controller for staffing reports and analytics
/// </summary>
[ApiController]
[Route("api/staffing/[controller]")]
[Authorize]
public class StaffingReportsController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<StaffingReportsController> _logger;

    public StaffingReportsController(
        MySchedulingDbContext context,
        ILogger<StaffingReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get overall staffing dashboard summary
    /// </summary>
    [HttpGet("dashboard-summary")]
    public async Task<IActionResult> GetDashboardSummary([FromQuery] Guid? projectId = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            // Get the current forecast version
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            if (currentVersion == null)
            {
                return Ok(new
                {
                    hasData = false,
                    message = "No current forecast version found"
                });
            }

            var forecastsQuery = _context.Forecasts
                .Include(f => f.ProjectRoleAssignment)
                .Where(f => f.TenantId == tenantId && f.ForecastVersionId == currentVersion.Id);

            if (projectId.HasValue)
            {
                forecastsQuery = forecastsQuery.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
            }

            var forecasts = await forecastsQuery.ToListAsync();

            if (!forecasts.Any())
            {
                return Ok(new
                {
                    hasData = false,
                    message = "No forecast data found"
                });
            }

            // Calculate summary metrics
            var totalForecastedHours = forecasts.Sum(f => f.ForecastedHours);

            // Group by month
            var monthlyData = forecasts
                .GroupBy(f => new { f.Year, f.Month })
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    forecastedHours = g.Sum(f => f.ForecastedHours),
                    budgetedHours = 0m, // Not tracked at forecast level
                    actualHours = 0m // Not tracked at forecast level
                })
                .ToList();

            // Count by status
            var statusCounts = forecasts
                .GroupBy(f => f.Status)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            // Get unique projects and assignments
            var projectIds = forecasts.Select(f => f.ProjectRoleAssignment.ProjectId).Distinct().ToList();
            var assignmentCount = forecasts.Select(f => f.ProjectRoleAssignmentId).Distinct().Count();

            var summary = new
            {
                hasData = true,
                versionName = currentVersion.Name,
                versionId = currentVersion.Id,
                totalForecastedHours,
                totalBudgetedHours = 0m,
                totalActualHours = 0m,
                variance = 0m,
                variancePercent = 0m,
                projectCount = projectIds.Count,
                assignmentCount,
                forecastCount = forecasts.Count,
                statusCounts,
                monthlyData
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard summary");
            return StatusCode(500, new { message = "Failed to get dashboard summary", error = ex.Message });
        }
    }

    /// <summary>
    /// Get project staffing summary with role assignments and forecasts
    /// </summary>
    [HttpGet("project-summary/{projectId}")]
    public async Task<IActionResult> GetProjectSummary(Guid projectId)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            var project = await _context.Projects
                .Where(p => p.Id == projectId && p.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { message = "Project not found" });
            }

            // Get current version
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            if (currentVersion == null)
            {
                return Ok(new
                {
                    project = new { project.Id, project.Name, project.ProgramCode },
                    hasData = false,
                    message = "No current forecast version found"
                });
            }

            // Get role assignments for this project
            var roleAssignments = await _context.ProjectRoleAssignments
                .Include(r => r.User)
                .Include(r => r.Subcontractor)
                .Include(r => r.LaborCategory)
                .Include(r => r.WbsElement)
                .Where(r => r.ProjectId == projectId && r.TenantId == tenantId)
                .ToListAsync();

            // Get forecasts for this project's assignments
            var assignmentIds = roleAssignments.Select(r => r.Id).ToList();
            var forecasts = await _context.Forecasts
                .Where(f => assignmentIds.Contains(f.ProjectRoleAssignmentId) &&
                           f.TenantId == tenantId &&
                           f.ForecastVersionId == currentVersion.Id)
                .ToListAsync();

            var forecastsByAssignment = forecasts
                .GroupBy(f => f.ProjectRoleAssignmentId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Build role assignment summaries
            var assignmentSummaries = roleAssignments.Select(r =>
            {
                var assignmentForecasts = forecastsByAssignment.GetValueOrDefault(r.Id, new List<Forecast>());
                var totalForecast = assignmentForecasts.Sum(f => f.ForecastedHours);

                // Determine assignee type
                var assigneeType = r.UserId.HasValue ? "Employee" : r.SubcontractorId.HasValue ? "Subcontractor" : "TBD";
                var assigneeName = r.User != null
                    ? r.User.DisplayName
                    : r.Subcontractor != null
                        ? $"{r.Subcontractor.FirstName} {r.Subcontractor.LastName}"
                        : r.TbdDescription ?? "TBD";

                return new
                {
                    id = r.Id,
                    roleName = r.PositionTitle,
                    assigneeType,
                    assigneeName,
                    laborCategory = r.LaborCategory?.Name,
                    wbsCode = r.WbsElement?.Code,
                    billRate = r.LaborCategory?.BillRate,
                    totalForecastedHours = totalForecast,
                    totalBudgetedHours = 0m,
                    totalActualHours = 0m,
                    variance = 0m,
                    status = r.Status.ToString()
                };
            }).ToList();

            // Monthly totals for project
            var monthlyTotals = forecasts
                .GroupBy(f => new { f.Year, f.Month })
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    forecastedHours = g.Sum(f => f.ForecastedHours),
                    budgetedHours = 0m,
                    actualHours = 0m
                })
                .ToList();

            var summary = new
            {
                project = new
                {
                    project.Id,
                    project.Name,
                    project.ProgramCode,
                    project.StartDate,
                    project.EndDate,
                    status = project.Status.ToString()
                },
                hasData = true,
                versionName = currentVersion.Name,
                totalForecastedHours = forecasts.Sum(f => f.ForecastedHours),
                totalBudgetedHours = 0m,
                totalActualHours = 0m,
                assignmentCount = roleAssignments.Count,
                assignments = assignmentSummaries,
                monthlyTotals
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting project summary for {ProjectId}", projectId);
            return StatusCode(500, new { message = "Failed to get project summary", error = ex.Message });
        }
    }

    /// <summary>
    /// Get variance analysis comparing forecasts by project
    /// </summary>
    [HttpGet("variance-analysis")]
    public async Task<IActionResult> GetVarianceAnalysis([FromQuery] Guid? projectId = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            if (currentVersion == null)
            {
                return Ok(new { hasData = false, message = "No current forecast version found" });
            }

            var forecastsQuery = _context.Forecasts
                .Include(f => f.ProjectRoleAssignment)
                    .ThenInclude(p => p.Project)
                .Where(f => f.TenantId == tenantId && f.ForecastVersionId == currentVersion.Id);

            if (projectId.HasValue)
            {
                forecastsQuery = forecastsQuery.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
            }

            var forecasts = await forecastsQuery.ToListAsync();

            // Group by project
            var projectVariances = forecasts
                .GroupBy(f => f.ProjectRoleAssignment.Project)
                .Where(g => g.Key != null)
                .Select(g => new
                {
                    projectId = g.Key!.Id,
                    projectName = g.Key.Name,
                    programCode = g.Key.ProgramCode,
                    totalForecastedHours = g.Sum(f => f.ForecastedHours),
                    totalBudgetedHours = 0m,
                    totalActualHours = 0m,
                    variance = 0m,
                    variancePercent = 0m,
                    status = "OnTarget" // Placeholder since we don't track budget
                })
                .OrderByDescending(p => p.totalForecastedHours)
                .ToList();

            // Group by month
            var monthlyVariances = forecasts
                .GroupBy(f => new { f.Year, f.Month })
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    forecastedHours = g.Sum(f => f.ForecastedHours),
                    budgetedHours = 0m,
                    actualHours = 0m,
                    variance = 0m
                })
                .ToList();

            var analysis = new
            {
                hasData = true,
                summary = new
                {
                    totalForecastedHours = forecasts.Sum(f => f.ForecastedHours),
                    totalBudgetedHours = 0m,
                    totalActualHours = 0m,
                    totalVariance = 0m,
                    projectsOverBudget = 0,
                    projectsUnderBudget = projectVariances.Count
                },
                projectVariances,
                monthlyVariances
            };

            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting variance analysis");
            return StatusCode(500, new { message = "Failed to get variance analysis", error = ex.Message });
        }
    }

    /// <summary>
    /// Get burn rate analysis (monthly spending rate based on labor category rates)
    /// </summary>
    [HttpGet("burn-rate")]
    public async Task<IActionResult> GetBurnRate([FromQuery] Guid? projectId = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            if (currentVersion == null)
            {
                return Ok(new { hasData = false, message = "No current forecast version found" });
            }

            var forecastsQuery = _context.Forecasts
                .Include(f => f.ProjectRoleAssignment)
                    .ThenInclude(p => p.LaborCategory)
                .Where(f => f.TenantId == tenantId && f.ForecastVersionId == currentVersion.Id);

            if (projectId.HasValue)
            {
                forecastsQuery = forecastsQuery.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
            }

            var forecasts = await forecastsQuery.ToListAsync();

            // Calculate burn rate by month (hours * labor category bill rate)
            var monthlyBurnRate = forecasts
                .GroupBy(f => new { f.Year, f.Month })
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Month)
                .Select(g =>
                {
                    var forecastedCost = g.Sum(f => f.ForecastedHours * (f.ProjectRoleAssignment?.LaborCategory?.BillRate ?? 0));

                    return new
                    {
                        year = g.Key.Year,
                        month = g.Key.Month,
                        forecastedHours = g.Sum(f => f.ForecastedHours),
                        forecastedCost = Math.Round(forecastedCost, 2),
                        budgetedHours = 0m,
                        budgetedCost = 0m,
                        actualHours = 0m,
                        actualCost = 0m
                    };
                })
                .ToList();

            // Calculate cumulative burn
            decimal cumulativeForecast = 0;

            var cumulativeBurnRate = monthlyBurnRate.Select(m =>
            {
                cumulativeForecast += m.forecastedCost;

                return new
                {
                    m.year,
                    m.month,
                    m.forecastedCost,
                    m.budgetedCost,
                    m.actualCost,
                    cumulativeForecastedCost = Math.Round(cumulativeForecast, 2),
                    cumulativeBudgetedCost = 0m,
                    cumulativeActualCost = 0m
                };
            }).ToList();

            var totalForecastedCost = forecasts.Sum(f => f.ForecastedHours * (f.ProjectRoleAssignment?.LaborCategory?.BillRate ?? 0));
            var monthCount = monthlyBurnRate.Count;
            var avgMonthlyForecastedCost = monthCount > 0 ? totalForecastedCost / monthCount : 0;

            var burnAnalysis = new
            {
                hasData = true,
                summary = new
                {
                    totalForecastedCost = Math.Round(totalForecastedCost, 2),
                    totalBudgetedCost = 0m,
                    totalActualCost = 0m,
                    averageMonthlyForecastedCost = Math.Round(avgMonthlyForecastedCost, 2),
                    averageMonthlyBudgetedCost = 0m,
                    monthCount
                },
                monthlyBurnRate,
                cumulativeBurnRate
            };

            return Ok(burnAnalysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting burn rate analysis");
            return StatusCode(500, new { message = "Failed to get burn rate analysis", error = ex.Message });
        }
    }

    /// <summary>
    /// Get capacity utilization data
    /// </summary>
    [HttpGet("capacity-utilization")]
    public async Task<IActionResult> GetCapacityUtilization([FromQuery] int? year = null, [FromQuery] int? month = null)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            if (currentVersion == null)
            {
                return Ok(new { hasData = false, message = "No current forecast version found" });
            }

            var targetYear = year ?? DateTime.UtcNow.Year;
            var targetMonth = month ?? DateTime.UtcNow.Month;

            // Get role assignments with user info
            var roleAssignments = await _context.ProjectRoleAssignments
                .Include(r => r.User)
                .Include(r => r.Subcontractor)
                .Include(r => r.Project)
                .Where(r => r.TenantId == tenantId && r.Status == ProjectRoleAssignmentStatus.Active)
                .ToListAsync();

            // Get forecasts for the target month
            var forecasts = await _context.Forecasts
                .Where(f => f.TenantId == tenantId &&
                           f.ForecastVersionId == currentVersion.Id &&
                           f.Year == targetYear &&
                           f.Month == targetMonth)
                .ToListAsync();

            var forecastsByAssignment = forecasts.ToDictionary(f => f.ProjectRoleAssignmentId, f => f);

            // Standard hours per month (assuming 40 hrs/week * 4 weeks)
            const decimal standardMonthlyHours = 160;

            // Group by user/subcontractor to aggregate across projects
            var employeeUtilization = roleAssignments
                .Where(r => r.UserId.HasValue)
                .GroupBy(r => r.UserId!.Value)
                .Select(g =>
                {
                    var first = g.First();
                    var totalForecastedHours = g.Sum(r =>
                    {
                        forecastsByAssignment.TryGetValue(r.Id, out var forecast);
                        return forecast?.ForecastedHours ?? 0;
                    });

                    return new
                    {
                        id = first.UserId,
                        name = first.User?.DisplayName ?? "Unknown",
                        type = "Employee",
                        projectCount = g.Select(r => r.ProjectId).Distinct().Count(),
                        forecastedHours = totalForecastedHours,
                        availableHours = standardMonthlyHours,
                        utilizationPercent = Math.Round(totalForecastedHours / standardMonthlyHours * 100, 1)
                    };
                })
                .ToList();

            var subcontractorUtilization = roleAssignments
                .Where(r => r.SubcontractorId.HasValue)
                .GroupBy(r => r.SubcontractorId!.Value)
                .Select(g =>
                {
                    var first = g.First();
                    var totalForecastedHours = g.Sum(r =>
                    {
                        forecastsByAssignment.TryGetValue(r.Id, out var forecast);
                        return forecast?.ForecastedHours ?? 0;
                    });

                    return new
                    {
                        id = first.SubcontractorId,
                        name = first.Subcontractor != null
                            ? $"{first.Subcontractor.FirstName} {first.Subcontractor.LastName}"
                            : "Unknown",
                        type = "Subcontractor",
                        projectCount = g.Select(r => r.ProjectId).Distinct().Count(),
                        forecastedHours = totalForecastedHours,
                        availableHours = standardMonthlyHours,
                        utilizationPercent = Math.Round(totalForecastedHours / standardMonthlyHours * 100, 1)
                    };
                })
                .ToList();

            // Combine for statistics
            var allUtilizationPercents = employeeUtilization.Select(e => e.utilizationPercent)
                .Concat(subcontractorUtilization.Select(s => s.utilizationPercent))
                .ToList();

            // Utilization distribution
            var overUtilized = allUtilizationPercents.Count(p => p > 100);
            var fullyUtilized = allUtilizationPercents.Count(p => p >= 80 && p <= 100);
            var underUtilized = allUtilizationPercents.Count(p => p < 80);

            // Combine into single list
            var allUtilization = employeeUtilization
                .Select(e => new { e.id, e.name, e.type, e.projectCount, e.forecastedHours, e.availableHours, e.utilizationPercent })
                .Concat(subcontractorUtilization.Select(s => new { s.id, s.name, s.type, s.projectCount, s.forecastedHours, s.availableHours, s.utilizationPercent }))
                .OrderByDescending(u => u.utilizationPercent)
                .ToList();

            var result = new
            {
                hasData = true,
                period = new { year = targetYear, month = targetMonth },
                summary = new
                {
                    totalResources = allUtilization.Count,
                    employees = employeeUtilization.Count,
                    subcontractors = subcontractorUtilization.Count,
                    averageUtilization = allUtilizationPercents.Any()
                        ? Math.Round(allUtilizationPercents.Average(), 1)
                        : 0m,
                    overUtilized,
                    fullyUtilized,
                    underUtilized
                },
                utilization = allUtilization
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting capacity utilization");
            return StatusCode(500, new { message = "Failed to get capacity utilization", error = ex.Message });
        }
    }

    /// <summary>
    /// Get projects list with staffing summary for dropdown/selection
    /// </summary>
    [HttpGet("projects-summary")]
    public async Task<IActionResult> GetProjectsSummary()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return BadRequest(new { message = "Invalid tenant context" });
        }

        try
        {
            var currentVersion = await _context.ForecastVersions
                .Where(v => v.TenantId == tenantId && v.Type == ForecastVersionType.Current && v.IsCurrent)
                .FirstOrDefaultAsync();

            var projects = await _context.Projects
                .Where(p => p.TenantId == tenantId && p.Status == ProjectStatus.Active)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.ProgramCode,
                    p.StartDate,
                    p.EndDate
                })
                .ToListAsync();

            if (currentVersion == null)
            {
                return Ok(new
                {
                    projects = projects.Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.ProgramCode,
                        p.StartDate,
                        p.EndDate,
                        assignmentCount = 0,
                        forecastCount = 0,
                        totalForecastedHours = 0m
                    })
                });
            }

            // Get assignment counts
            var assignmentCounts = await _context.ProjectRoleAssignments
                .Where(r => r.TenantId == tenantId)
                .GroupBy(r => r.ProjectId)
                .Select(g => new { ProjectId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ProjectId, x => x.Count);

            // Get forecast summaries (join through assignments)
            var assignmentsByProject = await _context.ProjectRoleAssignments
                .Where(r => r.TenantId == tenantId)
                .Select(r => new { r.Id, r.ProjectId })
                .ToDictionaryAsync(r => r.Id, r => r.ProjectId);

            var forecastData = await _context.Forecasts
                .Where(f => f.TenantId == tenantId && f.ForecastVersionId == currentVersion.Id)
                .ToListAsync();

            var forecastSummariesByProject = forecastData
                .Where(f => assignmentsByProject.ContainsKey(f.ProjectRoleAssignmentId))
                .GroupBy(f => assignmentsByProject[f.ProjectRoleAssignmentId])
                .ToDictionary(
                    g => g.Key,
                    g => new { Count = g.Count(), TotalHours = g.Sum(f => f.ForecastedHours) }
                );

            var projectsSummary = projects.Select(p => new
            {
                p.Id,
                p.Name,
                p.ProgramCode,
                p.StartDate,
                p.EndDate,
                assignmentCount = assignmentCounts.GetValueOrDefault(p.Id, 0),
                forecastCount = forecastSummariesByProject.GetValueOrDefault(p.Id)?.Count ?? 0,
                totalForecastedHours = forecastSummariesByProject.GetValueOrDefault(p.Id)?.TotalHours ?? 0
            }).ToList();

            return Ok(new { projects = projectsSummary });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting projects summary");
            return StatusCode(500, new { message = "Failed to get projects summary", error = ex.Message });
        }
    }
}

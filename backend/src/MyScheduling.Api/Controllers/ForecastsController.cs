using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForecastsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ForecastsController> _logger;

    public ForecastsController(MySchedulingDbContext context, ILogger<ForecastsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ForecastResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? wbsElementId = null,
        [FromQuery] Guid? projectRoleAssignmentId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] ForecastStatus? status = null,
        [FromQuery] bool includeHistory = false)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.LaborCategory)
            .Include(f => f.ForecastVersion)
            .Where(f => f.TenantId == tenantId);

        // Default to current version if not specified
        if (versionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == versionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        if (projectId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
        }

        if (wbsElementId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignment.WbsElementId == wbsElementId.Value);
        }

        if (projectRoleAssignmentId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignmentId == projectRoleAssignmentId.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(f => f.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(f => f.Month == month.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(f => f.Status == status.Value);
        }

        var forecasts = await query
            .OrderBy(f => f.Year)
            .ThenBy(f => f.Month)
            .ThenBy(f => f.ProjectRoleAssignment.Project.Name)
            .AsNoTracking()
            .ToListAsync();

        return Ok(forecasts.Select(f => MapToResponse(f, includeHistory)));
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastResponse>> GetById(Guid id, [FromQuery] bool includeHistory = false)
    {
        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.LaborCategory)
            .Include(f => f.ForecastVersion)
            .AsQueryable();

        if (includeHistory)
        {
            query = query.Include(f => f.History).ThenInclude(h => h.ChangedByUser);
        }

        var forecast = await query.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        return Ok(MapToResponse(forecast, includeHistory));
    }

    [HttpGet("my-forecasts")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ForecastResponse>>> GetMyForecasts(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var currentUserId = GetCurrentUserId();

        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.LaborCategory)
            .Include(f => f.ForecastVersion)
            .Where(f => f.TenantId == tenantId && f.ProjectRoleAssignment.UserId == currentUserId);

        if (versionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == versionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        if (year.HasValue)
        {
            query = query.Where(f => f.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(f => f.Month == month.Value);
        }

        var forecasts = await query
            .OrderBy(f => f.Year)
            .ThenBy(f => f.Month)
            .ThenBy(f => f.ProjectRoleAssignment.Project.Name)
            .AsNoTracking()
            .ToListAsync();

        return Ok(forecasts.Select(f => MapToResponse(f, false)));
    }

    [HttpGet("by-project/{projectId}")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ForecastResponse>>> GetByProject(
        Guid projectId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project == null)
        {
            return NotFound("Project not found.");
        }

        if (!HasAccessToTenant(project.TenantId))
        {
            return Forbid();
        }

        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.LaborCategory)
            .Include(f => f.ForecastVersion)
            .Where(f => f.ProjectRoleAssignment.ProjectId == projectId);

        if (versionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == versionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        if (year.HasValue)
        {
            query = query.Where(f => f.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(f => f.Month == month.Value);
        }

        var forecasts = await query
            .OrderBy(f => f.Year)
            .ThenBy(f => f.Month)
            .ThenBy(f => f.ProjectRoleAssignment.WbsElement != null ? f.ProjectRoleAssignment.WbsElement.Code : "")
            .ThenBy(f => f.ProjectRoleAssignment.PositionTitle)
            .AsNoTracking()
            .ToListAsync();

        return Ok(forecasts.Select(f => MapToResponse(f, false)));
    }

    [HttpGet("summary")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastSummaryResponse>> GetSummary(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
            .Include(f => f.ForecastVersion)
            .Where(f => f.TenantId == tenantId);

        if (versionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == versionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        if (projectId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(f => f.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(f => f.Month == month.Value);
        }

        var forecasts = await query.AsNoTracking().ToListAsync();

        var summary = new ForecastSummaryResponse
        {
            TotalForecasts = forecasts.Count,
            TotalHours = forecasts.Sum(f => f.ForecastedHours),
            DraftCount = forecasts.Count(f => f.Status == ForecastStatus.Draft),
            SubmittedCount = forecasts.Count(f => f.Status == ForecastStatus.Submitted),
            ApprovedCount = forecasts.Count(f => f.Status == ForecastStatus.Approved),
            RejectedCount = forecasts.Count(f => f.Status == ForecastStatus.Rejected),
            LockedCount = forecasts.Count(f => f.Status == ForecastStatus.Locked),
            DraftHours = forecasts.Where(f => f.Status == ForecastStatus.Draft).Sum(f => f.ForecastedHours),
            SubmittedHours = forecasts.Where(f => f.Status == ForecastStatus.Submitted).Sum(f => f.ForecastedHours),
            ApprovedHours = forecasts.Where(f => f.Status == ForecastStatus.Approved).Sum(f => f.ForecastedHours),
            OverrideCount = forecasts.Count(f => f.IsOverride),
        };

        return Ok(summary);
    }

    [HttpPost]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Create)]
    public async Task<ActionResult<ForecastResponse>> Create(CreateForecastDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Verify assignment
        var assignment = await _context.ProjectRoleAssignments
            .Include(a => a.Project)
            .FirstOrDefaultAsync(a => a.Id == dto.ProjectRoleAssignmentId);

        if (assignment == null || assignment.TenantId != dto.TenantId)
        {
            return BadRequest("Invalid project role assignment.");
        }

        // Get or create current version if not specified
        Guid versionId = dto.ForecastVersionId ?? Guid.Empty;
        if (versionId == Guid.Empty)
        {
            var currentVersion = await _context.ForecastVersions
                .FirstOrDefaultAsync(v =>
                    v.TenantId == dto.TenantId &&
                    v.IsCurrent &&
                    v.Type == ForecastVersionType.Current &&
                    v.ProjectId == null);

            if (currentVersion == null)
            {
                // Create default version
                currentVersion = new ForecastVersion
                {
                    Id = Guid.NewGuid(),
                    TenantId = dto.TenantId,
                    Name = "Current",
                    Description = "Primary forecast version",
                    Type = ForecastVersionType.Current,
                    IsCurrent = true,
                    VersionNumber = 1,
                    StartYear = DateTime.UtcNow.Year,
                    StartMonth = DateTime.UtcNow.Month,
                    EndYear = DateTime.UtcNow.Year + 1,
                    EndMonth = 12,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = GetCurrentUserId()
                };
                _context.ForecastVersions.Add(currentVersion);
            }
            versionId = currentVersion.Id;
        }
        else
        {
            var version = await _context.ForecastVersions.FindAsync(versionId);
            if (version == null || version.TenantId != dto.TenantId)
            {
                return BadRequest("Invalid forecast version.");
            }
        }

        // Check for existing forecast for this period
        var existing = await _context.Forecasts
            .FirstOrDefaultAsync(f =>
                f.ProjectRoleAssignmentId == dto.ProjectRoleAssignmentId &&
                f.ForecastVersionId == versionId &&
                f.Year == dto.Year &&
                f.Month == dto.Month &&
                f.Week == dto.Week &&
                !f.IsDeleted);

        if (existing != null)
        {
            return BadRequest("Forecast already exists for this period. Use update instead.");
        }

        // Calculate recommended hours (simplified - can be enhanced later)
        decimal? recommendedHours = await CalculateRecommendedHours(dto.TenantId, dto.Year, dto.Month);

        var forecast = new Forecast
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            ProjectRoleAssignmentId = dto.ProjectRoleAssignmentId,
            ForecastVersionId = versionId,
            Year = dto.Year,
            Month = dto.Month,
            Week = dto.Week,
            ForecastedHours = dto.ForecastedHours,
            RecommendedHours = recommendedHours,
            Status = ForecastStatus.Draft,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.Forecasts.Add(forecast);

        // Add history entry
        _context.ForecastHistories.Add(new ForecastHistory
        {
            Id = Guid.NewGuid(),
            ForecastId = forecast.Id,
            ChangedByUserId = GetCurrentUserId(),
            ChangedAt = DateTime.UtcNow,
            ChangeType = ForecastChangeType.Created,
            NewHours = dto.ForecastedHours,
            NewStatus = ForecastStatus.Draft
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} created for assignment {AssignmentId} by {UserId}",
            forecast.Id, dto.ProjectRoleAssignmentId, GetCurrentUserId());

        var created = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == forecast.Id);

        return CreatedAtAction(nameof(GetById), new { id = forecast.Id }, MapToResponse(created, false));
    }

    [HttpPost("bulk")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Create)]
    public async Task<ActionResult<BulkForecastResponse>> CreateBulk(BulkCreateForecastDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        if (dto.Forecasts == null || dto.Forecasts.Count == 0)
        {
            return BadRequest("No forecasts provided.");
        }

        // Get or create current version if not specified
        Guid versionId = dto.ForecastVersionId ?? Guid.Empty;
        if (versionId == Guid.Empty)
        {
            var currentVersion = await _context.ForecastVersions
                .FirstOrDefaultAsync(v =>
                    v.TenantId == dto.TenantId &&
                    v.IsCurrent &&
                    v.Type == ForecastVersionType.Current &&
                    v.ProjectId == null);

            if (currentVersion == null)
            {
                currentVersion = new ForecastVersion
                {
                    Id = Guid.NewGuid(),
                    TenantId = dto.TenantId,
                    Name = "Current",
                    Description = "Primary forecast version",
                    Type = ForecastVersionType.Current,
                    IsCurrent = true,
                    VersionNumber = 1,
                    StartYear = DateTime.UtcNow.Year,
                    StartMonth = DateTime.UtcNow.Month,
                    EndYear = DateTime.UtcNow.Year + 1,
                    EndMonth = 12,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = GetCurrentUserId()
                };
                _context.ForecastVersions.Add(currentVersion);
            }
            versionId = currentVersion.Id;
        }

        var results = new BulkForecastResponse { TotalRequested = dto.Forecasts.Count };

        foreach (var item in dto.Forecasts)
        {
            // Check for existing
            var existing = await _context.Forecasts
                .FirstOrDefaultAsync(f =>
                    f.ProjectRoleAssignmentId == item.ProjectRoleAssignmentId &&
                    f.ForecastVersionId == versionId &&
                    f.Year == item.Year &&
                    f.Month == item.Month &&
                    f.Week == item.Week &&
                    !f.IsDeleted);

            if (existing != null)
            {
                if (dto.UpdateExisting)
                {
                    existing.ForecastedHours = item.ForecastedHours;
                    existing.Notes = item.Notes ?? existing.Notes;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.UpdatedByUserId = GetCurrentUserId();
                    results.UpdatedCount++;
                }
                else
                {
                    results.SkippedCount++;
                }
                continue;
            }

            // Verify assignment
            var assignment = await _context.ProjectRoleAssignments.FindAsync(item.ProjectRoleAssignmentId);
            if (assignment == null || assignment.TenantId != dto.TenantId)
            {
                results.FailedCount++;
                continue;
            }

            var forecast = new Forecast
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                ProjectRoleAssignmentId = item.ProjectRoleAssignmentId,
                ForecastVersionId = versionId,
                Year = item.Year,
                Month = item.Month,
                Week = item.Week,
                ForecastedHours = item.ForecastedHours,
                Status = ForecastStatus.Draft,
                Notes = item.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = GetCurrentUserId()
            };

            _context.Forecasts.Add(forecast);
            results.CreatedCount++;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bulk forecast: {Created} created, {Updated} updated, {Skipped} skipped, {Failed} failed",
            results.CreatedCount, results.UpdatedCount, results.SkippedCount, results.FailedCount);

        return Ok(results);
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastResponse>> Update(Guid id, UpdateForecastDto dto)
    {
        var forecast = await _context.Forecasts
            .Include(f => f.ForecastVersion)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        // Check if locked
        if (forecast.Status == ForecastStatus.Locked)
        {
            return BadRequest("Cannot update a locked forecast.");
        }

        var oldHours = forecast.ForecastedHours;
        var oldStatus = forecast.Status;
        var hasHoursChange = dto.ForecastedHours.HasValue && dto.ForecastedHours.Value != oldHours;

        if (dto.ForecastedHours.HasValue)
        {
            forecast.ForecastedHours = dto.ForecastedHours.Value;
        }

        if (dto.Notes != null)
        {
            forecast.Notes = dto.Notes;
        }

        forecast.UpdatedAt = DateTime.UtcNow;
        forecast.UpdatedByUserId = GetCurrentUserId();

        // Add history if hours changed
        if (hasHoursChange)
        {
            _context.ForecastHistories.Add(new ForecastHistory
            {
                Id = Guid.NewGuid(),
                ForecastId = forecast.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = ForecastChangeType.HoursUpdated,
                OldHours = oldHours,
                NewHours = dto.ForecastedHours,
                OldStatus = oldStatus,
                NewStatus = forecast.Status
            });
        }

        await _context.SaveChangesAsync();

        var updated = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == id);

        return Ok(MapToResponse(updated, false));
    }

    [HttpPost("{id}/submit")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastResponse>> Submit(Guid id, SubmitForecastDto? dto = null)
    {
        var forecast = await _context.Forecasts
            .Include(f => f.ForecastVersion)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        if (forecast.Status != ForecastStatus.Draft && forecast.Status != ForecastStatus.Rejected)
        {
            return BadRequest($"Cannot submit forecast with status {forecast.Status}.");
        }

        var oldStatus = forecast.Status;

        forecast.Status = ForecastStatus.Submitted;
        forecast.SubmittedByUserId = GetCurrentUserId();
        forecast.SubmittedAt = DateTime.UtcNow;
        forecast.UpdatedAt = DateTime.UtcNow;
        forecast.UpdatedByUserId = GetCurrentUserId();

        _context.ForecastHistories.Add(new ForecastHistory
        {
            Id = Guid.NewGuid(),
            ForecastId = forecast.Id,
            ChangedByUserId = GetCurrentUserId(),
            ChangedAt = DateTime.UtcNow,
            ChangeType = ForecastChangeType.Submitted,
            OldStatus = oldStatus,
            NewStatus = ForecastStatus.Submitted,
            ChangeReason = dto?.Notes
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} submitted by {UserId}", id, GetCurrentUserId());

        var updated = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == id);

        return Ok(MapToResponse(updated, false));
    }

    [HttpPost("{id}/approve")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Approve)]
    public async Task<ActionResult<ForecastResponse>> Approve(Guid id, ApproveForecastDto? dto = null)
    {
        var forecast = await _context.Forecasts
            .Include(f => f.ForecastVersion)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        if (forecast.Status != ForecastStatus.Submitted)
        {
            return BadRequest($"Cannot approve forecast with status {forecast.Status}. Must be Submitted.");
        }

        var oldStatus = forecast.Status;

        forecast.Status = ForecastStatus.Approved;
        forecast.ApprovedByUserId = GetCurrentUserId();
        forecast.ApprovedAt = DateTime.UtcNow;
        forecast.ApprovalNotes = dto?.Notes;
        forecast.UpdatedAt = DateTime.UtcNow;
        forecast.UpdatedByUserId = GetCurrentUserId();

        _context.ForecastHistories.Add(new ForecastHistory
        {
            Id = Guid.NewGuid(),
            ForecastId = forecast.Id,
            ChangedByUserId = GetCurrentUserId(),
            ChangedAt = DateTime.UtcNow,
            ChangeType = ForecastChangeType.Approved,
            OldStatus = oldStatus,
            NewStatus = ForecastStatus.Approved,
            ChangeReason = dto?.Notes
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} approved by {UserId}", id, GetCurrentUserId());

        var updated = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == id);

        return Ok(MapToResponse(updated, false));
    }

    [HttpPost("{id}/reject")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Approve)]
    public async Task<ActionResult<ForecastResponse>> Reject(Guid id, RejectForecastDto dto)
    {
        var forecast = await _context.Forecasts
            .Include(f => f.ForecastVersion)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        if (forecast.Status != ForecastStatus.Submitted)
        {
            return BadRequest($"Cannot reject forecast with status {forecast.Status}. Must be Submitted.");
        }

        var oldStatus = forecast.Status;

        forecast.Status = ForecastStatus.Rejected;
        forecast.ApprovalNotes = dto.Reason;
        forecast.UpdatedAt = DateTime.UtcNow;
        forecast.UpdatedByUserId = GetCurrentUserId();

        _context.ForecastHistories.Add(new ForecastHistory
        {
            Id = Guid.NewGuid(),
            ForecastId = forecast.Id,
            ChangedByUserId = GetCurrentUserId(),
            ChangedAt = DateTime.UtcNow,
            ChangeType = ForecastChangeType.Rejected,
            OldStatus = oldStatus,
            NewStatus = ForecastStatus.Rejected,
            ChangeReason = dto.Reason
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} rejected by {UserId}: {Reason}", id, GetCurrentUserId(), dto.Reason);

        var updated = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == id);

        return Ok(MapToResponse(updated, false));
    }

    [HttpPost("{id}/override")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Manage)]
    public async Task<ActionResult<ForecastResponse>> Override(Guid id, OverrideForecastDto dto)
    {
        var forecast = await _context.Forecasts
            .Include(f => f.ForecastVersion)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        if (forecast.Status == ForecastStatus.Locked)
        {
            return BadRequest("Cannot override a locked forecast.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            return BadRequest("Override reason is required.");
        }

        var oldHours = forecast.ForecastedHours;
        var oldStatus = forecast.Status;

        forecast.OriginalForecastedHours = forecast.IsOverride ? forecast.OriginalForecastedHours : oldHours;
        forecast.ForecastedHours = dto.NewHours;
        forecast.IsOverride = true;
        forecast.OverriddenByUserId = GetCurrentUserId();
        forecast.OverriddenAt = DateTime.UtcNow;
        forecast.OverrideReason = dto.Reason;
        forecast.Status = ForecastStatus.Approved; // Override auto-approves
        forecast.ApprovedByUserId = GetCurrentUserId();
        forecast.ApprovedAt = DateTime.UtcNow;
        forecast.UpdatedAt = DateTime.UtcNow;
        forecast.UpdatedByUserId = GetCurrentUserId();

        _context.ForecastHistories.Add(new ForecastHistory
        {
            Id = Guid.NewGuid(),
            ForecastId = forecast.Id,
            ChangedByUserId = GetCurrentUserId(),
            ChangedAt = DateTime.UtcNow,
            ChangeType = ForecastChangeType.Override,
            OldHours = oldHours,
            NewHours = dto.NewHours,
            OldStatus = oldStatus,
            NewStatus = ForecastStatus.Approved,
            ChangeReason = dto.Reason
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} overridden by {UserId}: {OldHours} -> {NewHours}, Reason: {Reason}",
            id, GetCurrentUserId(), oldHours, dto.NewHours, dto.Reason);

        var updated = await _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ForecastVersion)
            .FirstAsync(f => f.Id == id);

        return Ok(MapToResponse(updated, false));
    }

    [HttpPost("bulk-approve")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Approve)]
    public async Task<ActionResult<BulkApprovalResponse>> BulkApprove(BulkApprovalDto dto)
    {
        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        var results = new BulkApprovalResponse { TotalRequested = dto.ForecastIds.Count };

        foreach (var id in dto.ForecastIds)
        {
            var forecast = await _context.Forecasts.FindAsync(id);
            if (forecast == null || forecast.TenantId != dto.TenantId)
            {
                results.FailedCount++;
                continue;
            }

            if (forecast.Status != ForecastStatus.Submitted)
            {
                results.SkippedCount++;
                continue;
            }

            forecast.Status = ForecastStatus.Approved;
            forecast.ApprovedByUserId = GetCurrentUserId();
            forecast.ApprovedAt = DateTime.UtcNow;
            forecast.ApprovalNotes = dto.Notes;
            forecast.UpdatedAt = DateTime.UtcNow;
            forecast.UpdatedByUserId = GetCurrentUserId();

            _context.ForecastHistories.Add(new ForecastHistory
            {
                Id = Guid.NewGuid(),
                ForecastId = forecast.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = ForecastChangeType.Approved,
                OldStatus = ForecastStatus.Submitted,
                NewStatus = ForecastStatus.Approved,
                ChangeReason = dto.Notes
            });

            results.ApprovedCount++;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bulk approval: {Approved} approved, {Skipped} skipped, {Failed} failed",
            results.ApprovedCount, results.SkippedCount, results.FailedCount);

        return Ok(results);
    }

    [HttpPost("lock-month")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Manage)]
    public async Task<ActionResult<LockMonthResponse>> LockMonth(LockMonthDto dto)
    {
        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        var query = _context.Forecasts
            .Where(f =>
                f.TenantId == dto.TenantId &&
                f.Year == dto.Year &&
                f.Month == dto.Month &&
                f.Status != ForecastStatus.Locked);

        if (dto.ProjectId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignment.ProjectId == dto.ProjectId.Value);
        }

        if (dto.ForecastVersionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == dto.ForecastVersionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        var forecasts = await query.ToListAsync();

        var results = new LockMonthResponse
        {
            Year = dto.Year,
            Month = dto.Month,
            TotalForecasts = forecasts.Count
        };

        foreach (var forecast in forecasts)
        {
            var oldStatus = forecast.Status;
            forecast.Status = ForecastStatus.Locked;
            forecast.UpdatedAt = DateTime.UtcNow;
            forecast.UpdatedByUserId = GetCurrentUserId();

            _context.ForecastHistories.Add(new ForecastHistory
            {
                Id = Guid.NewGuid(),
                ForecastId = forecast.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = ForecastChangeType.Locked,
                OldStatus = oldStatus,
                NewStatus = ForecastStatus.Locked,
                ChangeReason = dto.Reason
            });

            results.LockedCount++;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Locked {Count} forecasts for {Year}/{Month} by {UserId}",
            results.LockedCount, dto.Year, dto.Month, GetCurrentUserId());

        return Ok(results);
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var forecast = await _context.Forecasts.FindAsync(id);

        if (forecast == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(forecast.TenantId))
        {
            return Forbid();
        }

        if (forecast.Status == ForecastStatus.Locked)
        {
            return BadRequest("Cannot delete a locked forecast.");
        }

        forecast.IsDeleted = true;
        forecast.DeletedAt = DateTime.UtcNow;
        forecast.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("Forecast {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }

    private async Task<decimal?> CalculateRecommendedHours(Guid tenantId, int year, int month)
    {
        // Get working days for the month (excluding weekends and holidays)
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var workingDays = 0;

        // Get holidays for this tenant/month
        var holidays = await _context.CompanyHolidays
            .Where(h => h.TenantId == tenantId && h.HolidayDate.Year == year && h.HolidayDate.Month == month && h.IsObserved)
            .Select(h => h.HolidayDate)
            .ToListAsync();

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (date.DayOfWeek != DayOfWeek.Saturday &&
                date.DayOfWeek != DayOfWeek.Sunday &&
                !holidays.Contains(DateOnly.FromDateTime(date)))
            {
                workingDays++;
            }
        }

        // Assume 8 hours per day
        return workingDays * 8m;
    }

    private static ForecastResponse MapToResponse(Forecast f, bool includeHistory)
    {
        var response = new ForecastResponse
        {
            Id = f.Id,
            TenantId = f.TenantId,
            ProjectRoleAssignmentId = f.ProjectRoleAssignmentId,
            ForecastVersionId = f.ForecastVersionId,
            ForecastVersionName = f.ForecastVersion?.Name,
            Year = f.Year,
            Month = f.Month,
            Week = f.Week,
            PeriodDisplay = f.Week.HasValue ? $"{f.Year}/{f.Month:D2} W{f.Week}" : $"{f.Year}/{f.Month:D2}",
            ForecastedHours = f.ForecastedHours,
            RecommendedHours = f.RecommendedHours,
            Status = f.Status,
            StatusName = f.Status.ToString(),
            SubmittedAt = f.SubmittedAt,
            ApprovedAt = f.ApprovedAt,
            ApprovalNotes = f.ApprovalNotes,
            IsOverride = f.IsOverride,
            OverriddenAt = f.OverriddenAt,
            OverrideReason = f.OverrideReason,
            OriginalForecastedHours = f.OriginalForecastedHours,
            Notes = f.Notes,
            CreatedAt = f.CreatedAt,
            UpdatedAt = f.UpdatedAt
        };

        // Assignment details
        if (f.ProjectRoleAssignment != null)
        {
            response.ProjectId = f.ProjectRoleAssignment.ProjectId;
            response.ProjectName = f.ProjectRoleAssignment.Project?.Name;
            response.WbsElementId = f.ProjectRoleAssignment.WbsElementId;
            response.WbsElementCode = f.ProjectRoleAssignment.WbsElement?.Code;
            response.PositionTitle = f.ProjectRoleAssignment.PositionTitle;
            response.AssigneeName = f.ProjectRoleAssignment.User?.DisplayName
                ?? (f.ProjectRoleAssignment.Subcontractor != null
                    ? $"{f.ProjectRoleAssignment.Subcontractor.FirstName} {f.ProjectRoleAssignment.Subcontractor.LastName}"
                    : f.ProjectRoleAssignment.TbdDescription ?? "TBD");
            response.IsTbd = f.ProjectRoleAssignment.IsTbd;
            response.LaborCategoryCode = f.ProjectRoleAssignment.LaborCategory?.Code;
        }

        if (includeHistory && f.History != null)
        {
            response.History = f.History
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new ForecastHistoryResponse
                {
                    Id = h.Id,
                    ChangedByUserName = h.ChangedByUser?.DisplayName ?? "Unknown",
                    ChangedAt = h.ChangedAt,
                    ChangeType = h.ChangeType,
                    ChangeTypeName = h.ChangeType.ToString(),
                    OldHours = h.OldHours,
                    NewHours = h.NewHours,
                    OldStatus = h.OldStatus,
                    OldStatusName = h.OldStatus?.ToString(),
                    NewStatus = h.NewStatus,
                    NewStatusName = h.NewStatus?.ToString(),
                    ChangeReason = h.ChangeReason
                })
                .ToList();
        }

        return response;
    }
}

// DTOs
public class ForecastResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectRoleAssignmentId { get; set; }
    public Guid ForecastVersionId { get; set; }
    public string? ForecastVersionName { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }
    public string PeriodDisplay { get; set; } = string.Empty;
    public decimal ForecastedHours { get; set; }
    public decimal? RecommendedHours { get; set; }
    public ForecastStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public bool IsOverride { get; set; }
    public DateTime? OverriddenAt { get; set; }
    public string? OverrideReason { get; set; }
    public decimal? OriginalForecastedHours { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Assignment info
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? WbsElementId { get; set; }
    public string? WbsElementCode { get; set; }
    public string? PositionTitle { get; set; }
    public string? AssigneeName { get; set; }
    public bool IsTbd { get; set; }
    public string? LaborCategoryCode { get; set; }

    public List<ForecastHistoryResponse>? History { get; set; }
}

public class ForecastHistoryResponse
{
    public Guid Id { get; set; }
    public string ChangedByUserName { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
    public ForecastChangeType ChangeType { get; set; }
    public string ChangeTypeName { get; set; } = string.Empty;
    public decimal? OldHours { get; set; }
    public decimal? NewHours { get; set; }
    public ForecastStatus? OldStatus { get; set; }
    public string? OldStatusName { get; set; }
    public ForecastStatus? NewStatus { get; set; }
    public string? NewStatusName { get; set; }
    public string? ChangeReason { get; set; }
}

public class ForecastSummaryResponse
{
    public int TotalForecasts { get; set; }
    public decimal TotalHours { get; set; }
    public int DraftCount { get; set; }
    public int SubmittedCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int LockedCount { get; set; }
    public decimal DraftHours { get; set; }
    public decimal SubmittedHours { get; set; }
    public decimal ApprovedHours { get; set; }
    public int OverrideCount { get; set; }
}

public class CreateForecastDto
{
    public Guid TenantId { get; set; }
    public Guid ProjectRoleAssignmentId { get; set; }
    public Guid? ForecastVersionId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }
    public decimal ForecastedHours { get; set; }
    public string? Notes { get; set; }
}

public class BulkCreateForecastDto
{
    public Guid TenantId { get; set; }
    public Guid? ForecastVersionId { get; set; }
    public bool UpdateExisting { get; set; } = true;
    public List<BulkForecastItem> Forecasts { get; set; } = new();
}

public class BulkForecastItem
{
    public Guid ProjectRoleAssignmentId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }
    public decimal ForecastedHours { get; set; }
    public string? Notes { get; set; }
}

public class BulkForecastResponse
{
    public int TotalRequested { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int FailedCount { get; set; }
}

public class UpdateForecastDto
{
    public decimal? ForecastedHours { get; set; }
    public string? Notes { get; set; }
}

public class SubmitForecastDto
{
    public string? Notes { get; set; }
}

public class ApproveForecastDto
{
    public string? Notes { get; set; }
}

public class RejectForecastDto
{
    public string Reason { get; set; } = string.Empty;
}

public class OverrideForecastDto
{
    public decimal NewHours { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class BulkApprovalDto
{
    public Guid TenantId { get; set; }
    public List<Guid> ForecastIds { get; set; } = new();
    public string? Notes { get; set; }
}

public class BulkApprovalResponse
{
    public int TotalRequested { get; set; }
    public int ApprovedCount { get; set; }
    public int SkippedCount { get; set; }
    public int FailedCount { get; set; }
}

public class LockMonthDto
{
    public Guid TenantId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ForecastVersionId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string? Reason { get; set; }
}

public class LockMonthResponse
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalForecasts { get; set; }
    public int LockedCount { get; set; }
}

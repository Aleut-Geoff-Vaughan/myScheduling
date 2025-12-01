using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForecastVersionsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ForecastVersionsController> _logger;

    public ForecastVersionsController(MySchedulingDbContext context, ILogger<ForecastVersionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ForecastVersionResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? projectId = null,
        [FromQuery] ForecastVersionType? type = null,
        [FromQuery] bool includeArchived = false)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .Where(v => v.TenantId == tenantId);

        if (projectId.HasValue)
        {
            query = query.Where(v => v.ProjectId == projectId.Value || v.ProjectId == null);
        }

        if (type.HasValue)
        {
            query = query.Where(v => v.Type == type.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(v => v.ArchivedAt == null);
        }

        var versions = await query
            .OrderByDescending(v => v.IsCurrent)
            .ThenByDescending(v => v.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return Ok(versions.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastVersionResponse>> GetById(Guid id)
    {
        var version = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .Include(v => v.BasedOnVersion)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id);

        if (version == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(version.TenantId))
        {
            return Forbid();
        }

        return Ok(MapToResponse(version));
    }

    [HttpGet("current")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastVersionResponse>> GetCurrent(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? projectId = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.ForecastVersions
            .Include(v => v.Project)
            .Where(v => v.TenantId == tenantId && v.IsCurrent && v.Type == ForecastVersionType.Current);

        if (projectId.HasValue)
        {
            query = query.Where(v => v.ProjectId == projectId.Value || v.ProjectId == null);
        }
        else
        {
            // Tenant-wide current version
            query = query.Where(v => v.ProjectId == null);
        }

        var version = await query.AsNoTracking().FirstOrDefaultAsync();

        if (version == null)
        {
            // Auto-create default "Current" version for tenant
            version = await CreateDefaultCurrentVersion(tenantId);
        }

        return Ok(MapToResponse(version));
    }

    [HttpPost]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Create)]
    public async Task<ActionResult<ForecastVersionResponse>> Create(CreateForecastVersionDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Name is required.");
        }

        // Verify project if provided
        if (dto.ProjectId.HasValue)
        {
            var project = await _context.Projects.FindAsync(dto.ProjectId.Value);
            if (project == null || project.TenantId != dto.TenantId)
            {
                return BadRequest("Invalid project.");
            }
        }

        // Get max version number for this scope
        var maxVersionNumber = await _context.ForecastVersions
            .Where(v => v.TenantId == dto.TenantId && v.ProjectId == dto.ProjectId)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

        var version = new ForecastVersion
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            Name = dto.Name,
            Description = dto.Description,
            Type = dto.Type ?? ForecastVersionType.WhatIf,
            ProjectId = dto.ProjectId,
            UserId = dto.UserId ?? GetCurrentUserId(),
            IsCurrent = false,
            VersionNumber = maxVersionNumber + 1,
            BasedOnVersionId = dto.BasedOnVersionId,
            StartYear = dto.StartYear ?? DateTime.UtcNow.Year,
            StartMonth = dto.StartMonth ?? DateTime.UtcNow.Month,
            EndYear = dto.EndYear ?? DateTime.UtcNow.Year,
            EndMonth = dto.EndMonth ?? 12,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ForecastVersions.Add(version);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastVersion {Id} created by {UserId}", version.Id, GetCurrentUserId());

        // Reload with includes
        var created = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .FirstAsync(v => v.Id == version.Id);

        return CreatedAtAction(nameof(GetById), new { id = version.Id }, MapToResponse(created));
    }

    [HttpPost("{id}/clone")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Create)]
    public async Task<ActionResult<ForecastVersionResponse>> Clone(Guid id, CloneVersionDto dto)
    {
        var sourceVersion = await _context.ForecastVersions
            .Include(v => v.Forecasts)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (sourceVersion == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(sourceVersion.TenantId))
        {
            return Forbid();
        }

        // Get max version number
        var maxVersionNumber = await _context.ForecastVersions
            .Where(v => v.TenantId == sourceVersion.TenantId && v.ProjectId == sourceVersion.ProjectId)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

        // Create new version
        var newVersion = new ForecastVersion
        {
            Id = Guid.NewGuid(),
            TenantId = sourceVersion.TenantId,
            Name = dto.Name ?? $"{sourceVersion.Name} (Copy)",
            Description = dto.Description ?? sourceVersion.Description,
            Type = dto.Type ?? ForecastVersionType.WhatIf,
            ProjectId = sourceVersion.ProjectId,
            UserId = GetCurrentUserId(),
            IsCurrent = false,
            VersionNumber = maxVersionNumber + 1,
            BasedOnVersionId = id,
            StartYear = sourceVersion.StartYear,
            StartMonth = sourceVersion.StartMonth,
            EndYear = sourceVersion.EndYear,
            EndMonth = sourceVersion.EndMonth,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ForecastVersions.Add(newVersion);

        // Clone all forecasts if requested
        if (dto.CopyForecasts)
        {
            foreach (var sourceForecast in sourceVersion.Forecasts.Where(f => !f.IsDeleted))
            {
                var clonedForecast = new Forecast
                {
                    Id = Guid.NewGuid(),
                    TenantId = sourceVersion.TenantId,
                    ProjectRoleAssignmentId = sourceForecast.ProjectRoleAssignmentId,
                    ForecastVersionId = newVersion.Id,
                    Year = sourceForecast.Year,
                    Month = sourceForecast.Month,
                    Week = sourceForecast.Week,
                    ForecastedHours = sourceForecast.ForecastedHours,
                    RecommendedHours = sourceForecast.RecommendedHours,
                    Status = ForecastStatus.Draft, // Reset status on clone
                    Notes = sourceForecast.Notes,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = GetCurrentUserId()
                };
                _context.Forecasts.Add(clonedForecast);
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastVersion {Id} cloned from {SourceId} by {UserId}",
            newVersion.Id, id, GetCurrentUserId());

        var created = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .FirstAsync(v => v.Id == newVersion.Id);

        return CreatedAtAction(nameof(GetById), new { id = newVersion.Id }, MapToResponse(created));
    }

    [HttpPost("{id}/promote")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastVersionResponse>> Promote(Guid id)
    {
        var version = await _context.ForecastVersions
            .FirstOrDefaultAsync(v => v.Id == id);

        if (version == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(version.TenantId))
        {
            return Forbid();
        }

        if (version.IsCurrent && version.Type == ForecastVersionType.Current)
        {
            return BadRequest("This version is already current.");
        }

        // Archive current version for this scope
        var currentVersion = await _context.ForecastVersions
            .FirstOrDefaultAsync(v =>
                v.TenantId == version.TenantId &&
                v.ProjectId == version.ProjectId &&
                v.IsCurrent &&
                v.Type == ForecastVersionType.Current);

        if (currentVersion != null)
        {
            currentVersion.IsCurrent = false;
            currentVersion.Type = ForecastVersionType.Historical;
            currentVersion.ArchivedAt = DateTime.UtcNow;
            currentVersion.ArchiveReason = $"Replaced by version '{version.Name}'";
            currentVersion.UpdatedAt = DateTime.UtcNow;
            currentVersion.UpdatedByUserId = GetCurrentUserId();
        }

        // Promote new version
        version.IsCurrent = true;
        version.Type = ForecastVersionType.Current;
        version.PromotedAt = DateTime.UtcNow;
        version.PromotedByUserId = GetCurrentUserId();
        version.UpdatedAt = DateTime.UtcNow;
        version.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastVersion {Id} promoted to current by {UserId}", id, GetCurrentUserId());

        var updated = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .FirstAsync(v => v.Id == id);

        return Ok(MapToResponse(updated));
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastVersionResponse>> Update(Guid id, UpdateForecastVersionDto dto)
    {
        var version = await _context.ForecastVersions.FindAsync(id);

        if (version == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(version.TenantId))
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) version.Name = dto.Name;
        if (dto.Description != null) version.Description = dto.Description;
        if (dto.StartYear.HasValue) version.StartYear = dto.StartYear.Value;
        if (dto.StartMonth.HasValue) version.StartMonth = dto.StartMonth.Value;
        if (dto.EndYear.HasValue) version.EndYear = dto.EndYear.Value;
        if (dto.EndMonth.HasValue) version.EndMonth = dto.EndMonth.Value;

        version.UpdatedAt = DateTime.UtcNow;
        version.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        var updated = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .FirstAsync(v => v.Id == id);

        return Ok(MapToResponse(updated));
    }

    [HttpPost("{id}/archive")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastVersionResponse>> Archive(Guid id, ArchiveVersionDto? dto = null)
    {
        var version = await _context.ForecastVersions.FindAsync(id);

        if (version == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(version.TenantId))
        {
            return Forbid();
        }

        if (version.IsCurrent && version.Type == ForecastVersionType.Current)
        {
            return BadRequest("Cannot archive the current version. Promote another version first.");
        }

        version.Type = ForecastVersionType.Historical;
        version.ArchivedAt = DateTime.UtcNow;
        version.ArchiveReason = dto?.Reason ?? "Manually archived";
        version.UpdatedAt = DateTime.UtcNow;
        version.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastVersion {Id} archived by {UserId}", id, GetCurrentUserId());

        var updated = await _context.ForecastVersions
            .Include(v => v.Project)
            .Include(v => v.User)
            .FirstAsync(v => v.Id == id);

        return Ok(MapToResponse(updated));
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ForecastVersion", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var version = await _context.ForecastVersions.FindAsync(id);

        if (version == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(version.TenantId))
        {
            return Forbid();
        }

        if (version.IsCurrent && version.Type == ForecastVersionType.Current)
        {
            return BadRequest("Cannot delete the current version.");
        }

        // Check for forecasts
        var forecastCount = await _context.Forecasts.CountAsync(f => f.ForecastVersionId == id && !f.IsDeleted);
        if (forecastCount > 0)
        {
            return BadRequest($"Cannot delete version with {forecastCount} forecasts. Archive it instead.");
        }

        version.IsDeleted = true;
        version.DeletedAt = DateTime.UtcNow;
        version.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastVersion {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }

    private async Task<ForecastVersion> CreateDefaultCurrentVersion(Guid tenantId)
    {
        var now = DateTime.UtcNow;
        var version = new ForecastVersion
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Current",
            Description = "Primary forecast version",
            Type = ForecastVersionType.Current,
            IsCurrent = true,
            VersionNumber = 1,
            StartYear = now.Year,
            StartMonth = now.Month,
            EndYear = now.Year + 1,
            EndMonth = 12,
            CreatedAt = now,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ForecastVersions.Add(version);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Default current ForecastVersion {Id} created for tenant {TenantId}",
            version.Id, tenantId);

        return version;
    }

    private static ForecastVersionResponse MapToResponse(ForecastVersion v)
    {
        return new ForecastVersionResponse
        {
            Id = v.Id,
            TenantId = v.TenantId,
            Name = v.Name,
            Description = v.Description,
            Type = v.Type,
            TypeName = v.Type.ToString(),
            ProjectId = v.ProjectId,
            ProjectName = v.Project?.Name,
            UserId = v.UserId,
            UserName = v.User?.DisplayName,
            IsCurrent = v.IsCurrent,
            VersionNumber = v.VersionNumber,
            BasedOnVersionId = v.BasedOnVersionId,
            BasedOnVersionName = v.BasedOnVersion?.Name,
            StartYear = v.StartYear,
            StartMonth = v.StartMonth,
            EndYear = v.EndYear,
            EndMonth = v.EndMonth,
            PromotedAt = v.PromotedAt,
            ArchivedAt = v.ArchivedAt,
            ArchiveReason = v.ArchiveReason,
            CreatedAt = v.CreatedAt,
            UpdatedAt = v.UpdatedAt
        };
    }
}

// DTOs
public class ForecastVersionResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ForecastVersionType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public bool IsCurrent { get; set; }
    public int VersionNumber { get; set; }
    public Guid? BasedOnVersionId { get; set; }
    public string? BasedOnVersionName { get; set; }
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
    public DateTime? PromotedAt { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchiveReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateForecastVersionDto
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ForecastVersionType? Type { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? UserId { get; set; }
    public Guid? BasedOnVersionId { get; set; }
    public int? StartYear { get; set; }
    public int? StartMonth { get; set; }
    public int? EndYear { get; set; }
    public int? EndMonth { get; set; }
}

public class UpdateForecastVersionDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? StartYear { get; set; }
    public int? StartMonth { get; set; }
    public int? EndYear { get; set; }
    public int? EndMonth { get; set; }
}

public class CloneVersionDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public ForecastVersionType? Type { get; set; }
    public bool CopyForecasts { get; set; } = true;
}

public class ArchiveVersionDto
{
    public string? Reason { get; set; }
}

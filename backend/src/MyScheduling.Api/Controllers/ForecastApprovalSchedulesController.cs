using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForecastApprovalSchedulesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ForecastApprovalSchedulesController> _logger;

    public ForecastApprovalSchedulesController(MySchedulingDbContext context, ILogger<ForecastApprovalSchedulesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ForecastApprovalScheduleResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] bool? isActive = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.ForecastApprovalSchedules
            .Where(s => s.TenantId == tenantId);

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        var schedules = await query
            .OrderByDescending(s => s.IsDefault)
            .ThenBy(s => s.Name)
            .AsNoTracking()
            .Select(s => new ForecastApprovalScheduleResponse
            {
                Id = s.Id,
                TenantId = s.TenantId,
                Name = s.Name,
                IsDefault = s.IsDefault,
                SubmissionDeadlineDay = s.SubmissionDeadlineDay,
                ApprovalDeadlineDay = s.ApprovalDeadlineDay,
                LockDay = s.LockDay,
                ForecastMonthsAhead = s.ForecastMonthsAhead,
                IsActive = s.IsActive,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(schedules);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastApprovalScheduleResponse>> GetById(Guid id)
    {
        var schedule = await _context.ForecastApprovalSchedules
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (schedule == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(schedule.TenantId))
        {
            return Forbid();
        }

        return Ok(new ForecastApprovalScheduleResponse
        {
            Id = schedule.Id,
            TenantId = schedule.TenantId,
            Name = schedule.Name,
            IsDefault = schedule.IsDefault,
            SubmissionDeadlineDay = schedule.SubmissionDeadlineDay,
            ApprovalDeadlineDay = schedule.ApprovalDeadlineDay,
            LockDay = schedule.LockDay,
            ForecastMonthsAhead = schedule.ForecastMonthsAhead,
            IsActive = schedule.IsActive,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        });
    }

    [HttpGet("default")]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Read)]
    public async Task<ActionResult<ForecastApprovalScheduleResponse>> GetDefault([FromQuery] Guid tenantId)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var schedule = await _context.ForecastApprovalSchedules
            .Where(s => s.TenantId == tenantId && s.IsDefault && s.IsActive)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound("No default schedule configured.");
        }

        return Ok(new ForecastApprovalScheduleResponse
        {
            Id = schedule.Id,
            TenantId = schedule.TenantId,
            Name = schedule.Name,
            IsDefault = schedule.IsDefault,
            SubmissionDeadlineDay = schedule.SubmissionDeadlineDay,
            ApprovalDeadlineDay = schedule.ApprovalDeadlineDay,
            LockDay = schedule.LockDay,
            ForecastMonthsAhead = schedule.ForecastMonthsAhead,
            IsActive = schedule.IsActive,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        });
    }

    [HttpPost]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Create)]
    public async Task<ActionResult<ForecastApprovalScheduleResponse>> Create(CreateForecastApprovalScheduleDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Validate deadline days (1-31, 0 = last day of month)
        if (dto.SubmissionDeadlineDay < 0 || dto.SubmissionDeadlineDay > 31)
        {
            return BadRequest("SubmissionDeadlineDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.ApprovalDeadlineDay < 0 || dto.ApprovalDeadlineDay > 31)
        {
            return BadRequest("ApprovalDeadlineDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.LockDay < 0 || dto.LockDay > 31)
        {
            return BadRequest("LockDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.ForecastMonthsAhead < 1 || dto.ForecastMonthsAhead > 24)
        {
            return BadRequest("ForecastMonthsAhead must be between 1 and 24.");
        }

        // If this is to be the default, clear existing defaults
        if (dto.IsDefault)
        {
            var existingDefaults = await _context.ForecastApprovalSchedules
                .Where(s => s.TenantId == dto.TenantId && s.IsDefault)
                .ToListAsync();

            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedByUserId = GetCurrentUserId();
            }
        }

        var schedule = new ForecastApprovalSchedule
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            Name = dto.Name,
            IsDefault = dto.IsDefault,
            SubmissionDeadlineDay = dto.SubmissionDeadlineDay,
            ApprovalDeadlineDay = dto.ApprovalDeadlineDay,
            LockDay = dto.LockDay,
            ForecastMonthsAhead = dto.ForecastMonthsAhead,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ForecastApprovalSchedules.Add(schedule);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastApprovalSchedule {Name} created by {UserId}",
            dto.Name, GetCurrentUserId());

        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, new ForecastApprovalScheduleResponse
        {
            Id = schedule.Id,
            TenantId = schedule.TenantId,
            Name = schedule.Name,
            IsDefault = schedule.IsDefault,
            SubmissionDeadlineDay = schedule.SubmissionDeadlineDay,
            ApprovalDeadlineDay = schedule.ApprovalDeadlineDay,
            LockDay = schedule.LockDay,
            ForecastMonthsAhead = schedule.ForecastMonthsAhead,
            IsActive = schedule.IsActive,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        });
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastApprovalScheduleResponse>> Update(Guid id, UpdateForecastApprovalScheduleDto dto)
    {
        var schedule = await _context.ForecastApprovalSchedules
            .FirstOrDefaultAsync(s => s.Id == id);

        if (schedule == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(schedule.TenantId))
        {
            return Forbid();
        }

        // Validate deadline days if provided
        if (dto.SubmissionDeadlineDay.HasValue && (dto.SubmissionDeadlineDay < 0 || dto.SubmissionDeadlineDay > 31))
        {
            return BadRequest("SubmissionDeadlineDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.ApprovalDeadlineDay.HasValue && (dto.ApprovalDeadlineDay < 0 || dto.ApprovalDeadlineDay > 31))
        {
            return BadRequest("ApprovalDeadlineDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.LockDay.HasValue && (dto.LockDay < 0 || dto.LockDay > 31))
        {
            return BadRequest("LockDay must be between 0 and 31 (0 = last day of month).");
        }

        if (dto.ForecastMonthsAhead.HasValue && (dto.ForecastMonthsAhead < 1 || dto.ForecastMonthsAhead > 24))
        {
            return BadRequest("ForecastMonthsAhead must be between 1 and 24.");
        }

        // If setting as default, clear existing defaults
        if (dto.IsDefault == true && !schedule.IsDefault)
        {
            var existingDefaults = await _context.ForecastApprovalSchedules
                .Where(s => s.TenantId == schedule.TenantId && s.IsDefault && s.Id != id)
                .ToListAsync();

            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedByUserId = GetCurrentUserId();
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) schedule.Name = dto.Name;
        if (dto.IsDefault.HasValue) schedule.IsDefault = dto.IsDefault.Value;
        if (dto.SubmissionDeadlineDay.HasValue) schedule.SubmissionDeadlineDay = dto.SubmissionDeadlineDay.Value;
        if (dto.ApprovalDeadlineDay.HasValue) schedule.ApprovalDeadlineDay = dto.ApprovalDeadlineDay.Value;
        if (dto.LockDay.HasValue) schedule.LockDay = dto.LockDay.Value;
        if (dto.ForecastMonthsAhead.HasValue) schedule.ForecastMonthsAhead = dto.ForecastMonthsAhead.Value;
        if (dto.IsActive.HasValue) schedule.IsActive = dto.IsActive.Value;

        schedule.UpdatedAt = DateTime.UtcNow;
        schedule.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        return Ok(new ForecastApprovalScheduleResponse
        {
            Id = schedule.Id,
            TenantId = schedule.TenantId,
            Name = schedule.Name,
            IsDefault = schedule.IsDefault,
            SubmissionDeadlineDay = schedule.SubmissionDeadlineDay,
            ApprovalDeadlineDay = schedule.ApprovalDeadlineDay,
            LockDay = schedule.LockDay,
            ForecastMonthsAhead = schedule.ForecastMonthsAhead,
            IsActive = schedule.IsActive,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        });
    }

    [HttpPost("{id}/set-default")]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Update)]
    public async Task<ActionResult<ForecastApprovalScheduleResponse>> SetAsDefault(Guid id)
    {
        var schedule = await _context.ForecastApprovalSchedules
            .FirstOrDefaultAsync(s => s.Id == id);

        if (schedule == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(schedule.TenantId))
        {
            return Forbid();
        }

        // Clear existing defaults
        var existingDefaults = await _context.ForecastApprovalSchedules
            .Where(s => s.TenantId == schedule.TenantId && s.IsDefault && s.Id != id)
            .ToListAsync();

        foreach (var existing in existingDefaults)
        {
            existing.IsDefault = false;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedByUserId = GetCurrentUserId();
        }

        schedule.IsDefault = true;
        schedule.UpdatedAt = DateTime.UtcNow;
        schedule.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastApprovalSchedule {Id} set as default by {UserId}", id, GetCurrentUserId());

        return Ok(new ForecastApprovalScheduleResponse
        {
            Id = schedule.Id,
            TenantId = schedule.TenantId,
            Name = schedule.Name,
            IsDefault = schedule.IsDefault,
            SubmissionDeadlineDay = schedule.SubmissionDeadlineDay,
            ApprovalDeadlineDay = schedule.ApprovalDeadlineDay,
            LockDay = schedule.LockDay,
            ForecastMonthsAhead = schedule.ForecastMonthsAhead,
            IsActive = schedule.IsActive,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        });
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ForecastApprovalSchedule", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schedule = await _context.ForecastApprovalSchedules.FindAsync(id);
        if (schedule == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(schedule.TenantId))
        {
            return Forbid();
        }

        if (schedule.IsDefault)
        {
            return BadRequest("Cannot delete the default schedule. Set another schedule as default first.");
        }

        schedule.IsDeleted = true;
        schedule.DeletedAt = DateTime.UtcNow;
        schedule.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ForecastApprovalSchedule {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }
}

// DTOs
public class ForecastApprovalScheduleResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public int SubmissionDeadlineDay { get; set; }
    public int ApprovalDeadlineDay { get; set; }
    public int LockDay { get; set; }
    public int ForecastMonthsAhead { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateForecastApprovalScheduleDto
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
    public int SubmissionDeadlineDay { get; set; } = 25;
    public int ApprovalDeadlineDay { get; set; } = 28;
    public int LockDay { get; set; } = 1;
    public int ForecastMonthsAhead { get; set; } = 3;
}

public class UpdateForecastApprovalScheduleDto
{
    public string? Name { get; set; }
    public bool? IsDefault { get; set; }
    public int? SubmissionDeadlineDay { get; set; }
    public int? ApprovalDeadlineDay { get; set; }
    public int? LockDay { get; set; }
    public int? ForecastMonthsAhead { get; set; }
    public bool? IsActive { get; set; }
}

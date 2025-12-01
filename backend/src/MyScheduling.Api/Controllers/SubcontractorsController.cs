using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubcontractorsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<SubcontractorsController> _logger;

    public SubcontractorsController(MySchedulingDbContext context, ILogger<SubcontractorsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "Subcontractor", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SubcontractorResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? subcontractorCompanyId = null,
        [FromQuery] SubcontractorStatus? status = null,
        [FromQuery] string? search = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.Subcontractors
            .Include(s => s.SubcontractorCompany)
            .Include(s => s.CareerJobFamily)
            .Where(s => s.TenantId == tenantId);

        if (subcontractorCompanyId.HasValue)
        {
            query = query.Where(s => s.SubcontractorCompanyId == subcontractorCompanyId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(s => s.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s =>
                s.FirstName.ToLower().Contains(search.ToLower()) ||
                s.LastName.ToLower().Contains(search.ToLower()) ||
                (s.Email != null && s.Email.ToLower().Contains(search.ToLower())) ||
                (s.PositionTitle != null && s.PositionTitle.ToLower().Contains(search.ToLower())));
        }

        var subcontractors = await query
            .OrderBy(s => s.LastName)
            .ThenBy(s => s.FirstName)
            .AsNoTracking()
            .Select(s => new SubcontractorResponse
            {
                Id = s.Id,
                TenantId = s.TenantId,
                SubcontractorCompanyId = s.SubcontractorCompanyId,
                SubcontractorCompanyName = s.SubcontractorCompany.Name,
                FirstName = s.FirstName,
                LastName = s.LastName,
                Email = s.Email,
                Phone = s.Phone,
                PositionTitle = s.PositionTitle,
                CareerJobFamilyId = s.CareerJobFamilyId,
                CareerJobFamilyName = s.CareerJobFamily != null ? s.CareerJobFamily.Name : null,
                CareerLevel = s.CareerLevel,
                IsForecastSubmitter = s.IsForecastSubmitter,
                Status = s.Status,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(subcontractors);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Subcontractor", Action = PermissionAction.Read)]
    public async Task<ActionResult<SubcontractorResponse>> GetById(Guid id)
    {
        var subcontractor = await _context.Subcontractors
            .Include(s => s.SubcontractorCompany)
            .Include(s => s.CareerJobFamily)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subcontractor == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(subcontractor.TenantId))
        {
            return Forbid();
        }

        return Ok(new SubcontractorResponse
        {
            Id = subcontractor.Id,
            TenantId = subcontractor.TenantId,
            SubcontractorCompanyId = subcontractor.SubcontractorCompanyId,
            SubcontractorCompanyName = subcontractor.SubcontractorCompany.Name,
            FirstName = subcontractor.FirstName,
            LastName = subcontractor.LastName,
            Email = subcontractor.Email,
            Phone = subcontractor.Phone,
            PositionTitle = subcontractor.PositionTitle,
            CareerJobFamilyId = subcontractor.CareerJobFamilyId,
            CareerJobFamilyName = subcontractor.CareerJobFamily?.Name,
            CareerLevel = subcontractor.CareerLevel,
            IsForecastSubmitter = subcontractor.IsForecastSubmitter,
            Status = subcontractor.Status,
            Notes = subcontractor.Notes,
            CreatedAt = subcontractor.CreatedAt,
            UpdatedAt = subcontractor.UpdatedAt
        });
    }

    [HttpPost]
    [RequiresPermission(Resource = "Subcontractor", Action = PermissionAction.Create)]
    public async Task<ActionResult<SubcontractorResponse>> Create(CreateSubcontractorDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Verify company exists and belongs to tenant
        var company = await _context.SubcontractorCompanies.FindAsync(dto.SubcontractorCompanyId);
        if (company == null || company.TenantId != dto.TenantId)
        {
            return BadRequest("Invalid subcontractor company.");
        }

        // Verify career job family if provided
        if (dto.CareerJobFamilyId.HasValue)
        {
            var family = await _context.CareerJobFamilies.FindAsync(dto.CareerJobFamilyId.Value);
            if (family == null || family.TenantId != dto.TenantId)
            {
                return BadRequest("Invalid career job family.");
            }
        }

        var subcontractor = new Subcontractor
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            SubcontractorCompanyId = dto.SubcontractorCompanyId,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            PositionTitle = dto.PositionTitle,
            CareerJobFamilyId = dto.CareerJobFamilyId,
            CareerLevel = dto.CareerLevel,
            IsForecastSubmitter = dto.IsForecastSubmitter ?? false,
            Status = SubcontractorStatus.Active,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.Subcontractors.Add(subcontractor);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Subcontractor {FirstName} {LastName} created in tenant {TenantId} by {UserId}",
            dto.FirstName, dto.LastName, dto.TenantId, GetCurrentUserId());

        return CreatedAtAction(nameof(GetById), new { id = subcontractor.Id }, new SubcontractorResponse
        {
            Id = subcontractor.Id,
            TenantId = subcontractor.TenantId,
            SubcontractorCompanyId = subcontractor.SubcontractorCompanyId,
            SubcontractorCompanyName = company.Name,
            FirstName = subcontractor.FirstName,
            LastName = subcontractor.LastName,
            Email = subcontractor.Email,
            Phone = subcontractor.Phone,
            PositionTitle = subcontractor.PositionTitle,
            CareerJobFamilyId = subcontractor.CareerJobFamilyId,
            CareerLevel = subcontractor.CareerLevel,
            IsForecastSubmitter = subcontractor.IsForecastSubmitter,
            Status = subcontractor.Status,
            Notes = subcontractor.Notes,
            CreatedAt = subcontractor.CreatedAt,
            UpdatedAt = subcontractor.UpdatedAt
        });
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Subcontractor", Action = PermissionAction.Update)]
    public async Task<ActionResult<SubcontractorResponse>> Update(Guid id, UpdateSubcontractorDto dto)
    {
        var subcontractor = await _context.Subcontractors
            .Include(s => s.SubcontractorCompany)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subcontractor == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(subcontractor.TenantId))
        {
            return Forbid();
        }

        // Verify career job family if being changed
        if (dto.CareerJobFamilyId.HasValue && dto.CareerJobFamilyId.Value != Guid.Empty)
        {
            var family = await _context.CareerJobFamilies.FindAsync(dto.CareerJobFamilyId.Value);
            if (family == null || family.TenantId != subcontractor.TenantId)
            {
                return BadRequest("Invalid career job family.");
            }
            subcontractor.CareerJobFamilyId = dto.CareerJobFamilyId.Value;
        }
        else if (dto.CareerJobFamilyId.HasValue && dto.CareerJobFamilyId.Value == Guid.Empty)
        {
            subcontractor.CareerJobFamilyId = null;
        }

        if (!string.IsNullOrWhiteSpace(dto.FirstName)) subcontractor.FirstName = dto.FirstName;
        if (!string.IsNullOrWhiteSpace(dto.LastName)) subcontractor.LastName = dto.LastName;
        if (dto.Email != null) subcontractor.Email = dto.Email;
        if (dto.Phone != null) subcontractor.Phone = dto.Phone;
        if (dto.PositionTitle != null) subcontractor.PositionTitle = dto.PositionTitle;
        if (dto.CareerLevel.HasValue) subcontractor.CareerLevel = dto.CareerLevel.Value == 0 ? null : dto.CareerLevel;
        if (dto.IsForecastSubmitter.HasValue) subcontractor.IsForecastSubmitter = dto.IsForecastSubmitter.Value;
        if (dto.Status.HasValue) subcontractor.Status = dto.Status.Value;
        if (dto.Notes != null) subcontractor.Notes = dto.Notes;

        subcontractor.UpdatedAt = DateTime.UtcNow;
        subcontractor.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        // Reload career job family name
        await _context.Entry(subcontractor)
            .Reference(s => s.CareerJobFamily)
            .LoadAsync();

        return Ok(new SubcontractorResponse
        {
            Id = subcontractor.Id,
            TenantId = subcontractor.TenantId,
            SubcontractorCompanyId = subcontractor.SubcontractorCompanyId,
            SubcontractorCompanyName = subcontractor.SubcontractorCompany.Name,
            FirstName = subcontractor.FirstName,
            LastName = subcontractor.LastName,
            Email = subcontractor.Email,
            Phone = subcontractor.Phone,
            PositionTitle = subcontractor.PositionTitle,
            CareerJobFamilyId = subcontractor.CareerJobFamilyId,
            CareerJobFamilyName = subcontractor.CareerJobFamily?.Name,
            CareerLevel = subcontractor.CareerLevel,
            IsForecastSubmitter = subcontractor.IsForecastSubmitter,
            Status = subcontractor.Status,
            Notes = subcontractor.Notes,
            CreatedAt = subcontractor.CreatedAt,
            UpdatedAt = subcontractor.UpdatedAt
        });
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Subcontractor", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var subcontractor = await _context.Subcontractors.FindAsync(id);
        if (subcontractor == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(subcontractor.TenantId))
        {
            return Forbid();
        }

        // Check if has active project role assignments
        var hasActiveAssignments = await _context.ProjectRoleAssignments
            .AnyAsync(p => p.SubcontractorId == id && p.Status == ProjectRoleAssignmentStatus.Active);

        if (hasActiveAssignments)
        {
            return BadRequest("Cannot delete subcontractor with active project assignments. Complete or cancel them first.");
        }

        subcontractor.IsDeleted = true;
        subcontractor.DeletedAt = DateTime.UtcNow;
        subcontractor.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("Subcontractor {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }
}

// DTOs
public class SubcontractorResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SubcontractorCompanyId { get; set; }
    public string SubcontractorCompanyName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public string? CareerJobFamilyName { get; set; }
    public int? CareerLevel { get; set; }
    public bool IsForecastSubmitter { get; set; }
    public SubcontractorStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public class CreateSubcontractorDto
{
    public Guid TenantId { get; set; }
    public Guid SubcontractorCompanyId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public bool? IsForecastSubmitter { get; set; }
    public string? Notes { get; set; }
}

public class UpdateSubcontractorDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public bool? IsForecastSubmitter { get; set; }
    public SubcontractorStatus? Status { get; set; }
    public string? Notes { get; set; }
}

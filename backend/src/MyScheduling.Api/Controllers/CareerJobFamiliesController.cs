using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CareerJobFamiliesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<CareerJobFamiliesController> _logger;

    public CareerJobFamiliesController(MySchedulingDbContext context, ILogger<CareerJobFamiliesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "CareerJobFamily", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<CareerJobFamilyResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? search = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.CareerJobFamilies
            .Where(c => c.TenantId == tenantId);

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c =>
                c.Name.ToLower().Contains(search.ToLower()) ||
                (c.Code != null && c.Code.ToLower().Contains(search.ToLower())) ||
                (c.Description != null && c.Description.ToLower().Contains(search.ToLower())));
        }

        var families = await query
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new CareerJobFamilyResponse
            {
                Id = c.Id,
                TenantId = c.TenantId,
                Name = c.Name,
                Description = c.Description,
                Code = c.Code,
                SortOrder = c.SortOrder,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .AsNoTracking()
            .ToListAsync();

        return Ok(families);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "CareerJobFamily", Action = PermissionAction.Read)]
    public async Task<ActionResult<CareerJobFamilyResponse>> GetById(Guid id)
    {
        var family = await _context.CareerJobFamilies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (family == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(family.TenantId))
        {
            return Forbid();
        }

        return Ok(new CareerJobFamilyResponse
        {
            Id = family.Id,
            TenantId = family.TenantId,
            Name = family.Name,
            Description = family.Description,
            Code = family.Code,
            SortOrder = family.SortOrder,
            IsActive = family.IsActive,
            CreatedAt = family.CreatedAt,
            UpdatedAt = family.UpdatedAt
        });
    }

    [HttpPost]
    [RequiresPermission(Resource = "CareerJobFamily", Action = PermissionAction.Create)]
    public async Task<ActionResult<CareerJobFamilyResponse>> Create(CreateCareerJobFamilyDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Check for duplicate code if provided
        if (!string.IsNullOrWhiteSpace(dto.Code))
        {
            var codeExists = await _context.CareerJobFamilies.AnyAsync(c =>
                c.TenantId == dto.TenantId &&
                c.Code != null && c.Code.ToLower() == dto.Code.ToLower());

            if (codeExists)
            {
                return BadRequest("A career job family with that code already exists.");
            }
        }

        var family = new CareerJobFamily
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            Name = dto.Name,
            Description = dto.Description,
            Code = dto.Code,
            SortOrder = dto.SortOrder ?? 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.CareerJobFamilies.Add(family);
        await _context.SaveChangesAsync();

        _logger.LogInformation("CareerJobFamily {Name} created in tenant {TenantId} by {UserId}", dto.Name, dto.TenantId, GetCurrentUserId());

        var response = new CareerJobFamilyResponse
        {
            Id = family.Id,
            TenantId = family.TenantId,
            Name = family.Name,
            Description = family.Description,
            Code = family.Code,
            SortOrder = family.SortOrder,
            IsActive = family.IsActive,
            CreatedAt = family.CreatedAt,
            UpdatedAt = family.UpdatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = family.Id }, response);
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "CareerJobFamily", Action = PermissionAction.Update)]
    public async Task<ActionResult<CareerJobFamilyResponse>> Update(Guid id, UpdateCareerJobFamilyDto dto)
    {
        var family = await _context.CareerJobFamilies.FindAsync(id);
        if (family == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(family.TenantId))
        {
            return Forbid();
        }

        // Check for duplicate code if being changed
        if (!string.IsNullOrWhiteSpace(dto.Code) && !dto.Code.Equals(family.Code, StringComparison.OrdinalIgnoreCase))
        {
            var codeExists = await _context.CareerJobFamilies.AnyAsync(c =>
                c.TenantId == family.TenantId &&
                c.Code != null && c.Code.ToLower() == dto.Code.ToLower() &&
                c.Id != id);

            if (codeExists)
            {
                return BadRequest("A career job family with that code already exists.");
            }
            family.Code = dto.Code;
        }

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            family.Name = dto.Name;
        }

        if (dto.Description != null)
        {
            family.Description = dto.Description;
        }

        if (dto.SortOrder.HasValue)
        {
            family.SortOrder = dto.SortOrder.Value;
        }

        if (dto.IsActive.HasValue)
        {
            family.IsActive = dto.IsActive.Value;
        }

        family.UpdatedAt = DateTime.UtcNow;
        family.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        return Ok(new CareerJobFamilyResponse
        {
            Id = family.Id,
            TenantId = family.TenantId,
            Name = family.Name,
            Description = family.Description,
            Code = family.Code,
            SortOrder = family.SortOrder,
            IsActive = family.IsActive,
            CreatedAt = family.CreatedAt,
            UpdatedAt = family.UpdatedAt
        });
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "CareerJobFamily", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var family = await _context.CareerJobFamilies.FindAsync(id);
        if (family == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(family.TenantId))
        {
            return Forbid();
        }

        // Check if in use
        var inUse = await _context.Users.AnyAsync(u => u.CareerJobFamilyId == id) ||
                    await _context.Subcontractors.AnyAsync(s => s.CareerJobFamilyId == id) ||
                    await _context.ProjectRoleAssignments.AnyAsync(p => p.CareerJobFamilyId == id);

        if (inUse)
        {
            return BadRequest("Cannot delete career job family that is in use. Deactivate it instead.");
        }

        family.IsDeleted = true;
        family.DeletedAt = DateTime.UtcNow;
        family.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("CareerJobFamily {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }
}

// DTOs
public class CareerJobFamilyResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Code { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCareerJobFamilyDto
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Code { get; set; }
    public int? SortOrder { get; set; }
}

public class UpdateCareerJobFamilyDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Code { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LaborCategoriesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<LaborCategoriesController> _logger;

    public LaborCategoriesController(MySchedulingDbContext context, ILogger<LaborCategoriesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<LaborCategoryResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? projectId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? search = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.LaborCategories
            .Include(l => l.Project)
            .Where(l => l.TenantId == tenantId);

        if (projectId.HasValue)
        {
            query = query.Where(l => l.ProjectId == projectId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(l => l.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(l =>
                l.Name.ToLower().Contains(search.ToLower()) ||
                (l.Code != null && l.Code.ToLower().Contains(search.ToLower())) ||
                (l.Description != null && l.Description.ToLower().Contains(search.ToLower())));
        }

        var categories = await query
            .OrderBy(l => l.Project.Name)
            .ThenBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .AsNoTracking()
            .Select(l => new LaborCategoryResponse
            {
                Id = l.Id,
                TenantId = l.TenantId,
                ProjectId = l.ProjectId,
                ProjectName = l.Project.Name,
                Name = l.Name,
                Code = l.Code,
                Description = l.Description,
                BillRate = l.BillRate,
                CostRate = l.CostRate,
                IsActive = l.IsActive,
                SortOrder = l.SortOrder,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Read)]
    public async Task<ActionResult<LaborCategoryResponse>> GetById(Guid id)
    {
        var category = await _context.LaborCategories
            .Include(l => l.Project)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id);

        if (category == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(category.TenantId))
        {
            return Forbid();
        }

        return Ok(new LaborCategoryResponse
        {
            Id = category.Id,
            TenantId = category.TenantId,
            ProjectId = category.ProjectId,
            ProjectName = category.Project.Name,
            Name = category.Name,
            Code = category.Code,
            Description = category.Description,
            BillRate = category.BillRate,
            CostRate = category.CostRate,
            IsActive = category.IsActive,
            SortOrder = category.SortOrder,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        });
    }

    [HttpGet("by-project/{projectId}")]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<LaborCategoryResponse>>> GetByProject(Guid projectId, [FromQuery] bool? isActive = null)
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

        var query = _context.LaborCategories
            .Where(l => l.ProjectId == projectId);

        if (isActive.HasValue)
        {
            query = query.Where(l => l.IsActive == isActive.Value);
        }

        var categories = await query
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .AsNoTracking()
            .Select(l => new LaborCategoryResponse
            {
                Id = l.Id,
                TenantId = l.TenantId,
                ProjectId = l.ProjectId,
                ProjectName = project.Name,
                Name = l.Name,
                Code = l.Code,
                Description = l.Description,
                BillRate = l.BillRate,
                CostRate = l.CostRate,
                IsActive = l.IsActive,
                SortOrder = l.SortOrder,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpPost]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Create)]
    public async Task<ActionResult<LaborCategoryResponse>> Create(CreateLaborCategoryDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Verify project exists and belongs to tenant
        var project = await _context.Projects.FindAsync(dto.ProjectId);
        if (project == null || project.TenantId != dto.TenantId)
        {
            return BadRequest("Invalid project.");
        }

        // Check for duplicate code within project
        if (!string.IsNullOrWhiteSpace(dto.Code))
        {
            var codeExists = await _context.LaborCategories.AnyAsync(l =>
                l.ProjectId == dto.ProjectId &&
                l.Code != null && l.Code.ToLower() == dto.Code.ToLower());

            if (codeExists)
            {
                return BadRequest("A labor category with that code already exists in this project.");
            }
        }

        var category = new LaborCategory
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            ProjectId = dto.ProjectId,
            Name = dto.Name,
            Code = dto.Code,
            Description = dto.Description,
            BillRate = dto.BillRate,
            CostRate = dto.CostRate,
            IsActive = true,
            SortOrder = dto.SortOrder ?? 0,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.LaborCategories.Add(category);
        await _context.SaveChangesAsync();

        _logger.LogInformation("LaborCategory {Name} created for project {ProjectId} by {UserId}",
            dto.Name, dto.ProjectId, GetCurrentUserId());

        return CreatedAtAction(nameof(GetById), new { id = category.Id }, new LaborCategoryResponse
        {
            Id = category.Id,
            TenantId = category.TenantId,
            ProjectId = category.ProjectId,
            ProjectName = project.Name,
            Name = category.Name,
            Code = category.Code,
            Description = category.Description,
            BillRate = category.BillRate,
            CostRate = category.CostRate,
            IsActive = category.IsActive,
            SortOrder = category.SortOrder,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        });
    }

    [HttpPost("bulk")]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Create)]
    public async Task<ActionResult<IEnumerable<LaborCategoryResponse>>> CreateBulk(CreateBulkLaborCategoriesDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        // Verify project exists and belongs to tenant
        var project = await _context.Projects.FindAsync(dto.ProjectId);
        if (project == null || project.TenantId != dto.TenantId)
        {
            return BadRequest("Invalid project.");
        }

        var categories = new List<LaborCategory>();
        var sortOrder = 0;

        foreach (var item in dto.Categories)
        {
            var category = new LaborCategory
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                ProjectId = dto.ProjectId,
                Name = item.Name,
                Code = item.Code,
                Description = item.Description,
                BillRate = item.BillRate,
                CostRate = item.CostRate,
                IsActive = true,
                SortOrder = sortOrder++,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = GetCurrentUserId()
            };
            categories.Add(category);
        }

        _context.LaborCategories.AddRange(categories);
        await _context.SaveChangesAsync();

        _logger.LogInformation("{Count} LaborCategories created for project {ProjectId} by {UserId}",
            categories.Count, dto.ProjectId, GetCurrentUserId());

        return Ok(categories.Select(c => new LaborCategoryResponse
        {
            Id = c.Id,
            TenantId = c.TenantId,
            ProjectId = c.ProjectId,
            ProjectName = project.Name,
            Name = c.Name,
            Code = c.Code,
            Description = c.Description,
            BillRate = c.BillRate,
            CostRate = c.CostRate,
            IsActive = c.IsActive,
            SortOrder = c.SortOrder,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }));
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Update)]
    public async Task<ActionResult<LaborCategoryResponse>> Update(Guid id, UpdateLaborCategoryDto dto)
    {
        var category = await _context.LaborCategories
            .Include(l => l.Project)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (category == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(category.TenantId))
        {
            return Forbid();
        }

        // Check for duplicate code if being changed
        if (!string.IsNullOrWhiteSpace(dto.Code) && !dto.Code.Equals(category.Code, StringComparison.OrdinalIgnoreCase))
        {
            var codeExists = await _context.LaborCategories.AnyAsync(l =>
                l.ProjectId == category.ProjectId &&
                l.Code != null && l.Code.ToLower() == dto.Code.ToLower() &&
                l.Id != id);

            if (codeExists)
            {
                return BadRequest("A labor category with that code already exists in this project.");
            }
            category.Code = dto.Code;
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) category.Name = dto.Name;
        if (dto.Description != null) category.Description = dto.Description;
        if (dto.BillRate.HasValue) category.BillRate = dto.BillRate.Value == 0 ? null : dto.BillRate;
        if (dto.CostRate.HasValue) category.CostRate = dto.CostRate.Value == 0 ? null : dto.CostRate;
        if (dto.IsActive.HasValue) category.IsActive = dto.IsActive.Value;
        if (dto.SortOrder.HasValue) category.SortOrder = dto.SortOrder.Value;

        category.UpdatedAt = DateTime.UtcNow;
        category.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        return Ok(new LaborCategoryResponse
        {
            Id = category.Id,
            TenantId = category.TenantId,
            ProjectId = category.ProjectId,
            ProjectName = category.Project.Name,
            Name = category.Name,
            Code = category.Code,
            Description = category.Description,
            BillRate = category.BillRate,
            CostRate = category.CostRate,
            IsActive = category.IsActive,
            SortOrder = category.SortOrder,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        });
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "LaborCategory", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await _context.LaborCategories.FindAsync(id);
        if (category == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(category.TenantId))
        {
            return Forbid();
        }

        // Check if in use
        var inUse = await _context.ProjectRoleAssignments.AnyAsync(p => p.LaborCategoryId == id);

        if (inUse)
        {
            return BadRequest("Cannot delete labor category that is in use. Deactivate it instead.");
        }

        category.IsDeleted = true;
        category.DeletedAt = DateTime.UtcNow;
        category.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("LaborCategory {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }
}

// DTOs
public class LaborCategoryResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateLaborCategoryDto
{
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }
    public int? SortOrder { get; set; }
}

public class CreateBulkLaborCategoriesDto
{
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public List<LaborCategoryItem> Categories { get; set; } = new();
}

public class LaborCategoryItem
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }
}

public class UpdateLaborCategoryDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }
    public bool? IsActive { get; set; }
    public int? SortOrder { get; set; }
}

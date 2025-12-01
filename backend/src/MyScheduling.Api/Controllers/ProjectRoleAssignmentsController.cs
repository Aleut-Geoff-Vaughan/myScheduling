using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectRoleAssignmentsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ProjectRoleAssignmentsController> _logger;

    public ProjectRoleAssignmentsController(MySchedulingDbContext context, ILogger<ProjectRoleAssignmentsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ProjectRoleAssignmentResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? wbsElementId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] Guid? subcontractorId = null,
        [FromQuery] bool? isTbd = null,
        [FromQuery] ProjectRoleAssignmentStatus? status = null,
        [FromQuery] bool includeInactive = false)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .Where(r => r.TenantId == tenantId);

        if (projectId.HasValue)
        {
            query = query.Where(r => r.ProjectId == projectId.Value);
        }

        if (wbsElementId.HasValue)
        {
            query = query.Where(r => r.WbsElementId == wbsElementId.Value);
        }

        if (userId.HasValue)
        {
            query = query.Where(r => r.UserId == userId.Value);
        }

        if (subcontractorId.HasValue)
        {
            query = query.Where(r => r.SubcontractorId == subcontractorId.Value);
        }

        if (isTbd.HasValue)
        {
            query = query.Where(r => r.IsTbd == isTbd.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }
        else if (!includeInactive)
        {
            query = query.Where(r => r.Status == ProjectRoleAssignmentStatus.Active || r.Status == ProjectRoleAssignmentStatus.Draft);
        }

        var assignments = await query
            .OrderBy(r => r.Project.Name)
            .ThenBy(r => r.WbsElement != null ? r.WbsElement.Code : "")
            .ThenBy(r => r.PositionTitle)
            .AsNoTracking()
            .ToListAsync();

        return Ok(assignments.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<ProjectRoleAssignmentResponse>> GetById(Guid id)
    {
        var assignment = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (assignment == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(assignment.TenantId))
        {
            return Forbid();
        }

        return Ok(MapToResponse(assignment));
    }

    [HttpGet("by-project/{projectId}")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ProjectRoleAssignmentResponse>>> GetByProject(
        Guid projectId,
        [FromQuery] bool includeInactive = false)
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

        var query = _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .Where(r => r.ProjectId == projectId);

        if (!includeInactive)
        {
            query = query.Where(r => r.Status == ProjectRoleAssignmentStatus.Active || r.Status == ProjectRoleAssignmentStatus.Draft);
        }

        var assignments = await query
            .OrderBy(r => r.WbsElement != null ? r.WbsElement.Code : "")
            .ThenBy(r => r.PositionTitle)
            .AsNoTracking()
            .ToListAsync();

        return Ok(assignments.Select(MapToResponse));
    }

    [HttpGet("tbds")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ProjectRoleAssignmentResponse>>> GetTbds(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? projectId = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .Where(r => r.TenantId == tenantId && r.IsTbd && r.Status == ProjectRoleAssignmentStatus.Active);

        if (projectId.HasValue)
        {
            query = query.Where(r => r.ProjectId == projectId.Value);
        }

        var tbds = await query
            .OrderBy(r => r.Project.Name)
            .ThenBy(r => r.PositionTitle)
            .AsNoTracking()
            .Select(r => MapToResponse(r))
            .ToListAsync();

        return Ok(tbds);
    }

    [HttpGet("my-assignments")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ProjectRoleAssignmentResponse>>> GetMyAssignments(
        [FromQuery] Guid tenantId,
        [FromQuery] bool includeInactive = false)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var currentUserId = GetCurrentUserId();

        var query = _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .Where(r => r.TenantId == tenantId && r.UserId == currentUserId);

        if (!includeInactive)
        {
            query = query.Where(r => r.Status == ProjectRoleAssignmentStatus.Active);
        }

        var assignments = await query
            .OrderBy(r => r.Project.Name)
            .ThenBy(r => r.PositionTitle)
            .AsNoTracking()
            .Select(r => MapToResponse(r))
            .ToListAsync();

        return Ok(assignments);
    }

    [HttpPost]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Create)]
    public async Task<ActionResult<ProjectRoleAssignmentResponse>> Create(CreateProjectRoleAssignmentDto dto)
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

        // Verify WBS element if provided
        if (dto.WbsElementId.HasValue)
        {
            var wbs = await _context.WbsElements.FindAsync(dto.WbsElementId.Value);
            if (wbs == null || wbs.ProjectId != dto.ProjectId)
            {
                return BadRequest("Invalid WBS element for this project.");
            }
        }

        // Validate assignment type - exactly one of UserId, SubcontractorId, or IsTbd must be set
        var assignmentCount = (dto.UserId.HasValue ? 1 : 0) + (dto.SubcontractorId.HasValue ? 1 : 0) + (dto.IsTbd ? 1 : 0);
        if (assignmentCount == 0)
        {
            return BadRequest("Must assign to a User, Subcontractor, or mark as TBD.");
        }
        if (assignmentCount > 1)
        {
            return BadRequest("Can only assign to one of: User, Subcontractor, or TBD.");
        }

        // Verify user if provided (check tenant membership)
        if (dto.UserId.HasValue)
        {
            var userInTenant = await _context.TenantMemberships
                .AnyAsync(tm => tm.UserId == dto.UserId.Value && tm.TenantId == dto.TenantId && tm.IsActive);
            if (!userInTenant)
            {
                return BadRequest("Invalid user or user not in this tenant.");
            }
        }

        // Verify subcontractor if provided
        if (dto.SubcontractorId.HasValue)
        {
            var sub = await _context.Subcontractors.FirstOrDefaultAsync(s => s.Id == dto.SubcontractorId.Value && s.TenantId == dto.TenantId);
            if (sub == null)
            {
                return BadRequest("Invalid subcontractor.");
            }
        }

        // Verify labor category if provided
        if (dto.LaborCategoryId.HasValue)
        {
            var lc = await _context.LaborCategories.FindAsync(dto.LaborCategoryId.Value);
            if (lc == null || lc.ProjectId != dto.ProjectId)
            {
                return BadRequest("Invalid labor category for this project.");
            }
        }

        // Verify career job family if provided
        if (dto.CareerJobFamilyId.HasValue)
        {
            var cjf = await _context.CareerJobFamilies.FirstOrDefaultAsync(c => c.Id == dto.CareerJobFamilyId.Value && c.TenantId == dto.TenantId);
            if (cjf == null)
            {
                return BadRequest("Invalid career job family.");
            }
        }

        var assignment = new ProjectRoleAssignment
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            ProjectId = dto.ProjectId,
            WbsElementId = dto.WbsElementId,
            UserId = dto.UserId,
            SubcontractorId = dto.SubcontractorId,
            IsTbd = dto.IsTbd,
            TbdDescription = dto.IsTbd ? dto.TbdDescription : null,
            PositionTitle = dto.PositionTitle,
            CareerJobFamilyId = dto.CareerJobFamilyId,
            CareerLevel = dto.CareerLevel,
            LaborCategoryId = dto.LaborCategoryId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = dto.Status ?? ProjectRoleAssignmentStatus.Active,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ProjectRoleAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ProjectRoleAssignment {Id} created for project {ProjectId} by {UserId}",
            assignment.Id, dto.ProjectId, GetCurrentUserId());

        // Reload with includes for response
        var created = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .FirstAsync(r => r.Id == assignment.Id);

        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, MapToResponse(created));
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Update)]
    public async Task<ActionResult<ProjectRoleAssignmentResponse>> Update(Guid id, UpdateProjectRoleAssignmentDto dto)
    {
        var assignment = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (assignment == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(assignment.TenantId))
        {
            return Forbid();
        }

        // Verify WBS element if being changed
        if (dto.WbsElementId.HasValue && dto.WbsElementId != assignment.WbsElementId)
        {
            var wbs = await _context.WbsElements.FindAsync(dto.WbsElementId.Value);
            if (wbs == null || wbs.ProjectId != assignment.ProjectId)
            {
                return BadRequest("Invalid WBS element for this project.");
            }
            assignment.WbsElementId = dto.WbsElementId;
        }

        // Verify labor category if being changed
        if (dto.LaborCategoryId.HasValue && dto.LaborCategoryId != assignment.LaborCategoryId)
        {
            var lc = await _context.LaborCategories.FindAsync(dto.LaborCategoryId.Value);
            if (lc == null || lc.ProjectId != assignment.ProjectId)
            {
                return BadRequest("Invalid labor category for this project.");
            }
            assignment.LaborCategoryId = dto.LaborCategoryId;
        }

        // Verify career job family if being changed
        if (dto.CareerJobFamilyId.HasValue && dto.CareerJobFamilyId != assignment.CareerJobFamilyId)
        {
            var cjf = await _context.CareerJobFamilies.FirstOrDefaultAsync(c => c.Id == dto.CareerJobFamilyId.Value && c.TenantId == assignment.TenantId);
            if (cjf == null)
            {
                return BadRequest("Invalid career job family.");
            }
            assignment.CareerJobFamilyId = dto.CareerJobFamilyId;
        }

        if (!string.IsNullOrWhiteSpace(dto.PositionTitle)) assignment.PositionTitle = dto.PositionTitle;
        if (dto.CareerLevel.HasValue) assignment.CareerLevel = dto.CareerLevel;
        if (dto.StartDate.HasValue) assignment.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue) assignment.EndDate = dto.EndDate;
        if (dto.Status.HasValue) assignment.Status = dto.Status.Value;
        if (dto.Notes != null) assignment.Notes = dto.Notes;
        if (dto.TbdDescription != null && assignment.IsTbd) assignment.TbdDescription = dto.TbdDescription;

        assignment.UpdatedAt = DateTime.UtcNow;
        assignment.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        // Reload with includes for response
        var updated = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .FirstAsync(r => r.Id == id);

        return Ok(MapToResponse(updated));
    }

    [HttpPost("{id}/fill-tbd")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Update)]
    public async Task<ActionResult<ProjectRoleAssignmentResponse>> FillTbd(Guid id, FillTbdDto dto)
    {
        var assignment = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (assignment == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(assignment.TenantId))
        {
            return Forbid();
        }

        if (!assignment.IsTbd)
        {
            return BadRequest("This assignment is not a TBD.");
        }

        // Validate - exactly one of UserId or SubcontractorId must be provided
        if (dto.UserId.HasValue == dto.SubcontractorId.HasValue)
        {
            return BadRequest("Must provide either UserId or SubcontractorId, but not both.");
        }

        // Verify user if provided (check tenant membership)
        if (dto.UserId.HasValue)
        {
            var userInTenant = await _context.TenantMemberships
                .AnyAsync(tm => tm.UserId == dto.UserId.Value && tm.TenantId == assignment.TenantId && tm.IsActive);
            if (!userInTenant)
            {
                return BadRequest("Invalid user or user not in this tenant.");
            }
            assignment.UserId = dto.UserId;
            assignment.SubcontractorId = null;
        }

        // Verify subcontractor if provided
        if (dto.SubcontractorId.HasValue)
        {
            var sub = await _context.Subcontractors.FirstOrDefaultAsync(s => s.Id == dto.SubcontractorId.Value && s.TenantId == assignment.TenantId);
            if (sub == null)
            {
                return BadRequest("Invalid subcontractor.");
            }
            assignment.SubcontractorId = dto.SubcontractorId;
            assignment.UserId = null;
        }

        assignment.IsTbd = false;
        assignment.TbdDescription = null;
        assignment.UpdatedAt = DateTime.UtcNow;
        assignment.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("TBD assignment {Id} filled with {Type} {AssigneeId} by {UserId}",
            id,
            dto.UserId.HasValue ? "User" : "Subcontractor",
            dto.UserId ?? dto.SubcontractorId,
            GetCurrentUserId());

        // Reload with includes for response
        var updated = await _context.ProjectRoleAssignments
            .Include(r => r.Project)
            .Include(r => r.WbsElement)
            .Include(r => r.User)
            .Include(r => r.Subcontractor)
                .ThenInclude(s => s != null ? s.SubcontractorCompany : null)
            .Include(r => r.CareerJobFamily)
            .Include(r => r.LaborCategory)
            .FirstAsync(r => r.Id == id);

        return Ok(MapToResponse(updated));
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var assignment = await _context.ProjectRoleAssignments.FindAsync(id);
        if (assignment == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(assignment.TenantId))
        {
            return Forbid();
        }

        // Check if has forecasts
        var hasForecast = await _context.Forecasts.AnyAsync(f => f.ProjectRoleAssignmentId == id);
        if (hasForecast)
        {
            return BadRequest("Cannot delete assignment with forecasts. Cancel it instead.");
        }

        assignment.IsDeleted = true;
        assignment.DeletedAt = DateTime.UtcNow;
        assignment.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("ProjectRoleAssignment {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }

    [HttpGet("position-titles")]
    [RequiresPermission(Resource = "ProjectRoleAssignment", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<string>>> GetPositionTitleSuggestions(
        [FromQuery] Guid tenantId,
        [FromQuery] string? search = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        // Get distinct position titles from existing assignments
        var query = _context.ProjectRoleAssignments
            .Where(r => r.TenantId == tenantId && !string.IsNullOrWhiteSpace(r.PositionTitle))
            .Select(r => r.PositionTitle)
            .Distinct();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => t.ToLower().Contains(search.ToLower()));
        }

        var titles = await query
            .OrderBy(t => t)
            .Take(20)
            .ToListAsync();

        // Add common consulting titles if no results or for suggestions
        var commonTitles = new[]
        {
            "Project Manager", "Senior Project Manager", "Program Manager",
            "Business Analyst", "Senior Business Analyst",
            "Software Developer", "Senior Software Developer", "Lead Developer",
            "Solutions Architect", "Technical Architect", "Enterprise Architect",
            "Data Analyst", "Data Scientist", "Data Engineer",
            "DevOps Engineer", "Site Reliability Engineer",
            "QA Engineer", "Senior QA Engineer", "QA Lead",
            "Scrum Master", "Agile Coach",
            "Technical Writer", "UX Designer", "UI Developer",
            "Systems Administrator", "Network Engineer",
            "Security Analyst", "Security Engineer",
            "Support Engineer", "Implementation Specialist",
            "Consultant", "Senior Consultant", "Managing Consultant", "Principal Consultant"
        };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var matchingCommon = commonTitles
                .Where(t => t.ToLower().Contains(search.ToLower()))
                .Except(titles);
            titles.AddRange(matchingCommon);
        }
        else if (titles.Count < 10)
        {
            titles.AddRange(commonTitles.Except(titles).Take(20 - titles.Count));
        }

        return Ok(titles.OrderBy(t => t).Distinct().Take(20));
    }

    private static ProjectRoleAssignmentResponse MapToResponse(ProjectRoleAssignment r)
    {
        return new ProjectRoleAssignmentResponse
        {
            Id = r.Id,
            TenantId = r.TenantId,
            ProjectId = r.ProjectId,
            ProjectName = r.Project?.Name ?? "",
            WbsElementId = r.WbsElementId,
            WbsElementCode = r.WbsElement?.Code,
            WbsElementDescription = r.WbsElement?.Description,
            UserId = r.UserId,
            UserName = r.User?.DisplayName,
            SubcontractorId = r.SubcontractorId,
            SubcontractorName = r.Subcontractor != null ? $"{r.Subcontractor.FirstName} {r.Subcontractor.LastName}" : null,
            SubcontractorCompanyName = r.Subcontractor?.SubcontractorCompany?.Name,
            IsTbd = r.IsTbd,
            TbdDescription = r.TbdDescription,
            AssigneeName = r.User?.DisplayName ?? (r.Subcontractor != null ? $"{r.Subcontractor.FirstName} {r.Subcontractor.LastName}" : null) ?? r.TbdDescription ?? "TBD",
            PositionTitle = r.PositionTitle,
            CareerJobFamilyId = r.CareerJobFamilyId,
            CareerJobFamilyName = r.CareerJobFamily?.Name,
            CareerLevel = r.CareerLevel,
            LaborCategoryId = r.LaborCategoryId,
            LaborCategoryName = r.LaborCategory?.Name,
            LaborCategoryCode = r.LaborCategory?.Code,
            StartDate = r.StartDate.ToString("yyyy-MM-dd"),
            EndDate = r.EndDate?.ToString("yyyy-MM-dd"),
            Status = r.Status,
            StatusName = r.Status.ToString(),
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }
}

// DTOs
public class ProjectRoleAssignmentResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public Guid? WbsElementId { get; set; }
    public string? WbsElementCode { get; set; }
    public string? WbsElementDescription { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public Guid? SubcontractorId { get; set; }
    public string? SubcontractorName { get; set; }
    public string? SubcontractorCompanyName { get; set; }
    public bool IsTbd { get; set; }
    public string? TbdDescription { get; set; }
    public string AssigneeName { get; set; } = string.Empty;
    public string PositionTitle { get; set; } = string.Empty;
    public Guid? CareerJobFamilyId { get; set; }
    public string? CareerJobFamilyName { get; set; }
    public int? CareerLevel { get; set; }
    public Guid? LaborCategoryId { get; set; }
    public string? LaborCategoryName { get; set; }
    public string? LaborCategoryCode { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; }
    public ProjectRoleAssignmentStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateProjectRoleAssignmentDto
{
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }
    public Guid? UserId { get; set; }
    public Guid? SubcontractorId { get; set; }
    public bool IsTbd { get; set; } = false;
    public string? TbdDescription { get; set; }
    public string PositionTitle { get; set; } = string.Empty;
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public Guid? LaborCategoryId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public ProjectRoleAssignmentStatus? Status { get; set; }
    public string? Notes { get; set; }
}

public class UpdateProjectRoleAssignmentDto
{
    public Guid? WbsElementId { get; set; }
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public Guid? LaborCategoryId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public ProjectRoleAssignmentStatus? Status { get; set; }
    public string? Notes { get; set; }
    public string? TbdDescription { get; set; }
}

public class FillTbdDto
{
    public Guid? UserId { get; set; }
    public Guid? SubcontractorId { get; set; }
}

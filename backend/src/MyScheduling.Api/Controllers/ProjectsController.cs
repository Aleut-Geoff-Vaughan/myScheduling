using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ProjectsController> _logger;
    private readonly IAuthorizationService _authService;

    public ProjectsController(
        MySchedulingDbContext context,
        ILogger<ProjectsController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }


    // GET: api/projects
    [HttpGet]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjects(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] ProjectStatus? status = null,
        [FromQuery] string? search = null)
    {
        try
        {
            // Optimize: Don't load WbsElements collection in list view - causes cartesian explosion
            // They can be loaded on-demand when viewing individual projects
            var query = _context.Projects
                .AsNoTracking()
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(p => p.TenantId == tenantId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(p => p.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(p =>
                    p.Name.Contains(search) ||
                    (p.ProgramCode != null && p.ProgramCode.Contains(search)));
            }

            var projects = await query
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(projects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving projects");
            return StatusCode(500, "An error occurred while retrieving projects");
        }
    }

    // GET: api/projects/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Read)]
    public async Task<ActionResult<Project>> GetProject(Guid id)
    {
        try
        {
            var project = await _context.Projects
                .Include(p => p.WbsElements)
                    .ThenInclude(w => w.ProjectRoles)
                .Include(p => p.WbsElements)
                    .ThenInclude(w => w.Assignments)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound($"Project with ID {id} not found");
            }

            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project {ProjectId}", id);
            return StatusCode(500, "An error occurred while retrieving the project");
        }
    }

    // POST: api/projects
    [HttpPost]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Create)]
    public async Task<ActionResult<Project>> CreateProject(Project project)
    {
        try
        {
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating project");
            return StatusCode(500, "An error occurred while creating the project");
        }
    }

    // PUT: api/projects/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateProject(Guid id, Project project)
    {
        if (id != project.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            _context.Entry(project).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await ProjectExists(id))
                {
                    return NotFound($"Project with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project {ProjectId}", id);
            return StatusCode(500, "An error occurred while updating the project");
        }
    }

    // DELETE: api/projects/{id} (Soft Delete)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteProject(Guid id, [FromQuery] string? reason = null)
    {
        try
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound($"Project with ID {id} not found");
            }

            project.IsDeleted = true;
            project.DeletedAt = DateTime.UtcNow;
            project.DeletedByUserId = GetCurrentUserId();
            project.DeletionReason = reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project {ProjectId} soft-deleted by user {UserId}", id, project.DeletedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft-deleting project {ProjectId}", id);
            return StatusCode(500, "An error occurred while deleting the project");
        }
    }

    // DELETE: api/projects/{id}/hard (Hard Delete - Platform Admin Only)
    [HttpDelete("{id}/hard")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> HardDeleteProject(Guid id)
    {
        try
        {
            var project = await _context.Projects
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound($"Project with ID {id} not found");
            }

            var archive = new DataArchive
            {
                Id = Guid.NewGuid(),
                TenantId = project.TenantId,
                EntityType = "Project",
                EntityId = project.Id,
                EntitySnapshot = System.Text.Json.JsonSerializer.Serialize(project),
                ArchivedAt = DateTime.UtcNow,
                ArchivedByUserId = GetCurrentUserId(),
                Status = DataArchiveStatus.PermanentlyDeleted,
                PermanentlyDeletedAt = DateTime.UtcNow,
                PermanentlyDeletedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow
            };

            _context.DataArchives.Add(archive);
            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            _logger.LogWarning("Project {ProjectId} HARD DELETED by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard-deleting project {ProjectId}", id);
            return StatusCode(500, "An error occurred while permanently deleting the project");
        }
    }

    // POST: api/projects/{id}/restore (Restore Soft-Deleted)
    [HttpPost("{id}/restore")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Restore)]
    public async Task<IActionResult> RestoreProject(Guid id)
    {
        try
        {
            var project = await _context.Projects
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == id && p.IsDeleted);

            if (project == null)
            {
                return NotFound($"Soft-deleted project with ID {id} not found");
            }

            project.IsDeleted = false;
            project.DeletedAt = null;
            project.DeletedByUserId = null;
            project.DeletionReason = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project {ProjectId} restored by user {UserId}", id, GetCurrentUserId());

            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring project {ProjectId}", id);
            return StatusCode(500, "An error occurred while restoring the project");
        }
    }

    // PATCH: api/projects/{id}/budget
    [HttpPatch("{id}/budget")]
    [RequiresPermission(Resource = "Project", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateProjectBudget(Guid id, [FromBody] UpdateBudgetRequest request)
    {
        try
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound($"Project with ID {id} not found");
            }

            project.BudgetedHours = request.BudgetedHours;
            project.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project {ProjectId} budget updated to {BudgetedHours} by user {UserId}",
                id, request.BudgetedHours, GetCurrentUserId());

            return Ok(new {
                id = project.Id,
                budgetedHours = project.BudgetedHours,
                message = "Budget updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating budget for project {ProjectId}", id);
            return StatusCode(500, "An error occurred while updating the project budget");
        }
    }

    // GET: api/projects/{id}/wbs
    [HttpGet("{id}/wbs")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<WbsElement>>> GetProjectWbs(Guid id)
    {
        try
        {
            // Optimize: Don't load ProjectRoles and Assignments collections - causes cartesian explosion
            // These heavy collections can be loaded on-demand
            var wbsElements = await _context.WbsElements
                .Where(w => w.ProjectId == id)
                .AsNoTracking()
                .OrderBy(w => w.Code)
                .ToListAsync();

            return Ok(wbsElements);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving WBS for project {ProjectId}", id);
            return StatusCode(500, "An error occurred while retrieving WBS elements");
        }
    }

    private async Task<bool> ProjectExists(Guid id)
    {
        return await _context.Projects.AnyAsync(e => e.Id == id);
    }
}

public class UpdateBudgetRequest
{
    public decimal? BudgetedHours { get; set; }
}

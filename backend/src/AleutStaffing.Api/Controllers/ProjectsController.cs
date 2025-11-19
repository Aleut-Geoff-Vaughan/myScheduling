using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(AleutStaffingDbContext context, ILogger<ProjectsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/projects
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjects(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] ProjectStatus? status = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var query = _context.Projects
                .Include(p => p.WbsElements)
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

    // DELETE: api/projects/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(Guid id)
    {
        try
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound($"Project with ID {id} not found");
            }

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project {ProjectId}", id);
            return StatusCode(500, "An error occurred while deleting the project");
        }
    }

    // GET: api/projects/{id}/wbs
    [HttpGet("{id}/wbs")]
    public async Task<ActionResult<IEnumerable<WbsElement>>> GetProjectWbs(Guid id)
    {
        try
        {
            var wbsElements = await _context.WbsElements
                .Where(w => w.ProjectId == id)
                .Include(w => w.ProjectRoles)
                .Include(w => w.Assignments)
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

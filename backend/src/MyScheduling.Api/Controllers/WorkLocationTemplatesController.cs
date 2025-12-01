using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkLocationTemplatesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<WorkLocationTemplatesController> _logger;

    public WorkLocationTemplatesController(MySchedulingDbContext context, ILogger<WorkLocationTemplatesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/worklocationtemplates
    [HttpGet]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<WorkLocationTemplate>>> GetTemplates([FromQuery] Guid? tenantId = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var query = _context.WorkLocationTemplates
                .Include(t => t.Items)
                .Where(t => (t.UserId == userId || t.IsShared));

            // Filter by tenant if specified and user has access
            if (tenantId.HasValue)
            {
                if (!userTenantIds.Contains(tenantId.Value) && !IsSystemAdmin())
                {
                    return StatusCode(403, "You do not have access to this tenant");
                }
                query = query.Where(t => t.TenantId == tenantId.Value);
            }
            else
            {
                // Show templates from all tenants user has access to
                query = query.Where(t => userTenantIds.Contains(t.TenantId));
            }

            var templates = await query
                .OrderByDescending(t => t.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving work location templates");
            return StatusCode(500, "An error occurred while retrieving templates");
        }
    }

    // GET: api/worklocationtemplates/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<WorkLocationTemplate>> GetTemplate(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var template = await _context.WorkLocationTemplates
                .Include(t => t.Items.OrderBy(i => i.DayOffset))
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(template.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Check template access - user must own it or it must be shared
            if (template.UserId != userId && !template.IsShared && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have permission to view this template");
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving template {TemplateId}", id);
            return StatusCode(500, "An error occurred while retrieving the template");
        }
    }

    // POST: api/worklocationtemplates
    [HttpPost]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Create)]
    public async Task<ActionResult<WorkLocationTemplate>> CreateTemplate(WorkLocationTemplate template)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            // Validate tenant access
            if (!userTenantIds.Contains(template.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Validate template type and items
            if (template.Type == TemplateType.Week && template.Items.Count != 5)
            {
                return BadRequest("Week templates must have exactly 5 items (Monday-Friday)");
            }

            // Set IDs and metadata
            template.Id = Guid.NewGuid();
            template.UserId = userId;
            template.CreatedAt = DateTime.UtcNow;

            foreach (var item in template.Items)
            {
                item.Id = Guid.NewGuid();
                item.TemplateId = template.Id;
                item.CreatedAt = DateTime.UtcNow;
            }

            _context.WorkLocationTemplates.Add(template);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetTemplate),
                new { id = template.Id },
                template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template");
            return StatusCode(500, "An error occurred while creating the template");
        }
    }

    // PUT: api/worklocationtemplates/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateTemplate(Guid id, WorkLocationTemplate template)
    {
        if (id != template.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var existing = await _context.WorkLocationTemplates
                .Include(t => t.Items)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (existing == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(existing.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Only the owner can modify (unless system admin)
            if (existing.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Only the template owner can modify it");
            }

            // Update template properties
            existing.Name = template.Name;
            existing.Description = template.Description;
            existing.Type = template.Type;
            existing.IsShared = template.IsShared;
            existing.UpdatedAt = DateTime.UtcNow;

            // Remove old items
            _context.WorkLocationTemplateItems.RemoveRange(existing.Items);

            // Add new items
            foreach (var item in template.Items)
            {
                item.Id = Guid.NewGuid();
                item.TemplateId = template.Id;
                item.CreatedAt = DateTime.UtcNow;
                existing.Items.Add(item);
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating template {TemplateId}", id);
            return StatusCode(500, "An error occurred while updating the template");
        }
    }

    // DELETE: api/worklocationtemplates/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var template = await _context.WorkLocationTemplates
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(template.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Only the owner can delete (unless system admin)
            if (template.UserId != userId && !IsSystemAdmin())
            {
                return StatusCode(403, "Only the template owner can delete it");
            }

            _context.WorkLocationTemplates.Remove(template);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting template {TemplateId}", id);
            return StatusCode(500, "An error occurred while deleting the template");
        }
    }

    // POST: api/worklocationtemplates/{id}/apply
    [HttpPost("{id}/apply")]
    [RequiresPermission(Resource = "WorkLocationTemplate", Action = PermissionAction.Update)]
    public async Task<ActionResult<IEnumerable<WorkLocationPreference>>> ApplyTemplate(
        Guid id,
        [FromBody] ApplyTemplateRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            var template = await _context.WorkLocationTemplates
                .Include(t => t.Items.OrderBy(i => i.DayOffset))
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // Check tenant access
            if (!userTenantIds.Contains(template.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Check template access
            if (template.UserId != userId && !template.IsShared && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have permission to use this template");
            }

            var createdPreferences = new List<WorkLocationPreference>();
            var startDate = DateOnly.FromDateTime(request.StartDate);

            for (int week = 0; week < request.WeekCount; week++)
            {
                foreach (var item in template.Items)
                {
                    var workDate = startDate.AddDays(week * 7 + item.DayOffset);

                    // Handle day portion conflicts:
                    // If applying AM or PM, remove any FullDay preference for that date
                    // If applying FullDay, remove any AM/PM preferences for that date
                    if (item.DayPortion != DayPortion.FullDay)
                    {
                        // Remove FullDay preference if exists
                        var fullDayPreference = await _context.WorkLocationPreferences
                            .FirstOrDefaultAsync(w =>
                                w.UserId == userId &&
                                w.WorkDate == workDate &&
                                w.TenantId == template.TenantId &&
                                w.DayPortion == DayPortion.FullDay);

                        if (fullDayPreference != null)
                        {
                            _context.WorkLocationPreferences.Remove(fullDayPreference);
                        }
                    }
                    else
                    {
                        // Remove any AM/PM preferences if applying FullDay
                        var partialDayPreferences = await _context.WorkLocationPreferences
                            .Where(w =>
                                w.UserId == userId &&
                                w.WorkDate == workDate &&
                                w.TenantId == template.TenantId &&
                                w.DayPortion != DayPortion.FullDay)
                            .ToListAsync();

                        if (partialDayPreferences.Any())
                        {
                            _context.WorkLocationPreferences.RemoveRange(partialDayPreferences);
                        }
                    }

                    // Check if preference already exists for this specific day portion
                    var existing = await _context.WorkLocationPreferences
                        .FirstOrDefaultAsync(w =>
                            w.UserId == userId &&
                            w.WorkDate == workDate &&
                            w.TenantId == template.TenantId &&
                            w.DayPortion == item.DayPortion);

                    if (existing != null)
                    {
                        // Update existing
                        existing.LocationType = item.LocationType;
                        existing.OfficeId = item.OfficeId;
                        existing.RemoteLocation = item.RemoteLocation;
                        existing.City = item.City;
                        existing.State = item.State;
                        existing.Country = item.Country;
                        existing.Notes = item.Notes;
                        existing.UpdatedAt = DateTime.UtcNow;
                        createdPreferences.Add(existing);
                    }
                    else
                    {
                        // Create new
                        var preference = new WorkLocationPreference
                        {
                            Id = Guid.NewGuid(),
                            UserId = userId,
                            TenantId = template.TenantId,
                            WorkDate = workDate,
                            LocationType = item.LocationType,
                            DayPortion = item.DayPortion,
                            OfficeId = item.OfficeId,
                            RemoteLocation = item.RemoteLocation,
                            City = item.City,
                            State = item.State,
                            Country = item.Country,
                            Notes = item.Notes,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.WorkLocationPreferences.Add(preference);
                        createdPreferences.Add(preference);
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(createdPreferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying template {TemplateId}", id);
            return StatusCode(500, "An error occurred while applying the template");
        }
    }
}

public class ApplyTemplateRequest
{
    public DateTime StartDate { get; set; }
    public int WeekCount { get; set; } = 1;
}

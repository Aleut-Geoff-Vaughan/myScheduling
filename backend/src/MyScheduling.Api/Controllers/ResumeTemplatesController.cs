using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/resume-templates")]
public class ResumeTemplatesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ResumeTemplatesController> _logger;

    public ResumeTemplatesController(MySchedulingDbContext context, ILogger<ResumeTemplatesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/resume-templates
    [HttpGet]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeTemplate>>> GetTemplates(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] ResumeTemplateType? type = null,
        [FromQuery] bool? isActive = null)
    {
        try
        {
            var query = _context.ResumeTemplates
                .Include(t => t.StoredFile)
                .AsQueryable();

            // Filter by tenant
            if (tenantId.HasValue)
            {
                query = query.Where(t => t.TenantId == tenantId.Value);
            }

            // Filter by type
            if (type.HasValue)
            {
                query = query.Where(t => t.Type == type.Value);
            }

            // Filter by active status
            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            var templates = await query
                .OrderBy(t => t.Type)
                .ThenBy(t => t.Name)
                .ToListAsync();

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving templates");
            return StatusCode(500, "An error occurred while retrieving templates");
        }
    }

    // GET: api/resume-templates/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeTemplate>> GetTemplate(Guid id)
    {
        try
        {
            var template = await _context.ResumeTemplates
                .Include(t => t.StoredFile)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving template {TemplateId}", id);
            return StatusCode(500, "An error occurred while retrieving the template");
        }
    }

    // POST: api/resume-templates
    [HttpPost]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeTemplate>> CreateTemplate([FromBody] CreateTemplateRequest request)
    {
        try
        {
            // Validate tenant exists
            var tenantExists = await _context.Tenants
                .AnyAsync(t => t.Id == request.TenantId);

            if (!tenantExists)
            {
                return BadRequest($"Tenant with ID {request.TenantId} not found");
            }

            // If setting as default, unset other defaults of same type
            if (request.IsDefault)
            {
                var existingDefaults = await _context.ResumeTemplates
                    .Where(t => t.TenantId == request.TenantId &&
                               t.Type == request.Type &&
                               t.IsDefault)
                    .ToListAsync();

                foreach (var existingTemplate in existingDefaults)
                {
                    existingTemplate.IsDefault = false;
                }
            }

            // Validate stored file if specified
            if (request.StoredFileId.HasValue)
            {
                var fileExists = await _context.StoredFiles
                    .AnyAsync(f => f.Id == request.StoredFileId.Value);

                if (!fileExists)
                {
                    return BadRequest($"File with ID {request.StoredFileId.Value} not found");
                }
            }

            var template = new ResumeTemplate
            {
                TenantId = request.TenantId,
                Name = request.Name,
                Description = request.Description,
                Type = request.Type,
                TemplateContent = request.TemplateContent,
                StoredFileId = request.StoredFileId,
                IsDefault = request.IsDefault,
                IsActive = true
            };

            _context.ResumeTemplates.Add(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created template {TemplateId} for tenant {TenantId}", template.Id, request.TenantId);

            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template");
            return StatusCode(500, "An error occurred while creating the template");
        }
    }

    // PUT: api/resume-templates/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateTemplate(Guid id, [FromBody] UpdateTemplateRequest request)
    {
        try
        {
            var template = await _context.ResumeTemplates
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // If setting as default, unset other defaults of same type
            if (request.IsDefault.HasValue && request.IsDefault.Value)
            {
                var existingDefaults = await _context.ResumeTemplates
                    .Where(t => t.TenantId == template.TenantId &&
                               t.Type == template.Type &&
                               t.Id != id &&
                               t.IsDefault)
                    .ToListAsync();

                foreach (var t in existingDefaults)
                {
                    t.IsDefault = false;
                }
            }

            // Update fields
            if (request.Name != null)
                template.Name = request.Name;

            if (request.Description != null)
                template.Description = request.Description;

            if (request.Type.HasValue)
                template.Type = request.Type.Value;

            if (request.TemplateContent != null)
                template.TemplateContent = request.TemplateContent;

            if (request.StoredFileId.HasValue)
                template.StoredFileId = request.StoredFileId;

            if (request.IsDefault.HasValue)
                template.IsDefault = request.IsDefault.Value;

            if (request.IsActive.HasValue)
                template.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated template {TemplateId}", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating template {TemplateId}", id);
            return StatusCode(500, "An error occurred while updating the template");
        }
    }

    // DELETE: api/resume-templates/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteTemplate(Guid id)
    {
        try
        {
            var template = await _context.ResumeTemplates
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // Check if template is being used
            var isUsed = await _context.ResumeDocuments
                .AnyAsync(d => d.TemplateName == template.Name);

            if (isUsed)
            {
                // Don't delete, just deactivate
                template.IsActive = false;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deactivated template {TemplateId} (in use)", id);
            }
            else
            {
                _context.ResumeTemplates.Remove(template);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deleted template {TemplateId}", id);
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting template {TemplateId}", id);
            return StatusCode(500, "An error occurred while deleting the template");
        }
    }

    // GET: api/resume-templates/default
    [HttpGet("default")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeTemplate>> GetDefaultTemplate(
        [FromQuery] Guid tenantId,
        [FromQuery] ResumeTemplateType type)
    {
        try
        {
            var template = await _context.ResumeTemplates
                .Include(t => t.StoredFile)
                .FirstOrDefaultAsync(t =>
                    t.TenantId == tenantId &&
                    t.Type == type &&
                    t.IsDefault &&
                    t.IsActive);

            if (template == null)
            {
                return NotFound($"No default template found for type {type} in tenant {tenantId}");
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving default template for tenant {TenantId} and type {Type}", tenantId, type);
            return StatusCode(500, "An error occurred while retrieving the default template");
        }
    }

    // POST: api/resume-templates/{id}/preview
    [HttpPost("{id}/preview")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Read)]
    public async Task<ActionResult<string>> PreviewTemplate(Guid id, [FromBody] PreviewTemplateRequest request)
    {
        try
        {
            var template = await _context.ResumeTemplates
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            // TODO: Implement actual template preview generation
            // This would use the template content and sample data to generate a preview
            var preview = $"Preview of template '{template.Name}' with sample data";

            return Ok(new { preview = preview });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing template {TemplateId}", id);
            return StatusCode(500, "An error occurred while previewing the template");
        }
    }

    // POST: api/resume-templates/{id}/duplicate
    [HttpPost("{id}/duplicate")]
    [RequiresPermission(Resource = "ResumeTemplate", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeTemplate>> DuplicateTemplate(Guid id, [FromBody] DuplicateTemplateRequest request)
    {
        try
        {
            var originalTemplate = await _context.ResumeTemplates
                .FirstOrDefaultAsync(t => t.Id == id);

            if (originalTemplate == null)
            {
                return NotFound($"Template with ID {id} not found");
            }

            var duplicateTemplate = new ResumeTemplate
            {
                TenantId = originalTemplate.TenantId,
                Name = request.NewName ?? $"{originalTemplate.Name} (Copy)",
                Description = originalTemplate.Description,
                Type = originalTemplate.Type,
                TemplateContent = originalTemplate.TemplateContent,
                StoredFileId = originalTemplate.StoredFileId,
                IsDefault = false, // Duplicates are never default
                IsActive = true
            };

            _context.ResumeTemplates.Add(duplicateTemplate);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Duplicated template {OriginalId} to {NewId}", id, duplicateTemplate.Id);

            return CreatedAtAction(nameof(GetTemplate), new { id = duplicateTemplate.Id }, duplicateTemplate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error duplicating template {TemplateId}", id);
            return StatusCode(500, "An error occurred while duplicating the template");
        }
    }
}

// DTOs
public class CreateTemplateRequest
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ResumeTemplateType Type { get; set; }
    public string TemplateContent { get; set; } = string.Empty;
    public Guid? StoredFileId { get; set; }
    public bool IsDefault { get; set; } = false;
}

public class UpdateTemplateRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public ResumeTemplateType? Type { get; set; }
    public string? TemplateContent { get; set; }
    public Guid? StoredFileId { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsActive { get; set; }
}

public class PreviewTemplateRequest
{
    public Dictionary<string, object>? SampleData { get; set; }
}

public class DuplicateTemplateRequest
{
    public string? NewName { get; set; }
}

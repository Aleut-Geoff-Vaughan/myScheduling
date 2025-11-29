using Microsoft.AspNetCore.Mvc;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Services;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/resumes")]
public class ResumeExportController : AuthorizedControllerBase
{
    private readonly ResumeExportService _exportService;
    private readonly ILogger<ResumeExportController> _logger;

    public ResumeExportController(
        ResumeExportService exportService,
        ILogger<ResumeExportController> logger)
    {
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Export resume to Word document (.docx)
    /// </summary>
    [HttpPost("{id}/export/word")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportToWord(Guid id, [FromBody] ExportOptionsRequest? request = null)
    {
        try
        {
            var options = MapExportOptions(request);
            var resumeData = await _exportService.LoadResumeDataAsync(id);
            var documentBytes = await _exportService.GenerateWordDocumentAsync(resumeData, options);

            var fileName = $"{SanitizeFileName(resumeData.DisplayName)}_Resume.docx";

            _logger.LogInformation("Generated Word document for resume {ResumeId}", id);

            return File(
                documentBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                fileName
            );
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Resume not found for export: {ResumeId}", id);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resume {ResumeId} to Word", id);
            return StatusCode(500, "An error occurred while generating the Word document");
        }
    }

    /// <summary>
    /// Export resume to PDF document
    /// </summary>
    [HttpPost("{id}/export/pdf")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportToPdf(Guid id, [FromBody] ExportOptionsRequest? request = null)
    {
        try
        {
            var options = MapExportOptions(request);
            var resumeData = await _exportService.LoadResumeDataAsync(id);
            var documentBytes = await _exportService.GeneratePdfDocumentAsync(resumeData, options);

            var fileName = $"{SanitizeFileName(resumeData.DisplayName)}_Resume.pdf";

            _logger.LogInformation("Generated PDF document for resume {ResumeId}", id);

            return File(
                documentBytes,
                "application/pdf",
                fileName
            );
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Resume not found for export: {ResumeId}", id);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resume {ResumeId} to PDF", id);
            return StatusCode(500, "An error occurred while generating the PDF document");
        }
    }

    /// <summary>
    /// Export a specific resume version to Word document
    /// </summary>
    [HttpPost("{id}/versions/{versionId}/export/word")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportVersionToWord(Guid id, Guid versionId, [FromBody] ExportOptionsRequest? request = null)
    {
        try
        {
            var options = MapExportOptions(request);
            var resumeData = await _exportService.LoadVersionDataAsync(id, versionId);
            var documentBytes = await _exportService.GenerateWordDocumentAsync(resumeData, options);

            var fileName = $"{SanitizeFileName(resumeData.DisplayName)}_Resume_v{versionId:N}.docx";

            _logger.LogInformation("Generated Word document for resume {ResumeId} version {VersionId}", id, versionId);

            return File(
                documentBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                fileName
            );
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Resume version not found for export: {ResumeId}/{VersionId}", id, versionId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resume {ResumeId} version {VersionId} to Word", id, versionId);
            return StatusCode(500, "An error occurred while generating the Word document");
        }
    }

    /// <summary>
    /// Export a specific resume version to PDF document
    /// </summary>
    [HttpPost("{id}/versions/{versionId}/export/pdf")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportVersionToPdf(Guid id, Guid versionId, [FromBody] ExportOptionsRequest? request = null)
    {
        try
        {
            var options = MapExportOptions(request);
            var resumeData = await _exportService.LoadVersionDataAsync(id, versionId);
            var documentBytes = await _exportService.GeneratePdfDocumentAsync(resumeData, options);

            var fileName = $"{SanitizeFileName(resumeData.DisplayName)}_Resume_v{versionId:N}.pdf";

            _logger.LogInformation("Generated PDF document for resume {ResumeId} version {VersionId}", id, versionId);

            return File(
                documentBytes,
                "application/pdf",
                fileName
            );
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Resume version not found for export: {ResumeId}/{VersionId}", id, versionId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resume {ResumeId} version {VersionId} to PDF", id, versionId);
            return StatusCode(500, "An error occurred while generating the PDF document");
        }
    }

    /// <summary>
    /// Get available export templates
    /// </summary>
    [HttpGet("export/templates")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public ActionResult<IEnumerable<ExportTemplateInfo>> GetExportTemplates()
    {
        var templates = new List<ExportTemplateInfo>
        {
            new() { Style = "Modern", Name = "Modern", Description = "Clean, professional design with blue accents" },
            new() { Style = "Classic", Name = "Classic", Description = "Traditional black and white format" },
            new() { Style = "Federal", Name = "Federal", Description = "Optimized for government proposals" },
            new() { Style = "Executive", Name = "Executive", Description = "Elegant design for senior positions" },
            new() { Style = "Minimal", Name = "Minimal", Description = "Simple, no-frills layout" }
        };

        return Ok(templates);
    }

    private static ResumeExportOptions MapExportOptions(ExportOptionsRequest? request)
    {
        var options = new ResumeExportOptions();

        if (request == null) return options;

        if (!string.IsNullOrWhiteSpace(request.TemplateStyle) &&
            Enum.TryParse<ResumeTemplateStyle>(request.TemplateStyle, true, out var style))
        {
            options.TemplateStyle = style;
        }

        if (request.IncludePhoto.HasValue)
            options.IncludePhoto = request.IncludePhoto.Value;

        if (request.IncludeContactInfo.HasValue)
            options.IncludeContactInfo = request.IncludeContactInfo.Value;

        if (request.IncludeLinkedIn.HasValue)
            options.IncludeLinkedIn = request.IncludeLinkedIn.Value;

        if (request.ShowSkillProficiency.HasValue)
            options.ShowSkillProficiency = request.ShowSkillProficiency.Value;

        if (request.IncludeSummary.HasValue)
            options.IncludeSummary = request.IncludeSummary.Value;

        if (request.IncludeExperience.HasValue)
            options.IncludeExperience = request.IncludeExperience.Value;

        if (request.IncludeEducation.HasValue)
            options.IncludeEducation = request.IncludeEducation.Value;

        if (request.IncludeSkills.HasValue)
            options.IncludeSkills = request.IncludeSkills.Value;

        if (request.IncludeCertifications.HasValue)
            options.IncludeCertifications = request.IncludeCertifications.Value;

        if (request.IncludeProjects.HasValue)
            options.IncludeProjects = request.IncludeProjects.Value;

        if (request.IncludeAwards.HasValue)
            options.IncludeAwards = request.IncludeAwards.Value;

        if (request.IncludePublications.HasValue)
            options.IncludePublications = request.IncludePublications.Value;

        return options;
    }

    private static string SanitizeFileName(string name)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Where(c => !invalidChars.Contains(c)).ToArray());
        return string.IsNullOrWhiteSpace(sanitized) ? "Resume" : sanitized.Replace(" ", "_");
    }
}

// DTOs
public class ExportOptionsRequest
{
    public string? TemplateStyle { get; set; }
    public bool? IncludePhoto { get; set; }
    public bool? IncludeContactInfo { get; set; }
    public bool? IncludeLinkedIn { get; set; }
    public bool? ShowSkillProficiency { get; set; }
    public bool? IncludeSummary { get; set; }
    public bool? IncludeExperience { get; set; }
    public bool? IncludeEducation { get; set; }
    public bool? IncludeSkills { get; set; }
    public bool? IncludeCertifications { get; set; }
    public bool? IncludeProjects { get; set; }
    public bool? IncludeAwards { get; set; }
    public bool? IncludePublications { get; set; }
}

public class ExportTemplateInfo
{
    public string Style { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

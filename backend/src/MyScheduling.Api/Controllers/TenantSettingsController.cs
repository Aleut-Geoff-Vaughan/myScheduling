using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantSettingsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<TenantSettingsController> _logger;

    public TenantSettingsController(MySchedulingDbContext context, ILogger<TenantSettingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/tenantsettings
    [HttpGet]
    [RequiresPermission(Resource = "TenantSettings", Action = PermissionAction.Read)]
    public async Task<ActionResult<TenantSettings>> GetTenantSettings()
    {
        try
        {
            var tenantId = GetUserTenantIds().FirstOrDefault();
            if (tenantId == Guid.Empty)
            {
                return BadRequest("User must be associated with a tenant");
            }

            var settings = await _context.TenantSettings
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            // If no settings exist, create default settings
            if (settings == null)
            {
                settings = new TenantSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.TenantSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant settings");
            return StatusCode(500, "An error occurred while retrieving tenant settings");
        }
    }

    // PUT: api/tenantsettings
    [HttpPut]
    [RequiresPermission(Resource = "TenantSettings", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateTenantSettings(UpdateTenantSettingsRequest request)
    {
        try
        {
            var tenantId = GetUserTenantIds().FirstOrDefault();
            if (tenantId == Guid.Empty)
            {
                return BadRequest("User must be associated with a tenant");
            }

            var settings = await _context.TenantSettings
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            // If no settings exist, create them
            if (settings == null)
            {
                settings = new TenantSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TenantSettings.Add(settings);
            }

            // Update logo settings
            if (request.LogoUrl != null) settings.LogoUrl = request.LogoUrl;
            if (request.LogoFileName != null) settings.LogoFileName = request.LogoFileName;
            if (request.LogoWidth.HasValue) settings.LogoWidth = request.LogoWidth;
            if (request.LogoHeight.HasValue) settings.LogoHeight = request.LogoHeight;

            // Update DOA print template settings
            if (request.DOAPrintHeaderContent != null) settings.DOAPrintHeaderContent = request.DOAPrintHeaderContent;
            if (request.DOAPrintFooterContent != null) settings.DOAPrintFooterContent = request.DOAPrintFooterContent;
            if (request.DOAPrintLetterhead != null) settings.DOAPrintLetterhead = request.DOAPrintLetterhead;

            // Update company info
            if (request.CompanyName != null) settings.CompanyName = request.CompanyName;
            if (request.CompanyAddress != null) settings.CompanyAddress = request.CompanyAddress;
            if (request.CompanyPhone != null) settings.CompanyPhone = request.CompanyPhone;
            if (request.CompanyEmail != null) settings.CompanyEmail = request.CompanyEmail;
            if (request.CompanyWebsite != null) settings.CompanyWebsite = request.CompanyWebsite;

            // Update styling
            if (request.PrimaryColor != null) settings.PrimaryColor = request.PrimaryColor;
            if (request.SecondaryColor != null) settings.SecondaryColor = request.SecondaryColor;
            if (request.FontFamily != null) settings.FontFamily = request.FontFamily;
            if (request.FontSize.HasValue) settings.FontSize = request.FontSize;

            // Update environment and notification banner settings
            if (request.EnvironmentName != null) settings.EnvironmentName = request.EnvironmentName;
            if (request.ShowEnvironmentBanner.HasValue) settings.ShowEnvironmentBanner = request.ShowEnvironmentBanner.Value;
            if (request.NotificationBannerEnabled.HasValue) settings.NotificationBannerEnabled = request.NotificationBannerEnabled.Value;
            if (request.NotificationBannerMessage != null) settings.NotificationBannerMessage = request.NotificationBannerMessage;
            if (request.NotificationBannerType != null) settings.NotificationBannerType = request.NotificationBannerType;
            if (request.NotificationBannerExpiresAt.HasValue) settings.NotificationBannerExpiresAt = request.NotificationBannerExpiresAt;

            // Update fiscal year and budget settings
            if (request.FiscalYearStartMonth.HasValue) settings.FiscalYearStartMonth = request.FiscalYearStartMonth.Value;
            if (request.RequireBudgetApproval.HasValue) settings.RequireBudgetApproval = request.RequireBudgetApproval.Value;
            if (request.DefaultBudgetMonthsAhead.HasValue) settings.DefaultBudgetMonthsAhead = request.DefaultBudgetMonthsAhead.Value;

            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant settings");
            return StatusCode(500, "An error occurred while updating tenant settings");
        }
    }

    // POST: api/tenantsettings/upload-logo
    [HttpPost("upload-logo")]
    [RequiresPermission(Resource = "TenantSettings", Action = PermissionAction.Update)]
    public async Task<ActionResult<string>> UploadLogo(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded");
            }

            // Validate file type
            var allowedTypes = new[] { "image/png", "image/jpeg", "image/jpg", "image/svg+xml" };
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
            {
                return BadRequest("Only PNG, JPEG, and SVG files are allowed");
            }

            // Validate file size (max 2MB)
            if (file.Length > 2 * 1024 * 1024)
            {
                return BadRequest("File size must be less than 2MB");
            }

            var tenantId = GetUserTenantIds().FirstOrDefault();
            if (tenantId == Guid.Empty)
            {
                return BadRequest("User must be associated with a tenant");
            }

            // Generate unique filename
            var extension = Path.GetExtension(file.FileName);
            var fileName = $"logo_{tenantId}_{Guid.NewGuid()}{extension}";
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "logos");
            Directory.CreateDirectory(uploadsFolder);
            var filePath = Path.Combine(uploadsFolder, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Generate URL
            var logoUrl = $"/uploads/logos/{fileName}";

            // Update tenant settings
            var settings = await _context.TenantSettings
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            if (settings == null)
            {
                settings = new TenantSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TenantSettings.Add(settings);
            }

            settings.LogoUrl = logoUrl;
            settings.LogoFileName = fileName;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { logoUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading logo");
            return StatusCode(500, "An error occurred while uploading the logo");
        }
    }
}

// Request DTOs
public class UpdateTenantSettingsRequest
{
    // Logo settings
    public string? LogoUrl { get; set; }
    public string? LogoFileName { get; set; }
    public int? LogoWidth { get; set; }
    public int? LogoHeight { get; set; }

    // DOA Print Template settings
    public string? DOAPrintHeaderContent { get; set; }
    public string? DOAPrintFooterContent { get; set; }
    public string? DOAPrintLetterhead { get; set; }

    // Company info
    public string? CompanyName { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyWebsite { get; set; }

    // Styling
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string? FontFamily { get; set; }
    public int? FontSize { get; set; }

    // Environment and Notification Banner settings
    public string? EnvironmentName { get; set; }
    public bool? ShowEnvironmentBanner { get; set; }
    public bool? NotificationBannerEnabled { get; set; }
    public string? NotificationBannerMessage { get; set; }
    public string? NotificationBannerType { get; set; }
    public DateTime? NotificationBannerExpiresAt { get; set; }

    // Fiscal Year and Budget settings
    public int? FiscalYearStartMonth { get; set; }
    public bool? RequireBudgetApproval { get; set; }
    public int? DefaultBudgetMonthsAhead { get; set; }
}

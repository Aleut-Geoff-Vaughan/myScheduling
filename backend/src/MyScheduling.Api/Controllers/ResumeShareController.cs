using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;
using System.Security.Cryptography;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/resumes")]
public class ResumeShareController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ResumeShareController> _logger;

    public ResumeShareController(
        MySchedulingDbContext context,
        ILogger<ResumeShareController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all share links for a resume
    /// </summary>
    [HttpGet("{id}/shares")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ShareLinkResponse>>> GetShareLinks(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles.FindAsync(id);
            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var links = await _context.ResumeShareLinks
                .Where(l => l.ResumeProfileId == id && l.IsActive)
                .Include(l => l.CreatedBy)
                .Include(l => l.ResumeVersion)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new ShareLinkResponse
                {
                    Id = l.Id,
                    ShareToken = l.ShareToken,
                    ExpiresAt = l.ExpiresAt,
                    HasPassword = !string.IsNullOrEmpty(l.PasswordHash),
                    HideContactInfo = l.HideContactInfo,
                    VisibleSections = l.VisibleSections,
                    ViewCount = l.ViewCount,
                    CreatedAt = l.CreatedAt,
                    CreatedByName = l.CreatedBy.DisplayName,
                    VersionName = l.ResumeVersion != null ? l.ResumeVersion.VersionName : "Current"
                })
                .ToListAsync();

            return Ok(links);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting share links for resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while retrieving share links");
        }
    }

    /// <summary>
    /// Create a new share link for a resume
    /// </summary>
    [HttpPost("{id}/share")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Update)]
    public async Task<ActionResult<ShareLinkResponse>> CreateShareLink(Guid id, [FromBody] CreateShareLinkRequest request)
    {
        try
        {
            var resume = await _context.ResumeProfiles.FindAsync(id);
            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            // Generate unique token
            var shareToken = GenerateShareToken();

            // Create share link
            var shareLink = new ResumeShareLink
            {
                ResumeProfileId = id,
                ResumeVersionId = request.VersionId,
                ShareToken = shareToken,
                ExpiresAt = request.ExpiresAt,
                PasswordHash = !string.IsNullOrWhiteSpace(request.Password)
                    ? BCrypt.Net.BCrypt.HashPassword(request.Password)
                    : null,
                VisibleSections = request.VisibleSections,
                HideContactInfo = request.HideContactInfo ?? false,
                IsActive = true,
                CreatedByUserId = GetCurrentUserId()
            };

            _context.ResumeShareLinks.Add(shareLink);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created share link {ShareToken} for resume {ResumeId}", shareToken, id);

            return CreatedAtAction(nameof(GetShareLinks), new { id }, new ShareLinkResponse
            {
                Id = shareLink.Id,
                ShareToken = shareLink.ShareToken,
                ExpiresAt = shareLink.ExpiresAt,
                HasPassword = !string.IsNullOrEmpty(shareLink.PasswordHash),
                HideContactInfo = shareLink.HideContactInfo,
                VisibleSections = shareLink.VisibleSections,
                ViewCount = 0,
                CreatedAt = shareLink.CreatedAt,
                CreatedByName = "You",
                VersionName = "Current"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating share link for resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while creating the share link");
        }
    }

    /// <summary>
    /// Delete/revoke a share link
    /// </summary>
    [HttpDelete("share/{linkId}")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Update)]
    public async Task<IActionResult> DeleteShareLink(Guid linkId)
    {
        try
        {
            var link = await _context.ResumeShareLinks.FindAsync(linkId);
            if (link == null)
            {
                return NotFound($"Share link with ID {linkId} not found");
            }

            // Soft delete by deactivating
            link.IsActive = false;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Revoked share link {LinkId}", linkId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking share link {LinkId}", linkId);
            return StatusCode(500, "An error occurred while revoking the share link");
        }
    }

    /// <summary>
    /// Get shared resume by token (public endpoint - no auth required)
    /// </summary>
    [HttpGet("share/{token}")]
    [AllowAnonymous]
    public async Task<ActionResult<SharedResumeResponse>> GetSharedResume(string token, [FromQuery] string? password = null)
    {
        try
        {
            var link = await _context.ResumeShareLinks
                .Include(l => l.ResumeProfile)
                    .ThenInclude(r => r.User)
                .Include(l => l.ResumeProfile)
                    .ThenInclude(r => r.Sections.OrderBy(s => s.DisplayOrder))
                        .ThenInclude(s => s.Entries.OrderByDescending(e => e.StartDate))
                .FirstOrDefaultAsync(l => l.ShareToken == token && l.IsActive);

            if (link == null)
            {
                return NotFound("Share link not found or has been revoked");
            }

            // Check expiration
            if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            {
                return BadRequest("This share link has expired");
            }

            // Check password
            if (!string.IsNullOrEmpty(link.PasswordHash))
            {
                if (string.IsNullOrWhiteSpace(password))
                {
                    return Unauthorized(new { requiresPassword = true, message = "Password required to view this resume" });
                }

                if (!BCrypt.Net.BCrypt.Verify(password, link.PasswordHash))
                {
                    return Unauthorized(new { requiresPassword = true, message = "Incorrect password" });
                }
            }

            // Increment view count
            link.ViewCount++;
            await _context.SaveChangesAsync();

            // Load additional data
            var resume = link.ResumeProfile;
            var userSkills = await _context.PersonSkills
                .Include(ps => ps.Skill)
                .Where(ps => ps.UserId == resume.UserId)
                .ToListAsync();

            var userCertifications = await _context.PersonCertifications
                .Include(pc => pc.Certification)
                .Where(pc => pc.UserId == resume.UserId)
                .ToListAsync();

            // Parse visible sections
            var visibleSections = string.IsNullOrEmpty(link.VisibleSections)
                ? null
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(link.VisibleSections);

            // Build response
            var response = new SharedResumeResponse
            {
                DisplayName = resume.User.DisplayName,
                JobTitle = resume.User.JobTitle,
                Email = link.HideContactInfo ? null : resume.User.Email,
                Phone = link.HideContactInfo ? null : resume.User.PhoneNumber,
                LinkedInUrl = resume.LinkedInProfileUrl,
                Sections = resume.Sections
                    .Where(s => visibleSections == null || visibleSections.Contains(s.Type.ToString()))
                    .Select(s => new SharedSectionResponse
                    {
                        Type = s.Type.ToString(),
                        Entries = s.Entries.Select(e => new SharedEntryResponse
                        {
                            Title = e.Title,
                            Organization = e.Organization,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Description = e.Description
                        }).ToList()
                    }).ToList(),
                Skills = (visibleSections == null || visibleSections.Contains("Skills"))
                    ? userSkills.Select(s => new SharedSkillResponse
                    {
                        Name = s.Skill.Name,
                        Category = s.Skill.Category.ToString(),
                        ProficiencyLevel = (int)s.ProficiencyLevel
                    }).ToList()
                    : new(),
                Certifications = (visibleSections == null || visibleSections.Contains("Certifications"))
                    ? userCertifications.Select(c => new SharedCertificationResponse
                    {
                        Name = c.Certification.Name,
                        Issuer = c.Certification.Issuer,
                        IssueDate = c.IssueDate,
                        ExpiryDate = c.ExpiryDate
                    }).ToList()
                    : new()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shared resume by token {Token}", token);
            return StatusCode(500, "An error occurred while retrieving the shared resume");
        }
    }

    /// <summary>
    /// Check if a share link is valid (public endpoint - no auth required)
    /// </summary>
    [HttpGet("share/{token}/check")]
    [AllowAnonymous]
    public async Task<ActionResult<ShareLinkCheckResponse>> CheckShareLink(string token)
    {
        try
        {
            var link = await _context.ResumeShareLinks
                .FirstOrDefaultAsync(l => l.ShareToken == token && l.IsActive);

            if (link == null)
            {
                return NotFound(new ShareLinkCheckResponse { IsValid = false, Message = "Share link not found" });
            }

            var isExpired = link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow;

            return Ok(new ShareLinkCheckResponse
            {
                IsValid = !isExpired,
                RequiresPassword = !string.IsNullOrEmpty(link.PasswordHash),
                IsExpired = isExpired,
                Message = isExpired ? "This share link has expired" : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking share link {Token}", token);
            return StatusCode(500, "An error occurred while checking the share link");
        }
    }

    private static string GenerateShareToken()
    {
        var bytes = new byte[12];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }
}

// DTOs
public class CreateShareLinkRequest
{
    public Guid? VersionId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Password { get; set; }
    public string? VisibleSections { get; set; }  // JSON array of section types
    public bool? HideContactInfo { get; set; }
}

public class ShareLinkResponse
{
    public Guid Id { get; set; }
    public string ShareToken { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public bool HasPassword { get; set; }
    public bool HideContactInfo { get; set; }
    public string? VisibleSections { get; set; }
    public int ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string VersionName { get; set; } = string.Empty;
}

public class ShareLinkCheckResponse
{
    public bool IsValid { get; set; }
    public bool RequiresPassword { get; set; }
    public bool IsExpired { get; set; }
    public string? Message { get; set; }
}

public class SharedResumeResponse
{
    public string DisplayName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? LinkedInUrl { get; set; }
    public List<SharedSectionResponse> Sections { get; set; } = new();
    public List<SharedSkillResponse> Skills { get; set; } = new();
    public List<SharedCertificationResponse> Certifications { get; set; } = new();
}

public class SharedSectionResponse
{
    public string Type { get; set; } = string.Empty;
    public List<SharedEntryResponse> Entries { get; set; } = new();
}

public class SharedEntryResponse
{
    public string Title { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
}

public class SharedSkillResponse
{
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int ProficiencyLevel { get; set; }
}

public class SharedCertificationResponse
{
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

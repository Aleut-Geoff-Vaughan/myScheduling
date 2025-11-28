using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResumesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ResumesController> _logger;
    private readonly IAuthorizationService _authService;

    public ResumesController(
        MySchedulingDbContext context,
        ILogger<ResumesController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    // GET: api/resumes
    [HttpGet]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeProfile>>> GetResumes(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] ResumeStatus? status = null,
        [FromQuery] string? search = null)
    {
        try
        {
            // Optimize: Don't load Sections and Entries collections in list view - causes massive data payloads
            // These nested collections should be loaded on-demand for detail view only
            var query = _context.ResumeProfiles
                .Include(r => r.User)
                .AsNoTracking()
                .AsQueryable();

            // Filter by tenant
            if (tenantId.HasValue)
            {
                query = query.Where(r => _context.TenantMemberships.Any(tm => tm.UserId == r.UserId && tm.TenantId == tenantId.Value && tm.IsActive));
            }

            // Filter by status
            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            // Search (optimized - only search User fields to avoid loading heavy collections)
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(r =>
                    r.User.DisplayName.Contains(search) ||
                    (r.User.JobTitle != null && r.User.JobTitle.Contains(search)) ||
                    r.User.Email.Contains(search));
            }

            var resumes = await query
                .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
                .ToListAsync();

            return Ok(resumes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving resumes");
            return StatusCode(500, "An error occurred while retrieving resumes");
        }
    }

    // GET: api/resumes/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeProfile>> GetResume(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .Include(r => r.User)
                .Include(r => r.Sections.OrderBy(s => s.DisplayOrder))
                    .ThenInclude(s => s.Entries.OrderByDescending(e => e.StartDate))
                .Include(r => r.Versions.OrderByDescending(v => v.VersionNumber))
                .Include(r => r.Documents.OrderByDescending(d => d.GeneratedAt))
                .Include(r => r.Approvals.OrderByDescending(a => a.RequestedAt))
                .Include(r => r.CurrentVersion)
                .Include(r => r.LastReviewedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            return Ok(resume);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while retrieving the resume");
        }
    }

    // POST: api/resumes
    [HttpPost]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeProfile>> CreateResume([FromBody] CreateResumeRequest request)
    {
        try
        {
            if (request.UserId == Guid.Empty)
            {
                return BadRequest("UserId is required");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
            if (user == null)
            {
                return BadRequest($"User with ID {request.UserId} not found");
            }

            // Check if resume already exists for this user/person
            var existingResume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.UserId == request.UserId);

            if (existingResume != null)
            {
                return Conflict("Resume already exists for this profile");
            }

            // Create resume
            var resume = new ResumeProfile
            {
                UserId = request.UserId,
                Status = ResumeStatus.Draft,
                IsPublic = false,
                TemplateConfig = request.TemplateConfig
            };

            _context.ResumeProfiles.Add(resume);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created resume {ResumeId} for user {UserId}", resume.Id, request.UserId);

            return CreatedAtAction(nameof(GetResume), new { id = resume.Id }, resume);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating resume for user {UserId}", request.UserId);
            return StatusCode(500, "An error occurred while creating the resume");
        }
    }

    // PUT: api/resumes/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateResume(Guid id, [FromBody] UpdateResumeRequest request)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            // Update fields
            if (request.Status.HasValue)
                resume.Status = request.Status.Value;

            if (request.IsPublic.HasValue)
                resume.IsPublic = request.IsPublic.Value;

            if (request.TemplateConfig != null)
                resume.TemplateConfig = request.TemplateConfig;

            if (request.LinkedInProfileUrl != null)
                resume.LinkedInProfileUrl = request.LinkedInProfileUrl;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated resume {ResumeId}", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while updating the resume");
        }
    }

    // DELETE: api/resumes/{id} (Soft Delete)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteResume(Guid id, [FromQuery] string? reason = null)
    {
        try
        {
            var resume = await _context.ResumeProfiles.FindAsync(id);
            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            resume.IsDeleted = true;
            resume.DeletedAt = DateTime.UtcNow;
            resume.DeletedByUserId = GetCurrentUserId();
            resume.DeletionReason = reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Resume {ResumeId} soft-deleted by user {UserId}", id, resume.DeletedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft-deleting resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while deleting the resume");
        }
    }

    // DELETE: api/resumes/{id}/hard (Hard Delete - Platform Admin Only)
    [HttpDelete("{id}/hard")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> HardDeleteResume(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var membership = await _context.TenantMemberships
                .FirstOrDefaultAsync(tm => tm.UserId == resume.UserId && tm.IsActive);

            var archive = new DataArchive
            {
                Id = Guid.NewGuid(),
                TenantId = membership?.TenantId ?? Guid.Empty,
                EntityType = "ResumeProfile",
                EntityId = resume.Id,
                EntitySnapshot = System.Text.Json.JsonSerializer.Serialize(resume),
                ArchivedAt = DateTime.UtcNow,
                ArchivedByUserId = GetCurrentUserId(),
                Status = DataArchiveStatus.PermanentlyDeleted,
                PermanentlyDeletedAt = DateTime.UtcNow,
                PermanentlyDeletedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow
            };

            _context.DataArchives.Add(archive);
            _context.ResumeProfiles.Remove(resume);
            await _context.SaveChangesAsync();

            _logger.LogWarning("Resume {ResumeId} HARD DELETED by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard-deleting resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while permanently deleting the resume");
        }
    }

    // POST: api/resumes/{id}/restore (Restore Soft-Deleted)
    [HttpPost("{id}/restore")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Restore)]
    public async Task<IActionResult> RestoreResume(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == id && r.IsDeleted);

            if (resume == null)
            {
                return NotFound($"Soft-deleted resume with ID {id} not found");
            }

            resume.IsDeleted = false;
            resume.DeletedAt = null;
            resume.DeletedByUserId = null;
            resume.DeletionReason = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Resume {ResumeId} restored by user {UserId}", id, GetCurrentUserId());

            return Ok(resume);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while restoring the resume");
        }
    }

    // POST: api/resumes/{id}/sections
    [HttpPost("{id}/sections")]
    [RequiresPermission(Resource = "ResumeSection", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeSection>> AddSection(Guid id, [FromBody] CreateResumeSectionRequest request)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var section = new ResumeSection
            {
                ResumeProfileId = resume.Id,
                UserId = resume.UserId,
                Type = request.Type,
                DisplayOrder = request.DisplayOrder
            };

            _context.ResumeSections.Add(section);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Added section {SectionId} to resume {ResumeId}", section.Id, id);

            return CreatedAtAction(nameof(GetResume), new { id }, section);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding section to resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while adding the section");
        }
    }

    // POST: api/resumes/sections/{sectionId}/entries
    [HttpPost("sections/{sectionId}/entries")]
    [RequiresPermission(Resource = "ResumeEntry", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeEntry>> AddEntry(Guid sectionId, [FromBody] CreateResumeEntryRequest request)
    {
        try
        {
            var section = await _context.ResumeSections
                .FirstOrDefaultAsync(s => s.Id == sectionId);

            if (section == null)
            {
                return NotFound($"Section with ID {sectionId} not found");
            }

            var entry = new ResumeEntry
            {
                ResumeSectionId = sectionId,
                Title = request.Title,
                Organization = request.Organization,
                StartDate = ToUtc(request.StartDate),
                EndDate = ToUtc(request.EndDate),
                Description = request.Description,
                AdditionalFields = request.AdditionalFields
            };

            _context.ResumeEntries.Add(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Added entry {EntryId} to section {SectionId}", entry.Id, sectionId);

            return CreatedAtAction(nameof(GetResume), new { id = section.ResumeProfileId }, entry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding entry to section {SectionId}", sectionId);
            return StatusCode(500, "An error occurred while adding the entry");
        }
    }

    // PUT: api/resumes/entries/{entryId}
    [HttpPut("entries/{entryId}")]
    [RequiresPermission(Resource = "ResumeEntry", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateEntry(Guid entryId, [FromBody] UpdateResumeEntryRequest request)
    {
        try
        {
            var entry = await _context.ResumeEntries
                .FirstOrDefaultAsync(e => e.Id == entryId);

            if (entry == null)
            {
                return NotFound($"Entry with ID {entryId} not found");
            }

            // Update fields
            if (request.Title != null)
                entry.Title = request.Title;

            if (request.Organization != null)
                entry.Organization = request.Organization;

            if (request.StartDate.HasValue)
                entry.StartDate = ToUtc(request.StartDate);

            if (request.EndDate.HasValue)
                entry.EndDate = ToUtc(request.EndDate);

            if (request.Description != null)
                entry.Description = request.Description;

            if (request.AdditionalFields != null)
                entry.AdditionalFields = request.AdditionalFields;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated entry {EntryId}", entryId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating entry {EntryId}", entryId);
            return StatusCode(500, "An error occurred while updating the entry");
        }
    }

    // DELETE: api/resumes/entries/{entryId}
    [HttpDelete("entries/{entryId}")]
    [RequiresPermission(Resource = "ResumeEntry", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteEntry(Guid entryId)
    {
        try
        {
            var entry = await _context.ResumeEntries
                .FirstOrDefaultAsync(e => e.Id == entryId);

            if (entry == null)
            {
                return NotFound($"Entry with ID {entryId} not found");
            }

            _context.ResumeEntries.Remove(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted entry {EntryId}", entryId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting entry {EntryId}", entryId);
            return StatusCode(500, "An error occurred while deleting the entry");
        }
    }

    // ==================== VERSION MANAGEMENT ====================

    // GET: api/resumes/{id}/versions
    [HttpGet("{id}/versions")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeVersion>>> GetVersions(Guid id)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var versions = await _context.ResumeVersions
                .Where(v => v.ResumeProfileId == id)
                .Include(v => v.CreatedBy)
                .OrderByDescending(v => v.VersionNumber)
                .ToListAsync();

            return Ok(versions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving versions for resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while retrieving versions");
        }
    }

    // GET: api/resumes/{id}/versions/{versionId}
    [HttpGet("{id}/versions/{versionId}")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeVersion>> GetVersion(Guid id, Guid versionId)
    {
        try
        {
            var version = await _context.ResumeVersions
                .Include(v => v.CreatedBy)
                .Include(v => v.GeneratedDocuments)
                .FirstOrDefaultAsync(v => v.Id == versionId && v.ResumeProfileId == id);

            if (version == null)
            {
                return NotFound($"Version with ID {versionId} not found for resume {id}");
            }

            return Ok(version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving version {VersionId} for resume {ResumeId}", versionId, id);
            return StatusCode(500, "An error occurred while retrieving the version");
        }
    }

    // POST: api/resumes/{id}/versions
    [HttpPost("{id}/versions")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeVersion>> CreateVersion(Guid id, [FromBody] CreateResumeVersionRequest request)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .Include(r => r.User)
                .Include(r => r.Sections)
                    .ThenInclude(s => s.Entries)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var userSkills = await _context.PersonSkills
                .Include(ps => ps.Skill)
                .Where(ps => ps.UserId == resume.UserId)
                .ToListAsync();

            var userCertifications = await _context.PersonCertifications
                .Include(pc => pc.Certification)
                .Where(pc => pc.UserId == resume.UserId)
                .ToListAsync();

            // Get next version number
            var maxVersionNumber = await _context.ResumeVersions
                .Where(v => v.ResumeProfileId == id)
                .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

            // Create snapshot of current resume data
            var contentSnapshot = System.Text.Json.JsonSerializer.Serialize(new
            {
                resume.User.DisplayName,
                resume.User.JobTitle,
                resume.User.Email,
                Sections = resume.Sections.Select(s => new
                {
                    s.Type,
                    s.DisplayOrder,
                    Entries = s.Entries.Select(e => new
                    {
                        e.Title,
                        e.Organization,
                        e.StartDate,
                        e.EndDate,
                        e.Description,
                        e.AdditionalFields
                    })
                }),
                Skills = userSkills.Select(ps => new
                {
                    ps.Skill.Name,
                    ps.ProficiencyLevel,
                    ps.LastUsedDate
                }),
                Certifications = userCertifications.Select(pc => new
                {
                    pc.Certification.Name,
                    pc.Certification.Issuer,
                    pc.IssueDate,
                    pc.ExpiryDate,
                    pc.CredentialId
                })
            });

            var version = new ResumeVersion
            {
                ResumeProfileId = id,
                VersionNumber = maxVersionNumber + 1,
                VersionName = request.VersionName,
                Description = request.Description,
                ContentSnapshot = contentSnapshot,
                CreatedByUserId = request.CreatedByUserId,
                IsActive = true
            };

            _context.ResumeVersions.Add(version);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created version {VersionNumber} for resume {ResumeId}", version.VersionNumber, id);

            return CreatedAtAction(nameof(GetVersion), new { id = id, versionId = version.Id }, version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating version for resume {ResumeId}", id);
            return StatusCode(500, "An error occurred while creating the version");
        }
    }

    // POST: api/resumes/{id}/versions/{versionId}/activate
    [HttpPost("{id}/versions/{versionId}/activate")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Update)]
    public async Task<ActionResult> ActivateVersion(Guid id, Guid versionId)
    {
        try
        {
            var resume = await _context.ResumeProfiles
                .FirstOrDefaultAsync(r => r.Id == id);

            if (resume == null)
            {
                return NotFound($"Resume with ID {id} not found");
            }

            var version = await _context.ResumeVersions
                .FirstOrDefaultAsync(v => v.Id == versionId && v.ResumeProfileId == id);

            if (version == null)
            {
                return NotFound($"Version with ID {versionId} not found for resume {id}");
            }

            // Deactivate all other versions
            var otherVersions = await _context.ResumeVersions
                .Where(v => v.ResumeProfileId == id && v.Id != versionId)
                .ToListAsync();

            foreach (var v in otherVersions)
            {
                v.IsActive = false;
            }

            // Activate the selected version
            version.IsActive = true;
            resume.CurrentVersionId = versionId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Activated version {VersionId} for resume {ResumeId}", versionId, id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating version {VersionId} for resume {ResumeId}", versionId, id);
            return StatusCode(500, "An error occurred while activating the version");
        }
    }

    // DELETE: api/resumes/{id}/versions/{versionId}
    [HttpDelete("{id}/versions/{versionId}")]
    [RequiresPermission(Resource = "ResumeVersion", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteVersion(Guid id, Guid versionId)
    {
        try
        {
            var version = await _context.ResumeVersions
                .FirstOrDefaultAsync(v => v.Id == versionId && v.ResumeProfileId == id);

            if (version == null)
            {
                return NotFound($"Version with ID {versionId} not found for resume {id}");
            }

            // Don't allow deletion of active version
            if (version.IsActive)
            {
                return BadRequest("Cannot delete the currently active version");
            }

            _context.ResumeVersions.Remove(version);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted version {VersionId} for resume {ResumeId}", versionId, id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting version {VersionId} for resume {ResumeId}", versionId, id);
            return StatusCode(500, "An error occurred while deleting the version");
        }
    }

    // ==================== ADMIN ENDPOINTS ====================

    // GET: api/resumes/admin/stats
    [HttpGet("admin/stats")]
    [RequiresPermission(Resource = "ResumeProfile", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeAdminStats>> GetAdminStats()
    {
        try
        {
            var totalResumes = await _context.ResumeProfiles.CountAsync();

            var byStatus = await _context.ResumeProfiles
                .GroupBy(r => r.Status)
                .Select(g => new StatusCount { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var pendingApprovals = await _context.ResumeApprovals
                .Where(a => a.Status == ApprovalStatus.Pending)
                .CountAsync();

            var recentResumes = await _context.ResumeProfiles
                .Include(r => r.User)
                .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
                .Take(5)
                .Select(r => new ResumeListItem
                {
                    Id = r.Id,
                    UserName = r.User.DisplayName,
                    Status = r.Status,
                    UpdatedAt = r.UpdatedAt ?? r.CreatedAt
                })
                .ToListAsync();

            return Ok(new ResumeAdminStats
            {
                TotalResumes = totalResumes,
                ResumesByStatus = byStatus,
                PendingApprovals = pendingApprovals,
                RecentResumes = recentResumes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting admin stats");
            return StatusCode(500, "An error occurred while getting admin stats");
        }
    }

    // GET: api/resumes/admin/pending-approvals
    [HttpGet("admin/pending-approvals")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeApprovalListItem>>> GetPendingApprovals()
    {
        try
        {
            var approvals = await _context.ResumeApprovals
                .Where(a => a.Status == ApprovalStatus.Pending)
                .Include(a => a.ResumeProfile)
                    .ThenInclude(r => r.User)
                .Include(a => a.RequestedBy)
                .OrderBy(a => a.RequestedAt)
                .Select(a => new ResumeApprovalListItem
                {
                    Id = a.Id,
                    ResumeProfileId = a.ResumeProfileId,
                    UserName = a.ResumeProfile.User.DisplayName,
                    UserEmail = a.ResumeProfile.User.Email,
                    RequestedAt = a.RequestedAt,
                    RequestedByName = a.RequestedBy != null ? a.RequestedBy.DisplayName : "Unknown",
                    RequestNotes = a.RequestNotes,
                    ResumeStatus = a.ResumeProfile.Status
                })
                .ToListAsync();

            return Ok(approvals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending approvals");
            return StatusCode(500, "An error occurred while getting pending approvals");
        }
    }

    // POST: api/resumes/admin/approve/{approvalId}
    [HttpPost("admin/approve/{approvalId}")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult> ApproveResume(Guid approvalId, [FromBody] ReviewResumeRequest request)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == approvalId);

            if (approval == null)
            {
                return NotFound($"Approval with ID {approvalId} not found");
            }

            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest("Approval has already been processed");
            }

            approval.Status = ApprovalStatus.Approved;
            approval.ReviewedByUserId = request.ReviewedByUserId;
            approval.ReviewedAt = DateTime.UtcNow;
            approval.ReviewNotes = request.ReviewNotes;

            approval.ResumeProfile.Status = ResumeStatus.Approved;
            approval.ResumeProfile.LastReviewedAt = DateTime.UtcNow;
            approval.ResumeProfile.LastReviewedByUserId = request.ReviewedByUserId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Approved resume approval {ApprovalId}", approvalId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving resume {ApprovalId}", approvalId);
            return StatusCode(500, "An error occurred while approving the resume");
        }
    }

    // POST: api/resumes/admin/reject/{approvalId}
    [HttpPost("admin/reject/{approvalId}")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult> RejectResume(Guid approvalId, [FromBody] ReviewResumeRequest request)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == approvalId);

            if (approval == null)
            {
                return NotFound($"Approval with ID {approvalId} not found");
            }

            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest("Approval has already been processed");
            }

            approval.Status = ApprovalStatus.Rejected;
            approval.ReviewedByUserId = request.ReviewedByUserId;
            approval.ReviewedAt = DateTime.UtcNow;
            approval.ReviewNotes = request.ReviewNotes;

            approval.ResumeProfile.Status = ResumeStatus.ChangesRequested;
            approval.ResumeProfile.LastReviewedAt = DateTime.UtcNow;
            approval.ResumeProfile.LastReviewedByUserId = request.ReviewedByUserId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Rejected resume approval {ApprovalId}", approvalId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting resume {ApprovalId}", approvalId);
            return StatusCode(500, "An error occurred while rejecting the resume");
        }
    }

    // POST: api/resumes/admin/bulk-approve
    [HttpPost("admin/bulk-approve")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult<BulkResumeOperationResult>> BulkApproveResumes([FromBody] BulkResumeApprovalRequest request)
    {
        try
        {
            var approvals = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .Where(a => request.ApprovalIds.Contains(a.Id) && a.Status == ApprovalStatus.Pending)
                .ToListAsync();

            var approved = 0;
            foreach (var approval in approvals)
            {
                approval.Status = ApprovalStatus.Approved;
                approval.ReviewedByUserId = request.ReviewedByUserId;
                approval.ReviewedAt = DateTime.UtcNow;
                approval.ReviewNotes = request.ReviewNotes ?? "Bulk approved";

                approval.ResumeProfile.Status = ResumeStatus.Approved;
                approval.ResumeProfile.LastReviewedAt = DateTime.UtcNow;
                approval.ResumeProfile.LastReviewedByUserId = request.ReviewedByUserId;

                approved++;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Bulk approved {Count} resumes", approved);

            return Ok(new BulkResumeOperationResult { Processed = approved, Total = request.ApprovalIds.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk approving resumes");
            return StatusCode(500, "An error occurred while bulk approving resumes");
        }
    }

    // Helper method to convert DateTime to UTC for PostgreSQL compatibility
    private static DateTime? ToUtc(DateTime? dateTime)
    {
        if (dateTime == null) return null;
        if (dateTime.Value.Kind == DateTimeKind.Utc) return dateTime;
        if (dateTime.Value.Kind == DateTimeKind.Unspecified)
        {
            // Treat unspecified as UTC (dates from HTML date inputs are date-only)
            return DateTime.SpecifyKind(dateTime.Value, DateTimeKind.Utc);
        }
        return dateTime.Value.ToUniversalTime();
    }
}

// DTOs
public class CreateResumeRequest
{
    public Guid UserId { get; set; }
    public string? TemplateConfig { get; set; }
}

public class UpdateResumeRequest
{
    public ResumeStatus? Status { get; set; }
    public bool? IsPublic { get; set; }
    public string? TemplateConfig { get; set; }
    public string? LinkedInProfileUrl { get; set; }
}

public class CreateResumeSectionRequest
{
    public ResumeSectionType Type { get; set; }
    public int DisplayOrder { get; set; }
}

public class CreateResumeEntryRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? AdditionalFields { get; set; }
}

public class UpdateResumeEntryRequest
{
    public string? Title { get; set; }
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? AdditionalFields { get; set; }
}

public class CreateResumeVersionRequest
{
    public string VersionName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByUserId { get; set; }
}

// Admin DTOs
public class ResumeAdminStats
{
    public int TotalResumes { get; set; }
    public List<StatusCount> ResumesByStatus { get; set; } = new();
    public int PendingApprovals { get; set; }
    public List<ResumeListItem> RecentResumes { get; set; } = new();
}

public class StatusCount
{
    public ResumeStatus Status { get; set; }
    public int Count { get; set; }
}

public class ResumeListItem
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public ResumeStatus Status { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ResumeApprovalListItem
{
    public Guid Id { get; set; }
    public Guid ResumeProfileId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public string? RequestNotes { get; set; }
    public ResumeStatus ResumeStatus { get; set; }
}

public class ReviewResumeRequest
{
    public Guid ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
}

public class BulkResumeApprovalRequest
{
    public List<Guid> ApprovalIds { get; set; } = new();
    public Guid ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
}

public class BulkResumeOperationResult
{
    public int Processed { get; set; }
    public int Total { get; set; }
}

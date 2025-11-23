using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/resume-approvals")]
public class ResumeApprovalsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ResumeApprovalsController> _logger;

    public ResumeApprovalsController(MySchedulingDbContext context, ILogger<ResumeApprovalsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/resume-approvals
    [HttpGet]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeApproval>>> GetApprovals(
        [FromQuery] ApprovalStatus? status = null,
        [FromQuery] Guid? reviewerId = null)
    {
        try
        {
            var query = _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                    .ThenInclude(r => r.Person)
                .Include(a => a.ResumeVersion)
                .Include(a => a.RequestedBy)
                .Include(a => a.ReviewedBy)
                .AsQueryable();

            // Filter by status
            if (status.HasValue)
            {
                query = query.Where(a => a.Status == status.Value);
            }

            // Filter by reviewer
            if (reviewerId.HasValue)
            {
                query = query.Where(a => a.ReviewedByUserId == reviewerId.Value);
            }

            var approvals = await query
                .OrderByDescending(a => a.RequestedAt)
                .ToListAsync();

            return Ok(approvals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving approvals");
            return StatusCode(500, "An error occurred while retrieving approvals");
        }
    }

    // GET: api/resume-approvals/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Read)]
    public async Task<ActionResult<ResumeApproval>> GetApproval(Guid id)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                    .ThenInclude(r => r.Person)
                .Include(a => a.ResumeVersion)
                .Include(a => a.RequestedBy)
                .Include(a => a.ReviewedBy)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (approval == null)
            {
                return NotFound($"Approval with ID {id} not found");
            }

            return Ok(approval);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving approval {ApprovalId}", id);
            return StatusCode(500, "An error occurred while retrieving the approval");
        }
    }

    // POST: api/resume-approvals
    [HttpPost]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Create)]
    public async Task<ActionResult<ResumeApproval>> RequestApproval([FromBody] CreateApprovalRequest request)
    {
        try
        {
            // Validate resume exists
            var resume = await _context.ResumeProfiles
                .Include(r => r.Person)
                .FirstOrDefaultAsync(r => r.Id == request.ResumeProfileId);

            if (resume == null)
            {
                return BadRequest($"Resume with ID {request.ResumeProfileId} not found");
            }

            // Check if there's already a pending approval
            var existingPending = await _context.ResumeApprovals
                .FirstOrDefaultAsync(a =>
                    a.ResumeProfileId == request.ResumeProfileId &&
                    a.Status == ApprovalStatus.Pending);

            if (existingPending != null)
            {
                return Conflict("There is already a pending approval request for this resume");
            }

            // Validate version if specified
            if (request.ResumeVersionId.HasValue)
            {
                var versionExists = await _context.ResumeVersions
                    .AnyAsync(v => v.Id == request.ResumeVersionId.Value && v.ResumeProfileId == request.ResumeProfileId);

                if (!versionExists)
                {
                    return BadRequest($"Version with ID {request.ResumeVersionId.Value} not found for this resume");
                }
            }

            // Create approval request
            var approval = new ResumeApproval
            {
                ResumeProfileId = request.ResumeProfileId,
                ResumeVersionId = request.ResumeVersionId,
                RequestedByUserId = request.RequestedByUserId,
                RequestedAt = DateTime.UtcNow,
                Status = ApprovalStatus.Pending,
                RequestNotes = request.RequestNotes
            };

            _context.ResumeApprovals.Add(approval);

            // Update resume status
            resume.Status = ResumeStatus.PendingReview;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Created approval request {ApprovalId} for resume {ResumeId}", approval.Id, request.ResumeProfileId);

            return CreatedAtAction(nameof(GetApproval), new { id = approval.Id }, approval);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating approval request for resume {ResumeId}", request.ResumeProfileId);
            return StatusCode(500, "An error occurred while creating the approval request");
        }
    }

    // PUT: api/resume-approvals/{id}/approve
    [HttpPut("{id}/approve")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult> ApproveResume(Guid id, [FromBody] ApproveResumeRequest request)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (approval == null)
            {
                return NotFound($"Approval with ID {id} not found");
            }

            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest($"Approval is not in pending status (current: {approval.Status})");
            }

            // Update approval
            approval.ReviewedByUserId = request.ReviewedByUserId;
            approval.ReviewedAt = DateTime.UtcNow;
            approval.Status = ApprovalStatus.Approved;
            approval.ReviewNotes = request.ReviewNotes;

            // Update resume
            approval.ResumeProfile.Status = ResumeStatus.Approved;
            approval.ResumeProfile.LastReviewedAt = DateTime.UtcNow;
            approval.ResumeProfile.LastReviewedByUserId = request.ReviewedByUserId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Approved resume {ResumeId} via approval {ApprovalId} by user {UserId}",
                approval.ResumeProfileId, id, request.ReviewedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving resume via approval {ApprovalId}", id);
            return StatusCode(500, "An error occurred while approving the resume");
        }
    }

    // PUT: api/resume-approvals/{id}/reject
    [HttpPut("{id}/reject")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult> RejectResume(Guid id, [FromBody] RejectResumeRequest request)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (approval == null)
            {
                return NotFound($"Approval with ID {id} not found");
            }

            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest($"Approval is not in pending status (current: {approval.Status})");
            }

            if (string.IsNullOrEmpty(request.ReviewNotes))
            {
                return BadRequest("Review notes are required when rejecting a resume");
            }

            // Update approval
            approval.ReviewedByUserId = request.ReviewedByUserId;
            approval.ReviewedAt = DateTime.UtcNow;
            approval.Status = ApprovalStatus.Rejected;
            approval.ReviewNotes = request.ReviewNotes;

            // Update resume status back to draft
            approval.ResumeProfile.Status = ResumeStatus.Draft;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Rejected resume {ResumeId} via approval {ApprovalId} by user {UserId}",
                approval.ResumeProfileId, id, request.ReviewedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting resume via approval {ApprovalId}", id);
            return StatusCode(500, "An error occurred while rejecting the resume");
        }
    }

    // PUT: api/resume-approvals/{id}/request-changes
    [HttpPut("{id}/request-changes")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Approve)]
    public async Task<ActionResult> RequestChanges(Guid id, [FromBody] RequestChangesRequest request)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (approval == null)
            {
                return NotFound($"Approval with ID {id} not found");
            }

            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest($"Approval is not in pending status (current: {approval.Status})");
            }

            if (string.IsNullOrEmpty(request.ReviewNotes))
            {
                return BadRequest("Review notes are required when requesting changes");
            }

            // Update approval
            approval.ReviewedByUserId = request.ReviewedByUserId;
            approval.ReviewedAt = DateTime.UtcNow;
            approval.Status = ApprovalStatus.ChangesRequested;
            approval.ReviewNotes = request.ReviewNotes;

            // Update resume
            approval.ResumeProfile.Status = ResumeStatus.ChangesRequested;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Requested changes for resume {ResumeId} via approval {ApprovalId} by user {UserId}",
                approval.ResumeProfileId, id, request.ReviewedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting changes for resume via approval {ApprovalId}", id);
            return StatusCode(500, "An error occurred while requesting changes");
        }
    }

    // GET: api/resume-approvals/pending
    [HttpGet("pending")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeApproval>>> GetPendingApprovals([FromQuery] Guid? tenantId = null)
    {
        try
        {
            var query = _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                    .ThenInclude(r => r.Person)
                .Include(a => a.RequestedBy)
                .Where(a => a.Status == ApprovalStatus.Pending);

            // Filter by tenant if specified
            if (tenantId.HasValue)
            {
                query = query.Where(a => a.ResumeProfile.Person.TenantId == tenantId.Value);
            }

            var approvals = await query
                .OrderBy(a => a.RequestedAt)
                .ToListAsync();

            return Ok(approvals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending approvals");
            return StatusCode(500, "An error occurred while retrieving pending approvals");
        }
    }

    // GET: api/resume-approvals/my-requests
    [HttpGet("my-requests")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ResumeApproval>>> GetMyRequests()
    {
        try
        {
            var userId = GetCurrentUserId();

            var approvals = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                    .ThenInclude(r => r.Person)
                .Include(a => a.ReviewedBy)
                .Where(a => a.RequestedByUserId == userId)
                .OrderByDescending(a => a.RequestedAt)
                .ToListAsync();

            return Ok(approvals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving approval requests for user {UserId}", GetCurrentUserId());
            return StatusCode(500, "An error occurred while retrieving approval requests");
        }
    }

    // DELETE: api/resume-approvals/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ResumeApproval", Action = PermissionAction.Delete)]
    public async Task<ActionResult> CancelApproval(Guid id)
    {
        try
        {
            var approval = await _context.ResumeApprovals
                .Include(a => a.ResumeProfile)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (approval == null)
            {
                return NotFound($"Approval with ID {id} not found");
            }

            // Can only cancel pending approvals
            if (approval.Status != ApprovalStatus.Pending)
            {
                return BadRequest($"Can only cancel pending approvals (current status: {approval.Status})");
            }

            approval.Status = ApprovalStatus.Cancelled;

            // Update resume status back to draft
            approval.ResumeProfile.Status = ResumeStatus.Draft;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Cancelled approval {ApprovalId} for resume {ResumeId}", id, approval.ResumeProfileId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling approval {ApprovalId}", id);
            return StatusCode(500, "An error occurred while cancelling the approval");
        }
    }
}

// DTOs
public class CreateApprovalRequest
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string? RequestNotes { get; set; }
}

public class ApproveResumeRequest
{
    public Guid ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
}

public class RejectResumeRequest
{
    public Guid ReviewedByUserId { get; set; }
    public string ReviewNotes { get; set; } = string.Empty;
}

public class RequestChangesRequest
{
    public Guid ReviewedByUserId { get; set; }
    public string ReviewNotes { get; set; } = string.Empty;
}

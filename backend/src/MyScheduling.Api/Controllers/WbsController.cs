using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Common;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Models;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using System.Text.Json;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("WBS Management")]
public class WbsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<WbsController> _logger;

    public WbsController(MySchedulingDbContext context, ILogger<WbsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all WBS elements with optional filtering and pagination
    /// </summary>
    /// <param name="projectId">Filter by project ID</param>
    /// <param name="ownerId">Filter by owner user ID</param>
    /// <param name="type">Filter by WBS type (Billable, NonBillable, etc.)</param>
    /// <param name="approvalStatus">Filter by approval status</param>
    /// <param name="includeHistory">Include change history</param>
    /// <param name="pageNumber">Page number (1-based, default: 1)</param>
    /// <param name="pageSize">Page size (default: 50, max: 200)</param>
    /// <returns>Paginated list of WBS elements with metadata</returns>
    [HttpGet]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(PaginatedResponse<WbsElement>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<PaginatedResponse<WbsElement>>> GetWbsElements(
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? ownerId = null,
        [FromQuery] Guid? approverGroupId = null,
        [FromQuery] WbsType? type = null,
        [FromQuery] WbsApprovalStatus? approvalStatus = null,
        [FromQuery] bool includeHistory = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            // Validate pagination parameters
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            var query = _context.WbsElements
                .Include(w => w.Project)
                .Include(w => w.Owner)
                .Include(w => w.Approver)
                .AsQueryable();

            if (projectId.HasValue)
            {
                query = query.Where(w => w.ProjectId == projectId.Value);
            }

            if (ownerId.HasValue)
            {
                query = query.Where(w => w.OwnerUserId == ownerId.Value);
            }

            if (approverGroupId.HasValue)
            {
                query = query.Where(w => w.ApproverGroupId == approverGroupId.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(w => w.Type == type.Value);
            }

            if (approvalStatus.HasValue)
            {
                query = query.Where(w => w.ApprovalStatus == approvalStatus.Value);
            }

            if (includeHistory)
            {
                query = query.Include(w => w.ChangeHistory)
                    .ThenInclude(h => h.ChangedBy);
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var wbsElements = await query
                .OrderBy(w => w.Code)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var response = new PaginatedResponse<WbsElement>
            {
                Items = wbsElements,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving WBS elements");
            return StatusCode(500, "An error occurred while retrieving WBS elements");
        }
    }

    /// <summary>
    /// Get a single WBS element by ID
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <returns>WBS element with project, owner, approver, and change history</returns>
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(WbsElement), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<WbsElement>> GetWbsElement(Guid id)
    {
        try
        {
            var wbsElement = await _context.WbsElements
                .Include(w => w.Project)
                .Include(w => w.Owner)
                .Include(w => w.Approver)
                .Include(w => w.ChangeHistory)
                    .ThenInclude(h => h.ChangedBy)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            return Ok(wbsElement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving WBS element {WbsId}", id);
            return StatusCode(500, "An error occurred while retrieving the WBS element");
        }
    }

    /// <summary>
    /// Get WBS elements pending approval
    /// </summary>
    /// <param name="approverId">Optional filter by approver user ID</param>
    /// <returns>List of WBS elements with PendingApproval status</returns>
    [HttpGet("pending-approval")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(IEnumerable<WbsElement>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<IEnumerable<WbsElement>>> GetPendingApprovals(
        [FromQuery] Guid? approverId = null,
        [FromQuery] Guid? approverGroupId = null)
    {
        try
        {
            var query = _context.WbsElements
                .Include(w => w.Project)
                .Include(w => w.Owner)
                .Include(w => w.Approver)
                .Include(w => w.ApproverGroup)
                .Where(w => w.ApprovalStatus == WbsApprovalStatus.PendingApproval);

            if (approverId.HasValue)
            {
                query = query.Where(w => w.ApproverUserId == approverId.Value);
            }

            if (approverGroupId.HasValue)
            {
                query = query.Where(w => w.ApproverGroupId == approverGroupId.Value);
            }

            var pendingWbs = await query
                .OrderBy(w => w.CreatedAt)
                .ToListAsync();

            return Ok(pendingWbs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending approvals");
            return StatusCode(500, "An error occurred while retrieving pending approvals");
        }
    }

    /// <summary>
    /// Get change history for a WBS element
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <returns>List of change history records ordered by date descending</returns>
    [HttpGet("{id}/history")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Read)]
    [ProducesResponseType(typeof(IEnumerable<WbsChangeHistory>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<IEnumerable<WbsChangeHistory>>> GetWbsHistory(Guid id)
    {
        try
        {
            var history = await _context.WbsChangeHistories
                .Include(h => h.ChangedBy)
                .Where(h => h.WbsElementId == id)
                .OrderByDescending(h => h.ChangedAt)
                .ToListAsync();

            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving WBS history for {WbsId}", id);
            return StatusCode(500, "An error occurred while retrieving WBS history");
        }
    }

    /// <summary>
    /// Create a new WBS element
    /// </summary>
    /// <param name="request">WBS element creation request</param>
    /// <returns>Created WBS element with status set to Draft</returns>
    [HttpPost]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Create)]
    [ProducesResponseType(typeof(WbsElement), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(409)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<WbsElement>> CreateWbsElement([FromBody] CreateWbsRequest request)
    {
        try
        {
            // Validate project exists
            var project = await _context.Projects.FindAsync(request.ProjectId);
            if (project == null)
            {
                return NotFound($"Project with ID {request.ProjectId} not found");
            }

            // Check for duplicate code within project
            var existingWbs = await _context.WbsElements
                .AnyAsync(w => w.ProjectId == request.ProjectId && w.Code == request.Code);

            if (existingWbs)
            {
                return Conflict($"WBS code {request.Code} already exists in this project");
            }

            var wbsElement = new WbsElement
            {
                Id = Guid.NewGuid(),
                TenantId = project.TenantId,
                ProjectId = request.ProjectId,
                Code = request.Code,
                Description = request.Description,
                ValidFrom = request.ValidFrom,
                ValidTo = request.ValidTo,
                StartDate = request.ValidFrom, // Legacy field
                EndDate = request.ValidTo,     // Legacy field
                Type = request.Type,
                Status = WbsStatus.Draft,
                IsBillable = request.Type == WbsType.Billable, // Legacy field
                ApprovalStatus = WbsApprovalStatus.Draft,
                OwnerUserId = request.OwnerUserId,
                ApproverUserId = request.ApproverUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsElements.Add(wbsElement);

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = request.CreatedByUserId ?? Guid.Empty,
                ChangedAt = DateTime.UtcNow,
                ChangeType = "Created",
                NewValues = JsonSerializer.Serialize(wbsElement),
                Notes = "WBS element created",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWbsElement), new { id = wbsElement.Id }, wbsElement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating WBS element");
            return StatusCode(500, "An error occurred while creating the WBS element");
        }
    }

    /// <summary>
    /// Update a WBS element (only allowed for Draft or Rejected status)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">WBS element update request</param>
    /// <returns>No content on success</returns>
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> UpdateWbsElement(Guid id, [FromBody] UpdateWbsRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            // Can only update Draft or Rejected WBS
            if (wbsElement.ApprovalStatus != WbsApprovalStatus.Draft &&
                wbsElement.ApprovalStatus != WbsApprovalStatus.Rejected)
            {
                return BadRequest($"Cannot update WBS in {wbsElement.ApprovalStatus} status");
            }

            // Snapshot old values
            var oldValues = JsonSerializer.Serialize(wbsElement);

            // Update fields
            wbsElement.Description = request.Description ?? wbsElement.Description;
            wbsElement.ValidFrom = request.ValidFrom ?? wbsElement.ValidFrom;
            wbsElement.ValidTo = request.ValidTo;
            wbsElement.StartDate = request.ValidFrom ?? wbsElement.StartDate; // Legacy
            wbsElement.EndDate = request.ValidTo; // Legacy
            wbsElement.Type = request.Type ?? wbsElement.Type;
            wbsElement.IsBillable = (request.Type ?? wbsElement.Type) == WbsType.Billable; // Legacy
            wbsElement.OwnerUserId = request.OwnerUserId ?? wbsElement.OwnerUserId;
            wbsElement.ApproverUserId = request.ApproverUserId ?? wbsElement.ApproverUserId;
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = request.UpdatedByUserId ?? Guid.Empty,
                ChangedAt = DateTime.UtcNow,
                ChangeType = "Updated",
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(wbsElement),
                Notes = request.Notes ?? "WBS element updated",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating WBS element {WbsId}", id);
            return StatusCode(500, "An error occurred while updating the WBS element");
        }
    }

    /// <summary>
    /// Submit a WBS element for approval (Draft or Rejected → PendingApproval)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">Workflow request with user ID and optional notes</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id}/submit")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> SubmitForApproval(Guid id, [FromBody] WorkflowRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            if (wbsElement.ApprovalStatus != WbsApprovalStatus.Draft &&
                wbsElement.ApprovalStatus != WbsApprovalStatus.Rejected)
            {
                return BadRequest($"Cannot submit WBS in {wbsElement.ApprovalStatus} status");
            }

            if (wbsElement.ApproverUserId == null)
            {
                return BadRequest("Approver must be assigned before submitting");
            }

            wbsElement.ApprovalStatus = WbsApprovalStatus.PendingApproval;
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = "StatusChanged",
                OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Draft }),
                NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                Notes = request.Notes ?? "Submitted for approval",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            _logger.LogInformation("WBS {WbsId} submitted for approval by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting WBS {WbsId} for approval", id);
            return StatusCode(500, "An error occurred while submitting the WBS for approval");
        }
    }

    /// <summary>
    /// Approve a WBS element (PendingApproval → Approved)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">Workflow request with user ID and optional notes</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id}/approve")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Approve)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> ApproveWbs(Guid id, [FromBody] WorkflowRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            if (wbsElement.ApprovalStatus != WbsApprovalStatus.PendingApproval)
            {
                return BadRequest($"Cannot approve WBS in {wbsElement.ApprovalStatus} status");
            }

            wbsElement.ApprovalStatus = WbsApprovalStatus.Approved;
            wbsElement.Status = WbsStatus.Active;
            wbsElement.ApprovedAt = DateTime.UtcNow;
            wbsElement.ApprovalNotes = request.Notes;
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = "StatusChanged",
                OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Approved }),
                Notes = request.Notes ?? "Approved",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            _logger.LogInformation("WBS {WbsId} approved by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving WBS {WbsId}", id);
            return StatusCode(500, "An error occurred while approving the WBS");
        }
    }

    /// <summary>
    /// Reject a WBS element (PendingApproval → Rejected)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">Workflow request with user ID and required rejection notes</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id}/reject")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Approve)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> RejectWbs(Guid id, [FromBody] WorkflowRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            if (wbsElement.ApprovalStatus != WbsApprovalStatus.PendingApproval)
            {
                return BadRequest($"Cannot reject WBS in {wbsElement.ApprovalStatus} status");
            }

            if (string.IsNullOrWhiteSpace(request.Notes))
            {
                return BadRequest("Rejection reason is required");
            }

            wbsElement.ApprovalStatus = WbsApprovalStatus.Rejected;
            wbsElement.ApprovalNotes = request.Notes;
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = "StatusChanged",
                OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Rejected }),
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            _logger.LogInformation("WBS {WbsId} rejected by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting WBS {WbsId}", id);
            return StatusCode(500, "An error occurred while rejecting the WBS");
        }
    }

    /// <summary>
    /// Suspend an approved WBS element (Approved → Suspended)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">Workflow request with user ID and optional notes</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id}/suspend")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> SuspendWbs(Guid id, [FromBody] WorkflowRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            if (wbsElement.ApprovalStatus != WbsApprovalStatus.Approved)
            {
                return BadRequest($"Can only suspend approved WBS elements");
            }

            var oldStatus = wbsElement.ApprovalStatus;
            wbsElement.ApprovalStatus = WbsApprovalStatus.Suspended;
            wbsElement.Status = WbsStatus.Draft; // Revert to draft
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = "StatusChanged",
                OldValues = JsonSerializer.Serialize(new { ApprovalStatus = oldStatus }),
                NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Suspended }),
                Notes = request.Notes ?? "Suspended",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            _logger.LogInformation("WBS {WbsId} suspended by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error suspending WBS {WbsId}", id);
            return StatusCode(500, "An error occurred while suspending the WBS");
        }
    }

    /// <summary>
    /// Close a WBS element (any status → Closed)
    /// </summary>
    /// <param name="id">WBS element ID</param>
    /// <param name="request">Workflow request with user ID and optional notes</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id}/close")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> CloseWbs(Guid id, [FromBody] WorkflowRequest request)
    {
        try
        {
            var wbsElement = await _context.WbsElements.FindAsync(id);
            if (wbsElement == null)
            {
                return NotFound($"WBS element with ID {id} not found");
            }

            var oldStatus = wbsElement.ApprovalStatus;
            wbsElement.ApprovalStatus = WbsApprovalStatus.Closed;
            wbsElement.Status = WbsStatus.Closed;
            wbsElement.UpdatedAt = DateTime.UtcNow;

            // Create change history
            var history = new WbsChangeHistory
            {
                Id = Guid.NewGuid(),
                WbsElementId = wbsElement.Id,
                ChangedByUserId = GetCurrentUserId(),
                ChangedAt = DateTime.UtcNow,
                ChangeType = "StatusChanged",
                OldValues = JsonSerializer.Serialize(new { ApprovalStatus = oldStatus, Status = wbsElement.Status }),
                NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Closed, Status = WbsStatus.Closed }),
                Notes = request.Notes ?? "Closed",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WbsChangeHistories.Add(history);
            await _context.SaveChangesAsync();

            _logger.LogInformation("WBS {WbsId} closed by user {UserId}", id, GetCurrentUserId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing WBS {WbsId}", id);
            return StatusCode(500, "An error occurred while closing the WBS");
        }
    }

    /// <summary>
    /// Bulk submit multiple WBS elements for approval
    /// </summary>
    /// <param name="request">Bulk workflow request with WBS IDs and user ID</param>
    /// <returns>Result summary with successful and failed operations</returns>
    [HttpPost("bulk/submit")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(typeof(BulkOperationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<BulkOperationResult>> BulkSubmitForApproval([FromBody] BulkWorkflowRequest request)
    {
        try
        {
            if (request.WbsIds == null || !request.WbsIds.Any())
            {
                return BadRequest("At least one WBS ID is required");
            }

            var result = new BulkOperationResult();

            // Use transaction to ensure all changes succeed or none do
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Load all WBS elements at once to avoid N+1 queries
                var wbsElements = await _context.WbsElements
                    .Where(w => request.WbsIds.Contains(w.Id))
                    .ToListAsync();

                var wbsDict = wbsElements.ToDictionary(w => w.Id);

                foreach (var wbsId in request.WbsIds)
            {
                try
                {
                    if (!wbsDict.TryGetValue(wbsId, out var wbsElement))
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = "WBS element not found"
                        });
                        continue;
                    }

                    if (wbsElement.ApprovalStatus != WbsApprovalStatus.Draft &&
                        wbsElement.ApprovalStatus != WbsApprovalStatus.Rejected)
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = $"Cannot submit WBS in {wbsElement.ApprovalStatus} status"
                        });
                        continue;
                    }

                    if (wbsElement.ApproverUserId == null)
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = "Approver must be assigned before submitting"
                        });
                        continue;
                    }

                    wbsElement.ApprovalStatus = WbsApprovalStatus.PendingApproval;
                    wbsElement.UpdatedAt = DateTime.UtcNow;

                    var history = new WbsChangeHistory
                    {
                        Id = Guid.NewGuid(),
                        WbsElementId = wbsElement.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        ChangedAt = DateTime.UtcNow,
                        ChangeType = "StatusChanged",
                        OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Draft }),
                        NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                        Notes = request.Notes ?? "Bulk submitted for approval",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.WbsChangeHistories.Add(history);
                    result.Successful.Add(wbsId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WBS {WbsId} in bulk submit", wbsId);
                    result.Failed.Add(new FailedOperation
                    {
                        Id = wbsId,
                        Error = ex.Message
                    });
                }
            }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Bulk submit completed: {Successful} succeeded, {Failed} failed",
                    result.Successful.Count, result.Failed.Count);

                return Ok(result);
            }
            catch (Exception transactionEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(transactionEx, "Transaction failed during bulk submit, all changes rolled back");
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk submit operation");
            return StatusCode(500, "An error occurred during bulk submit operation");
        }
    }

    /// <summary>
    /// Bulk approve multiple WBS elements
    /// </summary>
    /// <param name="request">Bulk workflow request with WBS IDs and user ID</param>
    /// <returns>Result summary with successful and failed operations</returns>
    [HttpPost("bulk/approve")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Approve)]
    [ProducesResponseType(typeof(BulkOperationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<BulkOperationResult>> BulkApproveWbs([FromBody] BulkWorkflowRequest request)
    {
        try
        {
            if (request.WbsIds == null || !request.WbsIds.Any())
            {
                return BadRequest("At least one WBS ID is required");
            }

            var result = new BulkOperationResult();

            // Use transaction to ensure all changes succeed or none do
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Load all WBS elements at once to avoid N+1 queries
                var wbsElements = await _context.WbsElements
                    .Where(w => request.WbsIds.Contains(w.Id))
                    .ToListAsync();

                var wbsDict = wbsElements.ToDictionary(w => w.Id);

                foreach (var wbsId in request.WbsIds)
            {
                try
                {
                    if (!wbsDict.TryGetValue(wbsId, out var wbsElement))
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = "WBS element not found"
                        });
                        continue;
                    }

                    if (wbsElement.ApprovalStatus != WbsApprovalStatus.PendingApproval)
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = $"Cannot approve WBS in {wbsElement.ApprovalStatus} status"
                        });
                        continue;
                    }

                    wbsElement.ApprovalStatus = WbsApprovalStatus.Approved;
                    wbsElement.Status = WbsStatus.Active;
                    wbsElement.ApprovedAt = DateTime.UtcNow;
                    wbsElement.ApprovalNotes = request.Notes;
                    wbsElement.UpdatedAt = DateTime.UtcNow;

                    var history = new WbsChangeHistory
                    {
                        Id = Guid.NewGuid(),
                        WbsElementId = wbsElement.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        ChangedAt = DateTime.UtcNow,
                        ChangeType = "StatusChanged",
                        OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                        NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Approved }),
                        Notes = request.Notes ?? "Bulk approved",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.WbsChangeHistories.Add(history);
                    result.Successful.Add(wbsId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WBS {WbsId} in bulk approve", wbsId);
                    result.Failed.Add(new FailedOperation
                    {
                        Id = wbsId,
                        Error = ex.Message
                    });
                }
            }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Bulk approve completed: {Successful} succeeded, {Failed} failed",
                    result.Successful.Count, result.Failed.Count);

                return Ok(result);
            }
            catch (Exception transactionEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(transactionEx, "Transaction failed during bulk approve, all changes rolled back");
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk approve operation");
            return StatusCode(500, "An error occurred during bulk approve operation");
        }
    }

    /// <summary>
    /// Bulk reject multiple WBS elements
    /// </summary>
    /// <param name="request">Bulk workflow request with WBS IDs, user ID, and required rejection notes</param>
    /// <returns>Result summary with successful and failed operations</returns>
    [HttpPost("bulk/reject")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Approve)]
    [ProducesResponseType(typeof(BulkOperationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<BulkOperationResult>> BulkRejectWbs([FromBody] BulkWorkflowRequest request)
    {
        try
        {
            if (request.WbsIds == null || !request.WbsIds.Any())
            {
                return BadRequest("At least one WBS ID is required");
            }

            if (string.IsNullOrWhiteSpace(request.Notes))
            {
                return BadRequest("Rejection reason is required");
            }

            var result = new BulkOperationResult();

            // Use transaction to ensure all changes succeed or none do
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Load all WBS elements at once to avoid N+1 queries
                var wbsElements = await _context.WbsElements
                    .Where(w => request.WbsIds.Contains(w.Id))
                    .ToListAsync();

                var wbsDict = wbsElements.ToDictionary(w => w.Id);

                foreach (var wbsId in request.WbsIds)
            {
                try
                {
                    if (!wbsDict.TryGetValue(wbsId, out var wbsElement))
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = "WBS element not found"
                        });
                        continue;
                    }

                    if (wbsElement.ApprovalStatus != WbsApprovalStatus.PendingApproval)
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = $"Cannot reject WBS in {wbsElement.ApprovalStatus} status"
                        });
                        continue;
                    }

                    wbsElement.ApprovalStatus = WbsApprovalStatus.Rejected;
                    wbsElement.ApprovalNotes = request.Notes;
                    wbsElement.UpdatedAt = DateTime.UtcNow;

                    var history = new WbsChangeHistory
                    {
                        Id = Guid.NewGuid(),
                        WbsElementId = wbsElement.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        ChangedAt = DateTime.UtcNow,
                        ChangeType = "StatusChanged",
                        OldValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.PendingApproval }),
                        NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Rejected }),
                        Notes = request.Notes,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.WbsChangeHistories.Add(history);
                    result.Successful.Add(wbsId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WBS {WbsId} in bulk reject", wbsId);
                    result.Failed.Add(new FailedOperation
                    {
                        Id = wbsId,
                        Error = ex.Message
                    });
                }
            }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Bulk reject completed: {Successful} succeeded, {Failed} failed",
                    result.Successful.Count, result.Failed.Count);

                return Ok(result);
            }
            catch (Exception transactionEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(transactionEx, "Transaction failed during bulk reject, all changes rolled back");
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk reject operation");
            return StatusCode(500, "An error occurred during bulk reject operation");
        }
    }

    /// <summary>
    /// Bulk close multiple WBS elements
    /// </summary>
    /// <param name="request">Bulk workflow request with WBS IDs and user ID</param>
    /// <returns>Result summary with successful and failed operations</returns>
    [HttpPost("bulk/close")]
    [RequiresPermission(Resource = "WbsElement", Action = PermissionAction.Update)]
    [ProducesResponseType(typeof(BulkOperationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<BulkOperationResult>> BulkCloseWbs([FromBody] BulkWorkflowRequest request)
    {
        try
        {
            if (request.WbsIds == null || !request.WbsIds.Any())
            {
                return BadRequest("At least one WBS ID is required");
            }

            var result = new BulkOperationResult();

            // Use transaction to ensure all changes succeed or none do
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Load all WBS elements at once to avoid N+1 queries
                var wbsElements = await _context.WbsElements
                    .Where(w => request.WbsIds.Contains(w.Id))
                    .ToListAsync();

                var wbsDict = wbsElements.ToDictionary(w => w.Id);

                foreach (var wbsId in request.WbsIds)
            {
                try
                {
                    if (!wbsDict.TryGetValue(wbsId, out var wbsElement))
                    {
                        result.Failed.Add(new FailedOperation
                        {
                            Id = wbsId,
                            Error = "WBS element not found"
                        });
                        continue;
                    }

                    var oldStatus = wbsElement.ApprovalStatus;
                    wbsElement.ApprovalStatus = WbsApprovalStatus.Closed;
                    wbsElement.Status = WbsStatus.Closed;
                    wbsElement.UpdatedAt = DateTime.UtcNow;

                    var history = new WbsChangeHistory
                    {
                        Id = Guid.NewGuid(),
                        WbsElementId = wbsElement.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        ChangedAt = DateTime.UtcNow,
                        ChangeType = "StatusChanged",
                        OldValues = JsonSerializer.Serialize(new { ApprovalStatus = oldStatus, Status = wbsElement.Status }),
                        NewValues = JsonSerializer.Serialize(new { ApprovalStatus = WbsApprovalStatus.Closed, Status = WbsStatus.Closed }),
                        Notes = request.Notes ?? "Bulk closed",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.WbsChangeHistories.Add(history);
                    result.Successful.Add(wbsId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WBS {WbsId} in bulk close", wbsId);
                    result.Failed.Add(new FailedOperation
                    {
                        Id = wbsId,
                        Error = ex.Message
                    });
                }
            }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Bulk close completed: {Successful} succeeded, {Failed} failed",
                    result.Successful.Count, result.Failed.Count);

                return Ok(result);
            }
            catch (Exception transactionEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(transactionEx, "Transaction failed during bulk close, all changes rolled back");
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk close operation");
            return StatusCode(500, "An error occurred during bulk close operation");
        }
    }
}

// Request DTOs
public class CreateWbsRequest
{
    public Guid ProjectId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public WbsType Type { get; set; }
    public Guid? OwnerUserId { get; set; }
    public Guid? ApproverUserId { get; set; }
    public Guid? CreatedByUserId { get; set; }
}

public class UpdateWbsRequest
{
    public string? Description { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public WbsType? Type { get; set; }
    public Guid? OwnerUserId { get; set; }
    public Guid? ApproverUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public string? Notes { get; set; }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectBudgetsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ProjectBudgetsController> _logger;

    public ProjectBudgetsController(MySchedulingDbContext context, ILogger<ProjectBudgetsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets the current tenant ID from X-Tenant-Id header or JWT claims.
    /// </summary>
    private Guid? GetCurrentTenantId()
    {
        // Check X-Tenant-Id header first (preferred - set by frontend when workspace is selected)
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId) &&
            Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderTenantId))
        {
            // Verify the user has access to this tenant
            var userTenantIds = GetUserTenantIds();
            if (userTenantIds.Contains(parsedHeaderTenantId))
            {
                return parsedHeaderTenantId;
            }
        }

        // Fallback to first TenantId claim
        var tenantIds = GetUserTenantIds();
        return tenantIds.Any() ? tenantIds.First() : (Guid?)null;
    }

    private Guid? TryGetCurrentUserId()
    {
        try
        {
            return GetCurrentUserId();
        }
        catch
        {
            return null;
        }
    }

    // GET: api/projectbudgets
    [HttpGet]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ProjectBudgetDto>>> GetProjectBudgets(
        [FromQuery] Guid? projectId = null,
        [FromQuery] int? fiscalYear = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] ProjectBudgetStatus? status = null)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var query = _context.ProjectBudgets
                .Include(b => b.Project)
                .Include(b => b.Lines)
                .Where(b => b.TenantId == tenantId.Value);

            if (projectId.HasValue)
                query = query.Where(b => b.ProjectId == projectId.Value);

            if (fiscalYear.HasValue)
                query = query.Where(b => b.FiscalYear == fiscalYear.Value);

            if (isActive.HasValue)
                query = query.Where(b => b.IsActive == isActive.Value);

            if (status.HasValue)
                query = query.Where(b => b.Status == status.Value);

            var budgets = await query
                .OrderByDescending(b => b.FiscalYear)
                .ThenByDescending(b => b.VersionNumber)
                .Select(b => new ProjectBudgetDto
                {
                    Id = b.Id,
                    ProjectId = b.ProjectId,
                    ProjectName = b.Project.Name,
                    ProjectCode = b.Project.ProgramCode,
                    FiscalYear = b.FiscalYear,
                    Name = b.Name,
                    Description = b.Description,
                    Type = b.Type,
                    VersionNumber = b.VersionNumber,
                    IsActive = b.IsActive,
                    TotalBudgetedHours = b.TotalBudgetedHours,
                    Status = b.Status,
                    EffectiveFrom = b.EffectiveFrom,
                    EffectiveTo = b.EffectiveTo,
                    CreatedAt = b.CreatedAt,
                    SubmittedAt = b.SubmittedAt,
                    ApprovedAt = b.ApprovedAt,
                    Notes = b.Notes,
                    HasMonthlyLines = b.Lines.Any()
                })
                .ToListAsync();

            return Ok(budgets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching project budgets");
            return StatusCode(500, "An error occurred while retrieving project budgets");
        }
    }

    // GET: api/projectbudgets/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Read)]
    public async Task<ActionResult<ProjectBudgetDetailDto>> GetProjectBudget(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var budget = await _context.ProjectBudgets
                .Include(b => b.Project)
                .Include(b => b.Lines)
                    .ThenInclude(l => l.WbsElement)
                .Include(b => b.Lines)
                    .ThenInclude(l => l.LaborCategory)
                .Include(b => b.PreviousVersion)
                .Include(b => b.SubmittedByUser)
                .Include(b => b.ApprovedByUser)
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            return Ok(MapToDetailDto(budget));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while retrieving the project budget");
        }
    }

    // GET: api/projectbudgets/project/{projectId}/active
    [HttpGet("project/{projectId}/active")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Read)]
    public async Task<ActionResult<ProjectBudgetDetailDto>> GetActiveProjectBudget(Guid projectId, [FromQuery] int? fiscalYear = null)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var fy = fiscalYear ?? GetCurrentFiscalYear(tenantId.Value);

            var budget = await _context.ProjectBudgets
                .Include(b => b.Project)
                .Include(b => b.Lines)
                .FirstOrDefaultAsync(b =>
                    b.ProjectId == projectId &&
                    b.TenantId == tenantId.Value &&
                    b.FiscalYear == fy &&
                    b.IsActive);

            if (budget == null)
                return NotFound($"No active budget found for project {projectId} in FY{fy}");

            return Ok(MapToDetailDto(budget));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching active budget for project {ProjectId}", projectId);
            return StatusCode(500, "An error occurred while retrieving the active budget");
        }
    }

    // POST: api/projectbudgets
    [HttpPost]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Create)]
    public async Task<ActionResult<ProjectBudgetDetailDto>> CreateProjectBudget([FromBody] CreateProjectBudgetRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            // Validate project exists
            var project = await _context.Projects.FindAsync(request.ProjectId);
            if (project == null || project.TenantId != tenantId.Value)
                return BadRequest(new { message = "Invalid project" });

            // Determine version number
            var existingVersions = await _context.ProjectBudgets
                .Where(b => b.ProjectId == request.ProjectId && b.FiscalYear == request.FiscalYear && b.TenantId == tenantId.Value)
                .Select(b => b.VersionNumber)
                .ToListAsync();

            var newVersionNumber = existingVersions.Any() ? existingVersions.Max() + 1 : 1;

            // If this is marked as active, deactivate other budgets for same project/FY
            if (request.IsActive)
            {
                var activeBudgets = await _context.ProjectBudgets
                    .Where(b => b.ProjectId == request.ProjectId && b.FiscalYear == request.FiscalYear && b.TenantId == tenantId.Value && b.IsActive)
                    .ToListAsync();
                foreach (var b in activeBudgets)
                {
                    b.IsActive = false;
                    b.EffectiveTo = DateTime.UtcNow;
                }
            }

            // Calculate total from lines if not provided directly
            var calculatedTotal = request.Lines?.Sum(l => l.BudgetedHours) ?? 0;
            var totalBudgetedHours = request.TotalBudgetedHours > 0 ? request.TotalBudgetedHours : calculatedTotal;

            var budget = new ProjectBudget
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId.Value,
                ProjectId = request.ProjectId,
                FiscalYear = request.FiscalYear,
                Name = request.Name,
                Description = request.Description,
                Type = request.Type,
                VersionNumber = newVersionNumber,
                IsActive = request.IsActive,
                PreviousVersionId = request.PreviousVersionId,
                TotalBudgetedHours = totalBudgetedHours,
                Status = ProjectBudgetStatus.Draft,
                EffectiveFrom = request.IsActive ? DateTime.UtcNow : null,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = userId.Value
            };

            _context.ProjectBudgets.Add(budget);

            // Add monthly lines if provided
            if (request.Lines?.Any() == true)
            {
                foreach (var line in request.Lines)
                {
                    _context.ProjectBudgetLines.Add(new ProjectBudgetLine
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId.Value,
                        ProjectBudgetId = budget.Id,
                        Year = line.Year,
                        Month = line.Month,
                        BudgetedHours = line.BudgetedHours,
                        WbsElementId = line.WbsElementId,
                        LaborCategoryId = line.LaborCategoryId,
                        Notes = line.Notes,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = userId.Value
                    });
                }
            }

            // Add history entry
            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = budget.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Created,
                NewTotalHours = budget.TotalBudgetedHours,
                NewStatus = budget.Status,
                ChangeReason = $"Budget created: {request.Name}"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} created for project {ProjectId} FY{FiscalYear} by user {UserId}",
                budget.Id, request.ProjectId, request.FiscalYear, userId);

            return CreatedAtAction(nameof(GetProjectBudget), new { id = budget.Id }, MapToDetailDto(budget));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating project budget");
            return StatusCode(500, "An error occurred while creating the project budget");
        }
    }

    // PUT: api/projectbudgets/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Update)]
    public async Task<ActionResult<ProjectBudgetDetailDto>> UpdateProjectBudget(Guid id, [FromBody] UpdateProjectBudgetRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .Include(b => b.Lines)
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            // Can only update draft budgets
            if (budget.Status != ProjectBudgetStatus.Draft)
                return BadRequest(new { message = "Can only update draft budgets" });

            var oldTotalHours = budget.TotalBudgetedHours;
            var oldStatus = budget.Status;

            // Update fields
            budget.Name = request.Name ?? budget.Name;
            budget.Description = request.Description;
            budget.TotalBudgetedHours = request.TotalBudgetedHours ?? budget.TotalBudgetedHours;
            budget.Notes = request.Notes;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedByUserId = userId.Value;

            // If activating this budget, deactivate others
            if (request.IsActive == true && !budget.IsActive)
            {
                var activeBudgets = await _context.ProjectBudgets
                    .Where(b => b.ProjectId == budget.ProjectId && b.FiscalYear == budget.FiscalYear && b.TenantId == tenantId.Value && b.IsActive && b.Id != id)
                    .ToListAsync();
                foreach (var b in activeBudgets)
                {
                    b.IsActive = false;
                    b.EffectiveTo = DateTime.UtcNow;
                }
                budget.IsActive = true;
                budget.EffectiveFrom = DateTime.UtcNow;
            }

            // Update lines if provided
            if (request.Lines != null)
            {
                // Remove existing lines
                _context.ProjectBudgetLines.RemoveRange(budget.Lines);

                // Add new lines
                foreach (var line in request.Lines)
                {
                    _context.ProjectBudgetLines.Add(new ProjectBudgetLine
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId.Value,
                        ProjectBudgetId = budget.Id,
                        Year = line.Year,
                        Month = line.Month,
                        BudgetedHours = line.BudgetedHours,
                        WbsElementId = line.WbsElementId,
                        LaborCategoryId = line.LaborCategoryId,
                        Notes = line.Notes,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = userId.Value
                    });
                }
            }

            // Add history if hours changed
            if (oldTotalHours != budget.TotalBudgetedHours)
            {
                _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
                {
                    Id = Guid.NewGuid(),
                    ProjectBudgetId = budget.Id,
                    ChangedByUserId = userId.Value,
                    ChangedAt = DateTime.UtcNow,
                    ChangeType = ProjectBudgetChangeType.HoursUpdated,
                    OldTotalHours = oldTotalHours,
                    NewTotalHours = budget.TotalBudgetedHours,
                    OldStatus = oldStatus,
                    NewStatus = budget.Status
                });
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} updated by user {UserId}", id, userId);

            return Ok(MapToDetailDto(budget));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while updating the project budget");
        }
    }

    // POST: api/projectbudgets/{id}/activate
    [HttpPost("{id}/activate")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Update)]
    public async Task<ActionResult> ActivateBudget(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            if (budget.Status != ProjectBudgetStatus.Approved)
                return BadRequest(new { message = "Only approved budgets can be activated" });

            // Deactivate other budgets for same project/FY
            var activeBudgets = await _context.ProjectBudgets
                .Where(b => b.ProjectId == budget.ProjectId && b.FiscalYear == budget.FiscalYear && b.TenantId == tenantId.Value && b.IsActive)
                .ToListAsync();
            foreach (var b in activeBudgets)
            {
                b.IsActive = false;
                b.EffectiveTo = DateTime.UtcNow;
                b.Status = ProjectBudgetStatus.Superseded;
            }

            budget.IsActive = true;
            budget.EffectiveFrom = DateTime.UtcNow;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedByUserId = userId.Value;

            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = budget.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Activated,
                NewStatus = budget.Status,
                ChangeReason = "Budget activated"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} activated by user {UserId}", id, userId);

            return Ok(new { message = "Budget activated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while activating the budget");
        }
    }

    // POST: api/projectbudgets/{id}/submit
    [HttpPost("{id}/submit")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Update)]
    public async Task<ActionResult> SubmitForApproval(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            if (budget.Status != ProjectBudgetStatus.Draft)
                return BadRequest(new { message = "Only draft budgets can be submitted" });

            var oldStatus = budget.Status;
            budget.Status = ProjectBudgetStatus.Submitted;
            budget.SubmittedAt = DateTime.UtcNow;
            budget.SubmittedByUserId = userId.Value;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedByUserId = userId.Value;

            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = budget.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Submitted,
                OldStatus = oldStatus,
                NewStatus = budget.Status,
                ChangeReason = "Budget submitted for approval"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} submitted for approval by user {UserId}", id, userId);

            return Ok(new { message = "Budget submitted for approval" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while submitting the budget");
        }
    }

    // POST: api/projectbudgets/{id}/approve
    [HttpPost("{id}/approve")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Approve)]
    public async Task<ActionResult> ApproveBudget(Guid id, [FromBody] ApprovalRequest? request = null)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            if (budget.Status != ProjectBudgetStatus.Submitted)
                return BadRequest(new { message = "Only submitted budgets can be approved" });

            var oldStatus = budget.Status;
            budget.Status = ProjectBudgetStatus.Approved;
            budget.ApprovedAt = DateTime.UtcNow;
            budget.ApprovedByUserId = userId.Value;
            budget.ApprovalNotes = request?.Notes;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedByUserId = userId.Value;

            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = budget.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Approved,
                OldStatus = oldStatus,
                NewStatus = budget.Status,
                ChangeReason = request?.Notes ?? "Budget approved"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} approved by user {UserId}", id, userId);

            return Ok(new { message = "Budget approved" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while approving the budget");
        }
    }

    // POST: api/projectbudgets/{id}/reject
    [HttpPost("{id}/reject")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Approve)]
    public async Task<ActionResult> RejectBudget(Guid id, [FromBody] ApprovalRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            if (budget.Status != ProjectBudgetStatus.Submitted)
                return BadRequest(new { message = "Only submitted budgets can be rejected" });

            var oldStatus = budget.Status;
            budget.Status = ProjectBudgetStatus.Rejected;
            budget.ApprovalNotes = request?.Notes;
            budget.UpdatedAt = DateTime.UtcNow;
            budget.UpdatedByUserId = userId.Value;

            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = budget.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Rejected,
                OldStatus = oldStatus,
                NewStatus = budget.Status,
                ChangeReason = request?.Notes ?? "Budget rejected"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} rejected by user {UserId}", id, userId);

            return Ok(new { message = "Budget rejected" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while rejecting the budget");
        }
    }

    // POST: api/projectbudgets/{id}/reforecast
    [HttpPost("{id}/reforecast")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Create)]
    public async Task<ActionResult<ProjectBudgetDetailDto>> CreateReforecast(Guid id, [FromBody] CreateReforecastRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var baseBudget = await _context.ProjectBudgets
                .Include(b => b.Lines)
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (baseBudget == null)
                return NotFound($"Budget with ID {id} not found");

            // Determine version number
            var existingVersions = await _context.ProjectBudgets
                .Where(b => b.ProjectId == baseBudget.ProjectId && b.FiscalYear == baseBudget.FiscalYear && b.TenantId == tenantId.Value)
                .Select(b => b.VersionNumber)
                .ToListAsync();

            var newVersionNumber = existingVersions.Max() + 1;

            var reforecast = new ProjectBudget
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId.Value,
                ProjectId = baseBudget.ProjectId,
                FiscalYear = baseBudget.FiscalYear,
                Name = request.Name ?? $"Re-forecast v{newVersionNumber}",
                Description = request.Description,
                Type = ProjectBudgetType.Reforecast,
                VersionNumber = newVersionNumber,
                IsActive = false,
                PreviousVersionId = baseBudget.Id,
                TotalBudgetedHours = request.TotalBudgetedHours ?? baseBudget.TotalBudgetedHours,
                Status = ProjectBudgetStatus.Draft,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = userId.Value
            };

            _context.ProjectBudgets.Add(reforecast);

            // Copy lines from base budget if not provided
            var linesToCopy = request.Lines ?? baseBudget.Lines.Select(l => new BudgetLineRequest
            {
                Year = l.Year,
                Month = l.Month,
                BudgetedHours = l.BudgetedHours,
                WbsElementId = l.WbsElementId,
                LaborCategoryId = l.LaborCategoryId,
                Notes = l.Notes
            }).ToList();

            foreach (var line in linesToCopy)
            {
                _context.ProjectBudgetLines.Add(new ProjectBudgetLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId.Value,
                    ProjectBudgetId = reforecast.Id,
                    Year = line.Year,
                    Month = line.Month,
                    BudgetedHours = line.BudgetedHours,
                    WbsElementId = line.WbsElementId,
                    LaborCategoryId = line.LaborCategoryId,
                    Notes = line.Notes,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = userId.Value
                });
            }

            _context.ProjectBudgetHistories.Add(new ProjectBudgetHistory
            {
                Id = Guid.NewGuid(),
                ProjectBudgetId = reforecast.Id,
                ChangedByUserId = userId.Value,
                ChangedAt = DateTime.UtcNow,
                ChangeType = ProjectBudgetChangeType.Created,
                NewTotalHours = reforecast.TotalBudgetedHours,
                NewStatus = reforecast.Status,
                ChangeReason = $"Re-forecast created from budget v{baseBudget.VersionNumber}"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Re-forecast {ReforecastId} created from budget {BaseBudgetId} by user {UserId}",
                reforecast.Id, id, userId);

            return CreatedAtAction(nameof(GetProjectBudget), new { id = reforecast.Id }, MapToDetailDto(reforecast));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating re-forecast from budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while creating the re-forecast");
        }
    }

    // GET: api/projectbudgets/fiscalyear/current
    [HttpGet("fiscalyear/current")]
    public async Task<ActionResult<FiscalYearInfo>> GetCurrentFiscalYearInfo()
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var settings = await _context.TenantSettings
                .FirstOrDefaultAsync(s => s.TenantId == tenantId.Value);

            // Default to January (1) if not set or set to 0
            var fiscalYearStartMonth = settings?.FiscalYearStartMonth ?? 1;
            if (fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12)
                fiscalYearStartMonth = 1;
            var currentFY = GetCurrentFiscalYear(tenantId.Value, fiscalYearStartMonth);

            return Ok(new FiscalYearInfo
            {
                CurrentFiscalYear = currentFY,
                FiscalYearStartMonth = fiscalYearStartMonth,
                FiscalYearStart = new DateOnly(fiscalYearStartMonth > DateTime.Now.Month ? currentFY - 1 : currentFY, fiscalYearStartMonth, 1),
                FiscalYearEnd = new DateOnly(fiscalYearStartMonth > 1 ? currentFY : currentFY + 1, fiscalYearStartMonth == 1 ? 12 : fiscalYearStartMonth - 1, 1).AddMonths(1).AddDays(-1)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting fiscal year info");
            return StatusCode(500, "An error occurred while retrieving fiscal year info");
        }
    }

    // DELETE: api/projectbudgets/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "ProjectBudget", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteProjectBudget(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = TryGetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid tenant or user context" });

            var budget = await _context.ProjectBudgets
                .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId.Value);

            if (budget == null)
                return NotFound($"Budget with ID {id} not found");

            // Can only delete draft budgets that aren't active
            if (budget.Status != ProjectBudgetStatus.Draft)
                return BadRequest(new { message = "Can only delete draft budgets" });

            if (budget.IsActive)
                return BadRequest(new { message = "Cannot delete active budget" });

            // Soft delete
            budget.IsDeleted = true;
            budget.DeletedAt = DateTime.UtcNow;
            budget.DeletedByUserId = userId.Value;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Project budget {BudgetId} deleted by user {UserId}", id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project budget {BudgetId}", id);
            return StatusCode(500, "An error occurred while deleting the budget");
        }
    }

    private int GetCurrentFiscalYear(Guid tenantId, int? fiscalYearStartMonth = null)
    {
        var startMonth = fiscalYearStartMonth ?? 1;
        var now = DateTime.Now;

        // If we're before the fiscal year start month, we're in the previous fiscal year
        if (now.Month < startMonth)
            return now.Year;

        // If fiscal year starts in January, the FY is the calendar year
        // Otherwise, FY is the year the fiscal year ends in
        return startMonth == 1 ? now.Year : now.Year + 1;
    }

    private static ProjectBudgetDetailDto MapToDetailDto(ProjectBudget budget)
    {
        return new ProjectBudgetDetailDto
        {
            Id = budget.Id,
            ProjectId = budget.ProjectId,
            ProjectName = budget.Project?.Name ?? "",
            ProjectCode = budget.Project?.ProgramCode,
            FiscalYear = budget.FiscalYear,
            Name = budget.Name,
            Description = budget.Description,
            Type = budget.Type,
            VersionNumber = budget.VersionNumber,
            IsActive = budget.IsActive,
            PreviousVersionId = budget.PreviousVersionId,
            TotalBudgetedHours = budget.TotalBudgetedHours,
            Status = budget.Status,
            EffectiveFrom = budget.EffectiveFrom,
            EffectiveTo = budget.EffectiveTo,
            SubmittedAt = budget.SubmittedAt,
            SubmittedByUserName = budget.SubmittedByUser?.DisplayName,
            ApprovedAt = budget.ApprovedAt,
            ApprovedByUserName = budget.ApprovedByUser?.DisplayName,
            ApprovalNotes = budget.ApprovalNotes,
            Notes = budget.Notes,
            CreatedAt = budget.CreatedAt,
            UpdatedAt = budget.UpdatedAt,
            Lines = budget.Lines?.Select(l => new BudgetLineDto
            {
                Id = l.Id,
                Year = l.Year,
                Month = l.Month,
                BudgetedHours = l.BudgetedHours,
                WbsElementId = l.WbsElementId,
                WbsElementCode = l.WbsElement?.Code,
                WbsElementDescription = l.WbsElement?.Description,
                LaborCategoryId = l.LaborCategoryId,
                LaborCategoryName = l.LaborCategory?.Name,
                Notes = l.Notes
            }).OrderBy(l => l.Year).ThenBy(l => l.Month).ToList() ?? new List<BudgetLineDto>()
        };
    }
}

// DTOs
public class ProjectBudgetDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = "";
    public string? ProjectCode { get; set; }
    public int FiscalYear { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public ProjectBudgetType Type { get; set; }
    public int VersionNumber { get; set; }
    public bool IsActive { get; set; }
    public decimal TotalBudgetedHours { get; set; }
    public ProjectBudgetStatus Status { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }
    public bool HasMonthlyLines { get; set; }
}

public class ProjectBudgetDetailDto : ProjectBudgetDto
{
    public Guid? PreviousVersionId { get; set; }
    public string? SubmittedByUserName { get; set; }
    public string? ApprovedByUserName { get; set; }
    public string? ApprovalNotes { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<BudgetLineDto> Lines { get; set; } = new();
}

public class BudgetLineDto
{
    public Guid Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal BudgetedHours { get; set; }
    public Guid? WbsElementId { get; set; }
    public string? WbsElementCode { get; set; }
    public string? WbsElementDescription { get; set; }
    public Guid? LaborCategoryId { get; set; }
    public string? LaborCategoryName { get; set; }
    public string? Notes { get; set; }
}

public class CreateProjectBudgetRequest
{
    public Guid ProjectId { get; set; }
    public int FiscalYear { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("budgetType")]
    public ProjectBudgetType Type { get; set; } = ProjectBudgetType.Original;
    public bool IsActive { get; set; } = false;
    public Guid? PreviousVersionId { get; set; }
    public decimal TotalBudgetedHours { get; set; }
    public string? Notes { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("budgetLines")]
    public List<BudgetLineRequest>? Lines { get; set; }
}

public class UpdateProjectBudgetRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? TotalBudgetedHours { get; set; }
    public bool? IsActive { get; set; }
    public string? Notes { get; set; }
    public List<BudgetLineRequest>? Lines { get; set; }
}

public class BudgetLineRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal BudgetedHours { get; set; }
    public Guid? WbsElementId { get; set; }
    public Guid? LaborCategoryId { get; set; }
    public string? Notes { get; set; }
}

public class CreateReforecastRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? TotalBudgetedHours { get; set; }
    public string? Notes { get; set; }
    public List<BudgetLineRequest>? Lines { get; set; }
}

public class ApprovalRequest
{
    public string? Notes { get; set; }
}

public class FiscalYearInfo
{
    public int CurrentFiscalYear { get; set; }
    public int FiscalYearStartMonth { get; set; }
    public DateOnly FiscalYearStart { get; set; }
    public DateOnly FiscalYearEnd { get; set; }
}

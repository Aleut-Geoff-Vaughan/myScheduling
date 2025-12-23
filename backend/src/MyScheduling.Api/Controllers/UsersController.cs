using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;
using MyScheduling.Api.Models;
using System.ComponentModel.DataAnnotations;
using BCrypt.Net;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuthorizationService _authService;

    public UsersController(
        MySchedulingDbContext context,
        ILogger<UsersController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    // PATCH: api/users/{id}/profile
    [HttpPatch("{id}/profile")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<User>> UpdateUserProfile(Guid id, [FromBody] UpdateUserProfileRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required");
            }

            // Check duplicate email (other users) - AsNoTracking for read-only check
            var existingUser = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id != id)
                .FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                return Conflict($"Another user already has email {request.Email}");
            }

            // Capture before state for audit logging
            var beforeState = new
            {
                user.Email,
                user.DisplayName,
                user.IsSystemAdmin,
                user.ManagerId,
                user.HomeOfficeId,
                user.ExecutiveAssistantId,
                user.JobTitle,
                user.Department
            };

            user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? user.DisplayName : request.DisplayName;
            user.Email = request.Email;
            user.PhoneNumber = request.PhoneNumber;
            user.JobTitle = request.JobTitle;
            user.Department = request.Department;
            if (Guid.TryParse(request.ManagerId, out var managerId))
            {
                user.ManagerId = managerId;
            }
            else if (string.IsNullOrWhiteSpace(request.ManagerId))
            {
                user.ManagerId = null;
            }

            // Track IsSystemAdmin changes for security audit
            var isSystemAdminChanged = false;
            var previousIsSystemAdmin = user.IsSystemAdmin;
            if (request.IsSystemAdmin.HasValue)
            {
                isSystemAdminChanged = user.IsSystemAdmin != request.IsSystemAdmin.Value;
                user.IsSystemAdmin = request.IsSystemAdmin.Value;
            }

            // Home Office
            if (Guid.TryParse(request.HomeOfficeId, out var homeOfficeId))
            {
                user.HomeOfficeId = homeOfficeId;
            }
            else if (string.IsNullOrWhiteSpace(request.HomeOfficeId))
            {
                user.HomeOfficeId = null;
            }

            // Executive Assistant
            if (Guid.TryParse(request.ExecutiveAssistantId, out var executiveAssistantId))
            {
                user.ExecutiveAssistantId = executiveAssistantId;
            }
            else if (string.IsNullOrWhiteSpace(request.ExecutiveAssistantId))
            {
                user.ExecutiveAssistantId = null;
            }

            // Standard Delegates
            if (request.StandardDelegateIds != null)
            {
                user.StandardDelegateIds = request.StandardDelegateIds
                    .Where(id => Guid.TryParse(id, out _))
                    .Select(id => Guid.Parse(id))
                    .ToList();
            }

            // Entra Object ID
            if (!string.IsNullOrWhiteSpace(request.EntraObjectId))
            {
                user.EntraObjectId = request.EntraObjectId;
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log profile update with before/after comparison
            _logger.LogWarning(
                "AUDIT: User profile updated. UserId={UserId}, Email={Email}, UpdatedBy={UpdatedBy}, " +
                "BeforeState={BeforeState}, AfterState={AfterState}, CorrelationId={CorrelationId}",
                id, user.Email, GetCurrentUserId(),
                System.Text.Json.JsonSerializer.Serialize(beforeState),
                System.Text.Json.JsonSerializer.Serialize(new { user.Email, user.DisplayName, user.IsSystemAdmin, user.ManagerId, user.HomeOfficeId, user.ExecutiveAssistantId, user.JobTitle, user.Department }),
                GetCorrelationId());

            // Special security alert for IsSystemAdmin changes (privilege escalation/demotion)
            if (isSystemAdminChanged)
            {
                _logger.LogWarning(
                    "AUDIT: SECURITY - IsSystemAdmin flag changed. UserId={UserId}, Email={Email}, " +
                    "PreviousValue={PreviousValue}, NewValue={NewValue}, ChangedBy={ChangedBy}, CorrelationId={CorrelationId}",
                    id, user.Email, previousIsSystemAdmin, user.IsSystemAdmin, GetCurrentUserId(), GetCorrelationId());
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: User profile update failed. UserId={UserId}, UpdatedBy={UpdatedBy}, CorrelationId={CorrelationId}",
                id, GetCurrentUserId(), GetCorrelationId());
            return InternalServerError("An error occurred while updating the user");
        }
    }

    // GET: api/users
    // Returns all users with tenant memberships
    // Use ?tenantId=xxx for tenant-specific filtering (Tenant Admin view)
    // No tenantId parameter returns all users across all tenants (System Admin view)
    [HttpGet]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeInactive = false)
    {
        try
        {
            // Optimize: Add AsNoTracking for read-only list query
            var query = _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .AsNoTracking()
                .AsQueryable();

            // Filter by tenant if specified (Tenant Admin view)
            if (tenantId.HasValue)
            {
                query = query.Where(u => u.TenantMemberships.Any(tm =>
                    tm.TenantId == tenantId.Value &&
                    (includeInactive || tm.IsActive)));
            }

            // Search by name or email
            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u =>
                    u.DisplayName.Contains(search) ||
                    u.Email.Contains(search));
            }

            var users = await query
                .OrderBy(u => u.DisplayName)
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users. TenantId: {TenantId}, Search: {Search}, CorrelationId: {CorrelationId}",
                tenantId, search, GetCorrelationId());
            return InternalServerError("An error occurred while retrieving users");
        }
    }

    // GET: api/users/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<User>> GetUser(Guid id)
    {
        try
        {
            // Optimize: Add AsNoTracking for read-only detail query
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user {UserId}. CorrelationId: {CorrelationId}",
                id, GetCorrelationId());
            return InternalServerError("An error occurred while retrieving the user");
        }
    }

    // GET: api/users/{id}/logins
    [HttpGet("{id}/logins")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<object>> GetUserLogins(Guid id, [FromQuery] int take = 10)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            take = Math.Clamp(take, 1, 100);

            // Optimize: Add AsNoTracking for read-only audit query
            var query = _context.LoginAudits
                .AsNoTracking()
                .Where(l => l.UserId == id)
                .OrderByDescending(l => l.CreatedAt);

            var total = await query.CountAsync();
            var lastSuccess = await query.Where(l => l.IsSuccess).FirstOrDefaultAsync();
            var lastFailed = await query.Where(l => !l.IsSuccess).FirstOrDefaultAsync();
            var items = await query.Take(take).ToListAsync();

            return Ok(new
            {
                totalLogins = total,
                lastSuccessfulAt = lastSuccess?.CreatedAt,
                lastFailedAt = lastFailed?.CreatedAt,
                logins = items.Select(l => new
                {
                    l.Id,
                    l.Email,
                    l.IsSuccess,
                    l.IpAddress,
                    l.UserAgent,
                    l.CreatedAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving login history for user {UserId}", id);
            return StatusCode(500, CreateErrorResponse("An error occurred while retrieving login history"));
        }
    }

    // POST: api/users
    [HttpPost]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Create)]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        try
        {
            // Check for duplicate email (globally unique now)
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == user.Email);

            if (existingUser != null)
            {
                return Conflict($"A user with email {user.Email} already exists in this tenant");
            }

            // Check for duplicate EntraObjectId
            var existingEntraUser = await _context.Users
                .FirstOrDefaultAsync(u => u.EntraObjectId == user.EntraObjectId);

            if (existingEntraUser != null)
            {
                return Conflict($"A user with Entra Object ID {user.EntraObjectId} already exists");
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "AUDIT: User created. NewUserId={NewUserId}, Email={Email}, DisplayName={DisplayName}, " +
                "IsSystemAdmin={IsSystemAdmin}, IsActive={IsActive}, CreatedBy={CreatedBy}, CorrelationId={CorrelationId}",
                user.Id, user.Email, user.DisplayName, user.IsSystemAdmin, user.IsActive,
                GetCurrentUserId(), GetCorrelationId());

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: User creation failed. Email={Email}, CreatedBy={CreatedBy}, CorrelationId={CorrelationId}",
                user.Email, GetCurrentUserId(), GetCorrelationId());
            return StatusCode(500, "An error occurred while creating the user");
        }
    }

    // PUT: api/users/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateUser(Guid id, User user)
    {
        if (id != user.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await UserExists(id))
                {
                    return NotFound($"User with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId}", id);
            return StatusCode(500, "An error occurred while updating the user");
        }
    }

    // DELETE: api/users/{id} (Hard Delete with Archive - Platform Admin Only)
    // Query params:
    //   force=true - Force delete by removing/reassigning all dependent records
    //   reassignTo={userId} - When force=true, reassign ownership records to this user (optional)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> DeleteUser(
        Guid id,
        [FromQuery] bool force = false,
        [FromQuery] Guid? reassignTo = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            // Validate reassignTo user exists if provided
            User? reassignToUser = null;
            if (reassignTo.HasValue)
            {
                reassignToUser = await _context.Users.FindAsync(reassignTo.Value);
                if (reassignToUser == null)
                {
                    return BadRequest($"Reassign target user with ID {reassignTo.Value} not found");
                }
                if (reassignTo.Value == id)
                {
                    return BadRequest("Cannot reassign records to the user being deleted");
                }
            }

            // Check for blocking dependencies (entities with Restrict delete behavior)
            var blockingDependencies = await CheckBlockingDependenciesAsync(id);

            if (blockingDependencies.Count > 0 && !force)
            {
                _logger.LogWarning(
                    "Cannot delete user {UserId} ({Email}): blocking dependencies found: {Dependencies}",
                    id, user.Email, string.Join(", ", blockingDependencies));

                return Conflict(new
                {
                    message = "Cannot delete user due to existing dependent records",
                    dependencies = blockingDependencies,
                    suggestion = "Please reassign or remove these records before deleting the user, or deactivate the user instead.",
                    forceDeleteAvailable = true,
                    forceDeleteUrl = $"/api/users/{id}?force=true",
                    reassignUrl = $"/api/users/{id}?force=true&reassignTo={{targetUserId}}"
                });
            }

            // If force delete, handle all dependent records
            if (force)
            {
                _logger.LogWarning(
                    "FORCE DELETE initiated for user {UserId} ({Email}) by {DeletedBy}. Dependencies: {Dependencies}. ReassignTo: {ReassignTo}",
                    id, user.Email, GetCurrentUserId(), string.Join(", ", blockingDependencies), reassignTo?.ToString() ?? "NONE (will delete)");

                try
                {
                    var deletionSummary = await HandleDependentRecordsAsync(id, reassignTo);

                    _logger.LogWarning(
                        "Dependent records handled for user {UserId}: {Summary}",
                        id, string.Join(", ", deletionSummary.Select(kv => $"{kv.Key}: {kv.Value}")));
                }
                catch (Exception handleEx)
                {
                    _logger.LogError(handleEx, "Error handling dependent records for user {UserId}. Inner: {Inner}",
                        id, handleEx.InnerException?.Message);
                    throw;
                }
            }

            // Nullify nullable foreign key references (entities with SetNull behavior are handled by EF)
            // But we need to manually handle some that might not cascade properly
            await NullifyUserReferencesAsync(id);

            // Get the admin user performing the deletion
            var adminUserId = GetCurrentUserId();

            // Log details about the deletion for audit purposes
            // Note: DataArchive entity has a schema issue (dual FK columns) that prevents archive creation.
            // The deletion details are logged here instead.
            _logger.LogWarning(
                "User deletion initiated. UserBeingDeleted={UserId}, Email={Email}, DisplayName={DisplayName}, " +
                "AdminUserId={AdminUserId}, Force={Force}, ReassignTo={ReassignTo}",
                id, user.Email, user.DisplayName, adminUserId, force, reassignTo);

            // Delete the user (archive creation skipped due to DataArchive entity FK mapping issue)
            _context.Users.Remove(user);

            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "User HARD DELETED: {UserId} (Email: {Email}, DisplayName: {DisplayName}, IsActive: {IsActive}, CreatedAt: {CreatedAt}) by user {DeletedBy}. Force: {Force}, ReassignTo: {ReassignTo}",
                id, user.Email, user.DisplayName, user.IsActive, user.CreatedAt, adminUserId, force, reassignTo);

            return NoContent();
        }
        catch (DbUpdateException dbEx)
        {
            var innerMsg = dbEx.InnerException?.Message ?? dbEx.Message;
            var innerInner = dbEx.InnerException?.InnerException?.Message;
            _logger.LogError(dbEx, "Database error deleting user {UserId}. Error: {Error}. Inner: {Inner}. InnerInner: {InnerInner}",
                id, dbEx.Message, innerMsg, innerInner);
            Console.WriteLine($"[DELETE USER ERROR] DbUpdateException for {id}: {dbEx.Message} | Inner: {innerMsg} | InnerInner: {innerInner}");
            return StatusCode(500, new
            {
                message = "Cannot delete user due to database constraints. The user may have records that must be removed first.",
                error = innerMsg,
                innerError = innerInner,
                stackTrace = dbEx.StackTrace?.Split('\n').Take(5).ToArray()
            });
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message;
            var innerInner = ex.InnerException?.InnerException?.Message;
            _logger.LogError(ex, "Error deleting user {UserId}. Error: {Error}. Inner: {Inner}. InnerInner: {InnerInner}",
                id, ex.Message, innerMsg, innerInner);
            Console.WriteLine($"[DELETE USER ERROR] Exception for {id}: {ex.Message} | Inner: {innerMsg} | InnerInner: {innerInner}");
            return StatusCode(500, new {
                message = "Error deleting user",
                error = ex.Message,
                innerError = innerMsg,
                innerInnerError = innerInner,
                exceptionType = ex.GetType().Name,
                stackTrace = ex.StackTrace?.Split('\n').Take(5).ToArray()
            });
        }
    }

    /// <summary>
    /// Check for entities that would block user deletion (Restrict delete behavior)
    /// </summary>
    private async Task<List<string>> CheckBlockingDependenciesAsync(Guid userId)
    {
        var dependencies = new List<string>();

        // ========== CRITICAL: Core User-linked entities ==========

        // TenantMemberships - user's workspace memberships (required FK)
        var tenantMembershipCount = await _context.TenantMemberships
            .CountAsync(tm => tm.UserId == userId);
        if (tenantMembershipCount > 0)
            dependencies.Add($"Tenant Memberships ({tenantMembershipCount})");

        // RefreshTokens - user's active sessions (required FK)
        var refreshTokenCount = await _context.RefreshTokens
            .CountAsync(rt => rt.UserId == userId);
        if (refreshTokenCount > 0)
            dependencies.Add($"Refresh Tokens ({refreshTokenCount})");

        // MagicLinkTokens - user's magic link auth tokens (required FK)
        var magicLinkCount = await _context.MagicLinkTokens
            .CountAsync(m => m.UserId == userId);
        if (magicLinkCount > 0)
            dependencies.Add($"Magic Link Tokens ({magicLinkCount})");

        // RoleAssignments - user's role assignments (required FK)
        var roleAssignmentCount = await _context.RoleAssignments
            .CountAsync(ra => ra.UserId == userId);
        if (roleAssignmentCount > 0)
            dependencies.Add($"Role Assignments ({roleAssignmentCount})");

        // GroupMembers - user's group memberships (required FK)
        var groupMemberCount = await _context.GroupMembers
            .CountAsync(gm => gm.UserId == userId);
        if (groupMemberCount > 0)
            dependencies.Add($"Group Memberships ({groupMemberCount})");

        // Assignments - user's work assignments (required FK)
        var assignmentCount = await _context.Assignments
            .CountAsync(a => a.UserId == userId);
        if (assignmentCount > 0)
            dependencies.Add($"Work Assignments ({assignmentCount})");

        // ProjectAssignments - user's project assignments (required FK)
        var projectAssignmentCount = await _context.ProjectAssignments
            .CountAsync(pa => pa.UserId == userId);
        if (projectAssignmentCount > 0)
            dependencies.Add($"Project Assignments ({projectAssignmentCount})");

        // EmployeeCostRates - user's cost rate records (required FK)
        var costRateCount = await _context.EmployeeCostRates
            .CountAsync(cr => cr.UserId == userId);
        if (costRateCount > 0)
            dependencies.Add($"Cost Rates ({costRateCount})");

        // WorkLocationTemplates - user's location templates (required FK)
        var workLocationTemplateCount = await _context.WorkLocationTemplates
            .CountAsync(wlt => wlt.UserId == userId);
        if (workLocationTemplateCount > 0)
            dependencies.Add($"Work Location Templates ({workLocationTemplateCount})");

        // TeamCalendarMembers - user's calendar memberships (required FK)
        var calendarMemberCount = await _context.TeamCalendarMembers
            .CountAsync(tcm => tcm.UserId == userId);
        if (calendarMemberCount > 0)
            dependencies.Add($"Team Calendar Memberships ({calendarMemberCount})");

        // AuthorizationAuditLogs - user's auth audit logs (required FK)
        var authAuditCount = await _context.AuthorizationAuditLogs
            .CountAsync(aal => aal.UserId == userId);
        if (authAuditCount > 0)
            dependencies.Add($"Authorization Audit Logs ({authAuditCount})");

        // ========== Hoteling entities ==========

        // Bookings - user's space bookings (required FK)
        var bookingCount = await _context.Bookings
            .CountAsync(b => b.UserId == userId);
        if (bookingCount > 0)
            dependencies.Add($"Space Bookings ({bookingCount})");

        // SpaceAssignments - user's permanent space assignments (required FK)
        var spaceAssignmentCount = await _context.SpaceAssignments
            .CountAsync(sa => sa.UserId == userId);
        if (spaceAssignmentCount > 0)
            dependencies.Add($"Space Assignments ({spaceAssignmentCount})");

        // ========== Facilities entities ==========

        // FacilityCheckIns - user's facility check-ins (required FK)
        var facilityCheckInCount = await _context.FacilityCheckIns
            .CountAsync(fci => fci.UserId == userId);
        if (facilityCheckInCount > 0)
            dependencies.Add($"Facility Check-Ins ({facilityCheckInCount})");

        // FieldAssignments - user's field assignments (required FK)
        var fieldAssignmentCount = await _context.FieldAssignments
            .CountAsync(fa => fa.UserId == userId);
        if (fieldAssignmentCount > 0)
            dependencies.Add($"Field Assignments ({fieldAssignmentCount})");

        // EmployeeClearances - user's security clearances (required FK)
        var clearanceCount = await _context.EmployeeClearances
            .CountAsync(ec => ec.UserId == userId);
        if (clearanceCount > 0)
            dependencies.Add($"Employee Clearances ({clearanceCount})");

        // ForeignTravelRecords - user's foreign travel records (required FK)
        var travelRecordCount = await _context.ForeignTravelRecords
            .CountAsync(ftr => ftr.UserId == userId);
        if (travelRecordCount > 0)
            dependencies.Add($"Foreign Travel Records ({travelRecordCount})");

        // ScifAccessLogs - user's SCIF access logs (required FK)
        var scifAccessCount = await _context.ScifAccessLogs
            .CountAsync(sal => sal.UserId == userId);
        if (scifAccessCount > 0)
            dependencies.Add($"SCIF Access Logs ({scifAccessCount})");

        // ========== Resume entities ==========

        // ResumeProfiles - user's resume profile (required FK)
        var resumeProfileCount = await _context.ResumeProfiles
            .CountAsync(rp => rp.UserId == userId);
        if (resumeProfileCount > 0)
            dependencies.Add($"Resume Profiles ({resumeProfileCount})");

        // LinkedInImports - user's LinkedIn imports (required FK)
        var linkedInImportUserCount = await _context.LinkedInImports
            .CountAsync(li => li.UserId == userId);
        if (linkedInImportUserCount > 0)
            dependencies.Add($"LinkedIn Import Records ({linkedInImportUserCount})");

        // ========== Data Archive entities ==========

        // DataArchives - user created archives (required FK ArchivedByUserId)
        var dataArchiveCount = await _context.DataArchives
            .CountAsync(da => da.ArchivedByUserId == userId);
        if (dataArchiveCount > 0)
            dependencies.Add($"Data Archives (Created By) ({dataArchiveCount})");

        // DataArchiveExports - user requested exports (required FK RequestedByUserId)
        var dataArchiveExportCount = await _context.DataArchiveExports
            .CountAsync(dae => dae.RequestedByUserId == userId);
        if (dataArchiveExportCount > 0)
            dependencies.Add($"Data Archive Exports ({dataArchiveExportCount})");

        // ========== Original dependencies (history/audit records) ==========

        // AssignmentRequests - user is the requester or requested-for person
        var assignmentRequestCount = await _context.AssignmentRequests
            .CountAsync(r => r.RequestedByUserId == userId || r.RequestedForUserId == userId);
        if (assignmentRequestCount > 0)
            dependencies.Add($"Assignment Requests ({assignmentRequestCount})");

        // WbsChangeHistory - user made changes to WBS elements
        var wbsChangeCount = await _context.WbsChangeHistories
            .CountAsync(h => h.ChangedByUserId == userId);
        if (wbsChangeCount > 0)
            dependencies.Add($"WBS Change History ({wbsChangeCount})");

        // ForecastHistory - user made forecast changes
        var forecastHistoryCount = await _context.ForecastHistories
            .CountAsync(h => h.ChangedByUserId == userId);
        if (forecastHistoryCount > 0)
            dependencies.Add($"Forecast History ({forecastHistoryCount})");

        // ForecastImportExports - user performed import/export
        var importExportCount = await _context.ForecastImportExports
            .CountAsync(o => o.OperationByUserId == userId);
        if (importExportCount > 0)
            dependencies.Add($"Forecast Import/Export Operations ({importExportCount})");

        // ProjectBudgetHistory - user made budget changes
        var budgetHistoryCount = await _context.ProjectBudgetHistories
            .CountAsync(h => h.ChangedByUserId == userId);
        if (budgetHistoryCount > 0)
            dependencies.Add($"Budget History ({budgetHistoryCount})");

        // SpaceMaintenanceLogs - user reported maintenance issues
        var maintenanceCount = await _context.SpaceMaintenanceLogs
            .CountAsync(m => m.ReportedByUserId == userId);
        if (maintenanceCount > 0)
            dependencies.Add($"Maintenance Logs ({maintenanceCount})");

        // ResumeVersions (CreatedBy) - user created resume versions
        var resumeVersionCount = await _context.ResumeVersions
            .CountAsync(v => v.CreatedByUserId == userId);
        if (resumeVersionCount > 0)
            dependencies.Add($"Resume Versions Created ({resumeVersionCount})");

        // ResumeDocuments - user generated resume documents
        var resumeDocCount = await _context.ResumeDocuments
            .CountAsync(d => d.GeneratedByUserId == userId);
        if (resumeDocCount > 0)
            dependencies.Add($"Resume Documents ({resumeDocCount})");

        // ResumeApprovals - user requested approvals
        var resumeApprovalCount = await _context.ResumeApprovals
            .CountAsync(a => a.RequestedByUserId == userId);
        if (resumeApprovalCount > 0)
            dependencies.Add($"Resume Approvals ({resumeApprovalCount})");

        // LinkedInImports - user imported resumes from LinkedIn
        var resumeImportCount = await _context.LinkedInImports
            .CountAsync(j => j.ImportedByUserId == userId);
        if (resumeImportCount > 0)
            dependencies.Add($"Resume Imports ({resumeImportCount})");

        // ResumeShareLinks - user created share links
        var shareLinksCount = await _context.ResumeShareLinks
            .CountAsync(s => s.CreatedByUserId == userId);
        if (shareLinksCount > 0)
            dependencies.Add($"Resume Share Links ({shareLinksCount})");

        // FileAccessLogs - user accessed files
        var fileAccessCount = await _context.FileAccessLogs
            .CountAsync(l => l.AccessedByUserId == userId);
        if (fileAccessCount > 0)
            dependencies.Add($"File Access Logs ({fileAccessCount})");

        // LeaseAttachments - user uploaded attachments
        var leaseAttachmentCount = await _context.LeaseAttachments
            .CountAsync(a => a.UploadedByUserId == userId);
        if (leaseAttachmentCount > 0)
            dependencies.Add($"Lease Attachments ({leaseAttachmentCount})");

        // FacilityAnnouncements - user authored announcements
        var announcementCount = await _context.FacilityAnnouncements
            .CountAsync(a => a.AuthoredByUserId == userId);
        if (announcementCount > 0)
            dependencies.Add($"Facility Announcements ({announcementCount})");

        // DelegationOfAuthorityLetters - user is delegator or designee
        var doaLetterCount = await _context.DelegationOfAuthorityLetters
            .CountAsync(d => d.DelegatorUserId == userId || d.DesigneeUserId == userId);
        if (doaLetterCount > 0)
            dependencies.Add($"DOA Letters ({doaLetterCount})");

        // DigitalSignatures - user signed documents
        var signatureCount = await _context.DigitalSignatures
            .CountAsync(s => s.SignerUserId == userId);
        if (signatureCount > 0)
            dependencies.Add($"Digital Signatures ({signatureCount})");

        // Feedback - user submitted feedback
        var feedbackCount = await _context.Feedbacks
            .CountAsync(f => f.SubmittedByUserId == userId);
        if (feedbackCount > 0)
            dependencies.Add($"Feedback ({feedbackCount})");

        // ImpersonationSessions - user impersonated or was impersonated
        var impersonationCount = await _context.ImpersonationSessions
            .CountAsync(s => s.AdminUserId == userId || s.ImpersonatedUserId == userId);
        if (impersonationCount > 0)
            dependencies.Add($"Impersonation Sessions ({impersonationCount})");

        // SalesOpportunities - user owns opportunities
        var opportunityCount = await _context.SalesOpportunities
            .CountAsync(o => o.OwnerId == userId);
        if (opportunityCount > 0)
            dependencies.Add($"Sales Opportunities (Owner) ({opportunityCount})");

        // OpportunityFieldHistory - user made changes
        var oppHistoryCount = await _context.OpportunityFieldHistories
            .CountAsync(h => h.ChangedByUserId == userId);
        if (oppHistoryCount > 0)
            dependencies.Add($"Opportunity History ({oppHistoryCount})");

        return dependencies;
    }

    /// <summary>
    /// Nullify user references in entities where the FK is nullable (SetNull behavior)
    /// This helps ensure clean deletion even if cascade doesn't work perfectly
    /// </summary>
    private async Task NullifyUserReferencesAsync(Guid userId)
    {
        // Users managed by this user
        var managedUsers = await _context.Users.Where(u => u.ManagerId == userId).ToListAsync();
        foreach (var u in managedUsers) u.ManagerId = null;

        // Users with this user as executive assistant
        var eaUsers = await _context.Users.Where(u => u.ExecutiveAssistantId == userId).ToListAsync();
        foreach (var u in eaUsers) u.ExecutiveAssistantId = null;

        // Save any changes
        if (managedUsers.Count > 0 || eaUsers.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Handle dependent records for force delete - either reassign to another user or delete
    /// </summary>
    /// <param name="userId">User being deleted</param>
    /// <param name="reassignTo">Optional user to reassign ownership records to</param>
    /// <returns>Dictionary of entity type to action taken (deleted/reassigned count)</returns>
    private async Task<Dictionary<string, string>> HandleDependentRecordsAsync(Guid userId, Guid? reassignTo)
    {
        var summary = new Dictionary<string, string>();
        _logger.LogInformation("HandleDependentRecordsAsync started for user {UserId}", userId);

        // ========== CRITICAL: Core User-linked entities (always delete) ==========

        // TenantMemberships - user's workspace memberships
        var tenantMemberships = await _context.TenantMemberships.Where(tm => tm.UserId == userId).ToListAsync();
        if (tenantMemberships.Count > 0)
        {
            _context.TenantMemberships.RemoveRange(tenantMemberships);
            summary["Tenant Memberships"] = $"Deleted {tenantMemberships.Count}";
        }

        // RefreshTokens - user's active sessions
        var refreshTokens = await _context.RefreshTokens.Where(rt => rt.UserId == userId).ToListAsync();
        if (refreshTokens.Count > 0)
        {
            _context.RefreshTokens.RemoveRange(refreshTokens);
            summary["Refresh Tokens"] = $"Deleted {refreshTokens.Count}";
        }

        // MagicLinkTokens - user's magic link auth tokens
        var magicLinkTokens = await _context.MagicLinkTokens.Where(m => m.UserId == userId).ToListAsync();
        if (magicLinkTokens.Count > 0)
        {
            _context.MagicLinkTokens.RemoveRange(magicLinkTokens);
            summary["Magic Link Tokens"] = $"Deleted {magicLinkTokens.Count}";
        }

        // RoleAssignments - user's role assignments
        var roleAssignments = await _context.RoleAssignments.Where(ra => ra.UserId == userId).ToListAsync();
        if (roleAssignments.Count > 0)
        {
            _context.RoleAssignments.RemoveRange(roleAssignments);
            summary["Role Assignments"] = $"Deleted {roleAssignments.Count}";
        }

        // GroupMembers - user's group memberships
        var groupMembers = await _context.GroupMembers.Where(gm => gm.UserId == userId).ToListAsync();
        if (groupMembers.Count > 0)
        {
            _context.GroupMembers.RemoveRange(groupMembers);
            summary["Group Memberships"] = $"Deleted {groupMembers.Count}";
        }

        // AuthorizationAuditLogs - user's auth audit logs
        var authAuditLogs = await _context.AuthorizationAuditLogs.Where(aal => aal.UserId == userId).ToListAsync();
        if (authAuditLogs.Count > 0)
        {
            _context.AuthorizationAuditLogs.RemoveRange(authAuditLogs);
            summary["Authorization Audit Logs"] = $"Deleted {authAuditLogs.Count}";
        }

        // ========== Work Assignments (reassignable) ==========

        // Assignments - user's work assignments
        var assignments = await _context.Assignments.Where(a => a.UserId == userId).ToListAsync();
        if (assignments.Count > 0)
        {
            if (reassignTo.HasValue)
            {
                foreach (var a in assignments) a.UserId = reassignTo.Value;
                summary["Work Assignments"] = $"Reassigned {assignments.Count}";
            }
            else
            {
                _context.Assignments.RemoveRange(assignments);
                summary["Work Assignments"] = $"Deleted {assignments.Count}";
            }
        }

        // ProjectAssignments - user's project assignments
        var projectAssignments = await _context.ProjectAssignments.Where(pa => pa.UserId == userId).ToListAsync();
        if (projectAssignments.Count > 0)
        {
            if (reassignTo.HasValue)
            {
                foreach (var pa in projectAssignments) pa.UserId = reassignTo.Value;
                summary["Project Assignments"] = $"Reassigned {projectAssignments.Count}";
            }
            else
            {
                _context.ProjectAssignments.RemoveRange(projectAssignments);
                summary["Project Assignments"] = $"Deleted {projectAssignments.Count}";
            }
        }

        // ========== Employee data (always delete - user-specific) ==========

        // EmployeeCostRates - user's cost rate records
        var costRates = await _context.EmployeeCostRates.Where(cr => cr.UserId == userId).ToListAsync();
        if (costRates.Count > 0)
        {
            _context.EmployeeCostRates.RemoveRange(costRates);
            summary["Cost Rates"] = $"Deleted {costRates.Count}";
        }

        // WorkLocationTemplates - user's location templates
        var workLocationTemplates = await _context.WorkLocationTemplates.Where(wlt => wlt.UserId == userId).ToListAsync();
        if (workLocationTemplates.Count > 0)
        {
            _context.WorkLocationTemplates.RemoveRange(workLocationTemplates);
            summary["Work Location Templates"] = $"Deleted {workLocationTemplates.Count}";
        }

        // TeamCalendarMembers - user's calendar memberships
        var calendarMembers = await _context.TeamCalendarMembers.Where(tcm => tcm.UserId == userId).ToListAsync();
        if (calendarMembers.Count > 0)
        {
            _context.TeamCalendarMembers.RemoveRange(calendarMembers);
            summary["Team Calendar Members"] = $"Deleted {calendarMembers.Count}";
        }

        // ========== Hoteling entities (always delete - user-specific) ==========

        // Bookings - user's space bookings
        var bookings = await _context.Bookings.Where(b => b.UserId == userId).ToListAsync();
        if (bookings.Count > 0)
        {
            _context.Bookings.RemoveRange(bookings);
            summary["Space Bookings"] = $"Deleted {bookings.Count}";
        }

        // SpaceAssignments - user's permanent space assignments
        var spaceAssignments = await _context.SpaceAssignments.Where(sa => sa.UserId == userId).ToListAsync();
        if (spaceAssignments.Count > 0)
        {
            _context.SpaceAssignments.RemoveRange(spaceAssignments);
            summary["Space Assignments"] = $"Deleted {spaceAssignments.Count}";
        }

        // ========== Facilities entities (always delete - user-specific) ==========

        // FacilityCheckIns - user's facility check-ins
        var facilityCheckIns = await _context.FacilityCheckIns.Where(fci => fci.UserId == userId).ToListAsync();
        if (facilityCheckIns.Count > 0)
        {
            _context.FacilityCheckIns.RemoveRange(facilityCheckIns);
            summary["Facility Check-Ins"] = $"Deleted {facilityCheckIns.Count}";
        }

        // FieldAssignments - user's field assignments
        var fieldAssignments = await _context.FieldAssignments.Where(fa => fa.UserId == userId).ToListAsync();
        if (fieldAssignments.Count > 0)
        {
            _context.FieldAssignments.RemoveRange(fieldAssignments);
            summary["Field Assignments"] = $"Deleted {fieldAssignments.Count}";
        }

        // EmployeeClearances - user's security clearances
        var employeeClearances = await _context.EmployeeClearances.Where(ec => ec.UserId == userId).ToListAsync();
        if (employeeClearances.Count > 0)
        {
            _context.EmployeeClearances.RemoveRange(employeeClearances);
            summary["Employee Clearances"] = $"Deleted {employeeClearances.Count}";
        }

        // ForeignTravelRecords - user's foreign travel records
        var foreignTravelRecords = await _context.ForeignTravelRecords.Where(ftr => ftr.UserId == userId).ToListAsync();
        if (foreignTravelRecords.Count > 0)
        {
            _context.ForeignTravelRecords.RemoveRange(foreignTravelRecords);
            summary["Foreign Travel Records"] = $"Deleted {foreignTravelRecords.Count}";
        }

        // ScifAccessLogs - user's SCIF access logs
        var scifAccessLogs = await _context.ScifAccessLogs.Where(sal => sal.UserId == userId).ToListAsync();
        if (scifAccessLogs.Count > 0)
        {
            _context.ScifAccessLogs.RemoveRange(scifAccessLogs);
            summary["SCIF Access Logs"] = $"Deleted {scifAccessLogs.Count}";
        }

        // ========== Resume entities (always delete - user-specific) ==========

        // ResumeProfiles - user's resume profile
        var resumeProfiles = await _context.ResumeProfiles.Where(rp => rp.UserId == userId).ToListAsync();
        if (resumeProfiles.Count > 0)
        {
            _context.ResumeProfiles.RemoveRange(resumeProfiles);
            summary["Resume Profiles"] = $"Deleted {resumeProfiles.Count}";
        }

        // LinkedInImports (UserId) - user's LinkedIn import records
        var linkedInImportsUser = await _context.LinkedInImports.Where(li => li.UserId == userId).ToListAsync();
        if (linkedInImportsUser.Count > 0)
        {
            _context.LinkedInImports.RemoveRange(linkedInImportsUser);
            summary["LinkedIn Import Records"] = $"Deleted {linkedInImportsUser.Count}";
        }

        // ========== Data Archive entities (must reassign, required FK) ==========

        // Get admin user ID for reassignment (we'll reassign archive ownership to the deleting admin)
        var adminUserId = GetCurrentUserId();
        _logger.LogInformation("DataArchive handling: userId={UserId}, adminUserId={AdminUserId}", userId, adminUserId);

        // DataArchives - reassign ArchivedByUserId to admin
        var dataArchives = await _context.DataArchives.Where(da => da.ArchivedByUserId == userId).ToListAsync();
        _logger.LogInformation("Found {Count} DataArchives with ArchivedByUserId={UserId}", dataArchives.Count, userId);
        if (dataArchives.Count > 0)
        {
            foreach (var da in dataArchives) da.ArchivedByUserId = adminUserId;
            summary["Data Archives (ArchivedBy)"] = $"Reassigned {dataArchives.Count} to admin";
        }

        // DataArchives - nullify optional user references
        var dataArchivesRestored = await _context.DataArchives.Where(da => da.RestoredByUserId == userId).ToListAsync();
        if (dataArchivesRestored.Count > 0)
        {
            foreach (var da in dataArchivesRestored) da.RestoredByUserId = null;
            summary["Data Archives (RestoredBy)"] = $"Nullified {dataArchivesRestored.Count}";
        }

        var dataArchivesDeleted = await _context.DataArchives.Where(da => da.PermanentlyDeletedByUserId == userId).ToListAsync();
        if (dataArchivesDeleted.Count > 0)
        {
            foreach (var da in dataArchivesDeleted) da.PermanentlyDeletedByUserId = null;
            summary["Data Archives (PermanentlyDeletedBy)"] = $"Nullified {dataArchivesDeleted.Count}";
        }

        var dataArchivesExported = await _context.DataArchives.Where(da => da.ExportedByUserId == userId).ToListAsync();
        if (dataArchivesExported.Count > 0)
        {
            foreach (var da in dataArchivesExported) da.ExportedByUserId = null;
            summary["Data Archives (ExportedBy)"] = $"Nullified {dataArchivesExported.Count}";
        }

        // DataArchiveExports - reassign RequestedByUserId to admin
        var dataArchiveExports = await _context.DataArchiveExports.Where(dae => dae.RequestedByUserId == userId).ToListAsync();
        if (dataArchiveExports.Count > 0)
        {
            foreach (var dae in dataArchiveExports) dae.RequestedByUserId = adminUserId;
            summary["Data Archive Exports"] = $"Reassigned {dataArchiveExports.Count} to admin";
        }

        // ========== REASSIGNABLE RECORDS (ownership/authorship) ==========
        // These records can be reassigned to another user if specified

        // Sales Opportunities - reassign ownership
        var opportunities = await _context.SalesOpportunities.Where(o => o.OwnerId == userId).ToListAsync();
        if (opportunities.Count > 0)
        {
            if (reassignTo.HasValue)
            {
                foreach (var o in opportunities) o.OwnerId = reassignTo.Value;
                summary["Sales Opportunities"] = $"Reassigned {opportunities.Count}";
            }
            else
            {
                _context.SalesOpportunities.RemoveRange(opportunities);
                summary["Sales Opportunities"] = $"Deleted {opportunities.Count}";
            }
        }

        // Facility Announcements - reassign authorship
        var announcements = await _context.FacilityAnnouncements.Where(a => a.AuthoredByUserId == userId).ToListAsync();
        if (announcements.Count > 0)
        {
            if (reassignTo.HasValue)
            {
                foreach (var a in announcements) a.AuthoredByUserId = reassignTo.Value;
                summary["Facility Announcements"] = $"Reassigned {announcements.Count}";
            }
            else
            {
                _context.FacilityAnnouncements.RemoveRange(announcements);
                summary["Facility Announcements"] = $"Deleted {announcements.Count}";
            }
        }

        // ========== DELETABLE RECORDS (history/logs - safe to delete) ==========
        // These are audit/history records that can be safely deleted

        // WBS Change History
        var wbsHistory = await _context.WbsChangeHistories.Where(h => h.ChangedByUserId == userId).ToListAsync();
        if (wbsHistory.Count > 0)
        {
            _context.WbsChangeHistories.RemoveRange(wbsHistory);
            summary["WBS Change History"] = $"Deleted {wbsHistory.Count}";
        }

        // Forecast History
        var forecastHistory = await _context.ForecastHistories.Where(h => h.ChangedByUserId == userId).ToListAsync();
        if (forecastHistory.Count > 0)
        {
            _context.ForecastHistories.RemoveRange(forecastHistory);
            summary["Forecast History"] = $"Deleted {forecastHistory.Count}";
        }

        // Forecast Import/Exports
        var importExports = await _context.ForecastImportExports.Where(o => o.OperationByUserId == userId).ToListAsync();
        if (importExports.Count > 0)
        {
            _context.ForecastImportExports.RemoveRange(importExports);
            summary["Forecast Import/Exports"] = $"Deleted {importExports.Count}";
        }

        // Project Budget History
        var budgetHistory = await _context.ProjectBudgetHistories.Where(h => h.ChangedByUserId == userId).ToListAsync();
        if (budgetHistory.Count > 0)
        {
            _context.ProjectBudgetHistories.RemoveRange(budgetHistory);
            summary["Budget History"] = $"Deleted {budgetHistory.Count}";
        }

        // Space Maintenance Logs
        var maintenanceLogs = await _context.SpaceMaintenanceLogs.Where(m => m.ReportedByUserId == userId).ToListAsync();
        if (maintenanceLogs.Count > 0)
        {
            _context.SpaceMaintenanceLogs.RemoveRange(maintenanceLogs);
            summary["Maintenance Logs"] = $"Deleted {maintenanceLogs.Count}";
        }

        // File Access Logs
        var fileAccessLogs = await _context.FileAccessLogs.Where(l => l.AccessedByUserId == userId).ToListAsync();
        if (fileAccessLogs.Count > 0)
        {
            _context.FileAccessLogs.RemoveRange(fileAccessLogs);
            summary["File Access Logs"] = $"Deleted {fileAccessLogs.Count}";
        }

        // Opportunity Field History
        var oppHistory = await _context.OpportunityFieldHistories.Where(h => h.ChangedByUserId == userId).ToListAsync();
        if (oppHistory.Count > 0)
        {
            _context.OpportunityFieldHistories.RemoveRange(oppHistory);
            summary["Opportunity History"] = $"Deleted {oppHistory.Count}";
        }

        // Impersonation Sessions
        var impersonationSessions = await _context.ImpersonationSessions
            .Where(s => s.AdminUserId == userId || s.ImpersonatedUserId == userId).ToListAsync();
        if (impersonationSessions.Count > 0)
        {
            _context.ImpersonationSessions.RemoveRange(impersonationSessions);
            summary["Impersonation Sessions"] = $"Deleted {impersonationSessions.Count}";
        }

        // Feedback
        var feedbacks = await _context.Feedbacks.Where(f => f.SubmittedByUserId == userId).ToListAsync();
        if (feedbacks.Count > 0)
        {
            _context.Feedbacks.RemoveRange(feedbacks);
            summary["Feedback"] = $"Deleted {feedbacks.Count}";
        }

        // ========== RESUME RELATED (delete - user-specific content) ==========

        // Resume Versions (CreatedBy)
        var resumeVersions = await _context.ResumeVersions.Where(v => v.CreatedByUserId == userId).ToListAsync();
        if (resumeVersions.Count > 0)
        {
            _context.ResumeVersions.RemoveRange(resumeVersions);
            summary["Resume Versions Created"] = $"Deleted {resumeVersions.Count}";
        }

        // Resume Documents
        var resumeDocs = await _context.ResumeDocuments.Where(d => d.GeneratedByUserId == userId).ToListAsync();
        if (resumeDocs.Count > 0)
        {
            _context.ResumeDocuments.RemoveRange(resumeDocs);
            summary["Resume Documents"] = $"Deleted {resumeDocs.Count}";
        }

        // Resume Approvals
        var resumeApprovals = await _context.ResumeApprovals.Where(a => a.RequestedByUserId == userId).ToListAsync();
        if (resumeApprovals.Count > 0)
        {
            _context.ResumeApprovals.RemoveRange(resumeApprovals);
            summary["Resume Approvals"] = $"Deleted {resumeApprovals.Count}";
        }

        // LinkedIn Imports
        var linkedInImports = await _context.LinkedInImports.Where(j => j.ImportedByUserId == userId).ToListAsync();
        if (linkedInImports.Count > 0)
        {
            _context.LinkedInImports.RemoveRange(linkedInImports);
            summary["LinkedIn Imports"] = $"Deleted {linkedInImports.Count}";
        }

        // Resume Share Links
        var shareLinks = await _context.ResumeShareLinks.Where(s => s.CreatedByUserId == userId).ToListAsync();
        if (shareLinks.Count > 0)
        {
            _context.ResumeShareLinks.RemoveRange(shareLinks);
            summary["Resume Share Links"] = $"Deleted {shareLinks.Count}";
        }

        // ========== BUSINESS RECORDS (reassign or delete) ==========

        // Assignment Requests - complex: has both RequestedBy and RequestedFor
        var assignmentRequests = await _context.AssignmentRequests
            .Where(r => r.RequestedByUserId == userId || r.RequestedForUserId == userId).ToListAsync();
        if (assignmentRequests.Count > 0)
        {
            // Always delete assignment requests as they're tied to specific users
            _context.AssignmentRequests.RemoveRange(assignmentRequests);
            summary["Assignment Requests"] = $"Deleted {assignmentRequests.Count}";
        }

        // Lease Attachments - reassign uploader or delete
        var leaseAttachments = await _context.LeaseAttachments.Where(a => a.UploadedByUserId == userId).ToListAsync();
        if (leaseAttachments.Count > 0)
        {
            if (reassignTo.HasValue)
            {
                foreach (var a in leaseAttachments) a.UploadedByUserId = reassignTo.Value;
                summary["Lease Attachments"] = $"Reassigned {leaseAttachments.Count}";
            }
            else
            {
                _context.LeaseAttachments.RemoveRange(leaseAttachments);
                summary["Lease Attachments"] = $"Deleted {leaseAttachments.Count}";
            }
        }

        // DOA Letters - complex relationships, delete
        var doaLetters = await _context.DelegationOfAuthorityLetters
            .Where(d => d.DelegatorUserId == userId || d.DesigneeUserId == userId).ToListAsync();
        if (doaLetters.Count > 0)
        {
            _context.DelegationOfAuthorityLetters.RemoveRange(doaLetters);
            summary["DOA Letters"] = $"Deleted {doaLetters.Count}";
        }

        // Digital Signatures - always delete (legally tied to signer)
        var signatures = await _context.DigitalSignatures.Where(s => s.SignerUserId == userId).ToListAsync();
        if (signatures.Count > 0)
        {
            _context.DigitalSignatures.RemoveRange(signatures);
            summary["Digital Signatures"] = $"Deleted {signatures.Count}";
        }

        // Log what we're about to save
        _logger.LogInformation("HandleDependentRecordsAsync saving changes for user {UserId}. Summary: {Summary}",
            userId, string.Join(", ", summary.Select(kv => $"{kv.Key}: {kv.Value}")));

        // Save all changes in one transaction
        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("HandleDependentRecordsAsync SaveChanges succeeded for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HandleDependentRecordsAsync SaveChanges FAILED for user {UserId}. Summary so far: {Summary}. Error: {Error}. Inner: {Inner}",
                userId, string.Join(", ", summary.Select(kv => $"{kv.Key}: {kv.Value}")), ex.Message, ex.InnerException?.Message);
            throw;
        }

        return summary;
    }

    // POST: api/users/{id}/roles
    [HttpPost("{id}/roles")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> AssignRole(Guid id, [FromBody] RoleAssignment roleAssignment)
    {
        try
        {
            if (id != roleAssignment.UserId)
            {
                return BadRequest("User ID mismatch");
            }

            // Check if role assignment already exists
            var exists = await _context.RoleAssignments
                .AnyAsync(ra => ra.UserId == id && ra.Role == roleAssignment.Role);

            if (exists)
            {
                return Conflict($"User already has the role {roleAssignment.Role}");
            }

            _context.RoleAssignments.Add(roleAssignment);
            await _context.SaveChangesAsync();

            // Get user email for audit logging
            var user = await _context.Users.FindAsync(id);
            _logger.LogWarning(
                "AUDIT: Role assigned. UserId={UserId}, UserEmail={UserEmail}, Role={Role}, " +
                "RoleAssignmentId={RoleAssignmentId}, AssignedBy={AssignedBy}, CorrelationId={CorrelationId}",
                id, user?.Email ?? "unknown", roleAssignment.Role.ToString(),
                roleAssignment.Id, GetCurrentUserId(), GetCorrelationId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: Role assignment failed. UserId={UserId}, AssignedBy={AssignedBy}, CorrelationId={CorrelationId}",
                id, GetCurrentUserId(), GetCorrelationId());
            return StatusCode(500, "An error occurred while assigning the role");
        }
    }

    // DELETE: api/users/{id}/roles/{roleAssignmentId}
    [HttpDelete("{id}/roles/{roleAssignmentId}")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> RemoveRole(Guid id, Guid roleAssignmentId)
    {
        try
        {
            var roleAssignment = await _context.RoleAssignments.FindAsync(roleAssignmentId);

            if (roleAssignment == null)
            {
                return NotFound($"Role assignment with ID {roleAssignmentId} not found");
            }

            if (roleAssignment.UserId != id)
            {
                return BadRequest("Role assignment does not belong to this user");
            }

            // Capture role info before deletion for audit
            var removedRole = roleAssignment.Role;

            _context.RoleAssignments.Remove(roleAssignment);
            await _context.SaveChangesAsync();

            // Get user email for audit logging
            var user = await _context.Users.FindAsync(id);
            _logger.LogWarning(
                "AUDIT: Role removed. UserId={UserId}, UserEmail={UserEmail}, Role={Role}, " +
                "RoleAssignmentId={RoleAssignmentId}, RemovedBy={RemovedBy}, CorrelationId={CorrelationId}",
                id, user?.Email ?? "unknown", removedRole.ToString(),
                roleAssignmentId, GetCurrentUserId(), GetCorrelationId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: Role removal failed. UserId={UserId}, RoleAssignmentId={RoleAssignmentId}, RemovedBy={RemovedBy}, CorrelationId={CorrelationId}",
                id, roleAssignmentId, GetCurrentUserId(), GetCorrelationId());
            return StatusCode(500, "An error occurred while removing the role");
        }
    }

    // POST: api/users/{id}/deactivate
    [HttpPost("{id}/deactivate")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> DeactivateUser(Guid id, [FromBody] DeactivateUserRequest? request = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (!user.IsActive)
            {
                return BadRequest("User is already deactivated");
            }

            // Prevent deactivating system admins (optional - remove if system admins can be deactivated)
            if (user.IsSystemAdmin)
            {
                return BadRequest("System administrators cannot be deactivated");
            }

            user.IsActive = false;
            user.DeactivatedAt = DateTime.UtcNow;
            user.DeactivatedByUserId = request?.DeactivatedByUserId;
            user.UpdatedAt = DateTime.UtcNow;

            // Optionally deactivate all tenant memberships
            var memberships = await _context.TenantMemberships
                .Where(tm => tm.UserId == id && tm.IsActive)
                .ToListAsync();

            foreach (var membership in memberships)
            {
                membership.IsActive = false;
                membership.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "AUDIT: User deactivated. UserId={UserId}, UserEmail={UserEmail}, DeactivatedBy={DeactivatedBy}, " +
                "DeactivatedMemberships={DeactivatedMemberships}, CorrelationId={CorrelationId}",
                id, user.Email, GetCurrentUserId(), memberships.Count, GetCorrelationId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: User deactivation failed. UserId={UserId}, DeactivatedBy={DeactivatedBy}, CorrelationId={CorrelationId}",
                id, GetCurrentUserId(), GetCorrelationId());
            return StatusCode(500, "An error occurred while deactivating the user");
        }
    }

    // POST: api/users/{id}/reactivate
    [HttpPost("{id}/reactivate")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> ReactivateUser(Guid id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (user.IsActive)
            {
                return BadRequest("User is already active");
            }

            user.IsActive = true;
            user.DeactivatedAt = null;
            user.DeactivatedByUserId = null;
            user.UpdatedAt = DateTime.UtcNow;

            // Note: Tenant memberships are NOT automatically reactivated
            // This must be done separately through the tenant memberships endpoint

            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "AUDIT: User reactivated. UserId={UserId}, UserEmail={UserEmail}, ReactivatedBy={ReactivatedBy}, CorrelationId={CorrelationId}",
                id, user.Email, GetCurrentUserId(), GetCorrelationId());

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AUDIT: User reactivation failed. UserId={UserId}, ReactivatedBy={ReactivatedBy}, CorrelationId={CorrelationId}",
                id, GetCurrentUserId(), GetCorrelationId());
            return StatusCode(500, "An error occurred while reactivating the user");
        }
    }

    // GET: api/users/me
    // Get current user's profile
    [HttpGet("me")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<UserProfileDto>> GetMyProfile()
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            var profile = new UserProfileDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                DisplayName = user.DisplayName,
                ManagerId = user.ManagerId?.ToString(),
                Department = user.Department,
                JobTitle = user.JobTitle,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhotoUrl,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt.ToString("o"),
                LastLoginAt = user.LastLoginAt?.ToString("o")
            };

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user profile");
            return StatusCode(500, "An error occurred while retrieving the profile");
        }
    }

    // PUT: api/users/me
    // Update current user's profile
    [HttpPut("me")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<UserProfileDto>> UpdateMyProfile([FromBody] UpdateUserProfileDto request)
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            // Update user fields
            user.DisplayName = request.DisplayName;
            user.Department = request.Department;
            user.JobTitle = request.JobTitle;
            user.PhoneNumber = request.PhoneNumber;
            if (Guid.TryParse(request.ManagerId, out var managerId))
            {
                user.ManagerId = managerId;
            }
            else if (string.IsNullOrWhiteSpace(request.ManagerId))
            {
                user.ManagerId = null;
            }
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var profile = new UserProfileDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                DisplayName = user.DisplayName,
                Department = user.Department,
                JobTitle = user.JobTitle,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhotoUrl,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt.ToString("o"),
                LastLoginAt = user.LastLoginAt?.ToString("o")
            };

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile");
            return StatusCode(500, "An error occurred while updating the profile");
        }
    }

    // POST: api/users/me/change-password
    // Change current user's password
    [HttpPost("me/change-password")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordDto request)
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Verify new password matches confirmation
            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest(new { message = "New password and confirmation do not match" });
            }

            // Verify current password
            if (string.IsNullOrEmpty(user.PasswordHash) ||
                !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                _logger.LogWarning("Failed password change attempt for user {UserId}: incorrect current password", userId);
                return BadRequest(new { message = "Current password is incorrect" });
            }

            // Validate new password requirements
            var validationError = ValidatePassword(request.NewPassword);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            // Hash and save new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
            user.PasswordChangedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed successfully for user {UserId}", userId);

            return Ok(new { message = "Password changed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new { message = "An error occurred while changing the password" });
        }
    }

    private string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Password is required";
        }

        if (password.Length < 8)
        {
            return "Password must be at least 8 characters long";
        }

        if (password.Length > 128)
        {
            return "Password must not exceed 128 characters";
        }

        if (!password.Any(char.IsUpper))
        {
            return "Password must contain at least one uppercase letter";
        }

        if (!password.Any(char.IsLower))
        {
            return "Password must contain at least one lowercase letter";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Password must contain at least one number";
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return "Password must contain at least one special character";
        }

        return null;
    }

    // POST: api/users/me/profile-photo
    // Upload profile photo
    [HttpPost("me/profile-photo")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<ProfilePhotoResponseDto>> UploadProfilePhoto([FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();

            var uploadFile = file ?? Request.Form.Files.FirstOrDefault();
            if (uploadFile == null || uploadFile.Length == 0)
            {
                return BadRequest("No file uploaded");
            }

            // Basic safety: allow common image extensions; otherwise fallback to .jpg
            var ext = Path.GetExtension(uploadFile.FileName);
            var safeExtension = string.IsNullOrWhiteSpace(ext)
                ? ".jpg"
                : ext.StartsWith(".") ? ext : $".{ext}";

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            var fileName = $"{userId}_{Guid.NewGuid()}{safeExtension}";
            var photoUrl = $"/uploads/profile-photos/{fileName}";

            user.ProfilePhotoUrl = photoUrl;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new ProfilePhotoResponseDto { ProfilePhotoUrl = photoUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading profile photo");
            return StatusCode(500, "An error occurred while uploading the photo");
        }
    }

    // DELETE: api/users/me/profile-photo
    // Delete profile photo
    [HttpDelete("me/profile-photo")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> DeleteProfilePhoto()
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // Try to delete the actual file from storage if it exists
            if (!string.IsNullOrEmpty(user.ProfilePhotoUrl))
            {
                try
                {
                    // ProfilePhotoUrl is like /uploads/profile-photos/filename.jpg
                    // Convert to physical path
                    var relativePath = user.ProfilePhotoUrl.TrimStart('/');
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath);

                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                        _logger.LogInformation("Deleted profile photo file: {FilePath}", filePath);
                    }
                }
                catch (Exception fileEx)
                {
                    // Log but don't fail the request - the file might not exist
                    _logger.LogWarning(fileEx, "Failed to delete profile photo file for user {UserId}", userId);
                }
            }

            user.ProfilePhotoUrl = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting profile photo");
            return StatusCode(500, "An error occurred while deleting the photo");
        }
    }

    private async Task<bool> UserExists(Guid id)
    {
        return await _context.Users.AnyAsync(e => e.Id == id);
    }
}

// Request DTOs
public class DeactivateUserRequest
{
    public Guid? DeactivatedByUserId { get; set; }
}

public class UserProfileDto
{
    public required string Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public string? ManagerId { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public bool IsActive { get; set; }
    public required string CreatedAt { get; set; }
    public string? LastLoginAt { get; set; }
}

public class UpdateUserProfileDto
{
    public required string DisplayName { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ManagerId { get; set; }
}

public class ChangePasswordDto
{
    public required string CurrentPassword { get; set; }
    public required string NewPassword { get; set; }
    public required string ConfirmPassword { get; set; }
}

public class ProfilePhotoResponseDto
{
    public required string ProfilePhotoUrl { get; set; }
}

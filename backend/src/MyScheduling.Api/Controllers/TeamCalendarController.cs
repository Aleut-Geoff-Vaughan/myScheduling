using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Models;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamCalendarController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<TeamCalendarController> _logger;

    public TeamCalendarController(MySchedulingDbContext context, ILogger<TeamCalendarController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all team calendars for a tenant
    /// </summary>
    [HttpGet]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<TeamCalendarResponse>>> GetTeamCalendars(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] bool includeInactive = false)
    {
        try
        {
            var userTenantIds = GetUserTenantIds();

            var query = _context.TeamCalendars
                .Include(tc => tc.Owner)
                    .ThenInclude(o => o!.Manager)
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.User)
                        .ThenInclude(u => u!.Manager)
                .AsQueryable();

            // Filter by tenant if specified and user has access
            if (tenantId.HasValue)
            {
                if (!userTenantIds.Contains(tenantId.Value) && !IsSystemAdmin())
                {
                    return StatusCode(403, "You do not have access to this tenant");
                }
                query = query.Where(tc => tc.TenantId == tenantId.Value);
            }
            else
            {
                // Show calendars from all tenants user has access to
                query = query.Where(tc => userTenantIds.Contains(tc.TenantId));
            }

            if (!includeInactive)
            {
                query = query.Where(tc => tc.IsActive);
            }

            var calendars = await query
                .OrderBy(tc => tc.Name)
                .ToListAsync();

            var response = calendars.Select(tc => new TeamCalendarResponse
            {
                Id = tc.Id,
                TenantId = tc.TenantId,
                Name = tc.Name,
                Description = tc.Description,
                Type = tc.Type,
                IsActive = tc.IsActive,
                OwnerUserId = tc.OwnerUserId,
                Owner = tc.Owner != null ? ToUserSummary(tc.Owner) : null,
                MemberCount = tc.Members.Count(m => m.IsActive),
                Members = tc.Members.Where(m => m.IsActive).Select(m => new TeamCalendarMemberResponse
                {
                    Id = m.Id,
                    TeamCalendarId = m.TeamCalendarId,
                    UserId = m.UserId,
                    User = ToUserSummary(m.User),
                    MembershipType = m.MembershipType,
                    AddedDate = m.AddedDate,
                    AddedByUserId = m.AddedByUserId,
                    IsActive = m.IsActive
                }).ToList(),
                CreatedAt = tc.CreatedAt
            }).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving team calendars");
            return StatusCode(500, new { error = "An error occurred while retrieving team calendars" });
        }
    }

    /// <summary>
    /// Get a specific team calendar by ID
    /// </summary>
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Read)]
    public async Task<ActionResult<TeamCalendarResponse>> GetTeamCalendar(Guid id)
    {
        try
        {
            var calendar = await _context.TeamCalendars
                .Include(tc => tc.Owner)
                    .ThenInclude(o => o!.Manager)
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.User)
                        .ThenInclude(u => u!.Manager)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            var response = new TeamCalendarResponse
            {
                Id = calendar.Id,
                TenantId = calendar.TenantId,
                Name = calendar.Name,
                Description = calendar.Description,
                Type = calendar.Type,
                IsActive = calendar.IsActive,
                OwnerUserId = calendar.OwnerUserId,
                Owner = calendar.Owner != null ? ToUserSummary(calendar.Owner, calendar.Owner.Manager) : null,
                MemberCount = calendar.Members.Count(m => m.IsActive),
                Members = calendar.Members.Where(m => m.IsActive).Select(m => new TeamCalendarMemberResponse
                {
                    Id = m.Id,
                    TeamCalendarId = m.TeamCalendarId,
                    UserId = m.UserId,
                    User = ToUserSummary(m.User, m.User?.Manager),
                    MembershipType = m.MembershipType,
                    AddedDate = m.AddedDate,
                    AddedByUserId = m.AddedByUserId,
                    IsActive = m.IsActive
                }).ToList(),
                CreatedAt = calendar.CreatedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving team calendar {Id}", id);
            return StatusCode(500, new { error = "An error occurred while retrieving the team calendar" });
        }
    }

    /// <summary>
    /// Create a new team calendar
    /// </summary>
    [HttpPost]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Create)]
    public async Task<ActionResult<TeamCalendarResponse>> CreateTeamCalendar(
        [FromBody] CreateTeamCalendarRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userTenantIds = GetUserTenantIds();

            // Validate tenant access
            if (!userTenantIds.Contains(request.TenantId) && !IsSystemAdmin())
            {
                return StatusCode(403, "You do not have access to this tenant");
            }

            // Validate owner if provided
            if (request.OwnerUserId.HasValue)
            {
                var ownerExists = await _context.TenantMemberships
                    .AnyAsync(tm => tm.UserId == request.OwnerUserId.Value && tm.TenantId == request.TenantId && tm.IsActive);

                if (!ownerExists)
                {
                    return BadRequest(new { error = "Owner user not found in this tenant" });
                }
            }

            var calendar = new TeamCalendar
            {
                Id = Guid.NewGuid(),
                TenantId = request.TenantId,
                Name = request.Name,
                Description = request.Description,
                Type = request.Type,
                IsActive = request.IsActive,
                OwnerUserId = request.OwnerUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TeamCalendars.Add(calendar);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Team calendar {CalendarId} created for tenant {TenantId} by user {UserId}",
                calendar.Id, request.TenantId, userId);

            // Return the created calendar
            return CreatedAtAction(nameof(GetTeamCalendar), new { id = calendar.Id }, new TeamCalendarResponse
            {
                Id = calendar.Id,
                TenantId = calendar.TenantId,
                Name = calendar.Name,
                Description = calendar.Description,
                Type = calendar.Type,
                IsActive = calendar.IsActive,
                OwnerUserId = calendar.OwnerUserId,
                MemberCount = 0,
                Members = new List<TeamCalendarMemberResponse>(),
                CreatedAt = calendar.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating team calendar");
            return StatusCode(500, new { error = "An error occurred while creating the team calendar" });
        }
    }

    /// <summary>
    /// Update a team calendar
    /// </summary>
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Update)]
    public async Task<ActionResult<TeamCalendarResponse>> UpdateTeamCalendar(
        Guid id,
        [FromBody] UpdateTeamCalendarRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var calendar = await _context.TeamCalendars
                .Include(tc => tc.Owner)
                    .ThenInclude(o => o!.Manager)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Validate owner if changed
            if (request.OwnerUserId.HasValue)
            {
                var ownerExists = await _context.TenantMemberships
                    .AnyAsync(tm => tm.UserId == request.OwnerUserId.Value && tm.TenantId == calendar.TenantId && tm.IsActive);

                if (!ownerExists)
                {
                    return BadRequest(new { error = "Owner user not found in this tenant" });
                }
            }

            calendar.Name = request.Name;
            calendar.Description = request.Description;
            calendar.Type = request.Type;
            calendar.IsActive = request.IsActive;
            calendar.OwnerUserId = request.OwnerUserId;
            calendar.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Team calendar {CalendarId} updated by user {UserId}", id, userId);

            return Ok(new TeamCalendarResponse
            {
                Id = calendar.Id,
                TenantId = calendar.TenantId,
                Name = calendar.Name,
                Description = calendar.Description,
                Type = calendar.Type,
                IsActive = calendar.IsActive,
                OwnerUserId = calendar.OwnerUserId,
                Owner = calendar.Owner != null ? ToUserSummary(calendar.Owner, calendar.Owner.Manager) : null,
                MemberCount = await _context.TeamCalendarMembers.CountAsync(m => m.TeamCalendarId == id && m.IsActive),
                CreatedAt = calendar.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating team calendar {Id}", id);
            return StatusCode(500, new { error = "An error occurred while updating the team calendar" });
        }
    }

    /// <summary>
    /// Delete a team calendar
    /// </summary>
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteTeamCalendar(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var calendar = await _context.TeamCalendars.FindAsync(id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            _context.TeamCalendars.Remove(calendar);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Team calendar {CalendarId} deleted by user {UserId}", id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting team calendar {Id}", id);
            return StatusCode(500, new { error = "An error occurred while deleting the team calendar" });
        }
    }

    /// <summary>
    /// Add a member to a team calendar
    /// </summary>
    [HttpPost("{id}/members")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Update)]
    public async Task<ActionResult<TeamCalendarMemberResponse>> AddMember(
        Guid id,
        [FromBody] AddTeamCalendarMemberRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var calendar = await _context.TeamCalendars
                .Include(tc => tc.Members)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Check if user exists in the same tenant
            var memberUser = await _context.Users
                .Include(u => u.Manager)
                .FirstOrDefaultAsync(u => u.Id == request.UserId);

            if (memberUser == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            var hasTenantAccess = await _context.TenantMemberships
                .AnyAsync(tm => tm.UserId == request.UserId && tm.TenantId == calendar.TenantId && tm.IsActive);

            if (!hasTenantAccess)
            {
                return BadRequest(new { error = "User is not in this tenant" });
            }

            // Check if already a member
            var existingMember = calendar.Members
                .FirstOrDefault(m => m.UserId == request.UserId);

            if (existingMember != null && existingMember.IsActive)
            {
                return BadRequest(new { error = "User is already a member of this calendar" });
            }

            // If previously removed, reactivate
            if (existingMember != null && !existingMember.IsActive)
            {
                existingMember.IsActive = true;
                existingMember.MembershipType = request.MembershipType;
                existingMember.AddedDate = DateTime.UtcNow;
                existingMember.AddedByUserId = userId;
                await _context.SaveChangesAsync();

                return Ok(new TeamCalendarMemberResponse
                {
                    Id = existingMember.Id,
                    TeamCalendarId = existingMember.TeamCalendarId,
                    UserId = existingMember.UserId,
                    User = ToUserSummary(memberUser, memberUser.Manager),
                    MembershipType = existingMember.MembershipType,
                    AddedDate = existingMember.AddedDate,
                    AddedByUserId = existingMember.AddedByUserId,
                    IsActive = existingMember.IsActive
                });
            }

            // Create new member
            var member = new TeamCalendarMember
            {
                Id = Guid.NewGuid(),
                TenantId = calendar.TenantId,
                TeamCalendarId = id,
                UserId = request.UserId,
                MembershipType = request.MembershipType,
                AddedDate = DateTime.UtcNow,
                AddedByUserId = userId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.TeamCalendarMembers.Add(member);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} added to team calendar {CalendarId} by user {RequestingUserId}",
                request.UserId, id, userId);

            return Ok(new TeamCalendarMemberResponse
            {
                Id = member.Id,
                TeamCalendarId = member.TeamCalendarId,
                UserId = member.UserId,
                User = ToUserSummary(memberUser, memberUser.Manager),
                MembershipType = member.MembershipType,
                AddedDate = member.AddedDate,
                AddedByUserId = member.AddedByUserId,
                IsActive = member.IsActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding member to team calendar {Id}", id);
            return StatusCode(500, new { error = "An error occurred while adding the member" });
        }
    }

    /// <summary>
    /// Bulk add members to a team calendar
    /// </summary>
    [HttpPost("{id}/members/bulk")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Update)]
    public async Task<ActionResult<IEnumerable<TeamCalendarMemberResponse>>> BulkAddMembers(
        Guid id,
        [FromBody] BulkAddMembersRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var calendar = await _context.TeamCalendars
                .Include(tc => tc.Members)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Get all users in one query
            var users = await _context.Users
                .Include(u => u.Manager)
                .Where(u => request.UserIds.Contains(u.Id))
                .ToListAsync();

            var tenantMemberships = await _context.TenantMemberships
                .Where(tm => tm.TenantId == calendar.TenantId && request.UserIds.Contains(tm.UserId) && tm.IsActive)
                .ToListAsync();

            var allowedUsers = users
                .Where(u => tenantMemberships.Any(tm => tm.UserId == u.Id))
                .ToList();

            if (allowedUsers.Count != request.UserIds.Count)
            {
                return BadRequest(new { error = "Some users not found in this tenant" });
            }

            var responses = new List<TeamCalendarMemberResponse>();

            foreach (var user in allowedUsers)
            {
                var existingMember = calendar.Members
                    .FirstOrDefault(m => m.UserId == user.Id);

                if (existingMember != null && existingMember.IsActive)
                {
                    // Already a member, skip
                    continue;
                }

                if (existingMember != null && !existingMember.IsActive)
                {
                    // Reactivate
                        existingMember.IsActive = true;
                        existingMember.MembershipType = request.MembershipType;
                        existingMember.AddedDate = DateTime.UtcNow;
                        existingMember.AddedByUserId = userId;

                        responses.Add(new TeamCalendarMemberResponse
                        {
                            Id = existingMember.Id,
                            TeamCalendarId = existingMember.TeamCalendarId,
                            UserId = existingMember.UserId,
                            User = ToUserSummary(user, user.Manager),
                            MembershipType = existingMember.MembershipType,
                            AddedDate = existingMember.AddedDate,
                            AddedByUserId = existingMember.AddedByUserId,
                            IsActive = existingMember.IsActive
                        });
                }
                else
                {
                    // Create new member
                    var member = new TeamCalendarMember
                    {
                        Id = Guid.NewGuid(),
                        TenantId = calendar.TenantId,
                        TeamCalendarId = id,
                        UserId = user.Id,
                        MembershipType = request.MembershipType,
                        AddedDate = DateTime.UtcNow,
                        AddedByUserId = userId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.TeamCalendarMembers.Add(member);

                    responses.Add(new TeamCalendarMemberResponse
                    {
                        Id = member.Id,
                        TeamCalendarId = member.TeamCalendarId,
                        UserId = member.UserId,
                        User = ToUserSummary(user, user.Manager),
                        MembershipType = member.MembershipType,
                        AddedDate = member.AddedDate,
                        AddedByUserId = member.AddedByUserId,
                        IsActive = member.IsActive
                    });
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("{Count} members bulk-added to team calendar {CalendarId} by user {UserId}",
                responses.Count, id, userId);

            return Ok(responses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk-adding members to team calendar {Id}", id);
            return StatusCode(500, new { error = "An error occurred while adding members" });
        }
    }

    /// <summary>
    /// Remove a member from a team calendar
    /// </summary>
    [HttpDelete("{id}/members/{memberId}")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Update)]
    public async Task<ActionResult> RemoveMember(Guid id, Guid memberId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var member = await _context.TeamCalendarMembers
                .FirstOrDefaultAsync(m => m.Id == memberId && m.TeamCalendarId == id);

            if (member == null)
            {
                return NotFound(new { error = "Member not found in this calendar" });
            }

            // Soft delete
            member.IsActive = false;
            member.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Member {MemberId} removed from team calendar {CalendarId} by user {UserId}",
                memberId, id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing member {MemberId} from team calendar {Id}", memberId, id);
            return StatusCode(500, new { error = "An error occurred while removing the member" });
        }
    }

    /// <summary>
    /// Get team calendar view with work location preferences
    /// </summary>
    [HttpGet("{id}/view")]
    [RequiresPermission(Resource = "TeamCalendar", Action = PermissionAction.Read)]
    public async Task<ActionResult<TeamCalendarViewResponse>> GetTeamCalendarView(
        Guid id,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null)
    {
        try
        {
            var calendar = await _context.TeamCalendars
                .Include(tc => tc.Owner)
                    .ThenInclude(o => o!.Manager)
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.User)
                        .ThenInclude(u => u!.Manager)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Default to 2 weeks if not specified
            var start = startDate ?? DateOnly.FromDateTime(DateTime.Today);
            var end = endDate ?? start.AddDays(13);

            var memberUserIds = calendar.Members.Where(m => m.IsActive).Select(m => m.UserId).ToList();

            var preferences = await _context.WorkLocationPreferences
                .Where(p => p.TenantId == calendar.TenantId &&
                            memberUserIds.Contains(p.UserId) &&
                            p.WorkDate >= start &&
                            p.WorkDate <= end)
                .ToListAsync();

            var memberSchedules = calendar.Members
                .Where(m => m.IsActive)
                .Select(m =>
                {
                    var userPreferences = preferences
                        .Where(p => p.UserId == m.UserId)
                        .OrderBy(p => p.WorkDate)
                        .ToList();

                    return new TeamMemberSchedule
                    {
                        UserId = m.UserId,
                        UserName = m.User.DisplayName,
                        UserEmail = m.User.Email,
                        ManagerUserId = m.User.ManagerId,
                        JobTitle = m.User.JobTitle,
                        Preferences = userPreferences.Select(p => new WorkLocationPreferenceResponse
                        {
                            Id = p.Id,
                            WorkDate = p.WorkDate.ToString("yyyy-MM-dd"),
                            LocationType = p.LocationType,
                            DayPortion = p.DayPortion,
                            OfficeId = p.OfficeId,
                            RemoteLocation = p.RemoteLocation,
                            City = p.City,
                            State = p.State,
                            Country = p.Country,
                            Notes = p.Notes
                        }).ToList()
                    };
                })
                .OrderBy(ms => ms.UserName)
                .ToList();

            var response = new TeamCalendarViewResponse
            {
                Calendar = new TeamCalendarResponse
                {
                    Id = calendar.Id,
                    TenantId = calendar.TenantId,
                    Name = calendar.Name,
                    Description = calendar.Description,
                    Type = calendar.Type,
                    IsActive = calendar.IsActive,
                    OwnerUserId = calendar.OwnerUserId,
                    Owner = calendar.Owner != null ? ToUserSummary(calendar.Owner, calendar.Owner.Manager) : null,
                    MemberCount = calendar.Members.Count(m => m.IsActive),
                    CreatedAt = calendar.CreatedAt
                },
                MemberSchedules = memberSchedules,
                StartDate = start.ToDateTime(TimeOnly.MinValue),
                EndDate = end.ToDateTime(TimeOnly.MinValue)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving team calendar view for {Id}", id);
            return StatusCode(500, new { error = "An error occurred while retrieving the calendar view" });
        }
    }

    /// <summary>
    /// Get manager view - shows direct reports and their schedules
    /// </summary>
    [HttpGet("manager-view")]
    public async Task<ActionResult<ManagerViewResponse>> GetManagerView(
        [FromQuery] Guid? managerUserId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string scope = "direct",
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null)
    {
        try
        {
            Guid effectiveManagerId = managerUserId ?? userId ?? GetCurrentUserId();

            var manager = await _context.Users
                .Include(u => u.Manager)
                .FirstOrDefaultAsync(u => u.Id == effectiveManagerId);

            if (manager == null)
            {
                return NotFound(new { error = "Manager not found" });
            }

            // Normalize scope
            var useAllReports = string.Equals(scope, "all", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(scope, "team", StringComparison.OrdinalIgnoreCase);

            // Get reports (direct or full hierarchy)
            List<User> reports;
            if (useAllReports)
            {
                var allReports = new List<User>();
                await GatherAllReportsRecursive(effectiveManagerId, allReports);
                reports = allReports;
            }
            else
            {
                reports = await _context.Users
                    .Where(u => u.ManagerId == effectiveManagerId && u.Status == PersonStatus.Active)
                    .Include(u => u.Manager)
                    .ToListAsync();
            }

            // Default to 2 weeks if not specified
            var start = startDate ?? DateOnly.FromDateTime(DateTime.Today);
            var end = endDate ?? start.AddDays(13);

            var reportIds = reports.Select(r => r.Id).ToList();
            var preferences = await _context.WorkLocationPreferences
                .Where(p => reportIds.Contains(p.UserId) && p.WorkDate >= start && p.WorkDate <= end)
                .ToListAsync();

            var memberSchedules = reports.Select(dr =>
            {
                var userPreferences = preferences
                    .Where(p => p.UserId == dr.Id)
                    .OrderBy(p => p.WorkDate)
                    .ToList();

                return new TeamMemberSchedule
                {
                    UserId = dr.Id,
                    UserName = dr.DisplayName,
                    UserEmail = dr.Email,
                    ManagerUserId = dr.ManagerId,
                    JobTitle = dr.JobTitle,
                    Preferences = userPreferences.Select(p => new WorkLocationPreferenceResponse
                    {
                        Id = p.Id,
                        WorkDate = p.WorkDate.ToString("yyyy-MM-dd"),
                        LocationType = p.LocationType,
                        DayPortion = p.DayPortion,
                        OfficeId = p.OfficeId,
                        RemoteLocation = p.RemoteLocation,
                        City = p.City,
                        State = p.State,
                        Country = p.Country,
                        Notes = p.Notes
                    }).ToList()
                };
            })
            .OrderBy(ms => ms.UserName)
            .ToList();

            var response = new ManagerViewResponse
            {
                Manager = ToUserSummary(manager, manager.Manager),
                DirectReports = memberSchedules,
                StartDate = start.ToDateTime(TimeOnly.MinValue),
                EndDate = end.ToDateTime(TimeOnly.MinValue),
                TotalDirectReports = reports.Count
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving manager view");
            return StatusCode(500, new { error = "An error occurred while retrieving the manager view" });
        }
    }

    private static UserSummary ToUserSummary(User user, User? manager = null)
    {
        return new UserSummary
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            Email = user.Email,
            JobTitle = user.JobTitle,
            ManagerUserId = user.ManagerId,
            ManagerName = manager?.DisplayName
        };
    }

    /// <summary>
    /// Recursively collect all active reports under a manager (manager -> reports -> their reports, etc.)
    /// </summary>
    private async Task GatherAllReportsRecursive(Guid managerId, List<User> accumulator)
    {
        var directReports = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Status == PersonStatus.Active)
            .ToListAsync();

        foreach (var dr in directReports)
        {
            accumulator.Add(dr);
            await GatherAllReportsRecursive(dr.Id, accumulator);
        }
    }

    /// <summary>
    /// Get available team calendars for a user to opt into
    /// </summary>
    [HttpGet("available")]
    public async Task<ActionResult<AvailableTeamCalendarsResponse>> GetAvailableTeamCalendars(
        [FromQuery] Guid userId)
    {
        try
        {
            var memberships = await _context.TenantMemberships
                .Where(tm => tm.UserId == userId && tm.IsActive)
                .ToListAsync();

            if (!memberships.Any())
            {
                return NotFound(new { error = "User not found" });
            }

            var tenantIds = memberships.Select(m => m.TenantId).ToList();

            // Get all active calendars for this tenant
            var allCalendars = await _context.TeamCalendars
                .Where(tc => tenantIds.Contains(tc.TenantId) && tc.IsActive)
                .Include(tc => tc.Members)
                .ToListAsync();

            // Get calendars person is already a member of
            var memberOfIds = await _context.TeamCalendarMembers
                .Where(m => m.UserId == userId && m.IsActive)
                .Select(m => m.TeamCalendarId)
                .ToListAsync();

            var availableCalendars = allCalendars
                .Where(c => !memberOfIds.Contains(c.Id))
                .Select(c => new TeamCalendarSummary
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    Type = c.Type,
                    MemberCount = c.Members.Count(m => m.IsActive),
                    IsMember = false
                })
                .ToList();

            var memberOf = allCalendars
                .Where(c => memberOfIds.Contains(c.Id))
                .Select(c =>
                {
                    var membership = c.Members.First(m => m.UserId == userId && m.IsActive);
                    return new TeamCalendarSummary
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Description = c.Description,
                        Type = c.Type,
                        MemberCount = c.Members.Count(m => m.IsActive),
                        IsMember = true,
                        MembershipType = membership.MembershipType
                    };
                })
                .ToList();

            return Ok(new AvailableTeamCalendarsResponse
            {
                AvailableCalendars = availableCalendars,
                MemberOf = memberOf
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available team calendars for user {UserId}", userId);
            return StatusCode(500, new { error = "An error occurred while retrieving available calendars" });
        }
    }
}

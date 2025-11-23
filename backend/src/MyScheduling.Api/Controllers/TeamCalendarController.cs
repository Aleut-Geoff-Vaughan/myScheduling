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
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.Person)
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
                OwnerId = tc.OwnerId,
                Owner = tc.Owner != null ? new PersonSummary
                {
                    Id = tc.Owner.Id,
                    Name = tc.Owner.Name,
                    Email = tc.Owner.Email,
                    JobTitle = tc.Owner.JobTitle,
                    ManagerId = tc.Owner.ManagerId
                } : null,
                MemberCount = tc.Members.Count(m => m.IsActive),
                Members = tc.Members.Where(m => m.IsActive).Select(m => new TeamCalendarMemberResponse
                {
                    Id = m.Id,
                    TeamCalendarId = m.TeamCalendarId,
                    PersonId = m.PersonId,
                    Person = new PersonSummary
                    {
                        Id = m.Person.Id,
                        Name = m.Person.Name,
                        Email = m.Person.Email,
                        JobTitle = m.Person.JobTitle,
                        ManagerId = m.Person.ManagerId
                    },
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
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.Person)
                        .ThenInclude(p => p.Manager)
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
                OwnerId = calendar.OwnerId,
                Owner = calendar.Owner != null ? new PersonSummary
                {
                    Id = calendar.Owner.Id,
                    Name = calendar.Owner.Name,
                    Email = calendar.Owner.Email,
                    JobTitle = calendar.Owner.JobTitle,
                    ManagerId = calendar.Owner.ManagerId,
                    ManagerName = calendar.Owner.Manager?.Name
                } : null,
                MemberCount = calendar.Members.Count(m => m.IsActive),
                Members = calendar.Members.Where(m => m.IsActive).Select(m => new TeamCalendarMemberResponse
                {
                    Id = m.Id,
                    TeamCalendarId = m.TeamCalendarId,
                    PersonId = m.PersonId,
                    Person = new PersonSummary
                    {
                        Id = m.Person.Id,
                        Name = m.Person.Name,
                        Email = m.Person.Email,
                        JobTitle = m.Person.JobTitle,
                        ManagerId = m.Person.ManagerId,
                        ManagerName = m.Person.Manager?.Name
                    },
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
            if (request.OwnerId.HasValue)
            {
                var ownerExists = await _context.People
                    .AnyAsync(p => p.Id == request.OwnerId.Value && p.TenantId == request.TenantId);

                if (!ownerExists)
                {
                    return BadRequest(new { error = "Owner person not found in this tenant" });
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
                OwnerId = request.OwnerId,
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
                OwnerId = calendar.OwnerId,
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
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Validate owner if changed
            if (request.OwnerId.HasValue)
            {
                var ownerExists = await _context.People
                    .AnyAsync(p => p.Id == request.OwnerId.Value && p.TenantId == calendar.TenantId);

                if (!ownerExists)
                {
                    return BadRequest(new { error = "Owner person not found in this tenant" });
                }
            }

            calendar.Name = request.Name;
            calendar.Description = request.Description;
            calendar.Type = request.Type;
            calendar.IsActive = request.IsActive;
            calendar.OwnerId = request.OwnerId;
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
                OwnerId = calendar.OwnerId,
                Owner = calendar.Owner != null ? new PersonSummary
                {
                    Id = calendar.Owner.Id,
                    Name = calendar.Owner.Name,
                    Email = calendar.Owner.Email,
                    JobTitle = calendar.Owner.JobTitle,
                    ManagerId = calendar.Owner.ManagerId
                } : null,
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

            // Check if person exists in the same tenant
            var person = await _context.People
                .Include(p => p.Manager)
                .FirstOrDefaultAsync(p => p.Id == request.PersonId && p.TenantId == calendar.TenantId);

            if (person == null)
            {
                return BadRequest(new { error = "Person not found in this tenant" });
            }

            // Check if already a member
            var existingMember = calendar.Members
                .FirstOrDefault(m => m.PersonId == request.PersonId);

            if (existingMember != null && existingMember.IsActive)
            {
                return BadRequest(new { error = "Person is already a member of this calendar" });
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
                    PersonId = existingMember.PersonId,
                    Person = new PersonSummary
                    {
                        Id = person.Id,
                        Name = person.Name,
                        Email = person.Email,
                        JobTitle = person.JobTitle,
                        ManagerId = person.ManagerId,
                        ManagerName = person.Manager?.Name
                    },
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
                PersonId = request.PersonId,
                MembershipType = request.MembershipType,
                AddedDate = DateTime.UtcNow,
                AddedByUserId = userId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.TeamCalendarMembers.Add(member);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Person {PersonId} added to team calendar {CalendarId} by user {UserId}",
                request.PersonId, id, userId);

            return Ok(new TeamCalendarMemberResponse
            {
                Id = member.Id,
                TeamCalendarId = member.TeamCalendarId,
                PersonId = member.PersonId,
                Person = new PersonSummary
                {
                    Id = person.Id,
                    Name = person.Name,
                    Email = person.Email,
                    JobTitle = person.JobTitle,
                    ManagerId = person.ManagerId,
                    ManagerName = person.Manager?.Name
                },
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

            // Get all persons in one query
            var people = await _context.People
                .Include(p => p.Manager)
                .Where(p => request.PersonIds.Contains(p.Id) && p.TenantId == calendar.TenantId)
                .ToListAsync();

            if (people.Count != request.PersonIds.Count)
            {
                return BadRequest(new { error = "Some persons not found in this tenant" });
            }

            var responses = new List<TeamCalendarMemberResponse>();

            foreach (var person in people)
            {
                var existingMember = calendar.Members
                    .FirstOrDefault(m => m.PersonId == person.Id);

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
                        PersonId = existingMember.PersonId,
                        Person = new PersonSummary
                        {
                            Id = person.Id,
                            Name = person.Name,
                            Email = person.Email,
                            JobTitle = person.JobTitle,
                            ManagerId = person.ManagerId,
                            ManagerName = person.Manager?.Name
                        },
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
                        PersonId = person.Id,
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
                        PersonId = member.PersonId,
                        Person = new PersonSummary
                        {
                            Id = person.Id,
                            Name = person.Name,
                            Email = person.Email,
                            JobTitle = person.JobTitle,
                            ManagerId = person.ManagerId,
                            ManagerName = person.Manager?.Name
                        },
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
                .Include(tc => tc.Members.Where(m => m.IsActive))
                    .ThenInclude(m => m.Person)
                        .ThenInclude(p => p.WorkLocationPreferences)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (calendar == null)
            {
                return NotFound(new { error = "Team calendar not found" });
            }

            // Default to 2 weeks if not specified
            var start = startDate ?? DateOnly.FromDateTime(DateTime.Today);
            var end = endDate ?? start.AddDays(13);

            var memberSchedules = calendar.Members
                .Where(m => m.IsActive)
                .Select(m =>
                {
                    var preferences = m.Person.WorkLocationPreferences
                        .Where(p => p.WorkDate >= start && p.WorkDate <= end)
                        .OrderBy(p => p.WorkDate)
                        .ToList();

                    return new TeamMemberSchedule
                    {
                        PersonId = m.PersonId,
                        PersonName = m.Person.Name,
                        PersonEmail = m.Person.Email,
                        ManagerId = m.Person.ManagerId,
                        JobTitle = m.Person.JobTitle,
                        Preferences = preferences.Select(p => new WorkLocationPreferenceResponse
                        {
                            Id = p.Id,
                            WorkDate = p.WorkDate.ToString("yyyy-MM-dd"),
                            LocationType = p.LocationType,
                            OfficeId = p.OfficeId,
                            RemoteLocation = p.RemoteLocation,
                            City = p.City,
                            State = p.State,
                            Country = p.Country,
                            Notes = p.Notes
                        }).ToList()
                    };
                })
                .OrderBy(ms => ms.PersonName)
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
                    OwnerId = calendar.OwnerId,
                    Owner = calendar.Owner != null ? new PersonSummary
                    {
                        Id = calendar.Owner.Id,
                        Name = calendar.Owner.Name,
                        Email = calendar.Owner.Email,
                        JobTitle = calendar.Owner.JobTitle,
                        ManagerId = calendar.Owner.ManagerId
                    } : null,
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
        [FromQuery] Guid? managerId = null,
        [FromQuery] Guid? personId = null,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null)
    {
        try
        {
            Guid effectiveManagerId;

            // Determine which manager to use
            if (managerId.HasValue)
            {
                effectiveManagerId = managerId.Value;
            }
            else if (personId.HasValue)
            {
                // Look up person and use their ID as manager
                var person = await _context.People.FindAsync(personId.Value);
                if (person == null)
                {
                    return NotFound(new { error = "Person not found" });
                }
                effectiveManagerId = person.Id;
            }
            else
            {
                return BadRequest(new { error = "Either managerId or personId must be provided" });
            }

            var manager = await _context.People
                .FirstOrDefaultAsync(p => p.Id == effectiveManagerId);

            if (manager == null)
            {
                return NotFound(new { error = "Manager not found" });
            }

            // Get direct reports
            var directReports = await _context.People
                .Include(p => p.WorkLocationPreferences)
                .Where(p => p.ManagerId == effectiveManagerId && p.Status == PersonStatus.Active)
                .ToListAsync();

            // Default to 2 weeks if not specified
            var start = startDate ?? DateOnly.FromDateTime(DateTime.Today);
            var end = endDate ?? start.AddDays(13);

            var memberSchedules = directReports.Select(dr =>
            {
                var preferences = dr.WorkLocationPreferences
                    .Where(p => p.WorkDate >= start && p.WorkDate <= end)
                    .OrderBy(p => p.WorkDate)
                    .ToList();

                return new TeamMemberSchedule
                {
                    PersonId = dr.Id,
                    PersonName = dr.Name,
                    PersonEmail = dr.Email,
                    ManagerId = dr.ManagerId,
                    JobTitle = dr.JobTitle,
                    Preferences = preferences.Select(p => new WorkLocationPreferenceResponse
                    {
                        Id = p.Id,
                        WorkDate = p.WorkDate.ToString("yyyy-MM-dd"),
                        LocationType = p.LocationType,
                        OfficeId = p.OfficeId,
                        RemoteLocation = p.RemoteLocation,
                        City = p.City,
                        State = p.State,
                        Country = p.Country,
                        Notes = p.Notes
                    }).ToList()
                };
            })
            .OrderBy(ms => ms.PersonName)
            .ToList();

            var response = new ManagerViewResponse
            {
                Manager = new PersonSummary
                {
                    Id = manager.Id,
                    Name = manager.Name,
                    Email = manager.Email,
                    JobTitle = manager.JobTitle,
                    ManagerId = manager.ManagerId
                },
                DirectReports = memberSchedules,
                StartDate = start.ToDateTime(TimeOnly.MinValue),
                EndDate = end.ToDateTime(TimeOnly.MinValue),
                TotalDirectReports = directReports.Count
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving manager view");
            return StatusCode(500, new { error = "An error occurred while retrieving the manager view" });
        }
    }

    /// <summary>
    /// Get available team calendars for a person to opt into
    /// </summary>
    [HttpGet("available")]
    public async Task<ActionResult<AvailableTeamCalendarsResponse>> GetAvailableTeamCalendars(
        [FromQuery] Guid personId)
    {
        try
        {
            var person = await _context.People.FindAsync(personId);
            if (person == null)
            {
                return NotFound(new { error = "Person not found" });
            }

            // Get all active calendars for this tenant
            var allCalendars = await _context.TeamCalendars
                .Where(tc => tc.TenantId == person.TenantId && tc.IsActive)
                .Include(tc => tc.Members)
                .ToListAsync();

            // Get calendars person is already a member of
            var memberOfIds = await _context.TeamCalendarMembers
                .Where(m => m.PersonId == personId && m.IsActive)
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
                    var membership = c.Members.First(m => m.PersonId == personId && m.IsActive);
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
            _logger.LogError(ex, "Error retrieving available team calendars for person {PersonId}", personId);
            return StatusCode(500, new { error = "An error occurred while retrieving available calendars" });
        }
    }
}

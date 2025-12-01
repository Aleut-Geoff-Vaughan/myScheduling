using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Models;

/// <summary>
/// Response model for TeamCalendar with member information
/// </summary>
public class TeamCalendarResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TeamCalendarType Type { get; set; }
    public bool IsActive { get; set; }
    public Guid? OwnerUserId { get; set; }
    public UserSummary? Owner { get; set; }
    public int MemberCount { get; set; }
    public List<TeamCalendarMemberResponse> Members { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response model for TeamCalendarMember with person details
/// </summary>
public class TeamCalendarMemberResponse
{
    public Guid Id { get; set; }
    public Guid TeamCalendarId { get; set; }
    public Guid UserId { get; set; }
    public UserSummary User { get; set; } = null!;
    public MembershipType MembershipType { get; set; }
    public DateTime AddedDate { get; set; }
    public Guid? AddedByUserId { get; set; }
    public string? AddedByName { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Request to create a new team calendar
/// </summary>
public class CreateTeamCalendarRequest
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TeamCalendarType Type { get; set; } = TeamCalendarType.Team;
    public Guid? OwnerUserId { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Request to update an existing team calendar
/// </summary>
public class UpdateTeamCalendarRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TeamCalendarType Type { get; set; }
    public Guid? OwnerUserId { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Request to add a member to a team calendar
/// </summary>
public class AddTeamCalendarMemberRequest
{
    public Guid UserId { get; set; }
    public MembershipType MembershipType { get; set; } = MembershipType.OptIn;
}

/// <summary>
/// Request to add multiple members to a team calendar
/// </summary>
public class BulkAddMembersRequest
{
    public List<Guid> UserIds { get; set; } = new();
    public MembershipType MembershipType { get; set; } = MembershipType.Forced;
}

/// <summary>
/// Response containing team calendar data with work location preferences
/// </summary>
public class TeamCalendarViewResponse
{
    public TeamCalendarResponse Calendar { get; set; } = null!;
    public List<TeamMemberSchedule> MemberSchedules { get; set; } = new();
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

/// <summary>
/// Work location schedule for a team member
/// </summary>
public class TeamMemberSchedule
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public Guid? ManagerUserId { get; set; }
    public string? JobTitle { get; set; }
    public List<WorkLocationPreferenceResponse> Preferences { get; set; } = new();
}

/// <summary>
/// Work location preference response
/// </summary>
public class WorkLocationPreferenceResponse
{
    public Guid Id { get; set; }
    public string WorkDate { get; set; } = string.Empty; // ISO date format
    public WorkLocationType LocationType { get; set; }
    public DayPortion DayPortion { get; set; } = DayPortion.FullDay; // Full day, AM only, or PM only
    public Guid? OfficeId { get; set; }
    public string? OfficeName { get; set; }
    public string? RemoteLocation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Summary of a user (used in nested responses)
/// </summary>
public class UserSummary
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public Guid? ManagerUserId { get; set; }
    public string? ManagerName { get; set; }
}

/// <summary>
/// Request to get manager's view of direct reports
/// </summary>
public class ManagerViewRequest
{
    public Guid? ManagerUserId { get; set; } // If null, uses current user
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

/// <summary>
/// Response for manager view with direct reports' schedules
/// </summary>
public class ManagerViewResponse
{
    public UserSummary Manager { get; set; } = null!;
    public List<TeamMemberSchedule> DirectReports { get; set; } = new();
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalDirectReports { get; set; }
}

/// <summary>
/// Available team calendars for a person to opt into
/// </summary>
public class AvailableTeamCalendarsResponse
{
    public List<TeamCalendarSummary> AvailableCalendars { get; set; } = new();
    public List<TeamCalendarSummary> MemberOf { get; set; } = new();
}

/// <summary>
/// Summary of team calendar (for lists)
/// </summary>
public class TeamCalendarSummary
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TeamCalendarType Type { get; set; }
    public int MemberCount { get; set; }
    public bool IsMember { get; set; }
    public MembershipType? MembershipType { get; set; }
}

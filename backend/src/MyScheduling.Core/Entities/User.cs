namespace MyScheduling.Core.Entities;

public class User : BaseEntity
{
    public string EntraObjectId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }  // BCrypt hashed password
    public bool IsSystemAdmin { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public Guid? DeactivatedByUserId { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedOutUntil { get; set; }

    // Additional user profile fields
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? OrgUnit { get; set; }
    public string? Location { get; set; }
    public string? LaborCategory { get; set; }
    public string? CostCenter { get; set; }
    public PersonType Type { get; set; } = PersonType.Employee;
    public PersonStatus Status { get; set; } = PersonStatus.Active;
    public Guid? ManagerId { get; set; }
    public Guid? DefaultDelegateUserId { get; set; }  // Default delegate for DOA letters

    // Staffing/Career fields
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public decimal? StandardHoursPerWeek { get; set; } = 40;
    public bool IsHourly { get; set; } = false;

    // Navigation properties
    public virtual ICollection<TenantMembership> TenantMemberships { get; set; } = new List<TenantMembership>();
    public virtual User? Manager { get; set; }
    public virtual ICollection<User> DirectReports { get; set; } = new List<User>();
    public virtual User? DefaultDelegate { get; set; }
    public virtual CareerJobFamily? CareerJobFamily { get; set; }
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();

    // Deprecated - will be removed in migration
    public virtual ICollection<RoleAssignment> RoleAssignments { get; set; } = new List<RoleAssignment>();
}

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

    // Navigation properties
    public virtual ICollection<TenantMembership> TenantMemberships { get; set; } = new List<TenantMembership>();

    // Deprecated - will be removed in migration
    public virtual ICollection<RoleAssignment> RoleAssignments { get; set; } = new List<RoleAssignment>();
}

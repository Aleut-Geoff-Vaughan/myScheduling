namespace AleutStaffing.Core.Entities;

public class User : BaseEntity
{
    public string EntraObjectId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsSystemAdmin { get; set; } = false;
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public virtual ICollection<TenantMembership> TenantMemberships { get; set; } = new List<TenantMembership>();

    // Deprecated - will be removed in migration
    public virtual ICollection<RoleAssignment> RoleAssignments { get; set; } = new List<RoleAssignment>();
}

namespace AleutStaffing.Core.Entities;

public class User : TenantEntity
{
    public string EntraObjectId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public virtual ICollection<RoleAssignment> RoleAssignments { get; set; } = new List<RoleAssignment>();
}

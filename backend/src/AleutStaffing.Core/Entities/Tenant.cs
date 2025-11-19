namespace AleutStaffing.Core.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public TenantStatus Status { get; set; }
    public string? Configuration { get; set; } // JSON for branding, features, etc.

    // Navigation properties
    public virtual ICollection<TenantMembership> TenantMemberships { get; set; } = new List<TenantMembership>();
    public virtual ICollection<User> Users { get; set; } = new List<User>(); // Deprecated
    public virtual ICollection<Person> People { get; set; } = new List<Person>();
}

public enum TenantStatus
{
    Active,
    Test,
    Training,
    Inactive
}

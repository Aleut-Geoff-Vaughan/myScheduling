namespace AleutStaffing.Core.Entities;

public class TenantMembership : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Tenant Tenant { get; set; } = null!;
}

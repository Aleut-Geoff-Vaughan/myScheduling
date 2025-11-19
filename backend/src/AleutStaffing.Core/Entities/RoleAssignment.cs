namespace AleutStaffing.Core.Entities;

public class RoleAssignment : TenantEntity
{
    public Guid UserId { get; set; }
    public AppRole Role { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
}

public enum AppRole
{
    Employee,
    ProjectManager,
    ResourceManager,
    OfficeManager,
    SysAdmin,
    Executive,
    OverrideApprover
}

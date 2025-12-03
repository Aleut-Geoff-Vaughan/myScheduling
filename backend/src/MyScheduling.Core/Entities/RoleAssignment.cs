namespace MyScheduling.Core.Entities;

public class RoleAssignment : TenantEntity
{
    public Guid UserId { get; set; }
    public AppRole Role { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
}

public enum AppRole
{
    // Tenant-Level Roles (assigned per tenant via TenantMembership)
    Employee,
    ViewOnly,
    TeamLead,
    ProjectManager,
    ResourceManager,
    OfficeManager,
    TenantAdmin,
    Executive,
    OverrideApprover,
    ResumeViewer,  // Can view and search all employee resumes within tenant

    // System-Level Roles (assigned via User.IsSystemAdmin or future system-level permissions)
    SystemAdmin,
    Support,
    Auditor
}

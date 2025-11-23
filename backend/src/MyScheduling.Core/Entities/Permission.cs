namespace MyScheduling.Core.Entities;

/// <summary>
/// Represents a permission grant for a user or role to perform an action on a resource.
/// Implements zero-trust authorization where all access must be explicitly granted.
/// </summary>
public class Permission : BaseEntity
{
    public Guid? TenantId { get; set; }  // Null for system-wide permissions

    // Resource identification
    public string Resource { get; set; } = string.Empty;  // "Person", "Project", "WbsElement", etc.
    public Guid? ResourceId { get; set; }  // Null for resource-type level permissions

    // Action and scope
    public PermissionAction Action { get; set; }
    public PermissionScope Scope { get; set; }

    // Subject (who has this permission)
    public Guid? UserId { get; set; }  // Null if role-based
    public AppRole? Role { get; set; }  // Null if user-specific

    // Constraints and metadata
    public string? Conditions { get; set; }  // JSON: {"field": "status", "operator": "eq", "value": "Draft"}
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }

    // Navigation properties
    public virtual Tenant? Tenant { get; set; }
    public virtual User? User { get; set; }
}

public enum PermissionAction
{
    Create = 0,
    Read = 1,
    Update = 2,
    Delete = 3,
    Approve = 4,
    Manage = 5,      // Full CRUD + special actions
    Export = 6,
    Import = 7,
    Restore = 8,     // Restore soft-deleted items
    HardDelete = 9   // Permanent deletion (platform admin only)
}

public enum PermissionScope
{
    System = 0,      // System-wide (platform admin)
    Tenant = 1,      // Entire tenant
    Department = 2,  // Department/team level
    Individual = 3,  // Specific resource
    Owner = 4        // Own resources only
}

/// <summary>
/// Template defining default permissions for each role.
/// Used when assigning roles to users to automatically grant permissions.
/// </summary>
public class RolePermissionTemplate : BaseEntity
{
    public Guid? TenantId { get; set; }  // Null for system templates
    public AppRole Role { get; set; }
    public string Resource { get; set; } = string.Empty;
    public PermissionAction Action { get; set; }
    public PermissionScope DefaultScope { get; set; }
    public string? DefaultConditions { get; set; }
    public bool IsSystemTemplate { get; set; } = false;
    public string? Description { get; set; }

    // Navigation properties
    public virtual Tenant? Tenant { get; set; }
}

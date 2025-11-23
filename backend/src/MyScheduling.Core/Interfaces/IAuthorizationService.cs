using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service for handling authorization and permission checks.
/// Implements zero-trust security where all access must be explicitly granted.
/// </summary>
public interface IAuthorizationService
{
    // ==================== PERMISSION CHECKS ====================

    /// <summary>
    /// Checks if a user has permission to perform an action on a resource.
    /// Fast boolean check for common authorization gates.
    /// </summary>
    Task<bool> CanAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null, Guid? tenantId = null);

    /// <summary>
    /// Detailed permission check with reason for denial.
    /// Use when you need to provide user feedback about why access was denied.
    /// </summary>
    Task<AuthorizationResult> CheckAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null, Guid? tenantId = null);

    /// <summary>
    /// Bulk permission check for multiple resources.
    /// Returns dictionary mapping resource IDs to authorization result.
    /// Optimized for batch operations like list filtering.
    /// </summary>
    Task<Dictionary<Guid, bool>> CanBulkAsync(Guid userId, string resource, PermissionAction action, List<Guid> resourceIds, Guid? tenantId = null);

    // ==================== PERMISSION MANAGEMENT ====================

    /// <summary>
    /// Grant a permission to a user.
    /// </summary>
    Task<Permission> GrantPermissionAsync(
        Guid userId,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        Guid? resourceId = null,
        string? conditions = null,
        DateTime? expiresAt = null);

    /// <summary>
    /// Grant a permission to all users with a specific role.
    /// </summary>
    Task<Permission> GrantRolePermissionAsync(
        AppRole role,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        string? conditions = null);

    /// <summary>
    /// Revoke a specific permission.
    /// </summary>
    Task RevokePermissionAsync(Guid permissionId);

    /// <summary>
    /// Revoke all permissions for a user on a resource.
    /// </summary>
    Task RevokeUserPermissionsAsync(Guid userId, string resource, Guid? tenantId = null);

    /// <summary>
    /// Get all permissions for a user.
    /// </summary>
    Task<List<Permission>> GetUserPermissionsAsync(Guid userId, Guid? tenantId = null);

    /// <summary>
    /// Get all permissions for a role.
    /// </summary>
    Task<List<Permission>> GetRolePermissionsAsync(AppRole role, Guid? tenantId = null);

    // ==================== ROLE TEMPLATES ====================

    /// <summary>
    /// Apply default permissions for a role to a user.
    /// Called when user is assigned a role in a tenant.
    /// </summary>
    Task ApplyRoleTemplateAsync(Guid userId, AppRole role, Guid tenantId);

    /// <summary>
    /// Get permission template for a role.
    /// </summary>
    Task<List<RolePermissionTemplate>> GetRoleTemplateAsync(AppRole role, Guid? tenantId = null);

    /// <summary>
    /// Create or update a role permission template.
    /// </summary>
    Task<RolePermissionTemplate> SetRoleTemplateAsync(
        AppRole role,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        string? conditions = null);

    // ==================== ADMIN CHECKS ====================

    /// <summary>
    /// Check if user is a platform admin (system-wide access).
    /// </summary>
    Task<bool> IsPlatformAdminAsync(Guid userId);

    /// <summary>
    /// Check if user is a tenant admin for a specific tenant.
    /// </summary>
    Task<bool> IsTenantAdminAsync(Guid userId, Guid tenantId);

    // ==================== SOFT DELETE OPERATIONS ====================

    /// <summary>
    /// Check if user can soft delete a resource.
    /// </summary>
    Task<bool> CanSoftDeleteAsync(Guid userId, string resource, Guid resourceId, Guid? tenantId = null);

    /// <summary>
    /// Check if user can hard delete a resource (permanent deletion).
    /// Only platform admins should have this permission.
    /// </summary>
    Task<bool> CanHardDeleteAsync(Guid userId, string resource, Guid resourceId);

    /// <summary>
    /// Check if user can restore a soft-deleted resource.
    /// </summary>
    Task<bool> CanRestoreAsync(Guid userId, string resource, Guid resourceId, Guid? tenantId = null);
}

/// <summary>
/// Result of an authorization check with detailed information.
/// </summary>
public class AuthorizationResult
{
    public bool IsAuthorized { get; set; }
    public string? Reason { get; set; }
    public PermissionScope? GrantedScope { get; set; }
    public List<string> MissingPermissions { get; set; } = new();
    public Guid? PermissionId { get; set; }
    public bool IsPlatformAdmin { get; set; }
    public bool IsTenantAdmin { get; set; }

    public static AuthorizationResult Allow(PermissionScope scope, string? reason = null)
    {
        return new AuthorizationResult
        {
            IsAuthorized = true,
            GrantedScope = scope,
            Reason = reason
        };
    }

    public static AuthorizationResult Deny(string reason, List<string>? missingPermissions = null)
    {
        return new AuthorizationResult
        {
            IsAuthorized = false,
            Reason = reason,
            MissingPermissions = missingPermissions ?? new List<string>()
        };
    }

    public static AuthorizationResult PlatformAdmin()
    {
        return new AuthorizationResult
        {
            IsAuthorized = true,
            IsPlatformAdmin = true,
            GrantedScope = PermissionScope.System,
            Reason = "Platform Administrator"
        };
    }

    public static AuthorizationResult TenantAdmin(Guid tenantId)
    {
        return new AuthorizationResult
        {
            IsAuthorized = true,
            IsTenantAdmin = true,
            GrantedScope = PermissionScope.Tenant,
            Reason = $"Tenant Administrator (Tenant: {tenantId})"
        };
    }
}

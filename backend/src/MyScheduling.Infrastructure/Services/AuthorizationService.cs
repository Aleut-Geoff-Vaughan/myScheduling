using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Infrastructure.Services;

/// <summary>
/// Implementation of authorization service with caching and audit logging.
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    private readonly MySchedulingDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthorizationService> _logger;
    private const string PERMISSION_CACHE_PREFIX = "perm_";
    private const int CACHE_DURATION_MINUTES = 5;

    public AuthorizationService(
        MySchedulingDbContext context,
        IMemoryCache cache,
        ILogger<AuthorizationService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    // ==================== PERMISSION CHECKS ====================

    public async Task<bool> CanAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null, Guid? tenantId = null)
    {
        var result = await CheckAsync(userId, resource, action, resourceId, tenantId);
        return result.IsAuthorized;
    }

    public async Task<AuthorizationResult> CheckAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null, Guid? tenantId = null)
    {
        try
        {
            // 1. Check if user is platform admin
            var user = await GetUserCachedAsync(userId);
            if (user == null)
            {
                return AuthorizationResult.Deny("User not found");
            }

            if (user.IsSystemAdmin)
            {
                await LogAuthorizationAsync(userId, tenantId, resource, resourceId, action, true, "Platform Admin");
                return AuthorizationResult.PlatformAdmin();
            }

            // 2. Check if user is tenant admin (if tenantId provided)
            if (tenantId.HasValue)
            {
                var isTenantAdmin = await IsTenantAdminAsync(userId, tenantId.Value);
                if (isTenantAdmin)
                {
                    await LogAuthorizationAsync(userId, tenantId, resource, resourceId, action, true, "Tenant Admin");
                    return AuthorizationResult.TenantAdmin(tenantId.Value);
                }
            }

            // 3. Check explicit user permissions
            var userPermission = await GetUserPermissionAsync(userId, resource, action, resourceId, tenantId);
            if (userPermission != null && userPermission.IsActive && !IsExpired(userPermission))
            {
                await LogAuthorizationAsync(userId, tenantId, resource, resourceId, action, true, "Explicit Permission");
                return AuthorizationResult.Allow(userPermission.Scope, "Explicit user permission");
            }

            // 4. Check role-based permissions
            var userRoles = await GetUserRolesAsync(userId, tenantId);
            foreach (var role in userRoles)
            {
                var rolePermission = await GetRolePermissionAsync(role, resource, action, tenantId);
                if (rolePermission != null && rolePermission.IsActive && !IsExpired(rolePermission))
                {
                    await LogAuthorizationAsync(userId, tenantId, resource, resourceId, action, true, $"Role Permission: {role}");
                    return AuthorizationResult.Allow(rolePermission.Scope, $"Role-based permission ({role})");
                }
            }

            // 5. Default deny
            var missingPerms = new List<string> { $"{resource}:{action}" };
            await LogAuthorizationAsync(userId, tenantId, resource, resourceId, action, false, "No matching permission");
            return AuthorizationResult.Deny("No permission found for this action", missingPerms);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking authorization for user {UserId} on {Resource}:{Action}", userId, resource, action);
            return AuthorizationResult.Deny($"Authorization check failed: {ex.Message}");
        }
    }

    public async Task<Dictionary<Guid, bool>> CanBulkAsync(Guid userId, string resource, PermissionAction action, List<Guid> resourceIds, Guid? tenantId = null)
    {
        var results = new Dictionary<Guid, bool>();

        // If platform admin, all are allowed
        if (await IsPlatformAdminAsync(userId))
        {
            foreach (var id in resourceIds)
            {
                results[id] = true;
            }
            return results;
        }

        // If tenant admin, all in tenant are allowed
        if (tenantId.HasValue && await IsTenantAdminAsync(userId, tenantId.Value))
        {
            foreach (var id in resourceIds)
            {
                results[id] = true;
            }
            return results;
        }

        // Check each individually (could be optimized further)
        foreach (var resourceId in resourceIds)
        {
            results[resourceId] = await CanAsync(userId, resource, action, resourceId, tenantId);
        }

        return results;
    }

    // ==================== PERMISSION MANAGEMENT ====================

    public async Task<Permission> GrantPermissionAsync(
        Guid userId,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        Guid? resourceId = null,
        string? conditions = null,
        DateTime? expiresAt = null)
    {
        var permission = new Permission
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TenantId = tenantId,
            Resource = resource,
            ResourceId = resourceId,
            Action = action,
            Scope = scope,
            Conditions = conditions,
            ExpiresAt = expiresAt,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync();

        ClearUserCache(userId);

        _logger.LogInformation("Granted permission {Resource}:{Action} to user {UserId}", resource, action, userId);

        return permission;
    }

    public async Task<Permission> GrantRolePermissionAsync(
        AppRole role,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        string? conditions = null)
    {
        var permission = new Permission
        {
            Id = Guid.NewGuid(),
            Role = role,
            TenantId = tenantId,
            Resource = resource,
            Action = action,
            Scope = scope,
            Conditions = conditions,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Granted permission {Resource}:{Action} to role {Role}", resource, action, role);

        return permission;
    }

    public async Task RevokePermissionAsync(Guid permissionId)
    {
        var permission = await _context.Permissions.FindAsync(permissionId);
        if (permission != null)
        {
            permission.IsActive = false;
            await _context.SaveChangesAsync();

            if (permission.UserId.HasValue)
            {
                ClearUserCache(permission.UserId.Value);
            }

            _logger.LogInformation("Revoked permission {PermissionId}", permissionId);
        }
    }

    public async Task RevokeUserPermissionsAsync(Guid userId, string resource, Guid? tenantId = null)
    {
        var permissions = await _context.Permissions
            .Where(p => p.UserId == userId && p.Resource == resource)
            .Where(p => !tenantId.HasValue || p.TenantId == tenantId)
            .ToListAsync();

        foreach (var permission in permissions)
        {
            permission.IsActive = false;
        }

        await _context.SaveChangesAsync();
        ClearUserCache(userId);

        _logger.LogInformation("Revoked all {Resource} permissions for user {UserId}", resource, userId);
    }

    public async Task<List<Permission>> GetUserPermissionsAsync(Guid userId, Guid? tenantId = null)
    {
        return await _context.Permissions
            .Where(p => p.UserId == userId && p.IsActive)
            .Where(p => !tenantId.HasValue || p.TenantId == tenantId)
            .ToListAsync();
    }

    public async Task<List<Permission>> GetRolePermissionsAsync(AppRole role, Guid? tenantId = null)
    {
        return await _context.Permissions
            .Where(p => p.Role == role && p.IsActive)
            .Where(p => !tenantId.HasValue || p.TenantId == tenantId)
            .ToListAsync();
    }

    // ==================== ROLE TEMPLATES ====================

    public async Task ApplyRoleTemplateAsync(Guid userId, AppRole role, Guid tenantId)
    {
        var templates = await _context.RolePermissionTemplates
            .Where(t => t.Role == role)
            .Where(t => t.TenantId == null || t.TenantId == tenantId)
            .ToListAsync();

        foreach (var template in templates)
        {
            await GrantPermissionAsync(
                userId,
                template.Resource,
                template.Action,
                template.DefaultScope,
                tenantId,
                null,
                template.DefaultConditions,
                null
            );
        }

        _logger.LogInformation("Applied role template {Role} to user {UserId} in tenant {TenantId}", role, userId, tenantId);
    }

    public async Task<List<RolePermissionTemplate>> GetRoleTemplateAsync(AppRole role, Guid? tenantId = null)
    {
        return await _context.RolePermissionTemplates
            .Where(t => t.Role == role)
            .Where(t => !tenantId.HasValue || t.TenantId == null || t.TenantId == tenantId)
            .ToListAsync();
    }

    public async Task<RolePermissionTemplate> SetRoleTemplateAsync(
        AppRole role,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        Guid? tenantId = null,
        string? conditions = null)
    {
        var template = new RolePermissionTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Role = role,
            Resource = resource,
            Action = action,
            DefaultScope = scope,
            DefaultConditions = conditions,
            IsSystemTemplate = tenantId == null,
            CreatedAt = DateTime.UtcNow
        };

        _context.RolePermissionTemplates.Add(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Set role template {Role}:{Resource}:{Action}", role, resource, action);

        return template;
    }

    // ==================== ADMIN CHECKS ====================

    public async Task<bool> IsPlatformAdminAsync(Guid userId)
    {
        var user = await GetUserCachedAsync(userId);
        return user?.IsSystemAdmin ?? false;
    }

    public async Task<bool> IsTenantAdminAsync(Guid userId, Guid tenantId)
    {
        var membership = await _context.TenantMemberships
            .Where(tm => tm.UserId == userId && tm.TenantId == tenantId && tm.IsActive)
            .FirstOrDefaultAsync();

        return membership?.Roles.Contains(AppRole.TenantAdmin) ?? false;
    }

    // ==================== SOFT DELETE OPERATIONS ====================

    public async Task<bool> CanSoftDeleteAsync(Guid userId, string resource, Guid resourceId, Guid? tenantId = null)
    {
        // Platform admin or tenant admin can soft delete
        if (await IsPlatformAdminAsync(userId))
            return true;

        if (tenantId.HasValue && await IsTenantAdminAsync(userId, tenantId.Value))
            return true;

        // Check for explicit Delete permission
        return await CanAsync(userId, resource, PermissionAction.Delete, resourceId, tenantId);
    }

    public async Task<bool> CanHardDeleteAsync(Guid userId, string resource, Guid resourceId)
    {
        // Only platform admins can hard delete
        return await IsPlatformAdminAsync(userId);
    }

    public async Task<bool> CanRestoreAsync(Guid userId, string resource, Guid resourceId, Guid? tenantId = null)
    {
        // Platform admin or tenant admin can restore
        if (await IsPlatformAdminAsync(userId))
            return true;

        if (tenantId.HasValue && await IsTenantAdminAsync(userId, tenantId.Value))
            return true;

        // Check for explicit Restore permission
        return await CanAsync(userId, resource, PermissionAction.Restore, resourceId, tenantId);
    }

    // ==================== HELPER METHODS ====================

    private async Task<User?> GetUserCachedAsync(Guid userId)
    {
        var cacheKey = $"{PERMISSION_CACHE_PREFIX}user_{userId}";

        if (_cache.TryGetValue(cacheKey, out User? cachedUser))
        {
            return cachedUser;
        }

        var user = await _context.Users
            .Include(u => u.TenantMemberships)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user != null)
        {
            _cache.Set(cacheKey, user, TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
        }

        return user;
    }

    private async Task<Permission?> GetUserPermissionAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId, Guid? tenantId)
    {
        return await _context.Permissions
            .Where(p => p.UserId == userId)
            .Where(p => p.Resource == resource && p.Action == action)
            .Where(p => !resourceId.HasValue || p.ResourceId == null || p.ResourceId == resourceId)
            .Where(p => !tenantId.HasValue || p.TenantId == null || p.TenantId == tenantId)
            .Where(p => p.IsActive)
            .FirstOrDefaultAsync();
    }

    private async Task<Permission?> GetRolePermissionAsync(AppRole role, string resource, PermissionAction action, Guid? tenantId)
    {
        return await _context.Permissions
            .Where(p => p.Role == role)
            .Where(p => p.Resource == resource && p.Action == action)
            .Where(p => !tenantId.HasValue || p.TenantId == null || p.TenantId == tenantId)
            .Where(p => p.IsActive)
            .FirstOrDefaultAsync();
    }

    private async Task<List<AppRole>> GetUserRolesAsync(Guid userId, Guid? tenantId)
    {
        var memberships = await _context.TenantMemberships
            .Where(tm => tm.UserId == userId && tm.IsActive)
            .Where(tm => !tenantId.HasValue || tm.TenantId == tenantId)
            .ToListAsync();

        return memberships.SelectMany(m => m.Roles).Distinct().ToList();
    }

    private bool IsExpired(Permission permission)
    {
        return permission.ExpiresAt.HasValue && permission.ExpiresAt.Value < DateTime.UtcNow;
    }

    private void ClearUserCache(Guid userId)
    {
        var cacheKey = $"{PERMISSION_CACHE_PREFIX}user_{userId}";
        _cache.Remove(cacheKey);
    }

    private async Task LogAuthorizationAsync(Guid userId, Guid? tenantId, string resource, Guid? resourceId, PermissionAction action, bool wasAllowed, string? reason)
    {
        try
        {
            var log = new AuthorizationAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TenantId = tenantId,
                Resource = resource,
                ResourceId = resourceId,
                Action = action,
                WasAllowed = wasAllowed,
                DenialReason = wasAllowed ? null : reason,
                Timestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuthorizationAuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log authorization audit entry");
            // Don't throw - logging failure shouldn't block authorization
        }
    }
}

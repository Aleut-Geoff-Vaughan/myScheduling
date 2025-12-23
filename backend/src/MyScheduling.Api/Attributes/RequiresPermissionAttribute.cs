using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using System.Security.Claims;

namespace MyScheduling.Api.Attributes;

/// <summary>
/// Attribute to require specific permissions for controller actions.
/// Integrates with IAuthorizationService for zero-trust security.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequiresPermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string Resource { get; set; } = string.Empty;
    public PermissionAction Action { get; set; }
    public bool AllowPlatformAdmin { get; set; } = true;
    public bool AllowTenantAdmin { get; set; } = true;

    public RequiresPermissionAttribute()
    {
    }

    public RequiresPermissionAttribute(string resource, PermissionAction action)
    {
        Resource = resource;
        Action = action;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Get authorization service from DI
        var authService = context.HttpContext.RequestServices.GetService<IAuthorizationService>();
        if (authService == null)
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        // Check for impersonation - if the original user (admin) is a system admin, allow access
        var isImpersonatingClaim = context.HttpContext.User.Claims.FirstOrDefault(c =>
            c.Type.Equals("IsImpersonating", StringComparison.OrdinalIgnoreCase));
        if (isImpersonatingClaim != null && bool.TryParse(isImpersonatingClaim.Value, out var isImpersonating) && isImpersonating)
        {
            // When impersonating, check if the original admin user is a platform admin
            var originalUserIdClaim = context.HttpContext.User.Claims.FirstOrDefault(c =>
                c.Type.Equals("OriginalUserId", StringComparison.OrdinalIgnoreCase));
            if (originalUserIdClaim != null && Guid.TryParse(originalUserIdClaim.Value, out var originalUserId))
            {
                var isOriginalUserAdmin = await authService.IsPlatformAdminAsync(originalUserId);
                if (isOriginalUserAdmin && AllowPlatformAdmin)
                {
                    // Allow impersonating admins to act as the impersonated user
                    return;
                }
            }
        }

        // Get user ID from JWT claims
        var userIdClaim = context.HttpContext.User.Claims.FirstOrDefault(c =>
            c.Type == ClaimTypes.NameIdentifier ||
            c.Type.Equals("sub", StringComparison.OrdinalIgnoreCase) ||
            c.Type.Equals("userId", StringComparison.OrdinalIgnoreCase));
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new { error = "User ID not found in token" });
            return;
        }

        // Get tenant ID from X-Tenant-Id header first, then fallback to JWT claims
        Guid? tenantId = null;

        // Check for X-Tenant-Id header (preferred - set by frontend when workspace is selected)
        if (context.HttpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId) &&
            Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderTenantId))
        {
            // Verify the user has access to this tenant (check JWT claims)
            var userTenantIds = context.HttpContext.User.Claims
                .Where(c => c.Type.Equals("TenantId", StringComparison.OrdinalIgnoreCase))
                .Select(c => Guid.TryParse(c.Value, out var tid) ? tid : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList();

            if (userTenantIds.Contains(parsedHeaderTenantId))
            {
                tenantId = parsedHeaderTenantId;
            }
        }

        // Fallback to JWT claims if no header (for single-tenant users or admin workspace)
        if (!tenantId.HasValue)
        {
            var tenantIdClaim = context.HttpContext.User.Claims.FirstOrDefault(c =>
                c.Type.Equals("tenantId", StringComparison.OrdinalIgnoreCase) ||
                c.Type.Equals("TenantId", StringComparison.OrdinalIgnoreCase));
            if (tenantIdClaim != null && Guid.TryParse(tenantIdClaim.Value, out var parsedTenantId))
            {
                tenantId = parsedTenantId;
            }
        }

        // Get resource ID from route if available
        Guid? resourceId = null;
        if (context.RouteData.Values.TryGetValue("id", out var idValue) &&
            Guid.TryParse(idValue?.ToString(), out var parsedResourceId))
        {
            resourceId = parsedResourceId;
        }

        try
        {
            // Perform authorization check
            var result = await authService.CheckAsync(userId, Resource, Action, resourceId, tenantId);

            if (!result.IsAuthorized)
            {
                // Check if platform admin bypass is allowed
                if (AllowPlatformAdmin && result.IsPlatformAdmin)
                {
                    return; // Allow
                }

                // Check if tenant admin bypass is allowed
                if (AllowTenantAdmin && result.IsTenantAdmin)
                {
                    return; // Allow
                }

                // Log authorization denial for security audit
                var logger = context.HttpContext.RequestServices.GetService<ILogger<RequiresPermissionAttribute>>();
                var correlationId = context.HttpContext.Items.TryGetValue("CorrelationId", out var corrId)
                    ? corrId?.ToString() ?? "unknown"
                    : "unknown";
                var clientIp = GetClientIp(context.HttpContext);
                var userEmail = context.HttpContext.User.Claims
                    .FirstOrDefault(c => c.Type == ClaimTypes.Email || c.Type.Equals("email", StringComparison.OrdinalIgnoreCase))?.Value ?? "unknown";
                var requestPath = context.HttpContext.Request.Path.Value ?? "unknown";
                var requestMethod = context.HttpContext.Request.Method;

                logger?.LogWarning(
                    "AUDIT: Authorization denied. UserId={UserId}, UserEmail={UserEmail}, Resource={Resource}, Action={Action}, " +
                    "TenantId={TenantId}, ResourceId={ResourceId}, Reason={Reason}, IsPlatformAdmin={IsPlatformAdmin}, " +
                    "IsTenantAdmin={IsTenantAdmin}, ClientIp={ClientIp}, RequestPath={RequestPath}, RequestMethod={RequestMethod}, " +
                    "CorrelationId={CorrelationId}",
                    userId, userEmail, Resource, Action.ToString(),
                    tenantId?.ToString() ?? "none", resourceId?.ToString() ?? "none",
                    result.Reason ?? "Insufficient permissions", result.IsPlatformAdmin, result.IsTenantAdmin,
                    clientIp, requestPath, requestMethod, correlationId);

                // Deny access with 403 Forbidden
                context.Result = new ObjectResult(new
                {
                    error = "Access denied",
                    reason = result.Reason ?? "Insufficient permissions",
                    resource = Resource,
                    action = Action.ToString(),
                    correlationId = correlationId
                })
                {
                    StatusCode = 403
                };
                context.HttpContext.Response.Headers["X-Denial-Reason"] = result.Reason ?? "Insufficient permissions";
            }
            // If authorized, continue to action
        }
        catch (Exception ex)
        {
            var logger = context.HttpContext.RequestServices.GetService<ILogger<RequiresPermissionAttribute>>();
            var correlationId = context.HttpContext.Items.TryGetValue("CorrelationId", out var corrId)
                ? corrId?.ToString() ?? "unknown"
                : "unknown";

            logger?.LogError(ex,
                "AUDIT: Authorization check failed. Resource={Resource}, Action={Action}, CorrelationId={CorrelationId}",
                Resource, Action.ToString(), correlationId);

            context.Result = new ObjectResult(new { error = "Authorization check failed", correlationId = correlationId })
            {
                StatusCode = 500
            };
        }
    }

    /// <summary>
    /// Gets the client IP address from the HTTP context, checking reverse proxy headers first.
    /// </summary>
    private static string GetClientIp(HttpContext context)
    {
        // Check for X-Forwarded-For header (reverse proxy)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            // Take the first IP in the chain (original client)
            var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries);
            if (ips.Length > 0)
            {
                return ips[0].Trim();
            }
        }

        // Check for X-Real-IP header (alternative reverse proxy header)
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fall back to connection remote IP
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;

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

        // Get user ID from JWT claims
        var userIdClaim = context.HttpContext.User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "userId");
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new { error = "User ID not found in token" });
            return;
        }

        // Get tenant ID from JWT claims if available
        Guid? tenantId = null;
        var tenantIdClaim = context.HttpContext.User.Claims.FirstOrDefault(c => c.Type == "tenantId");
        if (tenantIdClaim != null && Guid.TryParse(tenantIdClaim.Value, out var parsedTenantId))
        {
            tenantId = parsedTenantId;
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

                // Deny access with 403 Forbidden
                context.Result = new ObjectResult(new
                {
                    error = "Access denied",
                    reason = result.Reason ?? "Insufficient permissions",
                    resource = Resource,
                    action = Action.ToString()
                })
                {
                    StatusCode = 403
                };
                context.HttpContext.Response.Headers.Add("X-Denial-Reason", result.Reason ?? "Insufficient permissions");
            }
            // If authorized, continue to action
        }
        catch (Exception ex)
        {
            // Log the exception (you could inject ILogger here)
            context.Result = new ObjectResult(new { error = "Authorization check failed", details = ex.Message })
            {
                StatusCode = 500
            };
        }
    }
}

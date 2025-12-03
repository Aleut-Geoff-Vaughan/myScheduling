using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;

namespace MyScheduling.Infrastructure.Data.Seeds;

/// <summary>
/// Seeds default role permission templates for the authorization framework.
/// These templates define what each role can do by default.
/// </summary>
public static class PermissionSeeder
{
    public static async Task SeedRolePermissionTemplatesAsync(MySchedulingDbContext context, ILogger logger)
    {
        logger.LogInformation("Starting role permission template seeding...");

        // Clear existing system templates (tenant-specific templates are preserved)
        var existingSystemTemplates = await context.RolePermissionTemplates
            .Where(t => t.TenantId == null)
            .ToListAsync();

        if (existingSystemTemplates.Any())
        {
            context.RolePermissionTemplates.RemoveRange(existingSystemTemplates);
            await context.SaveChangesAsync();
            logger.LogInformation("Cleared {Count} existing system templates", existingSystemTemplates.Count);
        }

        var templates = new List<RolePermissionTemplate>();

        // ==================== SYSTEM ADMIN ====================
        // Full access to everything
        templates.AddRange(CreateFullAccessTemplates(AppRole.SystemAdmin));

        // ==================== TENANT ADMIN ====================
        // Full access within tenant
        templates.AddRange(new[]
        {
            Create(AppRole.TenantAdmin, "User", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "Project", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "WbsElement", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "Assignment", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "Booking", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "Office", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "Space", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "ResumeProfile", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "WorkLocationTemplate", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "ValidationRule", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "User", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.TenantAdmin, "TenantMembership", PermissionAction.Manage, PermissionScope.Tenant),
        });

        // ==================== EXECUTIVE ====================
        templates.AddRange(new[]
        {
            Create(AppRole.Executive, "User", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Executive, "Project", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Executive, "WbsElement", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Executive, "Assignment", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Executive, "Booking", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Executive, "ResumeProfile", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== RESOURCE MANAGER ====================
        templates.AddRange(new[]
        {
            Create(AppRole.ResourceManager, "User", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.ResourceManager, "Assignment", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.ResourceManager, "Project", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResourceManager, "WbsElement", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResourceManager, "ResumeProfile", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== PROJECT MANAGER ====================
        templates.AddRange(new[]
        {
            Create(AppRole.ProjectManager, "Project", PermissionAction.Manage, PermissionScope.Individual),
            Create(AppRole.ProjectManager, "WbsElement", PermissionAction.Manage, PermissionScope.Individual),
            Create(AppRole.ProjectManager, "Assignment", PermissionAction.Approve, PermissionScope.Individual),
            Create(AppRole.ProjectManager, "User", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ProjectManager, "ResumeProfile", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== TEAM LEAD ====================
        templates.AddRange(new[]
        {
            Create(AppRole.TeamLead, "User", PermissionAction.Read, PermissionScope.Department),
            Create(AppRole.TeamLead, "Assignment", PermissionAction.Read, PermissionScope.Department),
            Create(AppRole.TeamLead, "Booking", PermissionAction.Read, PermissionScope.Department),
            Create(AppRole.TeamLead, "WorkLocationPreference", PermissionAction.Read, PermissionScope.Department),
            Create(AppRole.TeamLead, "ResumeProfile", PermissionAction.Read, PermissionScope.Department),
        });

        // ==================== OFFICE MANAGER ====================
        templates.AddRange(new[]
        {
            Create(AppRole.OfficeManager, "Office", PermissionAction.Manage, PermissionScope.Individual),
            Create(AppRole.OfficeManager, "Space", PermissionAction.Manage, PermissionScope.Individual),
            Create(AppRole.OfficeManager, "Booking", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.OfficeManager, "SpaceMaintenanceLog", PermissionAction.Manage, PermissionScope.Tenant),
            Create(AppRole.OfficeManager, "User", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== OVERRIDE APPROVER ====================
        templates.AddRange(new[]
        {
            Create(AppRole.OverrideApprover, "Assignment", PermissionAction.Approve, PermissionScope.Tenant),
            Create(AppRole.OverrideApprover, "WbsElement", PermissionAction.Approve, PermissionScope.Tenant),
            Create(AppRole.OverrideApprover, "ResumeApproval", PermissionAction.Approve, PermissionScope.Tenant),
        });

        // ==================== RESUME VIEWER ====================
        // Can view and search all employee resumes within tenant
        templates.AddRange(new[]
        {
            Create(AppRole.ResumeViewer, "ResumeProfile", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "ResumeSection", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "ResumeEntry", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "ResumeVersion", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "ResumeApproval", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "User", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "PersonSkill", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "Skill", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "Certification", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ResumeViewer, "ResumeTemplate", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== EMPLOYEE ====================
        templates.AddRange(new[]
        {
            Create(AppRole.Employee, "User", PermissionAction.Read, PermissionScope.Owner),
            Create(AppRole.Employee, "User", PermissionAction.Update, PermissionScope.Owner),
            Create(AppRole.Employee, "Assignment", PermissionAction.Read, PermissionScope.Owner),
            Create(AppRole.Employee, "Booking", PermissionAction.Create, PermissionScope.Owner),
            Create(AppRole.Employee, "Booking", PermissionAction.Read, PermissionScope.Owner),
            Create(AppRole.Employee, "Booking", PermissionAction.Update, PermissionScope.Owner),
            Create(AppRole.Employee, "Booking", PermissionAction.Delete, PermissionScope.Owner),
            Create(AppRole.Employee, "WorkLocationPreference", PermissionAction.Manage, PermissionScope.Owner),
            Create(AppRole.Employee, "ResumeProfile", PermissionAction.Manage, PermissionScope.Owner),
            Create(AppRole.Employee, "Office", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Employee, "Space", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.Employee, "Project", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== VIEW ONLY ====================
        templates.AddRange(new[]
        {
            Create(AppRole.ViewOnly, "User", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "Project", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "WbsElement", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "Assignment", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "Booking", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "Office", PermissionAction.Read, PermissionScope.Tenant),
            Create(AppRole.ViewOnly, "Space", PermissionAction.Read, PermissionScope.Tenant),
        });

        // ==================== SUPPORT ====================
        templates.AddRange(new[]
        {
            Create(AppRole.Support, "User", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Support, "Tenant", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Support, "AuthorizationAuditLog", PermissionAction.Read, PermissionScope.System),
        });

        // ==================== AUDITOR ====================
        templates.AddRange(new[]
        {
            Create(AppRole.Auditor, "AuthorizationAuditLog", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Auditor, "WbsChangeHistory", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Auditor, "AssignmentHistory", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Auditor, "User", PermissionAction.Read, PermissionScope.System),
            Create(AppRole.Auditor, "Assignment", PermissionAction.Read, PermissionScope.System),
        });

        // Add all templates
        await context.RolePermissionTemplates.AddRangeAsync(templates);
        await context.SaveChangesAsync();

        logger.LogInformation("Successfully seeded {Count} role permission templates", templates.Count);
    }

    private static RolePermissionTemplate Create(AppRole role, string resource, PermissionAction action, PermissionScope scope, string? conditions = null)
    {
        return new RolePermissionTemplate
        {
            Id = Guid.NewGuid(),
            Role = role,
            Resource = resource,
            Action = action,
            DefaultScope = scope,
            DefaultConditions = conditions,
            IsSystemTemplate = true,
            CreatedAt = DateTime.UtcNow,
            Description = $"{role} can {action} {resource} at {scope} scope"
        };
    }

    private static List<RolePermissionTemplate> CreateFullAccessTemplates(AppRole role)
    {
        var resources = new[]
        {
            "User", "Tenant", "TenantMembership",
            "Project", "WbsElement", "Assignment", "ProjectRole",
            "Booking", "Office", "Space", "WorkLocationPreference",
            "ResumeProfile", "ResumeSection", "ResumeEntry", "ResumeVersion", "ResumeApproval",
            "Skill", "PersonSkill",
            "WorkLocationTemplate", "DelegationOfAuthorityLetter",
            "ValidationRule", "Permission", "AuthorizationAuditLog",
            "DataArchive"
        };

        var templates = new List<RolePermissionTemplate>();

        foreach (var resource in resources)
        {
            templates.Add(Create(role, resource, PermissionAction.Manage, PermissionScope.System));
        }

        return templates;
    }
}

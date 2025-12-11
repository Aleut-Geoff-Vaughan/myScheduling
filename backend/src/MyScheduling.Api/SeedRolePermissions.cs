using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api;

public static class SeedRolePermissions
{
    /// <summary>
    /// Seeds role permission templates for the application.
    /// These define the default permissions for each role.
    /// </summary>
    public static async Task SeedRolePermissionTemplates(MySchedulingDbContext context)
    {
        Console.WriteLine("Checking role permission templates...");

        var existingTemplates = await context.RolePermissionTemplates.ToListAsync();
        var templatesToAdd = new List<RolePermissionTemplate>();

        // Get all templates we want to have
        var desiredTemplates = GetAllRolePermissionTemplates();

        foreach (var template in desiredTemplates)
        {
            // Check if this template already exists
            var exists = existingTemplates.Any(t =>
                t.Role == template.Role &&
                t.Resource == template.Resource &&
                t.Action == template.Action &&
                t.TenantId == template.TenantId);

            if (!exists)
            {
                template.Id = Guid.NewGuid();
                template.CreatedAt = DateTime.UtcNow;
                templatesToAdd.Add(template);
            }
        }

        if (templatesToAdd.Count > 0)
        {
            context.RolePermissionTemplates.AddRange(templatesToAdd);
            await context.SaveChangesAsync();
            Console.WriteLine($"Added {templatesToAdd.Count} role permission templates.");
        }
        else
        {
            Console.WriteLine("All role permission templates already exist.");
        }
    }

    private static List<RolePermissionTemplate> GetAllRolePermissionTemplates()
    {
        var templates = new List<RolePermissionTemplate>();

        // Employee role permissions - basic access for all users
        templates.AddRange(GetEmployeeTemplates());

        // FinanceLead role permissions - manages cost rates and financial forecasts
        templates.AddRange(GetFinanceLeadTemplates());

        // Executive role permissions - read-only access to financial data
        templates.AddRange(GetExecutiveTemplates());

        // ResourceManager role permissions
        templates.AddRange(GetResourceManagerTemplates());

        // ProjectManager role permissions
        templates.AddRange(GetProjectManagerTemplates());

        // OfficeManager role permissions - manages facilities
        templates.AddRange(GetOfficeManagerTemplates());

        // ForecastVersion permissions (for all roles that need forecast access)
        templates.AddRange(GetForecastVersionTemplates());

        // ProjectRoleAssignment permissions
        templates.AddRange(GetProjectRoleAssignmentTemplates());

        // Forecast permissions (CRUD for forecasts - separate from ForecastVersion)
        templates.AddRange(GetForecastTemplates());

        // CareerJobFamily permissions
        templates.AddRange(GetCareerJobFamilyTemplates());

        // LaborCategory permissions
        templates.AddRange(GetLaborCategoryTemplates());

        // ForecastApprovalSchedule permissions
        templates.AddRange(GetForecastApprovalScheduleTemplates());

        return templates;
    }

    private static List<RolePermissionTemplate> GetEmployeeTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Delegation of Authority - Read/Create/Update own letters
            CreateTemplate(AppRole.Employee, "DelegationOfAuthority", PermissionAction.Read, PermissionScope.Owner,
                "View own DOA letters (as delegator or designee)"),
            CreateTemplate(AppRole.Employee, "DelegationOfAuthority", PermissionAction.Create, PermissionScope.Owner,
                "Create DOA letters"),
            CreateTemplate(AppRole.Employee, "DelegationOfAuthority", PermissionAction.Update, PermissionScope.Owner,
                "Update own DOA letters"),
            CreateTemplate(AppRole.Employee, "DelegationOfAuthority", PermissionAction.Delete, PermissionScope.Owner,
                "Delete own draft DOA letters"),
            CreateTemplate(AppRole.Employee, "DelegationOfAuthority", PermissionAction.Approve, PermissionScope.Owner,
                "Sign DOA letters where user is delegator or designee"),

            // Project Assignments - Read own assignments
            CreateTemplate(AppRole.Employee, "ProjectAssignment", PermissionAction.Read, PermissionScope.Owner,
                "View own project assignments"),

            // Work Locations - Basic access for scheduling
            CreateTemplate(AppRole.Employee, "WorkLocation", PermissionAction.Read, PermissionScope.Owner,
                "View own work location schedule"),
            CreateTemplate(AppRole.Employee, "WorkLocation", PermissionAction.Create, PermissionScope.Owner,
                "Create own work location entries"),
            CreateTemplate(AppRole.Employee, "WorkLocation", PermissionAction.Update, PermissionScope.Owner,
                "Update own work location entries"),
            CreateTemplate(AppRole.Employee, "WorkLocation", PermissionAction.Delete, PermissionScope.Owner,
                "Delete own work location entries"),

            // Templates - Basic access
            CreateTemplate(AppRole.Employee, "WorkLocationTemplate", PermissionAction.Read, PermissionScope.Owner,
                "View own work location templates"),
            CreateTemplate(AppRole.Employee, "WorkLocationTemplate", PermissionAction.Create, PermissionScope.Owner,
                "Create own work location templates"),
            CreateTemplate(AppRole.Employee, "WorkLocationTemplate", PermissionAction.Update, PermissionScope.Owner,
                "Update own work location templates"),
            CreateTemplate(AppRole.Employee, "WorkLocationTemplate", PermissionAction.Delete, PermissionScope.Owner,
                "Delete own work location templates"),

            // Bookings - Basic hoteling access
            CreateTemplate(AppRole.Employee, "Booking", PermissionAction.Read, PermissionScope.Owner,
                "View own desk/room bookings"),
            CreateTemplate(AppRole.Employee, "Booking", PermissionAction.Create, PermissionScope.Owner,
                "Create desk/room bookings"),
            CreateTemplate(AppRole.Employee, "Booking", PermissionAction.Update, PermissionScope.Owner,
                "Update own bookings"),
            CreateTemplate(AppRole.Employee, "Booking", PermissionAction.Delete, PermissionScope.Owner,
                "Cancel own bookings"),

            // Time Entries - Basic timesheet access
            CreateTemplate(AppRole.Employee, "TimeEntry", PermissionAction.Read, PermissionScope.Owner,
                "View own time entries"),
            CreateTemplate(AppRole.Employee, "TimeEntry", PermissionAction.Create, PermissionScope.Owner,
                "Create time entries"),
            CreateTemplate(AppRole.Employee, "TimeEntry", PermissionAction.Update, PermissionScope.Owner,
                "Update own time entries"),
            CreateTemplate(AppRole.Employee, "TimeEntry", PermissionAction.Delete, PermissionScope.Owner,
                "Delete own draft time entries"),

            // Profile - Self management
            CreateTemplate(AppRole.Employee, "UserProfile", PermissionAction.Read, PermissionScope.Owner,
                "View own profile"),
            CreateTemplate(AppRole.Employee, "UserProfile", PermissionAction.Update, PermissionScope.Owner,
                "Update own profile"),

            // Tenant - Read access to own tenant(s)
            CreateTemplate(AppRole.Employee, "Tenant", PermissionAction.Read, PermissionScope.Tenant,
                "View tenant information"),
        };
    }

    private static List<RolePermissionTemplate> GetFinanceLeadTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Cost Rates - Full CRUD + Import/Export
            CreateTemplate(AppRole.FinanceLead, "EmployeeCostRate", PermissionAction.Manage, PermissionScope.Tenant,
                "Full access to employee cost rates including import/export"),
            CreateTemplate(AppRole.FinanceLead, "EmployeeCostRate", PermissionAction.Import, PermissionScope.Tenant,
                "Import employee cost rates from CSV/Excel"),
            CreateTemplate(AppRole.FinanceLead, "EmployeeCostRate", PermissionAction.Export, PermissionScope.Tenant,
                "Export employee cost rates to CSV/Excel"),

            // Non-Labor Cost Types - Full CRUD
            CreateTemplate(AppRole.FinanceLead, "NonLaborCostType", PermissionAction.Manage, PermissionScope.Tenant,
                "Manage non-labor cost type configurations"),

            // Non-Labor Forecasts - Full CRUD
            CreateTemplate(AppRole.FinanceLead, "NonLaborForecast", PermissionAction.Manage, PermissionScope.Tenant,
                "Manage non-labor cost forecasts"),

            // Non-Labor Budget Lines - Full CRUD
            CreateTemplate(AppRole.FinanceLead, "NonLaborBudgetLine", PermissionAction.Manage, PermissionScope.Tenant,
                "Manage non-labor budget lines"),

            // Actual Non-Labor Costs - Full CRUD
            CreateTemplate(AppRole.FinanceLead, "ActualNonLaborCost", PermissionAction.Manage, PermissionScope.Tenant,
                "Manage actual non-labor cost records"),

            // Forecasts - Read and financial views
            CreateTemplate(AppRole.FinanceLead, "Forecast", PermissionAction.Read, PermissionScope.Tenant,
                "View labor forecasts"),
            CreateTemplate(AppRole.FinanceLead, "ForecastFinancial", PermissionAction.Read, PermissionScope.Tenant,
                "View financial forecast data with cost calculations"),

            // Budgets - Read access
            CreateTemplate(AppRole.FinanceLead, "ProjectBudget", PermissionAction.Read, PermissionScope.Tenant,
                "View project budgets"),

            // Staffing Reports - Read financial reports
            CreateTemplate(AppRole.FinanceLead, "StaffingReport", PermissionAction.Read, PermissionScope.Tenant,
                "View staffing and financial reports"),

            // Tenant Settings - Read for fiscal year config
            CreateTemplate(AppRole.FinanceLead, "TenantSettings", PermissionAction.Read, PermissionScope.Tenant,
                "View tenant settings including fiscal year configuration"),
        };
    }

    private static List<RolePermissionTemplate> GetExecutiveTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Cost Rates - Read only
            CreateTemplate(AppRole.Executive, "EmployeeCostRate", PermissionAction.Read, PermissionScope.Tenant,
                "View employee cost rates"),

            // Non-Labor Costs - Read only
            CreateTemplate(AppRole.Executive, "NonLaborCostType", PermissionAction.Read, PermissionScope.Tenant,
                "View non-labor cost types"),
            CreateTemplate(AppRole.Executive, "NonLaborForecast", PermissionAction.Read, PermissionScope.Tenant,
                "View non-labor forecasts"),
            CreateTemplate(AppRole.Executive, "NonLaborBudgetLine", PermissionAction.Read, PermissionScope.Tenant,
                "View non-labor budget lines"),
            CreateTemplate(AppRole.Executive, "ActualNonLaborCost", PermissionAction.Read, PermissionScope.Tenant,
                "View actual non-labor costs"),

            // Forecasts - Full read including financial
            CreateTemplate(AppRole.Executive, "Forecast", PermissionAction.Read, PermissionScope.Tenant,
                "View labor forecasts"),
            CreateTemplate(AppRole.Executive, "ForecastFinancial", PermissionAction.Read, PermissionScope.Tenant,
                "View financial forecast data with cost calculations"),

            // Budgets - Read
            CreateTemplate(AppRole.Executive, "ProjectBudget", PermissionAction.Read, PermissionScope.Tenant,
                "View project budgets"),

            // Reports - Read
            CreateTemplate(AppRole.Executive, "StaffingReport", PermissionAction.Read, PermissionScope.Tenant,
                "View staffing and financial reports"),

            // Facilities - Read access for dashboard
            CreateTemplate(AppRole.Executive, "Facility", PermissionAction.Read, PermissionScope.Tenant,
                "View facilities dashboard and data"),
        };
    }

    private static List<RolePermissionTemplate> GetResourceManagerTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Resource managers can see cost data for resource planning
            CreateTemplate(AppRole.ResourceManager, "EmployeeCostRate", PermissionAction.Read, PermissionScope.Tenant,
                "View employee cost rates for resource planning"),
            CreateTemplate(AppRole.ResourceManager, "ForecastFinancial", PermissionAction.Read, PermissionScope.Tenant,
                "View financial forecast data for resource planning"),

            // Non-Labor - Read only for planning
            CreateTemplate(AppRole.ResourceManager, "NonLaborForecast", PermissionAction.Read, PermissionScope.Tenant,
                "View non-labor forecasts"),
        };
    }

    private static List<RolePermissionTemplate> GetProjectManagerTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Project managers can create/update non-labor forecasts for their projects
            CreateTemplate(AppRole.ProjectManager, "NonLaborForecast", PermissionAction.Create, PermissionScope.Owner,
                "Create non-labor forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "NonLaborForecast", PermissionAction.Update, PermissionScope.Owner,
                "Update non-labor forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "NonLaborForecast", PermissionAction.Read, PermissionScope.Tenant,
                "View all non-labor forecasts"),

            // Read access to cost types for forecasting
            CreateTemplate(AppRole.ProjectManager, "NonLaborCostType", PermissionAction.Read, PermissionScope.Tenant,
                "View non-labor cost types for forecasting"),

            // Limited financial view for their projects
            CreateTemplate(AppRole.ProjectManager, "ForecastFinancial", PermissionAction.Read, PermissionScope.Owner,
                "View financial data for owned projects"),
        };
    }

    private static List<RolePermissionTemplate> GetOfficeManagerTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Facilities - Full CRUD for managing facilities
            CreateTemplate(AppRole.OfficeManager, "Facility", PermissionAction.Manage, PermissionScope.Tenant,
                "Full access to facilities management"),
            CreateTemplate(AppRole.OfficeManager, "Facility", PermissionAction.Read, PermissionScope.Tenant,
                "View facilities dashboard and data"),
            CreateTemplate(AppRole.OfficeManager, "Facility", PermissionAction.Create, PermissionScope.Tenant,
                "Create facilities"),
            CreateTemplate(AppRole.OfficeManager, "Facility", PermissionAction.Update, PermissionScope.Tenant,
                "Update facilities"),
            CreateTemplate(AppRole.OfficeManager, "Facility", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete facilities"),

            // Resources (desks, rooms, equipment) - Full CRUD
            CreateTemplate(AppRole.OfficeManager, "Resource", PermissionAction.Manage, PermissionScope.Tenant,
                "Full access to resource management"),
            CreateTemplate(AppRole.OfficeManager, "Resource", PermissionAction.Read, PermissionScope.Tenant,
                "View resources"),
            CreateTemplate(AppRole.OfficeManager, "Resource", PermissionAction.Create, PermissionScope.Tenant,
                "Create resources"),
            CreateTemplate(AppRole.OfficeManager, "Resource", PermissionAction.Update, PermissionScope.Tenant,
                "Update resources"),
            CreateTemplate(AppRole.OfficeManager, "Resource", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete resources"),

            // Bookings - View all bookings
            CreateTemplate(AppRole.OfficeManager, "Booking", PermissionAction.Read, PermissionScope.Tenant,
                "View all bookings in tenant"),
            CreateTemplate(AppRole.OfficeManager, "Booking", PermissionAction.Update, PermissionScope.Tenant,
                "Modify bookings (for admin purposes)"),
            CreateTemplate(AppRole.OfficeManager, "Booking", PermissionAction.Delete, PermissionScope.Tenant,
                "Cancel bookings (for admin purposes)"),

            // Check-ins - View and manage check-ins
            CreateTemplate(AppRole.OfficeManager, "CheckIn", PermissionAction.Read, PermissionScope.Tenant,
                "View check-in data"),
            CreateTemplate(AppRole.OfficeManager, "CheckIn", PermissionAction.Update, PermissionScope.Tenant,
                "Override check-in status"),
        };
    }

    private static List<RolePermissionTemplate> GetForecastVersionTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read own forecast versions
            CreateTemplate(AppRole.Employee, "ForecastVersion", PermissionAction.Read, PermissionScope.Owner,
                "View forecast versions for assigned projects"),

            // ProjectManager - Full access to forecast versions for their projects
            CreateTemplate(AppRole.ProjectManager, "ForecastVersion", PermissionAction.Read, PermissionScope.Owner,
                "View forecast versions for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastVersion", PermissionAction.Create, PermissionScope.Owner,
                "Create forecast versions for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastVersion", PermissionAction.Update, PermissionScope.Owner,
                "Update forecast versions for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastVersion", PermissionAction.Delete, PermissionScope.Owner,
                "Delete forecast versions for owned projects"),

            // ResourceManager - Read and manage forecast versions
            CreateTemplate(AppRole.ResourceManager, "ForecastVersion", PermissionAction.Read, PermissionScope.Tenant,
                "View all forecast versions in tenant"),
            CreateTemplate(AppRole.ResourceManager, "ForecastVersion", PermissionAction.Create, PermissionScope.Tenant,
                "Create forecast versions"),
            CreateTemplate(AppRole.ResourceManager, "ForecastVersion", PermissionAction.Update, PermissionScope.Tenant,
                "Update forecast versions"),
            CreateTemplate(AppRole.ResourceManager, "ForecastVersion", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete forecast versions"),

            // FinanceLead - Full read access
            CreateTemplate(AppRole.FinanceLead, "ForecastVersion", PermissionAction.Read, PermissionScope.Tenant,
                "View all forecast versions in tenant"),

            // Executive - Read access
            CreateTemplate(AppRole.Executive, "ForecastVersion", PermissionAction.Read, PermissionScope.Tenant,
                "View all forecast versions in tenant"),
        };
    }

    private static List<RolePermissionTemplate> GetProjectRoleAssignmentTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read own project role assignments
            CreateTemplate(AppRole.Employee, "ProjectRoleAssignment", PermissionAction.Read, PermissionScope.Owner,
                "View own project role assignments"),

            // ProjectManager - Manage assignments for their projects
            CreateTemplate(AppRole.ProjectManager, "ProjectRoleAssignment", PermissionAction.Read, PermissionScope.Owner,
                "View project role assignments for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ProjectRoleAssignment", PermissionAction.Create, PermissionScope.Owner,
                "Create project role assignments for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ProjectRoleAssignment", PermissionAction.Update, PermissionScope.Owner,
                "Update project role assignments for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ProjectRoleAssignment", PermissionAction.Delete, PermissionScope.Owner,
                "Delete project role assignments for owned projects"),

            // ResourceManager - Full tenant access for resource planning
            CreateTemplate(AppRole.ResourceManager, "ProjectRoleAssignment", PermissionAction.Read, PermissionScope.Tenant,
                "View all project role assignments in tenant"),
            CreateTemplate(AppRole.ResourceManager, "ProjectRoleAssignment", PermissionAction.Create, PermissionScope.Tenant,
                "Create project role assignments"),
            CreateTemplate(AppRole.ResourceManager, "ProjectRoleAssignment", PermissionAction.Update, PermissionScope.Tenant,
                "Update project role assignments"),
            CreateTemplate(AppRole.ResourceManager, "ProjectRoleAssignment", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete project role assignments"),

            // FinanceLead - Read access for cost planning
            CreateTemplate(AppRole.FinanceLead, "ProjectRoleAssignment", PermissionAction.Read, PermissionScope.Tenant,
                "View all project role assignments in tenant"),

            // Executive - Read access
            CreateTemplate(AppRole.Executive, "ProjectRoleAssignment", PermissionAction.Read, PermissionScope.Tenant,
                "View all project role assignments in tenant"),
        };
    }

    private static List<RolePermissionTemplate> GetForecastTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read own forecasts (for their project assignments)
            CreateTemplate(AppRole.Employee, "Forecast", PermissionAction.Read, PermissionScope.Owner,
                "View forecasts for assigned projects"),

            // ProjectManager - Full CRUD for their projects
            CreateTemplate(AppRole.ProjectManager, "Forecast", PermissionAction.Read, PermissionScope.Owner,
                "View forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "Forecast", PermissionAction.Create, PermissionScope.Owner,
                "Create forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "Forecast", PermissionAction.Update, PermissionScope.Owner,
                "Update forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "Forecast", PermissionAction.Delete, PermissionScope.Owner,
                "Delete forecasts for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "Forecast", PermissionAction.Approve, PermissionScope.Owner,
                "Approve forecasts for owned projects"),

            // ResourceManager - Full tenant access
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Read, PermissionScope.Tenant,
                "View all forecasts in tenant"),
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Create, PermissionScope.Tenant,
                "Create forecasts"),
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Update, PermissionScope.Tenant,
                "Update forecasts"),
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete forecasts"),
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Approve, PermissionScope.Tenant,
                "Approve forecasts"),
            CreateTemplate(AppRole.ResourceManager, "Forecast", PermissionAction.Manage, PermissionScope.Tenant,
                "Full forecast management access"),
        };
    }

    private static List<RolePermissionTemplate> GetCareerJobFamilyTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read access for viewing job families
            CreateTemplate(AppRole.Employee, "CareerJobFamily", PermissionAction.Read, PermissionScope.Tenant,
                "View career job families"),

            // ProjectManager - Read for staffing planning
            CreateTemplate(AppRole.ProjectManager, "CareerJobFamily", PermissionAction.Read, PermissionScope.Tenant,
                "View career job families for staffing"),

            // ResourceManager - Full CRUD for managing job families
            CreateTemplate(AppRole.ResourceManager, "CareerJobFamily", PermissionAction.Read, PermissionScope.Tenant,
                "View all career job families"),
            CreateTemplate(AppRole.ResourceManager, "CareerJobFamily", PermissionAction.Create, PermissionScope.Tenant,
                "Create career job families"),
            CreateTemplate(AppRole.ResourceManager, "CareerJobFamily", PermissionAction.Update, PermissionScope.Tenant,
                "Update career job families"),
            CreateTemplate(AppRole.ResourceManager, "CareerJobFamily", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete career job families"),

            // FinanceLead - Read for cost analysis
            CreateTemplate(AppRole.FinanceLead, "CareerJobFamily", PermissionAction.Read, PermissionScope.Tenant,
                "View career job families for cost analysis"),

            // Executive - Read access
            CreateTemplate(AppRole.Executive, "CareerJobFamily", PermissionAction.Read, PermissionScope.Tenant,
                "View career job families"),
        };
    }

    private static List<RolePermissionTemplate> GetLaborCategoryTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read access for viewing labor categories
            CreateTemplate(AppRole.Employee, "LaborCategory", PermissionAction.Read, PermissionScope.Tenant,
                "View labor categories"),

            // ProjectManager - Full CRUD for their projects
            CreateTemplate(AppRole.ProjectManager, "LaborCategory", PermissionAction.Read, PermissionScope.Tenant,
                "View labor categories"),
            CreateTemplate(AppRole.ProjectManager, "LaborCategory", PermissionAction.Create, PermissionScope.Owner,
                "Create labor categories for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "LaborCategory", PermissionAction.Update, PermissionScope.Owner,
                "Update labor categories for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "LaborCategory", PermissionAction.Delete, PermissionScope.Owner,
                "Delete labor categories for owned projects"),

            // ResourceManager - Full tenant access
            CreateTemplate(AppRole.ResourceManager, "LaborCategory", PermissionAction.Read, PermissionScope.Tenant,
                "View all labor categories"),
            CreateTemplate(AppRole.ResourceManager, "LaborCategory", PermissionAction.Create, PermissionScope.Tenant,
                "Create labor categories"),
            CreateTemplate(AppRole.ResourceManager, "LaborCategory", PermissionAction.Update, PermissionScope.Tenant,
                "Update labor categories"),
            CreateTemplate(AppRole.ResourceManager, "LaborCategory", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete labor categories"),

            // FinanceLead - Read for cost analysis
            CreateTemplate(AppRole.FinanceLead, "LaborCategory", PermissionAction.Read, PermissionScope.Tenant,
                "View labor categories for cost analysis"),

            // Executive - Read access
            CreateTemplate(AppRole.Executive, "LaborCategory", PermissionAction.Read, PermissionScope.Tenant,
                "View labor categories"),
        };
    }

    private static List<RolePermissionTemplate> GetForecastApprovalScheduleTemplates()
    {
        return new List<RolePermissionTemplate>
        {
            // Employee - Read own approval schedules
            CreateTemplate(AppRole.Employee, "ForecastApprovalSchedule", PermissionAction.Read, PermissionScope.Owner,
                "View own forecast approval schedules"),

            // ProjectManager - Full CRUD for their projects
            CreateTemplate(AppRole.ProjectManager, "ForecastApprovalSchedule", PermissionAction.Read, PermissionScope.Owner,
                "View approval schedules for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastApprovalSchedule", PermissionAction.Create, PermissionScope.Owner,
                "Create approval schedules for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastApprovalSchedule", PermissionAction.Update, PermissionScope.Owner,
                "Update approval schedules for owned projects"),
            CreateTemplate(AppRole.ProjectManager, "ForecastApprovalSchedule", PermissionAction.Delete, PermissionScope.Owner,
                "Delete approval schedules for owned projects"),

            // ResourceManager - Full tenant access
            CreateTemplate(AppRole.ResourceManager, "ForecastApprovalSchedule", PermissionAction.Read, PermissionScope.Tenant,
                "View all forecast approval schedules"),
            CreateTemplate(AppRole.ResourceManager, "ForecastApprovalSchedule", PermissionAction.Create, PermissionScope.Tenant,
                "Create forecast approval schedules"),
            CreateTemplate(AppRole.ResourceManager, "ForecastApprovalSchedule", PermissionAction.Update, PermissionScope.Tenant,
                "Update forecast approval schedules"),
            CreateTemplate(AppRole.ResourceManager, "ForecastApprovalSchedule", PermissionAction.Delete, PermissionScope.Tenant,
                "Delete forecast approval schedules"),

            // FinanceLead - Read access
            CreateTemplate(AppRole.FinanceLead, "ForecastApprovalSchedule", PermissionAction.Read, PermissionScope.Tenant,
                "View forecast approval schedules"),

            // Executive - Read access
            CreateTemplate(AppRole.Executive, "ForecastApprovalSchedule", PermissionAction.Read, PermissionScope.Tenant,
                "View forecast approval schedules"),
        };
    }

    private static RolePermissionTemplate CreateTemplate(
        AppRole role,
        string resource,
        PermissionAction action,
        PermissionScope scope,
        string description)
    {
        return new RolePermissionTemplate
        {
            Role = role,
            Resource = resource,
            Action = action,
            DefaultScope = scope,
            Description = description,
            IsSystemTemplate = true,
            TenantId = null // System-wide template
        };
    }
}

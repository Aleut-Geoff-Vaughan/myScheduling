# Staffing Module Redesign - Technical Design Document

## Executive Summary

This document outlines the redesign of the Staffing module to support:
- **Forecasting**: Monthly/weekly hour forecasting per WBS/Project
- **Subcontractors**: Non-login resource tracking
- **TBDs**: Placeholder assignments for unfilled positions
- **Labor Categories**: Contract-specific billing categories
- **Approval Workflow**: Hierarchical forecast approval with override capabilities
- **Export**: Accounting-ready CSV/Excel exports
- **Enhanced Roles**: Position titles, career families, career levels

---

## 1. Data Model Changes

### 1.1 New Entities

#### SubcontractorCompany
Company/vendor that provides subcontractors.

```csharp
public class SubcontractorCompany : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    // Company Info
    public string Name { get; set; } = string.Empty;  // e.g., "Acme Consulting"
    public string? Code { get; set; }  // Short code for reports
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }

    // Primary Contact (internal - who manages this relationship)
    public Guid? PrimaryContactUserId { get; set; }

    // Forecast Responsibility - who from subcontractor submits forecasts
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }

    // Status
    public SubcontractorCompanyStatus Status { get; set; } = SubcontractorCompanyStatus.Active;
    public string? Notes { get; set; }

    // Contract Info (optional)
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }

    // Navigation
    public User? PrimaryContactUser { get; set; }
    public ICollection<Subcontractor> Subcontractors { get; set; } = new List<Subcontractor>();
}

public enum SubcontractorCompanyStatus
{
    Active = 0,
    Inactive = 1,
    Suspended = 2,
    Terminated = 3
}
```

#### Subcontractor
Track non-employee resources without system logins.

```csharp
public class Subcontractor : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SubcontractorCompanyId { get; set; }  // Required - belongs to a company

    // Identity
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }

    // Role Information
    public string? PositionTitle { get; set; }
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }

    // Is this person responsible for submitting forecasts for their company?
    public bool IsForecastSubmitter { get; set; } = false;

    // Status
    public SubcontractorStatus Status { get; set; } = SubcontractorStatus.Active;
    public string? Notes { get; set; }

    // Navigation
    public SubcontractorCompany SubcontractorCompany { get; set; } = null!;
    public CareerJobFamily? CareerJobFamily { get; set; }
    public ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
}

public enum SubcontractorStatus
{
    Active = 0,
    Inactive = 1,
    Terminated = 2
}
```

#### CareerJobFamily
Admin-managed lookup table for career families.

```csharp
public class CareerJobFamily : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;  // e.g., "Engineering", "Consulting", "Project Management"
    public string? Description { get; set; }
    public string? Code { get; set; }  // Short code for reports
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Subcontractor> Subcontractors { get; set; } = new List<Subcontractor>();
}
```

#### LaborCategory
Contract-specific labor categories per project.

```csharp
public class LaborCategory : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;  // e.g., "Senior Engineer III"
    public string? Code { get; set; }  // Contract code
    public string? Description { get; set; }

    // Optional rate tracking (for future use)
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    // Navigation
    public Project Project { get; set; } = null!;
    public ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
}
```

#### ProjectRoleAssignment (Enhanced from existing ProjectRole)
Represents a staffed position on a project - can be User, Subcontractor, or TBD.

```csharp
public class ProjectRoleAssignment : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }  // Optional - can be project-level or WBS-level

    // Who is assigned (one of these three)
    public Guid? UserId { get; set; }
    public Guid? SubcontractorId { get; set; }
    public bool IsTbd { get; set; } = false;  // Placeholder for unfilled position
    public string? TbdDescription { get; set; }  // e.g., "Need Senior Developer"

    // Role Details
    public string PositionTitle { get; set; } = string.Empty;  // Free text with suggestions
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public Guid? LaborCategoryId { get; set; }

    // Assignment Period
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    // Status
    public ProjectRoleAssignmentStatus Status { get; set; } = ProjectRoleAssignmentStatus.Active;
    public string? Notes { get; set; }

    // Navigation
    public Project Project { get; set; } = null!;
    public WbsElement? WbsElement { get; set; }
    public User? User { get; set; }
    public Subcontractor? Subcontractor { get; set; }
    public CareerJobFamily? CareerJobFamily { get; set; }
    public LaborCategory? LaborCategory { get; set; }
    public ICollection<Forecast> Forecasts { get; set; } = new List<Forecast>();
}

public enum ProjectRoleAssignmentStatus
{
    Draft = 0,
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}
```

#### Forecast
Monthly/weekly hour forecast per assignment.

```csharp
public class Forecast : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectRoleAssignmentId { get; set; }

    // Period
    public int Year { get; set; }
    public int Month { get; set; }  // 1-12
    public int? Week { get; set; }  // 1-5 (optional for weekly breakdown)

    // Hours
    public decimal ForecastedHours { get; set; }
    public decimal? RecommendedHours { get; set; }  // System-calculated recommendation

    // Approval
    public ForecastStatus Status { get; set; } = ForecastStatus.Draft;
    public Guid? SubmittedByUserId { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNotes { get; set; }

    // Override tracking
    public bool IsOverride { get; set; } = false;
    public Guid? OverriddenByUserId { get; set; }
    public DateTime? OverriddenAt { get; set; }
    public string? OverrideReason { get; set; }
    public decimal? OriginalForecastedHours { get; set; }  // Before override

    // Notes
    public string? Notes { get; set; }

    // Navigation
    public ProjectRoleAssignment ProjectRoleAssignment { get; set; } = null!;
    public User? SubmittedByUser { get; set; }
    public User? ApprovedByUser { get; set; }
    public User? OverriddenByUser { get; set; }
    public ICollection<ForecastHistory> History { get; set; } = new List<ForecastHistory>();
}

public enum ForecastStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    Locked = 4  // Month closed
}
```

#### ForecastHistory
Audit trail for forecast changes.

```csharp
public class ForecastHistory : BaseEntity
{
    public Guid Id { get; set; }
    public Guid ForecastId { get; set; }

    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public ForecastChangeType ChangeType { get; set; }

    public decimal? OldHours { get; set; }
    public decimal? NewHours { get; set; }
    public ForecastStatus? OldStatus { get; set; }
    public ForecastStatus? NewStatus { get; set; }
    public string? ChangeReason { get; set; }

    // Navigation
    public Forecast Forecast { get; set; } = null!;
    public User ChangedByUser { get; set; } = null!;
}

public enum ForecastChangeType
{
    Created = 0,
    HoursUpdated = 1,
    StatusChanged = 2,
    Override = 3,
    Submitted = 4,
    Approved = 5,
    Rejected = 6,
    Locked = 7,
    VersionCreated = 8,
    VersionPromoted = 9,
    VersionDeleted = 10
}
```

#### ForecastVersion
Supports What-If scenarios and version management for forecasts.

```csharp
public class ForecastVersion : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    // Version Info
    public string Name { get; set; } = string.Empty;  // e.g., "Current", "What-If: Add 2 FTEs", "Q1 Proposal"
    public string? Description { get; set; }
    public ForecastVersionType Type { get; set; } = ForecastVersionType.WhatIf;

    // Scope - can be tenant-wide, project-specific, or user-specific
    public Guid? ProjectId { get; set; }  // null = all projects
    public Guid? UserId { get; set; }  // null = all users (admin created), set = user's personal what-if

    // Version Management
    public bool IsCurrent { get; set; } = false;  // Only one "Current" per scope
    public int VersionNumber { get; set; } = 1;  // Auto-increment for history
    public Guid? BasedOnVersionId { get; set; }  // What version was this cloned from?

    // Period covered by this version
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }

    // Lifecycle
    public DateTime CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime? PromotedAt { get; set; }  // When it became "Current"
    public Guid? PromotedByUserId { get; set; }
    public DateTime? ArchivedAt { get; set; }  // When replaced by new current
    public string? ArchiveReason { get; set; }  // e.g., "Replaced by v3"

    // Navigation
    public Project? Project { get; set; }
    public User? User { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public User? PromotedByUser { get; set; }
    public ForecastVersion? BasedOnVersion { get; set; }
    public ICollection<Forecast> Forecasts { get; set; } = new List<Forecast>();
}

public enum ForecastVersionType
{
    Current = 0,      // The active/live forecast
    WhatIf = 1,       // Scenario planning version
    Historical = 2,   // Archived previous "Current" version
    Import = 3        // Created from file import
}
```

**Update Forecast entity to include VersionId:**

```csharp
// Add to Forecast entity
public Guid ForecastVersionId { get; set; }

// Navigation
public ForecastVersion ForecastVersion { get; set; } = null!;
```

#### ForecastImportExport
Track import/export operations for audit and re-import capability.

```csharp
public class ForecastImportExport : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    // Operation
    public ForecastImportExportType Type { get; set; }
    public DateTime OperationAt { get; set; }
    public Guid OperationByUserId { get; set; }

    // Scope
    public Guid? ProjectId { get; set; }
    public Guid? ForecastVersionId { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }

    // File Info
    public string FileName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;  // "csv" or "xlsx"
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }  // For detecting re-imports of same file

    // Results
    public ForecastImportExportStatus Status { get; set; }
    public int RecordsProcessed { get; set; }
    public int RecordsSucceeded { get; set; }
    public int RecordsFailed { get; set; }
    public string? ErrorDetails { get; set; }  // JSON array of errors

    // For imports - which version was created/updated
    public Guid? ResultingVersionId { get; set; }

    // Navigation
    public Project? Project { get; set; }
    public ForecastVersion? ForecastVersion { get; set; }
    public ForecastVersion? ResultingVersion { get; set; }
    public User OperationByUser { get; set; } = null!;
}

public enum ForecastImportExportType
{
    Export = 0,
    Import = 1,
    ImportUpdate = 2  // Re-import to update existing forecasts
}

public enum ForecastImportExportStatus
{
    InProgress = 0,
    Completed = 1,
    CompletedWithErrors = 2,
    Failed = 3
}
```

#### ForecastApprovalSchedule
Configurable approval deadlines per tenant.

```csharp
public class ForecastApprovalSchedule : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;  // e.g., "Standard Monthly"
    public bool IsDefault { get; set; } = false;

    // Deadlines (day of month, 0 = last day)
    public int SubmissionDeadlineDay { get; set; } = 25;  // e.g., 25th of prior month
    public int ApprovalDeadlineDay { get; set; } = 28;
    public int LockDay { get; set; } = 1;  // Lock on 1st of the month

    // How many months ahead to forecast
    public int ForecastMonthsAhead { get; set; } = 3;

    public bool IsActive { get; set; } = true;
}
```

#### FederalHoliday
Track federal holidays as non-working days with option to auto-apply to schedules/forecasts.

```csharp
public class FederalHoliday : TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    // Holiday Info
    public string Name { get; set; } = string.Empty;  // e.g., "New Year's Day", "Independence Day"
    public DateOnly Date { get; set; }
    public int Year { get; set; }  // For easy filtering by year

    // Recurrence (for template holidays)
    public bool IsRecurring { get; set; } = false;  // Auto-create for next year
    public int? RecurringMonth { get; set; }  // 1-12
    public int? RecurringDay { get; set; }  // 1-31, null for floating holidays
    public FederalHolidayRule? RecurringRule { get; set; }  // For floating holidays like "3rd Monday of January"

    // Options
    public bool AutoApplyToSchedule { get; set; } = true;  // Auto-load as PTO/Holiday in Work Location
    public bool AutoApplyToForecast { get; set; } = true;  // Exclude from forecast hours (0 hours)
    public bool IsActive { get; set; } = true;

    // Notes
    public string? Notes { get; set; }
}

public enum FederalHolidayRule
{
    FixedDate = 0,           // Same date every year (e.g., July 4th)
    FirstMondayOf = 1,       // First Monday of month
    SecondMondayOf = 2,      // Second Monday of month (e.g., Columbus Day)
    ThirdMondayOf = 3,       // Third Monday of month (e.g., MLK Day, Presidents Day)
    FourthMondayOf = 4,      // Fourth Monday of month
    LastMondayOf = 5,        // Last Monday of month (e.g., Memorial Day)
    FourthThursdayOf = 6,    // Fourth Thursday of month (e.g., Thanksgiving)
    DayAfterThanksgiving = 7 // Special case: Day after Thanksgiving
}

// Seed data for US Federal Holidays
public static class FederalHolidaySeedData
{
    public static List<(string Name, int Month, int? Day, FederalHolidayRule Rule)> USFederalHolidays = new()
    {
        ("New Year's Day", 1, 1, FederalHolidayRule.FixedDate),
        ("Martin Luther King Jr. Day", 1, null, FederalHolidayRule.ThirdMondayOf),
        ("Presidents Day", 2, null, FederalHolidayRule.ThirdMondayOf),
        ("Memorial Day", 5, null, FederalHolidayRule.LastMondayOf),
        ("Juneteenth", 6, 19, FederalHolidayRule.FixedDate),
        ("Independence Day", 7, 4, FederalHolidayRule.FixedDate),
        ("Labor Day", 9, null, FederalHolidayRule.FirstMondayOf),
        ("Columbus Day", 10, null, FederalHolidayRule.SecondMondayOf),
        ("Veterans Day", 11, 11, FederalHolidayRule.FixedDate),
        ("Thanksgiving Day", 11, null, FederalHolidayRule.FourthThursdayOf),
        ("Day After Thanksgiving", 11, null, FederalHolidayRule.DayAfterThanksgiving),
        ("Christmas Day", 12, 25, FederalHolidayRule.FixedDate),
    };
}
```

### 1.2 Modifications to Existing Entities

#### User (Add fields)
```csharp
// Add to User entity
public string? PositionTitle { get; set; }
public Guid? CareerJobFamilyId { get; set; }
public int? CareerLevel { get; set; }
public decimal? StandardHoursPerWeek { get; set; } = 40;  // For capacity calculations
public bool IsHourly { get; set; } = false;  // For weekly/daily forecast granularity

// Navigation
public CareerJobFamily? CareerJobFamily { get; set; }
public ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
```

#### Project (Add fields)
```csharp
// Add to Project entity
public ProjectType Type { get; set; } = ProjectType.Sold;
public decimal? BudgetedHours { get; set; }
public decimal? TargetHoursPerMonth { get; set; }

// Navigation (add)
public ICollection<LaborCategory> LaborCategories { get; set; } = new List<LaborCategory>();
public ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
```

```csharp
public enum ProjectType
{
    Sold = 0,
    Unsold = 1,
    Proposed = 2,
    Internal = 3,
    OnHold = 4
}
```

#### WbsElement (Add fields)
```csharp
// Add to WbsElement entity
public Guid? ApproverUserId { get; set; }  // Already exists
public decimal? BudgetedHours { get; set; }
public decimal? TargetHoursPerMonth { get; set; }

// Navigation (add)
public ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
```

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STAFFING MODULE ERD                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Tenant    │────<│     Project     │────<│    WbsElement       │
└─────────────┘     │  - Type (enum)  │     │  - BudgetedHours    │
                    │  - BudgetedHrs  │     │  - ApproverUserId   │
                    └────────┬────────┘     └──────────┬──────────┘
                             │                         │
                             │ 1:N                     │ 1:N
                             ▼                         │
                    ┌─────────────────┐                │
                    │ LaborCategory   │                │
                    │  - Name         │                │
                    │  - Code         │                │
                    │  - BillRate     │                │
                    │  - CostRate     │                │
                    └────────┬────────┘                │
                             │                         │
                             │ 1:N                     │
                             ▼                         ▼
                    ┌─────────────────────────────────────────┐
                    │         ProjectRoleAssignment            │
                    │  - PositionTitle                        │
                    │  - CareerLevel                          │
                    │  - StartDate, EndDate                   │
                    │  - Status                               │
                    │                                         │
                    │  FK: UserId (nullable)                  │◄────┐
                    │  FK: SubcontractorId (nullable)         │◄──┐ │
                    │  FK: IsTbd (boolean)                    │   │ │
                    │  FK: LaborCategoryId                    │   │ │
                    │  FK: CareerJobFamilyId                  │   │ │
                    │  FK: ProjectId                          │   │ │
                    │  FK: WbsElementId (nullable)            │   │ │
                    └─────────────────┬───────────────────────┘   │ │
                                      │                           │ │
                                      │ 1:N                       │ │
                                      ▼                           │ │
                    ┌─────────────────────────────────────────┐   │ │
                    │              Forecast                    │   │ │
                    │  - Year, Month, Week                    │   │ │
                    │  - ForecastedHours                      │   │ │
                    │  - RecommendedHours                     │   │ │
                    │  - Status (enum)                        │   │ │
                    │  - IsOverride                           │   │ │
                    │  - FK: ForecastVersionId                │◄──┼─┼───┐
                    │  - SubmittedAt, ApprovedAt              │   │ │   │
                    └─────────────────┬───────────────────────┘   │ │   │
                                      │                           │ │   │
                                      │ 1:N                       │ │   │
                                      ▼                           │ │   │
                    ┌─────────────────────────────────────────┐   │ │   │
                    │          ForecastHistory                 │   │ │   │
                    │  - ChangeType                           │   │ │   │
                    │  - OldHours, NewHours                   │   │ │   │
                    │  - ChangedByUserId                      │   │ │   │
                    └─────────────────────────────────────────┘   │ │   │
                                                                  │ │   │
┌─────────────────────────────────────────────────────────────────┘ │   │
│                                                                   │   │
▼                                                                   │   │
┌─────────────────────────┐     ┌─────────────────┐                 │   │
│ SubcontractorCompany    │     │ CareerJobFamily │◄────────────────┤   │
│  - Name                 │     │  - Name         │                 │   │
│  - Code                 │     │  - Code         │                 │   │
│  - ForecastContactName  │     │  - SortOrder    │                 │   │
│  - ForecastContactEmail │     └─────────────────┘                 │   │
│  - PrimaryContactUserId │                                         │   │
│  - ContractNumber       │           ▲                             │   │
│  - ContractDates        │           │                             │   │
└───────────┬─────────────┘           │                             │   │
            │                         │                             │   │
            │ 1:N                     │                             │   │
            ▼                         │                             │   │
┌───────────────────────────┐         │                             │   │
│     Subcontractor         │─────────┘                             │   │
│  - FirstName              │                                       │   │
│  - LastName               │                                       │   │
│  - IsForecastSubmitter    │◄──────────────────────────────────────┘   │
│  - PositionTitle          │                                           │
│  - CareerLevel            │                                           │
└───────────────────────────┘                                           │
                                                                        │
                         ┌────────────────────┐                         │
                         │      User          │◄────────────────────────┤
                         │  - PositionTitle   │                         │
                         │  - CareerLevel     │                         │
                         │  - StdHrsPerWk     │                         │
                         │  - IsHourly        │                         │
                         └────────────────────┘                         │
                                                                        │
┌───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  VERSIONING & IMPORT/EXPORT                                           │
│                                                                       │
│  ┌─────────────────────────────────────────┐                          │
│  │         ForecastVersion                  │◄─────────────────────────┘
│  │  - Name (e.g., "Current", "What-If Q1") │
│  │  - Type (Current/WhatIf/Historical)     │
│  │  - IsCurrent (bool)                     │
│  │  - VersionNumber                        │
│  │  - BasedOnVersionId                     │──┐ (self-reference)
│  │  - ProjectId (nullable)                 │  │
│  │  - UserId (nullable = admin scope)      │◄─┘
│  │  - StartYear, StartMonth                │
│  │  - EndYear, EndMonth                    │
│  │  - CreatedAt, CreatedByUserId           │
│  │  - PromotedAt, PromotedByUserId         │
│  │  - ArchivedAt, ArchiveReason            │
│  └──────────────────┬──────────────────────┘
│                     │
│                     │ 1:N (tracked operations)
│                     ▼
│  ┌─────────────────────────────────────────┐
│  │       ForecastImportExport              │
│  │  - Type (Export/Import/ImportUpdate)   │
│  │  - OperationAt, OperationByUserId      │
│  │  - ProjectId, ForecastVersionId        │
│  │  - FileName, FileFormat (csv/xlsx)     │
│  │  - FileSizeBytes, FileHash             │
│  │  - Status (InProgress/Completed/Failed)│
│  │  - RecordsProcessed/Succeeded/Failed   │
│  │  - ErrorDetails (JSON)                 │
│  │  - ResultingVersionId                  │
│  └─────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────────────────────┐

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          APPROVAL SCHEDULE                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│    ForecastApprovalSchedule     │
│  - SubmissionDeadlineDay        │
│  - ApprovalDeadlineDay          │
│  - LockDay                      │
│  - ForecastMonthsAhead          │
└─────────────────────────────────┘
```

---

## 3. API Design

### 3.1 New Controllers

#### SubcontractorCompaniesController
```
GET    /api/subcontractorcompanies                    - List with filters (name, status)
GET    /api/subcontractorcompanies/{id}               - Get single with subcontractors
POST   /api/subcontractorcompanies                    - Create
PUT    /api/subcontractorcompanies/{id}               - Update
DELETE /api/subcontractorcompanies/{id}               - Soft delete

# Nested resources
GET    /api/subcontractorcompanies/{id}/subcontractors         - Get company's subcontractors
GET    /api/subcontractorcompanies/{id}/forecast-submitter     - Get who submits forecasts
POST   /api/subcontractorcompanies/{id}/forecast-submitter     - Set forecast submitter
```

#### SubcontractorsController
```
GET    /api/subcontractors                    - List with filters (company, status)
GET    /api/subcontractors/{id}               - Get single
POST   /api/subcontractors                    - Create (requires companyId)
PUT    /api/subcontractors/{id}               - Update
DELETE /api/subcontractors/{id}               - Soft delete
```

#### CareerJobFamiliesController
```
GET    /api/careerjobfamilies                 - List all (admin)
GET    /api/careerjobfamilies/{id}            - Get single
POST   /api/careerjobfamilies                 - Create (admin)
PUT    /api/careerjobfamilies/{id}            - Update (admin)
DELETE /api/careerjobfamilies/{id}            - Delete (admin)
```

#### LaborCategoriesController
```
GET    /api/laborcategories                   - List with project filter
GET    /api/laborcategories/{id}              - Get single
POST   /api/laborcategories                   - Create
PUT    /api/laborcategories/{id}              - Update
DELETE /api/laborcategories/{id}              - Delete
GET    /api/projects/{projectId}/laborcategories - Get by project
```

#### ProjectRoleAssignmentsController
```
GET    /api/projectroleassignments            - List with filters
GET    /api/projectroleassignments/{id}       - Get single with forecasts
POST   /api/projectroleassignments            - Create (User, Subcontractor, or TBD)
PUT    /api/projectroleassignments/{id}       - Update
DELETE /api/projectroleassignments/{id}       - Soft delete

GET    /api/projectroleassignments/tbd        - List all TBDs
POST   /api/projectroleassignments/{id}/fill  - Fill TBD with User/Subcontractor
```

#### ForecastsController
```
GET    /api/forecasts                         - List with filters
GET    /api/forecasts/{id}                    - Get single with history
POST   /api/forecasts                         - Create
PUT    /api/forecasts/{id}                    - Update hours
DELETE /api/forecasts/{id}                    - Delete

# Bulk operations
POST   /api/forecasts/bulk                    - Create multiple
PUT    /api/forecasts/bulk                    - Update multiple

# Workflow
POST   /api/forecasts/{id}/submit             - Submit for approval
POST   /api/forecasts/{id}/approve            - Approve
POST   /api/forecasts/{id}/reject             - Reject with reason
POST   /api/forecasts/{id}/override           - Override (supervisor)
POST   /api/forecasts/bulk/submit             - Bulk submit
POST   /api/forecasts/bulk/approve            - Bulk approve

# Views
GET    /api/forecasts/my                      - Current user's forecasts
GET    /api/forecasts/my-team                 - Direct reports' forecasts
GET    /api/forecasts/project/{projectId}     - Project forecasts
GET    /api/forecasts/wbs/{wbsId}             - WBS forecasts

# Reports
GET    /api/forecasts/summary                 - Summary by month/project
GET    /api/forecasts/export                  - CSV/Excel export

# Recommendations
GET    /api/forecasts/recommendations/{assignmentId}  - Get recommended hours
POST   /api/forecasts/generate-recommendations        - Generate for period
```

#### ForecastVersionsController
```
GET    /api/forecastversions                           - List versions (filter: type, project, user)
GET    /api/forecastversions/{id}                      - Get single with forecast summary
POST   /api/forecastversions                           - Create What-If version
PUT    /api/forecastversions/{id}                      - Update name/description
DELETE /api/forecastversions/{id}                      - Delete version (with all forecasts)

# Version Management
GET    /api/forecastversions/current                   - Get current version (default scope)
GET    /api/forecastversions/current/{projectId}       - Get current version for project
POST   /api/forecastversions/{id}/clone                - Clone version to create What-If
POST   /api/forecastversions/{id}/promote              - Promote What-If to Current (archives old current)
POST   /api/forecastversions/{id}/archive              - Archive version manually

# What-If Scenarios
GET    /api/forecastversions/what-ifs                  - List all What-If scenarios
GET    /api/forecastversions/what-ifs/my               - List my personal What-If scenarios
POST   /api/forecastversions/{id}/compare/{compareId}  - Compare two versions
```

#### ForecastImportExportController
```
# Export
POST   /api/forecast-export                            - Export forecasts (returns file)
GET    /api/forecast-export/history                    - List previous exports

# Import
POST   /api/forecast-import                            - Import file (creates/updates forecasts)
POST   /api/forecast-import/preview                    - Preview import changes before commit
GET    /api/forecast-import/history                    - List previous imports
GET    /api/forecast-import/{id}                       - Get import details with errors

# Re-import (update from same file structure)
POST   /api/forecast-import/{exportId}/reimport        - Re-import using original export as template
```

#### ForecastApprovalSchedulesController
```
GET    /api/forecastapprovalschedules         - List all
GET    /api/forecastapprovalschedules/{id}    - Get single
POST   /api/forecastapprovalschedules         - Create
PUT    /api/forecastapprovalschedules/{id}    - Update
DELETE /api/forecastapprovalschedules/{id}    - Delete
POST   /api/forecastapprovalschedules/{id}/set-default - Set as default
```

#### FederalHolidaysController
```
GET    /api/federalholidays                   - List all (filter: year, active)
GET    /api/federalholidays/{id}              - Get single
POST   /api/federalholidays                   - Create custom holiday
PUT    /api/federalholidays/{id}              - Update
DELETE /api/federalholidays/{id}              - Delete

# Bulk operations
POST   /api/federalholidays/seed-us-holidays  - Seed US Federal Holidays for year(s)
POST   /api/federalholidays/generate-year/{year} - Generate holidays for specific year from recurring templates

# Apply to users
POST   /api/federalholidays/apply-to-schedules     - Apply holidays to all users' work location schedules
POST   /api/federalholidays/{id}/apply-to-schedules - Apply single holiday to schedules
POST   /api/federalholidays/apply-to-forecasts     - Adjust forecasts to exclude holiday hours

# Query
GET    /api/federalholidays/upcoming          - Get upcoming holidays (next 30/60/90 days)
GET    /api/federalholidays/by-date/{date}    - Check if date is a holiday
GET    /api/federalholidays/range             - Get holidays in date range
```

### 3.2 Key Request/Response DTOs

```csharp
// Subcontractor Company
public class CreateSubcontractorCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public Guid? PrimaryContactUserId { get; set; }
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? Notes { get; set; }
}

public class SubcontractorCompanyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public Guid? PrimaryContactUserId { get; set; }
    public string? PrimaryContactName { get; set; }
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }
    public SubcontractorCompanyStatus Status { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public int SubcontractorCount { get; set; }
}

// Forecast Version
public class CreateForecastVersionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectId { get; set; }  // null = all projects
    public Guid? BasedOnVersionId { get; set; }  // Clone from this version
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
}

public class ForecastVersionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ForecastVersionType Type { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public bool IsCurrent { get; set; }
    public int VersionNumber { get; set; }
    public Guid? BasedOnVersionId { get; set; }
    public string? BasedOnVersionName { get; set; }
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime? PromotedAt { get; set; }
    public string? PromotedByUserName { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchiveReason { get; set; }
    public int ForecastCount { get; set; }
    public decimal TotalForecastedHours { get; set; }
}

public class CloneForecastVersionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class PromoteForecastVersionRequest
{
    public string? ArchiveReason { get; set; }  // Reason for archiving old current
}

public class VersionComparisonResponse
{
    public ForecastVersionResponse Version1 { get; set; } = null!;
    public ForecastVersionResponse Version2 { get; set; } = null!;
    public List<ForecastDifference> Differences { get; set; } = new();
    public decimal TotalHoursDifference { get; set; }
}

public class ForecastDifference
{
    public Guid ProjectRoleAssignmentId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string? WbsCode { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal? Version1Hours { get; set; }
    public decimal? Version2Hours { get; set; }
    public decimal HoursDifference { get; set; }
}

// Import/Export
public class ForecastExportRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }
    public Guid? ForecastVersionId { get; set; }  // null = current version
    public int? Year { get; set; }
    public int? Month { get; set; }
    public string Format { get; set; } = "csv";  // csv or xlsx
    public bool IncludeTbds { get; set; } = true;
    public bool IncludeSubcontractors { get; set; } = true;
    public bool IncludeHistory { get; set; } = false;
}

public class ForecastImportRequest
{
    public IFormFile File { get; set; } = null!;
    public Guid? TargetVersionId { get; set; }  // null = create new version
    public string? NewVersionName { get; set; }  // Required if TargetVersionId is null
    public bool PreviewOnly { get; set; } = false;
    public bool UpdateExisting { get; set; } = true;  // vs. create new only
}

public class ForecastImportPreviewResponse
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public int NewForecasts { get; set; }
    public int UpdatedForecasts { get; set; }
    public List<ImportValidationError> Errors { get; set; } = new();
    public List<ForecastImportRow> PreviewRows { get; set; } = new();
}

public class ImportValidationError
{
    public int RowNumber { get; set; }
    public string Column { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

public class ForecastImportRow
{
    public int RowNumber { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string WbsCode { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Hours { get; set; }
    public string Action { get; set; } = string.Empty;  // "Create", "Update", "Skip"
    public string? Note { get; set; }
}

public class ForecastImportExportResponse
{
    public Guid Id { get; set; }
    public ForecastImportExportType Type { get; set; }
    public DateTime OperationAt { get; set; }
    public string OperationByUserName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;
    public ForecastImportExportStatus Status { get; set; }
    public int RecordsProcessed { get; set; }
    public int RecordsSucceeded { get; set; }
    public int RecordsFailed { get; set; }
    public string? ErrorSummary { get; set; }
    public Guid? ResultingVersionId { get; set; }
    public string? ResultingVersionName { get; set; }
}

// Federal Holidays
public class CreateFederalHolidayRequest
{
    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public bool IsRecurring { get; set; } = false;
    public int? RecurringMonth { get; set; }
    public int? RecurringDay { get; set; }
    public FederalHolidayRule? RecurringRule { get; set; }
    public bool AutoApplyToSchedule { get; set; } = true;
    public bool AutoApplyToForecast { get; set; } = true;
    public string? Notes { get; set; }
}

public class FederalHolidayResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int Year { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;  // e.g., "Monday"
    public bool IsRecurring { get; set; }
    public FederalHolidayRule? RecurringRule { get; set; }
    public bool AutoApplyToSchedule { get; set; }
    public bool AutoApplyToForecast { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
}

public class SeedUSHolidaysRequest
{
    public int StartYear { get; set; }
    public int EndYear { get; set; }  // Optional: if not set, just seed StartYear
    public bool AutoApplyToSchedule { get; set; } = true;
    public bool AutoApplyToForecast { get; set; } = true;
}

public class ApplyHolidaysToSchedulesRequest
{
    public int? Year { get; set; }  // null = current year
    public List<Guid>? UserIds { get; set; }  // null = all users
    public bool CreateAsPTO { get; set; } = true;  // Create as PTO location type
    public bool OverwriteExisting { get; set; } = false;
}

public class ApplyHolidaysToSchedulesResponse
{
    public int HolidaysProcessed { get; set; }
    public int UsersAffected { get; set; }
    public int PreferencesCreated { get; set; }
    public int PreferencesSkipped { get; set; }  // Already existed
}

public class HolidayCheckResponse
{
    public bool IsHoliday { get; set; }
    public FederalHolidayResponse? Holiday { get; set; }
}

// Project Role Assignment
public class CreateProjectRoleAssignmentRequest
{
    public Guid ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }

    // One of these three
    public Guid? UserId { get; set; }
    public Guid? SubcontractorId { get; set; }
    public bool IsTbd { get; set; }
    public string? TbdDescription { get; set; }

    public string PositionTitle { get; set; } = string.Empty;
    public Guid? CareerJobFamilyId { get; set; }
    public int? CareerLevel { get; set; }
    public Guid? LaborCategoryId { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }
}

// Forecast
public class CreateForecastRequest
{
    public Guid ProjectRoleAssignmentId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }
    public decimal ForecastedHours { get; set; }
    public string? Notes { get; set; }
}

public class BulkForecastRequest
{
    public Guid ProjectRoleAssignmentId { get; set; }
    public List<MonthlyForecast> Forecasts { get; set; } = new();
}

public class MonthlyForecast
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Hours { get; set; }
    public List<WeeklyBreakdown>? WeeklyBreakdown { get; set; }
}

public class WeeklyBreakdown
{
    public int Week { get; set; }
    public decimal Hours { get; set; }
}

public class OverrideForecastRequest
{
    public decimal NewHours { get; set; }
    public string Reason { get; set; } = string.Empty;
}

// Export
public class ForecastExportRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
    public string Format { get; set; } = "csv";  // csv or xlsx
    public bool IncludeTbds { get; set; } = true;
    public bool IncludeSubcontractors { get; set; } = true;
}
```

---

## 4. UI Design

### 4.1 New Pages

#### 4.1.1 Forecast Entry Page (`/staffing/forecast`)
**Primary view for employees to enter their forecasts.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  My Forecast                                              [Export] [Submit All] │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Period: [Dec 2024 ▼] to [Feb 2025 ▼]     Status: [All ▼]    [Refresh]         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─── Project: ACME Corp Implementation ─────────────────────────────────────┐  │
│  │  WBS: 212000.0001.00.000001 - Development                                 │  │
│  │  Role: Senior Developer | Labor Cat: Engineer III                         │  │
│  │  ────────────────────────────────────────────────────────────────────────│  │
│  │           │  Dec 2024  │  Jan 2025  │  Feb 2025  │  Total                │  │
│  │  ─────────┼────────────┼────────────┼────────────┼────────                │  │
│  │  Forecast │  [160]     │  [168]     │  [160]     │  488 hrs              │  │
│  │  Recommend│   160      │   176      │   160      │  496 hrs              │  │
│  │  Status   │  ✓ Approved│  ⏳ Pending │  ○ Draft   │                       │  │
│  │  ─────────┴────────────┴────────────┴────────────┴────────                │  │
│  │  [Weekly Breakdown ▼]                                     [Submit Dec-Jan] │  │
│  │    Week 1: [40] Week 2: [40] Week 3: [40] Week 4: [40] Week 5: [8]       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─── Project: Internal - Training ──────────────────────────────────────────┐  │
│  │  WBS: 999000.0001.00.000001 - Professional Development                    │  │
│  │  Role: Employee                                                           │  │
│  │  ────────────────────────────────────────────────────────────────────────│  │
│  │           │  Dec 2024  │  Jan 2025  │  Feb 2025  │  Total                │  │
│  │  ─────────┼────────────┼────────────┼────────────┼────────                │  │
│  │  Forecast │  [8]       │  [16]      │  [8]       │  32 hrs               │  │
│  │  Status   │  ✓ Approved│  ○ Draft   │  ○ Draft   │                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CAPACITY SUMMARY                                                        │   │
│  │  ─────────────────────────────────────────────────────────────────────── │   │
│  │  Available:    168 hrs/month (40 hrs/week)                               │   │
│  │  Dec 2024:     168 forecasted (100%) ████████████████████████████████   │   │
│  │  Jan 2025:     184 forecasted (110%) ████████████████████████████████▓▓ │   │
│  │  Feb 2025:     168 forecasted (100%) ████████████████████████████████   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 Team Forecast Review Page (`/staffing/team-forecast`)
**For supervisors/PMs to review and approve team forecasts.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Team Forecast Review                        [Export] [Bulk Approve] [Override] │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Period: [Jan 2025 ▼]  Project: [All ▼]  Status: [Pending ▼]  [Search...]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ [✓] John Smith - Senior Developer                              Jan 2025   │ │
│  │     ACME Corp / 212000.0001.00.000001                                     │ │
│  │     Forecasted: 168 hrs | Recommended: 176 hrs | Status: ⏳ Pending       │ │
│  │     [Approve] [Reject] [Override] [View Details]                          │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ [✓] Jane Doe - Project Manager                                 Jan 2025   │ │
│  │     ACME Corp / 212000.0002.00.000001                                     │ │
│  │     Forecasted: 80 hrs | Recommended: 88 hrs | Status: ⏳ Pending         │ │
│  │     [Approve] [Reject] [Override] [View Details]                          │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ [ ] TBD - Data Analyst (Need to fill)                          Jan 2025   │ │
│  │     ACME Corp / 212000.0003.00.000001                                     │ │
│  │     Forecasted: 160 hrs | Status: ○ Draft                                 │ │
│  │     [Edit] [Fill Position]                                                │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Summary: 3 pending | 12 approved | 2 draft | Total: 17 forecasts              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.3 Project Staffing Page (`/staffing/project/{id}`)
**Project-centric view of all roles and forecasts.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Project: ACME Corp Implementation                           [Edit] [Export]   │
│  Status: Active | Type: Sold | Budget: 5,000 hrs                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Roles] [Forecasts] [Labor Categories] [Timeline]                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ROLES & ASSIGNMENTS                                          [+ Add Role]     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  WBS: 212000.0001.00.000001 - Development                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 👤 John Smith          Senior Developer    Engineer III    Dec-Mar        │ │
│  │    Engineering Lvl 5   160 hrs/mo forecast                 [Edit] [Del]   │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Jane Doe            Developer           Engineer II     Dec-Feb        │ │
│  │    Engineering Lvl 3   120 hrs/mo forecast                 [Edit] [Del]   │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ ❓ TBD                 QA Engineer         QA Analyst      Jan-Mar        │ │
│  │    Quality Lvl 3       Est: 160 hrs/mo                     [Fill] [Del]   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  WBS: 212000.0002.00.000001 - Project Management                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Acme Consulting     PM Support          PM Support      Dec-Mar        │ │
│  │    (Subcontractor)     80 hrs/mo forecast                  [Edit] [Del]   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  FORECAST SUMMARY BY MONTH                                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  │ Dec 2024 │ Jan 2025 │ Feb 2025 │ Mar 2025 │  Total  │  Budget │ Variance │  │
│  │   520    │   680    │   520    │   320    │  2,040  │  5,000  │  -2,960  │  │
│  │   ████   │  █████   │   ████   │   ██     │         │         │          │  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.4 Admin: Subcontractor Companies Page (`/admin/subcontractor-companies`)
**Manage vendor companies that provide subcontractors.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Subcontractor Companies                                     [+ Add] [Export]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Search...]                    Status: [Active ▼]                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Acme Consulting, LLC                                    [Active]        │ │
│  │    Code: ACME | Contract: #2024-001 (Jan 2024 - Dec 2025)                 │ │
│  │    Primary Contact: John Manager (john@company.com)                        │ │
│  │    Forecast Contact: Sarah Admin (sarah@acme.com) 555-1234                │ │
│  │    Subcontractors: 5 active                                               │ │
│  │    [View Subcontractors] [Edit] [Deactivate]                              │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 🏢 TechCorp Solutions                                      [Active]        │ │
│  │    Code: TECH | Contract: #2024-015 (Mar 2024 - Mar 2025)                 │ │
│  │    Primary Contact: Jane PM (jane@company.com)                             │ │
│  │    Forecast Contact: Mike Finance (mike@techcorp.com) 555-5678            │ │
│  │    Subcontractors: 3 active                                               │ │
│  │    [View Subcontractors] [Edit] [Deactivate]                              │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 🏢 DataPro Analytics                                       [Inactive]      │ │
│  │    Code: DATA | Contract: Expired (Jan 2023 - Dec 2023)                   │ │
│  │    Subcontractors: 2 (1 active, 1 inactive)                               │ │
│  │    [View Subcontractors] [Edit] [Reactivate]                              │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Summary: 2 active companies | 8 active subcontractors                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Add/Edit Subcontractor Company Modal:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Add Subcontractor Company                                              [X]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  COMPANY INFORMATION                                                            │
│  ───────────────────────────────────────────────────────────────────────────    │
│  Company Name*:    [Acme Consulting, LLC                               ]        │
│  Code:             [ACME    ]                                                   │
│  Phone:            [555-123-4567          ]                                     │
│  Website:          [https://acme.com                                   ]        │
│                                                                                 │
│  ADDRESS                                                                        │
│  ───────────────────────────────────────────────────────────────────────────    │
│  Address:          [123 Main Street                                    ]        │
│  City:             [Washington       ]  State: [DC ▼]  ZIP: [20001    ]        │
│  Country:          [United States                                      ]        │
│                                                                                 │
│  CONTACTS                                                                       │
│  ───────────────────────────────────────────────────────────────────────────    │
│  Internal Contact: [John Manager ▼] (manages relationship)                      │
│                                                                                 │
│  Forecast Submitter (from subcontractor company):                               │
│    Name:           [Sarah Admin                                        ]        │
│    Email:          [sarah@acme.com                                     ]        │
│    Phone:          [555-234-5678                                       ]        │
│                                                                                 │
│  CONTRACT INFORMATION                                                           │
│  ───────────────────────────────────────────────────────────────────────────    │
│  Contract #:       [2024-001                                           ]        │
│  Start Date:       [01/01/2024     ]  End Date: [12/31/2025        ]           │
│                                                                                 │
│  Notes:            [Multi-year engagement for PM and dev support       ]        │
│                    [________________________________________________   ]        │
│                                                                                 │
│                                              [Cancel]  [Save Company]           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.5 Admin: Subcontractors Page (`/admin/subcontractors`)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Subcontractors                                              [+ Add] [Export]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Search...]           Company: [All ▼]        Status: [Active ▼]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Name          │ Company        │ Position      │ Job Family │ Forecast│Actions│
│  ──────────────┼────────────────┼───────────────┼────────────┼─────────┼───────│
│  Mike Johnson  │ Acme Consulting│ PM Support    │ PM         │ ✓       │ [Edit]│
│  Sarah Lee     │ TechCorp       │ Developer     │ Engineering│         │ [Edit]│
│  Tom Wilson    │ DataPro        │ Data Analyst  │ Analytics  │         │ [Edit]│
└─────────────────────────────────────────────────────────────────────────────────┘

Legend: ✓ = Designated forecast submitter for their company
```

#### 4.1.6 Admin: Career Job Families Page (`/admin/career-job-families`)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Career Job Families                                                  [+ Add]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Name              │ Code │ Description                    │ Sort │ Status    │
│  ──────────────────┼──────┼────────────────────────────────┼──────┼───────────│
│  Engineering       │ ENG  │ Software & Systems Engineering │  1   │ ✓ Active  │
│  Project Management│ PM   │ Project & Program Management   │  2   │ ✓ Active  │
│  Consulting        │ CON  │ Business & Strategy Consulting │  3   │ ✓ Active  │
│  Quality Assurance │ QA   │ Testing & Quality Control      │  4   │ ✓ Active  │
│  Analytics         │ ANA  │ Data & Business Analytics      │  5   │ ✓ Active  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.7 Admin: Labor Categories Page (`/admin/labor-categories`)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Labor Categories                                                     [+ Add]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Project: [ACME Corp ▼]                      [Search...]                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Name              │ Code    │ Bill Rate │ Cost Rate │ Status  │ Actions       │
│  ──────────────────┼─────────┼───────────┼───────────┼─────────┼───────────────│
│  Engineer I        │ ENG-1   │ $95/hr    │ $65/hr    │ Active  │ [Edit] [Del]  │
│  Engineer II       │ ENG-2   │ $115/hr   │ $80/hr    │ Active  │ [Edit] [Del]  │
│  Engineer III      │ ENG-3   │ $140/hr   │ $100/hr   │ Active  │ [Edit] [Del]  │
│  Senior Engineer   │ SR-ENG  │ $165/hr   │ $120/hr   │ Active  │ [Edit] [Del]  │
│  PM Support        │ PM-SUP  │ $125/hr   │ $90/hr    │ Active  │ [Edit] [Del]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.8 Admin: Forecast Approval Schedule (`/admin/forecast-schedules`)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Forecast Approval Schedules                                          [+ Add]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Name              │ Submit By │ Approve By │ Lock On │ Months Ahead │ Default │
│  ──────────────────┼───────────┼────────────┼─────────┼──────────────┼─────────│
│  Standard Monthly  │ 25th      │ 28th       │ 1st     │ 3            │ ✓       │
│  Quarterly Close   │ 20th      │ 25th       │ 1st     │ 6            │         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.9 Forecast Version Management Page (`/staffing/versions`)
**Manage What-If scenarios and version history.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Forecast Versions                                    [+ Create What-If] [Import]│
├─────────────────────────────────────────────────────────────────────────────────┤
│  Scope: [All Projects ▼]       Type: [All ▼]       [Search...]                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  CURRENT VERSION                                                                │
│  ───────────────────────────────────────────────────────────────────────────    │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ ★ Current Forecast                                          [Current]      │ │
│  │    Period: Jan 2025 - Mar 2025 | 45 forecasts | 7,280 hrs total           │ │
│  │    Last updated: Dec 15, 2024 by System                                    │ │
│  │    [View Forecasts] [Export] [Create What-If from this]                   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  WHAT-IF SCENARIOS (3)                                                          │
│  ───────────────────────────────────────────────────────────────────────────    │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 📊 What-If: Add 2 FTEs Q2                                     [What-If]    │ │
│  │    Period: Jan 2025 - Jun 2025 | Based on: Current v1                      │ │
│  │    Created: Dec 18, 2024 by John Smith | 52 forecasts | 9,120 hrs         │ │
│  │    Description: Scenario with 2 additional developers starting April       │ │
│  │    [View] [Edit] [Compare to Current] [Promote to Current] [Delete]       │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 📊 What-If: Reduced Scope                                     [What-If]    │ │
│  │    Period: Jan 2025 - Mar 2025 | Based on: Current v1                      │ │
│  │    Created: Dec 16, 2024 by Jane Doe | 38 forecasts | 5,600 hrs           │ │
│  │    Description: If client reduces Phase 2 scope by 30%                    │ │
│  │    [View] [Edit] [Compare to Current] [Promote to Current] [Delete]       │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 📊 What-If: Best Case Pipeline                                [What-If]    │ │
│  │    Period: Jan 2025 - Jun 2025 | Based on: Current v1                      │ │
│  │    Created: Dec 10, 2024 by Mike PM | 68 forecasts | 12,480 hrs           │ │
│  │    Description: Including all proposed projects winning                    │ │
│  │    [View] [Edit] [Compare to Current] [Promote to Current] [Delete]       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  HISTORICAL VERSIONS (5)                                              [Show ▼] │
│  ───────────────────────────────────────────────────────────────────────────    │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 📁 Current v1 (Archived)                                    [Historical]   │ │
│  │    Period: Oct 2024 - Dec 2024 | Archived: Dec 1, 2024                     │ │
│  │    Reason: Replaced by new current for Q1 2025 planning                    │ │
│  │    [View] [Export] [Compare]                                              │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Create What-If Version Modal:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Create What-If Scenario                                                [X]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Name*:           [What-If: Add 2 FTEs Q2                              ]        │
│                                                                                 │
│  Description:     [Scenario exploring impact of adding 2 additional   ]        │
│                   [developers starting in April 2025                  ]        │
│                   [__________________________________________________ ]        │
│                                                                                 │
│  Base Version:    [★ Current Forecast ▼]                                        │
│                   (Your What-If will start as a copy of this version)          │
│                                                                                 │
│  Period:                                                                        │
│    Start:         [Jan ▼] [2025 ▼]                                             │
│    End:           [Jun ▼] [2025 ▼]                                             │
│                                                                                 │
│  Scope:           [○ All Projects  ● Specific Project ▼]                       │
│                   Project: [ACME Corp Implementation ▼]                         │
│                                                                                 │
│                                    [Cancel]  [Create What-If]                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Version Comparison View:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Compare Versions                                                       [X]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Version 1: [★ Current Forecast ▼]    vs    Version 2: [What-If: +2 FTEs ▼]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  SUMMARY                                                                        │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │                    │  Current  │  What-If  │  Difference │                   │
│  │  ──────────────────┼───────────┼───────────┼─────────────│                   │
│  │  Total Hours       │   7,280   │   9,120   │   +1,840    │  +25%             │
│  │  Forecast Count    │    45     │    52     │     +7      │                   │
│  │  Resources         │    12     │    14     │     +2      │                   │
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  DIFFERENCES BY MONTH                                                           │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Month    │  Current │  What-If │  Diff    │  Visual                       │  │
│  │ ─────────┼──────────┼──────────┼──────────┼────────────────────────────── │  │
│  │ Jan 2025 │  2,400   │  2,400   │    0     │ ████████████████████          │  │
│  │ Feb 2025 │  2,400   │  2,400   │    0     │ ████████████████████          │  │
│  │ Mar 2025 │  2,480   │  2,480   │    0     │ ████████████████████          │  │
│  │ Apr 2025 │    -     │  640     │  +640    │ ████████████████████▓▓▓▓▓    │  │
│  │ May 2025 │    -     │  640     │  +640    │ ████████████████████▓▓▓▓▓    │  │
│  │ Jun 2025 │    -     │  560     │  +560    │ ████████████████████▓▓▓▓     │  │
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  CHANGES DETAIL                                              [Export Diff CSV]  │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Resource       │ Project  │ WBS      │ Month    │ V1 Hrs │ V2 Hrs │ Diff  │ │
│  │ ───────────────┼──────────┼──────────┼──────────┼────────┼────────┼────── │ │
│  │ TBD - Dev 1    │ ACME     │ 212000.. │ Apr 2025 │   -    │  160   │ +160  │ │
│  │ TBD - Dev 1    │ ACME     │ 212000.. │ May 2025 │   -    │  168   │ +168  │ │
│  │ TBD - Dev 1    │ ACME     │ 212000.. │ Jun 2025 │   -    │  152   │ +152  │ │
│  │ TBD - Dev 2    │ ACME     │ 212000.. │ Apr 2025 │   -    │  160   │ +160  │ │
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│                              [Close]  [Promote What-If to Current]              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.10 Forecast Import/Export Page (`/staffing/import-export`)
**Import and export forecast data.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Forecast Import/Export                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Export] [Import]                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  EXPORT FORECAST DATA                                                           │
│  ───────────────────────────────────────────────────────────────────────────    │
│                                                                                 │
│  Version:         [★ Current Forecast ▼]                                        │
│  Project:         [All Projects ▼]                                              │
│  Period:          [Jan ▼] [2025 ▼] to [Mar ▼] [2025 ▼]                         │
│  Format:          [● CSV  ○ Excel (.xlsx)]                                      │
│                                                                                 │
│  Include:         [✓] Employees  [✓] Subcontractors  [✓] TBDs                  │
│                   [ ] Change History                                            │
│                                                                                 │
│                                                   [Preview] [Download Export]   │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  IMPORT FORECAST DATA                                                           │
│  ───────────────────────────────────────────────────────────────────────────    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │                                                                 │            │
│  │    Drag and drop CSV or Excel file here                        │            │
│  │    or [Browse Files]                                           │            │
│  │                                                                 │            │
│  │    Accepted formats: .csv, .xlsx                               │            │
│  └─────────────────────────────────────────────────────────────────┘            │
│                                                                                 │
│  Target:          [○ Update Current Version  ● Create New What-If Version]      │
│  Version Name:    [Import - Dec 20, 2024                            ]           │
│                                                                                 │
│  Options:         [✓] Update existing forecasts (match by resource+period)      │
│                   [✓] Create new forecasts for new entries                      │
│                   [ ] Skip rows with validation errors                          │
│                                                                                 │
│                                          [Preview Import] [Cancel]              │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  RECENT OPERATIONS                                                              │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Date       │ Type   │ File              │ Records │ Status    │ Actions │   │
│  │ ───────────┼────────┼───────────────────┼─────────┼───────────┼──────── │   │
│  │ Dec 18     │ Export │ forecast_Q1.csv   │ 45      │ ✓ Complete│ [↓]     │   │
│  │ Dec 15     │ Import │ sub_forecast.xlsx │ 12      │ ✓ Complete│ [Details]│  │
│  │ Dec 10     │ Export │ acme_forecast.xlsx│ 28      │ ✓ Complete│ [↓]     │   │
│  │ Dec 5      │ Import │ updates.csv       │ 8       │ ⚠ 2 errors│ [Details]│  │
│  └────────────────────────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Import Preview Modal:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Import Preview                                                         [X]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  File: sub_forecast.xlsx | 15 rows detected                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  SUMMARY                                                                        │
│  ───────────────────────────────────────────────────────────────────────────    │
│  ✓ Valid rows:     12                                                          │
│  ⚠ Rows with warnings: 1                                                       │
│  ✗ Invalid rows:   2                                                           │
│                                                                                 │
│  Actions: 8 will be created | 4 will be updated | 3 will be skipped            │
│                                                                                 │
│  VALIDATION RESULTS                                                             │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Row │ Status │ Resource      │ Project │ Month    │ Hours │ Action  │ Note  ││
│  │ ────┼────────┼───────────────┼─────────┼──────────┼───────┼─────────┼────── ││
│  │  2  │   ✓    │ Mike Johnson  │ ACME    │ Jan 2025 │ 160   │ Create  │       ││
│  │  3  │   ✓    │ Mike Johnson  │ ACME    │ Feb 2025 │ 168   │ Create  │       ││
│  │  4  │   ✓    │ Sarah Lee     │ ACME    │ Jan 2025 │ 120   │ Update  │ +40   ││
│  │  5  │   ⚠    │ Tom Wilson    │ ACME    │ Jan 2025 │ 180   │ Create  │ >160  ││
│  │  6  │   ✗    │ Unknown       │ ACME    │ Jan 2025 │ 100   │ Skip    │ Not   ││
│  │     │        │               │         │          │       │         │ found ││
│  │  7  │   ✗    │ Mike Johnson  │ BADPROJ │ Jan 2025 │ 80    │ Skip    │ Proj  ││
│  │     │        │               │         │          │       │         │ error ││
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  [ ] Skip all rows with errors (import valid rows only)                         │
│                                                                                 │
│                                        [Cancel]  [Confirm Import (12 rows)]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.11 Admin: Federal Holidays Page (`/admin/federal-holidays`)
**Manage federal holidays for schedules and forecasts.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Federal Holidays Management                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [+ Add Holiday]  [Seed US Holidays ▼]  [Apply to Schedules ▼]                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Year: [2025 ▼]      [✓] Show Active Only     [Search holidays...]              │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  HOLIDAYS FOR 2025                                                              │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Date        │ Name                    │ Type     │ Auto-Apply │ Status │ ⋯ │ │
│  │ ────────────┼─────────────────────────┼──────────┼────────────┼────────┼─── │ │
│  │ Jan 1       │ New Year's Day          │ Fixed    │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Jan 20      │ MLK Jr. Day             │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Feb 17      │ Presidents Day          │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ May 26      │ Memorial Day            │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Jul 4       │ Independence Day        │ Fixed    │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Sep 1       │ Labor Day               │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Oct 13      │ Columbus Day            │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Nov 11      │ Veterans Day            │ Fixed    │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Nov 27      │ Thanksgiving            │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Nov 28      │ Day After Thanksgiving  │ Floating │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  │ Dec 25      │ Christmas Day           │ Fixed    │ 📅 ✓  📊 ✓ │ Active │ ⋮ │ │
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Legend: 📅 = Auto-apply to schedules  📊 = Auto-apply to forecasts            │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  BULK ACTIONS                                                                   │
│  ───────────────────────────────────────────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  Seed US Federal Holidays                                                │    │
│  │  Generate standard US federal holidays for selected years.               │    │
│  │                                                                          │    │
│  │  Years: [2025 ▼] to [2027 ▼]                                            │    │
│  │  [✓] Include Day After Thanksgiving                                      │    │
│  │  [✓] Mark as active                                                      │    │
│  │  [✓] Auto-apply to schedules                                             │    │
│  │  [✓] Auto-apply to forecasts                                             │    │
│  │                                                                          │    │
│  │                                               [Preview] [Seed Holidays]  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  Apply Holidays to Schedules                                             │    │
│  │  Create PTO entries for all users on holiday dates.                      │    │
│  │                                                                          │    │
│  │  Year: [2025 ▼]                                                          │    │
│  │  [● All active holidays  ○ Select specific holidays]                     │    │
│  │  [ ] Overwrite existing schedule entries                                 │    │
│  │                                                                          │    │
│  │                                     [Preview Affected Users] [Apply]     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Add/Edit Holiday Modal:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Add Federal Holiday                                                   [X]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Holiday Name *                                                                 │
│  [                                                                   ]          │
│                                                                                 │
│  Date Type                                                                      │
│  [● Fixed Date (same date every year)                                ]          │
│  [○ Floating Date (calculated each year)                             ]          │
│                                                                                 │
│  ── FIXED DATE ──────────────────────────────────────────────────────          │
│  Month: [July ▼]   Day: [4 ▼]                                                  │
│                                                                                 │
│  ── OR FLOATING DATE RULE ───────────────────────────────────────────          │
│  Rule:   [Third Monday of ▼]   Month: [January ▼]                               │
│          Options: First/Second/Third/Fourth/Last Monday of                      │
│                   Fourth Thursday of (Thanksgiving)                             │
│                   Day After Thanksgiving                                        │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Year(s) to Create *                                                            │
│  [2025 ▼] to [2025 ▼]  (creates holiday entries for each year in range)        │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  AUTO-APPLY OPTIONS                                                             │
│  [✓] Auto-apply to user schedules (mark as non-working day)                     │
│  [✓] Auto-apply to forecasts (exclude from recommended hours)                   │
│                                                                                 │
│  Status: [● Active  ○ Inactive]                                                 │
│                                                                                 │
│  Notes                                                                          │
│  [                                                                   ]          │
│  [                                                                   ]          │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Preview: Creates holiday on Monday, January 20, 2025                           │
│                                                                                 │
│                                                     [Cancel]  [Save Holiday]    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Apply Holidays Preview Modal:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Apply Holidays to Schedules - Preview                                 [X]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  This will create schedule entries for the following:                           │
│                                                                                 │
│  HOLIDAYS TO APPLY                                                              │
│  ───────────────────────────────────────────────────────────────────────────    │
│  │ Date        │ Holiday                  │ Users Affected │ Existing │         │
│  │ ────────────┼──────────────────────────┼────────────────┼──────────│         │
│  │ Jan 1, 2025 │ New Year's Day           │ 45 users       │ 3 skip   │         │
│  │ Jan 20, 2025│ MLK Jr. Day              │ 45 users       │ 0 skip   │         │
│  │ Feb 17, 2025│ Presidents Day           │ 45 users       │ 2 skip   │         │
│  │ ...         │ ...                      │ ...            │ ...      │         │
│  └────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  SUMMARY                                                                        │
│  ───────────────────────────────────────────────────────────────────────────    │
│  • 11 holidays will be applied                                                  │
│  • 45 active users affected                                                     │
│  • 487 new schedule entries will be created                                     │
│  • 8 existing entries will be skipped (already have entries)                    │
│                                                                                 │
│  [ ] Overwrite existing entries (will replace 8 entries)                        │
│                                                                                 │
│                                        [Cancel]  [Apply to All Schedules]       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Hierarchy

```
src/
├── pages/
│   ├── staffing/
│   │   ├── ForecastPage.tsx           # Personal forecast entry
│   │   ├── TeamForecastPage.tsx       # Team review/approval
│   │   ├── ProjectStaffingPage.tsx    # Project-centric view
│   │   ├── StaffingDashboard.tsx      # Overview dashboard
│   │   ├── ForecastVersionsPage.tsx   # Version management & What-If
│   │   └── ForecastImportExportPage.tsx # Import/Export functionality
│   └── admin/
│       ├── SubcontractorCompaniesPage.tsx  # Vendor companies
│       ├── SubcontractorsPage.tsx
│       ├── CareerJobFamiliesPage.tsx
│       ├── LaborCategoriesPage.tsx
│       ├── ForecastSchedulesPage.tsx
│       └── FederalHolidaysPage.tsx         # Federal holidays management
├── components/
│   ├── staffing/
│   │   ├── ForecastGrid.tsx           # Month/week grid editor
│   │   ├── ForecastCard.tsx           # Single assignment forecast
│   │   ├── CapacityBar.tsx            # Visual utilization bar
│   │   ├── ProjectRoleCard.tsx        # Role display card
│   │   ├── TbdBadge.tsx               # TBD indicator
│   │   ├── ForecastStatusBadge.tsx    # Status indicator
│   │   ├── VersionCard.tsx            # Version display card
│   │   ├── VersionComparisonView.tsx  # Side-by-side version compare
│   │   ├── ImportPreview.tsx          # Import validation preview
│   │   └── ExportOptionsPanel.tsx     # Export configuration panel
│   └── modals/
│       ├── ProjectRoleAssignmentModal.tsx
│       ├── ForecastEditModal.tsx
│       ├── FillTbdModal.tsx
│       ├── SubcontractorModal.tsx
│       ├── SubcontractorCompanyModal.tsx
│       ├── LaborCategoryModal.tsx
│       ├── CreateWhatIfModal.tsx      # Create What-If scenario
│       ├── PromoteVersionModal.tsx    # Promote What-If to Current
│       ├── ImportPreviewModal.tsx     # Import validation/preview
│       ├── VersionCompareModal.tsx    # Compare two versions
│       ├── FederalHolidayModal.tsx    # Add/edit holiday
│       └── ApplyHolidaysPreviewModal.tsx # Preview before applying
├── services/
│   ├── forecastService.ts
│   ├── forecastVersionService.ts      # Version CRUD & operations
│   ├── forecastImportExportService.ts # Import/Export operations
│   ├── projectRoleAssignmentService.ts
│   ├── subcontractorService.ts
│   ├── subcontractorCompanyService.ts
│   ├── careerJobFamilyService.ts
│   ├── laborCategoryService.ts
│   └── federalHolidayService.ts          # Holiday CRUD & bulk operations
├── hooks/
│   ├── useForecasts.ts
│   ├── useForecastVersions.ts
│   ├── useForecastImportExport.ts
│   ├── useProjectRoleAssignments.ts
│   ├── useSubcontractors.ts
│   ├── useSubcontractorCompanies.ts
│   ├── useCareerJobFamilies.ts
│   ├── useLaborCategories.ts
│   └── useFederalHolidays.ts             # Holiday queries & mutations
└── types/
    └── staffing.ts                    # All staffing-related types
```

---

## 5. Forecast Recommendation Engine

### 5.1 Algorithm

```csharp
public class ForecastRecommendationService
{
    private readonly IFederalHolidayService _holidayService;

    public async Task<decimal> CalculateRecommendedHours(
        Guid projectRoleAssignmentId,
        int year,
        int month)
    {
        var assignment = await GetAssignment(projectRoleAssignmentId);
        var user = assignment.UserId.HasValue
            ? await GetUser(assignment.UserId.Value)
            : null;

        // 1. Get working days in month (excluding weekends)
        var workingDays = GetWorkingDaysInMonth(year, month);

        // 2. Subtract federal holidays (only active holidays with AutoApplyToForecast = true)
        var holidays = await _holidayService.GetHolidaysForMonth(year, month, autoApplyToForecast: true);
        var holidayCount = holidays.Count(h => IsWeekday(h.Date)); // Only count holidays that fall on weekdays
        workingDays -= holidayCount;

        // 3. Get standard hours (default 40/week, 8/day)
        var standardHoursPerWeek = user?.StandardHoursPerWeek ?? 40m;
        var standardHoursPerDay = standardHoursPerWeek / 5;
        var baseHours = workingDays * standardHoursPerDay;

        // 4. Check assignment date range
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        if (assignment.StartDate > monthEnd ||
            (assignment.EndDate.HasValue && assignment.EndDate.Value < monthStart))
        {
            return 0; // Not assigned this month
        }

        // 5. Prorate for partial months
        var effectiveStart = assignment.StartDate > monthStart ? assignment.StartDate : monthStart;
        var effectiveEnd = assignment.EndDate.HasValue && assignment.EndDate.Value < monthEnd
            ? assignment.EndDate.Value
            : monthEnd;

        var effectiveDays = GetWorkingDaysBetween(effectiveStart, effectiveEnd);
        var prorationFactor = (decimal)effectiveDays / workingDays;

        // 6. Apply project/WBS target if set
        var targetHours = assignment.WbsElement?.TargetHoursPerMonth
            ?? assignment.Project.TargetHoursPerMonth;

        if (targetHours.HasValue)
        {
            baseHours = Math.Min(baseHours, targetHours.Value);
        }

        // 7. Consider employee's other forecasts (capacity check)
        var otherForecasts = await GetUserForecastsForMonth(assignment.UserId, year, month);
        var totalOtherHours = otherForecasts
            .Where(f => f.ProjectRoleAssignmentId != projectRoleAssignmentId)
            .Sum(f => f.ForecastedHours);

        var availableCapacity = baseHours - totalOtherHours;
        var recommendedHours = Math.Max(0, availableCapacity * prorationFactor);

        return Math.Round(recommendedHours, 1);
    }
}
```

### 5.2 24-Hour Shift Support

For projects with 24-hour shifts, the system will:
1. Allow `StandardHoursPerWeek > 40` on User/Subcontractor
2. Support shift patterns via notes/description
3. Track total hours regardless of shift pattern
4. Allow forecasts exceeding standard hours with warnings

### 5.3 Federal Holiday Integration

The system integrates federal holidays into both forecasting and work location scheduling:

**Forecast Recommendations:**
- When calculating recommended hours, holidays with `AutoApplyToForecast = true` are automatically excluded
- Only weekday holidays are counted (holidays falling on weekends don't reduce working days)
- System uses cached holiday data per tenant/year for performance

**Work Location Schedule:**
- When "Apply Holidays to Schedules" is triggered, the system:
  1. Gets all active holidays with `AutoApplyToSchedule = true`
  2. For each active user in the tenant:
     - Creates a Work Location Preference entry with `LocationType = PTO` (or configurable holiday type)
     - Sets `DayPortion = FullDay`
     - Adds note indicating the holiday name
  3. Skips users who already have entries for that date (unless overwrite is selected)
  4. Returns summary of created/skipped entries

**Holiday Calculation Rules:**
```csharp
public DateOnly CalculateHolidayDate(FederalHoliday holiday, int year)
{
    if (!holiday.IsRecurring)
        return holiday.Date;

    if (holiday.RecurringRule == FederalHolidayRule.FixedDate)
        return new DateOnly(year, holiday.RecurringMonth!.Value, holiday.RecurringDay!.Value);

    // Floating holidays (e.g., "3rd Monday of January")
    return holiday.RecurringRule switch
    {
        FederalHolidayRule.FirstMondayOf => GetNthWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Monday, 1),
        FederalHolidayRule.SecondMondayOf => GetNthWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Monday, 2),
        FederalHolidayRule.ThirdMondayOf => GetNthWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Monday, 3),
        FederalHolidayRule.FourthMondayOf => GetNthWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Monday, 4),
        FederalHolidayRule.LastMondayOf => GetLastWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Monday),
        FederalHolidayRule.FourthThursdayOf => GetNthWeekdayOfMonth(year, holiday.RecurringMonth!.Value, DayOfWeek.Thursday, 4),
        FederalHolidayRule.DayAfterThanksgiving => GetNthWeekdayOfMonth(year, 11, DayOfWeek.Thursday, 4).AddDays(1),
        _ => throw new ArgumentException($"Unknown rule: {holiday.RecurringRule}")
    };
}
```

---

## 6. Export Functionality

### 6.1 CSV Export Format

```csv
Year,Month,Project,ProjectCode,WBS,WBSCode,ResourceType,ResourceName,PositionTitle,JobFamily,CareerLevel,LaborCategory,LaborCategoryCode,ForecastedHours,RecommendedHours,Status,SubmittedAt,ApprovedAt,ApprovedBy,IsOverride,OverrideReason
2025,1,ACME Corp Implementation,ACME-001,Development,212000.0001.00.000001,Employee,John Smith,Senior Developer,Engineering,5,Engineer III,ENG-3,168,176,Approved,2024-12-20,2024-12-22,Jane Doe,false,
2025,1,ACME Corp Implementation,ACME-001,Development,212000.0001.00.000001,Subcontractor,Mike Johnson,PM Support,PM,3,PM Support,PM-SUP,80,80,Approved,2024-12-20,2024-12-22,Jane Doe,false,
2025,1,ACME Corp Implementation,ACME-001,QA,212000.0003.00.000001,TBD,TBD - QA Engineer,QA Engineer,QA,3,QA Analyst,QA-1,160,160,Draft,,,,,
```

### 6.2 Excel Export

Multi-sheet workbook:
1. **Summary**: Project totals by month
2. **Detail**: Line-by-line forecasts (CSV format above)
3. **By Resource**: Pivot by person
4. **By Project**: Pivot by project
5. **TBDs**: All unfilled positions
6. **Variance**: Budget vs. Forecast

---

## 7. Permission Model

### 7.1 New Permissions

```csharp
// Resource permissions
SubcontractorCompany.Read, SubcontractorCompany.Create, SubcontractorCompany.Update, SubcontractorCompany.Delete
Subcontractor.Read, Subcontractor.Create, Subcontractor.Update, Subcontractor.Delete
CareerJobFamily.Read, CareerJobFamily.Create, CareerJobFamily.Update, CareerJobFamily.Delete
LaborCategory.Read, LaborCategory.Create, LaborCategory.Update, LaborCategory.Delete
ProjectRoleAssignment.Read, ProjectRoleAssignment.Create, ProjectRoleAssignment.Update, ProjectRoleAssignment.Delete

// Forecast permissions
Forecast.Read              // View own forecasts
Forecast.ReadTeam          // View team forecasts (direct reports)
Forecast.ReadProject       // View project forecasts (if PM/Approver)
Forecast.ReadAll           // View all forecasts (admin)
Forecast.Create            // Create own forecasts
Forecast.Update            // Update own draft forecasts
Forecast.Submit            // Submit for approval
Forecast.Approve           // Approve team forecasts
Forecast.ApproveAll        // Approve any forecast (finance team)
Forecast.Override          // Override any forecast
Forecast.Lock              // Lock month (admin)
Forecast.Export            // Export to CSV/Excel
Forecast.Import            // Import forecasts from file

// Version permissions
ForecastVersion.Read       // View versions
ForecastVersion.Create     // Create What-If scenarios
ForecastVersion.Update     // Update version name/description
ForecastVersion.Delete     // Delete versions (own What-Ifs only)
ForecastVersion.DeleteAll  // Delete any version (admin)
ForecastVersion.Promote    // Promote What-If to Current
ForecastVersion.Compare    // Compare versions

// Schedule permissions
ForecastSchedule.Read, ForecastSchedule.Manage

// Federal Holiday permissions
FederalHoliday.Read            // View holidays
FederalHoliday.Create          // Create custom holidays
FederalHoliday.Update          // Edit holiday settings
FederalHoliday.Delete          // Delete holidays
FederalHoliday.Seed            // Seed US Federal Holidays for year(s)
FederalHoliday.ApplyToSchedules // Apply holidays to all user schedules
FederalHoliday.ApplyToForecasts // Adjust forecasts for holidays
```

### 7.2 Role Mapping

| Role | Forecast Permissions |
|------|---------------------|
| Employee | Read, Create, Update, Submit |
| Team Lead | + ReadTeam, Approve |
| Project Manager | + ReadProject, Approve (for their projects) |
| Resource Manager | + ReadAll, ApproveAll, Override |
| Finance | + ReadAll, ApproveAll, Override, Export |
| Tenant Admin | All |

---

## 8. Implementation Plan

### Implementation Status Summary (Updated 2024-11-30)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Foundation - Entities, migrations, basic CRUD controllers |
| Phase 2 | ✅ Complete | Role Assignments - ProjectRoleAssignments CRUD, TBD management |
| Phase 3 | ✅ Complete | Forecasting Core - ForecastVersions, Forecasts, AdminForecastsPage |
| Phase 4 | ✅ Complete | Approval Workflow - Submit/Approve/Reject/Override, ForecastApprovalPage |
| Phase 5 | 🟡 Partial | Version Management - Backend complete, frontend partial |
| Phase 6 | ⬜ Not Started | Import/Export |
| Phase 7 | ⬜ Not Started | Reporting & Dashboard |
| Phase 8 | ⬜ Not Started | Polish & Migration |

**Next Steps:**
- Phase 5: Add version comparison endpoint and dedicated versions UI page
- Phase 6: Implement CSV/Excel export and import functionality
- Phase 7: Build reporting dashboards with variance calculations

### Files Created/Modified by Phase

#### Phase 3 & 4 Files (Created 2024-11-30):

**Backend Controllers:**
- `backend/src/MyScheduling.Api/Controllers/ForecastVersionsController.cs` - Forecast version CRUD, clone, promote, archive
- `backend/src/MyScheduling.Api/Controllers/ForecastsController.cs` - Forecast CRUD, approval workflow, bulk operations

**Frontend Services:**
- `frontend/src/services/forecastService.ts` - API client for forecasts and versions

**Frontend Pages:**
- `frontend/src/pages/AdminForecastsPage.tsx` - Admin forecast management with grid/list views
- `frontend/src/pages/ForecastApprovalPage.tsx` - Manager approval page with bulk actions

**Navigation Updates:**
- `frontend/src/components/layout/AdminLayout.tsx` - Added "Forecasts" nav item under Staffing
- `frontend/src/components/layout/ManagerLayout.tsx` - Added "Forecast Approvals" nav item under Administration
- `frontend/src/App.tsx` - Added routes for `/admin/staffing/forecasts` and `/manager/forecast-approvals`

### Phase 1: Foundation (Sprint 1-2) ✅ COMPLETED
**Goal: Core entities and basic CRUD**

1. **Database Migrations** ✅
   - [x] Create CareerJobFamily table
   - [x] Create SubcontractorCompany table
   - [x] Create Subcontractor table (with SubcontractorCompanyId FK)
   - [x] Create LaborCategory table
   - [x] Create ProjectRoleAssignment table
   - [x] Create ForecastVersion table
   - [x] Create Forecast table (with ForecastVersionId FK)
   - [x] Create ForecastHistory table
   - [x] Create ForecastApprovalSchedule table
   - [x] Create ForecastImportExport table
   - [x] Create CompanyHoliday table (with recurrence rules) - *renamed from FederalHoliday*
   - [x] Add new fields to User (PositionTitle, CareerJobFamilyId, etc.)
   - [x] Add new fields to Project (Type, BudgetedHours)

2. **Backend - Entities & DbContext** ✅
   - [x] Create all entity classes (`backend/src/MyScheduling.Core/Entities/Staffing.cs`)
   - [x] Update DbContext with new DbSets
   - [x] Configure entity relationships (ConfigureEnhancedStaffing method)
   - [x] Set up soft-delete for relevant entities

3. **Backend - Basic Controllers** ✅
   - [x] CareerJobFamiliesController (CRUD)
   - [x] SubcontractorCompaniesController (CRUD + subcontractor listing)
   - [x] SubcontractorsController (CRUD)
   - [x] LaborCategoriesController (CRUD + bulk create + by-project)
   - [x] ForecastApprovalSchedulesController (CRUD + set-default)
   - [x] HolidaysController (CRUD + seed + apply) - *implemented separately*

4. **Frontend - Admin Pages** ✅
   - [x] AdminCareerJobFamiliesPage (`/admin/staffing/career-families`)
   - [x] AdminSubcontractorCompaniesPage (`/admin/staffing/subcontractors`) - includes subcontractor management
   - [x] AdminForecastSchedulesPage (`/admin/staffing/forecast-schedules`)
   - [x] AdminHolidaysPage (`/admin/holidays`) - *implemented separately*
   - [x] staffingService.ts - frontend API service layer

### Phase 2: Role Assignments (Sprint 3-4) ✅ COMPLETED
**Goal: Project role assignment functionality**

1. **Backend - ProjectRoleAssignments** ✅
   - [x] ProjectRoleAssignmentsController (full CRUD)
   - [x] TBD management endpoints (`GET /tbds`)
   - [x] Fill TBD endpoint (`POST /{id}/fill-tbd`)
   - [x] My assignments endpoint (`GET /my-assignments`)
   - [x] By-project endpoint (`GET /by-project/{projectId}`)
   - [x] Position title suggestions endpoint (`GET /position-titles`)

2. **Frontend - Role Assignment UI** ✅
   - [x] AdminProjectRoleAssignmentsPage (`/admin/staffing/role-assignments`)
   - [x] Create/Edit assignment modal (User, Subcontractor, or TBD)
   - [x] TBD indicators and fill flow (Fill TBD modal)
   - [x] projectRoleAssignmentsService in staffingService.ts
   - [x] Filter by project, status, assignment type
   - [x] Search by name, title, project

3. **Position Title Suggestions** ✅
   - [x] Backend returns common consulting roles (ProjectManager, Developer, Architect, etc.)
   - [x] Autocomplete with datalist for position titles

### Phase 3: Forecasting Core (Sprint 5-6) ✅ COMPLETED
**Goal: Basic forecast entry and viewing with version support**

1. **Backend - Forecasts & Versions** ✅
   - [x] ForecastVersionsController (CRUD) - `backend/src/MyScheduling.Api/Controllers/ForecastVersionsController.cs`
   - [x] Auto-create "Current" version for tenant (in GET /current endpoint)
   - [x] ForecastsController (CRUD with version support) - `backend/src/MyScheduling.Api/Controllers/ForecastsController.cs`
   - [x] Bulk create/update endpoints (`POST /forecasts/bulk`)
   - [x] My forecasts endpoint (`GET /forecasts/my-forecasts`)
   - [x] Project/WBS forecast endpoints (`GET /forecasts/by-project/{projectId}`)
   - [x] Summary endpoint (`GET /forecasts/summary`)

2. **Frontend - Forecast Entry** ✅
   - [x] AdminForecastsPage (`/admin/staffing/forecasts`) - `frontend/src/pages/AdminForecastsPage.tsx`
   - [x] Grid view showing forecasts by assignment and month
   - [x] List view showing forecast details
   - [x] Click-to-edit forecast modal
   - [x] Version selector dropdown with version management actions
   - [x] Summary cards showing hours by status

3. **Recommendation Engine** ✅
   - [x] Working days calculation in ForecastsController (exclude weekends)
   - [x] Company holiday integration (exclude holidays from working days using CompanyHolidays table)
   - [x] RecommendedHours field populated on forecast creation

### Phase 4: Approval Workflow (Sprint 7-8) ✅ COMPLETED
**Goal: Submit, approve, reject, override flows**

1. **Backend - Workflow** ✅
   - [x] Submit endpoint with validation (`POST /forecasts/{id}/submit`)
   - [x] Approve/reject endpoints (`POST /forecasts/{id}/approve`, `POST /forecasts/{id}/reject`)
   - [x] Override endpoint with audit trail (`POST /forecasts/{id}/override`) - creates ForecastHistory record
   - [x] Bulk approval endpoints (`POST /forecasts/bulk-approve`)
   - [x] Lock month functionality (`POST /forecasts/lock-month`)

2. **Frontend - Approval UI** ✅
   - [x] ForecastApprovalPage (`/manager/forecast-approvals`) - `frontend/src/pages/ForecastApprovalPage.tsx`
   - [x] Approval action buttons (Approve, Reject, Override)
   - [x] Override modal with new hours and reason input
   - [x] Status badges and indicators with color coding
   - [x] Bulk selection with checkboxes for batch operations
   - [x] Summary cards showing pending approvals count
   - [x] Navigation added to Manager portal under Administration

3. **Notifications (optional)**
   - [ ] Submission notifications
   - [ ] Approval/rejection notifications
   - [ ] Deadline reminders

### Phase 5: Version Management & What-If (Sprint 9-10) 🟡 PARTIALLY COMPLETE
**Goal: What-If scenarios, version comparison, promote/archive**

1. **Backend - Version Management** ✅
   - [x] Clone version endpoint (`POST /forecastversions/{id}/clone`) - with copyForecasts option
   - [x] Promote What-If to Current endpoint (`POST /forecastversions/{id}/promote`)
   - [x] Archive version endpoint (`POST /forecastversions/{id}/archive`)
   - [x] Delete version endpoint (`DELETE /forecastversions/{id}`)
   - [ ] Compare versions endpoint (not yet implemented)

2. **Frontend - Version Management UI** 🟡
   - [x] Version list in AdminForecastsPage with dropdown selector
   - [x] Clone button with name prompt
   - [x] Promote button for What-If versions
   - [x] Archive button with reason prompt
   - [x] Version info card showing type, current status
   - [ ] Dedicated ForecastVersionsPage (not yet implemented)
   - [ ] VersionCompareModal (not yet implemented)

3. **Version Features** ✅
   - [x] Copy all forecasts when cloning (copyForecasts parameter)
   - [x] Archive old current when promoting (automatic)
   - [x] Track version lineage (BasedOnVersionId)
   - [x] Version-scoped forecast editing (all edits respect selected version)

### Phase 6: Import/Export (Sprint 11-12)
**Goal: Export and import functionality with version support**

1. **Backend - Export**
   - [ ] CSV export endpoint with version support
   - [ ] Excel export endpoint (EPPlus or similar)
   - [ ] Track export history in ForecastImportExport
   - [ ] Include file hash for re-import detection

2. **Backend - Import**
   - [ ] Import preview endpoint (validate without commit)
   - [ ] Import commit endpoint
   - [ ] Re-import detection (match by file hash)
   - [ ] Create Import version type or update existing
   - [ ] Track import history with success/error counts

3. **Frontend - Import/Export**
   - [ ] ForecastImportExportPage
   - [ ] ExportOptionsPanel component
   - [ ] File upload with drag-and-drop
   - [ ] ImportPreviewModal with validation results
   - [ ] Import history table
   - [ ] Re-download previous exports

### Phase 7: Reporting & Dashboard (Sprint 13-14)
**Goal: Reporting capabilities and dashboards**

1. **Backend - Reports**
   - [ ] Summary endpoint for dashboards
   - [ ] Budget vs forecast variance calculations
   - [ ] Burn rate calculations

2. **Frontend - Reports**
   - [ ] Project staffing summary view
   - [ ] Variance displays (budget vs forecast)
   - [ ] Dashboard widgets
   - [ ] Monthly forecast charts
   - [ ] Capacity utilization charts
   - [ ] Budget burn-down charts

### Phase 8: Polish & Migration (Sprint 15-16)
**Goal: Data migration and refinements**

1. **Data Migration**
   - [ ] Import tool for legacy spreadsheet data
   - [ ] SubcontractorCompany and Subcontractor migration
   - [ ] Validation and error handling
   - [ ] Migration scripts

2. **UI Refinements**
   - [ ] Mobile responsiveness
   - [ ] Performance optimization
   - [ ] User feedback incorporation

3. **Documentation**
   - [ ] User guide
   - [ ] API documentation
   - [ ] Admin configuration guide
   - [ ] Import file format specification

---

## 9. Technical Considerations

### 9.1 Database Indexes

```sql
-- Forecast queries
CREATE INDEX ix_forecasts_assignment_year_month
ON forecasts (project_role_assignment_id, year, month);

CREATE INDEX ix_forecasts_status
ON forecasts (status);

CREATE INDEX ix_forecasts_version
ON forecasts (forecast_version_id);

CREATE INDEX ix_forecasts_version_year_month
ON forecasts (forecast_version_id, year, month);

-- Project role assignments
CREATE INDEX ix_project_role_assignments_project
ON project_role_assignments (project_id);

CREATE INDEX ix_project_role_assignments_user
ON project_role_assignments (user_id);

CREATE INDEX ix_project_role_assignments_tbd
ON project_role_assignments (is_tbd) WHERE is_tbd = true;

-- Forecast versions
CREATE INDEX ix_forecast_versions_tenant_current
ON forecast_versions (tenant_id) WHERE is_current = true;

CREATE INDEX ix_forecast_versions_type
ON forecast_versions (type);

CREATE INDEX ix_forecast_versions_project
ON forecast_versions (project_id) WHERE project_id IS NOT NULL;

CREATE INDEX ix_forecast_versions_user
ON forecast_versions (user_id) WHERE user_id IS NOT NULL;

-- Subcontractor companies
CREATE INDEX ix_subcontractor_companies_status
ON subcontractor_companies (status);

CREATE INDEX ix_subcontractor_companies_tenant
ON subcontractor_companies (tenant_id);

-- Subcontractors
CREATE INDEX ix_subcontractors_company
ON subcontractors (subcontractor_company_id);

CREATE INDEX ix_subcontractors_forecast_submitter
ON subcontractors (subcontractor_company_id) WHERE is_forecast_submitter = true;

-- Import/Export history
CREATE INDEX ix_forecast_import_export_tenant_type
ON forecast_import_export (tenant_id, type);

CREATE INDEX ix_forecast_import_export_file_hash
ON forecast_import_export (file_hash) WHERE file_hash IS NOT NULL;

-- Federal holidays
CREATE INDEX ix_federal_holidays_tenant_year
ON federal_holidays (tenant_id, year);

CREATE INDEX ix_federal_holidays_date
ON federal_holidays (date);

CREATE INDEX ix_federal_holidays_active
ON federal_holidays (tenant_id, is_active) WHERE is_active = true;
```

### 9.2 Caching Strategy

- Career Job Families: Cache for 1 hour (rarely changes)
- Labor Categories: Cache per project for 15 minutes
- Federal Holidays: Cache per tenant/year for 24 hours (rarely changes)
- Forecast recommendations: Calculate on-demand, no cache
- User capacity: Calculate on-demand with short cache (5 min)

### 9.3 Bulk Operations

For forecast bulk operations, use:
- Batch inserts/updates (100 records per batch)
- Transaction wrapping
- Progress feedback for large operations

---

## 10. Open Questions / Future Considerations

1. **Actuals Tracking**: Future phase to track actual hours vs. forecast
2. **Timesheet Integration**: Potential integration with timesheet systems
3. **Resource Leveling**: Auto-balance over-allocated resources
4. **Skill Matching**: Use skills to suggest TBD fills
5. **Mobile App**: Native mobile for forecast entry on-the-go
6. **Email Notifications**: Deadline reminders, approval notifications
7. **Deltek/Costpoint Integration**: Direct export to Deltek format

---

## Appendix A: Common Consulting Position Titles (Seed Data)

```
- Analyst
- Senior Analyst
- Consultant
- Senior Consultant
- Manager
- Senior Manager
- Director
- Principal
- Partner
- Developer
- Senior Developer
- Lead Developer
- Architect
- Solution Architect
- Enterprise Architect
- Project Manager
- Program Manager
- Scrum Master
- Product Owner
- Business Analyst
- Data Analyst
- Data Scientist
- QA Analyst
- QA Engineer
- DevOps Engineer
- Cloud Engineer
- Security Analyst
- Technical Writer
- UX Designer
- UI Developer
```

## Appendix B: WBS Code Format Reference

Format: `212000.0000.00.000001`
- Segment 1 (6 digits): Project/Contract code
- Segment 2 (4 digits): Task code
- Segment 3 (2 digits): Sub-task code
- Segment 4 (6 digits): Sequence number

This format is already supported by the existing WbsElement entity.

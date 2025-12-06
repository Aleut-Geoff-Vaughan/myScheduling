namespace MyScheduling.Core.Entities;

// ==================== CAREER JOB FAMILY ====================

/// <summary>
/// Admin-managed lookup table for career families (e.g., Engineering, Consulting, Project Management)
/// </summary>
public class CareerJobFamily : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Code { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    public virtual ICollection<Subcontractor> Subcontractors { get; set; } = new List<Subcontractor>();
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
}

// ==================== SUBCONTRACTOR COMPANY ====================

/// <summary>
/// Company/vendor that provides subcontractors
/// </summary>
public class SubcontractorCompany : TenantEntity
{
    // Company Info
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
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
    public virtual User? PrimaryContactUser { get; set; }
    public virtual ICollection<Subcontractor> Subcontractors { get; set; } = new List<Subcontractor>();
}

public enum SubcontractorCompanyStatus
{
    Active = 0,
    Inactive = 1,
    Suspended = 2,
    Terminated = 3
}

// ==================== SUBCONTRACTOR ====================

/// <summary>
/// Track non-employee resources without system logins
/// </summary>
public class Subcontractor : TenantEntity
{
    public Guid SubcontractorCompanyId { get; set; }

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
    public virtual SubcontractorCompany SubcontractorCompany { get; set; } = null!;
    public virtual CareerJobFamily? CareerJobFamily { get; set; }
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();

    // Computed property for display
    public string FullName => $"{FirstName} {LastName}".Trim();
}

public enum SubcontractorStatus
{
    Active = 0,
    Inactive = 1,
    Terminated = 2
}

// ==================== LABOR CATEGORY ====================

/// <summary>
/// Contract-specific labor categories per project
/// </summary>
public class LaborCategory : TenantEntity
{
    public Guid ProjectId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }

    // Optional rate tracking (for future use)
    public decimal? BillRate { get; set; }
    public decimal? CostRate { get; set; }

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    // Navigation
    public virtual Project Project { get; set; } = null!;
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
}

// ==================== PROJECT ROLE ASSIGNMENT ====================

/// <summary>
/// Represents a staffed position on a project - can be User, Subcontractor, or TBD
/// </summary>
public class ProjectRoleAssignment : TenantEntity
{
    public Guid ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }

    // Who is assigned (one of these three)
    public Guid? UserId { get; set; }
    public Guid? SubcontractorId { get; set; }
    public bool IsTbd { get; set; } = false;
    public string? TbdDescription { get; set; }

    // Role Details
    public string PositionTitle { get; set; } = string.Empty;
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
    public virtual Project Project { get; set; } = null!;
    public virtual WbsElement? WbsElement { get; set; }
    public virtual User? User { get; set; }
    public virtual Subcontractor? Subcontractor { get; set; }
    public virtual CareerJobFamily? CareerJobFamily { get; set; }
    public virtual LaborCategory? LaborCategory { get; set; }
    public virtual ICollection<Forecast> Forecasts { get; set; } = new List<Forecast>();
    public virtual ICollection<ActualHours> ActualHours { get; set; } = new List<ActualHours>();

    // Computed property for display name
    public string AssigneeName => User?.DisplayName ?? Subcontractor?.FullName ?? TbdDescription ?? "TBD";
}

public enum ProjectRoleAssignmentStatus
{
    Draft = 0,
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

// ==================== FORECAST VERSION ====================

/// <summary>
/// Supports What-If scenarios and version management for forecasts
/// </summary>
public class ForecastVersion : TenantEntity
{
    // Version Info
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ForecastVersionType Type { get; set; } = ForecastVersionType.WhatIf;

    // Scope - can be tenant-wide, project-specific, or user-specific
    public Guid? ProjectId { get; set; }
    public Guid? UserId { get; set; }

    // Version Management
    public bool IsCurrent { get; set; } = false;
    public int VersionNumber { get; set; } = 1;
    public Guid? BasedOnVersionId { get; set; }

    // Period covered by this version
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }

    // Lifecycle - using CreatedByUserId from BaseEntity
    public DateTime? PromotedAt { get; set; }
    public Guid? PromotedByUserId { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchiveReason { get; set; }

    // Navigation
    public virtual Project? Project { get; set; }
    public virtual User? User { get; set; }
    public virtual User? PromotedByUser { get; set; }
    public virtual ForecastVersion? BasedOnVersion { get; set; }
    public virtual ICollection<Forecast> Forecasts { get; set; } = new List<Forecast>();
    public virtual ICollection<ForecastImportExport> ImportExportOperations { get; set; } = new List<ForecastImportExport>();
}

public enum ForecastVersionType
{
    Current = 0,
    WhatIf = 1,
    Historical = 2,
    Import = 3
}

// ==================== FORECAST ====================

/// <summary>
/// Monthly/weekly hour forecast per assignment
/// </summary>
public class Forecast : TenantEntity
{
    public Guid ProjectRoleAssignmentId { get; set; }
    public Guid ForecastVersionId { get; set; }

    // Period
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }

    // Hours
    public decimal ForecastedHours { get; set; }
    public decimal? RecommendedHours { get; set; }

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
    public decimal? OriginalForecastedHours { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Navigation
    public virtual ProjectRoleAssignment ProjectRoleAssignment { get; set; } = null!;
    public virtual ForecastVersion ForecastVersion { get; set; } = null!;
    public virtual User? SubmittedByUser { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public virtual User? OverriddenByUser { get; set; }
    public virtual ICollection<ForecastHistory> History { get; set; } = new List<ForecastHistory>();
}

public enum ForecastStatus
{
    Draft = 0,
    Submitted = 1,
    Reviewed = 2,
    Approved = 3,
    Rejected = 4,
    Locked = 5
}

// ==================== FORECAST HISTORY ====================

/// <summary>
/// Audit trail for forecast changes
/// </summary>
public class ForecastHistory : BaseEntity
{
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
    public virtual Forecast Forecast { get; set; } = null!;
    public virtual User ChangedByUser { get; set; } = null!;
}

public enum ForecastChangeType
{
    Created = 0,
    HoursUpdated = 1,
    StatusChanged = 2,
    Override = 3,
    Submitted = 4,
    Reviewed = 5,
    Approved = 6,
    Rejected = 7,
    Locked = 8,
    VersionCreated = 9,
    VersionPromoted = 10,
    VersionDeleted = 11
}

// ==================== FORECAST APPROVAL SCHEDULE ====================

/// <summary>
/// Configurable approval deadlines per tenant
/// </summary>
public class ForecastApprovalSchedule : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;

    // Deadlines (day of month, 0 = last day)
    public int SubmissionDeadlineDay { get; set; } = 25;
    public int ApprovalDeadlineDay { get; set; } = 28;
    public int LockDay { get; set; } = 1;

    // How many months ahead to forecast
    public int ForecastMonthsAhead { get; set; } = 3;

    public bool IsActive { get; set; } = true;
}

// ==================== FORECAST IMPORT/EXPORT ====================

/// <summary>
/// Track import/export operations for audit and re-import capability
/// </summary>
public class ForecastImportExport : TenantEntity
{
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
    public string FileFormat { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }

    // Results
    public ForecastImportExportStatus Status { get; set; }
    public int RecordsProcessed { get; set; }
    public int RecordsSucceeded { get; set; }
    public int RecordsFailed { get; set; }
    public string? ErrorDetails { get; set; }

    // For imports - which version was created/updated
    public Guid? ResultingVersionId { get; set; }

    // Navigation
    public virtual Project? Project { get; set; }
    public virtual ForecastVersion? ForecastVersion { get; set; }
    public virtual ForecastVersion? ResultingVersion { get; set; }
    public virtual User OperationByUser { get; set; } = null!;
}

public enum ForecastImportExportType
{
    Export = 0,
    Import = 1,
    ImportUpdate = 2
}

public enum ForecastImportExportStatus
{
    InProgress = 0,
    Completed = 1,
    CompletedWithErrors = 2,
    Failed = 3
}

// ==================== ACTUAL HOURS ====================

/// <summary>
/// Actual hours from ERP feed or spreadsheet upload for variance tracking
/// </summary>
public class ActualHours : TenantEntity
{
    public Guid ProjectRoleAssignmentId { get; set; }

    // Period
    public int Year { get; set; }
    public int Month { get; set; }
    public int? Week { get; set; }

    // Hours
    public decimal Hours { get; set; }

    // Source tracking
    public ActualHoursSource Source { get; set; } = ActualHoursSource.ERP;
    public string? SourceReference { get; set; }
    public Guid? ImportOperationId { get; set; }

    // Navigation
    public virtual ProjectRoleAssignment ProjectRoleAssignment { get; set; } = null!;
    public virtual ForecastImportExport? ImportOperation { get; set; }
}

public enum ActualHoursSource
{
    ERP = 0,
    SpreadsheetUpload = 1,
    ManualEntry = 2
}

// ==================== PROJECT BUDGET ====================

/// <summary>
/// Versioned budget for a project for a specific fiscal year
/// Supports multiple budget versions: Original, Re-forecast Q1, Re-forecast Q2, etc.
/// </summary>
public class ProjectBudget : TenantEntity
{
    public Guid ProjectId { get; set; }

    // Fiscal Year (using the tenant's fiscal year configuration)
    // For Apr-Mar fiscal year, FY2025 would be April 2024 - March 2025
    public int FiscalYear { get; set; }

    // Budget Version Info
    public string Name { get; set; } = string.Empty; // e.g., "Original Budget", "Q1 Re-forecast", "Q2 Re-forecast"
    public string? Description { get; set; }
    public ProjectBudgetType Type { get; set; } = ProjectBudgetType.Original;

    // Version Management
    public int VersionNumber { get; set; } = 1;
    public bool IsActive { get; set; } = true; // The active budget for variance calculations
    public Guid? PreviousVersionId { get; set; } // Link to the previous version this was based on

    // Total Hours (sum of monthly lines, or direct entry if not using monthly breakdown)
    public decimal TotalBudgetedHours { get; set; }

    // Approval Workflow
    public ProjectBudgetStatus Status { get; set; } = ProjectBudgetStatus.Draft;
    public Guid? SubmittedByUserId { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNotes { get; set; }

    // Effective dates (when this budget version becomes/became active)
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Navigation
    public virtual Project Project { get; set; } = null!;
    public virtual ProjectBudget? PreviousVersion { get; set; }
    public virtual User? SubmittedByUser { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public virtual ICollection<ProjectBudgetLine> Lines { get; set; } = new List<ProjectBudgetLine>();
    public virtual ICollection<ProjectBudgetHistory> History { get; set; } = new List<ProjectBudgetHistory>();
}

public enum ProjectBudgetType
{
    Original = 0,        // Initial budget at start of fiscal year
    Reforecast = 1,      // Quarterly or periodic re-forecast
    Amendment = 2,       // Budget amendment/change order
    WhatIf = 3           // What-if scenario (not active)
}

public enum ProjectBudgetStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    Superseded = 4       // Replaced by a newer version
}

// ==================== PROJECT BUDGET LINE ====================

/// <summary>
/// Monthly breakdown of budgeted hours for a project budget
/// Optional - if not used, only TotalBudgetedHours on ProjectBudget is used
/// </summary>
public class ProjectBudgetLine : TenantEntity
{
    public Guid ProjectBudgetId { get; set; }

    // Period (calendar month, regardless of fiscal year)
    public int Year { get; set; }
    public int Month { get; set; }

    // Hours
    public decimal BudgetedHours { get; set; }

    // Optional: WBS-level budgeting
    public Guid? WbsElementId { get; set; }

    // Optional: Labor category level budgeting
    public Guid? LaborCategoryId { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Navigation
    public virtual ProjectBudget ProjectBudget { get; set; } = null!;
    public virtual WbsElement? WbsElement { get; set; }
    public virtual LaborCategory? LaborCategory { get; set; }
}

// ==================== PROJECT BUDGET HISTORY ====================

/// <summary>
/// Audit trail for budget changes
/// </summary>
public class ProjectBudgetHistory : BaseEntity
{
    public Guid ProjectBudgetId { get; set; }

    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public ProjectBudgetChangeType ChangeType { get; set; }

    public decimal? OldTotalHours { get; set; }
    public decimal? NewTotalHours { get; set; }
    public ProjectBudgetStatus? OldStatus { get; set; }
    public ProjectBudgetStatus? NewStatus { get; set; }
    public string? ChangeReason { get; set; }

    // Navigation
    public virtual ProjectBudget ProjectBudget { get; set; } = null!;
    public virtual User ChangedByUser { get; set; } = null!;
}

public enum ProjectBudgetChangeType
{
    Created = 0,
    HoursUpdated = 1,
    StatusChanged = 2,
    Submitted = 3,
    Approved = 4,
    Rejected = 5,
    Activated = 6,
    Deactivated = 7,
    LineAdded = 8,
    LineUpdated = 9,
    LineRemoved = 10
}

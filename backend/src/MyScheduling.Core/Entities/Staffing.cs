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
    Approved = 2,
    Rejected = 3,
    Locked = 4
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
    Approved = 5,
    Rejected = 6,
    Locked = 7,
    VersionCreated = 8,
    VersionPromoted = 9,
    VersionDeleted = 10
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

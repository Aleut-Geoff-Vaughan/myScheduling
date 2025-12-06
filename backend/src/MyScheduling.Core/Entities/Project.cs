namespace MyScheduling.Core.Entities;

public class Project : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ProgramCode { get; set; }
    public string? Customer { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ProjectStatus Status { get; set; }

    // Staffing fields
    public ProjectType Type { get; set; } = ProjectType.Sold;
    public decimal? BudgetedHours { get; set; }
    public decimal? TargetHoursPerMonth { get; set; }

    // Navigation properties
    public virtual ICollection<WbsElement> WbsElements { get; set; } = new List<WbsElement>();
    public virtual ICollection<LaborCategory> LaborCategories { get; set; } = new List<LaborCategory>();
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
    public virtual ICollection<ProjectBudget> ProjectBudgets { get; set; } = new List<ProjectBudget>();
}

public enum ProjectStatus
{
    Draft,
    Active,
    Closed
}

public enum ProjectType
{
    Sold = 0,
    Unsold = 1,
    Proposed = 2,
    Internal = 3,
    OnHold = 4
}

public class WbsElement : TenantEntity
{
    public Guid ProjectId { get; set; }
    public string Code { get; set; } = string.Empty; // Actual charge code
    public string Description { get; set; } = string.Empty;

    // Validity dates
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; } // Null = indefinite

    // Legacy fields (kept for backwards compatibility)
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    // Type and status
    public WbsType Type { get; set; }
    public WbsStatus Status { get; set; }

    // Legacy billable flag (kept for backwards compatibility, replaced by Type)
    public bool IsBillable { get; set; }

    // Ownership and workflow
    public Guid? OwnerUserId { get; set; }
    public Guid? ApproverUserId { get; set; }
    public Guid? ApproverGroupId { get; set; }
    public WbsApprovalStatus ApprovalStatus { get; set; }
    public string? ApprovalNotes { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Staffing fields
    public decimal? BudgetedHours { get; set; }
    public decimal? TargetHoursPerMonth { get; set; }

    // Navigation properties
    public virtual Project Project { get; set; } = null!;
    public virtual User? Owner { get; set; }
    public virtual User? Approver { get; set; }
    public virtual Group? ApproverGroup { get; set; }
    public virtual ICollection<ProjectRole> ProjectRoles { get; set; } = new List<ProjectRole>();
    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public virtual ICollection<WbsChangeHistory> ChangeHistory { get; set; } = new List<WbsChangeHistory>();
    public virtual ICollection<ProjectRoleAssignment> ProjectRoleAssignments { get; set; } = new List<ProjectRoleAssignment>();
}

public enum WbsType
{
    Billable = 0,           // Direct customer billing
    NonBillable = 1,        // Customer work but not billed
    BidAndProposal = 2,     // B&P - Proposal development
    Overhead = 3,           // OH - General overhead
    GeneralAndAdmin = 4     // G&A - Administrative costs
}

public enum WbsStatus
{
    Draft = 0,
    Active = 1,
    Closed = 2
}

public enum WbsApprovalStatus
{
    Draft = 0,              // Initial creation
    PendingApproval = 1,    // Submitted for approval
    Approved = 2,           // Approved and active
    Rejected = 3,           // Rejected by approver
    Suspended = 4,          // Temporarily suspended
    Closed = 5              // Closed/archived
}

public class WbsChangeHistory : BaseEntity
{
    public Guid WbsElementId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public string ChangeType { get; set; } = string.Empty; // Created, Updated, StatusChanged, TypeChanged
    public string? OldValues { get; set; } // JSON snapshot
    public string? NewValues { get; set; } // JSON snapshot
    public string? Notes { get; set; }

    // Navigation properties
    public virtual WbsElement WbsElement { get; set; } = null!;
    public virtual User ChangedBy { get; set; } = null!;
}

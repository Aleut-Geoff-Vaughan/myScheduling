namespace AleutStaffing.Core.Entities;

public class ProjectRole : TenantEntity
{
    public Guid WbsElementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? LaborCategory { get; set; }
    public string? RequiredSkills { get; set; } // JSON array of Skill IDs
    public decimal FteRequired { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ProjectRoleStatus Status { get; set; }
    public bool AllowSelfRequest { get; set; }

    // Navigation properties
    public virtual WbsElement WbsElement { get; set; } = null!;
    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public enum ProjectRoleStatus
{
    Draft,
    Open,
    Filled,
    Closed
}

public class Assignment : TenantEntity
{
    public Guid PersonId { get; set; }
    public Guid? ProjectRoleId { get; set; }
    public Guid WbsElementId { get; set; }
    public int AllocationPct { get; set; } // 0-100
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public AssignmentStatus Status { get; set; }
    public bool IsPtoOrTraining { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual ProjectRole? ProjectRole { get; set; }
    public virtual WbsElement WbsElement { get; set; } = null!;
    public virtual User? ApprovedByUser { get; set; }
    public virtual ICollection<AssignmentHistory> History { get; set; } = new List<AssignmentHistory>();
}

public enum AssignmentStatus
{
    Draft,
    Requested,
    PendingApproval,
    Active,
    Completed,
    Cancelled,
    Rejected
}

public class AssignmentHistory : BaseEntity
{
    public Guid AssignmentId { get; set; }
    public int AllocationPct { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public AssignmentStatus Status { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public string? ChangeReason { get; set; }

    // Navigation properties
    public virtual Assignment Assignment { get; set; } = null!;
}

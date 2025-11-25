namespace MyScheduling.Core.Entities;

public class AssignmentRequest : TenantEntity
{
    public Guid RequestedByUserId { get; set; }
    public Guid RequestedForUserId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? WbsElementId { get; set; }
    public Guid? ProjectRoleId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int AllocationPct { get; set; }
    public AssignmentRequestStatus Status { get; set; } = AssignmentRequestStatus.Pending;
    public string? Notes { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public Guid? AssignmentId { get; set; }
    public Guid? ApproverGroupId { get; set; }

    // Navigation
    public virtual User RequestedByUser { get; set; } = null!;
    public virtual User RequestedForUser { get; set; } = null!;
    public virtual User? ApprovedByUser { get; set; }
    public virtual WbsElement? WbsElement { get; set; }
    public virtual Project? Project { get; set; }
    public virtual Assignment? Assignment { get; set; }
    public virtual Group? ApproverGroup { get; set; }
}

public enum AssignmentRequestStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}

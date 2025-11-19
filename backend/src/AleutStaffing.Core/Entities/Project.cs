namespace AleutStaffing.Core.Entities;

public class Project : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ProgramCode { get; set; }
    public string? Customer { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ProjectStatus Status { get; set; }

    // Navigation properties
    public virtual ICollection<WbsElement> WbsElements { get; set; } = new List<WbsElement>();
}

public enum ProjectStatus
{
    Draft,
    Active,
    Closed
}

public class WbsElement : TenantEntity
{
    public Guid ProjectId { get; set; }
    public string Code { get; set; } = string.Empty; // Actual charge code
    public string Description { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public WbsStatus Status { get; set; }
    public bool IsBillable { get; set; }

    // Navigation properties
    public virtual Project Project { get; set; } = null!;
    public virtual ICollection<ProjectRole> ProjectRoles { get; set; } = new List<ProjectRole>();
    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public enum WbsStatus
{
    Draft,
    Active,
    Closed
}

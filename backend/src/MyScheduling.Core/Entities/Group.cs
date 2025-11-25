namespace MyScheduling.Core.Entities;

public class Group : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public virtual ICollection<AssignmentRequest> AssignmentRequests { get; set; } = new List<AssignmentRequest>();
}

public class GroupMember : TenantEntity
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public GroupMemberRole Role { get; set; } = GroupMemberRole.Member;

    // Navigation properties
    public virtual Group Group { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public enum GroupMemberRole
{
    Member = 0,
    Manager = 1,
    Approver = 2
}

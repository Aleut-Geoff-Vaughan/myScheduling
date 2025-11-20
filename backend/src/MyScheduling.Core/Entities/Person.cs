namespace MyScheduling.Core.Entities;

public class Person : TenantEntity
{
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? OrgUnit { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? LaborCategory { get; set; }
    public string? CostCenter { get; set; }
    public string? JobTitle { get; set; }
    public PersonType Type { get; set; } = PersonType.Employee;
    public PersonStatus Status { get; set; }

    // Navigation properties
    public virtual User? User { get; set; }
    public virtual ResumeProfile? ResumeProfile { get; set; }
    public virtual ICollection<PersonSkill> PersonSkills { get; set; } = new List<PersonSkill>();
    public virtual ICollection<PersonCertification> PersonCertifications { get; set; } = new List<PersonCertification>();
    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public virtual ICollection<WorkLocationPreference> WorkLocationPreferences { get; set; } = new List<WorkLocationPreference>();
}

public enum PersonType
{
    Employee,      // Requires User account
    Contractor,    // Optional User account
    Vendor,        // Optional User account
    External       // Optional User account
}

public enum PersonStatus
{
    Active,
    Terminated,
    LOA,
    Inactive
}

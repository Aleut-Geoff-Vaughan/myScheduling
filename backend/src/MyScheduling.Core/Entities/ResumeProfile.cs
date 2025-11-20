using MyScheduling.Core.Enums;

namespace MyScheduling.Core.Entities;

public class ResumeProfile : BaseEntity
{
    public Guid PersonId { get; set; }
    public string? TemplateConfig { get; set; } // JSON for template metadata

    // NEW FIELDS - Enhanced functionality
    public ResumeStatus Status { get; set; } = ResumeStatus.Draft;
    public Guid? CurrentVersionId { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public Guid? LastReviewedByUserId { get; set; }
    public bool IsPublic { get; set; } = false;
    public string? LinkedInProfileUrl { get; set; }
    public DateTime? LinkedInLastSyncedAt { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual ICollection<ResumeSection> Sections { get; set; } = new List<ResumeSection>();
    public virtual ICollection<ResumeVersion> Versions { get; set; } = new List<ResumeVersion>();
    public virtual ICollection<ResumeDocument> Documents { get; set; } = new List<ResumeDocument>();
    public virtual ICollection<ResumeApproval> Approvals { get; set; } = new List<ResumeApproval>();
    public virtual ResumeVersion? CurrentVersion { get; set; }
    public virtual User? LastReviewedBy { get; set; }
}

public class ResumeSection : BaseEntity
{
    public Guid PersonId { get; set; }
    public ResumeSectionType Type { get; set; }
    public int DisplayOrder { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual ICollection<ResumeEntry> Entries { get; set; } = new List<ResumeEntry>();
}

public enum ResumeSectionType
{
    Summary,
    Experience,
    Education,
    Certifications,
    Skills,
    Projects,
    Awards,
    Publications
}

public class ResumeEntry : BaseEntity
{
    public Guid ResumeSectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? AdditionalFields { get; set; } // JSON for section-specific fields

    // Navigation properties
    public virtual ResumeSection ResumeSection { get; set; } = null!;
}

public class Skill : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public SkillCategory Category { get; set; }

    // Navigation properties
    public virtual ICollection<PersonSkill> PersonSkills { get; set; } = new List<PersonSkill>();
}

public enum SkillCategory
{
    Technical,
    Management,
    Domain,
    Language,
    Other
}

public class PersonSkill : BaseEntity
{
    public Guid PersonId { get; set; }
    public Guid SkillId { get; set; }
    public ProficiencyLevel ProficiencyLevel { get; set; }
    public DateTime? LastUsedDate { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual Skill Skill { get; set; } = null!;
}

public enum ProficiencyLevel
{
    Beginner,
    Intermediate,
    Advanced,
    Expert
}

public class Certification : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }

    // Navigation properties
    public virtual ICollection<PersonCertification> PersonCertifications { get; set; } = new List<PersonCertification>();
}

public class PersonCertification : BaseEntity
{
    public Guid PersonId { get; set; }
    public Guid CertificationId { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual Certification Certification { get; set; } = null!;
}

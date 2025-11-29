namespace MyScheduling.Core.Entities;

public class ResumeVersion : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public int VersionNumber { get; set; }
    public string VersionName { get; set; } = string.Empty; // e.g., "Federal Proposal", "Commercial"
    public string? Description { get; set; }
    public string? ContentSnapshot { get; set; } // JSON snapshot of all sections/entries
    public Guid CreatedByUserId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<ResumeDocument> GeneratedDocuments { get; set; } = new List<ResumeDocument>();
}

public class ResumeDocument : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }
    public Guid StoredFileId { get; set; }
    public string DocumentType { get; set; } = string.Empty; // "Word", "PDF", "LinkedIn"
    public string? TemplateName { get; set; }
    public DateTime GeneratedAt { get; set; }
    public Guid GeneratedByUserId { get; set; }

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
    public virtual StoredFile StoredFile { get; set; } = null!;
    public virtual User GeneratedBy { get; set; } = null!;
}

public class ResumeApproval : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public MyScheduling.Core.Enums.ApprovalStatus Status { get; set; } = MyScheduling.Core.Enums.ApprovalStatus.Pending;
    public string? ReviewNotes { get; set; }
    public string? RequestNotes { get; set; }

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
    public virtual User RequestedBy { get; set; } = null!;
    public virtual User? ReviewedBy { get; set; }
}

public class ResumeTemplate : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public MyScheduling.Core.Enums.ResumeTemplateType Type { get; set; }
    public string TemplateContent { get; set; } = string.Empty; // Word template or config
    public Guid? StoredFileId { get; set; } // Reference to template file
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual StoredFile? StoredFile { get; set; }
}

public class LinkedInImport : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid ResumeProfileId { get; set; }
    public string LinkedInProfileUrl { get; set; } = string.Empty;
    public DateTime ImportedAt { get; set; }
    public Guid ImportedByUserId { get; set; }
    public string? RawData { get; set; } // JSON of imported data
    public MyScheduling.Core.Enums.ImportStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public int ItemsImported { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual User ImportedBy { get; set; } = null!;
}

/// <summary>
/// Represents a shareable link to a resume for external viewing
/// </summary>
public class ResumeShareLink : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }  // Null = current version
    public string ShareToken { get; set; } = string.Empty;  // Unique URL token (e.g., "abc123xyz")
    public DateTime? ExpiresAt { get; set; }
    public string? PasswordHash { get; set; }  // BCrypt hash if password protected
    public string? VisibleSections { get; set; }  // JSON array of section types to show
    public bool HideContactInfo { get; set; } = false;
    public int ViewCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public Guid CreatedByUserId { get; set; }

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
    public virtual User CreatedBy { get; set; } = null!;
}

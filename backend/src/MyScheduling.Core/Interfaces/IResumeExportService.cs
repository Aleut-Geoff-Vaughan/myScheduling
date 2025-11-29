namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service interface for generating resume documents in various formats
/// </summary>
public interface IResumeExportService
{
    /// <summary>
    /// Generate a Word document (.docx) from a resume
    /// </summary>
    /// <param name="resumeData">The resume data to export</param>
    /// <param name="options">Export options</param>
    /// <returns>The Word document as a byte array</returns>
    Task<byte[]> GenerateWordDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options);

    /// <summary>
    /// Generate a PDF document from a resume
    /// </summary>
    /// <param name="resumeData">The resume data to export</param>
    /// <param name="options">Export options</param>
    /// <returns>The PDF document as a byte array</returns>
    Task<byte[]> GeneratePdfDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options);
}

/// <summary>
/// Complete resume data for export
/// </summary>
public class ResumeExportData
{
    public Guid ResumeProfileId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Summary { get; set; }
    public List<ExperienceEntry> Experience { get; set; } = new();
    public List<EducationEntry> Education { get; set; } = new();
    public List<SkillEntry> Skills { get; set; } = new();
    public List<CertificationEntry> Certifications { get; set; } = new();
    public List<ProjectEntry> Projects { get; set; } = new();
    public List<AwardEntry> Awards { get; set; } = new();
    public List<PublicationEntry> Publications { get; set; } = new();
}

public class ExperienceEntry
{
    public string Title { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
}

public class EducationEntry
{
    public string Title { get; set; } = string.Empty; // Degree
    public string? Organization { get; set; } // School
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? FieldOfStudy { get; set; }
    public string? GPA { get; set; }
}

public class SkillEntry
{
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int ProficiencyLevel { get; set; } // 0-3: Beginner, Intermediate, Advanced, Expert
}

public class CertificationEntry
{
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
}

public class ProjectEntry
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Url { get; set; }
}

public class AwardEntry
{
    public string Title { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public DateTime? Date { get; set; }
    public string? Description { get; set; }
}

public class PublicationEntry
{
    public string Title { get; set; } = string.Empty;
    public string? Publisher { get; set; }
    public DateTime? Date { get; set; }
    public string? Url { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// Options for resume export
/// </summary>
public class ResumeExportOptions
{
    public ResumeTemplateStyle TemplateStyle { get; set; } = ResumeTemplateStyle.Modern;
    public bool IncludePhoto { get; set; } = false;
    public bool IncludeContactInfo { get; set; } = true;
    public bool IncludeLinkedIn { get; set; } = true;
    public bool ShowSkillProficiency { get; set; } = true;
    public bool IncludeSummary { get; set; } = true;
    public bool IncludeExperience { get; set; } = true;
    public bool IncludeEducation { get; set; } = true;
    public bool IncludeSkills { get; set; } = true;
    public bool IncludeCertifications { get; set; } = true;
    public bool IncludeProjects { get; set; } = true;
    public bool IncludeAwards { get; set; } = true;
    public bool IncludePublications { get; set; } = true;
}

public enum ResumeTemplateStyle
{
    Modern,
    Classic,
    Federal,
    Executive,
    Minimal
}

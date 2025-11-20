using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

public interface ILinkedInService
{
    // Import from LinkedIn
    Task<LinkedInImport> ImportFromLinkedInAsync(
        string linkedInUrl,
        Guid personId,
        Guid userId);

    // Parse LinkedIn data
    Task<LinkedInProfile> ParseLinkedInProfileAsync(string linkedInUrl);

    // Map to resume structure
    Task<ResumeProfile> MapLinkedInToResumeAsync(
        LinkedInProfile linkedInProfile,
        Guid personId);

    // Sync updates
    Task<bool> SyncLinkedInUpdatesAsync(Guid resumeProfileId);

    // Get import history
    Task<IEnumerable<LinkedInImport>> GetImportHistoryAsync(Guid personId);
}

public class LinkedInProfile
{
    public string FullName { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public List<LinkedInExperience> Experience { get; set; } = new();
    public List<LinkedInEducation> Education { get; set; } = new();
    public List<string> Skills { get; set; } = new();
    public List<LinkedInCertification> Certifications { get; set; } = new();
    public List<LinkedInPublication> Publications { get; set; } = new();
}

public class LinkedInExperience
{
    public string Title { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}

public class LinkedInEducation
{
    public string School { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string FieldOfStudy { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class LinkedInCertification
{
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string CredentialId { get; set; } = string.Empty;
}

public class LinkedInPublication
{
    public string Title { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public DateTime? PublishDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

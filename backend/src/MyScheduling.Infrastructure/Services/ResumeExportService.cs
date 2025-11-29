using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Infrastructure.Services;

/// <summary>
/// Main service for resume export operations, coordinating between Word and PDF services
/// </summary>
public class ResumeExportService : IResumeExportService
{
    private readonly MySchedulingDbContext _context;
    private readonly ResumeWordExportService _wordExportService;
    private readonly ResumePdfExportService _pdfExportService;
    private readonly ILogger<ResumeExportService> _logger;

    public ResumeExportService(
        MySchedulingDbContext context,
        ILogger<ResumeExportService> logger)
    {
        _context = context;
        _wordExportService = new ResumeWordExportService();
        _pdfExportService = new ResumePdfExportService();
        _logger = logger;
    }

    public async Task<byte[]> GenerateWordDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options)
    {
        _logger.LogInformation("Generating Word document for resume {ResumeId}", resumeData.ResumeProfileId);
        return await _wordExportService.GenerateWordDocumentAsync(resumeData, options);
    }

    public async Task<byte[]> GeneratePdfDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options)
    {
        _logger.LogInformation("Generating PDF document for resume {ResumeId}", resumeData.ResumeProfileId);
        return await _pdfExportService.GeneratePdfDocumentAsync(resumeData, options);
    }

    /// <summary>
    /// Load resume data from the database for export
    /// </summary>
    public async Task<ResumeExportData> LoadResumeDataAsync(Guid resumeProfileId)
    {
        var resume = await _context.ResumeProfiles
            .Include(r => r.User)
            .Include(r => r.Sections)
                .ThenInclude(s => s.Entries)
            .FirstOrDefaultAsync(r => r.Id == resumeProfileId);

        if (resume == null)
        {
            throw new ArgumentException($"Resume with ID {resumeProfileId} not found");
        }

        // Load skills and certifications for the user
        var userSkills = await _context.PersonSkills
            .Include(ps => ps.Skill)
            .Where(ps => ps.UserId == resume.UserId)
            .ToListAsync();

        var userCertifications = await _context.PersonCertifications
            .Include(pc => pc.Certification)
            .Where(pc => pc.UserId == resume.UserId)
            .ToListAsync();

        // Map to export data
        var exportData = new ResumeExportData
        {
            ResumeProfileId = resume.Id,
            DisplayName = resume.User.DisplayName,
            JobTitle = resume.User.JobTitle,
            Email = resume.User.Email,
            Phone = resume.User.PhoneNumber,
            LinkedInUrl = resume.LinkedInProfileUrl
        };

        // Map sections
        foreach (var section in resume.Sections.OrderBy(s => s.DisplayOrder))
        {
            switch (section.Type)
            {
                case ResumeSectionType.Summary:
                    var summaryEntry = section.Entries.FirstOrDefault();
                    if (summaryEntry != null)
                    {
                        exportData.Summary = summaryEntry.Description;
                    }
                    break;

                case ResumeSectionType.Experience:
                    exportData.Experience = section.Entries
                        .OrderByDescending(e => e.StartDate)
                        .Select(e => new ExperienceEntry
                        {
                            Title = e.Title,
                            Organization = e.Organization,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Description = e.Description,
                            Location = GetAdditionalField(e.AdditionalFields, "location")
                        })
                        .ToList();
                    break;

                case ResumeSectionType.Education:
                    exportData.Education = section.Entries
                        .OrderByDescending(e => e.EndDate ?? e.StartDate)
                        .Select(e => new EducationEntry
                        {
                            Title = e.Title,
                            Organization = e.Organization,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Description = e.Description,
                            FieldOfStudy = GetAdditionalField(e.AdditionalFields, "fieldOfStudy"),
                            GPA = GetAdditionalField(e.AdditionalFields, "gpa")
                        })
                        .ToList();
                    break;

                case ResumeSectionType.Projects:
                    exportData.Projects = section.Entries
                        .OrderByDescending(e => e.StartDate)
                        .Select(e => new ProjectEntry
                        {
                            Title = e.Title,
                            Description = e.Description,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Url = GetAdditionalField(e.AdditionalFields, "url")
                        })
                        .ToList();
                    break;

                case ResumeSectionType.Awards:
                    exportData.Awards = section.Entries
                        .OrderByDescending(e => e.StartDate)
                        .Select(e => new AwardEntry
                        {
                            Title = e.Title,
                            Organization = e.Organization,
                            Date = e.StartDate,
                            Description = e.Description
                        })
                        .ToList();
                    break;

                case ResumeSectionType.Publications:
                    exportData.Publications = section.Entries
                        .OrderByDescending(e => e.StartDate)
                        .Select(e => new PublicationEntry
                        {
                            Title = e.Title,
                            Publisher = e.Organization,
                            Date = e.StartDate,
                            Description = e.Description,
                            Url = GetAdditionalField(e.AdditionalFields, "url")
                        })
                        .ToList();
                    break;
            }
        }

        // Map skills from PersonSkills
        exportData.Skills = userSkills
            .Select(ps => new SkillEntry
            {
                Name = ps.Skill.Name,
                Category = ps.Skill.Category.ToString(),
                ProficiencyLevel = (int)ps.ProficiencyLevel
            })
            .ToList();

        // Map certifications from PersonCertifications
        exportData.Certifications = userCertifications
            .Select(pc => new CertificationEntry
            {
                Name = pc.Certification.Name,
                Issuer = pc.Certification.Issuer,
                IssueDate = pc.IssueDate,
                ExpiryDate = pc.ExpiryDate,
                CredentialId = pc.CredentialId
            })
            .ToList();

        return exportData;
    }

    /// <summary>
    /// Load resume data from a version snapshot
    /// </summary>
    public async Task<ResumeExportData> LoadVersionDataAsync(Guid resumeProfileId, Guid versionId)
    {
        var version = await _context.ResumeVersions
            .Include(v => v.ResumeProfile)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(v => v.Id == versionId && v.ResumeProfileId == resumeProfileId);

        if (version == null)
        {
            throw new ArgumentException($"Version with ID {versionId} not found for resume {resumeProfileId}");
        }

        if (string.IsNullOrEmpty(version.ContentSnapshot))
        {
            // If no snapshot, load current data
            return await LoadResumeDataAsync(resumeProfileId);
        }

        // Parse the content snapshot
        var snapshot = System.Text.Json.JsonSerializer.Deserialize<VersionSnapshot>(version.ContentSnapshot);
        if (snapshot == null)
        {
            return await LoadResumeDataAsync(resumeProfileId);
        }

        var exportData = new ResumeExportData
        {
            ResumeProfileId = resumeProfileId,
            DisplayName = snapshot.DisplayName ?? version.ResumeProfile.User.DisplayName,
            JobTitle = snapshot.JobTitle ?? version.ResumeProfile.User.JobTitle,
            Email = snapshot.Email ?? version.ResumeProfile.User.Email,
            LinkedInUrl = version.ResumeProfile.LinkedInProfileUrl
        };

        // Map sections from snapshot
        if (snapshot.Sections != null)
        {
            foreach (var section in snapshot.Sections)
            {
                if (section.Type == ResumeSectionType.Summary.ToString())
                {
                    var summaryEntry = section.Entries?.FirstOrDefault();
                    if (summaryEntry != null)
                    {
                        exportData.Summary = summaryEntry.Description;
                    }
                }
                else if (section.Type == ResumeSectionType.Experience.ToString())
                {
                    exportData.Experience = section.Entries?
                        .OrderByDescending(e => e.StartDate)
                        .Select(e => new ExperienceEntry
                        {
                            Title = e.Title ?? "",
                            Organization = e.Organization,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Description = e.Description
                        })
                        .ToList() ?? new();
                }
                else if (section.Type == ResumeSectionType.Education.ToString())
                {
                    exportData.Education = section.Entries?
                        .OrderByDescending(e => e.EndDate ?? e.StartDate)
                        .Select(e => new EducationEntry
                        {
                            Title = e.Title ?? "",
                            Organization = e.Organization,
                            StartDate = e.StartDate,
                            EndDate = e.EndDate,
                            Description = e.Description
                        })
                        .ToList() ?? new();
                }
            }
        }

        // Map skills from snapshot
        if (snapshot.Skills != null)
        {
            exportData.Skills = snapshot.Skills
                .Select(s => new SkillEntry
                {
                    Name = s.Name ?? "",
                    ProficiencyLevel = (int)(s.ProficiencyLevel ?? 0)
                })
                .ToList();
        }

        // Map certifications from snapshot
        if (snapshot.Certifications != null)
        {
            exportData.Certifications = snapshot.Certifications
                .Select(c => new CertificationEntry
                {
                    Name = c.Name ?? "",
                    Issuer = c.Issuer,
                    IssueDate = c.IssueDate,
                    ExpiryDate = c.ExpiryDate,
                    CredentialId = c.CredentialId
                })
                .ToList();
        }

        return exportData;
    }

    private static string? GetAdditionalField(string? additionalFieldsJson, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(additionalFieldsJson))
            return null;

        try
        {
            var fields = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(additionalFieldsJson);
            return fields?.GetValueOrDefault(fieldName);
        }
        catch
        {
            return null;
        }
    }
}

// Classes for deserializing version snapshots
internal class VersionSnapshot
{
    public string? DisplayName { get; set; }
    public string? JobTitle { get; set; }
    public string? Email { get; set; }
    public List<SnapshotSection>? Sections { get; set; }
    public List<SnapshotSkill>? Skills { get; set; }
    public List<SnapshotCertification>? Certifications { get; set; }
}

internal class SnapshotSection
{
    public string? Type { get; set; }
    public int DisplayOrder { get; set; }
    public List<SnapshotEntry>? Entries { get; set; }
}

internal class SnapshotEntry
{
    public string? Title { get; set; }
    public string? Organization { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public string? AdditionalFields { get; set; }
}

internal class SnapshotSkill
{
    public string? Name { get; set; }
    public int? ProficiencyLevel { get; set; }
    public DateTime? LastUsedDate { get; set; }
}

internal class SnapshotCertification
{
    public string? Name { get; set; }
    public string? Issuer { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
}

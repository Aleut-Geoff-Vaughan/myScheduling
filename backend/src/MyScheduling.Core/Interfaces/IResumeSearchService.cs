using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;

namespace MyScheduling.Core.Interfaces;

public interface IResumeSearchService
{
    // Search resumes
    Task<PagedResult<ResumeProfile>> SearchResumesAsync(
        ResumeSearchCriteria criteria,
        Guid tenantId);

    // Find by skills
    Task<List<ResumeProfile>> FindBySkillsAsync(
        List<string> skills,
        Guid tenantId,
        ProficiencyLevel? minProficiency = null);

    // Find by certifications
    Task<List<ResumeProfile>> FindByCertificationsAsync(
        List<string> certifications,
        Guid tenantId);

    // Advanced search
    Task<List<ResumeProfile>> AdvancedSearchAsync(
        string query,
        Guid tenantId,
        Dictionary<string, object>? filters = null);

    // Recommendation engine
    Task<List<ResumeProfile>> RecommendCandidatesAsync(
        string jobDescription,
        Guid tenantId,
        int maxResults = 10);
}

public class ResumeSearchCriteria
{
    public string? SearchTerm { get; set; }
    public List<string>? Skills { get; set; }
    public List<string>? Certifications { get; set; }
    public int? MinYearsExperience { get; set; }
    public List<string>? Locations { get; set; }
    public ResumeStatus? Status { get; set; }
    public DateTime? LastUpdatedAfter { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}

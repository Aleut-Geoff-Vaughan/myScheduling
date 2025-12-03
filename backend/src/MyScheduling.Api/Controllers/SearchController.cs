using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Portal-wide search controller that provides unified search across all entity types.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<SearchController> _logger;

    public SearchController(MySchedulingDbContext context, ILogger<SearchController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Performs a unified search across all entity types.
    /// </summary>
    /// <param name="q">Search query (minimum 2 characters)</param>
    /// <param name="types">Comma-separated list of entity types to search (optional, defaults to all)</param>
    /// <param name="tenantId">Tenant ID to search within (optional)</param>
    /// <param name="limit">Maximum results per category (default: 5)</param>
    [HttpGet]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery] string q,
        [FromQuery] string? types = null,
        [FromQuery] Guid? tenantId = null,
        [FromQuery] int limit = 5)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return BadRequest("Search query must be at least 2 characters");
        }

        var searchTerm = q.Trim().ToLower();
        var searchTypes = types?.Split(',').Select(t => t.Trim().ToLower()).ToHashSet()
                         ?? new HashSet<string>();

        // Get user's tenant IDs for filtering
        var userTenantIds = GetUserTenantIds();
        var isSystemAdmin = IsSystemAdmin();

        // Filter by requested tenant if specified
        if (tenantId.HasValue)
        {
            if (!isSystemAdmin && !userTenantIds.Contains(tenantId.Value))
            {
                return Forbid("You don't have access to this tenant");
            }
            userTenantIds = new List<Guid> { tenantId.Value };
        }

        var response = new SearchResponse
        {
            Query = q,
            Timestamp = DateTime.UtcNow
        };

        // Execute searches sequentially to avoid DbContext threading issues
        // DbContext is not thread-safe and cannot handle parallel async operations

        // Search People/Users
        if (ShouldSearch("people", searchTypes))
        {
            response.People = await SearchPeopleAsync(searchTerm, userTenantIds, isSystemAdmin, limit);
        }

        // Search Projects
        if (ShouldSearch("projects", searchTypes))
        {
            response.Projects = await SearchProjectsAsync(searchTerm, userTenantIds, limit);
        }

        // Search WBS Elements
        if (ShouldSearch("wbs", searchTypes))
        {
            response.WbsElements = await SearchWbsAsync(searchTerm, userTenantIds, limit);
        }

        // Search Resumes (deep search including all components)
        if (ShouldSearch("resumes", searchTypes))
        {
            response.Resumes = await SearchResumesDeepAsync(searchTerm, userTenantIds, isSystemAdmin, limit);
        }

        // Search Offices
        if (ShouldSearch("offices", searchTypes))
        {
            response.Offices = await SearchOfficesAsync(searchTerm, userTenantIds, limit);
        }

        // Search Spaces
        if (ShouldSearch("spaces", searchTypes))
        {
            response.Spaces = await SearchSpacesAsync(searchTerm, userTenantIds, limit);
        }

        // Search Groups
        if (ShouldSearch("groups", searchTypes))
        {
            response.Groups = await SearchGroupsAsync(searchTerm, userTenantIds, limit);
        }

        // Search Skills
        if (ShouldSearch("skills", searchTypes))
        {
            response.Skills = await SearchSkillsAsync(searchTerm, limit);
        }

        // Search Certifications
        if (ShouldSearch("certifications", searchTypes))
        {
            response.Certifications = await SearchCertificationsAsync(searchTerm, limit);
        }

        // Search Subcontractors
        if (ShouldSearch("subcontractors", searchTypes))
        {
            response.Subcontractors = await SearchSubcontractorsAsync(searchTerm, userTenantIds, limit);
        }

        // Search Subcontractor Companies
        if (ShouldSearch("companies", searchTypes))
        {
            response.SubcontractorCompanies = await SearchSubcontractorCompaniesAsync(searchTerm, userTenantIds, limit);
        }

        // Calculate total count
        response.TotalCount =
            (response.People?.Count ?? 0) +
            (response.Projects?.Count ?? 0) +
            (response.WbsElements?.Count ?? 0) +
            (response.Resumes?.Count ?? 0) +
            (response.Offices?.Count ?? 0) +
            (response.Spaces?.Count ?? 0) +
            (response.Groups?.Count ?? 0) +
            (response.Skills?.Count ?? 0) +
            (response.Certifications?.Count ?? 0) +
            (response.Subcontractors?.Count ?? 0) +
            (response.SubcontractorCompanies?.Count ?? 0);

        return Ok(response);
    }

    private static bool ShouldSearch(string type, HashSet<string> requestedTypes)
    {
        return requestedTypes.Count == 0 || requestedTypes.Contains(type);
    }

    private async Task<List<PersonSearchResult>> SearchPeopleAsync(
        string searchTerm, List<Guid> tenantIds, bool isSystemAdmin, int limit)
    {
        var query = _context.Users
            .Where(u => u.IsActive)
            .Where(u => EF.Functions.ILike(u.DisplayName, $"%{searchTerm}%") ||
                       EF.Functions.ILike(u.Email, $"%{searchTerm}%") ||
                       (u.JobTitle != null && EF.Functions.ILike(u.JobTitle, $"%{searchTerm}%")) ||
                       (u.Department != null && EF.Functions.ILike(u.Department, $"%{searchTerm}%")));

        // Filter by tenant membership unless system admin
        if (!isSystemAdmin)
        {
            query = query.Where(u => u.TenantMemberships.Any(tm => tenantIds.Contains(tm.TenantId) && tm.IsActive));
        }

        return await query
            .OrderBy(u => u.DisplayName)
            .Take(limit)
            .Select(u => new PersonSearchResult
            {
                Id = u.Id,
                DisplayName = u.DisplayName,
                Email = u.Email,
                JobTitle = u.JobTitle,
                Department = u.Department,
                ProfilePhotoUrl = u.ProfilePhotoUrl,
                Url = $"/manager/people/{u.Id}/dashboard"
            })
            .ToListAsync();
    }

    private async Task<List<ProjectSearchResult>> SearchProjectsAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.Projects
            .Where(p => tenantIds.Contains(p.TenantId))
            .Where(p => EF.Functions.ILike(p.Name, $"%{searchTerm}%") ||
                       (p.ProgramCode != null && EF.Functions.ILike(p.ProgramCode, $"%{searchTerm}%")) ||
                       (p.Customer != null && EF.Functions.ILike(p.Customer, $"%{searchTerm}%")))
            .OrderBy(p => p.Name)
            .Take(limit)
            .Select(p => new ProjectSearchResult
            {
                Id = p.Id,
                Name = p.Name,
                ProgramCode = p.ProgramCode,
                Customer = p.Customer,
                Status = p.Status.ToString(),
                Url = $"/admin/staffing/projects/{p.Id}"
            })
            .ToListAsync();
    }

    private async Task<List<WbsSearchResult>> SearchWbsAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.WbsElements
            .Include(w => w.Project)
            .Where(w => tenantIds.Contains(w.TenantId))
            .Where(w => EF.Functions.ILike(w.Code, $"%{searchTerm}%") ||
                       EF.Functions.ILike(w.Description, $"%{searchTerm}%"))
            .OrderBy(w => w.Code)
            .Take(limit)
            .Select(w => new WbsSearchResult
            {
                Id = w.Id,
                Code = w.Code,
                Description = w.Description,
                ProjectName = w.Project.Name,
                Status = w.Status.ToString(),
                Url = $"/admin/data/wbs?search={w.Code}"
            })
            .ToListAsync();
    }

    /// <summary>
    /// Deep search through all resume components including entries, skills, and certifications.
    /// </summary>
    private async Task<List<ResumeSearchResult>> SearchResumesDeepAsync(
        string searchTerm, List<Guid> tenantIds, bool isSystemAdmin, int limit)
    {
        // Get user IDs that match through various resume components
        var matchingUserIds = new HashSet<Guid>();

        // 1. Search ResumeEntry titles, organizations, and descriptions
        var entryMatches = await _context.ResumeEntries
            .Include(e => e.ResumeSection)
            .ThenInclude(s => s.ResumeProfile)
            .Where(e => EF.Functions.ILike(e.Title, $"%{searchTerm}%") ||
                       (e.Organization != null && EF.Functions.ILike(e.Organization, $"%{searchTerm}%")) ||
                       (e.Description != null && EF.Functions.ILike(e.Description, $"%{searchTerm}%")))
            .Select(e => e.ResumeSection.UserId)
            .ToListAsync();

        foreach (var userId in entryMatches)
            matchingUserIds.Add(userId);

        // 2. Search PersonSkills (through Skill name)
        var skillMatches = await _context.PersonSkills
            .Include(ps => ps.Skill)
            .Where(ps => EF.Functions.ILike(ps.Skill.Name, $"%{searchTerm}%"))
            .Select(ps => ps.UserId)
            .ToListAsync();

        foreach (var userId in skillMatches)
            matchingUserIds.Add(userId);

        // 3. Search PersonCertifications (through Certification name and issuer)
        var certMatches = await _context.PersonCertifications
            .Include(pc => pc.Certification)
            .Where(pc => EF.Functions.ILike(pc.Certification.Name, $"%{searchTerm}%") ||
                        (pc.Certification.Issuer != null && EF.Functions.ILike(pc.Certification.Issuer, $"%{searchTerm}%")))
            .Select(pc => pc.UserId)
            .ToListAsync();

        foreach (var userId in certMatches)
            matchingUserIds.Add(userId);

        // 4. Search by user display name or job title
        var userMatches = await _context.Users
            .Where(u => u.IsActive)
            .Where(u => EF.Functions.ILike(u.DisplayName, $"%{searchTerm}%") ||
                       (u.JobTitle != null && EF.Functions.ILike(u.JobTitle, $"%{searchTerm}%")))
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var userId in userMatches)
            matchingUserIds.Add(userId);

        if (!matchingUserIds.Any())
            return new List<ResumeSearchResult>();

        // Get resume profiles for matching users
        var query = _context.ResumeProfiles
            .Include(r => r.User)
            .Include(r => r.Sections)
            .ThenInclude(s => s.Entries)
            .Where(r => matchingUserIds.Contains(r.UserId));

        // Filter by tenant membership unless system admin
        if (!isSystemAdmin)
        {
            query = query.Where(r => r.User.TenantMemberships.Any(tm => tenantIds.Contains(tm.TenantId) && tm.IsActive));
        }

        var resumes = await query
            .OrderBy(r => r.User.DisplayName)
            .Take(limit)
            .ToListAsync();

        var results = new List<ResumeSearchResult>();

        foreach (var resume in resumes)
        {
            // Determine what matched for context
            var matchContext = new List<string>();

            // Check entries
            foreach (var section in resume.Sections)
            {
                foreach (var entry in section.Entries)
                {
                    if (entry.Title.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                        matchContext.Add($"Experience: {entry.Title}");
                    else if (entry.Organization?.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) == true)
                        matchContext.Add($"Organization: {entry.Organization}");
                    else if (entry.Description?.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) == true)
                        matchContext.Add($"Description match");
                }
            }

            // Get skills that matched
            var matchedSkills = await _context.PersonSkills
                .Include(ps => ps.Skill)
                .Where(ps => ps.UserId == resume.UserId && EF.Functions.ILike(ps.Skill.Name, $"%{searchTerm}%"))
                .Select(ps => ps.Skill.Name)
                .ToListAsync();

            foreach (var skill in matchedSkills)
                matchContext.Add($"Skill: {skill}");

            // Get certifications that matched
            var matchedCerts = await _context.PersonCertifications
                .Include(pc => pc.Certification)
                .Where(pc => pc.UserId == resume.UserId &&
                            (EF.Functions.ILike(pc.Certification.Name, $"%{searchTerm}%") ||
                             (pc.Certification.Issuer != null && EF.Functions.ILike(pc.Certification.Issuer, $"%{searchTerm}%"))))
                .Select(pc => pc.Certification.Name)
                .ToListAsync();

            foreach (var cert in matchedCerts)
                matchContext.Add($"Certification: {cert}");

            // Check user name match
            if (resume.User.DisplayName.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                matchContext.Add($"Name: {resume.User.DisplayName}");
            if (resume.User.JobTitle?.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) == true)
                matchContext.Add($"Title: {resume.User.JobTitle}");

            results.Add(new ResumeSearchResult
            {
                Id = resume.Id,
                UserId = resume.UserId,
                UserDisplayName = resume.User.DisplayName,
                UserJobTitle = resume.User.JobTitle,
                UserEmail = resume.User.Email,
                Status = resume.Status.ToString(),
                MatchContext = matchContext.Take(3).ToList(), // Show top 3 matches
                Url = $"/resumes/{resume.Id}"
            });
        }

        return results;
    }

    private async Task<List<OfficeSearchResult>> SearchOfficesAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.Offices
            .Where(o => tenantIds.Contains(o.TenantId))
            .Where(o => EF.Functions.ILike(o.Name, $"%{searchTerm}%") ||
                       (o.City != null && EF.Functions.ILike(o.City, $"%{searchTerm}%")) ||
                       (o.Address != null && EF.Functions.ILike(o.Address, $"%{searchTerm}%")))
            .OrderBy(o => o.Name)
            .Take(limit)
            .Select(o => new OfficeSearchResult
            {
                Id = o.Id,
                Name = o.Name,
                City = o.City,
                StateCode = o.StateCode,
                Status = o.Status.ToString(),
                Url = $"/admin/facilities/office/{o.Id}"
            })
            .ToListAsync();
    }

    private async Task<List<SpaceSearchResult>> SearchSpacesAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.Spaces
            .Include(s => s.Office)
            .Where(s => tenantIds.Contains(s.TenantId))
            .Where(s => EF.Functions.ILike(s.Name, $"%{searchTerm}%") ||
                       EF.Functions.ILike(s.Office.Name, $"%{searchTerm}%"))
            .OrderBy(s => s.Name)
            .Take(limit)
            .Select(s => new SpaceSearchResult
            {
                Id = s.Id,
                Name = s.Name,
                OfficeName = s.Office.Name,
                Type = s.Type.ToString(),
                Capacity = s.Capacity,
                Url = $"/admin/facilities/space/{s.Id}"
            })
            .ToListAsync();
    }

    private async Task<List<GroupSearchResult>> SearchGroupsAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.Groups
            .Where(g => tenantIds.Contains(g.TenantId))
            .Where(g => g.IsActive)
            .Where(g => EF.Functions.ILike(g.Name, $"%{searchTerm}%") ||
                       (g.Description != null && EF.Functions.ILike(g.Description, $"%{searchTerm}%")))
            .OrderBy(g => g.Name)
            .Take(limit)
            .Select(g => new GroupSearchResult
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                MemberCount = g.Members.Count,
                Url = $"/admin/groups?search={g.Name}"
            })
            .ToListAsync();
    }

    private async Task<List<SkillSearchResult>> SearchSkillsAsync(string searchTerm, int limit)
    {
        return await _context.Skills
            .Where(s => s.IsApproved)
            .Where(s => EF.Functions.ILike(s.Name, $"%{searchTerm}%"))
            .OrderBy(s => s.Name)
            .Take(limit)
            .Select(s => new SkillSearchResult
            {
                Id = s.Id,
                Name = s.Name,
                Category = s.Category.ToString(),
                PeopleCount = s.PersonSkills.Count,
                Url = $"/admin/staffing/career-families?skill={s.Name}"
            })
            .ToListAsync();
    }

    private async Task<List<CertificationSearchResult>> SearchCertificationsAsync(string searchTerm, int limit)
    {
        return await _context.Certifications
            .Where(c => EF.Functions.ILike(c.Name, $"%{searchTerm}%") ||
                       (c.Issuer != null && EF.Functions.ILike(c.Issuer, $"%{searchTerm}%")))
            .OrderBy(c => c.Name)
            .Take(limit)
            .Select(c => new CertificationSearchResult
            {
                Id = c.Id,
                Name = c.Name,
                Issuer = c.Issuer,
                PeopleCount = c.PersonCertifications.Count,
                Url = $"/admin/staffing/career-families?cert={c.Name}"
            })
            .ToListAsync();
    }

    private async Task<List<SubcontractorSearchResult>> SearchSubcontractorsAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.Subcontractors
            .Include(s => s.SubcontractorCompany)
            .Where(s => tenantIds.Contains(s.TenantId))
            .Where(s => s.Status == SubcontractorStatus.Active)
            .Where(s => EF.Functions.ILike(s.FirstName + " " + s.LastName, $"%{searchTerm}%") ||
                       (s.Email != null && EF.Functions.ILike(s.Email, $"%{searchTerm}%")) ||
                       (s.PositionTitle != null && EF.Functions.ILike(s.PositionTitle, $"%{searchTerm}%")))
            .OrderBy(s => s.LastName)
            .ThenBy(s => s.FirstName)
            .Take(limit)
            .Select(s => new SubcontractorSearchResult
            {
                Id = s.Id,
                FullName = s.FirstName + " " + s.LastName,
                Email = s.Email,
                PositionTitle = s.PositionTitle,
                CompanyName = s.SubcontractorCompany.Name,
                Url = $"/admin/staffing/subcontractors?search={s.FirstName}+{s.LastName}"
            })
            .ToListAsync();
    }

    private async Task<List<SubcontractorCompanySearchResult>> SearchSubcontractorCompaniesAsync(
        string searchTerm, List<Guid> tenantIds, int limit)
    {
        return await _context.SubcontractorCompanies
            .Where(c => tenantIds.Contains(c.TenantId))
            .Where(c => c.Status == SubcontractorCompanyStatus.Active)
            .Where(c => EF.Functions.ILike(c.Name, $"%{searchTerm}%") ||
                       (c.Code != null && EF.Functions.ILike(c.Code, $"%{searchTerm}%")))
            .OrderBy(c => c.Name)
            .Take(limit)
            .Select(c => new SubcontractorCompanySearchResult
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                City = c.City,
                State = c.State,
                SubcontractorCount = c.Subcontractors.Count(s => s.Status == SubcontractorStatus.Active),
                Url = $"/admin/staffing/subcontractors?company={c.Id}"
            })
            .ToListAsync();
    }
}

#region DTOs

public class SearchResponse
{
    public string Query { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int TotalCount { get; set; }

    public List<PersonSearchResult>? People { get; set; }
    public List<ProjectSearchResult>? Projects { get; set; }
    public List<WbsSearchResult>? WbsElements { get; set; }
    public List<ResumeSearchResult>? Resumes { get; set; }
    public List<OfficeSearchResult>? Offices { get; set; }
    public List<SpaceSearchResult>? Spaces { get; set; }
    public List<GroupSearchResult>? Groups { get; set; }
    public List<SkillSearchResult>? Skills { get; set; }
    public List<CertificationSearchResult>? Certifications { get; set; }
    public List<SubcontractorSearchResult>? Subcontractors { get; set; }
    public List<SubcontractorCompanySearchResult>? SubcontractorCompanies { get; set; }
}

public class PersonSearchResult
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class ProjectSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProgramCode { get; set; }
    public string? Customer { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class WbsSearchResult
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class ResumeSearchResult
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public string? UserJobTitle { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> MatchContext { get; set; } = new();
    public string Url { get; set; } = string.Empty;
}

public class OfficeSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? StateCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class SpaceSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OfficeName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class GroupSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int MemberCount { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class SkillSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int PeopleCount { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class CertificationSearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public int PeopleCount { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class SubcontractorSearchResult
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PositionTitle { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class SubcontractorCompanySearchResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public int SubcontractorCount { get; set; }
    public string Url { get; set; } = string.Empty;
}

#endregion

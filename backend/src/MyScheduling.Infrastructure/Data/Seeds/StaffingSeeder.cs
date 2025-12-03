using MyScheduling.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MyScheduling.Infrastructure.Data.Seeds;

public class StaffingSeeder
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<StaffingSeeder> _logger;
    private readonly Random _random = new();

    public StaffingSeeder(MySchedulingDbContext context, ILogger<StaffingSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        _logger.LogInformation("Starting staffing module seeding...");

        // Get the first tenant (Aleut Federal)
        var tenant = await _context.Tenants.FirstOrDefaultAsync();
        if (tenant == null)
        {
            _logger.LogWarning("No tenant found. Run main seeder first.");
            return;
        }

        // Check if staffing data already exists
        if (await _context.CareerJobFamilies.AnyAsync(c => c.TenantId == tenant.Id))
        {
            _logger.LogInformation("Staffing data already exists. Skipping seed.");
            return;
        }

        var tenantId = tenant.Id;

        // 1. Create Career Job Families
        var careerFamilies = await CreateCareerJobFamiliesAsync(tenantId);
        _logger.LogInformation("Created {Count} career job families", careerFamilies.Count);

        // 2. Create Subcontractor Companies
        var subcompanies = await CreateSubcontractorCompaniesAsync(tenantId);
        _logger.LogInformation("Created {Count} subcontractor companies", subcompanies.Count);

        // 3. Create Subcontractors
        var subcontractors = await CreateSubcontractorsAsync(tenantId, subcompanies, careerFamilies);
        _logger.LogInformation("Created {Count} subcontractors", subcontractors.Count);

        // 4. Get existing projects and create Labor Categories
        var projects = await _context.Projects.Where(p => p.TenantId == tenantId && p.Status == ProjectStatus.Active).ToListAsync();
        var laborCategories = await CreateLaborCategoriesAsync(tenantId, projects);
        _logger.LogInformation("Created {Count} labor categories", laborCategories.Count);

        // 5. Get existing users for assignments
        var users = await _context.Users
            .Where(u => u.TenantMemberships.Any(m => m.TenantId == tenantId && m.IsActive))
            .Take(30)
            .ToListAsync();

        // 6. Create Project Role Assignments
        var roleAssignments = await CreateProjectRoleAssignmentsAsync(tenantId, projects, users, subcontractors, careerFamilies, laborCategories);
        _logger.LogInformation("Created {Count} project role assignments", roleAssignments.Count);

        // 7. Create Forecast Versions
        var versions = await CreateForecastVersionsAsync(tenantId);
        _logger.LogInformation("Created {Count} forecast versions", versions.Count);

        // 8. Create Forecasts
        var forecasts = await CreateForecastsAsync(tenantId, roleAssignments, versions);
        _logger.LogInformation("Created {Count} forecasts", forecasts.Count);

        // 9. Create Forecast Approval Schedule
        await CreateForecastApprovalScheduleAsync(tenantId);

        _logger.LogInformation("Staffing module seeding completed!");
    }

    private async Task<List<CareerJobFamily>> CreateCareerJobFamiliesAsync(Guid tenantId)
    {
        var families = new List<CareerJobFamily>
        {
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Software Engineering", Code = "SWE", Description = "Software development and architecture", SortOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Project Management", Code = "PM", Description = "Project and program management", SortOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Business Analysis", Code = "BA", Description = "Requirements and business analysis", SortOrder = 3, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Quality Assurance", Code = "QA", Description = "Testing and quality assurance", SortOrder = 4, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "DevOps/Cloud", Code = "DEVOPS", Description = "DevOps and cloud infrastructure", SortOrder = 5, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Data Science", Code = "DS", Description = "Data science and analytics", SortOrder = 6, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Cybersecurity", Code = "SEC", Description = "Information security", SortOrder = 7, IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "UX/UI Design", Code = "UX", Description = "User experience and interface design", SortOrder = 8, IsActive = true, CreatedAt = DateTime.UtcNow },
        };

        _context.CareerJobFamilies.AddRange(families);
        await _context.SaveChangesAsync();
        return families;
    }

    private async Task<List<SubcontractorCompany>> CreateSubcontractorCompaniesAsync(Guid tenantId)
    {
        var companies = new List<SubcontractorCompany>
        {
            new()
            {
                Id = Guid.NewGuid(), TenantId = tenantId,
                Name = "TechForce Solutions", Code = "TFS",
                City = "Seattle", State = "WA", Country = "USA",
                Status = SubcontractorCompanyStatus.Active,
                ForecastContactName = "Sarah Chen", ForecastContactEmail = "s.chen@techforce.com",
                ContractNumber = "TFS-2024-001", ContractStartDate = new DateOnly(2024, 1, 1), ContractEndDate = new DateOnly(2026, 12, 31),
                Notes = "Primary software development partner",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(), TenantId = tenantId,
                Name = "CloudNative Consultants", Code = "CNC",
                City = "Portland", State = "OR", Country = "USA",
                Status = SubcontractorCompanyStatus.Active,
                ForecastContactName = "Mike Johnson", ForecastContactEmail = "mjohnson@cloudnative.io",
                ContractNumber = "CNC-2024-002", ContractStartDate = new DateOnly(2024, 3, 1), ContractEndDate = new DateOnly(2025, 12, 31),
                Notes = "Cloud infrastructure specialists",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(), TenantId = tenantId,
                Name = "DataWorks Analytics", Code = "DWA",
                City = "San Francisco", State = "CA", Country = "USA",
                Status = SubcontractorCompanyStatus.Active,
                ForecastContactName = "Lisa Park", ForecastContactEmail = "lpark@dataworks.com",
                ContractNumber = "DWA-2024-003", ContractStartDate = new DateOnly(2024, 6, 1), ContractEndDate = new DateOnly(2026, 5, 31),
                Notes = "Data science and ML experts",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(), TenantId = tenantId,
                Name = "SecureNet Partners", Code = "SNP",
                City = "Denver", State = "CO", Country = "USA",
                Status = SubcontractorCompanyStatus.Active,
                ForecastContactName = "Tom Williams", ForecastContactEmail = "twilliams@securenet.com",
                ContractNumber = "SNP-2024-004", ContractStartDate = new DateOnly(2024, 2, 1), ContractEndDate = new DateOnly(2025, 6, 30),
                Notes = "Cybersecurity consulting",
                CreatedAt = DateTime.UtcNow
            },
        };

        _context.SubcontractorCompanies.AddRange(companies);
        await _context.SaveChangesAsync();
        return companies;
    }

    private async Task<List<Subcontractor>> CreateSubcontractorsAsync(Guid tenantId, List<SubcontractorCompany> companies, List<CareerJobFamily> families)
    {
        var subcontractors = new List<Subcontractor>();
        var names = new[]
        {
            ("Alex", "Rodriguez"), ("Emily", "Watson"), ("Ryan", "Patel"), ("Jessica", "Kim"),
            ("Brandon", "Lee"), ("Amanda", "Chen"), ("Tyler", "Martinez"), ("Nicole", "Thompson"),
            ("Jason", "Garcia"), ("Stephanie", "Wilson"), ("Kevin", "Brown"), ("Rachel", "Davis"),
            ("Chris", "Anderson"), ("Lauren", "Taylor"), ("Derek", "Moore"), ("Megan", "Jackson")
        };

        var titles = new[] { "Senior Developer", "Cloud Architect", "Security Engineer", "Data Scientist", "DevOps Engineer", "QA Lead", "Business Analyst", "UX Designer" };

        for (int i = 0; i < 16; i++)
        {
            var company = companies[i % companies.Count];
            var family = families[i % families.Count];
            var (first, last) = names[i];

            subcontractors.Add(new Subcontractor
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SubcontractorCompanyId = company.Id,
                FirstName = first,
                LastName = last,
                Email = $"{first.ToLower()}.{last.ToLower()}@{company.Code.ToLower()}.com",
                PositionTitle = titles[i % titles.Length],
                CareerJobFamilyId = family.Id,
                CareerLevel = _random.Next(2, 5),
                Status = SubcontractorStatus.Active,
                IsForecastSubmitter = i % 4 == 0,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.Subcontractors.AddRange(subcontractors);
        await _context.SaveChangesAsync();
        return subcontractors;
    }

    private async Task<List<LaborCategory>> CreateLaborCategoriesAsync(Guid tenantId, List<Project> projects)
    {
        var laborCategories = new List<LaborCategory>();
        var lcatData = new[]
        {
            ("Junior Developer", "JDEV", 85m, 65m),
            ("Developer", "DEV", 110m, 85m),
            ("Senior Developer", "SDEV", 145m, 115m),
            ("Lead Developer", "LDEV", 175m, 140m),
            ("Architect", "ARCH", 200m, 165m),
            ("Junior Analyst", "JBA", 75m, 60m),
            ("Analyst", "BA", 95m, 75m),
            ("Senior Analyst", "SBA", 125m, 100m),
            ("Project Manager", "PM", 150m, 120m),
            ("Senior Project Manager", "SPM", 185m, 150m),
            ("QA Engineer", "QA", 90m, 70m),
            ("Senior QA Engineer", "SQA", 120m, 95m),
            ("DevOps Engineer", "DOPS", 130m, 105m),
            ("Cloud Architect", "CLOUD", 190m, 155m),
            ("Security Analyst", "SECA", 140m, 110m),
            ("Data Scientist", "DSCI", 165m, 135m),
        };

        foreach (var project in projects.Take(5))
        {
            foreach (var (name, code, billRate, costRate) in lcatData)
            {
                laborCategories.Add(new LaborCategory
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ProjectId = project.Id,
                    Name = name,
                    Code = $"{project.ProgramCode}-{code}",
                    BillRate = billRate,
                    CostRate = costRate,
                    IsActive = true,
                    SortOrder = laborCategories.Count + 1,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        _context.LaborCategories.AddRange(laborCategories);
        await _context.SaveChangesAsync();
        return laborCategories;
    }

    private async Task<List<ProjectRoleAssignment>> CreateProjectRoleAssignmentsAsync(
        Guid tenantId,
        List<Project> projects,
        List<User> users,
        List<Subcontractor> subcontractors,
        List<CareerJobFamily> families,
        List<LaborCategory> laborCategories)
    {
        var assignments = new List<ProjectRoleAssignment>();
        var wbsElements = await _context.WbsElements
            .Where(w => w.TenantId == tenantId && w.Status == WbsStatus.Active)
            .ToListAsync();

        var positionTitles = new[] { "Software Engineer", "Senior Software Engineer", "Tech Lead", "Architect", "Project Manager", "Business Analyst", "QA Engineer", "DevOps Engineer", "Scrum Master", "Data Analyst" };

        // Create ~100 role assignments across projects
        int userIndex = 0;
        int subIndex = 0;

        foreach (var project in projects.Where(p => p.Status == ProjectStatus.Active).Take(6))
        {
            var projectWbs = wbsElements.Where(w => w.ProjectId == project.Id).ToList();
            var projectLcats = laborCategories.Where(l => l.ProjectId == project.Id).ToList();

            // 10-20 assignments per project
            int assignmentCount = _random.Next(10, 21);
            for (int i = 0; i < assignmentCount; i++)
            {
                var wbs = projectWbs.Any() ? projectWbs[_random.Next(projectWbs.Count)] : null;
                var lcat = projectLcats.Any() ? projectLcats[_random.Next(projectLcats.Count)] : null;
                var family = families[_random.Next(families.Count)];
                var position = positionTitles[_random.Next(positionTitles.Length)];

                var startDate = project.StartDate > DateTime.UtcNow ? DateOnly.FromDateTime(project.StartDate) : DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-_random.Next(0, 6)));
                var endDate = project.EndDate.HasValue ? DateOnly.FromDateTime(project.EndDate.Value) : startDate.AddMonths(_random.Next(6, 18));

                var assignment = new ProjectRoleAssignment
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ProjectId = project.Id,
                    WbsElementId = wbs?.Id,
                    PositionTitle = position,
                    CareerJobFamilyId = family.Id,
                    CareerLevel = _random.Next(1, 6),
                    LaborCategoryId = lcat?.Id,
                    StartDate = startDate,
                    EndDate = endDate,
                    Status = ProjectRoleAssignmentStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                // Assign 70% to employees, 20% to subcontractors, 10% TBD
                var assignType = _random.Next(100);
                if (assignType < 70 && userIndex < users.Count)
                {
                    assignment.UserId = users[userIndex % users.Count].Id;
                    userIndex++;
                }
                else if (assignType < 90 && subIndex < subcontractors.Count)
                {
                    assignment.SubcontractorId = subcontractors[subIndex % subcontractors.Count].Id;
                    subIndex++;
                }
                else
                {
                    assignment.IsTbd = true;
                    assignment.TbdDescription = $"TBD - {position}";
                }

                assignments.Add(assignment);
            }
        }

        _context.ProjectRoleAssignments.AddRange(assignments);
        await _context.SaveChangesAsync();
        return assignments;
    }

    private async Task<List<ForecastVersion>> CreateForecastVersionsAsync(Guid tenantId)
    {
        var now = DateTime.UtcNow;
        var versions = new List<ForecastVersion>
        {
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Current",
                Description = "Primary forecast version for planning",
                Type = ForecastVersionType.Current,
                IsCurrent = true,
                VersionNumber = 1,
                StartYear = now.Year,
                StartMonth = now.Month,
                EndYear = now.Year + 1,
                EndMonth = 12,
                CreatedAt = now
            },
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Q1 2025 What-If: Aggressive Growth",
                Description = "Scenario with 20% headcount increase",
                Type = ForecastVersionType.WhatIf,
                IsCurrent = false,
                VersionNumber = 2,
                StartYear = 2025,
                StartMonth = 1,
                EndYear = 2025,
                EndMonth = 12,
                CreatedAt = now.AddDays(-7)
            },
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Q1 2025 What-If: Conservative",
                Description = "Scenario with flat headcount",
                Type = ForecastVersionType.WhatIf,
                IsCurrent = false,
                VersionNumber = 3,
                StartYear = 2025,
                StartMonth = 1,
                EndYear = 2025,
                EndMonth = 12,
                CreatedAt = now.AddDays(-5)
            },
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "November 2024 Baseline",
                Description = "Historical baseline from November",
                Type = ForecastVersionType.Historical,
                IsCurrent = false,
                VersionNumber = 4,
                StartYear = 2024,
                StartMonth = 11,
                EndYear = 2025,
                EndMonth = 6,
                ArchivedAt = now.AddDays(-3),
                CreatedAt = now.AddDays(-30)
            }
        };

        _context.ForecastVersions.AddRange(versions);
        await _context.SaveChangesAsync();
        return versions;
    }

    private async Task<List<Forecast>> CreateForecastsAsync(Guid tenantId, List<ProjectRoleAssignment> assignments, List<ForecastVersion> versions)
    {
        var forecasts = new List<Forecast>();
        var currentVersion = versions.First(v => v.IsCurrent);
        var now = DateTime.UtcNow;

        // Generate forecasts for 12 months (6 past, current, 5 future)
        var startYear = now.Year;
        var startMonth = now.Month - 6;
        if (startMonth < 1)
        {
            startMonth += 12;
            startYear--;
        }

        foreach (var assignment in assignments)
        {
            var year = startYear;
            var month = startMonth;

            for (int i = 0; i < 12; i++)
            {
                // Base hours between 120-180 per month
                var baseHours = _random.Next(120, 181);

                // Add some variance
                var variance = _random.Next(-20, 21);
                var hours = Math.Max(0, Math.Min(200, baseHours + variance));

                // Determine status based on time
                var forecastDate = new DateTime(year, month, 1);
                ForecastStatus status;
                if (forecastDate < now.AddMonths(-2))
                {
                    status = ForecastStatus.Locked;
                }
                else if (forecastDate < now.AddMonths(-1))
                {
                    status = ForecastStatus.Approved;
                }
                else if (forecastDate < now)
                {
                    status = _random.Next(10) < 7 ? ForecastStatus.Approved : ForecastStatus.Submitted;
                }
                else
                {
                    status = _random.Next(10) < 6 ? ForecastStatus.Draft : ForecastStatus.Submitted;
                }

                forecasts.Add(new Forecast
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ProjectRoleAssignmentId = assignment.Id,
                    ForecastVersionId = currentVersion.Id,
                    Year = year,
                    Month = month,
                    ForecastedHours = hours,
                    RecommendedHours = CalculateWorkingHours(year, month),
                    Status = status,
                    SubmittedAt = status >= ForecastStatus.Submitted ? now.AddDays(-_random.Next(1, 30)) : null,
                    ApprovedAt = status >= ForecastStatus.Approved ? now.AddDays(-_random.Next(1, 15)) : null,
                    CreatedAt = now.AddDays(-_random.Next(30, 60))
                });

                month++;
                if (month > 12)
                {
                    month = 1;
                    year++;
                }
            }
        }

        // Add forecasts in batches to avoid memory issues
        const int batchSize = 500;
        for (int i = 0; i < forecasts.Count; i += batchSize)
        {
            var batch = forecasts.Skip(i).Take(batchSize).ToList();
            _context.Forecasts.AddRange(batch);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Saved forecast batch {Batch}/{Total}", i / batchSize + 1, (forecasts.Count + batchSize - 1) / batchSize);
        }

        return forecasts;
    }

    private async Task CreateForecastApprovalScheduleAsync(Guid tenantId)
    {
        var schedule = new ForecastApprovalSchedule
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Default Schedule",
            IsDefault = true,
            SubmissionDeadlineDay = 25,
            ApprovalDeadlineDay = 28,
            LockDay = 5,
            ForecastMonthsAhead = 3,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.ForecastApprovalSchedules.Add(schedule);
        await _context.SaveChangesAsync();
    }

    private decimal CalculateWorkingHours(int year, int month)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var workingDays = 0;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
            {
                workingDays++;
            }
        }

        return workingDays * 8m;
    }
}

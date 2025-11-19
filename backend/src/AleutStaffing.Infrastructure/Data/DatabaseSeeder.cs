using AleutStaffing.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AleutStaffing.Infrastructure.Data;

public class DatabaseSeeder
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<DatabaseSeeder> _logger;
    private readonly Random _random = new();

    // Test data arrays
    private readonly string[] _firstNames = {
        "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
        "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
        "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Nancy", "Daniel", "Lisa",
        "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley"
    };

    private readonly string[] _lastNames = {
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
        "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"
    };

    private readonly string[] _jobTitles = {
        "Software Engineer", "Senior Software Engineer", "Project Manager", "Business Analyst",
        "DevOps Engineer", "QA Engineer", "Product Owner", "Scrum Master", "Systems Administrator",
        "Network Engineer", "Security Engineer", "Technical Writer", "UX Designer", "UI Designer"
    };

    private readonly string[] _laborCategories = {
        "Engineering", "Management", "Analysis", "Quality Assurance", "Operations", "Administration", "Design"
    };

    private readonly string[] _locations = {
        "Anchorage, AK", "Seattle, WA", "Portland, OR", "San Francisco, CA", "Remote"
    };

    private readonly string[] _projectNames = {
        "Enterprise Resource Planning", "Customer Portal Modernization", "Cloud Migration Initiative",
        "Data Analytics Platform", "Mobile App Development", "API Gateway Implementation",
        "Security Infrastructure Upgrade", "Legacy System Modernization", "Digital Transformation",
        "Business Intelligence Dashboard"
    };

    private readonly string[] _customers = {
        "Department of Defense", "Department of Energy", "Department of Commerce",
        "Department of Interior", "NASA", "Private Sector Client A", "State Government"
    };

    private readonly string[] _roleNames = {
        "Developer", "Senior Developer", "Tech Lead", "Architect", "Project Manager",
        "Business Analyst", "QA Engineer", "DevOps Engineer", "Scrum Master"
    };

    public DatabaseSeeder(AleutStaffingDbContext context, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seeding...");

            // Check if data already exists (check both tenants AND people to ensure complete seeding)
            if (await _context.Tenants.AnyAsync() && await _context.People.AnyAsync())
            {
                _logger.LogInformation("Database already contains data. Skipping seed.");
                return;
            }

            // If we have tenants but no people, we need to clear and re-seed everything
            if (await _context.Tenants.AnyAsync())
            {
                _logger.LogWarning("Found tenants without people. Clearing partial seed data...");
                _context.Tenants.RemoveRange(_context.Tenants);
                await _context.SaveChangesAsync();
            }

            // Create tenants
            var tenants = await CreateTenantsAsync();
            _logger.LogInformation("Created {Count} tenants", tenants.Count);

            // For each tenant, create comprehensive data
            foreach (var tenant in tenants)
            {
                _logger.LogInformation("Seeding data for tenant: {TenantName}", tenant.Name);

                // Create users and people (50 employees per tenant)
                var people = await CreatePeopleAsync(tenant.Id, 50);
                _logger.LogInformation("Created {Count} people for {TenantName}", people.Count, tenant.Name);

                // Create projects
                var projects = await CreateProjectsAsync(tenant.Id);
                _logger.LogInformation("Created {Count} projects for {TenantName}", projects.Count, tenant.Name);

                // Create WBS elements for projects
                var wbsElements = await CreateWbsElementsAsync(projects);
                _logger.LogInformation("Created {Count} WBS elements for {TenantName}", wbsElements.Count, tenant.Name);

                // Create project roles
                var projectRoles = await CreateProjectRolesAsync(wbsElements);
                _logger.LogInformation("Created {Count} project roles for {TenantName}", projectRoles.Count, tenant.Name);

                // Create assignments
                var assignments = await CreateAssignmentsAsync(people, wbsElements, projectRoles);
                _logger.LogInformation("Created {Count} assignments for {TenantName}", assignments.Count, tenant.Name);

                // Create offices and spaces
                var offices = await CreateOfficesAsync(tenant.Id);
                var spaces = await CreateSpacesAsync(offices);
                _logger.LogInformation("Created hoteling infrastructure for {TenantName}", tenant.Name);

                // Create bookings
                var bookings = await CreateBookingsAsync(people, spaces);
                _logger.LogInformation("Created {Count} bookings for {TenantName}", bookings.Count, tenant.Name);
            }

            _logger.LogInformation("Database seeding completed successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while seeding database");
            throw;
        }
    }

    private async Task<List<Tenant>> CreateTenantsAsync()
    {
        var tenants = new List<Tenant>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Aleut Federal",
                Status = TenantStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Partner Organization",
                Status = TenantStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        _context.Tenants.AddRange(tenants);
        await _context.SaveChangesAsync();
        return tenants;
    }

    private async Task<List<Person>> CreatePeopleAsync(Guid tenantId, int count)
    {
        var allPeople = new List<Person>();
        const int batchSize = 10;

        for (int batch = 0; batch < count; batch += batchSize)
        {
            var people = new List<Person>();
            var users = new List<User>();
            var currentBatchSize = Math.Min(batchSize, count - batch);

            for (int i = 0; i < currentBatchSize; i++)
            {
                var firstName = _firstNames[_random.Next(_firstNames.Length)];
                var lastName = _lastNames[_random.Next(_lastNames.Length)];
                var email = $"{firstName.ToLower()}.{lastName.ToLower()}{batch + i}@example.com";

                // Create user first
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Email = email,
                    DisplayName = $"{firstName} {lastName}",
                    EntraObjectId = Guid.NewGuid().ToString(), // Use unique GUID for test data
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                users.Add(user);

                // Create person
                var person = new Person
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = $"{firstName} {lastName}",
                    Email = email,
                    JobTitle = _jobTitles[_random.Next(_jobTitles.Length)],
                    LaborCategory = _laborCategories[_random.Next(_laborCategories.Length)],
                    Location = _locations[_random.Next(_locations.Length)],
                    Status = GetRandomWeightedPersonStatus(),
                    Type = PersonType.Employee,
                    UserId = user.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                people.Add(person);
            }

            _context.Users.AddRange(users);
            _context.People.AddRange(people);
            await _context.SaveChangesAsync();
            allPeople.AddRange(people);

            _logger.LogInformation("Created batch of {Count} people (total: {Total}/{Target})",
                currentBatchSize, allPeople.Count, count);
        }

        return allPeople;
    }

    private PersonStatus GetRandomWeightedPersonStatus()
    {
        var roll = _random.Next(100);
        return roll switch
        {
            < 85 => PersonStatus.Active,      // 85% active
            < 95 => PersonStatus.LOA,         // 10% on leave
            _ => PersonStatus.Inactive         // 5% inactive
        };
    }

    private async Task<List<Project>> CreateProjectsAsync(Guid tenantId)
    {
        var projects = new List<Project>();

        for (int i = 0; i < _projectNames.Length; i++)
        {
            var startDate = DateTime.UtcNow.AddMonths(-_random.Next(1, 24));
            var endDate = _random.Next(10) < 7 ? startDate.AddMonths(_random.Next(6, 36)) : (DateTime?)null;

            projects.Add(new Project
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = _projectNames[i],
                ProgramCode = $"PRG-{_random.Next(1000, 9999)}",
                Customer = _customers[_random.Next(_customers.Length)],
                StartDate = startDate,
                EndDate = endDate,
                Status = GetRandomProjectStatus(startDate, endDate),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        _context.Projects.AddRange(projects);
        await _context.SaveChangesAsync();
        return projects;
    }

    private ProjectStatus GetRandomProjectStatus(DateTime startDate, DateTime? endDate)
    {
        var now = DateTime.UtcNow;
        if (startDate > now) return ProjectStatus.Draft;
        if (endDate.HasValue && endDate.Value < now) return ProjectStatus.Closed;
        return ProjectStatus.Active;
    }

    private async Task<List<WbsElement>> CreateWbsElementsAsync(List<Project> projects)
    {
        var wbsElements = new List<WbsElement>();

        foreach (var project in projects)
        {
            // Each project gets 3-5 WBS elements
            var wbsCount = _random.Next(3, 6);
            for (int i = 0; i < wbsCount; i++)
            {
                var startDate = project.StartDate.AddMonths(_random.Next(0, 3));
                var endDate = project.EndDate?.AddMonths(-_random.Next(0, 3));

                wbsElements.Add(new WbsElement
                {
                    Id = Guid.NewGuid(),
                    TenantId = project.TenantId,
                    ProjectId = project.Id,
                    Code = $"{project.ProgramCode}-WBS{i + 1:D2}",
                    Description = $"Work package {i + 1} for {project.Name}",
                    StartDate = startDate,
                    EndDate = endDate,
                    Status = project.Status == ProjectStatus.Closed ? WbsStatus.Closed : WbsStatus.Active,
                    IsBillable = _random.Next(10) < 8, // 80% billable
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _context.WbsElements.AddRange(wbsElements);
        await _context.SaveChangesAsync();
        return wbsElements;
    }

    private async Task<List<ProjectRole>> CreateProjectRolesAsync(List<WbsElement> wbsElements)
    {
        var roles = new List<ProjectRole>();

        foreach (var wbs in wbsElements)
        {
            // Each WBS gets 2-4 project roles
            var roleCount = _random.Next(2, 5);
            var selectedRoles = _roleNames.OrderBy(_ => _random.Next()).Take(roleCount);

            foreach (var roleName in selectedRoles)
            {
                roles.Add(new ProjectRole
                {
                    Id = Guid.NewGuid(),
                    TenantId = wbs.TenantId,
                    WbsElementId = wbs.Id,
                    Title = roleName,
                    FteRequired = 1.0m,
                    StartDate = wbs.StartDate,
                    EndDate = wbs.EndDate,
                    Status = ProjectRoleStatus.Open,
                    AllowSelfRequest = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _context.ProjectRoles.AddRange(roles);
        await _context.SaveChangesAsync();
        return roles;
    }

    private async Task<List<Assignment>> CreateAssignmentsAsync(
        List<Person> people,
        List<WbsElement> wbsElements,
        List<ProjectRole> projectRoles)
    {
        var assignments = new List<Assignment>();
        var activePeople = people.Where(p => p.Status == PersonStatus.Active).ToList();

        // Create 60-80 assignments
        var assignmentCount = _random.Next(60, 81);
        for (int i = 0; i < assignmentCount; i++)
        {
            var person = activePeople[_random.Next(activePeople.Count)];
            var wbsElement = wbsElements[_random.Next(wbsElements.Count)];
            var projectRole = projectRoles.Where(pr => pr.WbsElementId == wbsElement.Id).OrderBy(_ => _random.Next()).FirstOrDefault();

            if (projectRole == null) continue;

            var startDate = wbsElement.StartDate.AddDays(_random.Next(0, 30));
            var endDate = wbsElement.EndDate?.AddDays(-_random.Next(0, 30)) ?? startDate.AddMonths(6);

            assignments.Add(new Assignment
            {
                Id = Guid.NewGuid(),
                TenantId = person.TenantId,
                PersonId = person.Id,
                WbsElementId = wbsElement.Id,
                ProjectRoleId = projectRole.Id,
                StartDate = startDate,
                EndDate = endDate,
                AllocationPct = _random.Next(25, 101), // 25-100%
                Status = GetRandomAssignmentStatus(startDate, endDate),
                IsPtoOrTraining = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        _context.Assignments.AddRange(assignments);
        await _context.SaveChangesAsync();
        return assignments;
    }

    private AssignmentStatus GetRandomAssignmentStatus(DateTime startDate, DateTime endDate)
    {
        var now = DateTime.UtcNow;
        if (startDate > now) return AssignmentStatus.Draft;
        if (endDate < now) return AssignmentStatus.Completed;
        return _random.Next(10) < 9 ? AssignmentStatus.Active : AssignmentStatus.PendingApproval;
    }

    private async Task<List<Office>> CreateOfficesAsync(Guid tenantId)
    {
        var offices = new List<Office>
        {
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Anchorage HQ",
                Address = "301 Arctic Slope Ave",
                Timezone = "America/Anchorage",
                Status = OfficeStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Seattle Office",
                Address = "1201 3rd Ave",
                Timezone = "America/Los_Angeles",
                Status = OfficeStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        _context.Offices.AddRange(offices);
        await _context.SaveChangesAsync();
        return offices;
    }

    private async Task<List<Space>> CreateSpacesAsync(List<Office> offices)
    {
        var spaces = new List<Space>();

        foreach (var office in offices)
        {
            // Create 20 desks
            for (int i = 1; i <= 20; i++)
            {
                spaces.Add(new Space
                {
                    Id = Guid.NewGuid(),
                    TenantId = office.TenantId,
                    OfficeId = office.Id,
                    Name = $"Desk {i:D3}",
                    Type = SpaceType.Desk,
                    Capacity = 1,
                    Metadata = $"{{\"floor\": {(i - 1) / 10 + 1}, \"zone\": \"{(char)('A' + (i - 1) % 5)}\"}}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            // Create 5 conference rooms
            for (int i = 1; i <= 5; i++)
            {
                spaces.Add(new Space
                {
                    Id = Guid.NewGuid(),
                    TenantId = office.TenantId,
                    OfficeId = office.Id,
                    Name = $"Conference Room {i}",
                    Type = SpaceType.ConferenceRoom,
                    Capacity = _random.Next(4, 13),
                    Metadata = $"{{\"floor\": {i}, \"equipment\": [\"projector\", \"whiteboard\"]}}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _context.Spaces.AddRange(spaces);
        await _context.SaveChangesAsync();
        return spaces;
    }

    private async Task<List<Booking>> CreateBookingsAsync(List<Person> people, List<Space> spaces)
    {
        var bookings = new List<Booking>();
        var activePeople = people.Where(p => p.Status == PersonStatus.Active).ToList();

        // Create bookings for the past 14 days and next 14 days
        for (int dayOffset = -14; dayOffset <= 14; dayOffset++)
        {
            var date = DateTime.UtcNow.Date.AddDays(dayOffset);

            // Random number of bookings per day (15-25)
            var bookingsPerDay = _random.Next(15, 26);
            for (int i = 0; i < bookingsPerDay; i++)
            {
                var person = activePeople[_random.Next(activePeople.Count)];
                var space = spaces[_random.Next(spaces.Count)];

                var startHour = _random.Next(7, 16); // 7 AM to 4 PM
                var duration = space.Type == SpaceType.Desk ? 8 : _random.Next(1, 4); // Desks: full day, Rooms: 1-3 hours

                bookings.Add(new Booking
                {
                    Id = Guid.NewGuid(),
                    TenantId = person.TenantId,
                    SpaceId = space.Id,
                    PersonId = person.Id,
                    StartDatetime = date.AddHours(startHour),
                    EndDatetime = date.AddHours(startHour + duration),
                    Status = GetBookingStatus(dayOffset),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _context.Bookings.AddRange(bookings);
        await _context.SaveChangesAsync();
        return bookings;
    }

    private BookingStatus GetBookingStatus(int dayOffset)
    {
        if (dayOffset < -1) return BookingStatus.Completed; // Past bookings
        if (dayOffset == -1 || dayOffset == 0) return BookingStatus.CheckedIn; // Today/yesterday
        return BookingStatus.Reserved; // Future bookings
    }
}

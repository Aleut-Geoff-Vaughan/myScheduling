using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using System.Security.Claims;
using Xunit;

namespace MyScheduling.Api.Tests.Controllers;

public class ProjectsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<ProjectsController>> _mockLogger;
    private readonly Mock<IAuthorizationService> _mockAuthService;
    private readonly ProjectsController _controller;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _otherTenantId = Guid.NewGuid();

    public ProjectsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MySchedulingDbContext(options);
        _mockLogger = new Mock<ILogger<ProjectsController>>();
        _mockAuthService = new Mock<IAuthorizationService>();

        _controller = new ProjectsController(
            _context,
            _mockLogger.Object,
            _mockAuthService.Object);

        SetupUserContext(_testUserId, _testTenantId);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private void SetupUserContext(Guid userId, Guid tenantId, bool isSystemAdmin = false)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, $"user{userId}@test.com"),
            new Claim("TenantId", tenantId.ToString()),
            new Claim("IsSystemAdmin", isSystemAdmin.ToString())
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId.ToString();

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private Project CreateProject(
        Guid? id = null,
        Guid? tenantId = null,
        string name = "Test Project",
        ProjectStatus status = ProjectStatus.Active,
        bool isDeleted = false)
    {
        return new Project
        {
            Id = id ?? Guid.NewGuid(),
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            ProgramCode = "TST001",
            Status = status,
            StartDate = DateTime.UtcNow,
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow
        };
    }

    #region GetProjects Tests

    [Fact]
    public async Task GetProjects_ReturnsAllProjects()
    {
        // Arrange
        var project1 = CreateProject(name: "Project A");
        var project2 = CreateProject(name: "Project B");
        await _context.Projects.AddRangeAsync(project1, project2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjects();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = okResult.Value.Should().BeAssignableTo<IEnumerable<Project>>().Subject;
        projects.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetProjects_FiltersByTenantId()
    {
        // Arrange
        var project1 = CreateProject(tenantId: _testTenantId, name: "Project A");
        var project2 = CreateProject(tenantId: _otherTenantId, name: "Project B");
        await _context.Projects.AddRangeAsync(project1, project2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjects(tenantId: _testTenantId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = okResult.Value.Should().BeAssignableTo<IEnumerable<Project>>().Subject;
        projects.Should().HaveCount(1);
        projects.First().TenantId.Should().Be(_testTenantId);
    }

    [Fact]
    public async Task GetProjects_FiltersByStatus()
    {
        // Arrange
        var activeProject = CreateProject(status: ProjectStatus.Active, name: "Active");
        var closedProject = CreateProject(status: ProjectStatus.Closed, name: "Closed");
        await _context.Projects.AddRangeAsync(activeProject, closedProject);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjects(status: ProjectStatus.Active);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = okResult.Value.Should().BeAssignableTo<IEnumerable<Project>>().Subject;
        projects.Should().HaveCount(1);
        projects.First().Status.Should().Be(ProjectStatus.Active);
    }

    [Fact]
    public async Task GetProjects_SearchByName()
    {
        // Arrange
        var project1 = CreateProject(name: "Alpha Project");
        var project2 = CreateProject(name: "Beta Project");
        await _context.Projects.AddRangeAsync(project1, project2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjects(search: "Alpha");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = okResult.Value.Should().BeAssignableTo<IEnumerable<Project>>().Subject;
        projects.Should().HaveCount(1);
        projects.First().Name.Should().Be("Alpha Project");
    }

    [Fact]
    public async Task GetProjects_OrdersByName()
    {
        // Arrange
        var projectZ = CreateProject(name: "Zebra Project");
        var projectA = CreateProject(name: "Alpha Project");
        await _context.Projects.AddRangeAsync(projectZ, projectA);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjects();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var projects = okResult.Value.Should().BeAssignableTo<IEnumerable<Project>>().Subject.ToList();
        projects[0].Name.Should().Be("Alpha Project");
        projects[1].Name.Should().Be("Zebra Project");
    }

    #endregion

    #region GetProject Tests

    [Fact]
    public async Task GetProject_ExistingProject_ReturnsProject()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProject(project.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProject = okResult.Value.Should().BeOfType<Project>().Subject;
        returnedProject.Id.Should().Be(project.Id);
    }

    [Fact]
    public async Task GetProject_NonexistentProject_ReturnsNotFound()
    {
        // Act
        var nonExistentId = Guid.NewGuid();
        var result = await _controller.GetProject(nonExistentId);

        // Assert
        var notFound = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeOfType<string>().Which.Should().Contain("not found");
    }

    #endregion

    #region CreateProject Tests

    [Fact]
    public async Task CreateProject_ValidProject_ReturnsCreatedAtAction()
    {
        // Arrange
        var project = CreateProject();

        // Act
        var result = await _controller.CreateProject(project);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var created = createdResult.Value.Should().BeOfType<Project>().Subject;
        created.Name.Should().Be(project.Name);
    }

    [Fact]
    public async Task CreateProject_SavesProjectToDatabase()
    {
        // Arrange
        var project = CreateProject(name: "New Project");

        // Act
        await _controller.CreateProject(project);

        // Assert
        var savedProject = await _context.Projects.FindAsync(project.Id);
        savedProject.Should().NotBeNull();
        savedProject!.Name.Should().Be("New Project");
    }

    #endregion

    #region UpdateProject Tests

    [Fact]
    public async Task UpdateProject_ValidUpdate_ReturnsNoContent()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();
        _context.Entry(project).State = EntityState.Detached;

        project.Name = "Updated Name";

        // Act
        var result = await _controller.UpdateProject(project.Id, project);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task UpdateProject_IdMismatch_ReturnsBadRequest()
    {
        // Arrange
        var project = CreateProject();

        // Act
        var result = await _controller.UpdateProject(Guid.NewGuid(), project);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("ID mismatch");
    }

    [Fact]
    public async Task UpdateProject_NonexistentProject_ReturnsNotFound()
    {
        // Arrange
        var project = CreateProject();
        // Don't add to database

        // Act
        var result = await _controller.UpdateProject(project.Id, project);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region DeleteProject (Soft Delete) Tests

    [Fact]
    public async Task DeleteProject_ExistingProject_ReturnsNoContent()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteProject(project.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteProject_SoftDeletesProject()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        await _controller.DeleteProject(project.Id, reason: "No longer needed");

        // Assert
        var deletedProject = await _context.Projects
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == project.Id);
        deletedProject!.IsDeleted.Should().BeTrue();
        deletedProject.DeletedAt.Should().NotBeNull();
        deletedProject.DeletedByUserId.Should().Be(_testUserId);
        deletedProject.DeletionReason.Should().Be("No longer needed");
    }

    [Fact]
    public async Task DeleteProject_NonexistentProject_ReturnsNotFound()
    {
        // Act
        var result = await _controller.DeleteProject(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region HardDeleteProject Tests

    [Fact]
    public async Task HardDeleteProject_ExistingProject_ReturnsNoContent()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.HardDeleteProject(project.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task HardDeleteProject_RemovesProjectFromDatabase()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        await _controller.HardDeleteProject(project.Id);

        // Assert
        var deletedProject = await _context.Projects
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == project.Id);
        deletedProject.Should().BeNull();
    }

    [Fact]
    public async Task HardDeleteProject_CreatesDataArchive()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        await _controller.HardDeleteProject(project.Id);

        // Assert
        var archive = await _context.DataArchives
            .FirstOrDefaultAsync(a => a.EntityId == project.Id && a.EntityType == "Project");
        archive.Should().NotBeNull();
        archive!.Status.Should().Be(DataArchiveStatus.PermanentlyDeleted);
    }

    [Fact]
    public async Task HardDeleteProject_NonexistentProject_ReturnsNotFound()
    {
        // Act
        var result = await _controller.HardDeleteProject(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region RestoreProject Tests

    [Fact]
    public async Task RestoreProject_SoftDeletedProject_ReturnsOk()
    {
        // Arrange
        var project = CreateProject(isDeleted: true);
        project.DeletedAt = DateTime.UtcNow;
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.RestoreProject(project.Id);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task RestoreProject_RestoresProject()
    {
        // Arrange
        var project = CreateProject(isDeleted: true);
        project.DeletedAt = DateTime.UtcNow;
        project.DeletedByUserId = _testUserId;
        project.DeletionReason = "Test deletion";
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        await _controller.RestoreProject(project.Id);

        // Assert
        var restoredProject = await _context.Projects.FindAsync(project.Id);
        restoredProject!.IsDeleted.Should().BeFalse();
        restoredProject.DeletedAt.Should().BeNull();
        restoredProject.DeletedByUserId.Should().BeNull();
        restoredProject.DeletionReason.Should().BeNull();
    }

    [Fact]
    public async Task RestoreProject_NonDeletedProject_ReturnsNotFound()
    {
        // Arrange
        var project = CreateProject(isDeleted: false);
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.RestoreProject(project.Id);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region UpdateProjectBudget Tests

    [Fact]
    public async Task UpdateProjectBudget_ValidRequest_ReturnsOk()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        var request = new UpdateBudgetRequest { BudgetedHours = 1000 };

        // Act
        var result = await _controller.UpdateProjectBudget(project.Id, request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task UpdateProjectBudget_UpdatesBudget()
    {
        // Arrange
        var project = CreateProject();
        project.BudgetedHours = 500;
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        var request = new UpdateBudgetRequest { BudgetedHours = 1000 };

        // Act
        await _controller.UpdateProjectBudget(project.Id, request);

        // Assert
        var updatedProject = await _context.Projects.FindAsync(project.Id);
        updatedProject!.BudgetedHours.Should().Be(1000);
        updatedProject.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateProjectBudget_NonexistentProject_ReturnsNotFound()
    {
        // Arrange
        var request = new UpdateBudgetRequest { BudgetedHours = 1000 };

        // Act
        var result = await _controller.UpdateProjectBudget(Guid.NewGuid(), request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetProjectWbs Tests

    [Fact]
    public async Task GetProjectWbs_ReturnsWbsElements()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);

        var wbs1 = new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = project.Id,
            Code = "WBS001",
            Description = "WBS 1",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var wbs2 = new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = project.Id,
            Code = "WBS002",
            Description = "WBS 2",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _context.WbsElements.AddRangeAsync(wbs1, wbs2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjectWbs(project.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var wbsElements = okResult.Value.Should().BeAssignableTo<IEnumerable<WbsElement>>().Subject;
        wbsElements.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetProjectWbs_OrdersByCode()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);

        var wbsZ = new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = project.Id,
            Code = "WBS999",
            Description = "WBS Z",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        var wbsA = new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = project.Id,
            Code = "WBS001",
            Description = "WBS A",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _context.WbsElements.AddRangeAsync(wbsZ, wbsA);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjectWbs(project.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var wbsElements = okResult.Value.Should().BeAssignableTo<IEnumerable<WbsElement>>().Subject.ToList();
        wbsElements[0].Code.Should().Be("WBS001");
        wbsElements[1].Code.Should().Be("WBS999");
    }

    [Fact]
    public async Task GetProjectWbs_ReturnsEmptyForNoWbs()
    {
        // Arrange
        var project = CreateProject();
        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetProjectWbs(project.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var wbsElements = okResult.Value.Should().BeAssignableTo<IEnumerable<WbsElement>>().Subject;
        wbsElements.Should().BeEmpty();
    }

    #endregion
}

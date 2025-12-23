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

public class AssignmentRequestsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<AssignmentRequestsController>> _mockLogger;
    private readonly Mock<IWorkflowNotificationService> _mockNotificationService;
    private readonly AssignmentRequestsController _controller;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();
    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _testProjectId = Guid.NewGuid();
    private readonly Guid _testWbsElementId = Guid.NewGuid();
    private readonly Guid _testGroupId = Guid.NewGuid();

    public AssignmentRequestsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MySchedulingDbContext(options);
        _mockLogger = new Mock<ILogger<AssignmentRequestsController>>();
        _mockNotificationService = new Mock<IWorkflowNotificationService>();

        _controller = new AssignmentRequestsController(
            _context,
            _mockLogger.Object,
            _mockNotificationService.Object);

        SetupTestData();
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

    private void SetupTestData()
    {
        // Add users
        var testUser = new User
        {
            Id = _testUserId,
            Email = "testuser@test.com",
            DisplayName = "Test User",
            IsActive = true,
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };

        var otherUser = new User
        {
            Id = _otherUserId,
            Email = "otheruser@test.com",
            DisplayName = "Other User",
            IsActive = true,
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(testUser, otherUser);

        // Add tenant membership
        var membership = new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            TenantId = _testTenantId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.TenantMemberships.Add(membership);

        // Add project
        var project = new Project
        {
            Id = _testProjectId,
            TenantId = _testTenantId,
            Name = "Test Project",
            ProgramCode = "TST001",
            Status = ProjectStatus.Active,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);

        // Add WBS Element
        var wbsElement = new WbsElement
        {
            Id = _testWbsElementId,
            TenantId = _testTenantId,
            ProjectId = _testProjectId,
            Description = "Test WBS",
            Code = "WBS001",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.WbsElements.Add(wbsElement);

        // Add approver group
        var group = new Group
        {
            Id = _testGroupId,
            TenantId = _testTenantId,
            Name = "System Administrators",
            Description = "Admin group",
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);

        _context.SaveChanges();
    }

    private AssignmentRequest CreateAssignmentRequest(
        Guid? id = null,
        Guid? tenantId = null,
        AssignmentRequestStatus status = AssignmentRequestStatus.Pending,
        Guid? requestedByUserId = null,
        Guid? requestedForUserId = null)
    {
        return new AssignmentRequest
        {
            Id = id ?? Guid.NewGuid(),
            TenantId = tenantId ?? _testTenantId,
            RequestedByUserId = requestedByUserId ?? _testUserId,
            RequestedForUserId = requestedForUserId ?? _testUserId,
            ProjectId = _testProjectId,
            WbsElementId = _testWbsElementId,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3),
            AllocationPct = 100,
            Status = status,
            ApproverGroupId = _testGroupId,
            CreatedAt = DateTime.UtcNow
        };
    }

    #region GetAll Tests

    [Fact]
    public async Task GetAll_ReturnsAllRequests()
    {
        // Arrange
        var request1 = CreateAssignmentRequest();
        var request2 = CreateAssignmentRequest();
        await _context.AssignmentRequests.AddRangeAsync(request1, request2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var requests = okResult.Value.Should().BeAssignableTo<IEnumerable<AssignmentRequest>>().Subject;
        requests.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAll_FiltersByTenantId()
    {
        // Arrange
        var otherTenantId = Guid.NewGuid();
        var request1 = CreateAssignmentRequest(tenantId: _testTenantId);
        var request2 = CreateAssignmentRequest(tenantId: otherTenantId);
        await _context.AssignmentRequests.AddRangeAsync(request1, request2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll(tenantId: _testTenantId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var requests = okResult.Value.Should().BeAssignableTo<IEnumerable<AssignmentRequest>>().Subject;
        requests.Should().HaveCount(1);
        requests.First().TenantId.Should().Be(_testTenantId);
    }

    [Fact]
    public async Task GetAll_FiltersByStatus()
    {
        // Arrange
        var pendingRequest = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        var approvedRequest = CreateAssignmentRequest(status: AssignmentRequestStatus.Approved);
        await _context.AssignmentRequests.AddRangeAsync(pendingRequest, approvedRequest);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll(status: AssignmentRequestStatus.Pending);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var requests = okResult.Value.Should().BeAssignableTo<IEnumerable<AssignmentRequest>>().Subject;
        requests.Should().HaveCount(1);
        requests.First().Status.Should().Be(AssignmentRequestStatus.Pending);
    }

    [Fact]
    public async Task GetAll_FiltersByForUserId()
    {
        // Arrange
        // The filter includes both RequestedForUserId AND RequestedByUserId
        var requestForTestUser = CreateAssignmentRequest(requestedForUserId: _testUserId, requestedByUserId: _testUserId);
        var requestForOtherUser = CreateAssignmentRequest(requestedForUserId: _otherUserId, requestedByUserId: _otherUserId);
        await _context.AssignmentRequests.AddRangeAsync(requestForTestUser, requestForOtherUser);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll(forUserId: _testUserId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var requests = okResult.Value.Should().BeAssignableTo<IEnumerable<AssignmentRequest>>().Subject;
        // forUserId filter matches both RequestedForUserId OR RequestedByUserId
        requests.Should().HaveCount(1);
        requests.All(r => r.RequestedForUserId == _testUserId || r.RequestedByUserId == _testUserId).Should().BeTrue();
    }

    [Fact]
    public async Task GetAll_FiltersByApproverGroupId()
    {
        // Arrange
        var otherGroupId = Guid.NewGuid();
        var group = new Group
        {
            Id = otherGroupId,
            TenantId = _testTenantId,
            Name = "Other Group",
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };
        await _context.Groups.AddAsync(group);

        var requestWithGroup = CreateAssignmentRequest();
        requestWithGroup.ApproverGroupId = _testGroupId;
        var requestWithOtherGroup = CreateAssignmentRequest();
        requestWithOtherGroup.ApproverGroupId = otherGroupId;
        await _context.AssignmentRequests.AddRangeAsync(requestWithGroup, requestWithOtherGroup);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll(approverGroupId: _testGroupId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var requests = okResult.Value.Should().BeAssignableTo<IEnumerable<AssignmentRequest>>().Subject;
        requests.Should().HaveCount(1);
        requests.First().ApproverGroupId.Should().Be(_testGroupId);
    }

    #endregion

    #region Get Tests

    [Fact]
    public async Task Get_ExistingRequest_ReturnsRequest()
    {
        // Arrange
        var request = CreateAssignmentRequest();
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Get(request.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedRequest = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        returnedRequest.Id.Should().Be(request.Id);
    }

    [Fact]
    public async Task Get_NonexistentRequest_ReturnsNotFound()
    {
        // Act
        var result = await _controller.Get(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    #endregion

    #region Create Tests

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            WbsElementId = _testWbsElementId,
            TenantId = _testTenantId,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3),
            AllocationPct = 100,
            Notes = "Test request"
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var created = createdResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        created.ProjectId.Should().Be(_testProjectId);
        created.Status.Should().Be(AssignmentRequestStatus.Pending);
    }

    [Fact]
    public async Task Create_MissingProjectId_ReturnsBadRequest()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = Guid.Empty,
            TenantId = _testTenantId
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("ProjectId is required.");
    }

    [Fact]
    public async Task Create_InvalidDateRange_ReturnsBadRequest()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            TenantId = _testTenantId,
            StartDate = DateTime.UtcNow.AddMonths(3),
            EndDate = DateTime.UtcNow // EndDate before StartDate
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("StartDate cannot be after EndDate.");
    }

    [Fact]
    public async Task Create_InvalidWbsElement_ReturnsBadRequest()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            WbsElementId = Guid.NewGuid(), // Non-existent WBS
            TenantId = _testTenantId
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("WBS element must belong to the project and tenant.");
    }

    [Fact]
    public async Task Create_InvalidApproverGroup_ReturnsBadRequest()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            TenantId = _testTenantId,
            ApproverGroupId = Guid.NewGuid() // Non-existent group
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("Approver group is invalid for this tenant.");
    }

    [Fact]
    public async Task Create_DefaultsToSystemAdminGroup()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            TenantId = _testTenantId,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3)
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var created = createdResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        created.ApproverGroupId.Should().Be(_testGroupId); // System Administrators group
    }

    [Fact]
    public async Task Create_AllocationCappedAt200()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            TenantId = _testTenantId,
            AllocationPct = 300 // Over 200%
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var created = createdResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        created.AllocationPct.Should().Be(200);
    }

    [Fact]
    public async Task Create_ZeroAllocationDefaultsTo100()
    {
        // Arrange
        var dto = new CreateAssignmentRequestDto
        {
            ProjectId = _testProjectId,
            TenantId = _testTenantId,
            AllocationPct = 0
        };

        // Act
        var result = await _controller.Create(dto);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var created = createdResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        created.AllocationPct.Should().Be(100);
    }

    #endregion

    #region Approve Tests

    [Fact]
    public async Task Approve_PendingRequest_ReturnsOk()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new ApproveAssignmentRequestDto { CreateAssignment = false };

        // Act
        var result = await _controller.Approve(request.Id, dto);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var approved = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        approved.Status.Should().Be(AssignmentRequestStatus.Approved);
        approved.ApprovedByUserId.Should().Be(_testUserId);
        approved.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Approve_NonexistentRequest_ReturnsNotFound()
    {
        // Arrange
        var dto = new ApproveAssignmentRequestDto();

        // Act
        var result = await _controller.Approve(Guid.NewGuid(), dto);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Approve_AlreadyResolvedRequest_ReturnsBadRequest()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Approved);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new ApproveAssignmentRequestDto();

        // Act
        var result = await _controller.Approve(request.Id, dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("Request is already resolved.");
    }

    [Fact]
    public async Task Approve_WithCreateAssignment_CreatesAssignment()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new ApproveAssignmentRequestDto { CreateAssignment = true };

        // Act
        var result = await _controller.Approve(request.Id, dto);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var approved = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        approved.AssignmentId.Should().NotBeNull();

        // Verify assignment was created
        var assignment = await _context.Assignments.FindAsync(approved.AssignmentId);
        assignment.Should().NotBeNull();
        assignment!.WbsElementId.Should().Be(_testWbsElementId);
    }

    [Fact]
    public async Task Approve_WithCustomAllocation_UsesProvidedAllocation()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        request.AllocationPct = 50;
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new ApproveAssignmentRequestDto { CreateAssignment = true, AllocationPct = 75 };

        // Act
        var result = await _controller.Approve(request.Id, dto);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var approved = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;

        var assignment = await _context.Assignments.FindAsync(approved.AssignmentId);
        assignment!.AllocationPct.Should().Be(75);
    }

    #endregion

    #region Reject Tests

    [Fact]
    public async Task Reject_PendingRequest_ReturnsOk()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new RejectRequestDto { Reason = "Not enough budget" };

        // Act
        var result = await _controller.Reject(request.Id, dto);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var rejected = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        rejected.Status.Should().Be(AssignmentRequestStatus.Rejected);
        rejected.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Reject_NonexistentRequest_ReturnsNotFound()
    {
        // Arrange
        var dto = new RejectRequestDto();

        // Act
        var result = await _controller.Reject(Guid.NewGuid(), dto);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Reject_AlreadyResolvedRequest_ReturnsBadRequest()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Rejected);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new RejectRequestDto();

        // Act
        var result = await _controller.Reject(request.Id, dto);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().Be("Request is already resolved.");
    }

    [Fact]
    public async Task Reject_WithReason_AppendsReasonToNotes()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        request.Notes = "Original notes";
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new RejectRequestDto { Reason = "Budget constraints" };

        // Act
        var result = await _controller.Reject(request.Id, dto);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var rejected = okResult.Value.Should().BeOfType<AssignmentRequest>().Subject;
        rejected.Notes.Should().Contain("Original notes");
        rejected.Notes.Should().Contain("Budget constraints");
    }

    [Fact]
    public async Task Reject_CreatesAssignmentHistory()
    {
        // Arrange
        var request = CreateAssignmentRequest(status: AssignmentRequestStatus.Pending);
        await _context.AssignmentRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        var dto = new RejectRequestDto { Reason = "Rejected for testing" };

        // Act
        await _controller.Reject(request.Id, dto);

        // Assert
        var history = await _context.AssignmentHistory.FirstOrDefaultAsync(h => h.ChangeReason == "Assignment request rejected");
        history.Should().NotBeNull();
        history!.Status.Should().Be(AssignmentStatus.Rejected);
    }

    #endregion
}

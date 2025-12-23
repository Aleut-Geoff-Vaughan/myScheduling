using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Services;
using Xunit;

namespace MyScheduling.Infrastructure.Tests.Services;

public class WorkflowNotificationServiceTests
{
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<ILogger<WorkflowNotificationService>> _mockLogger;
    private readonly WorkflowNotificationService _service;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _testProjectId = Guid.NewGuid();

    public WorkflowNotificationServiceTests()
    {
        _mockEmailService = new Mock<IEmailService>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockLogger = new Mock<ILogger<WorkflowNotificationService>>();

        // Setup configuration
        _mockConfiguration.Setup(c => c["App:Name"]).Returns("TestApp");
        _mockConfiguration.Setup(c => c["App:Url"]).Returns("https://test.myscheduling.com");

        // Default email service to return success
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .ReturnsAsync(EmailResult.Succeeded());

        _service = new WorkflowNotificationService(
            _mockEmailService.Object,
            _mockConfiguration.Object,
            _mockLogger.Object);
    }

    private User CreateUser(Guid? id = null, string? email = "user@test.com", string? displayName = null)
    {
        return new User
        {
            Id = id ?? Guid.NewGuid(),
            Email = email, // Allow null to be explicitly passed
            DisplayName = displayName ?? "Test User",
            IsActive = true,
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };
    }

    private AssignmentRequest CreateAssignmentRequest(User? requestedForUser = null, WbsElement? wbsElement = null)
    {
        var project = new Project
        {
            Id = _testProjectId,
            TenantId = _testTenantId,
            Name = "Test Project",
            StartDate = DateTime.UtcNow,
            Status = ProjectStatus.Active
        };

        var wbs = wbsElement ?? new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = _testProjectId,
            Code = "WBS001",
            Description = "Test WBS",
            Status = WbsStatus.Active,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            Project = project
        };

        return new AssignmentRequest
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            RequestedByUserId = _testUserId,
            RequestedForUserId = requestedForUser?.Id ?? _testUserId,
            ProjectId = _testProjectId,
            WbsElementId = wbs.Id,
            WbsElement = wbs,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3),
            AllocationPct = 100,
            Status = AssignmentRequestStatus.Pending,
            Notes = "Test notes"
        };
    }

    private WbsElement CreateWbsElement()
    {
        var project = new Project
        {
            Id = _testProjectId,
            TenantId = _testTenantId,
            Name = "Test Project",
            StartDate = DateTime.UtcNow,
            Status = ProjectStatus.Active
        };

        return new WbsElement
        {
            Id = Guid.NewGuid(),
            TenantId = _testTenantId,
            ProjectId = _testProjectId,
            Code = "WBS001",
            Description = "Test WBS Description",
            Status = WbsStatus.Active,
            Type = WbsType.Billable,
            ValidFrom = DateTime.UtcNow,
            StartDate = DateTime.UtcNow,
            Project = project
        };
    }

    #region SendAssignmentRequestCreatedAsync Tests

    [Fact]
    public async Task SendAssignmentRequestCreatedAsync_SendsEmailToAllApprovers()
    {
        // Arrange
        var requester = CreateUser(email: "requester@test.com", displayName: "Requester");
        var requestedFor = CreateUser(email: "requestedfor@test.com", displayName: "RequestedFor");
        var approver1 = CreateUser(email: "approver1@test.com", displayName: "Approver 1");
        var approver2 = CreateUser(email: "approver2@test.com", displayName: "Approver 2");
        var request = CreateAssignmentRequest();

        // Act
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approver1, approver2 });

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "approver1@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "approver2@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendAssignmentRequestCreatedAsync_SkipsApproversWithoutEmail()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = CreateUser();
        var approverWithEmail = CreateUser(email: "approver@test.com");
        var approverWithoutEmail = CreateUser(email: null);
        var request = CreateAssignmentRequest();

        // Act
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approverWithEmail, approverWithoutEmail });

        // Assert - only one email sent
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendAssignmentRequestCreatedAsync_IncludesProjectAndWbsInfo()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = CreateUser();
        var approver = CreateUser(email: "approver@test.com");
        var request = CreateAssignmentRequest();

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approver });

        // Assert
        capturedBody.Should().Contain("Test Project");
        capturedBody.Should().Contain("WBS001");
        capturedBody.Should().Contain("100%");
    }

    [Fact]
    public async Task SendAssignmentRequestCreatedAsync_ContinuesOnEmailFailure()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = CreateUser();
        var approver1 = CreateUser(email: "approver1@test.com");
        var approver2 = CreateUser(email: "approver2@test.com");
        var request = CreateAssignmentRequest();

        var callCount = 0;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) =>
            {
                callCount++;
                if (callCount == 1) throw new Exception("Email service error");
            })
            .ReturnsAsync(EmailResult.Succeeded());

        // Act - should not throw
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approver1, approver2 });

        // Assert - both emails attempted
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Exactly(2));
    }

    #endregion

    #region SendAssignmentRequestApprovedAsync Tests

    [Fact]
    public async Task SendAssignmentRequestApprovedAsync_SendsToRequesterAndRequestedFor()
    {
        // Arrange
        var requester = CreateUser(id: Guid.NewGuid(), email: "requester@test.com");
        var requestedFor = CreateUser(id: Guid.NewGuid(), email: "requestedfor@test.com");
        var approver = CreateUser();
        var request = CreateAssignmentRequest(requestedForUser: requestedFor);

        // Act
        await _service.SendAssignmentRequestApprovedAsync(request, approver, requester, requestedFor);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "requester@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "requestedfor@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendAssignmentRequestApprovedAsync_SendsOnceIfSameUser()
    {
        // Arrange
        var sameUserId = Guid.NewGuid();
        var requester = CreateUser(id: sameUserId, email: "user@test.com");
        var requestedFor = requester; // Same user
        var approver = CreateUser();
        var request = CreateAssignmentRequest();

        // Act
        await _service.SendAssignmentRequestApprovedAsync(request, approver, requester, requestedFor);

        // Assert - only one email
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendAssignmentRequestApprovedAsync_IncludesApprovalSubject()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = requester;
        var approver = CreateUser();
        var request = CreateAssignmentRequest();

        string capturedSubject = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedSubject = subject)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendAssignmentRequestApprovedAsync(request, approver, requester, requestedFor);

        // Assert
        capturedSubject.Should().Contain("Approved");
    }

    #endregion

    #region SendAssignmentRequestRejectedAsync Tests

    [Fact]
    public async Task SendAssignmentRequestRejectedAsync_IncludesReason()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = requester;
        var approver = CreateUser();
        var request = CreateAssignmentRequest();
        var reason = "Budget constraints";

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendAssignmentRequestRejectedAsync(request, approver, requester, requestedFor, reason);

        // Assert
        capturedBody.Should().Contain("Budget constraints");
    }

    [Fact]
    public async Task SendAssignmentRequestRejectedAsync_WorksWithNullReason()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = requester;
        var approver = CreateUser();
        var request = CreateAssignmentRequest();

        // Act - should not throw
        await _service.SendAssignmentRequestRejectedAsync(request, approver, requester, requestedFor, null);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    #endregion

    #region WBS Workflow Notifications Tests

    [Fact]
    public async Task SendWbsSubmittedForApprovalAsync_SendsEmailToApprover()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var submitter = CreateUser(displayName: "Submitter");
        var approver = CreateUser(email: "approver@test.com", displayName: "Approver");

        // Act
        await _service.SendWbsSubmittedForApprovalAsync(wbs, submitter, approver);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "approver@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendWbsSubmittedForApprovalAsync_SkipsIfApproverHasNoEmail()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var submitter = CreateUser();
        var approver = CreateUser(email: null);

        // Act
        await _service.SendWbsSubmittedForApprovalAsync(wbs, submitter, approver);

        // Assert - no email sent
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task SendWbsSubmittedForApprovalAsync_IncludesWbsDetails()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var submitter = CreateUser();
        var approver = CreateUser(email: "approver@test.com");

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendWbsSubmittedForApprovalAsync(wbs, submitter, approver);

        // Assert
        capturedBody.Should().Contain("WBS001");
        capturedBody.Should().Contain("Test WBS Description");
        capturedBody.Should().Contain("Test Project");
    }

    [Fact]
    public async Task SendWbsApprovedAsync_SendsEmailToCreator()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var approver = CreateUser();
        var creator = CreateUser(email: "creator@test.com");

        // Act
        await _service.SendWbsApprovedAsync(wbs, approver, creator);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            "creator@test.com",
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task SendWbsApprovedAsync_SkipsIfCreatorHasNoEmail()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var approver = CreateUser();
        var creator = CreateUser(email: null);

        // Act
        await _service.SendWbsApprovedAsync(wbs, approver, creator);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task SendWbsRejectedAsync_IncludesReason()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var approver = CreateUser();
        var creator = CreateUser(email: "creator@test.com");
        var reason = "Missing documentation";

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendWbsRejectedAsync(wbs, approver, creator, reason);

        // Assert
        capturedBody.Should().Contain("Missing documentation");
        capturedBody.Should().Contain("Rejected");
    }

    [Fact]
    public async Task SendWbsSuspendedAsync_SendsNotification()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var suspendedBy = CreateUser();
        var creator = CreateUser(email: "creator@test.com");
        var reason = "Funding suspended";

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendWbsSuspendedAsync(wbs, suspendedBy, creator, reason);

        // Assert
        capturedBody.Should().Contain("Suspended");
        capturedBody.Should().Contain("Funding suspended");
    }

    [Fact]
    public async Task SendWbsSuspendedAsync_WorksWithNullReason()
    {
        // Arrange
        var wbs = CreateWbsElement();
        var suspendedBy = CreateUser();
        var creator = CreateUser(email: "creator@test.com");

        // Act - should not throw
        await _service.SendWbsSuspendedAsync(wbs, suspendedBy, creator, null);

        // Assert
        _mockEmailService.Verify(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()), Times.Once);
    }

    #endregion

    #region Email Template Tests

    [Fact]
    public async Task EmailBody_ContainsActionButton()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = requester;
        var approver = CreateUser(email: "approver@test.com");
        var request = CreateAssignmentRequest();

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approver });

        // Assert
        capturedBody.Should().Contain("Review Request"); // Action button text
        capturedBody.Should().Contain("https://test.myscheduling.com"); // App URL
    }

    [Fact]
    public async Task EmailBody_ContainsAppNameAndFooter()
    {
        // Arrange
        var requester = CreateUser();
        var requestedFor = requester;
        var approver = CreateUser(email: "approver@test.com");
        var request = CreateAssignmentRequest();

        string capturedBody = null!;
        _mockEmailService.Setup(s => s.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string?>()))
            .Callback<string, string, string, string?>((to, subject, body, plain) => capturedBody = body)
            .ReturnsAsync(EmailResult.Succeeded());

        // Act
        await _service.SendAssignmentRequestCreatedAsync(request, requester, requestedFor, new[] { approver });

        // Assert
        capturedBody.Should().Contain("TestApp"); // Configured app name
        capturedBody.Should().Contain("automated notification");
    }

    #endregion
}

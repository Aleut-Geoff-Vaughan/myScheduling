using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using System.Security.Claims;

namespace MyScheduling.Api.Tests.Controllers;

/// <summary>
/// Tests for ImpersonationController - admin user impersonation functionality
/// </summary>
public class ImpersonationControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<IImpersonationService> _impersonationServiceMock;
    private readonly Mock<ILogger<ImpersonationController>> _loggerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _targetUserId = Guid.NewGuid();
    private readonly Guid _tenantId = Guid.NewGuid();

    public ImpersonationControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"ImpersonationTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _impersonationServiceMock = new Mock<IImpersonationService>();
        _loggerMock = new Mock<ILogger<ImpersonationController>>();
        _configurationMock = new Mock<IConfiguration>();

        // Setup configuration
        _configurationMock.Setup(c => c["Jwt:Key"]).Returns("MyScheduling-Test-Secret-Key-For-Unit-Testing-Only-2024-Very-Long");
        _configurationMock.Setup(c => c["Jwt:Issuer"]).Returns("MyScheduling");
        _configurationMock.Setup(c => c["Jwt:Audience"]).Returns("MyScheduling");
        _configurationMock.Setup(c => c["Jwt:ExpirationHours"]).Returns("8");

        SetupTestData();
    }

    private void SetupTestData()
    {
        // Create tenant
        var tenant = new Tenant { Id = _tenantId, Name = "Test Tenant", Status = TenantStatus.Active };
        _context.Tenants.Add(tenant);

        // Create admin user
        var adminUser = new User
        {
            Id = _adminUserId,
            Email = "admin@test.com",
            DisplayName = "Admin User",
            EntraObjectId = $"local-{_adminUserId}",
            IsActive = true,
            IsSystemAdmin = true
        };
        _context.Users.Add(adminUser);

        // Create target user to be impersonated
        var targetUser = new User
        {
            Id = _targetUserId,
            Email = "target@test.com",
            DisplayName = "Target User",
            EntraObjectId = $"local-{_targetUserId}",
            IsActive = true,
            IsSystemAdmin = false
        };
        _context.Users.Add(targetUser);

        // Create tenant memberships
        _context.TenantMemberships.AddRange(
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _adminUserId,
                TenantId = _tenantId,
                Roles = new List<AppRole> { AppRole.TenantAdmin },
                IsActive = true
            },
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _targetUserId,
                TenantId = _tenantId,
                Roles = new List<AppRole> { AppRole.Employee },
                IsActive = true
            }
        );

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private ImpersonationController CreateController(Guid? userId = null, Guid? impersonationSessionId = null)
    {
        var controller = new ImpersonationController(
            _impersonationServiceMock.Object,
            _context,
            _loggerMock.Object,
            _configurationMock.Object
        );

        // Setup HttpContext with claims
        var claims = new List<Claim>();

        if (userId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.Email, "admin@test.com"));
        }

        if (impersonationSessionId.HasValue)
        {
            claims.Add(new Claim("IsImpersonating", "true"));
            claims.Add(new Claim("ImpersonationSessionId", impersonationSessionId.Value.ToString()));
            claims.Add(new Claim("OriginalUserId", _adminUserId.ToString()));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = principal
        };

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    #region StartImpersonation Tests

    [Fact]
    public async Task StartImpersonation_WithValidRequest_ReturnsSuccessWithToken()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var sessionId = Guid.NewGuid();
        var session = new ImpersonationSession
        {
            Id = sessionId,
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow,
            Reason = "Testing user issue",
            CreatedAt = DateTime.UtcNow
        };

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, _targetUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Allowed());

        _impersonationServiceMock
            .Setup(s => s.StartImpersonationAsync(_adminUserId, _targetUserId, It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ReturnsAsync(ImpersonationResult.Succeeded(session));

        var request = new StartImpersonationRequest
        {
            TargetUserId = _targetUserId,
            Reason = "Testing user issue"
        };

        // Act
        var result = await controller.StartImpersonation(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImpersonationResponse>().Subject;
        response.Success.Should().BeTrue();
        response.SessionId.Should().Be(sessionId);
        response.Token.Should().NotBeNullOrEmpty();
        response.ImpersonatedUser.UserId.Should().Be(_targetUserId);
    }

    [Fact]
    public async Task StartImpersonation_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateController(null); // No user ID in claims

        var request = new StartImpersonationRequest
        {
            TargetUserId = _targetUserId,
            Reason = "Testing user issue"
        };

        // Act
        var result = await controller.StartImpersonation(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task StartImpersonation_WhenNotEligible_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, _targetUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Denied("Cannot impersonate other system administrators."));

        var request = new StartImpersonationRequest
        {
            TargetUserId = _targetUserId,
            Reason = "Testing user issue"
        };

        // Act
        var result = await controller.StartImpersonation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task StartImpersonation_WhenServiceFails_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, _targetUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Allowed());

        _impersonationServiceMock
            .Setup(s => s.StartImpersonationAsync(_adminUserId, _targetUserId, It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ReturnsAsync(ImpersonationResult.Failed("Session creation failed"));

        var request = new StartImpersonationRequest
        {
            TargetUserId = _targetUserId,
            Reason = "Testing user issue"
        };

        // Act
        var result = await controller.StartImpersonation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task StartImpersonation_WithNonexistentTargetUser_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var nonexistentUserId = Guid.NewGuid();
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = nonexistentUserId,
            StartedAt = DateTime.UtcNow,
            Reason = "Testing user issue",
            CreatedAt = DateTime.UtcNow
        };

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, nonexistentUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Allowed());

        _impersonationServiceMock
            .Setup(s => s.StartImpersonationAsync(_adminUserId, nonexistentUserId, It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ReturnsAsync(ImpersonationResult.Succeeded(session));

        var request = new StartImpersonationRequest
        {
            TargetUserId = nonexistentUserId,
            Reason = "Testing user issue"
        };

        // Act
        var result = await controller.StartImpersonation(request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region EndImpersonation Tests

    [Fact]
    public async Task EndImpersonation_WithValidSession_ReturnsSuccessWithAdminToken()
    {
        // Arrange
        var sessionId = Guid.NewGuid();
        var controller = CreateController(_targetUserId, sessionId);
        var session = new ImpersonationSession
        {
            Id = sessionId,
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            EndedAt = DateTime.UtcNow,
            EndReason = ImpersonationEndReason.Manual,
            Reason = "Testing",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };

        _impersonationServiceMock
            .Setup(s => s.EndImpersonationAsync(sessionId, ImpersonationEndReason.Manual))
            .ReturnsAsync(ImpersonationResult.Succeeded(session));

        // Act
        var result = await controller.EndImpersonation();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<EndImpersonationResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Token.Should().NotBeNullOrEmpty();
        response.User.UserId.Should().Be(_adminUserId);
    }

    [Fact]
    public async Task EndImpersonation_WithoutActiveSession_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId); // No impersonation session in claims

        // Act
        var result = await controller.EndImpersonation();

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EndImpersonation_WhenServiceFails_ReturnsBadRequest()
    {
        // Arrange
        var sessionId = Guid.NewGuid();
        var controller = CreateController(_targetUserId, sessionId);

        _impersonationServiceMock
            .Setup(s => s.EndImpersonationAsync(sessionId, ImpersonationEndReason.Manual))
            .ReturnsAsync(ImpersonationResult.Failed("Session already ended"));

        // Act
        var result = await controller.EndImpersonation();

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region CanImpersonate Tests

    [Fact]
    public async Task CanImpersonate_WhenAllowed_ReturnsTrue()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, _targetUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Allowed());

        // Act
        var result = await controller.CanImpersonate(_targetUserId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CanImpersonateResponse>().Subject;
        response.CanImpersonate.Should().BeTrue();
        response.Reason.Should().BeNull();
    }

    [Fact]
    public async Task CanImpersonate_WhenDenied_ReturnsFalseWithReason()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var deniedReason = "Cannot impersonate other system administrators.";

        _impersonationServiceMock
            .Setup(s => s.CanImpersonateAsync(_adminUserId, _targetUserId))
            .ReturnsAsync(ImpersonationEligibilityResult.Denied(deniedReason));

        // Act
        var result = await controller.CanImpersonate(_targetUserId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CanImpersonateResponse>().Subject;
        response.CanImpersonate.Should().BeFalse();
        response.Reason.Should().Be(deniedReason);
    }

    [Fact]
    public async Task CanImpersonate_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateController(null);

        // Act
        var result = await controller.CanImpersonate(_targetUserId);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region GetActiveSession Tests

    [Fact]
    public async Task GetActiveSession_WithActiveSession_ReturnsSessionInfo()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            Reason = "Testing",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            ImpersonatedUser = new User
            {
                Id = _targetUserId,
                Email = "target@test.com",
                DisplayName = "Target User"
            }
        };

        _impersonationServiceMock
            .Setup(s => s.GetActiveSessionAsync(_adminUserId))
            .ReturnsAsync(session);

        // Act
        var result = await controller.GetActiveSession();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImpersonationSessionInfo>().Subject;
        response.Active.Should().BeTrue();
        response.ImpersonatedUserId.Should().Be(_targetUserId);
    }

    [Fact]
    public async Task GetActiveSession_WithNoActiveSession_ReturnsInactiveStatus()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        _impersonationServiceMock
            .Setup(s => s.GetActiveSessionAsync(_adminUserId))
            .ReturnsAsync((ImpersonationSession?)null);

        // Act
        var result = await controller.GetActiveSession();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        // Response should indicate no active session
        okResult.Value.Should().NotBeNull();
    }

    #endregion

    #region GetRecentSessions Tests

    [Fact]
    public async Task GetRecentSessions_AsSystemAdmin_ReturnsSessions()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var sessions = new List<ImpersonationSession>
        {
            new ImpersonationSession
            {
                Id = Guid.NewGuid(),
                AdminUserId = _adminUserId,
                ImpersonatedUserId = _targetUserId,
                StartedAt = DateTime.UtcNow.AddMinutes(-30),
                EndedAt = DateTime.UtcNow.AddMinutes(-20),
                EndReason = ImpersonationEndReason.Manual,
                Reason = "Testing 1",
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            },
            new ImpersonationSession
            {
                Id = Guid.NewGuid(),
                AdminUserId = _adminUserId,
                ImpersonatedUserId = _targetUserId,
                StartedAt = DateTime.UtcNow.AddMinutes(-10),
                Reason = "Testing 2",
                CreatedAt = DateTime.UtcNow.AddMinutes(-10)
            }
        };

        _impersonationServiceMock
            .Setup(s => s.GetRecentSessionsAsync(50))
            .ReturnsAsync(sessions);

        // Act
        var result = await controller.GetRecentSessions();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<List<ImpersonationSessionInfo>>().Subject;
        response.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetRecentSessions_AsNonAdmin_ReturnsForbidden()
    {
        // Arrange - Create a non-admin user
        var nonAdminUserId = Guid.NewGuid();
        var nonAdminUser = new User
        {
            Id = nonAdminUserId,
            Email = "nonadmin@test.com",
            DisplayName = "Non Admin",
            EntraObjectId = $"local-{nonAdminUserId}",
            IsActive = true,
            IsSystemAdmin = false
        };
        _context.Users.Add(nonAdminUser);
        await _context.SaveChangesAsync();

        var controller = CreateController(nonAdminUserId);

        // Act
        var result = await controller.GetRecentSessions();

        // Assert
        result.Result.Should().BeOfType<ForbidResult>();
    }

    #endregion
}

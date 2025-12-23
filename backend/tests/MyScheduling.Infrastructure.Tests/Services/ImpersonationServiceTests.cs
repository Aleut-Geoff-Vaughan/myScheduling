using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Infrastructure.Services;

namespace MyScheduling.Infrastructure.Tests.Services;

/// <summary>
/// Tests for ImpersonationService - admin user impersonation business logic
/// </summary>
public class ImpersonationServiceTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<ImpersonationService>> _loggerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly ImpersonationService _service;
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _targetUserId = Guid.NewGuid();
    private readonly Guid _otherAdminUserId = Guid.NewGuid();
    private readonly Guid _inactiveUserId = Guid.NewGuid();

    public ImpersonationServiceTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"ImpersonationServiceTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<ImpersonationService>>();
        _configurationMock = new Mock<IConfiguration>();

        // Setup configuration
        _configurationMock.Setup(c => c.GetSection("Impersonation:SessionTimeoutMinutes").Value).Returns("30");

        SetupTestData();

        _service = new ImpersonationService(_context, _loggerMock.Object, _configurationMock.Object);
    }

    private void SetupTestData()
    {
        // Create admin user (SystemAdmin)
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

        // Create another admin user (for testing can't impersonate admin)
        var otherAdmin = new User
        {
            Id = _otherAdminUserId,
            Email = "otheradmin@test.com",
            DisplayName = "Other Admin",
            EntraObjectId = $"local-{_otherAdminUserId}",
            IsActive = true,
            IsSystemAdmin = true
        };
        _context.Users.Add(otherAdmin);

        // Create regular target user
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

        // Create inactive user
        var inactiveUser = new User
        {
            Id = _inactiveUserId,
            Email = "inactive@test.com",
            DisplayName = "Inactive User",
            EntraObjectId = $"local-{_inactiveUserId}",
            IsActive = false,
            IsSystemAdmin = false
        };
        _context.Users.Add(inactiveUser);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region CanImpersonateAsync Tests

    [Fact]
    public async Task CanImpersonateAsync_AdminToRegularUser_ReturnsAllowed()
    {
        // Act
        var result = await _service.CanImpersonateAsync(_adminUserId, _targetUserId);

        // Assert
        result.CanImpersonate.Should().BeTrue();
        result.Reason.Should().BeNull();
    }

    [Fact]
    public async Task CanImpersonateAsync_SelfImpersonation_ReturnsDenied()
    {
        // Act
        var result = await _service.CanImpersonateAsync(_adminUserId, _adminUserId);

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("cannot impersonate yourself");
    }

    [Fact]
    public async Task CanImpersonateAsync_NonAdminUser_ReturnsDenied()
    {
        // Act - target user trying to impersonate (they're not a SystemAdmin)
        var result = await _service.CanImpersonateAsync(_targetUserId, _adminUserId);

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("system administrators");
    }

    [Fact]
    public async Task CanImpersonateAsync_AdminToAdmin_ReturnsDenied()
    {
        // Act - admin trying to impersonate another admin
        var result = await _service.CanImpersonateAsync(_adminUserId, _otherAdminUserId);

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("Cannot impersonate other system administrators");
    }

    [Fact]
    public async Task CanImpersonateAsync_ToInactiveUser_ReturnsDenied()
    {
        // Act
        var result = await _service.CanImpersonateAsync(_adminUserId, _inactiveUserId);

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("inactive");
    }

    [Fact]
    public async Task CanImpersonateAsync_ToNonexistentUser_ReturnsDenied()
    {
        // Act
        var result = await _service.CanImpersonateAsync(_adminUserId, Guid.NewGuid());

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("Target user not found");
    }

    [Fact]
    public async Task CanImpersonateAsync_FromNonexistentAdmin_ReturnsDenied()
    {
        // Act
        var result = await _service.CanImpersonateAsync(Guid.NewGuid(), _targetUserId);

        // Assert
        result.CanImpersonate.Should().BeFalse();
        result.Reason.Should().Contain("Admin user not found");
    }

    #endregion

    #region StartImpersonationAsync Tests

    [Fact]
    public async Task StartImpersonationAsync_ValidRequest_CreatesSession()
    {
        // Act
        var result = await _service.StartImpersonationAsync(
            _adminUserId,
            _targetUserId,
            "Testing user issue reported in ticket #123",
            "192.168.1.1",
            "Mozilla/5.0");

        // Assert
        result.Success.Should().BeTrue();
        result.Session.Should().NotBeNull();
        result.Session!.AdminUserId.Should().Be(_adminUserId);
        result.Session.ImpersonatedUserId.Should().Be(_targetUserId);
        result.Session.Reason.Should().Be("Testing user issue reported in ticket #123");
        result.Session.IpAddress.Should().Be("192.168.1.1");
        result.Session.UserAgent.Should().Be("Mozilla/5.0");
        result.Session.EndedAt.Should().BeNull();

        // Verify session was saved to database
        var savedSession = await _context.ImpersonationSessions.FindAsync(result.Session.Id);
        savedSession.Should().NotBeNull();
    }

    [Fact]
    public async Task StartImpersonationAsync_ShortReason_ReturnsFailed()
    {
        // Act
        var result = await _service.StartImpersonationAsync(
            _adminUserId,
            _targetUserId,
            "Short",
            null,
            null);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("at least 10 characters");
    }

    [Fact]
    public async Task StartImpersonationAsync_EmptyReason_ReturnsFailed()
    {
        // Act
        var result = await _service.StartImpersonationAsync(
            _adminUserId,
            _targetUserId,
            "",
            null,
            null);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("detailed reason");
    }

    [Fact]
    public async Task StartImpersonationAsync_NotEligible_ReturnsFailed()
    {
        // Act - target user trying to impersonate (not authorized)
        var result = await _service.StartImpersonationAsync(
            _targetUserId,
            _adminUserId,
            "Testing impersonation",
            null,
            null);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task StartImpersonationAsync_EndsExistingSession_BeforeStartingNew()
    {
        // Arrange - Create an existing active session
        var existingSession = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            Reason = "Previous session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        _context.ImpersonationSessions.Add(existingSession);
        await _context.SaveChangesAsync();

        // Act - Start a new session with the same admin
        var result = await _service.StartImpersonationAsync(
            _adminUserId,
            _targetUserId,
            "New session for testing",
            null,
            null);

        // Assert
        result.Success.Should().BeTrue();

        // Old session should be ended
        var oldSession = await _context.ImpersonationSessions.FindAsync(existingSession.Id);
        oldSession!.EndedAt.Should().NotBeNull();
        oldSession.EndReason.Should().Be(ImpersonationEndReason.NewSession);

        // New session should be active
        result.Session!.EndedAt.Should().BeNull();
    }

    #endregion

    #region EndImpersonationAsync Tests

    [Fact]
    public async Task EndImpersonationAsync_ActiveSession_EndsSuccessfully()
    {
        // Arrange
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            Reason = "Testing session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.EndImpersonationAsync(session.Id, ImpersonationEndReason.Manual);

        // Assert
        result.Success.Should().BeTrue();
        result.Session.Should().NotBeNull();
        result.Session!.EndedAt.Should().NotBeNull();
        result.Session.EndReason.Should().Be(ImpersonationEndReason.Manual);
        result.Session.Duration.Should().NotBeNull();
    }

    [Fact]
    public async Task EndImpersonationAsync_NonexistentSession_ReturnsFailed()
    {
        // Act
        var result = await _service.EndImpersonationAsync(Guid.NewGuid(), ImpersonationEndReason.Manual);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Session not found");
    }

    [Fact]
    public async Task EndImpersonationAsync_AlreadyEndedSession_ReturnsFailed()
    {
        // Arrange
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-20),
            EndedAt = DateTime.UtcNow.AddMinutes(-10),
            EndReason = ImpersonationEndReason.Manual,
            Reason = "Already ended",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20)
        };
        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.EndImpersonationAsync(session.Id, ImpersonationEndReason.Manual);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("already ended");
    }

    #endregion

    #region GetActiveSessionAsync Tests

    [Fact]
    public async Task GetActiveSessionAsync_WithActiveSession_ReturnsSession()
    {
        // Arrange
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            Reason = "Active session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveSessionAsync(_adminUserId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(session.Id);
    }

    [Fact]
    public async Task GetActiveSessionAsync_WithEndedSession_ReturnsNull()
    {
        // Arrange
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-20),
            EndedAt = DateTime.UtcNow.AddMinutes(-10),
            EndReason = ImpersonationEndReason.Manual,
            Reason = "Ended session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20)
        };
        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveSessionAsync(_adminUserId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveSessionAsync_WithNoSessions_ReturnsNull()
    {
        // Act
        var result = await _service.GetActiveSessionAsync(_adminUserId);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetRecentSessionsAsync Tests

    [Fact]
    public async Task GetRecentSessionsAsync_ReturnsSessions_OrderedByStartedAtDesc()
    {
        // Arrange
        var session1 = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddHours(-2),
            Reason = "Session 1",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        var session2 = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddHours(-1),
            Reason = "Session 2",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        var session3 = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow,
            Reason = "Session 3",
            CreatedAt = DateTime.UtcNow
        };
        _context.ImpersonationSessions.AddRange(session1, session2, session3);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetRecentSessionsAsync(10);

        // Assert
        result.Should().HaveCount(3);
        result[0].Id.Should().Be(session3.Id); // Most recent first
        result[1].Id.Should().Be(session2.Id);
        result[2].Id.Should().Be(session1.Id);
    }

    [Fact]
    public async Task GetRecentSessionsAsync_RespectsCountLimit()
    {
        // Arrange
        for (int i = 0; i < 10; i++)
        {
            _context.ImpersonationSessions.Add(new ImpersonationSession
            {
                Id = Guid.NewGuid(),
                AdminUserId = _adminUserId,
                ImpersonatedUserId = _targetUserId,
                StartedAt = DateTime.UtcNow.AddMinutes(-i),
                Reason = $"Session {i}",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetRecentSessionsAsync(5);

        // Assert
        result.Should().HaveCount(5);
    }

    #endregion

    #region CleanupTimedOutSessionsAsync Tests

    [Fact]
    public async Task CleanupTimedOutSessionsAsync_EndsTimedOutSessions()
    {
        // Arrange - Create an old session that should be timed out (default 30 min)
        var timedOutSession = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _adminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-45), // Older than 30 min timeout
            Reason = "Timed out session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-45)
        };
        var activeSession = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = _otherAdminUserId,
            ImpersonatedUserId = _targetUserId,
            StartedAt = DateTime.UtcNow.AddMinutes(-5), // Still active
            Reason = "Active session",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        _context.ImpersonationSessions.AddRange(timedOutSession, activeSession);
        await _context.SaveChangesAsync();

        // Act
        var cleanedCount = await _service.CleanupTimedOutSessionsAsync();

        // Assert
        cleanedCount.Should().Be(1);

        var cleanedSession = await _context.ImpersonationSessions.FindAsync(timedOutSession.Id);
        cleanedSession!.EndedAt.Should().NotBeNull();
        cleanedSession.EndReason.Should().Be(ImpersonationEndReason.Timeout);

        var stillActiveSession = await _context.ImpersonationSessions.FindAsync(activeSession.Id);
        stillActiveSession!.EndedAt.Should().BeNull();
    }

    #endregion
}

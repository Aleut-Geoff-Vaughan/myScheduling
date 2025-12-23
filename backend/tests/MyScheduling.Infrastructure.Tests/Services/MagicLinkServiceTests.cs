using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Infrastructure.Services;

namespace MyScheduling.Infrastructure.Tests.Services;

/// <summary>
/// Tests for MagicLinkService - passwordless authentication via email links
/// </summary>
public class MagicLinkServiceTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<MagicLinkService>> _loggerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly MagicLinkService _service;
    private readonly Guid _activeUserId = Guid.NewGuid();
    private readonly Guid _inactiveUserId = Guid.NewGuid();
    private readonly Guid _lockedUserId = Guid.NewGuid();

    public MagicLinkServiceTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"MagicLinkServiceTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<MagicLinkService>>();
        _configurationMock = new Mock<IConfiguration>();

        // Setup configuration
        _configurationMock.Setup(c => c.GetSection("MagicLink:ExpirationMinutes").Value).Returns("15");
        _configurationMock.Setup(c => c.GetSection("MagicLink:MaxRequestsPerHour").Value).Returns("5");

        SetupTestData();

        _service = new MagicLinkService(_context, _loggerMock.Object, _configurationMock.Object);
    }

    private void SetupTestData()
    {
        // Create active user
        var activeUser = new User
        {
            Id = _activeUserId,
            Email = "active@test.com",
            DisplayName = "Active User",
            EntraObjectId = $"local-{_activeUserId}",
            IsActive = true
        };
        _context.Users.Add(activeUser);

        // Create inactive user
        var inactiveUser = new User
        {
            Id = _inactiveUserId,
            Email = "inactive@test.com",
            DisplayName = "Inactive User",
            EntraObjectId = $"local-{_inactiveUserId}",
            IsActive = false
        };
        _context.Users.Add(inactiveUser);

        // Create locked out user
        var lockedUser = new User
        {
            Id = _lockedUserId,
            Email = "locked@test.com",
            DisplayName = "Locked User",
            EntraObjectId = $"local-{_lockedUserId}",
            IsActive = true,
            LockedOutUntil = DateTime.UtcNow.AddMinutes(30)
        };
        _context.Users.Add(lockedUser);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region RequestMagicLinkAsync Tests

    [Fact]
    public async Task RequestMagicLinkAsync_ActiveUser_ReturnsToken()
    {
        // Act
        var result = await _service.RequestMagicLinkAsync("active@test.com", "192.168.1.1", "Mozilla/5.0");

        // Assert
        result.Success.Should().BeTrue();
        result.Token.Should().NotBeNullOrEmpty();
        result.Email.Should().Be("active@test.com");
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);

        // Verify token was saved
        var savedToken = await _context.MagicLinkTokens.FirstOrDefaultAsync();
        savedToken.Should().NotBeNull();
        savedToken!.UserId.Should().Be(_activeUserId);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_NonexistentEmail_ReturnsSuccessWithoutToken()
    {
        // Act
        var result = await _service.RequestMagicLinkAsync("nonexistent@test.com", null, null);

        // Assert - Success=true but Token=null to prevent user enumeration
        result.Success.Should().BeTrue(); // Security: don't reveal if email exists
        result.Token.Should().BeNull();
        result.Email.Should().BeNull();
    }

    [Fact]
    public async Task RequestMagicLinkAsync_InactiveUser_ReturnsSuccessWithoutToken()
    {
        // Act
        var result = await _service.RequestMagicLinkAsync("inactive@test.com", null, null);

        // Assert - Success=true but Token=null to prevent user enumeration
        result.Success.Should().BeTrue(); // Security: don't reveal user status
        result.Token.Should().BeNull();
    }

    [Fact]
    public async Task RequestMagicLinkAsync_NormalizesEmail()
    {
        // Act - Use uppercase with whitespace
        var result = await _service.RequestMagicLinkAsync("  ACTIVE@TEST.COM  ", null, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Email.Should().Be("active@test.com");
    }

    [Fact]
    public async Task RequestMagicLinkAsync_SavesRequestMetadata()
    {
        // Arrange
        var ipAddress = "10.0.0.1";
        var userAgent = "Test Agent/1.0";

        // Act
        await _service.RequestMagicLinkAsync("active@test.com", ipAddress, userAgent);

        // Assert
        var savedToken = await _context.MagicLinkTokens.FirstOrDefaultAsync();
        savedToken.Should().NotBeNull();
        savedToken!.RequestedFromIp.Should().Be(ipAddress);
        savedToken.RequestedUserAgent.Should().Be(userAgent);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_GeneratesUniqueTokens()
    {
        // Act - Request two tokens
        var result1 = await _service.RequestMagicLinkAsync("active@test.com", null, null);
        var result2 = await _service.RequestMagicLinkAsync("active@test.com", null, null);

        // Assert
        result1.Token.Should().NotBe(result2.Token);
    }

    #endregion

    #region ValidateMagicLinkAsync Tests

    [Fact]
    public async Task ValidateMagicLinkAsync_ValidToken_ReturnsUser()
    {
        // Arrange - Create a token
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);

        // Act
        var result = await _service.ValidateMagicLinkAsync(requestResult.Token!, "10.0.0.1", "Mozilla/5.0");

        // Assert
        result.Success.Should().BeTrue();
        result.User.Should().NotBeNull();
        result.User!.Id.Should().Be(_activeUserId);
        result.User.Email.Should().Be("active@test.com");
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_InvalidToken_ReturnsFailed()
    {
        // Act
        var result = await _service.ValidateMagicLinkAsync("invalid-token-123", null, null);

        // Assert
        result.Success.Should().BeFalse();
        result.FailureReason.Should().Be(MagicLinkValidationFailureReason.InvalidToken);
        result.ErrorMessage.Should().Contain("Invalid or expired");
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_ExpiredToken_ReturnsFailed()
    {
        // Arrange - Create an expired token directly
        var tokenHash = "expiredtokenhash123456789012345678901234567890123456789012345";
        var expiredToken = new MagicLinkToken
        {
            Id = Guid.NewGuid(),
            UserId = _activeUserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5), // Already expired
            CreatedAt = DateTime.UtcNow.AddMinutes(-20)
        };
        _context.MagicLinkTokens.Add(expiredToken);
        await _context.SaveChangesAsync();

        // Act - We can't easily test this because we'd need to hash the token
        // But we can verify the logic works by requesting and then manipulating the database
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);

        // Expire the token
        var savedToken = await _context.MagicLinkTokens
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(t => t.UserId == _activeUserId);
        savedToken!.ExpiresAt = DateTime.UtcNow.AddMinutes(-5);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null);

        // Assert
        result.Success.Should().BeFalse();
        result.FailureReason.Should().Be(MagicLinkValidationFailureReason.ExpiredToken);
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_AlreadyUsedToken_ReturnsFailed()
    {
        // Arrange - Create and use a token
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);
        await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null); // First use

        // Act - Try to use again
        var result = await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null);

        // Assert
        result.Success.Should().BeFalse();
        result.FailureReason.Should().Be(MagicLinkValidationFailureReason.AlreadyUsed);
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_InactiveUser_ReturnsFailed()
    {
        // Arrange - Create token for active user, then deactivate
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);

        var user = await _context.Users.FindAsync(_activeUserId);
        user!.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null);

        // Assert
        result.Success.Should().BeFalse();
        result.FailureReason.Should().Be(MagicLinkValidationFailureReason.UserInactive);

        // Cleanup - reactivate for other tests
        user.IsActive = true;
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_LockedUser_ReturnsFailed()
    {
        // Arrange - Create token for active user, then lock
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);

        var user = await _context.Users.FindAsync(_activeUserId);
        user!.LockedOutUntil = DateTime.UtcNow.AddMinutes(30);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null);

        // Assert
        result.Success.Should().BeFalse();
        result.FailureReason.Should().Be(MagicLinkValidationFailureReason.UserLockedOut);

        // Cleanup
        user.LockedOutUntil = null;
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_UpdatesUserLoginInfo()
    {
        // Arrange
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", null, null);
        var beforeValidation = DateTime.UtcNow;

        // Act
        await _service.ValidateMagicLinkAsync(requestResult.Token!, null, null);

        // Assert
        var user = await _context.Users.FindAsync(_activeUserId);
        user!.LastLoginAt.Should().BeOnOrAfter(beforeValidation);
        user.FailedLoginAttempts.Should().Be(0);
        user.LockedOutUntil.Should().BeNull();
    }

    [Fact]
    public async Task ValidateMagicLinkAsync_MarksTokenAsUsed()
    {
        // Arrange
        var requestResult = await _service.RequestMagicLinkAsync("active@test.com", "192.168.1.1", null);

        // Act
        await _service.ValidateMagicLinkAsync(requestResult.Token!, "10.0.0.1", "Test/1.0");

        // Assert
        var token = await _context.MagicLinkTokens
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(t => t.UserId == _activeUserId);

        token!.UsedAt.Should().NotBeNull();
        token.UsedFromIp.Should().Be("10.0.0.1");
        token.UsedUserAgent.Should().Be("Test/1.0");
    }

    #endregion

    #region IsRateLimitedAsync Tests

    [Fact]
    public async Task IsRateLimitedAsync_UnderLimit_ReturnsFalse()
    {
        // Arrange - Create a few tokens (under the limit of 5)
        await _service.RequestMagicLinkAsync("active@test.com", null, null);
        await _service.RequestMagicLinkAsync("active@test.com", null, null);

        // Act
        var result = await _service.IsRateLimitedAsync("active@test.com");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsRateLimitedAsync_AtLimit_ReturnsTrue()
    {
        // Arrange - Create tokens up to the limit (5)
        for (int i = 0; i < 5; i++)
        {
            await _service.RequestMagicLinkAsync("active@test.com", null, null);
        }

        // Act
        var result = await _service.IsRateLimitedAsync("active@test.com");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsRateLimitedAsync_NonexistentUser_ReturnsFalse()
    {
        // Act
        var result = await _service.IsRateLimitedAsync("nonexistent@test.com");

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region CleanupExpiredTokensAsync Tests

    [Fact]
    public async Task CleanupExpiredTokensAsync_RemovesOldExpiredTokens()
    {
        // Arrange - Create an old expired token (more than 24 hours)
        var oldToken = new MagicLinkToken
        {
            Id = Guid.NewGuid(),
            UserId = _activeUserId,
            TokenHash = "oldtokenhash1234567890123456789012345678901234567890123456789",
            ExpiresAt = DateTime.UtcNow.AddHours(-25), // Expired more than 24 hours ago
            CreatedAt = DateTime.UtcNow.AddHours(-26)
        };
        _context.MagicLinkTokens.Add(oldToken);
        await _context.SaveChangesAsync();

        var initialCount = await _context.MagicLinkTokens.CountAsync();

        // Act
        var cleanedCount = await _service.CleanupExpiredTokensAsync();

        // Assert
        cleanedCount.Should().BeGreaterThan(0);

        var finalCount = await _context.MagicLinkTokens.CountAsync();
        finalCount.Should().BeLessThan(initialCount);

        // The old token should be removed
        var deleted = await _context.MagicLinkTokens.FindAsync(oldToken.Id);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task CleanupExpiredTokensAsync_KeepsRecentlyExpiredTokens()
    {
        // Arrange - Create a recently expired token (less than 24 hours)
        var recentToken = new MagicLinkToken
        {
            Id = Guid.NewGuid(),
            UserId = _activeUserId,
            TokenHash = "recenttokenhash12345678901234567890123456789012345678901234567",
            ExpiresAt = DateTime.UtcNow.AddHours(-1), // Expired 1 hour ago
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        _context.MagicLinkTokens.Add(recentToken);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredTokensAsync();

        // Assert - Recently expired token should still exist
        var stillExists = await _context.MagicLinkTokens.FindAsync(recentToken.Id);
        stillExists.Should().NotBeNull();
    }

    #endregion
}

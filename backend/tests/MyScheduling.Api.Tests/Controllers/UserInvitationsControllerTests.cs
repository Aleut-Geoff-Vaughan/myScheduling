using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Tests.Controllers;

/// <summary>
/// Integration tests for UserInvitationsController - focusing on invitation acceptance flow
/// </summary>
public class UserInvitationsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<UserInvitationsController>> _loggerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<IWebHostEnvironment> _environmentMock;
    private readonly UserInvitationsController _controller;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Tenant _testTenant;

    public UserInvitationsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"InvitationTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<UserInvitationsController>>();
        _configurationMock = new Mock<IConfiguration>();
        _environmentMock = new Mock<IWebHostEnvironment>();

        // Setup configuration
        _configurationMock.Setup(c => c["App:FrontendUrl"]).Returns("https://test.example.com");

        // Setup environment
        _environmentMock.Setup(e => e.EnvironmentName).Returns("Production");

        // Create test tenant
        _testTenant = new Tenant
        {
            Id = _tenantId,
            Name = "Test Tenant",
            Status = TenantStatus.Active
        };
        _context.Tenants.Add(_testTenant);
        _context.SaveChanges();

        _controller = new UserInvitationsController(
            _context,
            _loggerMock.Object,
            _configurationMock.Object,
            _environmentMock.Object
        );

        // Setup HttpContext
        var httpContext = new DefaultHttpContext();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private UserInvitation CreateTestInvitation(
        string email = "newuser@example.com",
        DateTime? expiresAt = null,
        DateTime? acceptedAt = null)
    {
        var invitation = new UserInvitation
        {
            Id = Guid.NewGuid(),
            Email = email,
            TenantId = _tenantId,
            InvitationToken = Guid.NewGuid().ToString("N"),
            Roles = new List<AppRole> { AppRole.Employee },
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(7),
            AcceptedAt = acceptedAt,
            Status = acceptedAt.HasValue ? 1 : 0, // 0 = Pending, 1 = Accepted
            CreatedAt = DateTime.UtcNow
        };
        _context.UserInvitations.Add(invitation);
        _context.SaveChanges();
        return invitation;
    }

    #region ValidateInvitation Tests

    [Fact]
    public async Task ValidateInvitation_WithValidToken_ReturnsInvitationDetails()
    {
        // Arrange
        var invitation = CreateTestInvitation();

        // Act
        var result = await _controller.ValidateInvitation(invitation.InvitationToken);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<InvitationValidationResponse>().Subject;
        response.Email.Should().Be(invitation.Email);
        response.TenantName.Should().Be(_testTenant.Name);
        response.Roles.Should().Contain("Employee");
    }

    [Fact]
    public async Task ValidateInvitation_WithEmptyToken_ReturnsBadRequest()
    {
        // Act
        var result = await _controller.ValidateInvitation("");

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ValidateInvitation_WithInvalidToken_ReturnsNotFound()
    {
        // Act
        var result = await _controller.ValidateInvitation("invalid-token-12345");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task ValidateInvitation_WithExpiredToken_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation(expiresAt: DateTime.UtcNow.AddDays(-1));

        // Act
        var result = await _controller.ValidateInvitation(invitation.InvitationToken);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ValidateInvitation_WithAlreadyAcceptedToken_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation(acceptedAt: DateTime.UtcNow.AddHours(-1));

        // Act
        var result = await _controller.ValidateInvitation(invitation.InvitationToken);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region AcceptInvitation Tests

    [Fact]
    public async Task AcceptInvitation_WithValidData_CreatesUserAndReturnsSuccess()
    {
        // Arrange
        var invitation = CreateTestInvitation(email: "newuser@test.com");
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AcceptInvitationResponse>().Subject;
        response.Message.Should().Be("Account created successfully");
        response.Email.Should().Be("newuser@test.com");
        response.DisplayName.Should().Be("New User");
        response.TenantName.Should().Be(_testTenant.Name);

        // Verify user was created in database
        var createdUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "newuser@test.com");
        createdUser.Should().NotBeNull();
        createdUser!.DisplayName.Should().Be("New User");
        createdUser.IsActive.Should().BeTrue();

        // Verify tenant membership was created
        var membership = await _context.TenantMemberships
            .FirstOrDefaultAsync(tm => tm.UserId == createdUser.Id && tm.TenantId == _tenantId);
        membership.Should().NotBeNull();
        membership!.IsActive.Should().BeTrue();

        // Verify invitation was marked as accepted
        var updatedInvitation = await _context.UserInvitations.FindAsync(invitation.Id);
        updatedInvitation!.AcceptedAt.Should().NotBeNull();
        updatedInvitation.Status.Should().Be(1); // Accepted
    }

    [Fact]
    public async Task AcceptInvitation_WithEmptyToken_ReturnsBadRequest()
    {
        // Arrange
        var request = new AcceptInvitationRequest
        {
            Token = "",
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithEmptyDisplayName_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation();
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithEmptyPassword_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation();
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = ""
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithWeakPassword_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation();
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = "weak" // Too short, no uppercase, no digit, no special char
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithInvalidToken_ReturnsNotFound()
    {
        // Arrange
        var request = new AcceptInvitationRequest
        {
            Token = "invalid-token-xyz",
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithExpiredToken_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation(expiresAt: DateTime.UtcNow.AddDays(-1));
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithAlreadyAcceptedToken_ReturnsBadRequest()
    {
        // Arrange
        var invitation = CreateTestInvitation(acceptedAt: DateTime.UtcNow.AddHours(-1));
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_WithExistingUserEmail_ReturnsConflict()
    {
        // Arrange
        var existingEmail = "existing@test.com";

        // Create existing user
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = existingEmail,
            DisplayName = "Existing User",
            EntraObjectId = $"local-{Guid.NewGuid()}",
            IsActive = true
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        // Create invitation for same email
        var invitation = CreateTestInvitation(email: existingEmail);
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "New User",
            Password = "SecurePassword123!"
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_CreatesUserWithCorrectPasswordHash()
    {
        // Arrange
        var invitation = CreateTestInvitation(email: "hashtest@test.com");
        var password = "SecurePassword123!";
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "Hash Test User",
            Password = password
        };

        // Act
        await _controller.AcceptInvitation(request);

        // Assert
        var createdUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "hashtest@test.com");
        createdUser.Should().NotBeNull();
        createdUser!.PasswordHash.Should().NotBeNullOrEmpty();

        // Verify password can be verified using BCrypt
        BCrypt.Net.BCrypt.Verify(password, createdUser.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task AcceptInvitation_AssignsCorrectRoles()
    {
        // Arrange
        // Create invitation with multiple roles
        var invitation = new UserInvitation
        {
            Id = Guid.NewGuid(),
            Email = "multirole@test.com",
            TenantId = _tenantId,
            InvitationToken = Guid.NewGuid().ToString("N"),
            Roles = new List<AppRole> { AppRole.Employee, AppRole.TeamLead },
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.UserInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "Multi Role User",
            Password = "SecurePassword123!"
        };

        // Act
        await _controller.AcceptInvitation(request);

        // Assert
        var createdUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "multirole@test.com");
        var membership = await _context.TenantMemberships
            .FirstOrDefaultAsync(tm => tm.UserId == createdUser!.Id && tm.TenantId == _tenantId);

        membership.Should().NotBeNull();
        membership!.Roles.Should().Contain(AppRole.Employee);
        membership.Roles.Should().Contain(AppRole.TeamLead);
    }

    #endregion

    #region Password Validation Tests

    [Theory]
    [InlineData("Short1!", false)] // Too short (7 chars)
    [InlineData("nouppercase1!", false)] // No uppercase
    [InlineData("NOLOWERCASE1!", false)] // No lowercase
    [InlineData("NoDigits!!!", false)] // No digit
    [InlineData("NoSpecial123", false)] // No special char
    [InlineData("ValidPass1!", true)] // Valid (8 chars with all requirements)
    [InlineData("LongerValidPassword123!", true)] // Valid longer password
    public async Task AcceptInvitation_PasswordValidation_EnforcesRequirements(string password, bool shouldSucceed)
    {
        // Arrange
        var invitation = CreateTestInvitation(email: $"pwdtest-{Guid.NewGuid():N}@test.com");
        var request = new AcceptInvitationRequest
        {
            Token = invitation.InvitationToken,
            DisplayName = "Password Test User",
            Password = password
        };

        // Act
        var result = await _controller.AcceptInvitation(request);

        // Assert
        if (shouldSucceed)
        {
            result.Result.Should().BeOfType<OkObjectResult>();
        }
        else
        {
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
    }

    #endregion
}

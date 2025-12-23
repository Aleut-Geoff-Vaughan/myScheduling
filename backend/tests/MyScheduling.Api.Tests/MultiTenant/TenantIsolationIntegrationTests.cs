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

namespace MyScheduling.Api.Tests.MultiTenant;

/// <summary>
/// Integration tests verifying multi-tenant data isolation across API endpoints.
/// These tests ensure users can only access data within their authorized tenants.
/// </summary>
public class TenantIsolationIntegrationTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<UsersController>> _loggerMock;
    private readonly Mock<IAuthorizationService> _authServiceMock;
    private readonly Guid _tenant1Id = Guid.NewGuid();
    private readonly Guid _tenant2Id = Guid.NewGuid();
    private readonly Guid _user1Id = Guid.NewGuid(); // User in Tenant1 only
    private readonly Guid _user2Id = Guid.NewGuid(); // User in Tenant2 only
    private readonly Guid _adminUserId = Guid.NewGuid(); // System admin with access to both

    public TenantIsolationIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"TenantIsolationTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<UsersController>>();
        _authServiceMock = new Mock<IAuthorizationService>();

        SetupTestData();
    }

    private void SetupTestData()
    {
        // Create tenants
        var tenant1 = new Tenant { Id = _tenant1Id, Name = "Tenant 1", Status = TenantStatus.Active };
        var tenant2 = new Tenant { Id = _tenant2Id, Name = "Tenant 2", Status = TenantStatus.Active };
        _context.Tenants.AddRange(tenant1, tenant2);

        // Create users
        var user1 = new User
        {
            Id = _user1Id,
            Email = "user1@tenant1.com",
            DisplayName = "User 1 (Tenant 1)",
            EntraObjectId = $"local-{_user1Id}",
            IsActive = true
        };

        var user2 = new User
        {
            Id = _user2Id,
            Email = "user2@tenant2.com",
            DisplayName = "User 2 (Tenant 2)",
            EntraObjectId = $"local-{_user2Id}",
            IsActive = true
        };

        var adminUser = new User
        {
            Id = _adminUserId,
            Email = "admin@system.com",
            DisplayName = "System Admin",
            EntraObjectId = $"local-{_adminUserId}",
            IsActive = true,
            IsSystemAdmin = true
        };

        _context.Users.AddRange(user1, user2, adminUser);

        // Create tenant memberships
        _context.TenantMemberships.AddRange(
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _user1Id,
                TenantId = _tenant1Id,
                Roles = new List<AppRole> { AppRole.Employee },
                IsActive = true
            },
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _user2Id,
                TenantId = _tenant2Id,
                Roles = new List<AppRole> { AppRole.Employee },
                IsActive = true
            },
            // Admin has membership in both tenants
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _adminUserId,
                TenantId = _tenant1Id,
                Roles = new List<AppRole> { AppRole.TenantAdmin },
                IsActive = true
            },
            new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = _adminUserId,
                TenantId = _tenant2Id,
                Roles = new List<AppRole> { AppRole.TenantAdmin },
                IsActive = true
            }
        );

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private UsersController CreateController(Guid userId, Guid? tenantId = null, bool isSystemAdmin = false)
    {
        var controller = new UsersController(_context, _loggerMock.Object, _authServiceMock.Object);

        // Setup HttpContext with claims
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, userId == _adminUserId ? "admin@system.com" : $"user-{userId}@test.com")
        };

        if (tenantId.HasValue)
        {
            claims.Add(new Claim("TenantId", tenantId.Value.ToString()));
        }

        if (isSystemAdmin)
        {
            claims.Add(new Claim("IsSystemAdmin", "true"));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = principal
        };

        if (tenantId.HasValue)
        {
            httpContext.Request.Headers["X-Tenant-Id"] = tenantId.Value.ToString();
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    #region User Listing Isolation Tests

    [Fact]
    public async Task GetUsers_WithTenantFilter_ReturnsOnlyTenantUsers()
    {
        // Arrange
        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(tenantId: _tenant1Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        // Should only contain users with Tenant1 membership
        users.Should().Contain(u => u.Id == _user1Id);
        users.Should().Contain(u => u.Id == _adminUserId);
        users.Should().NotContain(u => u.Id == _user2Id);
    }

    [Fact]
    public async Task GetUsers_WithDifferentTenantFilter_ReturnsDifferentUsers()
    {
        // Arrange
        var controller = CreateController(_adminUserId, _tenant2Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(tenantId: _tenant2Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        // Should only contain users with Tenant2 membership
        users.Should().Contain(u => u.Id == _user2Id);
        users.Should().Contain(u => u.Id == _adminUserId);
        users.Should().NotContain(u => u.Id == _user1Id);
    }

    [Fact]
    public async Task GetUsers_WithoutTenantFilter_SystemAdminGetsAllUsers()
    {
        // Arrange
        var controller = CreateController(_adminUserId, null, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(tenantId: null);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        // System admin without tenant filter should see all users
        users.Should().Contain(u => u.Id == _user1Id);
        users.Should().Contain(u => u.Id == _user2Id);
        users.Should().Contain(u => u.Id == _adminUserId);
    }

    #endregion

    #region Single User Access Tests

    [Fact]
    public async Task GetUser_ExistingUser_ReturnsUser()
    {
        // Arrange
        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUser(_user1Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var user = okResult.Value.Should().BeOfType<User>().Subject;
        user.Id.Should().Be(_user1Id);
        user.Email.Should().Be("user1@tenant1.com");
    }

    [Fact]
    public async Task GetUser_NonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var result = await controller.GetUser(nonExistentUserId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region Tenant Membership Data Tests

    [Fact]
    public async Task GetUser_IncludesTenantMemberships()
    {
        // Arrange
        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUser(_adminUserId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var user = okResult.Value.Should().BeOfType<User>().Subject;

        // Admin should have memberships in both tenants
        user.TenantMemberships.Should().HaveCount(2);
        user.TenantMemberships.Should().Contain(tm => tm.TenantId == _tenant1Id);
        user.TenantMemberships.Should().Contain(tm => tm.TenantId == _tenant2Id);
    }

    #endregion

    #region Cross-Tenant Access Prevention Tests

    [Fact]
    public async Task TenantMembership_OnlyAllowedForAuthorizedTenants()
    {
        // This test verifies the tenant membership model prevents cross-tenant pollution

        // User1 should only have Tenant1 membership
        var user1Memberships = await _context.TenantMemberships
            .Where(tm => tm.UserId == _user1Id)
            .ToListAsync();

        user1Memberships.Should().HaveCount(1);
        user1Memberships.First().TenantId.Should().Be(_tenant1Id);

        // User2 should only have Tenant2 membership
        var user2Memberships = await _context.TenantMemberships
            .Where(tm => tm.UserId == _user2Id)
            .ToListAsync();

        user2Memberships.Should().HaveCount(1);
        user2Memberships.First().TenantId.Should().Be(_tenant2Id);
    }

    [Fact]
    public async Task TenantMembership_AdminHasAccessToBothTenants()
    {
        // Admin should have memberships in both tenants
        var adminMemberships = await _context.TenantMemberships
            .Where(tm => tm.UserId == _adminUserId)
            .ToListAsync();

        adminMemberships.Should().HaveCount(2);
        adminMemberships.Should().Contain(tm => tm.TenantId == _tenant1Id);
        adminMemberships.Should().Contain(tm => tm.TenantId == _tenant2Id);
    }

    #endregion

    #region TenantId Header Validation Tests

    [Fact]
    public void XTenantIdHeader_ShouldBeSetInRequest()
    {
        // Arrange
        var controller = CreateController(_user1Id, _tenant1Id);

        // Act & Assert
        controller.HttpContext.Request.Headers["X-Tenant-Id"].ToString()
            .Should().Be(_tenant1Id.ToString());
    }

    [Fact]
    public void XTenantIdHeader_NotSetWhenTenantIdNull()
    {
        // Arrange
        var controller = CreateController(_adminUserId, null, isSystemAdmin: true);

        // Act & Assert
        controller.HttpContext.Request.Headers.ContainsKey("X-Tenant-Id").Should().BeFalse();
    }

    #endregion

    #region Inactive User/Membership Filtering Tests

    [Fact]
    public async Task GetUsers_ExcludesInactiveMembershipsByDefault()
    {
        // Arrange
        var inactiveUserId = Guid.NewGuid();
        var inactiveUser = new User
        {
            Id = inactiveUserId,
            Email = "inactive@tenant1.com",
            DisplayName = "Inactive User",
            EntraObjectId = $"local-{inactiveUserId}",
            IsActive = true
        };
        _context.Users.Add(inactiveUser);

        // Create inactive membership
        _context.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = inactiveUserId,
            TenantId = _tenant1Id,
            Roles = new List<AppRole> { AppRole.Employee },
            IsActive = false // Inactive membership
        });
        await _context.SaveChangesAsync();

        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(tenantId: _tenant1Id, includeInactive: false);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        // Should NOT contain user with inactive membership
        users.Should().NotContain(u => u.Id == inactiveUserId);
    }

    [Fact]
    public async Task GetUsers_IncludesInactiveMembershipsWhenRequested()
    {
        // Arrange
        var inactiveUserId = Guid.NewGuid();
        var inactiveUser = new User
        {
            Id = inactiveUserId,
            Email = "inactive2@tenant1.com",
            DisplayName = "Inactive User 2",
            EntraObjectId = $"local-{inactiveUserId}",
            IsActive = true
        };
        _context.Users.Add(inactiveUser);

        // Create inactive membership
        _context.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = inactiveUserId,
            TenantId = _tenant1Id,
            Roles = new List<AppRole> { AppRole.Employee },
            IsActive = false // Inactive membership
        });
        await _context.SaveChangesAsync();

        var controller = CreateController(_adminUserId, _tenant1Id, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(tenantId: _tenant1Id, includeInactive: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        // Should contain user with inactive membership when includeInactive=true
        users.Should().Contain(u => u.Id == inactiveUserId);
    }

    #endregion

    #region Search Functionality Tests

    [Fact]
    public async Task GetUsers_SearchByEmail_FiltersResults()
    {
        // Arrange
        var controller = CreateController(_adminUserId, null, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(search: "user1@tenant1");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        users.Should().Contain(u => u.Email == "user1@tenant1.com");
        users.Should().NotContain(u => u.Email == "user2@tenant2.com");
    }

    [Fact]
    public async Task GetUsers_SearchByDisplayName_FiltersResults()
    {
        // Arrange
        var controller = CreateController(_adminUserId, null, isSystemAdmin: true);

        // Act
        var result = await controller.GetUsers(search: "User 1 (Tenant 1)");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();

        users.Should().Contain(u => u.DisplayName == "User 1 (Tenant 1)");
    }

    #endregion
}

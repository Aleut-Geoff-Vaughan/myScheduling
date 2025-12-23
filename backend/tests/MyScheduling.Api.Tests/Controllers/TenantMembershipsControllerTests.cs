using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using System.Security.Claims;

namespace MyScheduling.Api.Tests.Controllers;

/// <summary>
/// Tests for TenantMembershipsController - tenant membership CRUD operations
/// </summary>
public class TenantMembershipsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<TenantMembershipsController>> _loggerMock;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _membershipId = Guid.NewGuid();

    public TenantMembershipsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"TenantMembershipsTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<TenantMembershipsController>>();

        SetupTestData();
    }

    private void SetupTestData()
    {
        // Create tenant
        var tenant = new Tenant
        {
            Id = _tenantId,
            Name = "Test Tenant",
            Status = TenantStatus.Active
        };
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

        // Create regular user
        var user = new User
        {
            Id = _userId,
            Email = "user@test.com",
            DisplayName = "Regular User",
            EntraObjectId = $"local-{_userId}",
            IsActive = true
        };
        _context.Users.Add(user);

        // Create existing membership
        var membership = new TenantMembership
        {
            Id = _membershipId,
            UserId = _userId,
            TenantId = _tenantId,
            Roles = new List<AppRole> { AppRole.Employee },
            IsActive = true,
            JoinedAt = DateTime.UtcNow.AddDays(-30),
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
        _context.TenantMemberships.Add(membership);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private TenantMembershipsController CreateController(Guid? userId = null)
    {
        var controller = new TenantMembershipsController(_context, _loggerMock.Object);

        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Items["CorrelationId"] = Guid.NewGuid().ToString();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    #region GetTenantMembership Tests

    [Fact]
    public async Task GetTenantMembership_ExistingMembership_ReturnsMembership()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenantMembership(_membershipId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var membership = okResult.Value.Should().BeOfType<TenantMembership>().Subject;
        membership.Id.Should().Be(_membershipId);
        membership.UserId.Should().Be(_userId);
        membership.TenantId.Should().Be(_tenantId);
    }

    [Fact]
    public async Task GetTenantMembership_NonexistentMembership_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenantMembership(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region CreateTenantMembership Tests

    [Fact]
    public async Task CreateTenantMembership_ValidRequest_ReturnsCreatedMembership()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            Email = "newuser@test.com",
            DisplayName = "New User",
            EntraObjectId = $"local-{newUserId}",
            IsActive = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var request = new CreateTenantMembershipRequest
        {
            UserId = newUserId,
            TenantId = _tenantId,
            Roles = new List<AppRole> { AppRole.Employee, AppRole.TeamLead }
        };

        // Act
        var result = await controller.CreateTenantMembership(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var membership = createdResult.Value.Should().BeOfType<TenantMembership>().Subject;
        membership.UserId.Should().Be(newUserId);
        membership.TenantId.Should().Be(_tenantId);
        membership.Roles.Should().Contain(AppRole.Employee);
        membership.Roles.Should().Contain(AppRole.TeamLead);
        membership.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateTenantMembership_NonexistentUser_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new CreateTenantMembershipRequest
        {
            UserId = Guid.NewGuid(),
            TenantId = _tenantId,
            Roles = new List<AppRole> { AppRole.Employee }
        };

        // Act
        var result = await controller.CreateTenantMembership(request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CreateTenantMembership_NonexistentTenant_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new CreateTenantMembershipRequest
        {
            UserId = _userId,
            TenantId = Guid.NewGuid(),
            Roles = new List<AppRole> { AppRole.Employee }
        };

        // Act
        var result = await controller.CreateTenantMembership(request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CreateTenantMembership_DuplicateMembership_ReturnsConflict()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new CreateTenantMembershipRequest
        {
            UserId = _userId, // Already has membership
            TenantId = _tenantId,
            Roles = new List<AppRole> { AppRole.Employee }
        };

        // Act
        var result = await controller.CreateTenantMembership(request);

        // Assert
        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task CreateTenantMembership_EmptyRoles_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            Email = "newuser2@test.com",
            DisplayName = "New User 2",
            EntraObjectId = $"local-{newUserId}",
            IsActive = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var request = new CreateTenantMembershipRequest
        {
            UserId = newUserId,
            TenantId = _tenantId,
            Roles = new List<AppRole>() // Empty roles
        };

        // Act
        var result = await controller.CreateTenantMembership(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region UpdateTenantMembershipRoles Tests

    [Fact]
    public async Task UpdateTenantMembershipRoles_ValidRequest_UpdatesRoles()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new UpdateRolesRequest
        {
            Roles = new List<AppRole> { AppRole.Employee, AppRole.ProjectManager }
        };

        // Act
        var result = await controller.UpdateTenantMembershipRoles(_membershipId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var membership = okResult.Value.Should().BeOfType<TenantMembership>().Subject;
        membership.Roles.Should().Contain(AppRole.Employee);
        membership.Roles.Should().Contain(AppRole.ProjectManager);
    }

    [Fact]
    public async Task UpdateTenantMembershipRoles_NonexistentMembership_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new UpdateRolesRequest
        {
            Roles = new List<AppRole> { AppRole.Employee }
        };

        // Act
        var result = await controller.UpdateTenantMembershipRoles(Guid.NewGuid(), request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpdateTenantMembershipRoles_EmptyRoles_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new UpdateRolesRequest
        {
            Roles = new List<AppRole>()
        };

        // Act
        var result = await controller.UpdateTenantMembershipRoles(_membershipId, request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region UpdateTenantMembershipStatus Tests

    [Fact]
    public async Task UpdateTenantMembershipStatus_Deactivate_UpdatesStatus()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new UpdateStatusRequest { IsActive = false };

        // Act
        var result = await controller.UpdateTenantMembershipStatus(_membershipId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var membership = okResult.Value.Should().BeOfType<TenantMembership>().Subject;
        membership.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateTenantMembershipStatus_Activate_UpdatesStatus()
    {
        // Arrange - First deactivate
        var membership = await _context.TenantMemberships.FindAsync(_membershipId);
        membership!.IsActive = false;
        await _context.SaveChangesAsync();

        var controller = CreateController(_adminUserId);
        var request = new UpdateStatusRequest { IsActive = true };

        // Act
        var result = await controller.UpdateTenantMembershipStatus(_membershipId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var updatedMembership = okResult.Value.Should().BeOfType<TenantMembership>().Subject;
        updatedMembership.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateTenantMembershipStatus_NonexistentMembership_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var request = new UpdateStatusRequest { IsActive = false };

        // Act
        var result = await controller.UpdateTenantMembershipStatus(Guid.NewGuid(), request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region DeleteTenantMembership Tests

    [Fact]
    public async Task DeleteTenantMembership_ExistingMembership_DeletesAndReturnsNoContent()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var membershipToDelete = new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = _adminUserId, // Different user
            TenantId = _tenantId,
            Roles = new List<AppRole> { AppRole.TenantAdmin },
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.TenantMemberships.Add(membershipToDelete);
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.DeleteTenantMembership(membershipToDelete.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        // Verify deletion
        var deleted = await _context.TenantMemberships.FindAsync(membershipToDelete.Id);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteTenantMembership_NonexistentMembership_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.DeleteTenantMembership(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetAvailableRoles Tests

    [Fact]
    public void GetAvailableRoles_ReturnsAllRoles()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = controller.GetAvailableRoles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var roles = okResult.Value.Should().BeAssignableTo<IEnumerable<RoleInfo>>().Subject.ToList();

        // Should have all roles
        roles.Should().Contain(r => r.Value == AppRole.Employee);
        roles.Should().Contain(r => r.Value == AppRole.TenantAdmin);
        roles.Should().Contain(r => r.Value == AppRole.ProjectManager);
        roles.Should().Contain(r => r.Value == AppRole.SystemAdmin);
    }

    [Fact]
    public void GetAvailableRoles_ContainsRoleDescriptions()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = controller.GetAvailableRoles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var roles = okResult.Value.Should().BeAssignableTo<IEnumerable<RoleInfo>>().Subject.ToList();

        var employeeRole = roles.FirstOrDefault(r => r.Value == AppRole.Employee);
        employeeRole.Should().NotBeNull();
        employeeRole!.Name.Should().Be("Employee");
        employeeRole.Description.Should().NotBeNullOrEmpty();
        employeeRole.Level.Should().Be("tenant");
    }

    [Fact]
    public void GetAvailableRoles_DistinguishesTenantAndSystemRoles()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = controller.GetAvailableRoles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var roles = okResult.Value.Should().BeAssignableTo<IEnumerable<RoleInfo>>().Subject.ToList();

        var tenantRoles = roles.Where(r => r.Level == "tenant").ToList();
        var systemRoles = roles.Where(r => r.Level == "system").ToList();

        tenantRoles.Should().NotBeEmpty();
        systemRoles.Should().NotBeEmpty();

        // SystemAdmin should be system-level
        systemRoles.Should().Contain(r => r.Value == AppRole.SystemAdmin);

        // Employee should be tenant-level
        tenantRoles.Should().Contain(r => r.Value == AppRole.Employee);
    }

    #endregion
}

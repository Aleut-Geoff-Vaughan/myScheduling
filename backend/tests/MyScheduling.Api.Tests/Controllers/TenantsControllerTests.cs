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

namespace MyScheduling.Api.Tests.Controllers;

/// <summary>
/// Tests for TenantsController - tenant CRUD operations
/// </summary>
public class TenantsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<ILogger<TenantsController>> _loggerMock;
    private readonly Mock<IAuthorizationService> _authServiceMock;
    private readonly Guid _tenant1Id = Guid.NewGuid();
    private readonly Guid _tenant2Id = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();

    public TenantsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: $"TenantsControllerTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<TenantsController>>();
        _authServiceMock = new Mock<IAuthorizationService>();

        SetupTestData();
    }

    private void SetupTestData()
    {
        // Create tenants
        var tenant1 = new Tenant
        {
            Id = _tenant1Id,
            Name = "Tenant One",
            Status = TenantStatus.Active,
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
        var tenant2 = new Tenant
        {
            Id = _tenant2Id,
            Name = "Tenant Two",
            Status = TenantStatus.Inactive,
            CreatedAt = DateTime.UtcNow.AddDays(-15)
        };
        _context.Tenants.AddRange(tenant1, tenant2);

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

        // Create user with tenant membership
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "user@tenant1.com",
            DisplayName = "Tenant 1 User",
            EntraObjectId = $"local-{userId}",
            IsActive = true
        };
        _context.Users.Add(user);

        // Membership
        _context.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TenantId = _tenant1Id,
            Roles = new List<AppRole> { AppRole.Employee },
            IsActive = true
        });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private TenantsController CreateController(Guid? userId = null)
    {
        var controller = new TenantsController(_context, _loggerMock.Object, _authServiceMock.Object);

        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }

    #region GetTenants Tests

    [Fact]
    public async Task GetTenants_ReturnsAllTenants()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenants();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var tenants = okResult.Value.Should().BeAssignableTo<IEnumerable<Tenant>>().Subject.ToList();
        tenants.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetTenants_WithStatusFilter_ReturnsFilteredTenants()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenants(TenantStatus.Active);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var tenants = okResult.Value.Should().BeAssignableTo<IEnumerable<Tenant>>().Subject.ToList();
        tenants.Should().HaveCount(1);
        tenants[0].Status.Should().Be(TenantStatus.Active);
    }

    [Fact]
    public async Task GetTenants_OrdersByName()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenants();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var tenants = okResult.Value.Should().BeAssignableTo<IEnumerable<Tenant>>().Subject.ToList();
        tenants[0].Name.Should().Be("Tenant One");
        tenants[1].Name.Should().Be("Tenant Two");
    }

    #endregion

    #region GetTenant Tests

    [Fact]
    public async Task GetTenant_ExistingTenant_ReturnsTenant()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenant(_tenant1Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var tenant = okResult.Value.Should().BeOfType<Tenant>().Subject;
        tenant.Id.Should().Be(_tenant1Id);
        tenant.Name.Should().Be("Tenant One");
    }

    [Fact]
    public async Task GetTenant_NonexistentTenant_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenant(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region CreateTenant Tests

    [Fact]
    public async Task CreateTenant_ValidTenant_ReturnsCreatedAtAction()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var newTenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "New Tenant",
            Status = TenantStatus.Active
        };

        // Act
        var result = await controller.CreateTenant(newTenant);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be("GetTenant");
        var createdTenant = createdResult.Value.Should().BeOfType<Tenant>().Subject;
        createdTenant.Name.Should().Be("New Tenant");

        // Verify it was saved to database
        var savedTenant = await _context.Tenants.FindAsync(newTenant.Id);
        savedTenant.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateTenant_DuplicateName_ReturnsConflict()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var newTenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "Tenant One", // Same name as existing tenant
            Status = TenantStatus.Active
        };

        // Act
        var result = await controller.CreateTenant(newTenant);

        // Assert
        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    #endregion

    #region UpdateTenant Tests

    [Fact]
    public async Task UpdateTenant_ValidUpdate_ReturnsNoContent()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var tenant = await _context.Tenants.FindAsync(_tenant1Id);
        _context.Entry(tenant!).State = EntityState.Detached; // Detach to avoid tracking issues

        var updatedTenant = new Tenant
        {
            Id = _tenant1Id,
            Name = "Updated Tenant Name",
            Status = TenantStatus.Active
        };

        // Act
        var result = await controller.UpdateTenant(_tenant1Id, updatedTenant);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task UpdateTenant_IdMismatch_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var updatedTenant = new Tenant
        {
            Id = Guid.NewGuid(), // Different ID
            Name = "Updated Name",
            Status = TenantStatus.Active
        };

        // Act
        var result = await controller.UpdateTenant(_tenant1Id, updatedTenant);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateTenant_NonexistentTenant_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var nonexistentId = Guid.NewGuid();
        var updatedTenant = new Tenant
        {
            Id = nonexistentId,
            Name = "Nonexistent",
            Status = TenantStatus.Active
        };

        // Act
        var result = await controller.UpdateTenant(nonexistentId, updatedTenant);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region DeleteTenant Tests

    [Fact]
    public async Task DeleteTenant_ExistingTenant_ReturnsNoContentAndCreatesArchive()
    {
        // Arrange
        var controller = CreateController(_adminUserId);
        var tenantToDelete = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "Tenant To Delete",
            Status = TenantStatus.Active
        };
        _context.Tenants.Add(tenantToDelete);
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.DeleteTenant(tenantToDelete.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        // Verify tenant was deleted
        var deletedTenant = await _context.Tenants.FindAsync(tenantToDelete.Id);
        deletedTenant.Should().BeNull();

        // Verify archive was created
        var archive = await _context.DataArchives
            .FirstOrDefaultAsync(a => a.EntityId == tenantToDelete.Id);
        archive.Should().NotBeNull();
        archive!.EntityType.Should().Be("Tenant");
        archive.Status.Should().Be(DataArchiveStatus.PermanentlyDeleted);
    }

    [Fact]
    public async Task DeleteTenant_NonexistentTenant_ReturnsNotFound()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.DeleteTenant(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetTenantUsers Tests

    [Fact]
    public async Task GetTenantUsers_ReturnsUsersWithActiveMembership()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenantUsers(_tenant1Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();
        users.Should().HaveCount(1);
        users[0].Email.Should().Be("user@tenant1.com");
    }

    [Fact]
    public async Task GetTenantUsers_TenantWithNoUsers_ReturnsEmptyList()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Act
        var result = await controller.GetTenantUsers(_tenant2Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();
        users.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTenantUsers_ExcludesInactiveMemberships()
    {
        // Arrange
        var controller = CreateController(_adminUserId);

        // Create user with inactive membership
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
        _context.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            UserId = inactiveUserId,
            TenantId = _tenant1Id,
            Roles = new List<AppRole> { AppRole.Employee },
            IsActive = false // Inactive membership
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.GetTenantUsers(_tenant1Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var users = okResult.Value.Should().BeAssignableTo<IEnumerable<User>>().Subject.ToList();
        users.Should().NotContain(u => u.Id == inactiveUserId);
    }

    #endregion
}

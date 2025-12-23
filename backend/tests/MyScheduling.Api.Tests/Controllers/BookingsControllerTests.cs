using System.Security.Claims;
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
using Xunit;

namespace MyScheduling.Api.Tests.Controllers;

public class BookingsControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly BookingsController _controller;
    private readonly Mock<ILogger<BookingsController>> _loggerMock;
    private readonly Mock<IAuthorizationService> _authServiceMock;

    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testOfficeId = Guid.NewGuid();
    private readonly Guid _testSpaceId = Guid.NewGuid();
    private readonly Guid _testBookingId = Guid.NewGuid();

    public BookingsControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<BookingsController>>();
        _authServiceMock = new Mock<IAuthorizationService>();

        _controller = new BookingsController(_context, _loggerMock.Object, _authServiceMock.Object);
        SetupHttpContext(_testUserId, _testTenantId);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private void SetupHttpContext(Guid userId, Guid tenantId)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("UserId", userId.ToString()),
            new Claim("TenantId", tenantId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = claimsPrincipal
        };
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId.ToString();

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    #region Helper Methods

    private Office CreateOffice(
        Guid? id = null,
        Guid? tenantId = null,
        string name = "Test Office")
    {
        return new Office
        {
            Id = id ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            Status = OfficeStatus.Active,
            City = "Test City",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private Space CreateSpace(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        string name = "Test Space",
        SpaceType type = SpaceType.Desk)
    {
        return new Space
        {
            Id = id ?? _testSpaceId,
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            Type = type,
            IsActive = true,
            Capacity = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private User CreateUser(Guid? id = null, string email = "user@test.com", string displayName = "Test User")
    {
        return new User
        {
            Id = id ?? _testUserId,
            Email = email,
            DisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private Booking CreateBooking(
        Guid? id = null,
        Guid? spaceId = null,
        Guid? userId = null,
        Guid? tenantId = null,
        DateTime? startDatetime = null,
        DateTime? endDatetime = null,
        BookingStatus status = BookingStatus.Reserved,
        bool isPermanent = false,
        bool isDeleted = false)
    {
        return new Booking
        {
            Id = id ?? _testBookingId,
            SpaceId = spaceId ?? _testSpaceId,
            UserId = userId ?? _testUserId,
            TenantId = tenantId ?? _testTenantId,
            StartDatetime = startDatetime ?? DateTime.UtcNow,
            EndDatetime = endDatetime ?? DateTime.UtcNow.AddHours(8),
            Status = status,
            IsPermanent = isPermanent,
            IsDeleted = isDeleted,
            BookedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private CheckInEvent CreateCheckInEvent(
        Guid? id = null,
        Guid? bookingId = null,
        DateOnly? checkInDate = null,
        CheckInStatus status = CheckInStatus.CheckedIn)
    {
        return new CheckInEvent
        {
            Id = id ?? Guid.NewGuid(),
            BookingId = bookingId ?? _testBookingId,
            CheckInDate = checkInDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            Timestamp = DateTime.UtcNow,
            Method = "web",
            Status = status,
            ProcessedByUserId = _testUserId
        };
    }

    #endregion

    #region GetBookings Tests

    [Fact]
    public async Task GetBookings_ReturnsAllBookings()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user = CreateUser();
        var booking = CreateBooking();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddAsync(user);
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetBookings();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var bookings = (okResult.Value as IEnumerable<Booking>)!.ToList();
        bookings.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetBookings_FiltersByUserId()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user1 = CreateUser();
        var user2Id = Guid.NewGuid();
        var user2 = CreateUser(id: user2Id, email: "user2@test.com");
        var booking1 = CreateBooking();
        var booking2 = CreateBooking(id: Guid.NewGuid(), userId: user2Id);

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddRangeAsync(user1, user2);
        await _context.Bookings.AddRangeAsync(booking1, booking2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetBookings(userId: _testUserId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var bookings = (okResult.Value as IEnumerable<Booking>)!.ToList();
        bookings.Should().HaveCount(1);
        bookings[0].UserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task GetBookings_FiltersBySpaceId()
    {
        // Arrange
        var office = CreateOffice();
        var space1 = CreateSpace();
        var space2Id = Guid.NewGuid();
        var space2 = CreateSpace(id: space2Id, name: "Space 2");
        var user = CreateUser();
        var booking1 = CreateBooking();
        var booking2 = CreateBooking(id: Guid.NewGuid(), spaceId: space2Id);

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddRangeAsync(space1, space2);
        await _context.Users.AddAsync(user);
        await _context.Bookings.AddRangeAsync(booking1, booking2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetBookings(spaceId: _testSpaceId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var bookings = (okResult.Value as IEnumerable<Booking>)!.ToList();
        bookings.Should().HaveCount(1);
        bookings[0].SpaceId.Should().Be(_testSpaceId);
    }

    [Fact]
    public async Task GetBookings_FiltersByStatus()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user = CreateUser();
        var reserved = CreateBooking(status: BookingStatus.Reserved);
        var checkedIn = CreateBooking(id: Guid.NewGuid(), status: BookingStatus.CheckedIn);

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddAsync(user);
        await _context.Bookings.AddRangeAsync(reserved, checkedIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetBookings(status: BookingStatus.CheckedIn);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var bookings = (okResult.Value as IEnumerable<Booking>)!.ToList();
        bookings.Should().HaveCount(1);
        bookings[0].Status.Should().Be(BookingStatus.CheckedIn);
    }

    #endregion

    #region GetBooking Tests

    [Fact]
    public async Task GetBooking_ReturnsBookingWithDetails()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user = CreateUser();
        var booking = CreateBooking();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddAsync(user);
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetBooking(_testBookingId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedBooking = okResult.Value.Should().BeOfType<Booking>().Subject;
        returnedBooking.Id.Should().Be(_testBookingId);
    }

    [Fact]
    public async Task GetBooking_ReturnsNotFoundForMissingBooking()
    {
        // Act
        var result = await _controller.GetBooking(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region CreateBooking Tests

    [Fact]
    public async Task CreateBooking_CreatesAndReturnsBooking()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user = CreateUser();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = _testSpaceId,
            UserId = _testUserId,
            StartDatetime = DateTime.UtcNow,
            EndDatetime = DateTime.UtcNow.AddHours(8),
            Status = BookingStatus.Reserved
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var createdBooking = createdResult.Value.Should().BeOfType<Booking>().Subject;
        createdBooking.Id.Should().NotBe(Guid.Empty);
        createdBooking.SpaceId.Should().Be(_testSpaceId);
        createdBooking.UserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequestForMissingUserId()
    {
        // Arrange
        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = _testSpaceId,
            UserId = Guid.Empty,
            StartDatetime = DateTime.UtcNow,
            EndDatetime = DateTime.UtcNow.AddHours(8)
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequestForMissingSpaceId()
    {
        // Arrange
        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = Guid.Empty,
            UserId = _testUserId,
            StartDatetime = DateTime.UtcNow,
            EndDatetime = DateTime.UtcNow.AddHours(8)
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequestForNonExistentSpace()
    {
        // Arrange
        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = Guid.NewGuid(),
            UserId = _testUserId,
            StartDatetime = DateTime.UtcNow,
            EndDatetime = DateTime.UtcNow.AddHours(8)
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequestForNonExistentUser()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.SaveChangesAsync();

        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = _testSpaceId,
            UserId = Guid.NewGuid(),
            StartDatetime = DateTime.UtcNow,
            EndDatetime = DateTime.UtcNow.AddHours(8)
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateBooking_ReturnsConflictForOverlappingBooking()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var user = CreateUser();
        var existingBooking = CreateBooking(
            startDatetime: DateTime.UtcNow,
            endDatetime: DateTime.UtcNow.AddHours(8));

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.Users.AddAsync(user);
        await _context.Bookings.AddAsync(existingBooking);
        await _context.SaveChangesAsync();

        var request = new CreateBookingRequest
        {
            TenantId = _testTenantId,
            SpaceId = _testSpaceId,
            UserId = _testUserId,
            StartDatetime = DateTime.UtcNow.AddHours(1), // Overlaps with existing
            EndDatetime = DateTime.UtcNow.AddHours(9)
        };

        // Act
        var result = await _controller.CreateBooking(request);

        // Assert
        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    #endregion

    #region DeleteBooking Tests

    [Fact]
    public async Task DeleteBooking_SoftDeletesBooking()
    {
        // Arrange
        var booking = CreateBooking();
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteBooking(_testBookingId, reason: "Test deletion");

        // Assert
        result.Should().BeOfType<NoContentResult>();

        // Verify soft deleted
        var deleted = await _context.Bookings.IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == _testBookingId);
        deleted!.IsDeleted.Should().BeTrue();
        deleted.DeletionReason.Should().Be("Test deletion");
        deleted.DeletedByUserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task DeleteBooking_ReturnsNotFoundForMissingBooking()
    {
        // Act
        var result = await _controller.DeleteBooking(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task HardDeleteBooking_PermanentlyDeletesAndArchives()
    {
        // Arrange
        var booking = CreateBooking();
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.HardDeleteBooking(_testBookingId);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        // Verify permanently deleted
        var deleted = await _context.Bookings.IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == _testBookingId);
        deleted.Should().BeNull();

        // Verify archived
        var archive = await _context.DataArchives.FirstOrDefaultAsync(a => a.EntityId == _testBookingId);
        archive.Should().NotBeNull();
        archive!.EntityType.Should().Be("Booking");
        archive.Status.Should().Be(DataArchiveStatus.PermanentlyDeleted);
    }

    [Fact]
    public async Task HardDeleteBooking_ReturnsNotFoundForMissingBooking()
    {
        // Act
        var result = await _controller.HardDeleteBooking(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region RestoreBooking Tests

    [Fact]
    public async Task RestoreBooking_RestoresSoftDeletedBooking()
    {
        // Arrange
        var booking = CreateBooking(isDeleted: true);
        booking.DeletedAt = DateTime.UtcNow;
        booking.DeletedByUserId = _testUserId;
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.RestoreBooking(_testBookingId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        // Verify restored
        var restored = await _context.Bookings.FindAsync(_testBookingId);
        restored!.IsDeleted.Should().BeFalse();
        restored.DeletedAt.Should().BeNull();
        restored.DeletedByUserId.Should().BeNull();
    }

    [Fact]
    public async Task RestoreBooking_ReturnsNotFoundForNonDeletedBooking()
    {
        // Arrange
        var booking = CreateBooking(isDeleted: false);
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.RestoreBooking(_testBookingId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region CheckIn Tests

    [Fact]
    public async Task CheckIn_CreatesCheckInEvent()
    {
        // Arrange
        var booking = CreateBooking();
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        var request = new CheckInRequest
        {
            Method = "web",
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var result = await _controller.CheckIn(_testBookingId, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIn = okResult.Value.Should().BeOfType<CheckInEvent>().Subject;
        checkIn.BookingId.Should().Be(_testBookingId);
        checkIn.Status.Should().Be(CheckInStatus.CheckedIn);
    }

    [Fact]
    public async Task CheckIn_ReturnsConflictIfAlreadyCheckedIn()
    {
        // Arrange
        var booking = CreateBooking();
        var existingCheckIn = CreateCheckInEvent();

        await _context.Bookings.AddAsync(booking);
        await _context.CheckInEvents.AddAsync(existingCheckIn);
        await _context.SaveChangesAsync();

        var request = new CheckInRequest
        {
            Method = "web",
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var result = await _controller.CheckIn(_testBookingId, request);

        // Assert
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task CheckIn_ReturnsNotFoundForMissingBooking()
    {
        // Arrange
        var request = new CheckInRequest { Method = "web" };

        // Act
        var result = await _controller.CheckIn(Guid.NewGuid(), request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region CheckOut Tests

    [Fact]
    public async Task CheckOut_UpdatesCheckInEventStatus()
    {
        // Arrange
        var booking = CreateBooking();
        var checkIn = CreateCheckInEvent();

        await _context.Bookings.AddAsync(booking);
        await _context.CheckInEvents.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        var request = new CheckInRequest
        {
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var result = await _controller.CheckOut(_testBookingId, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var checkedOut = okResult.Value.Should().BeOfType<CheckInEvent>().Subject;
        checkedOut.Status.Should().Be(CheckInStatus.CheckedOut);
    }

    [Fact]
    public async Task CheckOut_ReturnsNotFoundIfNoCheckIn()
    {
        // Arrange
        var booking = CreateBooking();
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        var request = new CheckInRequest
        {
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var result = await _controller.CheckOut(_testBookingId, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CheckOut_ReturnsBadRequestIfNotCheckedIn()
    {
        // Arrange
        var booking = CreateBooking();
        var checkIn = CreateCheckInEvent(status: CheckInStatus.CheckedOut);

        await _context.Bookings.AddAsync(booking);
        await _context.CheckInEvents.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        var request = new CheckInRequest
        {
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Act
        var result = await _controller.CheckOut(_testBookingId, request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region GetCheckIns Tests

    [Fact]
    public async Task GetCheckIns_ReturnsCheckInEvents()
    {
        // Arrange
        var booking = CreateBooking();
        var checkIn1 = CreateCheckInEvent(checkInDate: DateOnly.FromDateTime(DateTime.UtcNow));
        var checkIn2 = CreateCheckInEvent(id: Guid.NewGuid(), checkInDate: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)));

        await _context.Bookings.AddAsync(booking);
        await _context.CheckInEvents.AddRangeAsync(checkIn1, checkIn2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetCheckIns(_testBookingId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIns = (okResult.Value as IEnumerable<CheckInEvent>)!.ToList();
        checkIns.Should().HaveCount(2);
    }

    #endregion

    #region GetOffices Tests

    [Fact]
    public async Task GetOffices_ReturnsAllOffices()
    {
        // Arrange
        var office1 = CreateOffice(name: "Office 1");
        var office2 = CreateOffice(id: Guid.NewGuid(), name: "Office 2");

        await _context.Offices.AddRangeAsync(office1, office2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOffices();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var offices = (okResult.Value as IEnumerable<Office>)!.ToList();
        offices.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetOffices_FiltersByTenantId()
    {
        // Arrange
        var otherTenantId = Guid.NewGuid();
        var office1 = CreateOffice(name: "My Office");
        var office2 = CreateOffice(id: Guid.NewGuid(), tenantId: otherTenantId, name: "Other Office");

        await _context.Offices.AddRangeAsync(office1, office2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOffices(tenantId: _testTenantId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var offices = (okResult.Value as IEnumerable<Office>)!.ToList();
        offices.Should().HaveCount(1);
        offices[0].Name.Should().Be("My Office");
    }

    #endregion

    #region GetSpaces Tests

    [Fact]
    public async Task GetSpaces_ReturnsAllSpaces()
    {
        // Arrange
        var office = CreateOffice();
        var space1 = CreateSpace(name: "Space 1");
        var space2 = CreateSpace(id: Guid.NewGuid(), name: "Space 2");

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddRangeAsync(space1, space2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSpaces();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var spaces = (okResult.Value as IEnumerable<Space>)!.ToList();
        spaces.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetSpaces_FiltersByOfficeId()
    {
        // Arrange
        var office1 = CreateOffice();
        var office2Id = Guid.NewGuid();
        var office2 = CreateOffice(id: office2Id, name: "Office 2");
        var space1 = CreateSpace(name: "Space 1");
        var space2 = CreateSpace(id: Guid.NewGuid(), officeId: office2Id, name: "Space 2");

        await _context.Offices.AddRangeAsync(office1, office2);
        await _context.Spaces.AddRangeAsync(space1, space2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSpaces(officeId: _testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var spaces = (okResult.Value as IEnumerable<Space>)!.ToList();
        spaces.Should().HaveCount(1);
        spaces[0].Name.Should().Be("Space 1");
    }

    [Fact]
    public async Task GetSpaces_FiltersByType()
    {
        // Arrange
        var office = CreateOffice();
        var desk = CreateSpace(type: SpaceType.Desk);
        var conferenceRoom = CreateSpace(id: Guid.NewGuid(), name: "Conference", type: SpaceType.ConferenceRoom);

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddRangeAsync(desk, conferenceRoom);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSpaces(type: SpaceType.ConferenceRoom);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var spaces = (okResult.Value as IEnumerable<Space>)!.ToList();
        spaces.Should().HaveCount(1);
        spaces[0].Type.Should().Be(SpaceType.ConferenceRoom);
    }

    #endregion
}

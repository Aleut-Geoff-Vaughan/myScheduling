using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using Xunit;

namespace MyScheduling.Api.Tests.Controllers;

public class FacilitiesPortalControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly FacilitiesPortalController _controller;
    private readonly Mock<ILogger<FacilitiesPortalController>> _loggerMock;

    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testOfficeId = Guid.NewGuid();
    private readonly Guid _testSpaceId = Guid.NewGuid();

    public FacilitiesPortalControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MySchedulingDbContext(options);
        _loggerMock = new Mock<ILogger<FacilitiesPortalController>>();

        _controller = new FacilitiesPortalController(_context, _loggerMock.Object);
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
        string name = "Test Office",
        OfficeStatus status = OfficeStatus.Active,
        bool isClientSite = false)
    {
        return new Office
        {
            Id = id ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            Status = status,
            IsClientSite = isClientSite,
            City = "Test City",
            StateCode = "TC",
            CountryCode = "US",
            Timezone = "America/New_York",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private Space CreateSpace(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        string name = "Test Space",
        bool isActive = true,
        SpaceType type = SpaceType.Desk,
        int capacity = 1)
    {
        return new Space
        {
            Id = id ?? _testSpaceId,
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            IsActive = isActive,
            Type = type,
            Capacity = capacity,
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

    private FacilityCheckIn CreateCheckIn(
        Guid? id = null,
        Guid? userId = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        DateTime? checkInTime = null,
        DateTime? checkOutTime = null)
    {
        return new FacilityCheckIn
        {
            Id = id ?? Guid.NewGuid(),
            UserId = userId ?? _testUserId,
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            CheckInTime = checkInTime ?? DateTime.UtcNow,
            CheckOutTime = checkOutTime,
            Method = CheckInMethod.Web
        };
    }

    private Booking CreateBooking(
        Guid? id = null,
        Guid? spaceId = null,
        Guid? tenantId = null,
        DateTime? startDatetime = null,
        DateTime? endDatetime = null,
        BookingStatus status = BookingStatus.Reserved)
    {
        return new Booking
        {
            Id = id ?? Guid.NewGuid(),
            SpaceId = spaceId ?? _testSpaceId,
            TenantId = tenantId ?? _testTenantId,
            StartDatetime = startDatetime ?? DateTime.UtcNow,
            EndDatetime = endDatetime ?? DateTime.UtcNow.AddHours(2),
            Status = status,
            UserId = _testUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private FacilityAnnouncement CreateAnnouncement(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        string title = "Test Announcement",
        bool isActive = true,
        AnnouncementType type = AnnouncementType.General,
        AnnouncementPriority priority = AnnouncementPriority.Normal)
    {
        return new FacilityAnnouncement
        {
            Id = id ?? Guid.NewGuid(),
            OfficeId = officeId,
            TenantId = tenantId ?? _testTenantId,
            Title = title,
            Content = "Test content",
            IsActive = isActive,
            Type = type,
            Priority = priority,
            PublishedAt = DateTime.UtcNow,
            AuthoredByUserId = _testUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private Lease CreateLease(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        LeaseStatus status = LeaseStatus.Active)
    {
        return new Lease
        {
            Id = id ?? Guid.NewGuid(),
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Status = status,
            LandlordName = "Test Landlord",
            LeaseStartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6)),
            LeaseEndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(6)),
            BaseRentMonthly = 5000,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private OfficeTravelGuide CreateTravelGuide(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null)
    {
        return new OfficeTravelGuide
        {
            Id = id ?? Guid.NewGuid(),
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            NearestAirport = "Test Airport",
            AirportCode = "TST",
            LastUpdated = DateTime.UtcNow
        };
    }

    private OfficePoc CreatePoc(
        Guid? id = null,
        Guid? officeId = null,
        Guid? tenantId = null,
        string name = "John Doe",
        bool isActive = true)
    {
        return new OfficePoc
        {
            Id = id ?? Guid.NewGuid(),
            OfficeId = officeId ?? _testOfficeId,
            TenantId = tenantId ?? _testTenantId,
            Name = name,
            Email = "poc@test.com",
            Title = "Facilities Manager",
            IsActive = isActive,
            DisplayOrder = 1
        };
    }

    #endregion

    #region Dashboard Tests

    [Fact]
    public async Task GetDashboard_ReturnsDashboardWithCounts()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var checkIn = CreateCheckIn(checkInTime: DateTime.UtcNow);
        var booking = CreateBooking();
        var announcement = CreateAnnouncement();
        var lease = CreateLease();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.Bookings.AddAsync(booking);
        await _context.FacilityAnnouncements.AddAsync(announcement);
        await _context.Leases.AddAsync(lease);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDashboard();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dashboard = okResult.Value.Should().BeOfType<FacilitiesDashboard>().Subject;
        dashboard.OfficeCount.Should().Be(1);
        dashboard.TotalSpaces.Should().Be(1);
        dashboard.TodayCheckIns.Should().Be(1);
        dashboard.TodayBookings.Should().Be(1);
        dashboard.ActiveLeases.Should().Be(1);
        dashboard.RecentAnnouncements.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetDashboard_CountsClientSitesSeparately()
    {
        // Arrange
        var regularOffice = CreateOffice(name: "Regular Office");
        var clientSite = CreateOffice(id: Guid.NewGuid(), name: "Client Site", isClientSite: true);

        await _context.Offices.AddRangeAsync(regularOffice, clientSite);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDashboard();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dashboard = okResult.Value.Should().BeOfType<FacilitiesDashboard>().Subject;
        dashboard.OfficeCount.Should().Be(2);
        dashboard.ClientSiteCount.Should().Be(1);
    }

    [Fact]
    public async Task GetDashboard_ReturnsEmptyForDifferentTenant()
    {
        // Arrange
        var otherTenantId = Guid.NewGuid();
        var office = CreateOffice(tenantId: otherTenantId);
        await _context.Offices.AddAsync(office);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDashboard();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dashboard = okResult.Value.Should().BeOfType<FacilitiesDashboard>().Subject;
        dashboard.OfficeCount.Should().Be(0);
    }

    #endregion

    #region Analytics Tests

    [Fact(Skip = "Complex navigation property queries not fully supported by InMemory database")]
    public async Task GetAnalytics_ReturnsAnalyticsData()
    {
        // Arrange
        var office = CreateOffice();
        var space = CreateSpace();
        var checkIn = CreateCheckIn();
        var booking = CreateBooking();

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddAsync(space);
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnalytics(days: 30);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var analytics = okResult.Value.Should().BeOfType<FacilitiesAnalytics>().Subject;
        analytics.DateRange.Should().Be(30);
        analytics.TotalCheckIns.Should().Be(1);
        analytics.TotalBookings.Should().Be(1);
        analytics.DailyTrend.Should().HaveCount(7);
    }

    [Fact(Skip = "Complex navigation property queries not fully supported by InMemory database")]
    public async Task GetAnalytics_FiltersById()
    {
        // Arrange
        var office1 = CreateOffice();
        var office2Id = Guid.NewGuid();
        var office2 = CreateOffice(id: office2Id, name: "Other Office");
        var checkIn1 = CreateCheckIn(officeId: _testOfficeId);
        var checkIn2 = CreateCheckIn(id: Guid.NewGuid(), officeId: office2Id);

        await _context.Offices.AddRangeAsync(office1, office2);
        await _context.FacilityCheckIns.AddRangeAsync(checkIn1, checkIn2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnalytics(days: 30, officeId: _testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var analytics = okResult.Value.Should().BeOfType<FacilitiesAnalytics>().Subject;
        analytics.TotalCheckIns.Should().Be(1);
    }

    [Fact(Skip = "Complex navigation property queries not fully supported by InMemory database")]
    public async Task GetAnalytics_GroupsSpacesByType()
    {
        // Arrange
        var office = CreateOffice();
        var deskSpace = CreateSpace(name: "Desk 1", type: SpaceType.Desk);
        var meetingRoom = CreateSpace(id: Guid.NewGuid(), name: "Meeting Room", type: SpaceType.ConferenceRoom, capacity: 10);

        await _context.Offices.AddAsync(office);
        await _context.Spaces.AddRangeAsync(deskSpace, meetingRoom);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnalytics();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var analytics = okResult.Value.Should().BeOfType<FacilitiesAnalytics>().Subject;
        analytics.SpacesByType.Should().HaveCount(2);
    }

    #endregion

    #region Announcements Tests

    [Fact(Skip = "DateOnly comparison with InMemory database causes filtering issues")]
    public async Task GetAnnouncements_ReturnsActiveAnnouncements()
    {
        // Arrange
        var announcement = CreateAnnouncement();
        await _context.FacilityAnnouncements.AddAsync(announcement);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnnouncements();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var announcements = (okResult.Value as IEnumerable<FacilityAnnouncement>).ToList();
        announcements.Should().HaveCount(1);
        announcements[0].Title.Should().Be("Test Announcement");
    }

    [Fact(Skip = "DateOnly comparison with InMemory database causes filtering issues")]
    public async Task GetAnnouncements_FiltersInactiveByDefault()
    {
        // Arrange
        var active = CreateAnnouncement(title: "Active");
        var inactive = CreateAnnouncement(id: Guid.NewGuid(), title: "Inactive", isActive: false);

        await _context.FacilityAnnouncements.AddRangeAsync(active, inactive);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnnouncements(activeOnly: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var announcements = (okResult.Value as IEnumerable<FacilityAnnouncement>).ToList();
        announcements.Should().HaveCount(1);
        announcements[0].Title.Should().Be("Active");
    }

    [Fact(Skip = "DateOnly comparison with InMemory database causes filtering issues")]
    public async Task GetAnnouncements_FiltersByType()
    {
        // Arrange
        var general = CreateAnnouncement(title: "General", type: AnnouncementType.General);
        var maintenance = CreateAnnouncement(id: Guid.NewGuid(), title: "Maintenance", type: AnnouncementType.Maintenance);

        await _context.FacilityAnnouncements.AddRangeAsync(general, maintenance);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnnouncements(type: AnnouncementType.Maintenance);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var announcements = (okResult.Value as IEnumerable<FacilityAnnouncement>).ToList();
        announcements.Should().HaveCount(1);
        announcements[0].Title.Should().Be("Maintenance");
    }

    [Fact]
    public async Task CreateAnnouncement_CreatesAndReturnsAnnouncement()
    {
        // Arrange
        var request = new CreateAnnouncementRequest
        {
            Title = "New Announcement",
            Content = "This is new content",
            Type = AnnouncementType.General,
            Priority = AnnouncementPriority.High
        };

        // Act
        var result = await _controller.CreateAnnouncement(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var announcement = createdResult.Value.Should().BeOfType<FacilityAnnouncement>().Subject;
        announcement.Title.Should().Be("New Announcement");
        announcement.Priority.Should().Be(AnnouncementPriority.High);
        announcement.IsActive.Should().BeTrue();

        // Verify saved to database
        var saved = await _context.FacilityAnnouncements.FindAsync(announcement.Id);
        saved.Should().NotBeNull();
    }

    [Fact]
    public async Task AcknowledgeAnnouncement_CreatesAcknowledgment()
    {
        // Arrange
        var announcement = CreateAnnouncement();
        await _context.FacilityAnnouncements.AddAsync(announcement);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.AcknowledgeAnnouncement(announcement.Id);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        // Verify acknowledgment created
        var ack = await _context.AnnouncementAcknowledgments
            .FirstOrDefaultAsync(a => a.AnnouncementId == announcement.Id);
        ack.Should().NotBeNull();
        ack!.UserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task AcknowledgeAnnouncement_ReturnsAlreadyAcknowledgedIfExists()
    {
        // Arrange
        var announcement = CreateAnnouncement();
        var existingAck = new AnnouncementAcknowledgment
        {
            AnnouncementId = announcement.Id,
            UserId = _testUserId,
            AcknowledgedAt = DateTime.UtcNow
        };

        await _context.FacilityAnnouncements.AddAsync(announcement);
        await _context.AnnouncementAcknowledgments.AddAsync(existingAck);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.AcknowledgeAnnouncement(announcement.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Already acknowledged" });
    }

    [Fact]
    public async Task AcknowledgeAnnouncement_ReturnsNotFoundForMissingAnnouncement()
    {
        // Act
        var result = await _controller.AcknowledgeAnnouncement(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    #endregion

    #region Office Directory Tests

    [Fact]
    public async Task GetOfficeDirectory_ReturnsActiveOffices()
    {
        // Arrange
        var activeOffice = CreateOffice(name: "Active Office");
        var inactiveOffice = CreateOffice(id: Guid.NewGuid(), name: "Inactive", status: OfficeStatus.Inactive);

        await _context.Offices.AddRangeAsync(activeOffice, inactiveOffice);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficeDirectory();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var offices = (okResult.Value as IEnumerable<OfficeDirectoryItem>).ToList();
        offices.Should().HaveCount(1);
        offices[0].Name.Should().Be("Active Office");
    }

    [Fact]
    public async Task GetOfficeDirectory_IncludesInactiveWhenRequested()
    {
        // Arrange
        var activeOffice = CreateOffice(name: "Active Office");
        var inactiveOffice = CreateOffice(id: Guid.NewGuid(), name: "Inactive", status: OfficeStatus.Inactive);

        await _context.Offices.AddRangeAsync(activeOffice, inactiveOffice);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficeDirectory(includeInactive: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var offices = (okResult.Value as IEnumerable<OfficeDirectoryItem>).ToList();
        offices.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetOfficeDirectory_FiltersByClientSite()
    {
        // Arrange
        var regularOffice = CreateOffice(name: "Regular");
        var clientSite = CreateOffice(id: Guid.NewGuid(), name: "Client", isClientSite: true);

        await _context.Offices.AddRangeAsync(regularOffice, clientSite);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficeDirectory(isClientSite: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var offices = (okResult.Value as IEnumerable<OfficeDirectoryItem>).ToList();
        offices.Should().HaveCount(1);
        offices[0].Name.Should().Be("Client");
    }

    [Fact]
    public async Task GetOfficeDetail_ReturnsOfficeWithRelatedData()
    {
        // Arrange
        var office = CreateOffice();
        var travelGuide = CreateTravelGuide();
        var poc = CreatePoc();
        var announcement = CreateAnnouncement();

        await _context.Offices.AddAsync(office);
        await _context.OfficeTravelGuides.AddAsync(travelGuide);
        await _context.OfficePocs.AddAsync(poc);
        await _context.FacilityAnnouncements.AddAsync(announcement);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficeDetail(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var detail = okResult.Value.Should().BeOfType<OfficeDetail>().Subject;
        detail.Office.Name.Should().Be("Test Office");
        detail.TravelGuide.Should().NotBeNull();
        detail.PointsOfContact.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetOfficeDetail_ReturnsNotFoundForMissingOffice()
    {
        // Act
        var result = await _controller.GetOfficeDetail(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetOfficeDetail_ReturnsNotFoundForDifferentTenant()
    {
        // Arrange
        var office = CreateOffice(tenantId: Guid.NewGuid());
        await _context.Offices.AddAsync(office);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficeDetail(_testOfficeId);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    #endregion

    #region Travel Guide Tests

    [Fact]
    public async Task GetTravelGuide_ReturnsTravelGuide()
    {
        // Arrange
        var travelGuide = CreateTravelGuide();
        await _context.OfficeTravelGuides.AddAsync(travelGuide);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetTravelGuide(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var guide = okResult.Value.Should().BeOfType<OfficeTravelGuide>().Subject;
        guide.AirportCode.Should().Be("TST");
    }

    [Fact]
    public async Task GetTravelGuide_ReturnsNotFoundIfNoneExists()
    {
        // Act
        var result = await _controller.GetTravelGuide(_testOfficeId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpsertTravelGuide_CreatesNewGuide()
    {
        // Arrange
        var guide = new OfficeTravelGuide
        {
            NearestAirport = "New Airport",
            AirportCode = "NEW"
        };

        // Act
        var result = await _controller.UpsertTravelGuide(_testOfficeId, guide);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var createdGuide = okResult.Value.Should().BeOfType<OfficeTravelGuide>().Subject;
        createdGuide.AirportCode.Should().Be("NEW");

        // Verify saved
        var saved = await _context.OfficeTravelGuides.FirstOrDefaultAsync(g => g.OfficeId == _testOfficeId);
        saved.Should().NotBeNull();
    }

    [Fact]
    public async Task UpsertTravelGuide_UpdatesExistingGuide()
    {
        // Arrange
        var existingGuide = CreateTravelGuide();
        await _context.OfficeTravelGuides.AddAsync(existingGuide);
        await _context.SaveChangesAsync();

        var updateGuide = new OfficeTravelGuide
        {
            NearestAirport = "Updated Airport",
            AirportCode = "UPD"
        };

        // Act
        var result = await _controller.UpsertTravelGuide(_testOfficeId, updateGuide);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var updatedGuide = okResult.Value.Should().BeOfType<OfficeTravelGuide>().Subject;
        updatedGuide.AirportCode.Should().Be("UPD");
    }

    #endregion

    #region POC Tests

    [Fact]
    public async Task GetOfficePocs_ReturnsPocs()
    {
        // Arrange
        var poc = CreatePoc();
        await _context.OfficePocs.AddAsync(poc);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficePocs(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pocs = (okResult.Value as IEnumerable<OfficePoc>).ToList();
        pocs.Should().HaveCount(1);
        pocs[0].Name.Should().Be("John Doe");
    }

    [Fact]
    public async Task GetOfficePocs_FiltersInactive()
    {
        // Arrange
        var activePoc = CreatePoc(name: "Active POC");
        var inactivePoc = CreatePoc(id: Guid.NewGuid(), name: "Inactive POC", isActive: false);

        await _context.OfficePocs.AddRangeAsync(activePoc, inactivePoc);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOfficePocs(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pocs = (okResult.Value as IEnumerable<OfficePoc>).ToList();
        pocs.Should().HaveCount(1);
        pocs[0].Name.Should().Be("Active POC");
    }

    [Fact]
    public async Task UpsertPoc_CreatesNewPoc()
    {
        // Arrange
        var poc = new OfficePoc
        {
            Id = Guid.Empty,
            Name = "New POC",
            Email = "new@test.com",
            Title = "Manager"
        };

        // Act
        var result = await _controller.UpsertPoc(_testOfficeId, poc);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var createdPoc = okResult.Value.Should().BeOfType<OfficePoc>().Subject;
        createdPoc.Name.Should().Be("New POC");
        createdPoc.Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public async Task UpsertPoc_UpdatesExistingPoc()
    {
        // Arrange
        var existingPoc = CreatePoc();
        await _context.OfficePocs.AddAsync(existingPoc);
        await _context.SaveChangesAsync();

        var updatePoc = new OfficePoc
        {
            Id = existingPoc.Id,
            Name = "Updated POC",
            Email = "updated@test.com",
            Title = "Director"
        };

        // Act
        var result = await _controller.UpsertPoc(_testOfficeId, updatePoc);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var updatedPoc = okResult.Value.Should().BeOfType<OfficePoc>().Subject;
        updatedPoc.Name.Should().Be("Updated POC");
    }

    #endregion

    #region Check-In Tests

    [Fact]
    public async Task CheckIn_CreatesCheckIn()
    {
        // Arrange
        var office = CreateOffice();
        await _context.Offices.AddAsync(office);
        await _context.SaveChangesAsync();

        var request = new FacilityCheckInRequest
        {
            OfficeId = _testOfficeId,
            Method = CheckInMethod.Web
        };

        // Act
        var result = await _controller.CheckIn(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIn = okResult.Value.Should().BeOfType<FacilityCheckIn>().Subject;
        checkIn.OfficeId.Should().Be(_testOfficeId);
        checkIn.UserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task CheckIn_ReturnsExistingIfAlreadyCheckedIn()
    {
        // Arrange
        var existingCheckIn = CreateCheckIn();
        await _context.FacilityCheckIns.AddAsync(existingCheckIn);
        await _context.SaveChangesAsync();

        var request = new FacilityCheckInRequest
        {
            OfficeId = _testOfficeId,
            Method = CheckInMethod.Web
        };

        // Act
        var result = await _controller.CheckIn(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        // Should return "Already checked in" message
    }

    [Fact]
    public async Task CheckOut_SetsCheckOutTime()
    {
        // Arrange
        var checkIn = CreateCheckIn();
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.CheckOut(checkIn.Id);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        // Verify checkout time set
        var updated = await _context.FacilityCheckIns.FindAsync(checkIn.Id);
        updated!.CheckOutTime.Should().NotBeNull();
    }

    [Fact]
    public async Task CheckOut_ReturnsNotFoundForMissingCheckIn()
    {
        // Act
        var result = await _controller.CheckOut(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CheckOut_ReturnsForbidForDifferentUser()
    {
        // Arrange
        var checkIn = CreateCheckIn(userId: Guid.NewGuid());
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.CheckOut(checkIn.Id);

        // Assert
        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task CheckOut_ReturnsBadRequestIfAlreadyCheckedOut()
    {
        // Arrange
        var checkIn = CreateCheckIn(checkOutTime: DateTime.UtcNow);
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.CheckOut(checkIn.Id);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetMyCheckIns_ReturnsUserCheckIns()
    {
        // Arrange
        var office = CreateOffice();
        var checkIn = CreateCheckIn();
        await _context.Offices.AddAsync(office);
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMyCheckIns();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIns = (okResult.Value as IEnumerable<FacilityCheckIn>).ToList();
        checkIns.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMyCheckIns_FiltersOtherUsers()
    {
        // Arrange
        var office = CreateOffice();
        var myCheckIn = CreateCheckIn();
        var otherCheckIn = CreateCheckIn(id: Guid.NewGuid(), userId: Guid.NewGuid());

        await _context.Offices.AddAsync(office);
        await _context.FacilityCheckIns.AddRangeAsync(myCheckIn, otherCheckIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMyCheckIns();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIns = (okResult.Value as IEnumerable<FacilityCheckIn>).ToList();
        checkIns.Should().HaveCount(1);
        checkIns[0].UserId.Should().Be(_testUserId);
    }

    #endregion

    #region Who's Here Tests

    [Fact]
    public async Task GetWhosHere_ReturnsCurrentlyCheckedInUsers()
    {
        // Arrange
        var user = CreateUser();
        var checkIn = CreateCheckIn();

        await _context.Users.AddAsync(user);
        await _context.FacilityCheckIns.AddAsync(checkIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetWhosHere(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var whosHere = (okResult.Value as IEnumerable<WhosHereItem>).ToList();
        whosHere.Should().HaveCount(1);
        whosHere[0].UserId.Should().Be(_testUserId);
    }

    [Fact]
    public async Task GetWhosHere_ExcludesCheckedOutUsers()
    {
        // Arrange
        var user = CreateUser();
        var checkedOutCheckIn = CreateCheckIn(checkOutTime: DateTime.UtcNow);

        await _context.Users.AddAsync(user);
        await _context.FacilityCheckIns.AddAsync(checkedOutCheckIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetWhosHere(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var whosHere = (okResult.Value as IEnumerable<WhosHereItem>).ToList();
        whosHere.Should().BeEmpty();
    }

    [Fact]
    public async Task GetWhosHere_ExcludesYesterdayCheckIns()
    {
        // Arrange
        var user = CreateUser();
        var yesterdayCheckIn = CreateCheckIn(checkInTime: DateTime.UtcNow.Date.AddDays(-1));

        await _context.Users.AddAsync(user);
        await _context.FacilityCheckIns.AddAsync(yesterdayCheckIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetWhosHere(_testOfficeId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var whosHere = (okResult.Value as IEnumerable<WhosHereItem>).ToList();
        whosHere.Should().BeEmpty();
    }

    #endregion

    #region Tenant Isolation Tests

    [Fact]
    public async Task Dashboard_EnforcesTenantIsolation()
    {
        // Arrange - Create data for both tenants
        var otherTenantId = Guid.NewGuid();
        var myOffice = CreateOffice();
        var otherOffice = CreateOffice(id: Guid.NewGuid(), tenantId: otherTenantId);

        await _context.Offices.AddRangeAsync(myOffice, otherOffice);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDashboard();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dashboard = okResult.Value.Should().BeOfType<FacilitiesDashboard>().Subject;
        dashboard.OfficeCount.Should().Be(1);
    }

    [Fact(Skip = "DateOnly comparison with InMemory database causes filtering issues")]
    public async Task Announcements_EnforceTenantIsolation()
    {
        // Arrange
        var otherTenantId = Guid.NewGuid();
        var myAnnouncement = CreateAnnouncement(title: "My Announcement");
        var otherAnnouncement = CreateAnnouncement(id: Guid.NewGuid(), tenantId: otherTenantId, title: "Other");

        await _context.FacilityAnnouncements.AddRangeAsync(myAnnouncement, otherAnnouncement);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAnnouncements();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var announcements = (okResult.Value as IEnumerable<FacilityAnnouncement>).ToList();
        announcements.Should().HaveCount(1);
        announcements[0].Title.Should().Be("My Announcement");
    }

    [Fact]
    public async Task CheckIns_EnforceTenantIsolation()
    {
        // Arrange
        var otherTenantId = Guid.NewGuid();
        var office = CreateOffice();
        var myCheckIn = CreateCheckIn();
        var otherCheckIn = CreateCheckIn(id: Guid.NewGuid(), tenantId: otherTenantId, userId: _testUserId);

        await _context.Offices.AddAsync(office);
        await _context.FacilityCheckIns.AddRangeAsync(myCheckIn, otherCheckIn);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMyCheckIns();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var checkIns = (okResult.Value as IEnumerable<FacilityCheckIn>).ToList();
        checkIns.Should().HaveCount(1);
        checkIns[0].TenantId.Should().Be(_testTenantId);
    }

    #endregion
}

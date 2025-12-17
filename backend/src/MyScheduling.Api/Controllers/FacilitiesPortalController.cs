using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Facilities Portal API - Dashboard and common endpoints
/// </summary>
[ApiController]
[Route("api/facilities-portal")]
public class FacilitiesPortalController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<FacilitiesPortalController> _logger;

    public FacilitiesPortalController(MySchedulingDbContext context, ILogger<FacilitiesPortalController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== DASHBOARD ====================

    /// <summary>
    /// Get facilities portal dashboard summary
    /// </summary>
    [HttpGet("dashboard")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<FacilitiesDashboard>> GetDashboard()
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Count offices
            var officeCount = await _context.Offices
                .Where(o => o.TenantId == tenantId.Value && o.Status == OfficeStatus.Active)
                .CountAsync();

            var clientSiteCount = await _context.Offices
                .Where(o => o.TenantId == tenantId.Value && o.Status == OfficeStatus.Active && o.IsClientSite)
                .CountAsync();

            // Count spaces
            var totalSpaces = await _context.Spaces
                .Where(s => s.TenantId == tenantId.Value && s.IsActive)
                .CountAsync();

            // Today's bookings
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var todayBookings = await _context.Bookings
                .Where(b => b.TenantId == tenantId.Value &&
                       b.StartDatetime < todayEnd &&
                       (b.EndDatetime == null || b.EndDatetime > todayStart) &&
                       (b.Status == BookingStatus.Reserved || b.Status == BookingStatus.CheckedIn))
                .CountAsync();

            // Today's check-ins
            var todayCheckIns = await _context.FacilityCheckIns
                .Where(c => c.TenantId == tenantId.Value &&
                       c.CheckInTime >= todayStart && c.CheckInTime < todayEnd)
                .CountAsync();

            // Active leases
            var activeLeases = await _context.Leases
                .Where(l => l.TenantId == tenantId.Value &&
                       (l.Status == LeaseStatus.Active || l.Status == LeaseStatus.Expiring))
                .CountAsync();

            // Leases expiring soon (within 90 days)
            var expiringLeases = await _context.Leases
                .Where(l => l.TenantId == tenantId.Value &&
                       l.Status == LeaseStatus.Active &&
                       l.LeaseEndDate <= today.AddDays(90))
                .CountAsync();

            // Field assignments
            var activeFieldAssignments = await _context.FieldAssignments
                .Where(f => f.TenantId == tenantId.Value &&
                       f.Status == FieldAssignmentStatus.Active)
                .CountAsync();

            // Pending foreign travel
            var pendingTravel = await _context.ForeignTravelRecords
                .Where(f => f.TenantId == tenantId.Value &&
                       f.Status == ForeignTravelStatus.Pending)
                .CountAsync();

            // Recent announcements
            var activeAnnouncements = await _context.FacilityAnnouncements
                .Where(a => a.TenantId == tenantId.Value && a.IsActive &&
                       (a.ExpirationDate == null || a.ExpirationDate >= today))
                .OrderByDescending(a => a.Priority)
                .ThenByDescending(a => a.CreatedAt)
                .Take(5)
                .Select(a => new AnnouncementSummary
                {
                    Id = a.Id,
                    Title = a.Title,
                    Type = a.Type,
                    Priority = a.Priority,
                    OfficeName = a.Office != null ? a.Office.Name : "All Offices",
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            // Open maintenance requests
            var openMaintenance = await _context.SpaceMaintenanceLogs
                .Where(m => m.Space.TenantId == tenantId.Value &&
                       (m.Status == MaintenanceStatus.Reported ||
                        m.Status == MaintenanceStatus.Scheduled ||
                        m.Status == MaintenanceStatus.InProgress))
                .CountAsync();

            return Ok(new FacilitiesDashboard
            {
                OfficeCount = officeCount,
                ClientSiteCount = clientSiteCount,
                TotalSpaces = totalSpaces,
                TodayBookings = todayBookings,
                TodayCheckIns = todayCheckIns,
                ActiveLeases = activeLeases,
                ExpiringLeases = expiringLeases,
                ActiveFieldAssignments = activeFieldAssignments,
                PendingForeignTravel = pendingTravel,
                OpenMaintenanceRequests = openMaintenance,
                RecentAnnouncements = activeAnnouncements
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving facilities dashboard");
            return StatusCode(500, "An error occurred while retrieving dashboard");
        }
    }

    /// <summary>
    /// Get facilities usage analytics
    /// </summary>
    [HttpGet("analytics")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<FacilitiesAnalytics>> GetAnalytics(
        [FromQuery] int days = 30,
        [FromQuery] Guid? officeId = null)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var since = DateTime.UtcNow.AddDays(-days);
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            // Total spaces and their types
            var spacesQuery = _context.Spaces
                .Where(s => s.TenantId == tenantId.Value && s.IsActive);
            if (officeId.HasValue)
                spacesQuery = spacesQuery.Where(s => s.OfficeId == officeId.Value);

            var spacesByType = await spacesQuery
                .GroupBy(s => s.Type)
                .Select(g => new SpaceTypeStats
                {
                    Type = g.Key.ToString(),
                    Total = g.Count(),
                    Capacity = g.Sum(s => s.Capacity > 0 ? s.Capacity : 1)
                })
                .ToListAsync();

            // Check-ins in date range
            var checkInsQuery = _context.FacilityCheckIns
                .Where(c => c.TenantId == tenantId.Value && c.CheckInTime >= since);
            if (officeId.HasValue)
                checkInsQuery = checkInsQuery.Where(c => c.OfficeId == officeId.Value);

            var checkIns = await checkInsQuery.ToListAsync();

            // Bookings in date range
            var bookingsQuery = _context.Bookings
                .Where(b => b.TenantId == tenantId.Value && b.StartDatetime >= since);
            if (officeId.HasValue)
                bookingsQuery = bookingsQuery.Where(b => b.Space != null && b.Space.OfficeId == officeId.Value);

            var bookings = await bookingsQuery.ToListAsync();

            // Daily check-in trend (last 7 days)
            var dailyTrend = Enumerable.Range(0, 7)
                .Select(i =>
                {
                    var date = DateTime.UtcNow.Date.AddDays(-6 + i);
                    return new DailyTrendItem
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        DayName = date.DayOfWeek.ToString().Substring(0, 3),
                        CheckIns = checkIns.Count(c => c.CheckInTime.Date == date),
                        Bookings = bookings.Count(b => b.StartDatetime.Date == date)
                    };
                })
                .ToList();

            // Top offices by activity
            var topOffices = await _context.Offices
                .Where(o => o.TenantId == tenantId.Value && o.Status == OfficeStatus.Active)
                .Select(o => new TopOfficeItem
                {
                    OfficeId = o.Id,
                    Name = o.Name,
                    CheckIns = checkIns.Count(c => c.OfficeId == o.Id),
                    Bookings = bookings.Count(b => b.Space != null && b.Space.OfficeId == o.Id)
                })
                .OrderByDescending(o => o.CheckIns + o.Bookings)
                .Take(5)
                .ToListAsync();

            // Calculate averages
            var totalCheckIns = checkIns.Count;
            var totalBookings = bookings.Count;
            var avgDailyCheckIns = days > 0 ? (double)totalCheckIns / days : 0;
            var avgDailyBookings = days > 0 ? (double)totalBookings / days : 0;

            // Calculate today's utilization (simplified - based on bookings vs capacity)
            var todayBookings = bookings.Count(b => b.StartDatetime.Date == todayStart);
            var totalCapacity = spacesByType.Sum(s => s.Capacity);
            var currentOccupancy = totalCapacity > 0 ? (double)todayBookings / totalCapacity * 100 : 0;

            return Ok(new FacilitiesAnalytics
            {
                DateRange = days,
                TotalCheckIns = totalCheckIns,
                TotalBookings = totalBookings,
                AverageDailyCheckIns = Math.Round(avgDailyCheckIns, 1),
                AverageDailyBookings = Math.Round(avgDailyBookings, 1),
                CurrentOccupancyPercent = Math.Round(currentOccupancy, 1),
                SpacesByType = spacesByType,
                DailyTrend = dailyTrend,
                TopOffices = topOffices
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving facilities analytics");
            return StatusCode(500, "An error occurred while retrieving analytics");
        }
    }

    // ==================== ANNOUNCEMENTS ====================

    /// <summary>
    /// Get all active announcements
    /// </summary>
    [HttpGet("announcements")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<FacilityAnnouncement>>> GetAnnouncements(
        [FromQuery] Guid? officeId = null,
        [FromQuery] AnnouncementType? type = null,
        [FromQuery] bool activeOnly = true)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var query = _context.FacilityAnnouncements
                .Include(a => a.Office)
                .Include(a => a.AuthoredBy)
                .Where(a => a.TenantId == tenantId.Value)
                .AsNoTracking();

            if (officeId.HasValue)
            {
                query = query.Where(a => a.OfficeId == officeId.Value || a.OfficeId == null);
            }

            if (type.HasValue)
            {
                query = query.Where(a => a.Type == type.Value);
            }

            if (activeOnly)
            {
                query = query.Where(a => a.IsActive &&
                    (a.EffectiveDate == null || a.EffectiveDate <= today) &&
                    (a.ExpirationDate == null || a.ExpirationDate >= today));
            }

            var announcements = await query
                .OrderByDescending(a => a.Priority)
                .ThenByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(announcements);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving announcements");
            return StatusCode(500, "An error occurred while retrieving announcements");
        }
    }

    /// <summary>
    /// Create a new announcement
    /// </summary>
    [HttpPost("announcements")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Manage)]
    public async Task<ActionResult<FacilityAnnouncement>> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            var announcement = new FacilityAnnouncement
            {
                TenantId = tenantId.Value,
                OfficeId = request.OfficeId,
                Title = request.Title,
                Content = request.Content,
                Type = request.Type,
                Priority = request.Priority,
                EffectiveDate = request.EffectiveDate,
                ExpirationDate = request.ExpirationDate,
                RequiresAcknowledgment = request.RequiresAcknowledgment,
                AuthoredByUserId = userId.Value,
                PublishedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.FacilityAnnouncements.Add(announcement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAnnouncements), new { id = announcement.Id }, announcement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating announcement");
            return StatusCode(500, "An error occurred while creating announcement");
        }
    }

    /// <summary>
    /// Acknowledge an announcement
    /// </summary>
    [HttpPost("announcements/{id}/acknowledge")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult> AcknowledgeAnnouncement(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return BadRequest(new { message = "Invalid user context" });

            var announcement = await _context.FacilityAnnouncements.FindAsync(id);
            if (announcement == null)
                return NotFound();

            // Check if already acknowledged
            var existing = await _context.AnnouncementAcknowledgments
                .FirstOrDefaultAsync(a => a.AnnouncementId == id && a.UserId == userId.Value);

            if (existing != null)
                return Ok(new { message = "Already acknowledged" });

            var acknowledgment = new AnnouncementAcknowledgment
            {
                AnnouncementId = id,
                UserId = userId.Value,
                AcknowledgedAt = DateTime.UtcNow
            };

            _context.AnnouncementAcknowledgments.Add(acknowledgment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Acknowledged" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging announcement");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== OFFICE DIRECTORY ====================

    /// <summary>
    /// Get office directory with travel guide info
    /// </summary>
    [HttpGet("offices")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<OfficeDirectoryItem>>> GetOfficeDirectory(
        [FromQuery] bool? isClientSite = null,
        [FromQuery] bool includeInactive = false)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var query = _context.Offices
                .Where(o => o.TenantId == tenantId.Value)
                .AsNoTracking();

            if (!includeInactive)
            {
                query = query.Where(o => o.Status == OfficeStatus.Active);
            }

            if (isClientSite.HasValue)
            {
                query = query.Where(o => o.IsClientSite == isClientSite.Value);
            }

            var offices = await query
                .OrderBy(o => o.Name)
                .Select(o => new OfficeDirectoryItem
                {
                    Id = o.Id,
                    Name = o.Name,
                    Address = o.Address,
                    Address2 = o.Address2,
                    City = o.City,
                    StateCode = o.StateCode,
                    CountryCode = o.CountryCode,
                    Timezone = o.Timezone,
                    Status = o.Status,
                    IsClientSite = o.IsClientSite,
                    Latitude = o.Latitude,
                    Longitude = o.Longitude,
                    SpaceCount = o.Spaces.Count(s => s.IsActive),
                    HasTravelGuide = _context.OfficeTravelGuides.Any(g => g.OfficeId == o.Id),
                    HasLease = _context.Leases.Any(l => l.OfficeId == o.Id && l.Status == LeaseStatus.Active)
                })
                .ToListAsync();

            return Ok(offices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving office directory");
            return StatusCode(500, "An error occurred while retrieving office directory");
        }
    }

    /// <summary>
    /// Get office detail with travel guide
    /// </summary>
    [HttpGet("offices/{id}")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<OfficeDetail>> GetOfficeDetail(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var office = await _context.Offices
                .Where(o => o.Id == id && o.TenantId == tenantId.Value)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (office == null)
                return NotFound();

            var travelGuide = await _context.OfficeTravelGuides
                .Where(g => g.OfficeId == id)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            var pocs = await _context.OfficePocs
                .Include(p => p.User)
                .Where(p => p.OfficeId == id && p.IsActive)
                .OrderBy(p => p.DisplayOrder)
                .AsNoTracking()
                .ToListAsync();

            var clientSiteDetail = office.IsClientSite
                ? await _context.ClientSiteDetails
                    .Where(c => c.OfficeId == id)
                    .AsNoTracking()
                    .FirstOrDefaultAsync()
                : null;

            var activeAnnouncements = await _context.FacilityAnnouncements
                .Where(a => (a.OfficeId == id || a.OfficeId == null) &&
                       a.TenantId == tenantId.Value &&
                       a.IsActive)
                .OrderByDescending(a => a.Priority)
                .Take(5)
                .AsNoTracking()
                .ToListAsync();

            return Ok(new OfficeDetail
            {
                Office = office,
                TravelGuide = travelGuide,
                PointsOfContact = pocs,
                ClientSiteDetail = clientSiteDetail,
                ActiveAnnouncements = activeAnnouncements
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving office detail");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== TRAVEL GUIDES ====================

    /// <summary>
    /// Get or create travel guide for an office
    /// </summary>
    [HttpGet("offices/{officeId}/travel-guide")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<OfficeTravelGuide>> GetTravelGuide(Guid officeId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var guide = await _context.OfficeTravelGuides
                .Include(g => g.LastUpdatedBy)
                .Where(g => g.OfficeId == officeId && g.TenantId == tenantId.Value)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (guide == null)
                return NotFound(new { message = "No travel guide exists for this office" });

            return Ok(guide);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving travel guide");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Create or update travel guide
    /// </summary>
    [HttpPut("offices/{officeId}/travel-guide")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Manage)]
    public async Task<ActionResult<OfficeTravelGuide>> UpsertTravelGuide(Guid officeId, [FromBody] OfficeTravelGuide guide)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            var existing = await _context.OfficeTravelGuides
                .FirstOrDefaultAsync(g => g.OfficeId == officeId && g.TenantId == tenantId.Value);

            if (existing == null)
            {
                guide.Id = Guid.NewGuid();
                guide.TenantId = tenantId.Value;
                guide.OfficeId = officeId;
                guide.LastUpdatedByUserId = userId;
                guide.LastUpdated = DateTime.UtcNow;
                _context.OfficeTravelGuides.Add(guide);
            }
            else
            {
                // Update fields
                existing.NearestAirport = guide.NearestAirport;
                existing.AirportCode = guide.AirportCode;
                existing.AirportDistance = guide.AirportDistance;
                existing.RecommendedGroundTransport = guide.RecommendedGroundTransport;
                existing.PublicTransitOptions = guide.PublicTransitOptions;
                existing.DrivingDirections = guide.DrivingDirections;
                existing.ParkingInstructions = guide.ParkingInstructions;
                existing.ParkingDailyCost = guide.ParkingDailyCost;
                existing.RecommendedHotels = guide.RecommendedHotels;
                existing.CorporateHotelCode = guide.CorporateHotelCode;
                existing.NeighborhoodTips = guide.NeighborhoodTips;
                existing.BuildingHours = guide.BuildingHours;
                existing.AfterHoursAccess = guide.AfterHoursAccess;
                existing.VisitorCheckIn = guide.VisitorCheckIn;
                existing.SecurityRequirements = guide.SecurityRequirements;
                existing.BadgeInstructions = guide.BadgeInstructions;
                existing.DressCode = guide.DressCode;
                existing.CafeteriaInfo = guide.CafeteriaInfo;
                existing.NearbyRestaurants = guide.NearbyRestaurants;
                existing.WifiInstructions = guide.WifiInstructions;
                existing.ConferenceRoomBooking = guide.ConferenceRoomBooking;
                existing.PrintingInstructions = guide.PrintingInstructions;
                existing.Amenities = guide.Amenities;
                existing.ReceptionPhone = guide.ReceptionPhone;
                existing.SecurityPhone = guide.SecurityPhone;
                existing.FacilitiesEmail = guide.FacilitiesEmail;
                existing.EmergencyContact = guide.EmergencyContact;
                existing.WelcomeMessage = guide.WelcomeMessage;
                existing.ImportantNotes = guide.ImportantNotes;
                existing.PhotoGallery = guide.PhotoGallery;
                existing.VideoTourUrl = guide.VideoTourUrl;
                existing.VirtualTourUrl = guide.VirtualTourUrl;
                existing.CurrentAnnouncements = guide.CurrentAnnouncements;
                existing.SpecialInstructions = guide.SpecialInstructions;
                existing.CustomAttributes = guide.CustomAttributes;
                existing.LastUpdatedByUserId = userId;
                existing.LastUpdated = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(existing ?? guide);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating travel guide");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== OFFICE POCs ====================

    /// <summary>
    /// Get POCs for an office
    /// </summary>
    [HttpGet("offices/{officeId}/pocs")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<OfficePoc>>> GetOfficePocs(Guid officeId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var pocs = await _context.OfficePocs
                .Include(p => p.User)
                .Where(p => p.OfficeId == officeId && p.TenantId == tenantId.Value && p.IsActive)
                .OrderBy(p => p.DisplayOrder)
                .AsNoTracking()
                .ToListAsync();

            return Ok(pocs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving office POCs");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Add/update POC
    /// </summary>
    [HttpPost("offices/{officeId}/pocs")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Manage)]
    public async Task<ActionResult<OfficePoc>> UpsertPoc(Guid officeId, [FromBody] OfficePoc poc)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            if (poc.Id == Guid.Empty)
            {
                poc.Id = Guid.NewGuid();
                poc.TenantId = tenantId.Value;
                poc.OfficeId = officeId;
                _context.OfficePocs.Add(poc);
            }
            else
            {
                var existing = await _context.OfficePocs.FindAsync(poc.Id);
                if (existing == null)
                    return NotFound();

                existing.Name = poc.Name;
                existing.Title = poc.Title;
                existing.Email = poc.Email;
                existing.Phone = poc.Phone;
                existing.MobilePhone = poc.MobilePhone;
                existing.Role = poc.Role;
                existing.Responsibilities = poc.Responsibilities;
                existing.IsPrimary = poc.IsPrimary;
                existing.IsEmergencyContact = poc.IsEmergencyContact;
                existing.DisplayOrder = poc.DisplayOrder;
                existing.UserId = poc.UserId;
            }

            await _context.SaveChangesAsync();
            return Ok(poc);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting POC");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== CHECK-IN ====================

    /// <summary>
    /// Quick check-in to a facility
    /// </summary>
    [HttpPost("check-in")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<FacilityCheckIn>> CheckIn([FromBody] FacilityCheckInRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            // Check for existing check-in today
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var existingCheckIn = await _context.FacilityCheckIns
                .Where(c => c.TenantId == tenantId.Value &&
                       c.UserId == userId.Value &&
                       c.OfficeId == request.OfficeId &&
                       c.CheckInTime >= todayStart &&
                       c.CheckInTime < todayEnd &&
                       c.CheckOutTime == null)
                .FirstOrDefaultAsync();

            if (existingCheckIn != null)
            {
                return Ok(new { message = "Already checked in", checkIn = existingCheckIn });
            }

            var checkIn = new FacilityCheckIn
            {
                TenantId = tenantId.Value,
                UserId = userId.Value,
                OfficeId = request.OfficeId,
                SpaceId = request.SpaceId,
                CheckInTime = DateTime.UtcNow,
                Method = request.Method,
                BadgeId = request.BadgeId,
                QrCode = request.QrCode,
                DeviceInfo = request.DeviceInfo,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Notes = request.Notes
            };

            _context.FacilityCheckIns.Add(checkIn);
            await _context.SaveChangesAsync();

            return Ok(checkIn);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking in");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Check out from a facility
    /// </summary>
    [HttpPost("check-out/{checkInId}")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult> CheckOut(Guid checkInId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return BadRequest(new { message = "Invalid user context" });

            var checkIn = await _context.FacilityCheckIns.FindAsync(checkInId);
            if (checkIn == null)
                return NotFound();

            if (checkIn.UserId != userId.Value)
                return Forbid();

            if (checkIn.CheckOutTime.HasValue)
                return BadRequest(new { message = "Already checked out" });

            checkIn.CheckOutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Checked out successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking out");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Get current user's check-in status
    /// </summary>
    [HttpGet("my-check-ins")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<FacilityCheckIn>>> GetMyCheckIns([FromQuery] int days = 7)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            var since = DateTime.UtcNow.AddDays(-days);

            var checkIns = await _context.FacilityCheckIns
                .Include(c => c.Office)
                .Include(c => c.Space)
                .Where(c => c.TenantId == tenantId.Value &&
                       c.UserId == userId.Value &&
                       c.CheckInTime >= since)
                .OrderByDescending(c => c.CheckInTime)
                .AsNoTracking()
                .ToListAsync();

            return Ok(checkIns);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving check-ins");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Get who's in the office today
    /// </summary>
    [HttpGet("offices/{officeId}/whos-here")]
    [RequiresPermission(Resource = "Facility", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<WhosHereItem>>> GetWhosHere(Guid officeId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var checkedIn = await _context.FacilityCheckIns
                .Include(c => c.User)
                .Include(c => c.Space)
                .Where(c => c.TenantId == tenantId.Value &&
                       c.OfficeId == officeId &&
                       c.CheckInTime >= todayStart &&
                       c.CheckInTime < todayEnd &&
                       c.CheckOutTime == null)
                .Select(c => new WhosHereItem
                {
                    UserId = c.UserId,
                    UserName = c.User.DisplayName,
                    Email = c.User.Email,
                    CheckInTime = c.CheckInTime,
                    SpaceName = c.Space != null ? c.Space.Name : null
                })
                .OrderBy(c => c.UserName)
                .AsNoTracking()
                .ToListAsync();

            return Ok(checkedIn);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving who's here");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== HELPER METHODS ====================

    private Guid? GetCurrentTenantId()
    {
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId) &&
            Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderTenantId))
        {
            var userTenantIds = User.FindAll("TenantId")
                .Select(c => Guid.TryParse(c.Value, out var tid) ? tid : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList();
            if (userTenantIds.Contains(parsedHeaderTenantId))
                return parsedHeaderTenantId;
        }

        var tenantIdClaim = User.FindFirst("TenantId")?.Value;
        if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var parsedTenantId))
            return parsedTenantId;

        return null;
    }

    private new Guid? GetCurrentUserId()
    {
        // Check multiple claim types for user ID
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }
}

// ==================== DTOs ====================

public class FacilitiesDashboard
{
    public int OfficeCount { get; set; }
    public int ClientSiteCount { get; set; }
    public int TotalSpaces { get; set; }
    public int TodayBookings { get; set; }
    public int TodayCheckIns { get; set; }
    public int ActiveLeases { get; set; }
    public int ExpiringLeases { get; set; }
    public int ActiveFieldAssignments { get; set; }
    public int PendingForeignTravel { get; set; }
    public int OpenMaintenanceRequests { get; set; }
    public List<AnnouncementSummary> RecentAnnouncements { get; set; } = new();
}

public class AnnouncementSummary
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public AnnouncementType Type { get; set; }
    public AnnouncementPriority Priority { get; set; }
    public string OfficeName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class FacilitiesAnalytics
{
    public int DateRange { get; set; }
    public int TotalCheckIns { get; set; }
    public int TotalBookings { get; set; }
    public double AverageDailyCheckIns { get; set; }
    public double AverageDailyBookings { get; set; }
    public double CurrentOccupancyPercent { get; set; }
    public List<SpaceTypeStats> SpacesByType { get; set; } = new();
    public List<DailyTrendItem> DailyTrend { get; set; } = new();
    public List<TopOfficeItem> TopOffices { get; set; } = new();
}

public class SpaceTypeStats
{
    public string Type { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Capacity { get; set; }
}

public class DailyTrendItem
{
    public string Date { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public int CheckIns { get; set; }
    public int Bookings { get; set; }
}

public class TopOfficeItem
{
    public Guid OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CheckIns { get; set; }
    public int Bookings { get; set; }
}

public class CreateAnnouncementRequest
{
    public Guid? OfficeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public AnnouncementType Type { get; set; }
    public AnnouncementPriority Priority { get; set; } = AnnouncementPriority.Normal;
    public DateOnly? EffectiveDate { get; set; }
    public DateOnly? ExpirationDate { get; set; }
    public bool RequiresAcknowledgment { get; set; }
}

public class OfficeDirectoryItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Address2 { get; set; }
    public string? City { get; set; }
    public string? StateCode { get; set; }
    public string? CountryCode { get; set; }
    public string? Timezone { get; set; }
    public OfficeStatus Status { get; set; }
    public bool IsClientSite { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int SpaceCount { get; set; }
    public bool HasTravelGuide { get; set; }
    public bool HasLease { get; set; }
}

public class OfficeDetail
{
    public Office Office { get; set; } = null!;
    public OfficeTravelGuide? TravelGuide { get; set; }
    public List<OfficePoc> PointsOfContact { get; set; } = new();
    public ClientSiteDetail? ClientSiteDetail { get; set; }
    public List<FacilityAnnouncement> ActiveAnnouncements { get; set; } = new();
}

public class FacilityCheckInRequest
{
    public Guid OfficeId { get; set; }
    public Guid? SpaceId { get; set; }
    public CheckInMethod Method { get; set; } = CheckInMethod.Web;
    public string? BadgeId { get; set; }
    public string? QrCode { get; set; }
    public string? DeviceInfo { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Notes { get; set; }
}

public class WhosHereItem
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CheckInTime { get; set; }
    public string? SpaceName { get; set; }
}

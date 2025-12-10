using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api;

public static class SeedFacilitiesData
{
    public static async Task SeedSpacesForAllOffices(MySchedulingDbContext context)
    {
        // Get all offices
        var allOffices = await context.Offices.ToListAsync();

        if (!allOffices.Any())
        {
            Console.WriteLine("No offices found. Skipping facilities seed.");
            return;
        }

        // Seed floors for offices that don't have floors
        var officesWithoutFloors = allOffices
            .Where(o => !context.Floors.Any(f => f.OfficeId == o.Id))
            .ToList();

        foreach (var office in officesWithoutFloors)
        {
            Console.WriteLine($"Creating floors for office: {office.Name}");
            await SeedFloorsForOffice(context, office);
        }
        await context.SaveChangesAsync();

        // Get all offices that don't have spaces yet
        var officesWithoutSpaces = allOffices
            .Where(o => !context.Spaces.Any(s => s.OfficeId == o.Id))
            .ToList();

        foreach (var office in officesWithoutSpaces)
        {
            Console.WriteLine($"Creating spaces for office: {office.Name}");
            await SeedSpacesForOffice(context, office);
        }

        await context.SaveChangesAsync();
        Console.WriteLine($"Seeded floors for {officesWithoutFloors.Count} offices and spaces for {officesWithoutSpaces.Count} offices.");
    }

    private static async Task SeedFloorsForOffice(MySchedulingDbContext context, Office office)
    {
        var floors = new List<Floor>
        {
            new Floor
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = "Ground Floor",
                Level = 0,
                SquareFootage = 5000,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Floor
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = "1st Floor",
                Level = 1,
                SquareFootage = 6000,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Floor
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = "2nd Floor",
                Level = 2,
                SquareFootage = 6000,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Floors.AddRangeAsync(floors);
        await context.SaveChangesAsync();

        // Now add zones for each floor
        foreach (var floor in floors)
        {
            var zones = new List<Zone>
            {
                new Zone
                {
                    Id = Guid.NewGuid(),
                    TenantId = office.TenantId,
                    FloorId = floor.Id,
                    Name = $"{floor.Name} - North Wing",
                    Description = "North side workspace area",
                    Color = "#3B82F6", // Blue
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Zone
                {
                    Id = Guid.NewGuid(),
                    TenantId = office.TenantId,
                    FloorId = floor.Id,
                    Name = $"{floor.Name} - South Wing",
                    Description = "South side workspace area",
                    Color = "#10B981", // Green
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await context.Zones.AddRangeAsync(zones);
        }
    }

    private static async Task SeedSpacesForOffice(MySchedulingDbContext context, Office office)
    {
        var spaces = new List<Space>();

        // Hot Desks (10)
        for (int i = 1; i <= 10; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = $"D-{i:D3}",
                Type = SpaceType.HotDesk,
                Capacity = 1,
                IsActive = true,
                RequiresApproval = false,
                AvailabilityType = SpaceAvailabilityType.Shared, // Hot desks are shared
                Equipment = "Monitor, Keyboard, Mouse",
                Features = i <= 3 ? "Window View" : i <= 6 ? "Near Kitchen" : "Quiet Zone",
                CreatedAt = DateTime.UtcNow
            });
        }

        // Private Offices (5)
        for (int i = 1; i <= 5; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = $"O-{i:D3}",
                Type = SpaceType.Office,
                Capacity = 1,
                IsActive = true,
                RequiresApproval = true, // Private offices require approval
                AvailabilityType = SpaceAvailabilityType.Reservable,
                Equipment = "Monitor, Keyboard, Mouse, Phone",
                Features = "Private, Lockable",
                DailyCost = 25.00m,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Conference Rooms (3)
        var crNames = new[] { "CR-1A", "CR-1B", "CR-2A" };
        var crCapacities = new[] { 8, 12, 20 };
        for (int i = 0; i < 3; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = crNames[i],
                Type = SpaceType.ConferenceRoom,
                Capacity = crCapacities[i],
                IsActive = true,
                RequiresApproval = false,
                AvailabilityType = SpaceAvailabilityType.Reservable,
                Equipment = "TV/Display, Video Conferencing, Whiteboard",
                Features = crCapacities[i] >= 12 ? "Large Room, Video Conferencing" : "Standard Room",
                MaxBookingDays = 1, // Max 1 day booking for conference rooms
                CreatedAt = DateTime.UtcNow
            });
        }

        // Huddle Rooms (2)
        for (int i = 1; i <= 2; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = $"HR-{i}",
                Type = SpaceType.HuddleRoom,
                Capacity = 4,
                IsActive = true,
                RequiresApproval = false,
                AvailabilityType = SpaceAvailabilityType.Shared,
                Equipment = "Display, Whiteboard",
                Features = "Quick Meetings",
                MaxBookingDays = 1,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Phone Booths (2)
        for (int i = 1; i <= 2; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = $"PH-{i}",
                Type = SpaceType.PhoneBooth,
                Capacity = 1,
                IsActive = true,
                RequiresApproval = false,
                AvailabilityType = SpaceAvailabilityType.Shared,
                Equipment = "None",
                Features = "Soundproof, Private Calls",
                CreatedAt = DateTime.UtcNow
            });
        }

        // Training Room (1)
        spaces.Add(new Space
        {
            Id = Guid.NewGuid(),
            TenantId = office.TenantId,
            OfficeId = office.Id,
            Name = "TR-1",
            Type = SpaceType.TrainingRoom,
            Capacity = 30,
            IsActive = true,
            RequiresApproval = true,
            AvailabilityType = SpaceAvailabilityType.Reservable,
            Equipment = "Projector, Whiteboard, Podium, Laptop Connections",
            Features = "Training Setup, Presentation Ready",
            DailyCost = 100.00m,
            MaxBookingDays = 5,
            CreatedAt = DateTime.UtcNow
        });

        // Break Room (1)
        spaces.Add(new Space
        {
            Id = Guid.NewGuid(),
            TenantId = office.TenantId,
            OfficeId = office.Id,
            Name = "BR-1",
            Type = SpaceType.BreakRoom,
            Capacity = 20,
            IsActive = true,
            RequiresApproval = false,
            AvailabilityType = SpaceAvailabilityType.Shared,
            Equipment = "Kitchen Appliances, Seating",
            Features = "Kitchen, Relaxation Area",
            CreatedAt = DateTime.UtcNow
        });

        // Parking Spots (5)
        for (int i = 1; i <= 5; i++)
        {
            spaces.Add(new Space
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                Name = $"P-{i:D3}",
                Type = SpaceType.ParkingSpot,
                Capacity = 1,
                IsActive = true,
                RequiresApproval = false,
                AvailabilityType = SpaceAvailabilityType.Reservable,
                Equipment = i == 1 ? "EV Charger" : "None",
                Features = i == 1 ? "EV Charging, Covered" : i <= 3 ? "Covered" : "Open",
                DailyCost = i == 1 ? 10.00m : 5.00m,
                CreatedAt = DateTime.UtcNow
            });
        }

        await context.Spaces.AddRangeAsync(spaces);
    }

    /// <summary>
    /// Seeds comprehensive facilities data for a specific office (leases, travel guides, announcements, etc.)
    /// </summary>
    public static async Task SeedFacilitiesPortalData(MySchedulingDbContext context, string officeName = "Arlington")
    {
        // Find the office by name (case-insensitive partial match)
        var office = await context.Offices
            .FirstOrDefaultAsync(o => o.Name.ToLower().Contains(officeName.ToLower()));

        if (office == null)
        {
            Console.WriteLine($"Office containing '{officeName}' not found. Skipping portal data seed.");
            return;
        }

        Console.WriteLine($"Seeding facilities portal data for office: {office.Name} (ID: {office.Id})");

        // Get an admin user for created by fields
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@admin.com");
        if (adminUser == null)
        {
            Console.WriteLine("Admin user not found. Creating announcements without author.");
        }

        // Seed Travel Guide
        await SeedTravelGuide(context, office);

        // Seed Lease
        await SeedLease(context, office);

        // Seed Announcements
        await SeedAnnouncements(context, office, adminUser);

        // Seed Office POCs
        await SeedOfficePocs(context, office);

        // Seed Check-ins (sample data)
        await SeedCheckIns(context, office, adminUser);

        await context.SaveChangesAsync();
        Console.WriteLine($"Facilities portal data seeded successfully for {office.Name}");
    }

    private static async Task SeedTravelGuide(MySchedulingDbContext context, Office office)
    {
        // Check if travel guide already exists
        if (await context.OfficeTravelGuides.AnyAsync(g => g.OfficeId == office.Id))
        {
            Console.WriteLine($"  Travel guide already exists for {office.Name}, skipping.");
            return;
        }

        var travelGuide = new OfficeTravelGuide
        {
            Id = Guid.NewGuid(),
            TenantId = office.TenantId,
            OfficeId = office.Id,
            CreatedAt = DateTime.UtcNow,

            // Getting There
            NearestAirport = "Ronald Reagan Washington National Airport",
            AirportCode = "DCA",
            AirportDistance = "3 miles / 10 min drive",
            RecommendedGroundTransport = "Uber/Lyft recommended. Metro Blue/Yellow line to Crystal City station is 5 min walk. Taxi stand at airport arrivals.",
            PublicTransitOptions = "**Metro**: Blue/Yellow Line to Crystal City Station, 5 min walk to office.\n\n**Bus**: ART 41 stops directly in front of building.\n\n**VRE**: Crystal City VRE station is 10 min walk.",
            DrivingDirections = "From I-395:\n1. Take exit 8C for Crystal City\n2. Turn right on S Clark St\n3. Continue to 1234 Crystal Dr\n4. Parking garage entrance on right",
            ParkingInstructions = "**Visitor Parking**: Enter garage from Crystal Dr, take ticket at gate. Validate at reception for discounted rate.\n\n**Reserved Parking**: Use badge for Level P2.",
            ParkingDailyCost = 15.00m,

            // Lodging
            RecommendedHotels = "[{\"name\":\"Crystal City Marriott\",\"address\":\"1999 Richmond Hwy\",\"phone\":\"703-413-5500\",\"distance\":\"0.2 miles\",\"rate\":\"$189/night\"},{\"name\":\"Hilton Crystal City\",\"address\":\"2399 Jefferson Davis Hwy\",\"phone\":\"703-418-6800\",\"distance\":\"0.3 miles\",\"rate\":\"$175/night\"}]",
            CorporateHotelCode = "ACME123",
            NeighborhoodTips = "Crystal City is very walkable with restaurants and shops. Pentagon City Mall is 10 min walk. Avoid walking south of 23rd St after dark.",

            // Building Access
            BuildingHours = "Mon-Fri 6:00 AM - 8:00 PM, Sat 8:00 AM - 2:00 PM, Sun Closed",
            AfterHoursAccess = "Badge access required after hours. Contact Security at x5555 if your badge doesn't work.",
            VisitorCheckIn = "All visitors must check in at main lobby reception. Government-issued photo ID required. Host must meet visitor at lobby.",
            SecurityRequirements = "**Badge Required**: All personnel must display badge visibly.\n\n**Visitors**: Must be escorted at all times.\n\n**Prohibited Items**: Weapons, recording devices in secure areas.",
            BadgeInstructions = "New employees: Report to Security office (Suite 100) with two forms of ID to receive badge.",

            // What to Expect
            DressCode = "Business casual Mon-Thu, Casual Friday. No shorts or flip-flops.",
            CafeteriaInfo = "Cafeteria on 1st floor open 7:30 AM - 2:00 PM. Coffee bar open until 4 PM.",
            NearbyRestaurants = "[{\"name\":\"Good Stuff Eatery\",\"type\":\"Burgers\",\"distance\":\"2 min walk\"},{\"name\":\"Kabob Palace\",\"type\":\"Mediterranean\",\"distance\":\"5 min walk\"},{\"name\":\"Crystal City Sports Pub\",\"type\":\"American\",\"distance\":\"3 min walk\"}]",
            WifiInstructions = "**Guest WiFi**: ACME-Guest\n**Password**: Welcome2024!\n\n**Corporate WiFi**: Connect to ACME-Corp with your domain credentials.",
            ConferenceRoomBooking = "Book via Outlook or the myFacilities portal. Rooms auto-release after 15 min if not checked in.",
            PrintingInstructions = "Guest printing at reception. Employees use badge at any MFP device.",
            Amenities = "- Fitness center (Badge required, 1st floor)\n- Mother's room (Suite 150)\n- Bike storage (Garage P1)\n- Showers (Fitness center)",

            // Contacts
            ReceptionPhone = "703-555-0100",
            SecurityPhone = "703-555-5555",
            FacilitiesEmail = "facilities@acme.com",
            EmergencyContact = "Security: 703-555-5555, Building Emergency: 911",

            // Rich Content
            WelcomeMessage = "# Welcome to Arlington!\n\nWe're glad you're visiting our Crystal City office. This guide has everything you need for a productive visit.\n\n**First time?** Stop by reception for a welcome packet and office tour.",
            ImportantNotes = "⚠️ **Construction Notice**: Elevators 3 & 4 under maintenance through Jan 15. Use elevators 1 & 2.\n\n🅿️ **Parking**: Garage levels P3-P4 closed for repairs.",

            LastUpdated = DateTime.UtcNow
        };

        await context.OfficeTravelGuides.AddAsync(travelGuide);
        Console.WriteLine($"  Created travel guide for {office.Name}");
    }

    private static async Task SeedLease(MySchedulingDbContext context, Office office)
    {
        // Check if lease already exists
        if (await context.Leases.AnyAsync(l => l.OfficeId == office.Id))
        {
            Console.WriteLine($"  Lease already exists for {office.Name}, skipping.");
            return;
        }

        var leaseId = Guid.NewGuid();
        var lease = new Lease
        {
            Id = leaseId,
            TenantId = office.TenantId,
            OfficeId = office.Id,
            CreatedAt = DateTime.UtcNow,

            LeaseNumber = "LSE-2023-001",
            ExternalLeaseId = "CC-1234-A",

            // Landlord Info
            LandlordName = "Crystal City Holdings LLC",
            LandlordContactName = "Robert Johnson",
            LandlordEmail = "rjohnson@ccholdingsllc.com",
            LandlordPhone = "703-555-1000",
            PropertyManagementCompany = "JBG SMITH",
            PropertyManagerName = "Sarah Williams",
            PropertyManagerEmail = "swilliams@jbgsmith.com",
            PropertyManagerPhone = "703-555-1001",

            // Terms
            LeaseStartDate = new DateOnly(2023, 1, 1),
            LeaseEndDate = new DateOnly(2028, 12, 31),
            LeaseTerm = 72, // 6 years
            Status = LeaseStatus.Active,

            // Space
            SquareFootage = 25000,
            UsableSquareFootage = 22500,
            ParkingSpots = 50,
            ReservedParkingSpots = 10,
            HasLoadingDock = true,
            MaxOccupancy = 200,

            // Costs
            BaseRentMonthly = 52083.33m, // $25/SF annually
            CamChargesMonthly = 8333.33m,
            UtilitiesMonthly = 3500.00m,
            TaxesMonthly = 2916.67m,
            InsuranceMonthly = 1250.00m,
            SecurityDeposit = 156250.00m, // 3 months base rent
            EscalationPercentage = 3.0m,
            NextEscalationDate = new DateOnly(2025, 1, 1),

            // Important Dates
            RenewalNoticeDeadline = new DateOnly(2028, 6, 30),
            RenewalNoticeDays = 180,

            // Compliance
            IsAdaCompliant = true,
            RequiredSecurityLevel = SecurityClearanceLevel.None,
            HasScif = false,

            // Insurance
            InsuranceProvider = "Hartford Insurance",
            InsurancePolicyNumber = "HI-2023-45678",
            InsuranceExpirationDate = new DateOnly(2025, 6, 30),
            InsuranceCoverageAmount = 5000000m,

            Notes = "Original 6-year lease with two 3-year options. Landlord responsible for HVAC maintenance."
        };

        await context.Leases.AddAsync(lease);

        // Add option years
        var optionYears = new List<LeaseOptionYear>
        {
            new LeaseOptionYear
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                LeaseId = leaseId,
                CreatedAt = DateTime.UtcNow,
                OptionNumber = 1,
                OptionStartDate = new DateOnly(2029, 1, 1),
                OptionEndDate = new DateOnly(2031, 12, 31),
                TermMonths = 36,
                ProposedRentMonthly = 55208.33m, // ~3% increase
                ExerciseDeadline = new DateOnly(2028, 6, 30),
                Status = OptionYearStatus.Available,
                Notes = "First 3-year option"
            },
            new LeaseOptionYear
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                LeaseId = leaseId,
                CreatedAt = DateTime.UtcNow,
                OptionNumber = 2,
                OptionStartDate = new DateOnly(2032, 1, 1),
                OptionEndDate = new DateOnly(2034, 12, 31),
                TermMonths = 36,
                ProposedRentMonthly = 58520.83m,
                ExerciseDeadline = new DateOnly(2031, 6, 30),
                Status = OptionYearStatus.Available,
                Notes = "Second 3-year option (contingent on exercising Option 1)"
            }
        };

        await context.LeaseOptionYears.AddRangeAsync(optionYears);
        Console.WriteLine($"  Created lease with 2 option years for {office.Name}");
    }

    private static async Task SeedAnnouncements(MySchedulingDbContext context, Office office, User? author)
    {
        // Check if announcements already exist
        if (await context.FacilityAnnouncements.AnyAsync(a => a.OfficeId == office.Id))
        {
            Console.WriteLine($"  Announcements already exist for {office.Name}, skipping.");
            return;
        }

        var authorId = author?.Id ?? Guid.Empty;
        var announcements = new List<FacilityAnnouncement>
        {
            new FacilityAnnouncement
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Title = "Holiday Office Hours",
                Content = "The office will be **closed** on the following dates:\n\n- December 25 (Christmas)\n- December 26 (Day after Christmas)\n- January 1 (New Year's Day)\n\nRegular hours resume January 2nd.",
                Type = AnnouncementType.Holiday,
                Priority = AnnouncementPriority.Normal,
                EffectiveDate = new DateOnly(2024, 12, 20),
                ExpirationDate = new DateOnly(2025, 1, 3),
                IsActive = true,
                RequiresAcknowledgment = false,
                AuthoredByUserId = authorId,
                PublishedAt = DateTime.UtcNow
            },
            new FacilityAnnouncement
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Title = "Elevator Maintenance - January",
                Content = "## Scheduled Maintenance\n\nElevators 3 & 4 will be undergoing routine maintenance:\n\n**Dates**: January 6-15, 2025\n**Hours**: 8 PM - 6 AM (overnight work)\n\nElevators 1 & 2 will remain operational. Please allow extra time during peak hours.",
                Type = AnnouncementType.Maintenance,
                Priority = AnnouncementPriority.High,
                EffectiveDate = new DateOnly(2025, 1, 1),
                ExpirationDate = new DateOnly(2025, 1, 16),
                IsActive = true,
                RequiresAcknowledgment = false,
                AuthoredByUserId = authorId,
                PublishedAt = DateTime.UtcNow
            },
            new FacilityAnnouncement
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Title = "New Parking Validation System",
                Content = "Starting **January 15**, we're implementing a new digital parking validation system.\n\n### What's Changing\n- No more paper tickets\n- Scan your badge at the garage exit\n- Visitors: Get QR code from reception\n\n### Action Required\nAll employees must register their badge at Security by January 14.",
                Type = AnnouncementType.Policy,
                Priority = AnnouncementPriority.High,
                EffectiveDate = new DateOnly(2025, 1, 1),
                ExpirationDate = new DateOnly(2025, 1, 31),
                IsActive = true,
                RequiresAcknowledgment = true,
                AuthoredByUserId = authorId,
                PublishedAt = DateTime.UtcNow
            },
            new FacilityAnnouncement
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = null, // Global announcement
                CreatedAt = DateTime.UtcNow,
                Title = "Company Town Hall - Q1 2025",
                Content = "Join us for the Q1 2025 Company Town Hall!\n\n**Date**: January 22, 2025\n**Time**: 2:00 PM - 3:30 PM EST\n**Location**: Training Room (TR-1) or via Teams\n\nTopics include:\n- Year-end results\n- 2025 strategic priorities\n- Q&A with leadership",
                Type = AnnouncementType.Event,
                Priority = AnnouncementPriority.Normal,
                EffectiveDate = new DateOnly(2025, 1, 15),
                ExpirationDate = new DateOnly(2025, 1, 23),
                IsActive = true,
                RequiresAcknowledgment = false,
                AuthoredByUserId = authorId,
                PublishedAt = DateTime.UtcNow
            },
            new FacilityAnnouncement
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Title = "Fire Drill Scheduled",
                Content = "🔥 **Mandatory Fire Drill**\n\n**Date**: January 28, 2025\n**Time**: 10:00 AM\n\nAll personnel must evacuate to designated assembly points. Review emergency procedures posted in break rooms.",
                Type = AnnouncementType.SecurityAlert,
                Priority = AnnouncementPriority.Urgent,
                EffectiveDate = new DateOnly(2025, 1, 25),
                ExpirationDate = new DateOnly(2025, 1, 29),
                IsActive = true,
                RequiresAcknowledgment = true,
                AuthoredByUserId = authorId,
                PublishedAt = DateTime.UtcNow
            }
        };

        await context.FacilityAnnouncements.AddRangeAsync(announcements);
        Console.WriteLine($"  Created {announcements.Count} announcements for {office.Name}");
    }

    private static async Task SeedOfficePocs(MySchedulingDbContext context, Office office)
    {
        // Check if POCs already exist
        if (await context.OfficePocs.AnyAsync(p => p.OfficeId == office.Id))
        {
            Console.WriteLine($"  POCs already exist for {office.Name}, skipping.");
            return;
        }

        var pocs = new List<OfficePoc>
        {
            new OfficePoc
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Name = "Jennifer Martinez",
                Title = "Office Manager",
                Email = "jmartinez@acme.com",
                Phone = "703-555-0101",
                MobilePhone = "703-555-0191",
                Role = OfficePocRole.OfficeManager,
                Responsibilities = "General office operations, supplies, visitor coordination",
                IsPrimary = true,
                IsEmergencyContact = true,
                DisplayOrder = 1,
                IsActive = true
            },
            new OfficePoc
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Name = "Michael Thompson",
                Title = "Facilities Manager",
                Email = "mthompson@acme.com",
                Phone = "703-555-0102",
                Role = OfficePocRole.FacilitiesManager,
                Responsibilities = "Building maintenance, HVAC, space planning",
                IsPrimary = true,
                IsEmergencyContact = false,
                DisplayOrder = 2,
                IsActive = true
            },
            new OfficePoc
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Name = "David Chen",
                Title = "Security Officer",
                Email = "dchen@acme.com",
                Phone = "703-555-5555",
                MobilePhone = "703-555-5556",
                Role = OfficePocRole.SecurityOfficer,
                Responsibilities = "Badge access, visitor escorts, security incidents",
                IsPrimary = true,
                IsEmergencyContact = true,
                DisplayOrder = 3,
                IsActive = true
            },
            new OfficePoc
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Name = "IT Help Desk",
                Title = "IT Support",
                Email = "helpdesk@acme.com",
                Phone = "703-555-4357",
                Role = OfficePocRole.ItSupport,
                Responsibilities = "Network, computers, printers, video conferencing",
                IsPrimary = true,
                IsEmergencyContact = false,
                DisplayOrder = 4,
                IsActive = true
            },
            new OfficePoc
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                CreatedAt = DateTime.UtcNow,
                Name = "Reception Desk",
                Title = "Front Desk",
                Email = "reception.arlington@acme.com",
                Phone = "703-555-0100",
                Role = OfficePocRole.Reception,
                Responsibilities = "Visitor check-in, package handling, general inquiries",
                IsPrimary = true,
                IsEmergencyContact = false,
                DisplayOrder = 5,
                IsActive = true
            }
        };

        await context.OfficePocs.AddRangeAsync(pocs);
        Console.WriteLine($"  Created {pocs.Count} POCs for {office.Name}");
    }

    private static async Task SeedCheckIns(MySchedulingDbContext context, Office office, User? user)
    {
        // Check if check-ins already exist
        if (await context.FacilityCheckIns.AnyAsync(c => c.OfficeId == office.Id))
        {
            Console.WriteLine($"  Check-ins already exist for {office.Name}, skipping.");
            return;
        }

        if (user == null)
        {
            Console.WriteLine($"  No user found for check-ins, skipping.");
            return;
        }

        // Create a few sample check-ins
        var checkIns = new List<FacilityCheckIn>
        {
            new FacilityCheckIn
            {
                Id = Guid.NewGuid(),
                TenantId = office.TenantId,
                OfficeId = office.Id,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                CheckInTime = DateTime.UtcNow.AddHours(-2),
                Method = CheckInMethod.Web,
                Notes = "Working from Arlington office today"
            }
        };

        await context.FacilityCheckIns.AddRangeAsync(checkIns);
        Console.WriteLine($"  Created {checkIns.Count} check-ins for {office.Name}");
    }
}

namespace MyScheduling.Core.Entities;

public class Office : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Address2 { get; set; }  // Suite, Floor, Building, etc.
    public string? City { get; set; }
    public string? StateCode { get; set; }  // Two-letter state code (e.g., "VA", "CO")
    public string? CountryCode { get; set; } = "US";  // Two-letter country code (e.g., "US", "CA")
    public string? Timezone { get; set; }
    public OfficeStatus Status { get; set; }
    public bool IsClientSite { get; set; } = false;  // Indicates if this is a client site location
    public string? IconUrl { get; set; }  // Custom icon URL (optional)
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Navigation properties
    public virtual ICollection<Space> Spaces { get; set; } = new List<Space>();
    public virtual ICollection<Floor> Floors { get; set; } = new List<Floor>();
    public virtual ICollection<BookingRule> BookingRules { get; set; } = new List<BookingRule>();
}

public enum OfficeStatus
{
    Active,
    Inactive
}

public class Space : TenantEntity
{
    public Guid OfficeId { get; set; }
    public Guid? FloorId { get; set; }  // Optional floor reference
    public Guid? ZoneId { get; set; }   // Optional zone reference
    public string Name { get; set; } = string.Empty;
    public SpaceType Type { get; set; }
    public int Capacity { get; set; }
    public string? Metadata { get; set; } // JSON for floor, zone, equipment, etc.

    // Enhanced facilities management fields
    public Guid? ManagerUserId { get; set; }  // Space manager/owner
    public bool RequiresApproval { get; set; } = false;  // Does booking require approval?
    public bool IsActive { get; set; } = true;  // Active/inactive status
    public string? Equipment { get; set; }  // JSON array of equipment
    public string? Features { get; set; }  // JSON array of features
    public decimal? DailyCost { get; set; }  // Cost for financial tracking
    public int? MaxBookingDays { get; set; }  // Maximum booking duration
    public string? BookingRules { get; set; }  // JSON rules for booking restrictions
    public SpaceAvailabilityType AvailabilityType { get; set; } = SpaceAvailabilityType.Shared;

    // Navigation properties
    public virtual Office Office { get; set; } = null!;
    public virtual Floor? Floor { get; set; }
    public virtual Zone? Zone { get; set; }
    public virtual User? Manager { get; set; }
    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public virtual ICollection<SpaceMaintenanceLog> MaintenanceLogs { get; set; } = new List<SpaceMaintenanceLog>();
    public virtual ICollection<FacilityPermission> Permissions { get; set; } = new List<FacilityPermission>();
    public virtual ICollection<SpaceAssignment> Assignments { get; set; } = new List<SpaceAssignment>();
}

public enum SpaceType
{
    Desk,
    HotDesk,            // Shared/unassigned desk
    Office,
    Cubicle,
    Room,
    ConferenceRoom,
    HuddleRoom,
    PhoneBooth,
    TrainingRoom,
    BreakRoom,
    ParkingSpot
}

public enum SpaceAvailabilityType
{
    Shared,            // Available for anyone to book (hot desk)
    Assigned,          // Permanently assigned to specific user
    Reservable,        // Can be booked but not shared simultaneously
    Restricted         // Requires special permission
}

// Floor entity for organizing spaces by floor level
public class Floor : TenantEntity
{
    public Guid OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;  // "1st Floor", "2nd Floor", "Ground Floor"
    public int Level { get; set; }                     // Numeric floor level (1, 2, 3... or 0 for ground, -1 for basement)
    public string? FloorPlanUrl { get; set; }         // URL to floor plan image
    public decimal? SquareFootage { get; set; }       // Total square footage
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual Office Office { get; set; } = null!;
    public virtual ICollection<Zone> Zones { get; set; } = new List<Zone>();
    public virtual ICollection<Space> Spaces { get; set; } = new List<Space>();
}

// Zone entity for grouping spaces within floors
public class Zone : TenantEntity
{
    public Guid FloorId { get; set; }
    public string Name { get; set; } = string.Empty;  // "North Wing", "Engineering Area", "Executive Suite"
    public string? Description { get; set; }
    public string? Color { get; set; }                 // Hex color for visual distinction on floor plans
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual Floor Floor { get; set; } = null!;
    public virtual ICollection<Space> Spaces { get; set; } = new List<Space>();
}

// Long-term space assignment (permanent desks, offices)
public class SpaceAssignment : TenantEntity
{
    public Guid SpaceId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }            // Null = permanent/indefinite
    public SpaceAssignmentType Type { get; set; }
    public string? Notes { get; set; }
    public SpaceAssignmentStatus Status { get; set; } = SpaceAssignmentStatus.Active;
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Navigation properties
    public virtual Space Space { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual User? ApprovedBy { get; set; }
}

public enum SpaceAssignmentType
{
    Permanent,          // Permanent office/desk assignment
    LongTerm,          // Extended assignment (6+ months)
    Temporary,         // Short-term assignment (project-based)
    Visitor            // Visitor/contractor assignment
}

public enum SpaceAssignmentStatus
{
    Pending,           // Awaiting approval
    Active,            // Currently active assignment
    Expired,           // Past end date
    Cancelled,         // Cancelled before end date
    Revoked            // Administratively revoked
}

// Booking rules configuration
public class BookingRule : TenantEntity
{
    public Guid? OfficeId { get; set; }               // Null = all offices
    public Guid? SpaceId { get; set; }                // Null = office-level rule
    public SpaceType? SpaceType { get; set; }         // Null = all types

    public string Name { get; set; } = string.Empty;  // Rule name for display
    public string? Description { get; set; }

    // Duration constraints
    public int? MinDurationMinutes { get; set; }      // Minimum booking duration
    public int? MaxDurationMinutes { get; set; }      // Maximum booking duration

    // Advance booking constraints
    public int? MinAdvanceBookingMinutes { get; set; }// How far in advance minimum
    public int? MaxAdvanceBookingDays { get; set; }   // How far in advance maximum

    // Time restrictions
    public TimeOnly? EarliestStartTime { get; set; }  // Earliest allowed start time
    public TimeOnly? LatestEndTime { get; set; }      // Latest allowed end time
    public string? AllowedDaysOfWeek { get; set; }    // JSON array [1,2,3,4,5] for Mon-Fri

    // Recurring booking settings
    public bool AllowRecurring { get; set; } = true;
    public int? MaxRecurringWeeks { get; set; }       // Max weeks for recurring bookings

    // Approval settings
    public bool RequiresApproval { get; set; } = false;
    public bool AutoApproveForRoles { get; set; } = false;
    public string? AutoApproveRoles { get; set; }     // JSON array of AppRole values

    // Capacity and limits
    public int? MaxBookingsPerUserPerDay { get; set; }
    public int? MaxBookingsPerUserPerWeek { get; set; }

    public bool IsActive { get; set; } = true;
    public int Priority { get; set; } = 0;            // Higher priority rules override lower

    // Navigation properties
    public virtual Office? Office { get; set; }
    public virtual Space? Space { get; set; }
}

public class Booking : TenantEntity
{
    public Guid SpaceId { get; set; }
    public Guid UserId { get; set; }
    public DateTime StartDatetime { get; set; }
    public DateTime? EndDatetime { get; set; }  // Null = permanent/indefinite booking
    public BookingStatus Status { get; set; }
    public bool IsPermanent { get; set; } = false;  // True for indefinite bookings

    // Tracking who created the booking
    public Guid? BookedByUserId { get; set; }  // User who made the booking (may differ from UserId)
    public DateTime BookedAt { get; set; }  // When the booking was made

    // Navigation properties
    public virtual Space Space { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual User? BookedBy { get; set; }
    public virtual ICollection<CheckInEvent> CheckInEvents { get; set; } = new List<CheckInEvent>();
}

public enum BookingStatus
{
    Reserved,
    CheckedIn,
    Completed,
    Cancelled,
    NoShow
}

public class CheckInEvent : BaseEntity
{
    public Guid BookingId { get; set; }
    public DateOnly CheckInDate { get; set; }  // The specific date this check-in is for
    public DateTime Timestamp { get; set; }     // When the check-in actually happened
    public string Method { get; set; } = string.Empty; // web, kiosk, mobile
    public Guid? ProcessedByUserId { get; set; }
    public CheckInStatus Status { get; set; } = CheckInStatus.CheckedIn;

    // Navigation properties
    public virtual Booking Booking { get; set; } = null!;
    public virtual User? ProcessedBy { get; set; }
}

public enum CheckInStatus
{
    CheckedIn,      // User has checked in for this day
    CheckedOut,     // User has checked out for this day
    NoShow,         // User didn't show up for this day
    AutoCheckout    // System auto-checked out (end of day)
}

// Facility Permissions for role-based access control
public class FacilityPermission : BaseEntity
{
    public Guid? OfficeId { get; set; }  // Null = all offices
    public Guid? SpaceId { get; set; }  // Null = office level
    public Guid? UserId { get; set; }  // Null = role-based
    public AppRole? Role { get; set; }  // Null = user-specific
    public FacilityAccessLevel AccessLevel { get; set; }

    // Navigation properties
    public virtual Office? Office { get; set; }
    public virtual Space? Space { get; set; }
    public virtual User? User { get; set; }
}

public enum FacilityAccessLevel
{
    View,               // Can view only
    Book,               // Can book spaces
    Manage,             // Can manage bookings
    Configure,          // Can configure spaces
    FullAdmin           // Full administrative access
}

// Space Maintenance Tracking
public class SpaceMaintenanceLog : BaseEntity
{
    public Guid SpaceId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public MaintenanceType Type { get; set; }
    public MaintenanceStatus Status { get; set; }
    public Guid ReportedByUserId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Resolution { get; set; }
    public decimal? Cost { get; set; }

    // Navigation properties
    public virtual Space Space { get; set; } = null!;
    public virtual User ReportedBy { get; set; } = null!;
    public virtual User? AssignedTo { get; set; }
}

public enum MaintenanceType
{
    Routine,
    Repair,
    Inspection,
    Cleaning,
    EquipmentIssue,
    SafetyConcern
}

public enum MaintenanceStatus
{
    Reported,
    Scheduled,
    InProgress,
    Completed,
    Cancelled
}

// Work Location Preferences for tracking where people work each day
public class WorkLocationPreference : TenantEntity
{
    public Guid UserId { get; set; }
    public DateOnly WorkDate { get; set; }
    public WorkLocationType LocationType { get; set; }
    public DayPortion DayPortion { get; set; } = DayPortion.FullDay;  // Full day, AM only, or PM only

    // Optional fields based on location type
    public Guid? OfficeId { get; set; }  // Used for OfficeNoReservation and ClientSite
    public Guid? BookingId { get; set; }  // Used for OfficeWithReservation

    // Remote Plus location details
    public string? RemoteLocation { get; set; }  // Free text description (e.g., "Home", "Coffee shop")
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }

    public string? Notes { get; set; }  // Optional notes about the day

    // Navigation properties
    [System.Text.Json.Serialization.JsonIgnore]
    public virtual User User { get; set; } = null!;
    public virtual Office? Office { get; set; }  // Include in serialization for display purposes
    [System.Text.Json.Serialization.JsonIgnore]
    public virtual Booking? Booking { get; set; }
}

public enum WorkLocationType
{
    Remote,                  // Simple remote work
    RemotePlus,             // Remote with location details
    ClientSite,             // Working at a client location
    OfficeNoReservation,    // In office but no specific desk/room booked
    OfficeWithReservation,  // In office with a specific booking
    PTO,                    // Paid Time Off
    Travel                  // Travel day (in transit)
}

public enum DayPortion
{
    FullDay,    // Entire day
    AM,         // Morning only (before noon)
    PM          // Afternoon only (after noon)
}

// Company Holidays for tracking federal/company-wide holidays
public class CompanyHoliday : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public DateOnly HolidayDate { get; set; }
    public HolidayType Type { get; set; }
    public bool IsRecurring { get; set; } = false;  // Does this recur annually?
    public string? Description { get; set; }
    public bool IsObserved { get; set; } = true;  // Is the company observing this holiday?

    // Recurrence rules for floating holidays (e.g., "3rd Monday of January" for MLK Day)
    public int? RecurringMonth { get; set; }  // Month (1-12) for recurring holidays
    public int? RecurringDay { get; set; }  // Day of month for fixed-date recurring holidays
    public HolidayRecurrenceRule? RecurrenceRule { get; set; }  // Rule for floating holidays

    // Auto-apply options
    public bool AutoApplyToSchedule { get; set; } = true;  // Auto-create work location entries
    public bool AutoApplyToForecast { get; set; } = true;  // Exclude from forecast recommended hours

    // Status
    public bool IsActive { get; set; } = true;  // Active/inactive for this tenant
}

public enum HolidayType
{
    Federal,            // US Federal holidays
    Company,            // Company-specific holidays
    Religious,          // Religious observances
    Cultural,           // Cultural observances
    Regional            // State or regional holidays
}

public enum HolidayRecurrenceRule
{
    FixedDate = 0,          // Same date every year (e.g., July 4th)
    FirstMondayOf = 1,      // First Monday of the month
    SecondMondayOf = 2,     // Second Monday of the month
    ThirdMondayOf = 3,      // Third Monday of the month (MLK Day, Presidents Day)
    FourthMondayOf = 4,     // Fourth Monday of the month
    LastMondayOf = 5,       // Last Monday of the month (Memorial Day)
    FourthThursdayOf = 6,   // Fourth Thursday of the month (Thanksgiving)
    DayAfterThanksgiving = 7 // Day after Thanksgiving (special case)
}

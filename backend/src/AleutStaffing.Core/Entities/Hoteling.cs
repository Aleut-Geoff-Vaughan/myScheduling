namespace AleutStaffing.Core.Entities;

public class Office : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Timezone { get; set; }
    public OfficeStatus Status { get; set; }

    // Navigation properties
    public virtual ICollection<Space> Spaces { get; set; } = new List<Space>();
}

public enum OfficeStatus
{
    Active,
    Inactive
}

public class Space : TenantEntity
{
    public Guid OfficeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public SpaceType Type { get; set; }
    public int Capacity { get; set; }
    public string? Metadata { get; set; } // JSON for floor, zone, equipment, etc.

    // Navigation properties
    public virtual Office Office { get; set; } = null!;
    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public enum SpaceType
{
    Desk,
    Room,
    ConferenceRoom
}

public class Booking : TenantEntity
{
    public Guid SpaceId { get; set; }
    public Guid PersonId { get; set; }
    public DateTime StartDatetime { get; set; }
    public DateTime EndDatetime { get; set; }
    public BookingStatus Status { get; set; }

    // Navigation properties
    public virtual Space Space { get; set; } = null!;
    public virtual Person Person { get; set; } = null!;
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
    public DateTime Timestamp { get; set; }
    public string Method { get; set; } = string.Empty; // web, kiosk, mobile
    public Guid? ProcessedByUserId { get; set; }

    // Navigation properties
    public virtual Booking Booking { get; set; } = null!;
}

namespace MyScheduling.Core.Entities;

public class WorkLocationTemplateItem : BaseEntity
{
    public Guid TemplateId { get; set; }
    public int DayOffset { get; set; } // 0 = first day, 1 = second day, etc.
    public DayOfWeek? DayOfWeek { get; set; } // For week templates
    public WorkLocationType LocationType { get; set; }
    public DayPortion DayPortion { get; set; } = DayPortion.FullDay; // Full day, AM only, or PM only
    public Guid? OfficeId { get; set; }
    public string? RemoteLocation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    [System.Text.Json.Serialization.JsonIgnore]
    public virtual WorkLocationTemplate? Template { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public virtual Office? Office { get; set; }
}

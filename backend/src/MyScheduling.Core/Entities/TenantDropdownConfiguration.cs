using System.Text.Json;

namespace MyScheduling.Core.Entities;

/// <summary>
/// Tenant-specific dropdown configuration to allow customization of enum values.
/// Replaces hardcoded enums with configurable options per tenant.
/// </summary>
public class TenantDropdownConfiguration : TenantEntity
{
    public string Category { get; set; } = string.Empty;  // "PersonType", "WbsType", "SpaceType", etc.
    public string OptionsJson { get; set; } = "[]";  // JSON array of DropdownOption
    public bool AllowCustomValues { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }

    // Convenience property for working with options
    [System.Text.Json.Serialization.JsonIgnore]
    public List<DropdownOption> Options
    {
        get => string.IsNullOrWhiteSpace(OptionsJson)
            ? new List<DropdownOption>()
            : JsonSerializer.Deserialize<List<DropdownOption>>(OptionsJson) ?? new List<DropdownOption>();
        set => OptionsJson = JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Individual dropdown option configuration.
/// This is a value object serialized to JSON, not a database entity.
/// </summary>
[System.ComponentModel.DataAnnotations.Schema.NotMapped]
public class DropdownOption
{
    public string Value { get; set; } = string.Empty;  // Internal value (e.g., "Employee")
    public string Label { get; set; } = string.Empty;  // Display label
    public string? Description { get; set; }
    public string? Icon { get; set; }  // Icon identifier for UI
    public string? Color { get; set; }  // Color code for badges (hex)
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    public Dictionary<string, string>? Metadata { get; set; }  // Additional custom properties
}

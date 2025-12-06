namespace MyScheduling.Core.Entities;

/// <summary>
/// Tenant-specific settings including logo and DOA print template configuration
/// </summary>
public class TenantSettings : BaseEntity
{
    public Guid TenantId { get; set; }

    // Logo settings
    public string? LogoUrl { get; set; }
    public string? LogoFileName { get; set; }
    public int? LogoWidth { get; set; }
    public int? LogoHeight { get; set; }

    // DOA Print Template settings
    public string? DOAPrintHeaderContent { get; set; }
    public string? DOAPrintFooterContent { get; set; }
    public string? DOAPrintLetterhead { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyWebsite { get; set; }

    // Print template styling
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string? FontFamily { get; set; }
    public int? FontSize { get; set; }

    // Environment and Notification Banner settings
    public string? EnvironmentName { get; set; } // e.g., "Development", "Test", "Staging", "Production"
    public bool ShowEnvironmentBanner { get; set; } = false;
    public bool NotificationBannerEnabled { get; set; } = false;
    public string? NotificationBannerMessage { get; set; }
    public string? NotificationBannerType { get; set; } // "info", "warning", "error", "success"
    public DateTime? NotificationBannerExpiresAt { get; set; }

    // Fiscal Year Configuration
    // FiscalYearStartMonth: 1 = January (calendar year), 4 = April (Apr-Mar), 7 = July (Jul-Jun), 10 = October (Oct-Sep)
    public int FiscalYearStartMonth { get; set; } = 1; // Default to calendar year

    // Budget Configuration
    public bool RequireBudgetApproval { get; set; } = false;
    public int DefaultBudgetMonthsAhead { get; set; } = 12; // How many months ahead budgets can be created

    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
}

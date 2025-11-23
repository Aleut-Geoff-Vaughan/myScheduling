namespace MyScheduling.Core.Entities;

/// <summary>
/// Audit log for all authorization decisions in the system.
/// Tracks every permission check for security auditing and compliance.
/// </summary>
public class AuthorizationAuditLog : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? TenantId { get; set; }

    // What was being accessed
    public string Resource { get; set; } = string.Empty;
    public Guid? ResourceId { get; set; }
    public PermissionAction Action { get; set; }

    // Result of authorization check
    public bool WasAllowed { get; set; }
    public string? DenialReason { get; set; }
    public PermissionScope? GrantedScope { get; set; }

    // Context
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? RequestPath { get; set; }
    public DateTime Timestamp { get; set; }

    // Additional metadata
    public string? AdditionalContext { get; set; }  // JSON for extra details

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Tenant? Tenant { get; set; }
}

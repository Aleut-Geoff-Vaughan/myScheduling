namespace MyScheduling.Core.Entities;

/// <summary>
/// Tracks administrative impersonation sessions for audit and security purposes.
/// All impersonation activity is logged with dual-identity attribution.
/// </summary>
public class ImpersonationSession : BaseEntity
{
    /// <summary>
    /// The administrator who initiated the impersonation
    /// </summary>
    public Guid AdminUserId { get; set; }

    /// <summary>
    /// The user being impersonated
    /// </summary>
    public Guid ImpersonatedUserId { get; set; }

    /// <summary>
    /// When the impersonation session started
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When the impersonation session ended - null if still active
    /// </summary>
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// Required justification for the impersonation (ticket number, issue description, etc.)
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// IP address from which the impersonation was initiated
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent from which the impersonation was initiated
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// How the session ended: Manual, Timeout, Logout, or null if still active
    /// </summary>
    public ImpersonationEndReason? EndReason { get; set; }

    // Navigation
    public virtual User AdminUser { get; set; } = null!;
    public virtual User ImpersonatedUser { get; set; } = null!;

    // Computed properties
    public bool IsActive => !EndedAt.HasValue;
    public TimeSpan? Duration => EndedAt.HasValue ? EndedAt.Value - StartedAt : DateTime.UtcNow - StartedAt;
}

public enum ImpersonationEndReason
{
    Manual = 0,      // Admin clicked "End Impersonation"
    Timeout = 1,     // Session timed out (30 min default)
    Logout = 2,      // Admin logged out
    NewSession = 3   // Admin started impersonating a different user
}

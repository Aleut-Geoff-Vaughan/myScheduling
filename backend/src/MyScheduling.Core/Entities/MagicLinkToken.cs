namespace MyScheduling.Core.Entities;

/// <summary>
/// Tracks magic link tokens for passwordless authentication.
/// Tokens are hashed (SHA256) before storage to prevent token theft from database access.
/// </summary>
public class MagicLinkToken : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>
    /// SHA256 hash of the actual token - never store the raw token
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// When this token expires (typically 15 minutes from creation)
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// When the token was used - null if not yet used
    /// </summary>
    public DateTime? UsedAt { get; set; }

    /// <summary>
    /// IP address that requested the magic link
    /// </summary>
    public string? RequestedFromIp { get; set; }

    /// <summary>
    /// User agent that requested the magic link
    /// </summary>
    public string? RequestedUserAgent { get; set; }

    /// <summary>
    /// IP address that used/redeemed the magic link
    /// </summary>
    public string? UsedFromIp { get; set; }

    /// <summary>
    /// User agent that used/redeemed the magic link
    /// </summary>
    public string? UsedUserAgent { get; set; }

    // Navigation
    public virtual User User { get; set; } = null!;

    // Computed properties
    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
    public bool IsUsed => UsedAt.HasValue;
    public bool IsValid => !IsExpired && !IsUsed;
}

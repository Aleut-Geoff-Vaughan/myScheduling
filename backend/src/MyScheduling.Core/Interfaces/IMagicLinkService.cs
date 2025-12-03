using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service for generating and validating magic link tokens for passwordless authentication
/// </summary>
public interface IMagicLinkService
{
    /// <summary>
    /// Request a magic link for a user by email.
    /// Returns the raw token (to be sent via email) or null if user not found.
    /// Does not reveal whether the email exists to prevent enumeration.
    /// </summary>
    Task<MagicLinkRequestResult> RequestMagicLinkAsync(string email, string? ipAddress, string? userAgent);

    /// <summary>
    /// Validate a magic link token and return the associated user if valid.
    /// Marks the token as used upon successful validation.
    /// </summary>
    Task<MagicLinkValidationResult> ValidateMagicLinkAsync(string token, string? ipAddress, string? userAgent);

    /// <summary>
    /// Clean up expired magic link tokens (for scheduled jobs)
    /// </summary>
    Task<int> CleanupExpiredTokensAsync();

    /// <summary>
    /// Check if a user has exceeded the rate limit for magic link requests
    /// </summary>
    Task<bool> IsRateLimitedAsync(string email);
}

public class MagicLinkRequestResult
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? Email { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public static MagicLinkRequestResult Succeeded(string token, string email, DateTime expiresAt) => new()
    {
        Success = true,
        Token = token,
        Email = email,
        ExpiresAt = expiresAt
    };

    public static MagicLinkRequestResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };

    // Return success even for non-existent emails to prevent enumeration
    public static MagicLinkRequestResult NoUser() => new()
    {
        Success = true,
        Token = null,
        Email = null
    };
}

public class MagicLinkValidationResult
{
    public bool Success { get; set; }
    public User? User { get; set; }
    public string? ErrorMessage { get; set; }
    public MagicLinkValidationFailureReason? FailureReason { get; set; }

    public static MagicLinkValidationResult Succeeded(User user) => new()
    {
        Success = true,
        User = user
    };

    public static MagicLinkValidationResult Failed(string message, MagicLinkValidationFailureReason reason) => new()
    {
        Success = false,
        ErrorMessage = message,
        FailureReason = reason
    };
}

public enum MagicLinkValidationFailureReason
{
    InvalidToken,
    ExpiredToken,
    AlreadyUsed,
    UserNotFound,
    UserInactive,
    UserLockedOut
}

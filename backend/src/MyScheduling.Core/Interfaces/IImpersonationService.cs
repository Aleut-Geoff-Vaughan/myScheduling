using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service for managing administrative impersonation sessions
/// </summary>
public interface IImpersonationService
{
    /// <summary>
    /// Start an impersonation session
    /// </summary>
    Task<ImpersonationResult> StartImpersonationAsync(
        Guid adminUserId,
        Guid targetUserId,
        string reason,
        string? ipAddress,
        string? userAgent);

    /// <summary>
    /// End an impersonation session
    /// </summary>
    Task<ImpersonationResult> EndImpersonationAsync(
        Guid sessionId,
        ImpersonationEndReason endReason);

    /// <summary>
    /// Get active impersonation session for an admin user
    /// </summary>
    Task<ImpersonationSession?> GetActiveSessionAsync(Guid adminUserId);

    /// <summary>
    /// Get impersonation session by ID
    /// </summary>
    Task<ImpersonationSession?> GetSessionByIdAsync(Guid sessionId);

    /// <summary>
    /// Get recent impersonation sessions (for admin audit view)
    /// </summary>
    Task<List<ImpersonationSession>> GetRecentSessionsAsync(int count = 50);

    /// <summary>
    /// Check if a user can be impersonated by the admin
    /// </summary>
    Task<ImpersonationEligibilityResult> CanImpersonateAsync(Guid adminUserId, Guid targetUserId);

    /// <summary>
    /// Clean up timed-out sessions (for scheduled jobs)
    /// </summary>
    Task<int> CleanupTimedOutSessionsAsync();
}

public class ImpersonationResult
{
    public bool Success { get; set; }
    public ImpersonationSession? Session { get; set; }
    public string? ErrorMessage { get; set; }

    public static ImpersonationResult Succeeded(ImpersonationSession session) => new()
    {
        Success = true,
        Session = session
    };

    public static ImpersonationResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };
}

public class ImpersonationEligibilityResult
{
    public bool CanImpersonate { get; set; }
    public string? Reason { get; set; }

    public static ImpersonationEligibilityResult Allowed() => new()
    {
        CanImpersonate = true
    };

    public static ImpersonationEligibilityResult Denied(string reason) => new()
    {
        CanImpersonate = false,
        Reason = reason
    };
}

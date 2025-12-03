using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Infrastructure.Services;

public class ImpersonationService : IImpersonationService
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ImpersonationService> _logger;
    private readonly IConfiguration _configuration;

    // Configuration defaults
    private const int DefaultSessionTimeoutMinutes = 30;

    public ImpersonationService(
        MySchedulingDbContext context,
        ILogger<ImpersonationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<ImpersonationResult> StartImpersonationAsync(
        Guid adminUserId,
        Guid targetUserId,
        string reason,
        string? ipAddress,
        string? userAgent)
    {
        // Validate reason
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 10)
        {
            return ImpersonationResult.Failed("Please provide a detailed reason (at least 10 characters) for impersonation.");
        }

        // Check eligibility
        var eligibility = await CanImpersonateAsync(adminUserId, targetUserId);
        if (!eligibility.CanImpersonate)
        {
            return ImpersonationResult.Failed(eligibility.Reason ?? "Not authorized to impersonate this user.");
        }

        // End any existing active session for this admin
        var existingSession = await GetActiveSessionAsync(adminUserId);
        if (existingSession != null)
        {
            existingSession.EndedAt = DateTime.UtcNow;
            existingSession.EndReason = ImpersonationEndReason.NewSession;
            _logger.LogInformation(
                "Ended previous impersonation session {SessionId} for admin {AdminUserId} before starting new one",
                existingSession.Id, adminUserId);
        }

        // Create new session
        var session = new ImpersonationSession
        {
            Id = Guid.NewGuid(),
            AdminUserId = adminUserId,
            ImpersonatedUserId = targetUserId,
            StartedAt = DateTime.UtcNow,
            Reason = reason.Trim(),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();

        // Load navigation properties for return
        await _context.Entry(session)
            .Reference(s => s.AdminUser)
            .LoadAsync();
        await _context.Entry(session)
            .Reference(s => s.ImpersonatedUser)
            .LoadAsync();

        _logger.LogWarning(
            "IMPERSONATION STARTED: Admin {AdminUserId} ({AdminEmail}) impersonating {TargetUserId} ({TargetEmail}). Reason: {Reason}. IP: {IP}",
            adminUserId, session.AdminUser?.Email, targetUserId, session.ImpersonatedUser?.Email, reason, ipAddress);

        return ImpersonationResult.Succeeded(session);
    }

    public async Task<ImpersonationResult> EndImpersonationAsync(Guid sessionId, ImpersonationEndReason endReason)
    {
        var session = await _context.ImpersonationSessions
            .Include(s => s.AdminUser)
            .Include(s => s.ImpersonatedUser)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
        {
            return ImpersonationResult.Failed("Session not found.");
        }

        if (session.EndedAt.HasValue)
        {
            return ImpersonationResult.Failed("Session has already ended.");
        }

        session.EndedAt = DateTime.UtcNow;
        session.EndReason = endReason;
        await _context.SaveChangesAsync();

        _logger.LogWarning(
            "IMPERSONATION ENDED: Admin {AdminUserId} stopped impersonating {TargetUserId}. Session: {SessionId}. Duration: {Duration}. Reason: {EndReason}",
            session.AdminUserId, session.ImpersonatedUserId, sessionId, session.Duration, endReason);

        return ImpersonationResult.Succeeded(session);
    }

    public async Task<ImpersonationSession?> GetActiveSessionAsync(Guid adminUserId)
    {
        var timeoutMinutes = _configuration.GetValue("Impersonation:SessionTimeoutMinutes", DefaultSessionTimeoutMinutes);
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);

        return await _context.ImpersonationSessions
            .Include(s => s.AdminUser)
            .Include(s => s.ImpersonatedUser)
            .FirstOrDefaultAsync(s =>
                s.AdminUserId == adminUserId &&
                s.EndedAt == null &&
                s.StartedAt > cutoff);
    }

    public async Task<ImpersonationSession?> GetSessionByIdAsync(Guid sessionId)
    {
        return await _context.ImpersonationSessions
            .Include(s => s.AdminUser)
            .Include(s => s.ImpersonatedUser)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
    }

    public async Task<List<ImpersonationSession>> GetRecentSessionsAsync(int count = 50)
    {
        return await _context.ImpersonationSessions
            .Include(s => s.AdminUser)
            .Include(s => s.ImpersonatedUser)
            .OrderByDescending(s => s.StartedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<ImpersonationEligibilityResult> CanImpersonateAsync(Guid adminUserId, Guid targetUserId)
    {
        // Cannot impersonate yourself
        if (adminUserId == targetUserId)
        {
            return ImpersonationEligibilityResult.Denied("You cannot impersonate yourself.");
        }

        // Get admin user
        var adminUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == adminUserId && !u.IsDeleted);

        if (adminUser == null)
        {
            return ImpersonationEligibilityResult.Denied("Admin user not found.");
        }

        // Check admin has impersonation permission (must be SystemAdmin)
        if (!adminUser.IsSystemAdmin)
        {
            return ImpersonationEligibilityResult.Denied("Only system administrators can impersonate users.");
        }

        // Get target user
        var targetUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == targetUserId && !u.IsDeleted);

        if (targetUser == null)
        {
            return ImpersonationEligibilityResult.Denied("Target user not found.");
        }

        if (!targetUser.IsActive)
        {
            return ImpersonationEligibilityResult.Denied("Cannot impersonate inactive users.");
        }

        // Cannot impersonate another SystemAdmin (privilege escalation prevention)
        if (targetUser.IsSystemAdmin)
        {
            return ImpersonationEligibilityResult.Denied("Cannot impersonate other system administrators.");
        }

        // Check if admin is currently impersonating (prevent chain impersonation)
        var activeSession = await GetActiveSessionAsync(adminUserId);
        if (activeSession != null)
        {
            // Allow starting new session (will end the old one), but log it
            _logger.LogInformation(
                "Admin {AdminUserId} switching impersonation from {OldTarget} to {NewTarget}",
                adminUserId, activeSession.ImpersonatedUserId, targetUserId);
        }

        return ImpersonationEligibilityResult.Allowed();
    }

    public async Task<int> CleanupTimedOutSessionsAsync()
    {
        var timeoutMinutes = _configuration.GetValue("Impersonation:SessionTimeoutMinutes", DefaultSessionTimeoutMinutes);
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);

        var timedOutSessions = await _context.ImpersonationSessions
            .Where(s => s.EndedAt == null && s.StartedAt < cutoff)
            .ToListAsync();

        foreach (var session in timedOutSessions)
        {
            session.EndedAt = DateTime.UtcNow;
            session.EndReason = ImpersonationEndReason.Timeout;
        }

        if (timedOutSessions.Count > 0)
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} timed-out impersonation sessions", timedOutSessions.Count);
        }

        return timedOutSessions.Count;
    }
}

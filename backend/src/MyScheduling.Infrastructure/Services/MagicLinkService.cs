using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Infrastructure.Services;

public class MagicLinkService : IMagicLinkService
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<MagicLinkService> _logger;
    private readonly IConfiguration _configuration;

    // Configuration defaults
    private const int DefaultTokenExpirationMinutes = 15;
    private const int DefaultMaxRequestsPerHour = 5;
    private const int TokenByteLength = 32;

    public MagicLinkService(
        MySchedulingDbContext context,
        ILogger<MagicLinkService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<MagicLinkRequestResult> RequestMagicLinkAsync(string email, string? ipAddress, string? userAgent)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        // Check rate limit first
        if (await IsRateLimitedAsync(normalizedEmail))
        {
            _logger.LogWarning("Magic link rate limit exceeded for email: {Email}", normalizedEmail);
            // Return success but no token to prevent enumeration
            return MagicLinkRequestResult.NoUser();
        }

        // Find user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);

        if (user == null)
        {
            _logger.LogInformation("Magic link requested for non-existent email: {Email}", normalizedEmail);
            // Return success but don't send email - prevents enumeration
            return MagicLinkRequestResult.NoUser();
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Magic link requested for inactive user: {Email}", normalizedEmail);
            return MagicLinkRequestResult.NoUser();
        }

        // Generate secure random token
        var tokenBytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        var token = Convert.ToBase64String(tokenBytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('='); // URL-safe base64

        // Hash the token for storage
        var tokenHash = ComputeTokenHash(token);

        // Calculate expiration
        var expirationMinutes = _configuration.GetValue("MagicLink:ExpirationMinutes", DefaultTokenExpirationMinutes);
        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        // Create and save the token record
        var magicLinkToken = new MagicLinkToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            RequestedFromIp = ipAddress,
            RequestedUserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _context.MagicLinkTokens.Add(magicLinkToken);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Magic link token generated for user {UserId}", user.Id);

        return MagicLinkRequestResult.Succeeded(token, user.Email, expiresAt);
    }

    public async Task<MagicLinkValidationResult> ValidateMagicLinkAsync(string token, string? ipAddress, string? userAgent)
    {
        // Hash the provided token to look up
        var tokenHash = ComputeTokenHash(token);

        // Find the token record
        var magicLinkToken = await _context.MagicLinkTokens
            .Include(t => t.User)
                .ThenInclude(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.IsDeleted);

        if (magicLinkToken == null)
        {
            _logger.LogWarning("Invalid magic link token attempted");
            return MagicLinkValidationResult.Failed(
                "Invalid or expired link. Please request a new one.",
                MagicLinkValidationFailureReason.InvalidToken);
        }

        // Check if already used
        if (magicLinkToken.UsedAt.HasValue)
        {
            _logger.LogWarning("Magic link token already used: {TokenId}", magicLinkToken.Id);
            return MagicLinkValidationResult.Failed(
                "This link has already been used. Please request a new one.",
                MagicLinkValidationFailureReason.AlreadyUsed);
        }

        // Check if expired
        if (DateTime.UtcNow > magicLinkToken.ExpiresAt)
        {
            _logger.LogWarning("Expired magic link token attempted: {TokenId}", magicLinkToken.Id);
            return MagicLinkValidationResult.Failed(
                "This link has expired. Please request a new one.",
                MagicLinkValidationFailureReason.ExpiredToken);
        }

        // Check user status
        var user = magicLinkToken.User;
        if (user == null || user.IsDeleted)
        {
            _logger.LogWarning("Magic link for deleted user: {TokenId}", magicLinkToken.Id);
            return MagicLinkValidationResult.Failed(
                "User account not found.",
                MagicLinkValidationFailureReason.UserNotFound);
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Magic link for inactive user: {UserId}", user.Id);
            return MagicLinkValidationResult.Failed(
                "Account is inactive. Please contact your administrator.",
                MagicLinkValidationFailureReason.UserInactive);
        }

        if (user.LockedOutUntil.HasValue && user.LockedOutUntil.Value > DateTime.UtcNow)
        {
            _logger.LogWarning("Magic link for locked out user: {UserId}", user.Id);
            return MagicLinkValidationResult.Failed(
                "Account is temporarily locked. Please try again later.",
                MagicLinkValidationFailureReason.UserLockedOut);
        }

        // Mark token as used
        magicLinkToken.UsedAt = DateTime.UtcNow;
        magicLinkToken.UsedFromIp = ipAddress;
        magicLinkToken.UsedUserAgent = userAgent;

        // Update user last login
        user.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0; // Reset failed attempts on successful login
        user.LockedOutUntil = null;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Magic link successfully validated for user {UserId}", user.Id);

        return MagicLinkValidationResult.Succeeded(user);
    }

    public async Task<bool> IsRateLimitedAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var maxRequestsPerHour = _configuration.GetValue("MagicLink:MaxRequestsPerHour", DefaultMaxRequestsPerHour);
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);

        // Find user to get their ID
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null)
        {
            // No user = no rate limit (but also no token will be generated)
            return false;
        }

        // Count recent requests for this user
        var recentRequestCount = await _context.MagicLinkTokens
            .CountAsync(t => t.UserId == user.Id && t.CreatedAt > oneHourAgo);

        return recentRequestCount >= maxRequestsPerHour;
    }

    public async Task<int> CleanupExpiredTokensAsync()
    {
        // Delete tokens that expired more than 24 hours ago
        var cutoff = DateTime.UtcNow.AddHours(-24);

        var expiredTokens = await _context.MagicLinkTokens
            .Where(t => t.ExpiresAt < cutoff)
            .ToListAsync();

        if (expiredTokens.Count > 0)
        {
            _context.MagicLinkTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired magic link tokens", expiredTokens.Count);
        }

        return expiredTokens.Count;
    }

    private static string ComputeTokenHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

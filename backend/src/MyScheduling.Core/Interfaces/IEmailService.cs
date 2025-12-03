namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service for sending emails
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Send a magic link email to the specified address
    /// </summary>
    Task<EmailResult> SendMagicLinkEmailAsync(string toEmail, string magicLinkUrl, DateTime expiresAt, string? requestedFromIp);

    /// <summary>
    /// Send a generic email
    /// </summary>
    Task<EmailResult> SendEmailAsync(string toEmail, string subject, string htmlBody, string? plainTextBody = null);
}

public class EmailResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? MessageId { get; set; }

    public static EmailResult Succeeded(string? messageId = null) => new()
    {
        Success = true,
        MessageId = messageId
    };

    public static EmailResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };
}

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Infrastructure.Services;

/// <summary>
/// SMTP-based email service implementation.
/// For production, consider using Azure Communication Services or SendGrid.
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<EmailResult> SendMagicLinkEmailAsync(string toEmail, string magicLinkUrl, DateTime expiresAt, string? requestedFromIp)
    {
        var appName = _configuration["App:Name"] ?? "MyScheduling";
        var expirationMinutes = (int)(expiresAt - DateTime.UtcNow).TotalMinutes;

        var subject = $"Your {appName} Login Link";

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;"">
    <div style=""background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"">
        <h1 style=""color: #1a1a1a; margin-bottom: 24px; font-size: 24px;"">Sign in to {appName}</h1>

        <p style=""color: #4a4a4a; font-size: 16px; line-height: 1.5; margin-bottom: 24px;"">
            Click the button below to sign in to your account. This link will expire in {expirationMinutes} minutes.
        </p>

        <a href=""{magicLinkUrl}""
           style=""display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"">
            Sign In
        </a>

        <p style=""color: #6b7280; font-size: 14px; margin-top: 24px; line-height: 1.5;"">
            If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style=""color: #2563eb; font-size: 14px; word-break: break-all;"">
            {magicLinkUrl}
        </p>

        <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"">

        <div style=""color: #9ca3af; font-size: 12px;"">
            <p style=""margin: 8px 0;"">
                <strong>Security Notice:</strong> This link was requested on {DateTime.UtcNow:MMMM d, yyyy 'at' h:mm tt} UTC
                {(string.IsNullOrEmpty(requestedFromIp) ? "" : $" from IP address {requestedFromIp}")}
            </p>
            <p style=""margin: 8px 0;"">
                If you didn't request this link, you can safely ignore this email. Someone may have entered your email address by mistake.
            </p>
            <p style=""margin: 8px 0;"">
                Never share this link with anyone. {appName} will never ask you for this link.
            </p>
        </div>
    </div>
</body>
</html>";

        var plainTextBody = $@"
Sign in to {appName}
=====================

Click or copy the link below to sign in to your account.
This link will expire in {expirationMinutes} minutes.

{magicLinkUrl}

Security Notice:
- This link was requested on {DateTime.UtcNow:MMMM d, yyyy 'at' h:mm tt} UTC{(string.IsNullOrEmpty(requestedFromIp) ? "" : $" from IP address {requestedFromIp}")}
- If you didn't request this link, you can safely ignore this email.
- Never share this link with anyone.
";

        return await SendEmailAsync(toEmail, subject, htmlBody, plainTextBody);
    }

    public async Task<EmailResult> SendEmailAsync(string toEmail, string subject, string htmlBody, string? plainTextBody = null)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = _configuration.GetValue("Email:SmtpPort", 587);
            var smtpUsername = _configuration["Email:SmtpUsername"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@myscheduling.com";
            var fromName = _configuration["Email:FromName"] ?? "MyScheduling";
            var enableSsl = _configuration.GetValue("Email:EnableSsl", true);

            // Check if email is configured
            if (string.IsNullOrEmpty(smtpHost))
            {
                _logger.LogWarning("SMTP not configured. Email to {ToEmail} not sent. Subject: {Subject}", toEmail, subject);
                // In development, just log and return success
                if (_configuration.GetValue("Email:SkipIfNotConfigured", false))
                {
                    _logger.LogInformation("Email content would have been sent:\nTo: {To}\nSubject: {Subject}\nBody: {Body}",
                        toEmail, subject, plainTextBody ?? "See HTML body");
                    return EmailResult.Succeeded("dev-skipped");
                }
                return EmailResult.Failed("Email service not configured");
            }

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            if (!string.IsNullOrEmpty(smtpUsername) && !string.IsNullOrEmpty(smtpPassword))
            {
                client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            // Add plain text alternative if provided
            if (!string.IsNullOrEmpty(plainTextBody))
            {
                var alternateView = AlternateView.CreateAlternateViewFromString(plainTextBody, null, "text/plain");
                message.AlternateViews.Add(alternateView);
            }

            await client.SendMailAsync(message);

            _logger.LogInformation("Email sent successfully to {ToEmail}. Subject: {Subject}", toEmail, subject);
            return EmailResult.Succeeded();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail}. Subject: {Subject}", toEmail, subject);
            return EmailResult.Failed($"Failed to send email: {ex.Message}");
        }
    }
}

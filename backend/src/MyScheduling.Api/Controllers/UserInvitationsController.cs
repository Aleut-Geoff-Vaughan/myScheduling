using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using BCrypt.Net;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/user-invitations")]
public class UserInvitationsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<UserInvitationsController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public UserInvitationsController(
        MySchedulingDbContext context,
        ILogger<UserInvitationsController> logger,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _environment = environment;
    }

    // POST: api/user-invitations
    // Send invitation to new user
    [HttpPost]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Create)]
    public async Task<ActionResult<InvitationResponse>> CreateInvitation([FromBody] CreateInvitationRequest request)
    {
        try
        {
            // Validate tenant exists
            var tenant = await _context.Tenants.FindAsync(request.TenantId);
            if (tenant == null)
            {
                return NotFound($"Tenant with ID {request.TenantId} not found");
            }

            // Check if user already exists with this email
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                return Conflict("A user with this email already exists");
            }

            // Check if there's already a pending invitation for this email/tenant
            var existingInvitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.Email == request.Email &&
                                          ui.TenantId == request.TenantId &&
                                          ui.Status == (int)InvitationStatus.Pending);

            if (existingInvitation != null)
            {
                return Conflict("An invitation for this email to this tenant is already pending");
            }

            // Validate roles
            if (request.Roles == null || request.Roles.Count == 0)
            {
                return BadRequest("At least one role must be assigned");
            }

            // Generate invitation token
            var invitationToken = Guid.NewGuid().ToString("N");

            // Create invitation
            var invitation = new UserInvitation
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                TenantId = request.TenantId,
                Roles = request.Roles,
                InvitationToken = invitationToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7), // 7-day expiration
                Status = (int)InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserInvitations.Add(invitation);
            await _context.SaveChangesAsync();

            // Load navigation properties for response
            await _context.Entry(invitation)
                .Reference(ui => ui.Tenant)
                .LoadAsync();

            _logger.LogInformation("Created user invitation {InvitationId} for {Email} to tenant {TenantId}",
                invitation.Id, request.Email, request.TenantId);

            // Build invitation URL and email content for manual sending
            var baseUrl = GetFrontendBaseUrl();
            var invitationUrl = $"{baseUrl}/accept-invitation?token={invitationToken}";
            _logger.LogInformation("Invitation URL: {InvitationUrl}", invitationUrl);

            var emailContent = BuildInvitationEmailContent(
                request.Email,
                invitation.Tenant?.Name ?? "Unknown Tenant",
                request.Roles,
                invitationUrl,
                invitation.ExpiresAt);

            var response = new InvitationResponse
            {
                Invitation = invitation,
                InvitationUrl = invitationUrl,
                EmailSubject = emailContent.Subject,
                EmailHtmlBody = emailContent.HtmlBody,
                EmailPlainTextBody = emailContent.PlainTextBody
            };

            return CreatedAtAction(
                nameof(GetInvitation),
                new { id = invitation.Id },
                response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user invitation");
            return StatusCode(500, "An error occurred while creating the invitation");
        }
    }

    // GET: api/user-invitations/{id}
    // Get invitation details
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Read)]
    public async Task<ActionResult<UserInvitation>> GetInvitation(Guid id)
    {
        try
        {
            var invitation = await _context.UserInvitations
                .Include(ui => ui.Tenant)
                .FirstOrDefaultAsync(ui => ui.Id == id);

            if (invitation == null)
            {
                return NotFound($"Invitation with ID {id} not found");
            }

            return Ok(invitation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invitation {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the invitation");
        }
    }

    // GET: api/user-invitations/pending
    // Get all pending invitations
    [HttpGet("pending")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<UserInvitation>>> GetPendingInvitations([FromQuery] Guid? tenantId = null)
    {
        try
        {
            var query = _context.UserInvitations
                .Include(ui => ui.Tenant)
                .Where(ui => ui.Status == (int)InvitationStatus.Pending && ui.ExpiresAt > DateTime.UtcNow);

            if (tenantId.HasValue)
            {
                query = query.Where(ui => ui.TenantId == tenantId.Value);
            }

            var invitations = await query
                .OrderByDescending(ui => ui.CreatedAt)
                .ToListAsync();

            return Ok(invitations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending invitations");
            return StatusCode(500, "An error occurred while retrieving invitations");
        }
    }

    // DELETE: api/user-invitations/{id}
    // Cancel/revoke an invitation
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Delete)]
    public async Task<IActionResult> CancelInvitation(Guid id)
    {
        try
        {
            var invitation = await _context.UserInvitations.FindAsync(id);

            if (invitation == null)
            {
                return NotFound($"Invitation with ID {id} not found");
            }

            if (invitation.Status != (int)InvitationStatus.Pending)
            {
                return BadRequest("Only pending invitations can be cancelled");
            }

            invitation.Status = (int)InvitationStatus.Cancelled;
            invitation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Cancelled invitation {InvitationId}", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling invitation {Id}", id);
            return StatusCode(500, "An error occurred while cancelling the invitation");
        }
    }

    // POST: api/user-invitations/resend/{id}
    // Resend an invitation email - returns email content for manual sending
    [HttpPost("resend/{id}")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Update)]
    public async Task<ActionResult<ResendInvitationResponse>> ResendInvitation(Guid id)
    {
        try
        {
            var invitation = await _context.UserInvitations
                .Include(ui => ui.Tenant)
                .FirstOrDefaultAsync(ui => ui.Id == id);

            if (invitation == null)
            {
                return NotFound($"Invitation with ID {id} not found");
            }

            if (invitation.Status != (int)InvitationStatus.Pending)
            {
                return BadRequest("Only pending invitations can be resent");
            }

            if (invitation.ExpiresAt <= DateTime.UtcNow)
            {
                return BadRequest("Invitation has expired. Please create a new invitation");
            }

            _logger.LogInformation("Resent invitation {InvitationId}", id);

            // Build invitation URL and email content for manual sending
            var baseUrl = GetFrontendBaseUrl();
            var invitationUrl = $"{baseUrl}/accept-invitation?token={invitation.InvitationToken}";
            _logger.LogInformation("Invitation URL: {InvitationUrl}", invitationUrl);

            var emailContent = BuildInvitationEmailContent(
                invitation.Email,
                invitation.Tenant?.Name ?? "Unknown Tenant",
                invitation.Roles,
                invitationUrl,
                invitation.ExpiresAt);

            return Ok(new ResendInvitationResponse
            {
                Message = "Invitation email content generated. Copy and send manually.",
                InvitationUrl = invitationUrl,
                EmailSubject = emailContent.Subject,
                EmailHtmlBody = emailContent.HtmlBody,
                EmailPlainTextBody = emailContent.PlainTextBody
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending invitation {Id}", id);
            return StatusCode(500, "An error occurred while resending the invitation");
        }
    }

    // POST: api/user-invitations/create-user-direct
    // Create a user directly without sending invitation email (admin only)
    [HttpPost("create-user-direct")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Create)]
    public async Task<ActionResult<DirectUserCreationResponse>> CreateUserDirect([FromBody] CreateUserDirectRequest request)
    {
        try
        {
            // Validate tenant exists
            var tenant = await _context.Tenants.FindAsync(request.TenantId);
            if (tenant == null)
            {
                return NotFound($"Tenant with ID {request.TenantId} not found");
            }

            // Check if user already exists with this email
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                return Conflict("A user with this email already exists");
            }

            // Validate roles
            if (request.Roles == null || request.Roles.Count == 0)
            {
                return BadRequest("At least one role must be assigned");
            }

            // Validate password if provided
            if (!string.IsNullOrEmpty(request.Password))
            {
                var passwordError = ValidatePassword(request.Password);
                if (passwordError != null)
                {
                    return BadRequest(passwordError);
                }
            }

            // Create the user
            var userId = Guid.NewGuid();
            var user = new User
            {
                Id = userId,
                Email = request.Email,
                DisplayName = request.DisplayName ?? request.Email.Split('@')[0],
                EntraObjectId = $"local-{userId}", // Unique placeholder for non-SSO users
                IsActive = true,
                IsSystemAdmin = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Set password if provided
            if (!string.IsNullOrEmpty(request.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);
                user.PasswordChangedAt = DateTime.UtcNow;
            }

            _context.Users.Add(user);

            // Create tenant membership
            var membership = new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TenantId = request.TenantId,
                Roles = request.Roles,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TenantMemberships.Add(membership);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created user {UserId} directly for {Email} in tenant {TenantId}",
                user.Id, request.Email, request.TenantId);

            // For users without a password, create an invitation that can be used to set password
            string? setPasswordUrl = null;
            string? setPasswordEmailContent = null;

            if (string.IsNullOrEmpty(request.Password))
            {
                // Create an invitation record so user can complete registration
                var invitationToken = Guid.NewGuid().ToString("N");
                var invitation = new UserInvitation
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    TenantId = request.TenantId,
                    Roles = request.Roles,
                    InvitationToken = invitationToken,
                    ExpiresAt = DateTime.UtcNow.AddDays(7),
                    Status = (int)InvitationStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserInvitations.Add(invitation);
                await _context.SaveChangesAsync();

                var baseUrl = GetFrontendBaseUrl();
                setPasswordUrl = $"{baseUrl}/set-password?token={invitationToken}&userId={user.Id}";

                setPasswordEmailContent = BuildSetPasswordEmailContent(
                    request.Email,
                    user.DisplayName,
                    tenant.Name,
                    setPasswordUrl);
            }

            return Ok(new DirectUserCreationResponse
            {
                Success = true,
                Message = string.IsNullOrEmpty(request.Password)
                    ? "User created successfully. Send the password setup link to complete registration."
                    : "User created successfully with password set.",
                UserId = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                TenantId = request.TenantId,
                TenantName = tenant.Name,
                Roles = request.Roles,
                HasPassword = !string.IsNullOrEmpty(request.Password),
                SetPasswordUrl = setPasswordUrl,
                SetPasswordEmailContent = setPasswordEmailContent
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user directly");
            return StatusCode(500, "An error occurred while creating the user");
        }
    }

    // GET: api/user-invitations/{id}/email-content
    // Get email content for an existing invitation
    [HttpGet("{id}/email-content")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Read)]
    public async Task<ActionResult<InvitationEmailContentResponse>> GetInvitationEmailContent(Guid id)
    {
        try
        {
            var invitation = await _context.UserInvitations
                .Include(ui => ui.Tenant)
                .FirstOrDefaultAsync(ui => ui.Id == id);

            if (invitation == null)
            {
                return NotFound($"Invitation with ID {id} not found");
            }

            var baseUrl = GetFrontendBaseUrl();
            var invitationUrl = $"{baseUrl}/accept-invitation?token={invitation.InvitationToken}";

            var emailContent = BuildInvitationEmailContent(
                invitation.Email,
                invitation.Tenant?.Name ?? "Unknown Tenant",
                invitation.Roles,
                invitationUrl,
                invitation.ExpiresAt);

            return Ok(new InvitationEmailContentResponse
            {
                InvitationId = invitation.Id,
                Email = invitation.Email,
                TenantName = invitation.Tenant?.Name ?? "Unknown Tenant",
                InvitationUrl = invitationUrl,
                ExpiresAt = invitation.ExpiresAt,
                EmailSubject = emailContent.Subject,
                EmailHtmlBody = emailContent.HtmlBody,
                EmailPlainTextBody = emailContent.PlainTextBody
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting email content for invitation {Id}", id);
            return StatusCode(500, "An error occurred while retrieving email content");
        }
    }

    // GET: api/user-invitations/validate?token=xxx
    // Validate an invitation token and return invitation details (public - no auth required)
    [HttpGet("validate")]
    [AllowAnonymous]
    public async Task<ActionResult<InvitationValidationResponse>> ValidateInvitation([FromQuery] string token)
    {
        try
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest("Token is required");
            }

            var invitation = await _context.UserInvitations
                .Include(i => i.Tenant)
                .FirstOrDefaultAsync(i => i.InvitationToken == token);

            if (invitation == null)
            {
                return NotFound(new { message = "Invalid invitation token" });
            }

            if (invitation.ExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "This invitation has expired. Please contact your administrator for a new invitation." });
            }

            if (invitation.AcceptedAt.HasValue)
            {
                return BadRequest(new { message = "This invitation has already been accepted." });
            }

            return Ok(new InvitationValidationResponse
            {
                Email = invitation.Email,
                TenantName = invitation.Tenant?.Name ?? "Unknown",
                Roles = invitation.Roles.Select(r => r.ToString()).ToList(),
                ExpiresAt = invitation.ExpiresAt.ToString("o")
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating invitation token");
            return StatusCode(500, "An error occurred while validating the invitation");
        }
    }

    // POST: api/user-invitations/accept
    // Accept an invitation and create the user account (public - no auth required)
    [HttpPost("accept")]
    [AllowAnonymous]
    public async Task<ActionResult<AcceptInvitationResponse>> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Token))
            {
                return BadRequest("Token is required");
            }

            if (string.IsNullOrEmpty(request.DisplayName))
            {
                return BadRequest("Display name is required");
            }

            if (string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Password is required");
            }

            // Validate password requirements
            var passwordError = ValidatePassword(request.Password);
            if (passwordError != null)
            {
                return BadRequest(new { message = passwordError });
            }

            var invitation = await _context.UserInvitations
                .Include(i => i.Tenant)
                .FirstOrDefaultAsync(i => i.InvitationToken == request.Token);

            if (invitation == null)
            {
                return NotFound(new { message = "Invalid invitation token" });
            }

            if (invitation.ExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "This invitation has expired. Please contact your administrator for a new invitation." });
            }

            if (invitation.AcceptedAt.HasValue)
            {
                return BadRequest(new { message = "This invitation has already been accepted." });
            }

            // Check if user already exists with this email
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == invitation.Email);
            if (existingUser != null)
            {
                return Conflict(new { message = "A user with this email already exists. Please sign in instead." });
            }

            // Create the user
            var userId = Guid.NewGuid();
            var user = new User
            {
                Id = userId,
                Email = invitation.Email,
                DisplayName = request.DisplayName.Trim(),
                EntraObjectId = $"local-{userId}", // Unique placeholder for non-SSO users
                IsActive = true,
                IsSystemAdmin = false,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
                PasswordChangedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            // Create tenant membership
            var membership = new TenantMembership
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TenantId = invitation.TenantId,
                Roles = invitation.Roles,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TenantMemberships.Add(membership);

            // Mark invitation as accepted
            invitation.AcceptedAt = DateTime.UtcNow;
            invitation.Status = 1; // Accepted
            invitation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Invitation accepted. UserId: {UserId}, Email: {Email}, TenantId: {TenantId}, Roles: {Roles}",
                user.Id, user.Email, invitation.TenantId, string.Join(", ", invitation.Roles));

            return Ok(new AcceptInvitationResponse
            {
                Message = "Account created successfully",
                UserId = user.Id.ToString(),
                Email = user.Email,
                DisplayName = user.DisplayName,
                TenantName = invitation.Tenant?.Name ?? "Unknown"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting invitation");
            return StatusCode(500, "An error occurred while accepting the invitation");
        }
    }

    private (string Subject, string HtmlBody, string PlainTextBody) BuildInvitationEmailContent(
        string email,
        string tenantName,
        List<AppRole> roles,
        string invitationUrl,
        DateTime expiresAt)
    {
        var appName = _configuration["App:Name"] ?? "MyScheduling";
        var rolesText = string.Join(", ", roles.Select(r => r.ToString()));

        var subject = $"[{appName}] You've been invited to join {tenantName}";

        var htmlBody = $@"<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Invitation</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;"">
    <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
        <tr>
            <td style=""padding: 40px 20px;"">
                <table role=""presentation"" style=""max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"">
                    <tr>
                        <td style=""padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;"">
                            <h1 style=""margin: 0; font-size: 24px; font-weight: 600; color: #7c3aed;"">
                                {appName}
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style=""padding: 32px;"">
                            <h2 style=""margin: 0 0 16px; font-size: 20px; color: #111827;"">
                                You're Invited!
                            </h2>
                            <p style=""margin: 0 0 16px; color: #374151; line-height: 1.6;"">
                                You have been invited to join <strong>{tenantName}</strong> on {appName}.
                            </p>
                            <div style=""background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 24px 0;"">
                                <p style=""margin: 0 0 8px; font-size: 14px; color: #6b7280;"">
                                    <strong>Role(s):</strong> {rolesText}
                                </p>
                                <p style=""margin: 0; font-size: 14px; color: #6b7280;"">
                                    <strong>Expires:</strong> {expiresAt:MMMM dd, yyyy 'at' h:mm tt} UTC
                                </p>
                            </div>
                            <div style=""text-align: center; margin: 32px 0;"">
                                <a href=""{invitationUrl}"" style=""display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"">
                                    Accept Invitation
                                </a>
                            </div>
                            <p style=""margin: 24px 0 0; font-size: 13px; color: #6b7280; text-align: center;"">
                                Or copy this link:<br>
                                <span style=""font-family: monospace; word-break: break-all; font-size: 12px;"">{invitationUrl}</span>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;"">
                            <p style=""margin: 0; font-size: 12px; color: #9ca3af; text-align: center;"">
                                This invitation expires on {expiresAt:MMMM dd, yyyy}.<br>
                                If you did not expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

        var plainTextBody = $@"{appName} - You're Invited!
========================================

You have been invited to join {tenantName} on {appName}.

Role(s): {rolesText}
Expires: {expiresAt:MMMM dd, yyyy 'at' h:mm tt} UTC

To accept this invitation, click the link below:
{invitationUrl}

---
This invitation expires on {expiresAt:MMMM dd, yyyy}.
If you did not expect this invitation, you can safely ignore this email.";

        return (subject, htmlBody, plainTextBody);
    }

    private string BuildSetPasswordEmailContent(string email, string displayName, string tenantName, string setPasswordUrl)
    {
        var appName = _configuration["App:Name"] ?? "MyScheduling";

        return $@"Welcome to {appName}!

Hello {displayName},

An account has been created for you in {tenantName}. To complete your registration, please set your password using the link below:

{setPasswordUrl}

This link will expire in 7 days.

If you have any questions, please contact your administrator.

---
{appName}";
    }

    private string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return "Password is required";

        if (password.Length < 8)
            return "Password must be at least 8 characters long";

        if (password.Length > 128)
            return "Password must not exceed 128 characters";

        if (!password.Any(char.IsUpper))
            return "Password must contain at least one uppercase letter";

        if (!password.Any(char.IsLower))
            return "Password must contain at least one lowercase letter";

        if (!password.Any(char.IsDigit))
            return "Password must contain at least one number";

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
            return "Password must contain at least one special character";

        return null;
    }

    /// <summary>
    /// Gets the frontend base URL for generating user-facing links (invitations, password reset, etc.)
    /// In Development environment, prefers localhost. In Production, prefers HTTPS URLs.
    /// </summary>
    private string GetFrontendBaseUrl()
    {
        // First check if App:FrontendUrl is explicitly configured
        var configuredUrl = _configuration["App:FrontendUrl"];
        if (!string.IsNullOrEmpty(configuredUrl))
        {
            _logger.LogDebug("Using configured App:FrontendUrl: {Url}", configuredUrl);
            return configuredUrl.TrimEnd('/');
        }

        var allowedOrigins = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (allowedOrigins != null && allowedOrigins.Length > 0)
        {
            // In Development environment, prefer localhost
            if (_environment.IsDevelopment())
            {
                var devOrigin = allowedOrigins.FirstOrDefault(o =>
                    o.Contains("localhost") &&
                    !o.Contains(":5107")); // Exclude API port

                if (!string.IsNullOrEmpty(devOrigin))
                {
                    _logger.LogDebug("Using development CORS origin: {Origin}", devOrigin);
                    return devOrigin.TrimEnd('/');
                }
            }

            // In Production (or if no localhost found), prefer production URLs
            var productionOrigin = allowedOrigins.FirstOrDefault(o =>
                !o.Contains("localhost") &&
                !o.Contains("-api.") &&
                o.StartsWith("https://"));

            if (!string.IsNullOrEmpty(productionOrigin))
            {
                _logger.LogDebug("Using production CORS origin: {Origin}", productionOrigin);
                return productionOrigin.TrimEnd('/');
            }

            // Fall back to any non-API localhost origin
            var fallbackDevOrigin = allowedOrigins.FirstOrDefault(o =>
                o.Contains("localhost") &&
                !o.Contains(":5107")); // Exclude API port

            if (!string.IsNullOrEmpty(fallbackDevOrigin))
            {
                _logger.LogDebug("Using fallback development CORS origin: {Origin}", fallbackDevOrigin);
                return fallbackDevOrigin.TrimEnd('/');
            }
        }

        // Default fallback
        _logger.LogWarning("No suitable frontend URL found in CORS:AllowedOrigins. Using localhost fallback.");
        return "http://localhost:5173";
    }
}

// Request DTOs
public class CreateInvitationRequest
{
    public string Email { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();
}

public class CreateUserDirectRequest
{
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();
    public string? Password { get; set; }
}

// Response DTOs
public class InvitationResponse
{
    public UserInvitation Invitation { get; set; } = null!;
    public string InvitationUrl { get; set; } = string.Empty;
    public string EmailSubject { get; set; } = string.Empty;
    public string EmailHtmlBody { get; set; } = string.Empty;
    public string EmailPlainTextBody { get; set; } = string.Empty;
}

public class ResendInvitationResponse
{
    public string Message { get; set; } = string.Empty;
    public string InvitationUrl { get; set; } = string.Empty;
    public string EmailSubject { get; set; } = string.Empty;
    public string EmailHtmlBody { get; set; } = string.Empty;
    public string EmailPlainTextBody { get; set; } = string.Empty;
}

public class DirectUserCreationResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public List<AppRole> Roles { get; set; } = new();
    public bool HasPassword { get; set; }
    public string? SetPasswordUrl { get; set; }
    public string? SetPasswordEmailContent { get; set; }
}

public class InvitationEmailContentResponse
{
    public Guid InvitationId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string InvitationUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string EmailSubject { get; set; } = string.Empty;
    public string EmailHtmlBody { get; set; } = string.Empty;
    public string EmailPlainTextBody { get; set; } = string.Empty;
}

// Invitation Status Enum
public enum InvitationStatus
{
    Pending,
    Accepted,
    Cancelled,
    Expired
}

// Accept Invitation DTOs
public class AcceptInvitationRequest
{
    public string Token { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AcceptInvitationResponse
{
    public string Message { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
}

public class InvitationValidationResponse
{
    public string Email { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public string ExpiresAt { get; set; } = string.Empty;
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/user-invitations")]
public class UserInvitationsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<UserInvitationsController> _logger;

    public UserInvitationsController(
        MySchedulingDbContext context,
        ILogger<UserInvitationsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // POST: api/user-invitations
    // Send invitation to new user
    [HttpPost]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Create)]
    public async Task<ActionResult<UserInvitation>> CreateInvitation([FromBody] CreateInvitationRequest request)
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

            // TODO: Send invitation email with token
            _logger.LogInformation("Created user invitation {InvitationId} for {Email} to tenant {TenantId}",
                invitation.Id, request.Email, request.TenantId);

            // In development, log the invitation URL
            var invitationUrl = $"{Request.Scheme}://{Request.Host}/accept-invitation?token={invitationToken}";
            _logger.LogInformation("Invitation URL: {InvitationUrl}", invitationUrl);

            return CreatedAtAction(
                nameof(GetInvitation),
                new { id = invitation.Id },
                invitation);
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
    // Resend an invitation email
    [HttpPost("resend/{id}")]
    [RequiresPermission(Resource = "UserInvitation", Action = PermissionAction.Update)]
    public async Task<IActionResult> ResendInvitation(Guid id)
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

            // TODO: Resend invitation email
            _logger.LogInformation("Resent invitation {InvitationId}", id);

            // In development, log the invitation URL
            var invitationUrl = $"{Request.Scheme}://{Request.Host}/accept-invitation?token={invitation.InvitationToken}";
            _logger.LogInformation("Invitation URL: {InvitationUrl}", invitationUrl);

            return Ok(new { message = "Invitation resent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending invitation {Id}", id);
            return StatusCode(500, "An error occurred while resending the invitation");
        }
    }
}

// Request DTOs
public class CreateInvitationRequest
{
    public string Email { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();
}

// Invitation Status Enum
public enum InvitationStatus
{
    Pending,
    Accepted,
    Cancelled,
    Expired
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DelegationOfAuthorityController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<DelegationOfAuthorityController> _logger;

    public DelegationOfAuthorityController(MySchedulingDbContext context, ILogger<DelegationOfAuthorityController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/delegationofauthority
    [HttpGet]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<DelegationOfAuthorityLetter>>> GetDOALetters(
        [FromQuery] string? filter = null) // "created", "assigned", "all"
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();

            var query = _context.DelegationOfAuthorityLetters
                .Include(d => d.DelegatorUser)
                .Include(d => d.DesigneeUser)
                .Include(d => d.Signatures)
                .Include(d => d.Activations)
                .Where(d => tenantIds.Contains(d.TenantId))
                .AsNoTracking();

            // Apply filter
            if (filter == "created")
            {
                query = query.Where(d => d.DelegatorUserId == userId);
            }
            else if (filter == "assigned")
            {
                query = query.Where(d => d.DesigneeUserId == userId);
            }
            else // "all" or null
            {
                query = query.Where(d => d.DelegatorUserId == userId || d.DesigneeUserId == userId);
            }

            var letters = await query
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return Ok(letters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving DOA letters");
            return StatusCode(500, "An error occurred while retrieving DOA letters");
        }
    }

    // GET: api/delegationofauthority/{id}
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Read)]
    public async Task<ActionResult<DelegationOfAuthorityLetter>> GetDOALetter(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();

            var letter = await _context.DelegationOfAuthorityLetters
                .Include(d => d.DelegatorUser)
                .Include(d => d.DesigneeUser)
                .Include(d => d.Signatures)
                .Include(d => d.Activations)
                .FirstOrDefaultAsync(d => d.Id == id && tenantIds.Contains(d.TenantId));

            if (letter == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Check access - user must be delegator or designee
            if (letter.DelegatorUserId != userId && letter.DesigneeUserId != userId)
            {
                return StatusCode(403, "You do not have permission to view this DOA letter");
            }

            return Ok(letter);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while retrieving the DOA letter");
        }
    }

    // POST: api/delegationofauthority
    [HttpPost]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Create)]
    public async Task<ActionResult<DelegationOfAuthorityLetter>> CreateDOALetter(DelegationOfAuthorityLetter letter)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            // Validate dates
            if (letter.EffectiveEndDate <= letter.EffectiveStartDate)
            {
                return BadRequest("Effective end date must be after start date");
            }

            // Validate designee exists
            var designee = await _context.Users
                .Include(u => u.TenantMemberships)
                .FirstOrDefaultAsync(u => u.Id == letter.DesigneeUserId);

            if (designee == null)
            {
                return BadRequest("Designee user not found");
            }

            // Verify designee has access to tenant
            if (!designee.TenantMemberships.Any(tm => tm.TenantId == tenantId && tm.IsActive))
            {
                return BadRequest("Designee does not have access to this tenant");
            }

            // Set IDs and metadata
            letter.Id = Guid.NewGuid();
            letter.DelegatorUserId = userId;
            letter.TenantId = tenantId;
            letter.Status = DOAStatus.Draft;
            letter.CreatedAt = DateTime.UtcNow;

            _context.DelegationOfAuthorityLetters.Add(letter);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetDOALetter),
                new { id = letter.Id },
                letter);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating DOA letter");
            return StatusCode(500, "An error occurred while creating the DOA letter");
        }
    }

    // PUT: api/delegationofauthority/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateDOALetter(Guid id, DelegationOfAuthorityLetter letter)
    {
        if (id != letter.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var existing = await _context.DelegationOfAuthorityLetters
                .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

            if (existing == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Only delegator can modify in Draft status
            if (existing.DelegatorUserId != userId)
            {
                return StatusCode(403, "Only the delegator can modify this DOA letter");
            }

            if (existing.Status != DOAStatus.Draft)
            {
                return BadRequest("Only draft DOA letters can be modified");
            }

            // Update properties
            existing.LetterContent = letter.LetterContent;
            existing.EffectiveStartDate = letter.EffectiveStartDate;
            existing.EffectiveEndDate = letter.EffectiveEndDate;
            existing.IsFinancialAuthority = letter.IsFinancialAuthority;
            existing.IsOperationalAuthority = letter.IsOperationalAuthority;
            existing.Notes = letter.Notes;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while updating the DOA letter");
        }
    }

    // DELETE: api/delegationofauthority/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteDOALetter(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var letter = await _context.DelegationOfAuthorityLetters
                .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

            if (letter == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Only delegator can delete
            if (letter.DelegatorUserId != userId)
            {
                return StatusCode(403, "Only the delegator can delete this DOA letter");
            }

            // Can only delete draft letters
            if (letter.Status != DOAStatus.Draft)
            {
                return BadRequest("Only draft DOA letters can be deleted. Use revoke for active letters.");
            }

            _context.DelegationOfAuthorityLetters.Remove(letter);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while deleting the DOA letter");
        }
    }

    // POST: api/delegationofauthority/{id}/sign
    [HttpPost("{id}/sign")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Approve)]
    public async Task<ActionResult<DigitalSignature>> SignDOALetter(Guid id, [FromBody] SignatureRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var letter = await _context.DelegationOfAuthorityLetters
                .Include(d => d.Signatures)
                .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

            if (letter == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Determine role
            SignatureRole role;
            if (userId == letter.DelegatorUserId)
            {
                role = SignatureRole.Delegator;
            }
            else if (userId == letter.DesigneeUserId)
            {
                role = SignatureRole.Designee;
            }
            else
            {
                return StatusCode(403, "You are not authorized to sign this DOA letter");
            }

            // Check if already signed
            var existingSignature = letter.Signatures.FirstOrDefault(s => s.SignerUserId == userId && s.Role == role);
            if (existingSignature != null)
            {
                return BadRequest("You have already signed this DOA letter");
            }

            // Create signature
            var signature = new DigitalSignature
            {
                Id = Guid.NewGuid(),
                DOALetterId = id,
                SignerUserId = userId,
                Role = role,
                SignatureData = request.SignatureData,
                SignedAt = DateTime.UtcNow,
                IpAddress = request.IpAddress ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                UserAgent = request.UserAgent ?? Request.Headers["User-Agent"].ToString(),
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.DigitalSignatures.Add(signature);

            // Update letter status
            if (letter.Status == DOAStatus.Draft)
            {
                letter.Status = DOAStatus.PendingSignatures;
            }

            // Check if both parties have signed
            var delegatorSigned = letter.Signatures.Any(s => s.Role == SignatureRole.Delegator) || role == SignatureRole.Delegator;
            var designeeSigned = letter.Signatures.Any(s => s.Role == SignatureRole.Designee) || role == SignatureRole.Designee;

            if (delegatorSigned && designeeSigned)
            {
                letter.Status = DOAStatus.Active;
            }

            letter.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(signature);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error signing DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while signing the DOA letter");
        }
    }

    // POST: api/delegationofauthority/{id}/revoke
    [HttpPost("{id}/revoke")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Update)]
    public async Task<IActionResult> RevokeDOALetter(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var letter = await _context.DelegationOfAuthorityLetters
                .Include(d => d.Activations)
                .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

            if (letter == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Only delegator can revoke
            if (letter.DelegatorUserId != userId)
            {
                return StatusCode(403, "Only the delegator can revoke this DOA letter");
            }

            if (letter.Status == DOAStatus.Revoked)
            {
                return BadRequest("DOA letter is already revoked");
            }

            // Deactivate all active activations
            foreach (var activation in letter.Activations.Where(a => a.IsActive))
            {
                activation.IsActive = false;
                activation.DeactivatedAt = DateTime.UtcNow;
                activation.DeactivatedByUserId = userId;
            }

            letter.Status = DOAStatus.Revoked;
            letter.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while revoking the DOA letter");
        }
    }

    // POST: api/delegationofauthority/{id}/activate
    [HttpPost("{id}/activate")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Update)]
    public async Task<ActionResult<DOAActivation>> ActivateDOALetter(Guid id, [FromBody] ActivationRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var letter = await _context.DelegationOfAuthorityLetters
                .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

            if (letter == null)
            {
                return NotFound($"DOA letter with ID {id} not found");
            }

            // Only delegator can activate
            if (letter.DelegatorUserId != userId)
            {
                return StatusCode(403, "Only the delegator can activate this DOA letter");
            }

            // Must be active (fully signed)
            if (letter.Status != DOAStatus.Active)
            {
                return BadRequest("DOA letter must be active (fully signed) to create an activation");
            }

            // Validate dates are within letter's effective dates
            if (request.StartDate < DateOnly.FromDateTime(letter.EffectiveStartDate) ||
                request.EndDate > DateOnly.FromDateTime(letter.EffectiveEndDate))
            {
                return BadRequest("Activation dates must be within the letter's effective dates");
            }

            // Create activation
            var activation = new DOAActivation
            {
                Id = Guid.NewGuid(),
                DOALetterId = id,
                TenantId = tenantId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Reason = request.Reason,
                Notes = request.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.DOAActivations.Add(activation);
            await _context.SaveChangesAsync();

            return Ok(activation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating DOA letter {LetterId}", id);
            return StatusCode(500, "An error occurred while activating the DOA letter");
        }
    }

    // GET: api/delegationofauthority/active
    [HttpGet("active")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<DOAActivation>>> GetActiveActivations([FromQuery] DateOnly? date = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            var checkDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var activations = await _context.DOAActivations
                .Include(a => a.DOALetter)
                    .ThenInclude(d => d.DelegatorUser)
                .Include(a => a.DOALetter)
                    .ThenInclude(d => d.DesigneeUser)
                .Where(a => a.TenantId == tenantId &&
                           a.IsActive &&
                           a.StartDate <= checkDate &&
                           a.EndDate >= checkDate &&
                           (a.DOALetter.DelegatorUserId == userId || a.DOALetter.DesigneeUserId == userId))
                .AsNoTracking()
                .ToListAsync();

            return Ok(activations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active DOA activations");
            return StatusCode(500, "An error occurred while retrieving active DOA activations");
        }
    }
}

public class SignatureRequest
{
    public string SignatureData { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public class ActivationRequest
{
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

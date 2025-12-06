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

            // Optimize: Don't load Signatures in list view - they're heavy collections
            // They can be loaded on-demand when viewing individual letters
            var query = _context.DelegationOfAuthorityLetters
                .Include(d => d.DelegatorUser)
                .Include(d => d.DesigneeUser)
                // Removed: .Include(d => d.Signatures) - Load on demand for detail view
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
    public async Task<ActionResult<DelegationOfAuthorityLetter>> CreateDOALetter(CreateDOALetterRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            // Validate dates
            if (request.EffectiveEndDate <= request.EffectiveStartDate)
            {
                return BadRequest("Effective end date must be after start date");
            }

            // Validate designee exists
            var designee = await _context.Users
                .Include(u => u.TenantMemberships)
                .FirstOrDefaultAsync(u => u.Id == request.DesigneeUserId);

            if (designee == null)
            {
                return BadRequest("Designee user not found");
            }

            // Verify designee has access to tenant
            if (!designee.TenantMemberships.Any(tm => tm.TenantId == tenantId && tm.IsActive))
            {
                return BadRequest("Designee does not have access to this tenant");
            }

            // Create the letter entity from the request
            var letter = new DelegationOfAuthorityLetter
            {
                Id = Guid.NewGuid(),
                DelegatorUserId = userId,
                DesigneeUserId = request.DesigneeUserId,
                TenantId = tenantId,
                SubjectLine = request.SubjectLine,
                LetterContent = request.LetterContent,
                EffectiveStartDate = DateTime.SpecifyKind(request.EffectiveStartDate, DateTimeKind.Utc),
                EffectiveEndDate = DateTime.SpecifyKind(request.EffectiveEndDate, DateTimeKind.Utc),
                IsFinancialAuthority = request.IsFinancialAuthority, // Kept for backward compatibility
                IsOperationalAuthority = request.IsOperationalAuthority, // Kept for backward compatibility
                Notes = request.Notes,
                Status = DOAStatus.Draft,
                CreatedAt = DateTime.UtcNow
            };

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
    public async Task<IActionResult> UpdateDOALetter(Guid id, UpdateDOALetterRequest request)
    {
        if (id != request.Id)
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

            // Validate designee exists
            var designee = await _context.Users
                .Include(u => u.TenantMemberships)
                .FirstOrDefaultAsync(u => u.Id == request.DesigneeUserId);

            if (designee == null)
            {
                return BadRequest("Designee user not found");
            }

            // Verify designee has access to tenant
            if (!designee.TenantMemberships.Any(tm => tm.TenantId == tenantId && tm.IsActive))
            {
                return BadRequest("Designee does not have access to this tenant");
            }

            // Update properties
            existing.DesigneeUserId = request.DesigneeUserId;
            existing.SubjectLine = request.SubjectLine;
            existing.LetterContent = request.LetterContent;
            existing.EffectiveStartDate = DateTime.SpecifyKind(request.EffectiveStartDate, DateTimeKind.Utc);
            existing.EffectiveEndDate = DateTime.SpecifyKind(request.EffectiveEndDate, DateTimeKind.Utc);
            existing.IsFinancialAuthority = request.IsFinancialAuthority; // Kept for backward compatibility
            existing.IsOperationalAuthority = request.IsOperationalAuthority; // Kept for backward compatibility
            existing.Notes = request.Notes;
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

    // GET: api/delegationofauthority/letters/range
    // Returns Active DOA letters whose effective dates overlap with the given date range
    [HttpGet("letters/range")]
    [RequiresPermission(Resource = "DelegationOfAuthority", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<DelegationOfAuthorityLetter>>> GetActiveLettersInRange(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tenantIds = GetUserTenantIds();
            var tenantId = tenantIds.FirstOrDefault();

            // Get all Active DOA letters whose effective dates overlap with the given date range
            var letters = await _context.DelegationOfAuthorityLetters
                .Include(d => d.DelegatorUser)
                .Include(d => d.DesigneeUser)
                .Where(d => tenantIds.Contains(d.TenantId) &&
                           d.Status == DOAStatus.Active &&
                           d.EffectiveStartDate <= endDate &&
                           d.EffectiveEndDate >= startDate &&
                           (d.DelegatorUserId == userId || d.DesigneeUserId == userId))
                .AsNoTracking()
                .ToListAsync();

            return Ok(letters);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Active DOA letters for date range");
            return StatusCode(500, "An error occurred while retrieving DOA letters");
        }
    }
}

public class CreateDOALetterRequest
{
    public Guid DesigneeUserId { get; set; }
    public string SubjectLine { get; set; } = string.Empty;
    public string LetterContent { get; set; } = string.Empty;
    public DateTime EffectiveStartDate { get; set; }
    public DateTime EffectiveEndDate { get; set; }
    public string? Notes { get; set; }

    // Deprecated - kept for backward compatibility during transition
    public bool IsFinancialAuthority { get; set; }
    public bool IsOperationalAuthority { get; set; }
}

public class UpdateDOALetterRequest : CreateDOALetterRequest
{
    public Guid Id { get; set; }
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

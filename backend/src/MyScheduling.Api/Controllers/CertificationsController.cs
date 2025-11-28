using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/certifications")]
[Authorize]
public class CertificationsController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<CertificationsController> _logger;

    public CertificationsController(MySchedulingDbContext context, ILogger<CertificationsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== CERTIFICATION CATALOG ====================

    // GET: api/certifications
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Certification>>> GetCertifications([FromQuery] string? issuer, [FromQuery] string? search)
    {
        var query = _context.Certifications.AsQueryable();

        if (!string.IsNullOrWhiteSpace(issuer))
        {
            query = query.Where(c => c.Issuer != null && c.Issuer.ToLower().Contains(issuer.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()));
        }

        var certifications = await query.OrderBy(c => c.Issuer).ThenBy(c => c.Name).ToListAsync();
        return Ok(certifications);
    }

    // GET: api/certifications/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Certification>> GetCertification(Guid id)
    {
        var certification = await _context.Certifications.FindAsync(id);
        if (certification == null)
        {
            return NotFound($"Certification with ID {id} not found");
        }
        return Ok(certification);
    }

    // POST: api/certifications
    [HttpPost]
    [RequiresPermission(Resource = "Certification", Action = PermissionAction.Create)]
    public async Task<ActionResult<Certification>> CreateCertification([FromBody] CreateCertificationRequest request)
    {
        // Check for duplicate name
        var existing = await _context.Certifications
            .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Name.ToLower());

        if (existing != null)
        {
            return Conflict($"A certification with the name '{request.Name}' already exists");
        }

        var certification = new Certification
        {
            Name = request.Name,
            Issuer = request.Issuer
        };

        _context.Certifications.Add(certification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created certification {CertificationId}: {CertificationName}", certification.Id, certification.Name);

        return CreatedAtAction(nameof(GetCertification), new { id = certification.Id }, certification);
    }

    // PUT: api/certifications/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Certification", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateCertification(Guid id, [FromBody] UpdateCertificationRequest request)
    {
        var certification = await _context.Certifications.FindAsync(id);
        if (certification == null)
        {
            return NotFound($"Certification with ID {id} not found");
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            // Check for duplicate name
            var existing = await _context.Certifications
                .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Name.ToLower() && c.Id != id);

            if (existing != null)
            {
                return Conflict($"A certification with the name '{request.Name}' already exists");
            }

            certification.Name = request.Name;
        }

        if (request.Issuer != null)
        {
            certification.Issuer = request.Issuer;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated certification {CertificationId}", id);

        return NoContent();
    }

    // DELETE: api/certifications/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Certification", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteCertification(Guid id)
    {
        var certification = await _context.Certifications
            .Include(c => c.PersonCertifications)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (certification == null)
        {
            return NotFound($"Certification with ID {id} not found");
        }

        if (certification.PersonCertifications.Any())
        {
            return Conflict($"Cannot delete certification '{certification.Name}' because it is used by {certification.PersonCertifications.Count} user(s)");
        }

        _context.Certifications.Remove(certification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted certification {CertificationId}", id);
        return NoContent();
    }

    // ==================== USER CERTIFICATIONS (PersonCertification) ====================

    // GET: api/certifications/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<PersonCertificationDto>>> GetUserCertifications(Guid userId)
    {
        var certifications = await _context.PersonCertifications
            .Include(pc => pc.Certification)
            .Where(pc => pc.UserId == userId)
            .OrderBy(pc => pc.Certification.Name)
            .Select(pc => new PersonCertificationDto
            {
                Id = pc.Id,
                UserId = pc.UserId,
                CertificationId = pc.CertificationId,
                CertificationName = pc.Certification.Name,
                Issuer = pc.Certification.Issuer,
                IssueDate = pc.IssueDate,
                ExpiryDate = pc.ExpiryDate,
                CredentialId = pc.CredentialId,
                CreatedAt = pc.CreatedAt
            })
            .ToListAsync();

        return Ok(certifications);
    }

    // POST: api/certifications/user/{userId}
    [HttpPost("user/{userId}")]
    public async Task<ActionResult<PersonCertificationDto>> AddUserCertification(Guid userId, [FromBody] AddUserCertificationRequest request)
    {
        Certification? certification;

        if (request.CertificationId.HasValue)
        {
            certification = await _context.Certifications.FindAsync(request.CertificationId.Value);
            if (certification == null)
            {
                return NotFound($"Certification with ID {request.CertificationId} not found");
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.CertificationName))
        {
            // Check if certification exists
            certification = await _context.Certifications
                .FirstOrDefaultAsync(c => c.Name.ToLower() == request.CertificationName.ToLower());

            if (certification == null)
            {
                // Create new certification (user-submitted)
                certification = new Certification
                {
                    Name = request.CertificationName,
                    Issuer = request.Issuer
                };
                _context.Certifications.Add(certification);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Created new certification {CertificationName} for user {UserId}", request.CertificationName, userId);
            }
        }
        else
        {
            return BadRequest("Either CertificationId or CertificationName must be provided");
        }

        // Check if user already has this certification
        var existing = await _context.PersonCertifications
            .FirstOrDefaultAsync(pc => pc.UserId == userId && pc.CertificationId == certification.Id);

        if (existing != null)
        {
            return Conflict($"User already has the certification '{certification.Name}'");
        }

        var personCertification = new PersonCertification
        {
            UserId = userId,
            CertificationId = certification.Id,
            IssueDate = ToUtc(request.IssueDate) ?? DateTime.UtcNow,
            ExpiryDate = ToUtc(request.ExpiryDate),
            CredentialId = request.CredentialId
        };

        _context.PersonCertifications.Add(personCertification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Added certification {CertificationId} to user {UserId}", certification.Id, userId);

        return CreatedAtAction(nameof(GetUserCertifications), new { userId }, new PersonCertificationDto
        {
            Id = personCertification.Id,
            UserId = personCertification.UserId,
            CertificationId = personCertification.CertificationId,
            CertificationName = certification.Name,
            Issuer = certification.Issuer,
            IssueDate = personCertification.IssueDate,
            ExpiryDate = personCertification.ExpiryDate,
            CredentialId = personCertification.CredentialId,
            CreatedAt = personCertification.CreatedAt
        });
    }

    // PUT: api/certifications/user/{userId}/{personCertificationId}
    [HttpPut("user/{userId}/{personCertificationId}")]
    public async Task<ActionResult> UpdateUserCertification(Guid userId, Guid personCertificationId, [FromBody] UpdateUserCertificationRequest request)
    {
        var personCertification = await _context.PersonCertifications
            .FirstOrDefaultAsync(pc => pc.Id == personCertificationId && pc.UserId == userId);

        if (personCertification == null)
        {
            return NotFound($"Person certification with ID {personCertificationId} not found for user {userId}");
        }

        if (request.IssueDate.HasValue)
        {
            personCertification.IssueDate = ToUtc(request.IssueDate.Value) ?? personCertification.IssueDate;
        }

        if (request.ExpiryDate.HasValue)
        {
            personCertification.ExpiryDate = ToUtc(request.ExpiryDate.Value);
        }

        if (request.ClearExpiryDate)
        {
            personCertification.ExpiryDate = null;
        }

        if (request.CredentialId != null)
        {
            personCertification.CredentialId = request.CredentialId;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated user certification {PersonCertificationId}", personCertificationId);

        return NoContent();
    }

    // DELETE: api/certifications/user/{userId}/{personCertificationId}
    [HttpDelete("user/{userId}/{personCertificationId}")]
    public async Task<ActionResult> DeleteUserCertification(Guid userId, Guid personCertificationId)
    {
        var personCertification = await _context.PersonCertifications
            .FirstOrDefaultAsync(pc => pc.Id == personCertificationId && pc.UserId == userId);

        if (personCertification == null)
        {
            return NotFound($"Person certification with ID {personCertificationId} not found for user {userId}");
        }

        _context.PersonCertifications.Remove(personCertification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted user certification {PersonCertificationId}", personCertificationId);
        return NoContent();
    }

    // ==================== ADMIN ENDPOINTS ====================

    // GET: api/certifications/admin/stats
    [HttpGet("admin/stats")]
    [RequiresPermission(Resource = "Certification", Action = PermissionAction.Read)]
    public async Task<ActionResult<CertificationsAdminStats>> GetAdminStats()
    {
        var totalCertifications = await _context.Certifications.CountAsync();
        var totalUserCertifications = await _context.PersonCertifications.CountAsync();
        var usersWithCertifications = await _context.PersonCertifications.Select(pc => pc.UserId).Distinct().CountAsync();

        var certificationsByIssuer = await _context.Certifications
            .GroupBy(c => c.Issuer ?? "Unknown")
            .Select(g => new IssuerCount { Issuer = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        var topCertifications = await _context.PersonCertifications
            .Include(pc => pc.Certification)
            .GroupBy(pc => new { pc.CertificationId, pc.Certification!.Name })
            .Select(g => new TopCertification { CertificationId = g.Key.CertificationId, CertificationName = g.Key.Name, UserCount = g.Count() })
            .OrderByDescending(x => x.UserCount)
            .Take(10)
            .ToListAsync();

        var expiringCertifications = await _context.PersonCertifications
            .Include(pc => pc.Certification)
            .Include(pc => pc.User)
            .Where(pc => pc.ExpiryDate != null && pc.ExpiryDate <= DateTime.UtcNow.AddDays(90))
            .OrderBy(pc => pc.ExpiryDate)
            .Take(10)
            .Select(pc => new ExpiringCertification
            {
                PersonCertificationId = pc.Id,
                UserId = pc.UserId,
                UserName = pc.User!.DisplayName ?? pc.User.Email ?? "Unknown",
                CertificationName = pc.Certification!.Name,
                ExpiryDate = pc.ExpiryDate!.Value
            })
            .ToListAsync();

        return Ok(new CertificationsAdminStats
        {
            TotalCertifications = totalCertifications,
            TotalUserCertifications = totalUserCertifications,
            UsersWithCertifications = usersWithCertifications,
            CertificationsByIssuer = certificationsByIssuer,
            TopCertifications = topCertifications,
            ExpiringCertifications = expiringCertifications
        });
    }

    // GET: api/certifications/admin/issuers
    [HttpGet("admin/issuers")]
    [RequiresPermission(Resource = "Certification", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<string>>> GetIssuers()
    {
        var issuers = await _context.Certifications
            .Where(c => c.Issuer != null)
            .Select(c => c.Issuer!)
            .Distinct()
            .OrderBy(i => i)
            .ToListAsync();

        return Ok(issuers);
    }

    // Helper method to convert DateTime to UTC for PostgreSQL compatibility
    private static DateTime? ToUtc(DateTime? dateTime)
    {
        if (dateTime == null) return null;
        if (dateTime.Value.Kind == DateTimeKind.Utc) return dateTime;
        if (dateTime.Value.Kind == DateTimeKind.Unspecified)
        {
            return DateTime.SpecifyKind(dateTime.Value, DateTimeKind.Utc);
        }
        return dateTime.Value.ToUniversalTime();
    }
}

// DTOs
public class PersonCertificationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CertificationId { get; set; }
    public string CertificationName { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCertificationRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
}

public class UpdateCertificationRequest
{
    public string? Name { get; set; }
    public string? Issuer { get; set; }
}

public class AddUserCertificationRequest
{
    public Guid? CertificationId { get; set; }
    public string? CertificationName { get; set; }
    public string? Issuer { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
}

public class UpdateUserCertificationRequest
{
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public bool ClearExpiryDate { get; set; }
    public string? CredentialId { get; set; }
}

// Admin DTOs
public class CertificationsAdminStats
{
    public int TotalCertifications { get; set; }
    public int TotalUserCertifications { get; set; }
    public int UsersWithCertifications { get; set; }
    public List<IssuerCount> CertificationsByIssuer { get; set; } = new();
    public List<TopCertification> TopCertifications { get; set; } = new();
    public List<ExpiringCertification> ExpiringCertifications { get; set; } = new();
}

public class IssuerCount
{
    public string Issuer { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TopCertification
{
    public Guid CertificationId { get; set; }
    public string CertificationName { get; set; } = string.Empty;
    public int UserCount { get; set; }
}

public class ExpiringCertification
{
    public Guid PersonCertificationId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string CertificationName { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
}

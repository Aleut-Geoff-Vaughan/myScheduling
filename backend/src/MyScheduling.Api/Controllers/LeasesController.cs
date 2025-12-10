using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Api.Controllers;

/// <summary>
/// Lease Management API
/// </summary>
[ApiController]
[Route("api/leases")]
public class LeasesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<LeasesController> _logger;
    private readonly IFileStorageService _fileStorage;

    public LeasesController(
        MySchedulingDbContext context,
        ILogger<LeasesController> logger,
        IFileStorageService fileStorage)
    {
        _context = context;
        _logger = logger;
        _fileStorage = fileStorage;
    }

    // ==================== LEASES ====================

    /// <summary>
    /// Get all leases
    /// </summary>
    [HttpGet]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Lease>>> GetLeases(
        [FromQuery] Guid? officeId = null,
        [FromQuery] LeaseStatus? status = null,
        [FromQuery] bool includeExpired = false)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var query = _context.Leases
                .Include(l => l.Office)
                .Include(l => l.OptionYears)
                .Where(l => l.TenantId == tenantId.Value)
                .AsNoTracking();

            if (officeId.HasValue)
            {
                query = query.Where(l => l.OfficeId == officeId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(l => l.Status == status.Value);
            }

            if (!includeExpired)
            {
                query = query.Where(l => l.Status != LeaseStatus.Expired && l.Status != LeaseStatus.Terminated);
            }

            var leases = await query
                .OrderBy(l => l.Office.Name)
                .ThenBy(l => l.LeaseEndDate)
                .ToListAsync();

            return Ok(leases);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leases");
            return StatusCode(500, "An error occurred while retrieving leases");
        }
    }

    /// <summary>
    /// Get lease by ID
    /// </summary>
    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Read)]
    public async Task<ActionResult<Lease>> GetLease(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var lease = await _context.Leases
                .Include(l => l.Office)
                .Include(l => l.OptionYears)
                .Include(l => l.Amendments)
                .Include(l => l.Attachments)
                .Where(l => l.Id == id && l.TenantId == tenantId.Value)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (lease == null)
                return NotFound();

            return Ok(lease);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving lease");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Create a new lease
    /// </summary>
    [HttpPost]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Create)]
    public async Task<ActionResult<Lease>> CreateLease([FromBody] Lease lease)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            // Validate office exists
            var office = await _context.Offices.FindAsync(lease.OfficeId);
            if (office == null || office.TenantId != tenantId.Value)
                return BadRequest(new { message = "Invalid office" });

            lease.Id = Guid.NewGuid();
            lease.TenantId = tenantId.Value;

            _context.Leases.Add(lease);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLease), new { id = lease.Id }, lease);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating lease");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Update a lease
    /// </summary>
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateLease(Guid id, [FromBody] Lease lease)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var existing = await _context.Leases
                .FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenantId.Value);

            if (existing == null)
                return NotFound();

            // Update fields
            existing.LeaseNumber = lease.LeaseNumber;
            existing.ExternalLeaseId = lease.ExternalLeaseId;
            existing.LandlordName = lease.LandlordName;
            existing.LandlordContactName = lease.LandlordContactName;
            existing.LandlordEmail = lease.LandlordEmail;
            existing.LandlordPhone = lease.LandlordPhone;
            existing.PropertyManagementCompany = lease.PropertyManagementCompany;
            existing.PropertyManagerName = lease.PropertyManagerName;
            existing.PropertyManagerEmail = lease.PropertyManagerEmail;
            existing.PropertyManagerPhone = lease.PropertyManagerPhone;
            existing.LeaseStartDate = lease.LeaseStartDate;
            existing.LeaseEndDate = lease.LeaseEndDate;
            existing.LeaseTerm = lease.LeaseTerm;
            existing.Status = lease.Status;
            existing.SquareFootage = lease.SquareFootage;
            existing.UsableSquareFootage = lease.UsableSquareFootage;
            existing.ParkingSpots = lease.ParkingSpots;
            existing.ReservedParkingSpots = lease.ReservedParkingSpots;
            existing.HasLoadingDock = lease.HasLoadingDock;
            existing.MaxOccupancy = lease.MaxOccupancy;
            existing.BaseRentMonthly = lease.BaseRentMonthly;
            existing.CamChargesMonthly = lease.CamChargesMonthly;
            existing.UtilitiesMonthly = lease.UtilitiesMonthly;
            existing.TaxesMonthly = lease.TaxesMonthly;
            existing.InsuranceMonthly = lease.InsuranceMonthly;
            existing.OtherChargesMonthly = lease.OtherChargesMonthly;
            existing.OtherChargesDescription = lease.OtherChargesDescription;
            existing.SecurityDeposit = lease.SecurityDeposit;
            existing.EscalationPercentage = lease.EscalationPercentage;
            existing.NextEscalationDate = lease.NextEscalationDate;
            existing.RenewalNoticeDeadline = lease.RenewalNoticeDeadline;
            existing.RenewalNoticeDays = lease.RenewalNoticeDays;
            existing.EarlyTerminationDate = lease.EarlyTerminationDate;
            existing.EarlyTerminationFee = lease.EarlyTerminationFee;
            existing.IsAdaCompliant = lease.IsAdaCompliant;
            existing.RequiredSecurityLevel = lease.RequiredSecurityLevel;
            existing.HasScif = lease.HasScif;
            existing.ScifDetails = lease.ScifDetails;
            existing.InsuranceProvider = lease.InsuranceProvider;
            existing.InsurancePolicyNumber = lease.InsurancePolicyNumber;
            existing.InsuranceExpirationDate = lease.InsuranceExpirationDate;
            existing.InsuranceCoverageAmount = lease.InsuranceCoverageAmount;
            existing.CriticalClauses = lease.CriticalClauses;
            existing.SpecialTerms = lease.SpecialTerms;
            existing.Notes = lease.Notes;
            existing.CustomAttributes = lease.CustomAttributes;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating lease");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Delete a lease
    /// </summary>
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteLease(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var lease = await _context.Leases
                .FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenantId.Value);

            if (lease == null)
                return NotFound();

            lease.IsDeleted = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting lease");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== OPTION YEARS ====================

    /// <summary>
    /// Add option year to lease
    /// </summary>
    [HttpPost("{leaseId}/options")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult<LeaseOptionYear>> AddOptionYear(Guid leaseId, [FromBody] LeaseOptionYear option)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var lease = await _context.Leases
                .FirstOrDefaultAsync(l => l.Id == leaseId && l.TenantId == tenantId.Value);

            if (lease == null)
                return NotFound();

            option.Id = Guid.NewGuid();
            option.TenantId = tenantId.Value;
            option.LeaseId = leaseId;

            _context.LeaseOptionYears.Add(option);
            await _context.SaveChangesAsync();

            return Ok(option);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding option year");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Exercise an option year
    /// </summary>
    [HttpPost("{leaseId}/options/{optionId}/exercise")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult> ExerciseOption(Guid leaseId, Guid optionId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            var option = await _context.LeaseOptionYears
                .FirstOrDefaultAsync(o => o.Id == optionId && o.LeaseId == leaseId && o.TenantId == tenantId.Value);

            if (option == null)
                return NotFound();

            if (option.Status != OptionYearStatus.Available)
                return BadRequest(new { message = "Option is not available" });

            option.Status = OptionYearStatus.Exercised;
            option.ExercisedDate = DateOnly.FromDateTime(DateTime.UtcNow);
            option.ExercisedByUserId = userId;

            // Update lease end date
            var lease = await _context.Leases.FindAsync(leaseId);
            if (lease != null)
            {
                lease.LeaseEndDate = option.OptionEndDate;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Option exercised" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exercising option");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== AMENDMENTS ====================

    /// <summary>
    /// Add amendment to lease
    /// </summary>
    [HttpPost("{leaseId}/amendments")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult<LeaseAmendment>> AddAmendment(Guid leaseId, [FromBody] LeaseAmendment amendment)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var lease = await _context.Leases
                .FirstOrDefaultAsync(l => l.Id == leaseId && l.TenantId == tenantId.Value);

            if (lease == null)
                return NotFound();

            amendment.Id = Guid.NewGuid();
            amendment.TenantId = tenantId.Value;
            amendment.LeaseId = leaseId;
            amendment.ProcessedByUserId = userId;

            _context.LeaseAmendments.Add(amendment);
            await _context.SaveChangesAsync();

            return Ok(amendment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding amendment");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== ATTACHMENTS ====================

    /// <summary>
    /// Upload attachment to lease
    /// </summary>
    [HttpPost("{leaseId}/attachments")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult<LeaseAttachment>> UploadAttachment(
        Guid leaseId,
        [FromForm] IFormFile file,
        [FromForm] LeaseAttachmentType type,
        [FromForm] string? description = null)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            if (!tenantId.HasValue || !userId.HasValue)
                return BadRequest(new { message = "Invalid context" });

            var lease = await _context.Leases
                .FirstOrDefaultAsync(l => l.Id == leaseId && l.TenantId == tenantId.Value);

            if (lease == null)
                return NotFound();

            // Upload to blob storage using IFileStorageService
            using var stream = file.OpenReadStream();
            var storedFile = await _fileStorage.UploadFileAsync(
                stream,
                file.FileName,
                file.ContentType,
                "LeaseAttachment",
                leaseId,
                tenantId.Value,
                userId.Value,
                type.ToString());

            var attachment = new LeaseAttachment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId.Value,
                LeaseId = leaseId,
                FileName = file.FileName,
                StoragePath = storedFile.StoragePath,
                StoredFileId = storedFile.Id,
                ContentType = file.ContentType,
                FileSizeBytes = file.Length,
                Type = type,
                Description = description,
                UploadedByUserId = userId.Value,
                UploadedAt = DateTime.UtcNow
            };

            _context.LeaseAttachments.Add(attachment);
            await _context.SaveChangesAsync();

            return Ok(attachment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading attachment");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Download attachment
    /// </summary>
    [HttpGet("{leaseId}/attachments/{attachmentId}/download")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Read)]
    public async Task<ActionResult> DownloadAttachment(Guid leaseId, Guid attachmentId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return BadRequest(new { message = "Invalid user context" });

            var attachment = await _context.LeaseAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId && a.LeaseId == leaseId && a.TenantId == tenantId.Value);

            if (attachment == null)
                return NotFound();

            if (!attachment.StoredFileId.HasValue)
                return NotFound(new { message = "File not found in storage" });

            var stream = await _fileStorage.DownloadFileAsync(attachment.StoredFileId.Value, userId.Value);
            return File(stream, attachment.ContentType, attachment.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading attachment");
            return StatusCode(500, "An error occurred");
        }
    }

    /// <summary>
    /// Delete attachment
    /// </summary>
    [HttpDelete("{leaseId}/attachments/{attachmentId}")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Update)]
    public async Task<ActionResult> DeleteAttachment(Guid leaseId, Guid attachmentId)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return BadRequest(new { message = "Invalid user context" });

            var attachment = await _context.LeaseAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId && a.LeaseId == leaseId && a.TenantId == tenantId.Value);

            if (attachment == null)
                return NotFound();

            // Delete from storage if stored file exists
            if (attachment.StoredFileId.HasValue)
            {
                await _fileStorage.DeleteFileAsync(attachment.StoredFileId.Value, userId.Value);
            }

            _context.LeaseAttachments.Remove(attachment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting attachment");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== REPORTS ====================

    /// <summary>
    /// Get lease calendar (option years and key dates)
    /// </summary>
    [HttpGet("calendar")]
    [HttpGet("calendar/{year:int}")]
    [RequiresPermission(Resource = "Lease", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<LeaseCalendarItem>>> GetLeaseCalendar(
        int? year = null,
        [FromQuery] int months = 12)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            if (!tenantId.HasValue)
                return BadRequest(new { message = "Invalid tenant context" });

            DateOnly startDate;
            DateOnly endDate;

            if (year.HasValue)
            {
                // Year-based filtering: return all events for the specified year
                startDate = new DateOnly(year.Value, 1, 1);
                endDate = new DateOnly(year.Value, 12, 31);
            }
            else
            {
                // Month-based filtering: return events from today for the specified months
                startDate = DateOnly.FromDateTime(DateTime.UtcNow);
                endDate = startDate.AddMonths(months);
            }

            var calendarItems = new List<LeaseCalendarItem>();

            // Get lease end dates
            var leases = await _context.Leases
                .Include(l => l.Office)
                .Where(l => l.TenantId == tenantId.Value &&
                       l.Status == LeaseStatus.Active &&
                       l.LeaseEndDate >= startDate &&
                       l.LeaseEndDate <= endDate)
                .ToListAsync();

            foreach (var lease in leases)
            {
                calendarItems.Add(new LeaseCalendarItem
                {
                    Date = lease.LeaseEndDate,
                    Type = "LeaseEnd",
                    Title = $"{lease.Office.Name} Lease Ends",
                    LeaseId = lease.Id,
                    OfficeName = lease.Office.Name
                });

                if (lease.RenewalNoticeDeadline.HasValue &&
                    lease.RenewalNoticeDeadline >= startDate &&
                    lease.RenewalNoticeDeadline <= endDate)
                {
                    calendarItems.Add(new LeaseCalendarItem
                    {
                        Date = lease.RenewalNoticeDeadline.Value,
                        Type = "RenewalNotice",
                        Title = $"{lease.Office.Name} Renewal Notice Deadline",
                        LeaseId = lease.Id,
                        OfficeName = lease.Office.Name
                    });
                }

                if (lease.InsuranceExpirationDate.HasValue &&
                    lease.InsuranceExpirationDate >= startDate &&
                    lease.InsuranceExpirationDate <= endDate)
                {
                    calendarItems.Add(new LeaseCalendarItem
                    {
                        Date = lease.InsuranceExpirationDate.Value,
                        Type = "InsuranceExpiry",
                        Title = $"{lease.Office.Name} Insurance Expires",
                        LeaseId = lease.Id,
                        OfficeName = lease.Office.Name
                    });
                }
            }

            // Get option year deadlines
            var options = await _context.LeaseOptionYears
                .Include(o => o.Lease)
                .ThenInclude(l => l.Office)
                .Where(o => o.TenantId == tenantId.Value &&
                       o.Status == OptionYearStatus.Available &&
                       o.ExerciseDeadline >= startDate &&
                       o.ExerciseDeadline <= endDate)
                .ToListAsync();

            foreach (var option in options)
            {
                calendarItems.Add(new LeaseCalendarItem
                {
                    Date = option.ExerciseDeadline,
                    Type = "OptionDeadline",
                    Title = $"{option.Lease.Office.Name} Option {option.OptionNumber} Deadline",
                    LeaseId = option.LeaseId,
                    OfficeName = option.Lease.Office.Name,
                    OptionId = option.Id
                });
            }

            return Ok(calendarItems.OrderBy(c => c.Date));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving lease calendar");
            return StatusCode(500, "An error occurred");
        }
    }

    // ==================== HELPER METHODS ====================

    private Guid? GetCurrentTenantId()
    {
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId) &&
            Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderTenantId))
        {
            var userTenantIds = User.FindAll("TenantId")
                .Select(c => Guid.TryParse(c.Value, out var tid) ? tid : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList();
            if (userTenantIds.Contains(parsedHeaderTenantId))
                return parsedHeaderTenantId;
        }

        var tenantIdClaim = User.FindFirst("TenantId")?.Value;
        if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var parsedTenantId))
            return parsedTenantId;

        return null;
    }

    private new Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }
}

public class LeaseCalendarItem
{
    public DateOnly Date { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public Guid LeaseId { get; set; }
    public string OfficeName { get; set; } = string.Empty;
    public Guid? OptionId { get; set; }
}

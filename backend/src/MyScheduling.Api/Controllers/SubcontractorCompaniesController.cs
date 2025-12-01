using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubcontractorCompaniesController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<SubcontractorCompaniesController> _logger;

    public SubcontractorCompaniesController(MySchedulingDbContext context, ILogger<SubcontractorCompaniesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SubcontractorCompanyResponse>>> Get(
        [FromQuery] Guid tenantId,
        [FromQuery] SubcontractorCompanyStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeSubcontractors = false)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var query = _context.SubcontractorCompanies
            .Where(c => c.TenantId == tenantId);

        if (status.HasValue)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c =>
                c.Name.ToLower().Contains(search.ToLower()) ||
                (c.Code != null && c.Code.ToLower().Contains(search.ToLower())) ||
                (c.City != null && c.City.ToLower().Contains(search.ToLower())));
        }

        if (includeSubcontractors)
        {
            query = query.Include(c => c.Subcontractors.Where(s => !s.IsDeleted));
        }

        query = query.Include(c => c.PrimaryContactUser);

        var companies = await query
            .OrderBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

        var response = companies.Select(c => new SubcontractorCompanyResponse
        {
            Id = c.Id,
            TenantId = c.TenantId,
            Name = c.Name,
            Code = c.Code,
            Address = c.Address,
            City = c.City,
            State = c.State,
            Country = c.Country,
            PostalCode = c.PostalCode,
            Phone = c.Phone,
            Website = c.Website,
            PrimaryContactUserId = c.PrimaryContactUserId,
            PrimaryContactName = c.PrimaryContactUser?.DisplayName,
            ForecastContactName = c.ForecastContactName,
            ForecastContactEmail = c.ForecastContactEmail,
            ForecastContactPhone = c.ForecastContactPhone,
            Status = c.Status,
            ContractNumber = c.ContractNumber,
            ContractStartDate = c.ContractStartDate,
            ContractEndDate = c.ContractEndDate,
            Notes = c.Notes,
            SubcontractorCount = includeSubcontractors ? c.Subcontractors.Count : 0,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Read)]
    public async Task<ActionResult<SubcontractorCompanyResponse>> GetById(Guid id, [FromQuery] bool includeSubcontractors = true)
    {
        var query = _context.SubcontractorCompanies
            .Include(c => c.PrimaryContactUser)
            .AsQueryable();

        if (includeSubcontractors)
        {
            query = query.Include(c => c.Subcontractors.Where(s => !s.IsDeleted));
        }

        var company = await query
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(company.TenantId))
        {
            return Forbid();
        }

        return Ok(new SubcontractorCompanyResponse
        {
            Id = company.Id,
            TenantId = company.TenantId,
            Name = company.Name,
            Code = company.Code,
            Address = company.Address,
            City = company.City,
            State = company.State,
            Country = company.Country,
            PostalCode = company.PostalCode,
            Phone = company.Phone,
            Website = company.Website,
            PrimaryContactUserId = company.PrimaryContactUserId,
            PrimaryContactName = company.PrimaryContactUser?.DisplayName,
            ForecastContactName = company.ForecastContactName,
            ForecastContactEmail = company.ForecastContactEmail,
            ForecastContactPhone = company.ForecastContactPhone,
            Status = company.Status,
            ContractNumber = company.ContractNumber,
            ContractStartDate = company.ContractStartDate,
            ContractEndDate = company.ContractEndDate,
            Notes = company.Notes,
            SubcontractorCount = includeSubcontractors ? company.Subcontractors.Count : 0,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        });
    }

    [HttpGet("{id}/subcontractors")]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SubcontractorResponse>>> GetSubcontractors(Guid id)
    {
        var company = await _context.SubcontractorCompanies.FindAsync(id);
        if (company == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(company.TenantId))
        {
            return Forbid();
        }

        var subcontractors = await _context.Subcontractors
            .Where(s => s.SubcontractorCompanyId == id)
            .Include(s => s.CareerJobFamily)
            .OrderBy(s => s.LastName)
            .ThenBy(s => s.FirstName)
            .AsNoTracking()
            .Select(s => new SubcontractorResponse
            {
                Id = s.Id,
                TenantId = s.TenantId,
                SubcontractorCompanyId = s.SubcontractorCompanyId,
                SubcontractorCompanyName = company.Name,
                FirstName = s.FirstName,
                LastName = s.LastName,
                Email = s.Email,
                Phone = s.Phone,
                PositionTitle = s.PositionTitle,
                CareerJobFamilyId = s.CareerJobFamilyId,
                CareerJobFamilyName = s.CareerJobFamily != null ? s.CareerJobFamily.Name : null,
                CareerLevel = s.CareerLevel,
                IsForecastSubmitter = s.IsForecastSubmitter,
                Status = s.Status,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(subcontractors);
    }

    [HttpPost]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Create)]
    public async Task<ActionResult<SubcontractorCompanyResponse>> Create(CreateSubcontractorCompanyDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        var company = new SubcontractorCompany
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            Name = dto.Name,
            Code = dto.Code,
            Address = dto.Address,
            City = dto.City,
            State = dto.State,
            Country = dto.Country,
            PostalCode = dto.PostalCode,
            Phone = dto.Phone,
            Website = dto.Website,
            PrimaryContactUserId = dto.PrimaryContactUserId,
            ForecastContactName = dto.ForecastContactName,
            ForecastContactEmail = dto.ForecastContactEmail,
            ForecastContactPhone = dto.ForecastContactPhone,
            Status = SubcontractorCompanyStatus.Active,
            ContractNumber = dto.ContractNumber,
            ContractStartDate = dto.ContractStartDate,
            ContractEndDate = dto.ContractEndDate,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.SubcontractorCompanies.Add(company);
        await _context.SaveChangesAsync();

        _logger.LogInformation("SubcontractorCompany {Name} created in tenant {TenantId} by {UserId}", dto.Name, dto.TenantId, GetCurrentUserId());

        return CreatedAtAction(nameof(GetById), new { id = company.Id }, new SubcontractorCompanyResponse
        {
            Id = company.Id,
            TenantId = company.TenantId,
            Name = company.Name,
            Code = company.Code,
            Address = company.Address,
            City = company.City,
            State = company.State,
            Country = company.Country,
            PostalCode = company.PostalCode,
            Phone = company.Phone,
            Website = company.Website,
            PrimaryContactUserId = company.PrimaryContactUserId,
            ForecastContactName = company.ForecastContactName,
            ForecastContactEmail = company.ForecastContactEmail,
            ForecastContactPhone = company.ForecastContactPhone,
            Status = company.Status,
            ContractNumber = company.ContractNumber,
            ContractStartDate = company.ContractStartDate,
            ContractEndDate = company.ContractEndDate,
            Notes = company.Notes,
            SubcontractorCount = 0,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        });
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Update)]
    public async Task<ActionResult<SubcontractorCompanyResponse>> Update(Guid id, UpdateSubcontractorCompanyDto dto)
    {
        var company = await _context.SubcontractorCompanies.FindAsync(id);
        if (company == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(company.TenantId))
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) company.Name = dto.Name;
        if (dto.Code != null) company.Code = dto.Code;
        if (dto.Address != null) company.Address = dto.Address;
        if (dto.City != null) company.City = dto.City;
        if (dto.State != null) company.State = dto.State;
        if (dto.Country != null) company.Country = dto.Country;
        if (dto.PostalCode != null) company.PostalCode = dto.PostalCode;
        if (dto.Phone != null) company.Phone = dto.Phone;
        if (dto.Website != null) company.Website = dto.Website;
        if (dto.PrimaryContactUserId.HasValue) company.PrimaryContactUserId = dto.PrimaryContactUserId.Value == Guid.Empty ? null : dto.PrimaryContactUserId.Value;
        if (dto.ForecastContactName != null) company.ForecastContactName = dto.ForecastContactName;
        if (dto.ForecastContactEmail != null) company.ForecastContactEmail = dto.ForecastContactEmail;
        if (dto.ForecastContactPhone != null) company.ForecastContactPhone = dto.ForecastContactPhone;
        if (dto.Status.HasValue) company.Status = dto.Status.Value;
        if (dto.ContractNumber != null) company.ContractNumber = dto.ContractNumber;
        if (dto.ContractStartDate.HasValue) company.ContractStartDate = dto.ContractStartDate.Value;
        if (dto.ContractEndDate.HasValue) company.ContractEndDate = dto.ContractEndDate.Value;
        if (dto.Notes != null) company.Notes = dto.Notes;

        company.UpdatedAt = DateTime.UtcNow;
        company.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        var subcontractorCount = await _context.Subcontractors.CountAsync(s => s.SubcontractorCompanyId == id);

        return Ok(new SubcontractorCompanyResponse
        {
            Id = company.Id,
            TenantId = company.TenantId,
            Name = company.Name,
            Code = company.Code,
            Address = company.Address,
            City = company.City,
            State = company.State,
            Country = company.Country,
            PostalCode = company.PostalCode,
            Phone = company.Phone,
            Website = company.Website,
            PrimaryContactUserId = company.PrimaryContactUserId,
            ForecastContactName = company.ForecastContactName,
            ForecastContactEmail = company.ForecastContactEmail,
            ForecastContactPhone = company.ForecastContactPhone,
            Status = company.Status,
            ContractNumber = company.ContractNumber,
            ContractStartDate = company.ContractStartDate,
            ContractEndDate = company.ContractEndDate,
            Notes = company.Notes,
            SubcontractorCount = subcontractorCount,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        });
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "SubcontractorCompany", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var company = await _context.SubcontractorCompanies.FindAsync(id);
        if (company == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(company.TenantId))
        {
            return Forbid();
        }

        // Check if has active subcontractors
        var hasActiveSubcontractors = await _context.Subcontractors
            .AnyAsync(s => s.SubcontractorCompanyId == id && s.Status == SubcontractorStatus.Active);

        if (hasActiveSubcontractors)
        {
            return BadRequest("Cannot delete company with active subcontractors. Deactivate or remove them first.");
        }

        company.IsDeleted = true;
        company.DeletedAt = DateTime.UtcNow;
        company.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();

        _logger.LogInformation("SubcontractorCompany {Id} deleted by {UserId}", id, GetCurrentUserId());

        return NoContent();
    }
}

// DTOs
public class SubcontractorCompanyResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public Guid? PrimaryContactUserId { get; set; }
    public string? PrimaryContactName { get; set; }
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }
    public SubcontractorCompanyStatus Status { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? Notes { get; set; }
    public int SubcontractorCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateSubcontractorCompanyDto
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public Guid? PrimaryContactUserId { get; set; }
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateSubcontractorCompanyDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public Guid? PrimaryContactUserId { get; set; }
    public string? ForecastContactName { get; set; }
    public string? ForecastContactEmail { get; set; }
    public string? ForecastContactPhone { get; set; }
    public SubcontractorCompanyStatus? Status { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractStartDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? Notes { get; set; }
}

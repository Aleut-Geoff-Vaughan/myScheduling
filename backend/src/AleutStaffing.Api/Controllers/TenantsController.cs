using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(AleutStaffingDbContext context, ILogger<TenantsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/tenants
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants(
        [FromQuery] TenantStatus? status = null)
    {
        try
        {
            var query = _context.Tenants
                .Include(t => t.Users)
                .Include(t => t.People)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(t => t.Status == status.Value);
            }

            var tenants = await query
                .OrderBy(t => t.Name)
                .ToListAsync();

            return Ok(tenants);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants");
            return StatusCode(500, "An error occurred while retrieving tenants");
        }
    }

    // GET: api/tenants/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Tenant>> GetTenant(Guid id)
    {
        try
        {
            var tenant = await _context.Tenants
                .Include(t => t.Users)
                .Include(t => t.People)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
            {
                return NotFound($"Tenant with ID {id} not found");
            }

            return Ok(tenant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant {TenantId}", id);
            return StatusCode(500, "An error occurred while retrieving the tenant");
        }
    }

    // POST: api/tenants
    [HttpPost]
    public async Task<ActionResult<Tenant>> CreateTenant(Tenant tenant)
    {
        try
        {
            // Check for duplicate name
            var existingTenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Name == tenant.Name);

            if (existingTenant != null)
            {
                return Conflict($"A tenant with name '{tenant.Name}' already exists");
            }

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant");
            return StatusCode(500, "An error occurred while creating the tenant");
        }
    }

    // PUT: api/tenants/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTenant(Guid id, Tenant tenant)
    {
        if (id != tenant.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            _context.Entry(tenant).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await TenantExists(id))
                {
                    return NotFound($"Tenant with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant {TenantId}", id);
            return StatusCode(500, "An error occurred while updating the tenant");
        }
    }

    // DELETE: api/tenants/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTenant(Guid id)
    {
        try
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null)
            {
                return NotFound($"Tenant with ID {id} not found");
            }

            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant {TenantId}", id);
            return StatusCode(500, "An error occurred while deleting the tenant");
        }
    }

    // GET: api/tenants/{id}/users
    [HttpGet("{id}/users")]
    public async Task<ActionResult<IEnumerable<User>>> GetTenantUsers(Guid id)
    {
        try
        {
            var users = await _context.Users
                .Where(u => u.TenantMemberships.Any(tm => tm.TenantId == id && tm.IsActive))
                .Include(u => u.TenantMemberships.Where(tm => tm.TenantId == id))
                .OrderBy(u => u.DisplayName)
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users for tenant {TenantId}", id);
            return StatusCode(500, "An error occurred while retrieving tenant users");
        }
    }

    private async Task<bool> TenantExists(Guid id)
    {
        return await _context.Tenants.AnyAsync(e => e.Id == id);
    }
}

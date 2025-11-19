using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AleutStaffingDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var query = _context.Users
                .Include(u => u.RoleAssignments)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(u => u.TenantId == tenantId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u =>
                    u.DisplayName.Contains(search) ||
                    u.Email.Contains(search));
            }

            var users = await query
                .OrderBy(u => u.DisplayName)
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, "An error occurred while retrieving users");
        }
    }

    // GET: api/users/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(Guid id)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.RoleAssignments)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user {UserId}", id);
            return StatusCode(500, "An error occurred while retrieving the user");
        }
    }

    // POST: api/users
    [HttpPost]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        try
        {
            // Check for duplicate email within tenant
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == user.TenantId && u.Email == user.Email);

            if (existingUser != null)
            {
                return Conflict($"A user with email {user.Email} already exists in this tenant");
            }

            // Check for duplicate EntraObjectId
            var existingEntraUser = await _context.Users
                .FirstOrDefaultAsync(u => u.EntraObjectId == user.EntraObjectId);

            if (existingEntraUser != null)
            {
                return Conflict($"A user with Entra Object ID {user.EntraObjectId} already exists");
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return StatusCode(500, "An error occurred while creating the user");
        }
    }

    // PUT: api/users/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, User user)
    {
        if (id != user.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await UserExists(id))
                {
                    return NotFound($"User with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId}", id);
            return StatusCode(500, "An error occurred while updating the user");
        }
    }

    // DELETE: api/users/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", id);
            return StatusCode(500, "An error occurred while deleting the user");
        }
    }

    // POST: api/users/{id}/roles
    [HttpPost("{id}/roles")]
    public async Task<IActionResult> AssignRole(Guid id, [FromBody] RoleAssignment roleAssignment)
    {
        try
        {
            if (id != roleAssignment.UserId)
            {
                return BadRequest("User ID mismatch");
            }

            // Check if role assignment already exists
            var exists = await _context.RoleAssignments
                .AnyAsync(ra => ra.UserId == id && ra.Role == roleAssignment.Role);

            if (exists)
            {
                return Conflict($"User already has the role {roleAssignment.Role}");
            }

            _context.RoleAssignments.Add(roleAssignment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning role to user {UserId}", id);
            return StatusCode(500, "An error occurred while assigning the role");
        }
    }

    // DELETE: api/users/{id}/roles/{roleAssignmentId}
    [HttpDelete("{id}/roles/{roleAssignmentId}")]
    public async Task<IActionResult> RemoveRole(Guid id, Guid roleAssignmentId)
    {
        try
        {
            var roleAssignment = await _context.RoleAssignments.FindAsync(roleAssignmentId);

            if (roleAssignment == null)
            {
                return NotFound($"Role assignment with ID {roleAssignmentId} not found");
            }

            if (roleAssignment.UserId != id)
            {
                return BadRequest("Role assignment does not belong to this user");
            }

            _context.RoleAssignments.Remove(roleAssignment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role from user {UserId}", id);
            return StatusCode(500, "An error occurred while removing the role");
        }
    }

    private async Task<bool> UserExists(Guid id)
    {
        return await _context.Users.AnyAsync(e => e.Id == id);
    }
}

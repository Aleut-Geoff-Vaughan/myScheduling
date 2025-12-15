using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Interfaces;
using MyScheduling.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuthorizationService _authService;

    public UsersController(
        MySchedulingDbContext context,
        ILogger<UsersController> logger,
        IAuthorizationService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    // PATCH: api/users/{id}/profile
    [HttpPatch("{id}/profile")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<User>> UpdateUserProfile(Guid id, [FromBody] UpdateUserProfileRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required");
            }

            // Check duplicate email (other users) - AsNoTracking for read-only check
            var existingUser = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id != id)
                .FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                return Conflict($"Another user already has email {request.Email}");
            }

            user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? user.DisplayName : request.DisplayName;
            user.Email = request.Email;
            user.PhoneNumber = request.PhoneNumber;
            user.JobTitle = request.JobTitle;
            user.Department = request.Department;
            if (Guid.TryParse(request.ManagerId, out var managerId))
            {
                user.ManagerId = managerId;
            }
            else if (string.IsNullOrWhiteSpace(request.ManagerId))
            {
                user.ManagerId = null;
            }
            if (request.IsSystemAdmin.HasValue)
            {
                user.IsSystemAdmin = request.IsSystemAdmin.Value;
            }

            // Home Office
            if (Guid.TryParse(request.HomeOfficeId, out var homeOfficeId))
            {
                user.HomeOfficeId = homeOfficeId;
            }
            else if (string.IsNullOrWhiteSpace(request.HomeOfficeId))
            {
                user.HomeOfficeId = null;
            }

            // Executive Assistant
            if (Guid.TryParse(request.ExecutiveAssistantId, out var executiveAssistantId))
            {
                user.ExecutiveAssistantId = executiveAssistantId;
            }
            else if (string.IsNullOrWhiteSpace(request.ExecutiveAssistantId))
            {
                user.ExecutiveAssistantId = null;
            }

            // Standard Delegates
            if (request.StandardDelegateIds != null)
            {
                user.StandardDelegateIds = request.StandardDelegateIds
                    .Where(id => Guid.TryParse(id, out _))
                    .Select(id => Guid.Parse(id))
                    .ToList();
            }

            // Entra Object ID
            if (!string.IsNullOrWhiteSpace(request.EntraObjectId))
            {
                user.EntraObjectId = request.EntraObjectId;
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user {UserId}", id);
            return StatusCode(500, "An error occurred while updating the user");
        }
    }

    // GET: api/users
    // Returns all users with tenant memberships
    // Use ?tenantId=xxx for tenant-specific filtering (Tenant Admin view)
    // No tenantId parameter returns all users across all tenants (System Admin view)
    [HttpGet]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeInactive = false)
    {
        try
        {
            // Optimize: Add AsNoTracking for read-only list query
            var query = _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .AsNoTracking()
                .AsQueryable();

            // Filter by tenant if specified (Tenant Admin view)
            if (tenantId.HasValue)
            {
                query = query.Where(u => u.TenantMemberships.Any(tm =>
                    tm.TenantId == tenantId.Value &&
                    (includeInactive || tm.IsActive)));
            }

            // Search by name or email
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
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<User>> GetUser(Guid id)
    {
        try
        {
            // Optimize: Add AsNoTracking for read-only detail query
            var user = await _context.Users
                .Include(u => u.TenantMemberships)
                    .ThenInclude(tm => tm.Tenant)
                .AsNoTracking()
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

    // GET: api/users/{id}/logins
    [HttpGet("{id}/logins")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<object>> GetUserLogins(Guid id, [FromQuery] int take = 10)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound($"User with ID {id} not found");
        }

        take = Math.Clamp(take, 1, 100);

        // Optimize: Add AsNoTracking for read-only audit query
        var query = _context.LoginAudits
            .AsNoTracking()
            .Where(l => l.UserId == id)
            .OrderByDescending(l => l.CreatedAt);

        var total = await query.CountAsync();
        var lastSuccess = await query.Where(l => l.IsSuccess).FirstOrDefaultAsync();
        var lastFailed = await query.Where(l => !l.IsSuccess).FirstOrDefaultAsync();
        var items = await query.Take(take).ToListAsync();

        return Ok(new
        {
            totalLogins = total,
            lastSuccessfulAt = lastSuccess?.CreatedAt,
            lastFailedAt = lastFailed?.CreatedAt,
            logins = items.Select(l => new
            {
                l.Id,
                l.Email,
                l.IsSuccess,
                l.IpAddress,
                l.UserAgent,
                l.CreatedAt
            })
        });
    }

    // POST: api/users
    [HttpPost]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Create)]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        try
        {
            // Check for duplicate email (globally unique now)
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == user.Email);

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
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
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

    // DELETE: api/users/{id} (Hard Delete with Archive - Platform Admin Only)
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.HardDelete)]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            // Create archive record before deletion
            var archive = new DataArchive
            {
                Id = Guid.NewGuid(),
                TenantId = null, // Users are cross-tenant
                EntityType = "User",
                EntityId = user.Id,
                EntitySnapshot = System.Text.Json.JsonSerializer.Serialize(user),
                ArchivedAt = DateTime.UtcNow,
                ArchivedByUserId = GetCurrentUserId(),
                Status = DataArchiveStatus.PermanentlyDeleted,
                PermanentlyDeletedAt = DateTime.UtcNow,
                PermanentlyDeletedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow
            };

            _context.DataArchives.Add(archive);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogWarning("User {UserId} HARD DELETED by user {DeletedBy}", id, GetCurrentUserId());

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
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
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
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
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

    // POST: api/users/{id}/deactivate
    [HttpPost("{id}/deactivate")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> DeactivateUser(Guid id, [FromBody] DeactivateUserRequest? request = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (!user.IsActive)
            {
                return BadRequest("User is already deactivated");
            }

            // Prevent deactivating system admins (optional - remove if system admins can be deactivated)
            if (user.IsSystemAdmin)
            {
                return BadRequest("System administrators cannot be deactivated");
            }

            user.IsActive = false;
            user.DeactivatedAt = DateTime.UtcNow;
            user.DeactivatedByUserId = request?.DeactivatedByUserId;
            user.UpdatedAt = DateTime.UtcNow;

            // Optionally deactivate all tenant memberships
            var memberships = await _context.TenantMemberships
                .Where(tm => tm.UserId == id && tm.IsActive)
                .ToListAsync();

            foreach (var membership in memberships)
            {
                membership.IsActive = false;
                membership.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} deactivated by {DeactivatedBy}", id, request?.DeactivatedByUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user {UserId}", id);
            return StatusCode(500, "An error occurred while deactivating the user");
        }
    }

    // POST: api/users/{id}/reactivate
    [HttpPost("{id}/reactivate")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> ReactivateUser(Guid id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound($"User with ID {id} not found");
            }

            if (user.IsActive)
            {
                return BadRequest("User is already active");
            }

            user.IsActive = true;
            user.DeactivatedAt = null;
            user.DeactivatedByUserId = null;
            user.UpdatedAt = DateTime.UtcNow;

            // Note: Tenant memberships are NOT automatically reactivated
            // This must be done separately through the tenant memberships endpoint

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} reactivated", id);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reactivating user {UserId}", id);
            return StatusCode(500, "An error occurred while reactivating the user");
        }
    }

    // GET: api/users/me
    // Get current user's profile
    [HttpGet("me")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Read)]
    public async Task<ActionResult<UserProfileDto>> GetMyProfile()
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            var profile = new UserProfileDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                DisplayName = user.DisplayName,
                ManagerId = user.ManagerId?.ToString(),
                Department = user.Department,
                JobTitle = user.JobTitle,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhotoUrl,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt.ToString("o"),
                LastLoginAt = user.LastLoginAt?.ToString("o")
            };

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user profile");
            return StatusCode(500, "An error occurred while retrieving the profile");
        }
    }

    // PUT: api/users/me
    // Update current user's profile
    [HttpPut("me")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<UserProfileDto>> UpdateMyProfile([FromBody] UpdateUserProfileDto request)
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound("User not found");
            }

            // Update user fields
            user.DisplayName = request.DisplayName;
            user.Department = request.Department;
            user.JobTitle = request.JobTitle;
            user.PhoneNumber = request.PhoneNumber;
            if (Guid.TryParse(request.ManagerId, out var managerId))
            {
                user.ManagerId = managerId;
            }
            else if (string.IsNullOrWhiteSpace(request.ManagerId))
            {
                user.ManagerId = null;
            }
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var profile = new UserProfileDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                DisplayName = user.DisplayName,
                Department = user.Department,
                JobTitle = user.JobTitle,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhotoUrl,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt.ToString("o"),
                LastLoginAt = user.LastLoginAt?.ToString("o")
            };

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile");
            return StatusCode(500, "An error occurred while updating the profile");
        }
    }

    // POST: api/users/me/change-password
    // Change current user's password
    [HttpPost("me/change-password")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordDto request)
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // TODO: Implement proper password verification and hashing
            // For now, this is a placeholder endpoint that returns success
            // In a production system, you would:
            // 1. Verify the current password
            // 2. Hash the new password with a proper algorithm (bcrypt, Argon2, etc.)
            // 3. Store the hashed password

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password change requested for user {UserId}", userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, "An error occurred while changing the password");
        }
    }

    // POST: api/users/me/profile-photo
    // Upload profile photo
    [HttpPost("me/profile-photo")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<ActionResult<ProfilePhotoResponseDto>> UploadProfilePhoto([FromForm] IFormFile file)
    {
        try
        {
            var userId = GetCurrentUserId();

            var uploadFile = file ?? Request.Form.Files.FirstOrDefault();
            if (uploadFile == null || uploadFile.Length == 0)
            {
                return BadRequest("No file uploaded");
            }

            // Basic safety: allow common image extensions; otherwise fallback to .jpg
            var ext = Path.GetExtension(uploadFile.FileName);
            var safeExtension = string.IsNullOrWhiteSpace(ext)
                ? ".jpg"
                : ext.StartsWith(".") ? ext : $".{ext}";

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            var fileName = $"{userId}_{Guid.NewGuid()}{safeExtension}";
            var photoUrl = $"/uploads/profile-photos/{fileName}";

            user.ProfilePhotoUrl = photoUrl;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new ProfilePhotoResponseDto { ProfilePhotoUrl = photoUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading profile photo");
            return StatusCode(500, "An error occurred while uploading the photo");
        }
    }

    // DELETE: api/users/me/profile-photo
    // Delete profile photo
    [HttpDelete("me/profile-photo")]
    [RequiresPermission(Resource = "User", Action = PermissionAction.Update)]
    public async Task<IActionResult> DeleteProfilePhoto()
    {
        try
        {
            var userId = GetCurrentUserId();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // TODO: Delete actual file from storage
            user.ProfilePhotoUrl = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting profile photo");
            return StatusCode(500, "An error occurred while deleting the photo");
        }
    }

    private async Task<bool> UserExists(Guid id)
    {
        return await _context.Users.AnyAsync(e => e.Id == id);
    }
}

// Request DTOs
public class DeactivateUserRequest
{
    public Guid? DeactivatedByUserId { get; set; }
}

public class UserProfileDto
{
    public required string Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public string? ManagerId { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public bool IsActive { get; set; }
    public required string CreatedAt { get; set; }
    public string? LastLoginAt { get; set; }
}

public class UpdateUserProfileDto
{
    public required string DisplayName { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ManagerId { get; set; }
}

public class ChangePasswordDto
{
    public required string CurrentPassword { get; set; }
    public required string NewPassword { get; set; }
    public required string ConfirmPassword { get; set; }
}

public class ProfilePhotoResponseDto
{
    public required string ProfilePhotoUrl { get; set; }
}

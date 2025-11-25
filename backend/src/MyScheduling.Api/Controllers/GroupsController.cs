using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GroupsController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<GroupsController> _logger;

    public GroupsController(MySchedulingDbContext context, ILogger<GroupsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<Group>>> Get(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeMembers = false)
    {
        var query = _context.Groups.AsQueryable();

        if (tenantId.HasValue)
        {
            query = query.Where(g => g.TenantId == tenantId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(g => g.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(g =>
                g.Name.ToLower().Contains(search.ToLower()) ||
                (g.Description != null && g.Description.ToLower().Contains(search.ToLower())));
        }

        if (includeMembers)
        {
            query = query.Include(g => g.Members)
                .ThenInclude(m => m.User);
        }

        var groups = await query
            .OrderBy(g => g.Name)
            .AsNoTracking()
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("{id}")]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Read)]
    public async Task<ActionResult<Group>> GetById(Guid id)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
        {
            return NotFound();
        }

        return Ok(group);
    }

    [HttpPost]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Create)]
    public async Task<ActionResult<Group>> Create(CreateGroupDto dto)
    {
        if (dto.TenantId == Guid.Empty)
        {
            return BadRequest("TenantId is required.");
        }

        if (!HasAccessToTenant(dto.TenantId))
        {
            return Forbid();
        }

        var exists = await _context.Groups.AnyAsync(g =>
            g.TenantId == dto.TenantId &&
            g.Name.ToLower() == dto.Name.ToLower());

        if (exists)
        {
            return BadRequest("A group with that name already exists in this tenant.");
        }

        var group = new Group
        {
            Id = Guid.NewGuid(),
            TenantId = dto.TenantId,
            Name = dto.Name,
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Group {GroupName} created in tenant {TenantId} by {UserId}", dto.Name, dto.TenantId, GetCurrentUserId());

        return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
    }

    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Update)]
    public async Task<ActionResult<Group>> Update(Guid id, UpdateGroupDto dto)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(group.TenantId))
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.Name) && !dto.Name.Equals(group.Name, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await _context.Groups.AnyAsync(g =>
                g.TenantId == group.TenantId &&
                g.Name.ToLower() == dto.Name.ToLower() &&
                g.Id != id);

            if (exists)
            {
                return BadRequest("A group with that name already exists in this tenant.");
            }

            group.Name = dto.Name;
        }

        if (dto.Description != null)
        {
            group.Description = dto.Description;
        }

        if (dto.IsActive.HasValue)
        {
            group.IsActive = dto.IsActive.Value;
        }

        group.UpdatedAt = DateTime.UtcNow;
        group.UpdatedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();
        return Ok(group);
    }

    [HttpPost("{id}/members")]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Update)]
    public async Task<ActionResult<GroupMember>> AddMember(Guid id, AddGroupMemberDto dto)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(group.TenantId))
        {
            return Forbid();
        }

        var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
        {
            return BadRequest("User not found.");
        }

        var existing = await _context.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == dto.UserId);

        if (existing != null)
        {
            existing.Role = dto.Role ?? existing.Role;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedByUserId = GetCurrentUserId();
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            TenantId = group.TenantId,
            GroupId = id,
            UserId = dto.UserId,
            Role = dto.Role ?? GroupMemberRole.Member,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.GroupMembers.Add(member);
        await _context.SaveChangesAsync();

        return Ok(member);
    }

    [HttpDelete("{id}/members/{userId}")]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Update)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var member = await _context.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId);

        if (member == null)
        {
            return NotFound();
        }

        _context.GroupMembers.Remove(member);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Group", Action = PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(group.TenantId))
        {
            return Forbid();
        }

        group.IsDeleted = true;
        group.DeletedAt = DateTime.UtcNow;
        group.DeletedByUserId = GetCurrentUserId();

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateGroupDto
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateGroupDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class AddGroupMemberDto
{
    public Guid UserId { get; set; }
    public GroupMemberRole? Role { get; set; }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/skills")]
[Authorize]
public class SkillsController : ControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(MySchedulingDbContext context, ILogger<SkillsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== SKILL CATALOG ====================

    // GET: api/skills
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Skill>>> GetSkills([FromQuery] SkillCategory? category, [FromQuery] string? search)
    {
        var query = _context.Skills.AsQueryable();

        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s => s.Name.ToLower().Contains(search.ToLower()));
        }

        var skills = await query.OrderBy(s => s.Category).ThenBy(s => s.Name).ToListAsync();
        return Ok(skills);
    }

    // GET: api/skills/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Skill>> GetSkill(Guid id)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null)
        {
            return NotFound($"Skill with ID {id} not found");
        }
        return Ok(skill);
    }

    // POST: api/skills
    [HttpPost]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Create)]
    public async Task<ActionResult<Skill>> CreateSkill([FromBody] CreateSkillRequest request)
    {
        // Check for duplicate name
        var existing = await _context.Skills
            .FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.ToLower());

        if (existing != null)
        {
            return Conflict($"A skill with the name '{request.Name}' already exists");
        }

        var skill = new Skill
        {
            Name = request.Name,
            Category = request.Category
        };

        _context.Skills.Add(skill);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created skill {SkillId}: {SkillName}", skill.Id, skill.Name);

        return CreatedAtAction(nameof(GetSkill), new { id = skill.Id }, skill);
    }

    // PUT: api/skills/{id}
    [HttpPut("{id}")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateSkill(Guid id, [FromBody] UpdateSkillRequest request)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null)
        {
            return NotFound($"Skill with ID {id} not found");
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            // Check for duplicate name
            var existing = await _context.Skills
                .FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.ToLower() && s.Id != id);

            if (existing != null)
            {
                return Conflict($"A skill with the name '{request.Name}' already exists");
            }

            skill.Name = request.Name;
        }

        if (request.Category.HasValue)
        {
            skill.Category = request.Category.Value;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated skill {SkillId}", id);

        return NoContent();
    }

    // DELETE: api/skills/{id}
    [HttpDelete("{id}")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteSkill(Guid id)
    {
        var skill = await _context.Skills
            .Include(s => s.PersonSkills)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (skill == null)
        {
            return NotFound($"Skill with ID {id} not found");
        }

        if (skill.PersonSkills.Any())
        {
            return Conflict($"Cannot delete skill '{skill.Name}' because it is used by {skill.PersonSkills.Count} user(s)");
        }

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted skill {SkillId}", id);
        return NoContent();
    }

    // ==================== USER SKILLS (PersonSkill) ====================

    // GET: api/skills/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<PersonSkill>>> GetUserSkills(Guid userId)
    {
        var skills = await _context.PersonSkills
            .Include(ps => ps.Skill)
            .Where(ps => ps.UserId == userId)
            .OrderBy(ps => ps.Skill.Category)
            .ThenByDescending(ps => ps.ProficiencyLevel)
            .ThenBy(ps => ps.Skill.Name)
            .ToListAsync();

        return Ok(skills);
    }

    // POST: api/skills/user/{userId}
    [HttpPost("user/{userId}")]
    [RequiresPermission(Resource = "PersonSkill", Action = PermissionAction.Create)]
    public async Task<ActionResult<PersonSkill>> AddUserSkill(Guid userId, [FromBody] AddUserSkillRequest request)
    {
        try
        {
            Skill skill;

            if (request.SkillId.HasValue)
            {
                // Use existing skill
                var existingSkill = await _context.Skills.FindAsync(request.SkillId.Value);
                if (existingSkill == null)
                {
                    return NotFound($"Skill with ID {request.SkillId} not found");
                }
                skill = existingSkill;
            }
            else if (!string.IsNullOrWhiteSpace(request.SkillName))
            {
                // Create or find skill by name
                skill = await _context.Skills
                    .FirstOrDefaultAsync(s => s.Name.ToLower() == request.SkillName.ToLower());

                if (skill == null)
                {
                    skill = new Skill
                    {
                        Name = request.SkillName,
                        Category = request.Category ?? SkillCategory.Other,
                        IsApproved = false // User-created skills need admin approval
                    };
                    _context.Skills.Add(skill);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Created new skill {SkillName} for user {UserId} (pending approval)", request.SkillName, userId);
                }
            }
            else
            {
                return BadRequest("Either SkillId or SkillName must be provided");
            }

            // Check if user already has this skill
            var existingUserSkill = await _context.PersonSkills
                .FirstOrDefaultAsync(ps => ps.UserId == userId && ps.SkillId == skill.Id);

            if (existingUserSkill != null)
            {
                return Conflict($"User already has the skill '{skill.Name}'");
            }

            var personSkill = new PersonSkill
            {
                UserId = userId,
                SkillId = skill.Id,
                ProficiencyLevel = request.ProficiencyLevel,
                LastUsedDate = ToUtc(request.LastUsedDate)
            };

            _context.PersonSkills.Add(personSkill);
            await _context.SaveChangesAsync();

            // Reload with navigation property
            await _context.Entry(personSkill).Reference(ps => ps.Skill).LoadAsync();

            _logger.LogInformation("Added skill {SkillId} to user {UserId}", skill.Id, userId);

            return CreatedAtAction(nameof(GetUserSkills), new { userId }, personSkill);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding skill to user {UserId}", userId);
            return StatusCode(500, "An error occurred while adding the skill");
        }
    }

    // PUT: api/skills/user/{userId}/{personSkillId}
    [HttpPut("user/{userId}/{personSkillId}")]
    [RequiresPermission(Resource = "PersonSkill", Action = PermissionAction.Update)]
    public async Task<ActionResult> UpdateUserSkill(Guid userId, Guid personSkillId, [FromBody] UpdateUserSkillRequest request)
    {
        var personSkill = await _context.PersonSkills
            .FirstOrDefaultAsync(ps => ps.Id == personSkillId && ps.UserId == userId);

        if (personSkill == null)
        {
            return NotFound($"User skill with ID {personSkillId} not found for user {userId}");
        }

        if (request.ProficiencyLevel.HasValue)
        {
            personSkill.ProficiencyLevel = request.ProficiencyLevel.Value;
        }

        if (request.LastUsedDate.HasValue)
        {
            personSkill.LastUsedDate = ToUtc(request.LastUsedDate);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated user skill {PersonSkillId}", personSkillId);

        return NoContent();
    }

    // DELETE: api/skills/user/{userId}/{personSkillId}
    [HttpDelete("user/{userId}/{personSkillId}")]
    [RequiresPermission(Resource = "PersonSkill", Action = PermissionAction.Delete)]
    public async Task<ActionResult> DeleteUserSkill(Guid userId, Guid personSkillId)
    {
        var personSkill = await _context.PersonSkills
            .FirstOrDefaultAsync(ps => ps.Id == personSkillId && ps.UserId == userId);

        if (personSkill == null)
        {
            return NotFound($"User skill with ID {personSkillId} not found for user {userId}");
        }

        _context.PersonSkills.Remove(personSkill);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted user skill {PersonSkillId}", personSkillId);
        return NoContent();
    }

    // ==================== ADMIN ENDPOINTS ====================

    // GET: api/skills/admin/stats
    [HttpGet("admin/stats")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Read)]
    public async Task<ActionResult<SkillsAdminStats>> GetAdminStats()
    {
        var totalSkills = await _context.Skills.CountAsync();
        var totalUserSkills = await _context.PersonSkills.CountAsync();
        var usersWithSkills = await _context.PersonSkills.Select(ps => ps.UserId).Distinct().CountAsync();

        var skillsByCategory = await _context.Skills
            .GroupBy(s => s.Category)
            .Select(g => new CategoryCount { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        var userDefinedSkills = await _context.Skills
            .Where(s => !s.IsApproved)
            .CountAsync();

        var topSkills = await _context.PersonSkills
            .Include(ps => ps.Skill)
            .GroupBy(ps => new { ps.SkillId, ps.Skill!.Name })
            .Select(g => new TopSkill { SkillId = g.Key.SkillId, SkillName = g.Key.Name, UserCount = g.Count() })
            .OrderByDescending(x => x.UserCount)
            .Take(10)
            .ToListAsync();

        return Ok(new SkillsAdminStats
        {
            TotalSkills = totalSkills,
            TotalUserSkills = totalUserSkills,
            UsersWithSkills = usersWithSkills,
            UserDefinedSkills = userDefinedSkills,
            SkillsByCategory = skillsByCategory,
            TopSkills = topSkills
        });
    }

    // GET: api/skills/admin/pending-review
    [HttpGet("admin/pending-review")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<SkillWithUsers>>> GetPendingReviewSkills()
    {
        var pendingSkills = await _context.Skills
            .Where(s => !s.IsApproved)
            .Include(s => s.PersonSkills)
                .ThenInclude(ps => ps.User)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

        var result = pendingSkills.Select(s => new SkillWithUsers
        {
            Id = s.Id,
            Name = s.Name,
            Category = s.Category,
            IsApproved = s.IsApproved,
            CreatedAt = s.CreatedAt,
            UserCount = s.PersonSkills.Count,
            Users = s.PersonSkills.Select(ps => new SkillUserInfo
            {
                UserId = ps.UserId,
                UserName = ps.User?.DisplayName ?? "Unknown",
                ProficiencyLevel = ps.ProficiencyLevel
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    // POST: api/skills/admin/approve/{id}
    [HttpPost("admin/approve/{id}")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Update)]
    public async Task<ActionResult> ApproveSkill(Guid id, [FromBody] ApproveSkillRequest request)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null)
        {
            return NotFound($"Skill with ID {id} not found");
        }

        skill.IsApproved = true;
        if (request.Category.HasValue)
        {
            skill.Category = request.Category.Value;
        }
        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            skill.Name = request.Name;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Approved skill {SkillId}: {SkillName}", id, skill.Name);

        return NoContent();
    }

    // POST: api/skills/admin/reject/{id}
    [HttpPost("admin/reject/{id}")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Delete)]
    public async Task<ActionResult> RejectSkill(Guid id, [FromBody] RejectSkillRequest request)
    {
        var skill = await _context.Skills
            .Include(s => s.PersonSkills)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (skill == null)
        {
            return NotFound($"Skill with ID {id} not found");
        }

        // If there's a replacement skill, migrate users to it
        if (request.ReplacementSkillId.HasValue)
        {
            var replacementSkill = await _context.Skills.FindAsync(request.ReplacementSkillId.Value);
            if (replacementSkill == null)
            {
                return BadRequest($"Replacement skill with ID {request.ReplacementSkillId} not found");
            }

            foreach (var personSkill in skill.PersonSkills.ToList())
            {
                // Check if user already has the replacement skill
                var existing = await _context.PersonSkills
                    .FirstOrDefaultAsync(ps => ps.UserId == personSkill.UserId && ps.SkillId == request.ReplacementSkillId.Value);

                if (existing == null)
                {
                    personSkill.SkillId = request.ReplacementSkillId.Value;
                }
                else
                {
                    // User already has replacement skill, just remove this one
                    _context.PersonSkills.Remove(personSkill);
                }
            }
        }
        else
        {
            // Remove all user associations
            _context.PersonSkills.RemoveRange(skill.PersonSkills);
        }

        // Remove the skill
        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Rejected and removed skill {SkillId}: {SkillName}", id, skill.Name);

        return NoContent();
    }

    // POST: api/skills/admin/bulk-approve
    [HttpPost("admin/bulk-approve")]
    [RequiresPermission(Resource = "Skill", Action = PermissionAction.Update)]
    public async Task<ActionResult<SkillsBulkOperationResult>> BulkApproveSkills([FromBody] BulkSkillsRequest request)
    {
        var skills = await _context.Skills
            .Where(s => request.SkillIds.Contains(s.Id))
            .ToListAsync();

        var approved = 0;
        foreach (var skill in skills)
        {
            skill.IsApproved = true;
            approved++;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Bulk approved {Count} skills", approved);

        return Ok(new SkillsBulkOperationResult { Processed = approved, Total = request.SkillIds.Count });
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
public class CreateSkillRequest
{
    public string Name { get; set; } = string.Empty;
    public SkillCategory Category { get; set; } = SkillCategory.Other;
}

public class UpdateSkillRequest
{
    public string? Name { get; set; }
    public SkillCategory? Category { get; set; }
}

public class AddUserSkillRequest
{
    public Guid? SkillId { get; set; }
    public string? SkillName { get; set; }
    public SkillCategory? Category { get; set; }
    public ProficiencyLevel ProficiencyLevel { get; set; } = ProficiencyLevel.Intermediate;
    public DateTime? LastUsedDate { get; set; }
}

public class UpdateUserSkillRequest
{
    public ProficiencyLevel? ProficiencyLevel { get; set; }
    public DateTime? LastUsedDate { get; set; }
}

// Admin DTOs
public class SkillsAdminStats
{
    public int TotalSkills { get; set; }
    public int TotalUserSkills { get; set; }
    public int UsersWithSkills { get; set; }
    public int UserDefinedSkills { get; set; }
    public List<CategoryCount> SkillsByCategory { get; set; } = new();
    public List<TopSkill> TopSkills { get; set; } = new();
}

public class CategoryCount
{
    public SkillCategory Category { get; set; }
    public int Count { get; set; }
}

public class TopSkill
{
    public Guid SkillId { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public int UserCount { get; set; }
}

public class SkillWithUsers
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public SkillCategory Category { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }
    public int UserCount { get; set; }
    public List<SkillUserInfo> Users { get; set; } = new();
}

public class SkillUserInfo
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public ProficiencyLevel ProficiencyLevel { get; set; }
}

public class ApproveSkillRequest
{
    public string? Name { get; set; }
    public SkillCategory? Category { get; set; }
}

public class RejectSkillRequest
{
    public Guid? ReplacementSkillId { get; set; }
}

public class BulkSkillsRequest
{
    public List<Guid> SkillIds { get; set; } = new();
}

public class SkillsBulkOperationResult
{
    public int Processed { get; set; }
    public int Total { get; set; }
}

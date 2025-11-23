using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Api.Attributes;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ValidationController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly IValidationEngine _validationEngine;
    private readonly IRuleInterpreter _ruleInterpreter;
    private readonly ILogger<ValidationController> _logger;

    public ValidationController(
        MySchedulingDbContext context,
        IValidationEngine validationEngine,
        IRuleInterpreter ruleInterpreter,
        ILogger<ValidationController> logger)
    {
        _context = context;
        _validationEngine = validationEngine;
        _ruleInterpreter = ruleInterpreter;
        _logger = logger;
    }

    // ==================== VALIDATION RULES CRUD ====================

    [HttpGet("rules")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ValidationRule>>> GetRules(
        [FromQuery] Guid tenantId,
        [FromQuery] string? entityType = null,
        [FromQuery] string? fieldName = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _context.ValidationRules.Where(r => r.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(r => r.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(fieldName))
            query = query.Where(r => r.FieldName == fieldName);

        if (isActive.HasValue)
            query = query.Where(r => r.IsActive == isActive.Value);

        var rules = await query
            .OrderBy(r => r.EntityType)
            .ThenBy(r => r.ExecutionOrder)
            .ThenBy(r => r.FieldName)
            .ToListAsync();

        return Ok(rules);
    }

    [HttpGet("rules/{id}")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public async Task<ActionResult<ValidationRule>> GetRule(Guid id, [FromQuery] Guid tenantId)
    {
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
            return NotFound();

        return Ok(rule);
    }

    [HttpPost("rules")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Create)]
    public async Task<ActionResult<ValidationRule>> CreateRule([FromQuery] Guid tenantId, [FromBody] ValidationRule rule)
    {
        rule.TenantId = tenantId;
        rule.Id = Guid.NewGuid();
        rule.CreatedAt = DateTime.UtcNow;

        if (!_ruleInterpreter.ValidateExpression(rule.RuleType, rule.RuleExpression))
            return BadRequest(new { error = "Invalid rule expression for the specified rule type" });

        _context.ValidationRules.Add(rule);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRule), new { id = rule.Id, tenantId }, rule);
    }

    [HttpPut("rules/{id}")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Update)]
    public async Task<IActionResult> UpdateRule(Guid id, [FromQuery] Guid tenantId, [FromBody] ValidationRule rule)
    {
        var existingRule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (existingRule == null)
            return NotFound();

        if (!_ruleInterpreter.ValidateExpression(rule.RuleType, rule.RuleExpression))
            return BadRequest(new { error = "Invalid rule expression for the specified rule type" });

        existingRule.EntityType = rule.EntityType;
        existingRule.FieldName = rule.FieldName;
        existingRule.RuleType = rule.RuleType;
        existingRule.Severity = rule.Severity;
        existingRule.RuleExpression = rule.RuleExpression;
        existingRule.ErrorMessage = rule.ErrorMessage;
        existingRule.IsActive = rule.IsActive;
        existingRule.Name = rule.Name;
        existingRule.Description = rule.Description;
        existingRule.ExecutionOrder = rule.ExecutionOrder;
        existingRule.Conditions = rule.Conditions;
        existingRule.Metadata = rule.Metadata;
        existingRule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("rules/{id}")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Delete)]
    public async Task<IActionResult> DeleteRule(Guid id, [FromQuery] Guid tenantId)
    {
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
            return NotFound();

        _context.ValidationRules.Remove(rule);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("rules/{id}/active")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Update)]
    public async Task<IActionResult> SetRuleActive(Guid id, [FromQuery] Guid tenantId, [FromBody] SetActiveRequest request)
    {
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
            return NotFound();

        rule.IsActive = request.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ==================== VALIDATION OPERATIONS ====================

    [HttpPost("validate")]
    [RequiresPermission(Resource = "Validation", Action = PermissionAction.Read)]
    public async Task<ActionResult<ValidationResult>> ValidateEntity([FromQuery] Guid tenantId, [FromBody] ValidateEntityRequest request)
    {
        var result = await _validationEngine.ValidateAsync(request.EntityType, request.EntityData, tenantId);
        return Ok(result);
    }

    [HttpPost("validate-field")]
    [RequiresPermission(Resource = "Validation", Action = PermissionAction.Read)]
    public async Task<ActionResult<ValidationResult>> ValidateField([FromQuery] Guid tenantId, [FromBody] ValidateFieldRequest request)
    {
        var result = await _validationEngine.ValidateFieldAsync(
            request.EntityType,
            request.FieldName,
            request.FieldValue,
            request.EntityData ?? new Dictionary<string, object?>(),
            tenantId);

        return Ok(result);
    }

    [HttpPost("rules/{id}/test")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public async Task<ActionResult<ValidationResult>> TestRule(Guid id, [FromQuery] Guid tenantId, [FromBody] Dictionary<string, object?> testData)
    {
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
            return NotFound();

        var result = await _validationEngine.TestRuleAsync(rule, testData);
        return Ok(result);
    }

    [HttpGet("rules/entity/{entityType}")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ValidationRule>>> GetRulesForEntity(string entityType, [FromQuery] Guid tenantId)
    {
        var rules = await _validationEngine.GetRulesForEntityAsync(entityType, tenantId);
        return Ok(rules);
    }

    [HttpGet("entity-types")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<string>>> GetEntityTypes([FromQuery] Guid tenantId)
    {
        var entityTypes = await _context.ValidationRules
            .Where(r => r.TenantId == tenantId)
            .Select(r => r.EntityType)
            .Distinct()
            .OrderBy(e => e)
            .ToListAsync();

        return Ok(entityTypes);
    }

    [HttpPost("validate-expression")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Read)]
    public ActionResult<ExpressionValidationResult> ValidateExpression([FromBody] ValidateExpressionRequest request)
    {
        var isValid = _ruleInterpreter.ValidateExpression(request.RuleType, request.Expression);
        return Ok(new ExpressionValidationResult
        {
            IsValid = isValid,
            Message = isValid ? "Expression is valid" : "Expression is invalid for the specified rule type"
        });
    }

    [HttpPatch("rules/reorder")]
    [RequiresPermission(Resource = "ValidationRule", Action = PermissionAction.Update)]
    public async Task<IActionResult> ReorderRules([FromQuery] Guid tenantId, [FromBody] List<RuleOrderUpdate> updates)
    {
        var ruleIds = updates.Select(u => u.RuleId).ToList();
        var rules = await _context.ValidationRules
            .Where(r => ruleIds.Contains(r.Id) && r.TenantId == tenantId)
            .ToListAsync();

        foreach (var update in updates)
        {
            var rule = rules.FirstOrDefault(r => r.Id == update.RuleId);
            if (rule != null)
            {
                rule.ExecutionOrder = update.ExecutionOrder;
                rule.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

// DTOs
public class ValidateEntityRequest
{
    public string EntityType { get; set; } = string.Empty;
    public Dictionary<string, object?> EntityData { get; set; } = new();
}

public class ValidateFieldRequest
{
    public string EntityType { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public object? FieldValue { get; set; }
    public Dictionary<string, object?>? EntityData { get; set; }
}

public class SetActiveRequest
{
    public bool IsActive { get; set; }
}

public class ValidateExpressionRequest
{
    public ValidationRuleType RuleType { get; set; }
    public string Expression { get; set; } = string.Empty;
}

public class ExpressionValidationResult
{
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class RuleOrderUpdate
{
    public Guid RuleId { get; set; }
    public int ExecutionOrder { get; set; }
}

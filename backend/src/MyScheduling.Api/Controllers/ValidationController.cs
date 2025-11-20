using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ValidationController : ControllerBase
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

    // Helper method to get tenant ID from query parameter or claims
    // TODO: Replace with proper tenant context once authentication is fully implemented
    private Guid GetTenantId([FromQuery] Guid? tenantId = null)
    {
        if (tenantId.HasValue)
        {
            return tenantId.Value;
        }

        // TODO: Extract from User claims once authentication is implemented
        // For now, return a default tenant ID for development
        return Guid.Empty;
    }

    // ==================== VALIDATION RULES CRUD ====================

    /// <summary>
    /// Get all validation rules with optional filtering
    /// </summary>
    [HttpGet("rules")]
    public async Task<ActionResult<IEnumerable<ValidationRule>>> GetRules(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? fieldName = null,
        [FromQuery] bool? isActive = null)
    {
        var actualTenantId = GetTenantId(tenantId);
        var query = _context.ValidationRules.Where(r => r.TenantId == actualTenantId);

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(r => r.EntityType == entityType);
        }

        if (!string.IsNullOrWhiteSpace(fieldName))
        {
            query = query.Where(r => r.FieldName == fieldName);
        }

        if (isActive.HasValue)
        {
            query = query.Where(r => r.IsActive == isActive.Value);
        }

        var rules = await query
            .OrderBy(r => r.EntityType)
            .ThenBy(r => r.ExecutionOrder)
            .ThenBy(r => r.FieldName)
            .ToListAsync();

        return Ok(rules);
    }

    /// <summary>
    /// Get a specific validation rule by ID
    /// </summary>
    [HttpGet("rules/{id}")]
    public async Task<ActionResult<ValidationRule>> GetRule(Guid id, [FromQuery] Guid? tenantId = null)
    {
        var actualTenantId = GetTenantId(tenantId);
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
        {
            return NotFound();
        }

        return Ok(rule);
    }

    /// <summary>
    /// Create a new validation rule
    /// </summary>
    [HttpPost("rules")]
    public async Task<ActionResult<ValidationRule>> CreateRule([FromBody] ValidationRule rule)
    {
        var tenantId = User.GetTenantId();
        rule.TenantId = tenantId;
        rule.Id = Guid.NewGuid();
        rule.CreatedAt = DateTime.UtcNow;

        // Validate the rule expression
        if (!_ruleInterpreter.ValidateExpression(rule.RuleType, rule.RuleExpression))
        {
            return BadRequest(new { error = "Invalid rule expression for the specified rule type" });
        }

        _context.ValidationRules.Add(rule);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRule), new { id = rule.Id }, rule);
    }

    /// <summary>
    /// Update an existing validation rule
    /// </summary>
    [HttpPut("rules/{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] ValidationRule rule)
    {
        var tenantId = User.GetTenantId();
        var existingRule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (existingRule == null)
        {
            return NotFound();
        }

        // Validate the rule expression
        if (!_ruleInterpreter.ValidateExpression(rule.RuleType, rule.RuleExpression))
        {
            return BadRequest(new { error = "Invalid rule expression for the specified rule type" });
        }

        // Update properties
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

    /// <summary>
    /// Delete a validation rule
    /// </summary>
    [HttpDelete("rules/{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var tenantId = User.GetTenantId();
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
        {
            return NotFound();
        }

        _context.ValidationRules.Remove(rule);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Activate or deactivate a validation rule
    /// </summary>
    [HttpPatch("rules/{id}/active")]
    public async Task<IActionResult> SetRuleActive(Guid id, [FromBody] SetActiveRequest request)
    {
        var tenantId = User.GetTenantId();
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
        {
            return NotFound();
        }

        rule.IsActive = request.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // ==================== VALIDATION OPERATIONS ====================

    /// <summary>
    /// Validate entity data against all applicable rules
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<ValidationResult>> ValidateEntity([FromBody] ValidateEntityRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _validationEngine.ValidateAsync(
            request.EntityType,
            request.EntityData,
            tenantId);

        return Ok(result);
    }

    /// <summary>
    /// Validate a specific field value
    /// </summary>
    [HttpPost("validate-field")]
    public async Task<ActionResult<ValidationResult>> ValidateField([FromBody] ValidateFieldRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _validationEngine.ValidateFieldAsync(
            request.EntityType,
            request.FieldName,
            request.FieldValue,
            request.EntityData ?? new Dictionary<string, object?>(),
            tenantId);

        return Ok(result);
    }

    /// <summary>
    /// Test a validation rule against sample data
    /// </summary>
    [HttpPost("rules/{id}/test")]
    public async Task<ActionResult<ValidationResult>> TestRule(Guid id, [FromBody] Dictionary<string, object?> testData)
    {
        var tenantId = User.GetTenantId();
        var rule = await _context.ValidationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null)
        {
            return NotFound();
        }

        var result = await _validationEngine.TestRuleAsync(rule, testData);
        return Ok(result);
    }

    /// <summary>
    /// Get all rules for a specific entity type
    /// </summary>
    [HttpGet("rules/entity/{entityType}")]
    public async Task<ActionResult<IEnumerable<ValidationRule>>> GetRulesForEntity(string entityType)
    {
        var tenantId = User.GetTenantId();
        var rules = await _validationEngine.GetRulesForEntityAsync(entityType, tenantId);
        return Ok(rules);
    }

    /// <summary>
    /// Get available entity types that have validation rules
    /// </summary>
    [HttpGet("entity-types")]
    public async Task<ActionResult<IEnumerable<string>>> GetEntityTypes()
    {
        var tenantId = User.GetTenantId();
        var entityTypes = await _context.ValidationRules
            .Where(r => r.TenantId == tenantId)
            .Select(r => r.EntityType)
            .Distinct()
            .OrderBy(e => e)
            .ToListAsync();

        return Ok(entityTypes);
    }

    /// <summary>
    /// Validate a rule expression for correctness
    /// </summary>
    [HttpPost("validate-expression")]
    public ActionResult<ExpressionValidationResult> ValidateExpression([FromBody] ValidateExpressionRequest request)
    {
        var isValid = _ruleInterpreter.ValidateExpression(request.RuleType, request.Expression);
        return Ok(new ExpressionValidationResult
        {
            IsValid = isValid,
            Message = isValid ? "Expression is valid" : "Expression is invalid for the specified rule type"
        });
    }

    /// <summary>
    /// Bulk update rule execution orders
    /// </summary>
    [HttpPatch("rules/reorder")]
    public async Task<IActionResult> ReorderRules([FromBody] List<RuleOrderUpdate> updates)
    {
        var tenantId = User.GetTenantId();
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

// Request/Response DTOs
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

using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Infrastructure.Services;

public class ValidationEngine : IValidationEngine
{
    private readonly MySchedulingDbContext _context;
    private readonly IRuleInterpreter _ruleInterpreter;
    private readonly ILogger<ValidationEngine> _logger;

    public ValidationEngine(
        MySchedulingDbContext context,
        IRuleInterpreter ruleInterpreter,
        ILogger<ValidationEngine> logger)
    {
        _context = context;
        _ruleInterpreter = ruleInterpreter;
        _logger = logger;
    }

    public async Task<ValidationResult> ValidateAsync(
        string entityType,
        Dictionary<string, object?> entityData,
        Guid tenantId)
    {
        var result = new ValidationResult();
        var rules = await GetRulesForEntityAsync(entityType, tenantId);

        foreach (var rule in rules)
        {
            try
            {
                // Check if rule conditions are met (if any)
                if (!await EvaluateConditionsAsync(rule, entityData))
                {
                    continue;
                }

                // Get the field value to validate
                object? fieldValue = null;
                if (rule.FieldName != null && entityData.ContainsKey(rule.FieldName))
                {
                    fieldValue = entityData[rule.FieldName];
                }

                // Evaluate the rule
                bool isValid = await _ruleInterpreter.EvaluateAsync(rule, fieldValue, entityData);

                if (!isValid)
                {
                    var errorMessage = _ruleInterpreter.FormatErrorMessage(
                        rule.ErrorMessage,
                        rule,
                        fieldValue,
                        entityData);

                    // Add to appropriate collection based on severity
                    switch (rule.Severity)
                    {
                        case ValidationSeverity.Error:
                            result.AddError(rule.FieldName ?? entityType, errorMessage, rule.RuleType);
                            break;
                        case ValidationSeverity.Warning:
                            result.AddWarning(rule.FieldName ?? entityType, errorMessage, rule.RuleType);
                            break;
                        case ValidationSeverity.Information:
                            result.AddInformation(rule.FieldName ?? entityType, errorMessage, rule.RuleType);
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating validation rule {RuleId} for {EntityType}", rule.Id, entityType);
                result.AddError(
                    rule.FieldName ?? entityType,
                    $"Validation error: {ex.Message}",
                    rule.RuleType);
            }
        }

        return result;
    }

    public async Task<ValidationResult> ValidateFieldAsync(
        string entityType,
        string fieldName,
        object? fieldValue,
        Dictionary<string, object?> entityData,
        Guid tenantId)
    {
        var result = new ValidationResult();
        var rules = await GetRulesForEntityAsync(entityType, tenantId);

        // Filter to rules that apply to this specific field
        var fieldRules = rules
            .Where(r => r.FieldName == fieldName || r.RuleType == ValidationRuleType.CrossField)
            .ToList();

        foreach (var rule in fieldRules)
        {
            try
            {
                if (!await EvaluateConditionsAsync(rule, entityData))
                {
                    continue;
                }

                bool isValid = await _ruleInterpreter.EvaluateAsync(rule, fieldValue, entityData);

                if (!isValid)
                {
                    var errorMessage = _ruleInterpreter.FormatErrorMessage(
                        rule.ErrorMessage,
                        rule,
                        fieldValue,
                        entityData);

                    switch (rule.Severity)
                    {
                        case ValidationSeverity.Error:
                            result.AddError(fieldName, errorMessage, rule.RuleType);
                            break;
                        case ValidationSeverity.Warning:
                            result.AddWarning(fieldName, errorMessage, rule.RuleType);
                            break;
                        case ValidationSeverity.Information:
                            result.AddInformation(fieldName, errorMessage, rule.RuleType);
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating validation rule {RuleId} for field {FieldName}", rule.Id, fieldName);
                result.AddError(fieldName, $"Validation error: {ex.Message}", rule.RuleType);
            }
        }

        return result;
    }

    public async Task<ValidationResult> TestRuleAsync(ValidationRule rule, Dictionary<string, object?> testData)
    {
        var result = new ValidationResult();

        try
        {
            object? fieldValue = null;
            if (rule.FieldName != null && testData.ContainsKey(rule.FieldName))
            {
                fieldValue = testData[rule.FieldName];
            }

            bool isValid = await _ruleInterpreter.EvaluateAsync(rule, fieldValue, testData);

            if (!isValid)
            {
                var errorMessage = _ruleInterpreter.FormatErrorMessage(
                    rule.ErrorMessage,
                    rule,
                    fieldValue,
                    testData);

                switch (rule.Severity)
                {
                    case ValidationSeverity.Error:
                        result.AddError(rule.FieldName ?? rule.EntityType, errorMessage, rule.RuleType);
                        break;
                    case ValidationSeverity.Warning:
                        result.AddWarning(rule.FieldName ?? rule.EntityType, errorMessage, rule.RuleType);
                        break;
                    case ValidationSeverity.Information:
                        result.AddInformation(rule.FieldName ?? rule.EntityType, errorMessage, rule.RuleType);
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing validation rule {RuleId}", rule.Id);
            result.AddError(
                rule.FieldName ?? rule.EntityType,
                $"Test failed: {ex.Message}",
                rule.RuleType);
        }

        return result;
    }

    public async Task<List<ValidationRule>> GetRulesForEntityAsync(string entityType, Guid tenantId)
    {
        return await _context.ValidationRules
            .Where(r => r.EntityType == entityType && r.TenantId == tenantId && r.IsActive)
            .OrderBy(r => r.ExecutionOrder)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync();
    }

    private async Task<bool> EvaluateConditionsAsync(ValidationRule rule, Dictionary<string, object?> entityData)
    {
        if (string.IsNullOrWhiteSpace(rule.Conditions))
        {
            return true; // No conditions means rule always applies
        }

        try
        {
            var conditions = JsonSerializer.Deserialize<Dictionary<string, object>>(rule.Conditions);
            if (conditions == null)
            {
                return true;
            }

            // Simple condition evaluation: all conditions must match
            foreach (var (key, expectedValue) in conditions)
            {
                if (!entityData.ContainsKey(key))
                {
                    return false;
                }

                var actualValue = entityData[key];
                if (actualValue == null || !actualValue.Equals(expectedValue))
                {
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error evaluating conditions for rule {RuleId}", rule.Id);
            return true; // If conditions can't be evaluated, apply the rule
        }
    }
}

public class RuleInterpreter : IRuleInterpreter
{
    private readonly ILogger<RuleInterpreter> _logger;

    public RuleInterpreter(ILogger<RuleInterpreter> logger)
    {
        _logger = logger;
    }

    public async Task<bool> EvaluateAsync(
        ValidationRule rule,
        object? fieldValue,
        Dictionary<string, object?> entityData)
    {
        try
        {
            switch (rule.RuleType)
            {
                case ValidationRuleType.Required:
                    return EvaluateRequired(fieldValue, rule.RuleExpression);

                case ValidationRuleType.Range:
                    return EvaluateRange(fieldValue, rule.RuleExpression);

                case ValidationRuleType.Pattern:
                    return EvaluatePattern(fieldValue, rule.RuleExpression);

                case ValidationRuleType.Custom:
                    return EvaluateCustom(fieldValue, entityData, rule.RuleExpression);

                case ValidationRuleType.CrossField:
                    return EvaluateCrossField(entityData, rule.RuleExpression);

                case ValidationRuleType.External:
                    return await EvaluateExternalAsync(fieldValue, entityData, rule.RuleExpression);

                default:
                    _logger.LogWarning("Unknown rule type: {RuleType}", rule.RuleType);
                    return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating rule {RuleId} of type {RuleType}", rule.Id, rule.RuleType);
            throw;
        }
    }

    public bool ValidateExpression(ValidationRuleType ruleType, string expression)
    {
        try
        {
            switch (ruleType)
            {
                case ValidationRuleType.Required:
                    var reqExpr = JsonSerializer.Deserialize<Dictionary<string, bool>>(expression);
                    return reqExpr != null && reqExpr.ContainsKey("required");

                case ValidationRuleType.Range:
                    var rangeExpr = JsonSerializer.Deserialize<Dictionary<string, object>>(expression);
                    return rangeExpr != null && (rangeExpr.ContainsKey("min") || rangeExpr.ContainsKey("max"));

                case ValidationRuleType.Pattern:
                    var patternExpr = JsonSerializer.Deserialize<Dictionary<string, string>>(expression);
                    if (patternExpr != null && patternExpr.ContainsKey("regex"))
                    {
                        // Try to compile the regex to ensure it's valid
                        _ = new Regex(patternExpr["regex"]);
                        return true;
                    }
                    return false;

                case ValidationRuleType.Custom:
                case ValidationRuleType.CrossField:
                case ValidationRuleType.External:
                    // For these types, just check if it's valid JSON
                    var expr = JsonSerializer.Deserialize<Dictionary<string, object>>(expression);
                    return expr != null;

                default:
                    return false;
            }
        }
        catch
        {
            return false;
        }
    }

    public string FormatErrorMessage(
        string template,
        ValidationRule rule,
        object? fieldValue,
        Dictionary<string, object?> entityData)
    {
        var message = template;

        // Replace common placeholders
        message = message.Replace("{fieldName}", rule.FieldName ?? "field");
        message = message.Replace("{value}", fieldValue?.ToString() ?? "null");

        // Try to parse rule expression and replace specific placeholders
        try
        {
            var expression = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(rule.RuleExpression);
            if (expression != null)
            {
                foreach (var (key, value) in expression)
                {
                    var placeholder = $"{{{key}}}";
                    if (message.Contains(placeholder))
                    {
                        message = message.Replace(placeholder, value.ToString());
                    }
                }
            }
        }
        catch
        {
            // If parsing fails, just return the template
        }

        return message;
    }

    private bool EvaluateRequired(object? fieldValue, string expression)
    {
        var expr = JsonSerializer.Deserialize<Dictionary<string, bool>>(expression);
        if (expr == null || !expr.ContainsKey("required") || !expr["required"])
        {
            return true; // Rule not configured correctly or not required
        }

        if (fieldValue == null)
        {
            return false;
        }

        if (fieldValue is string strValue)
        {
            return !string.IsNullOrWhiteSpace(strValue);
        }

        return true;
    }

    private bool EvaluateRange(object? fieldValue, string expression)
    {
        var expr = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(expression);
        if (expr == null)
        {
            return true;
        }

        if (fieldValue == null)
        {
            return true; // Null values pass range validation (use Required for null checks)
        }

        // Try to convert field value to decimal for numeric comparison
        if (!TryConvertToDecimal(fieldValue, out decimal numericValue))
        {
            return true; // Can't evaluate non-numeric values
        }

        if (expr.TryGetValue("min", out var minElement))
        {
            var minValue = minElement.GetDecimal();
            if (numericValue < minValue)
            {
                return false;
            }
        }

        if (expr.TryGetValue("max", out var maxElement))
        {
            var maxValue = maxElement.GetDecimal();
            if (numericValue > maxValue)
            {
                return false;
            }
        }

        return true;
    }

    private bool EvaluatePattern(object? fieldValue, string expression)
    {
        var expr = JsonSerializer.Deserialize<Dictionary<string, string>>(expression);
        if (expr == null || !expr.ContainsKey("regex"))
        {
            return true;
        }

        if (fieldValue == null)
        {
            return true; // Null values pass pattern validation
        }

        var strValue = fieldValue.ToString();
        if (string.IsNullOrEmpty(strValue))
        {
            return true;
        }

        var regex = new Regex(expr["regex"]);
        return regex.IsMatch(strValue);
    }

    private bool EvaluateCustom(object? fieldValue, Dictionary<string, object?> entityData, string expression)
    {
        // For now, custom expressions are not fully implemented
        // This would require a more sophisticated expression evaluator
        _logger.LogWarning("Custom validation rules are not yet fully implemented");
        return true;
    }

    private bool EvaluateCrossField(Dictionary<string, object?> entityData, string expression)
    {
        var expr = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(expression);
        if (expr == null || !expr.ContainsKey("fields") || !expr.ContainsKey("condition"))
        {
            return true;
        }

        // For now, implement simple cross-field comparisons
        // Example: {"fields": ["startDate", "endDate"], "condition": "startDate < endDate"}
        var condition = expr["condition"].GetString();
        if (string.IsNullOrEmpty(condition))
        {
            return true;
        }

        // Simple implementation for date comparisons
        if (condition.Contains("<") && condition.Contains("Date"))
        {
            var parts = condition.Split('<');
            if (parts.Length == 2)
            {
                var field1 = parts[0].Trim();
                var field2 = parts[1].Trim();

                if (entityData.TryGetValue(field1, out var val1) &&
                    entityData.TryGetValue(field2, out var val2))
                {
                    if (val1 is DateTime date1 && val2 is DateTime date2)
                    {
                        return date1 < date2;
                    }
                }
            }
        }

        return true; // Default to passing if condition can't be evaluated
    }

    private async Task<bool> EvaluateExternalAsync(
        object? fieldValue,
        Dictionary<string, object?> entityData,
        string expression)
    {
        // External validation would call an API endpoint
        // For now, this is not implemented
        _logger.LogWarning("External validation rules are not yet implemented");
        await Task.CompletedTask;
        return true;
    }

    private bool TryConvertToDecimal(object? value, out decimal result)
    {
        result = 0;

        if (value == null)
        {
            return false;
        }

        if (value is decimal decValue)
        {
            result = decValue;
            return true;
        }

        if (value is int intValue)
        {
            result = intValue;
            return true;
        }

        if (value is long longValue)
        {
            result = longValue;
            return true;
        }

        if (value is double doubleValue)
        {
            result = (decimal)doubleValue;
            return true;
        }

        if (value is float floatValue)
        {
            result = (decimal)floatValue;
            return true;
        }

        return decimal.TryParse(value.ToString(), out result);
    }
}

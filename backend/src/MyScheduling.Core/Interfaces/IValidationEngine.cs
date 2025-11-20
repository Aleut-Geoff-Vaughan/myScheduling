using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

/// <summary>
/// Service responsible for validating entities against configured validation rules
/// </summary>
public interface IValidationEngine
{
    /// <summary>
    /// Validates an entity against all applicable rules for the specified entity type
    /// </summary>
    /// <param name="entityType">The type of entity being validated (e.g., "Space", "WbsElement")</param>
    /// <param name="entityData">Dictionary containing field names and values to validate</param>
    /// <param name="tenantId">The tenant ID for multi-tenant rule filtering</param>
    /// <returns>ValidationResult containing errors, warnings, and information messages</returns>
    Task<ValidationResult> ValidateAsync(string entityType, Dictionary<string, object?> entityData, Guid tenantId);

    /// <summary>
    /// Validates a specific field against its applicable rules
    /// </summary>
    /// <param name="entityType">The type of entity being validated</param>
    /// <param name="fieldName">The specific field to validate</param>
    /// <param name="fieldValue">The value to validate</param>
    /// <param name="entityData">Full entity data for cross-field validations</param>
    /// <param name="tenantId">The tenant ID for multi-tenant rule filtering</param>
    /// <returns>ValidationResult for the specific field</returns>
    Task<ValidationResult> ValidateFieldAsync(
        string entityType,
        string fieldName,
        object? fieldValue,
        Dictionary<string, object?> entityData,
        Guid tenantId);

    /// <summary>
    /// Tests a validation rule against sample data without saving
    /// </summary>
    /// <param name="rule">The validation rule to test</param>
    /// <param name="testData">Sample data to test against</param>
    /// <returns>ValidationResult showing how the rule would behave</returns>
    Task<ValidationResult> TestRuleAsync(ValidationRule rule, Dictionary<string, object?> testData);

    /// <summary>
    /// Gets all active validation rules for a specific entity type and tenant
    /// </summary>
    /// <param name="entityType">The entity type to get rules for</param>
    /// <param name="tenantId">The tenant ID</param>
    /// <returns>List of active validation rules ordered by execution order</returns>
    Task<List<ValidationRule>> GetRulesForEntityAsync(string entityType, Guid tenantId);
}

/// <summary>
/// Service responsible for interpreting and executing validation rule expressions
/// </summary>
public interface IRuleInterpreter
{
    /// <summary>
    /// Evaluates a validation rule against provided data
    /// </summary>
    /// <param name="rule">The validation rule to evaluate</param>
    /// <param name="fieldValue">The value of the field being validated</param>
    /// <param name="entityData">Full entity data for context and cross-field validations</param>
    /// <returns>True if validation passes, false if it fails</returns>
    Task<bool> EvaluateAsync(ValidationRule rule, object? fieldValue, Dictionary<string, object?> entityData);

    /// <summary>
    /// Parses and validates a rule expression to ensure it's well-formed
    /// </summary>
    /// <param name="ruleType">The type of validation rule</param>
    /// <param name="expression">The rule expression to validate</param>
    /// <returns>True if the expression is valid, false otherwise</returns>
    bool ValidateExpression(ValidationRuleType ruleType, string expression);

    /// <summary>
    /// Formats an error message by replacing placeholders with actual values
    /// </summary>
    /// <param name="template">Error message template with placeholders</param>
    /// <param name="rule">The validation rule for context</param>
    /// <param name="fieldValue">The actual field value that failed validation</param>
    /// <param name="entityData">Full entity data for additional context</param>
    /// <returns>Formatted error message with placeholders replaced</returns>
    string FormatErrorMessage(string template, ValidationRule rule, object? fieldValue, Dictionary<string, object?> entityData);
}

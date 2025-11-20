using System;
using System.Collections.Generic;

namespace MyScheduling.Core.Entities;

public enum ValidationRuleType
{
    Required = 0,
    Range = 1,
    Pattern = 2,
    Custom = 3,
    CrossField = 4,
    External = 5
}

public enum ValidationSeverity
{
    Error = 0,      // Blocks save operation
    Warning = 1,    // Allows save but shows warning
    Information = 2 // Informational only
}

/// <summary>
/// Represents a dynamic validation rule that can be applied to entities
/// </summary>
public class ValidationRule : TenantEntity
{
    /// <summary>
    /// The entity type this rule applies to (e.g., "Space", "User", "Project")
    /// </summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>
    /// The specific field this rule validates (null for entity-level rules)
    /// </summary>
    public string? FieldName { get; set; }

    /// <summary>
    /// Type of validation to perform
    /// </summary>
    public ValidationRuleType RuleType { get; set; }

    /// <summary>
    /// Severity level of the validation
    /// </summary>
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;

    /// <summary>
    /// JSON or pseudo-code expression defining the validation logic
    /// Examples:
    /// - Required: {"required": true}
    /// - Range: {"min": 0, "max": 100}
    /// - Pattern: {"regex": "^[A-Z]{3}-\\d{4}$"}
    /// - Custom: {"expression": "field1 + field2 > 100"}
    /// - CrossField: {"fields": ["startDate", "endDate"], "condition": "startDate < endDate"}
    /// - External: {"apiEndpoint": "/api/validate/wbs", "method": "POST"}
    /// </summary>
    public string RuleExpression { get; set; } = string.Empty;

    /// <summary>
    /// Error message to display when validation fails
    /// Can include placeholders like {fieldName}, {minValue}, {maxValue}, etc.
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// Whether this rule is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Display name for administrative purposes
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description explaining the purpose of this rule
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Execution order for rules on the same field (lower numbers execute first)
    /// </summary>
    public int ExecutionOrder { get; set; } = 0;

    /// <summary>
    /// Optional conditions that must be met for this rule to apply
    /// Example: {"role": "Manager", "officeType": "Executive"}
    /// </summary>
    public string? Conditions { get; set; }

    /// <summary>
    /// Custom metadata for extensibility
    /// </summary>
    public string? Metadata { get; set; }
}

/// <summary>
/// Result of a validation operation
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
    public List<ValidationError> Warnings { get; set; } = new();
    public List<ValidationError> Information { get; set; } = new();

    public ValidationResult()
    {
        IsValid = true;
    }

    public void AddError(string fieldName, string message, ValidationRuleType ruleType)
    {
        IsValid = false;
        Errors.Add(new ValidationError
        {
            FieldName = fieldName,
            Message = message,
            RuleType = ruleType,
            Severity = ValidationSeverity.Error
        });
    }

    public void AddWarning(string fieldName, string message, ValidationRuleType ruleType)
    {
        Warnings.Add(new ValidationError
        {
            FieldName = fieldName,
            Message = message,
            RuleType = ruleType,
            Severity = ValidationSeverity.Warning
        });
    }

    public void AddInformation(string fieldName, string message, ValidationRuleType ruleType)
    {
        Information.Add(new ValidationError
        {
            FieldName = fieldName,
            Message = message,
            RuleType = ruleType,
            Severity = ValidationSeverity.Information
        });
    }
}

/// <summary>
/// Represents a single validation error, warning, or information message
/// </summary>
public class ValidationError
{
    public string FieldName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public ValidationRuleType RuleType { get; set; }
    public ValidationSeverity Severity { get; set; }
    public Dictionary<string, object>? Context { get; set; }
}

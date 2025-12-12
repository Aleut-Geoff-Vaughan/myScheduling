import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import type {
  ValidationRule,
  ValidationResult,
  ValidateEntityRequest,
  ValidateFieldRequest,
  ValidateExpressionRequest,
  ExpressionValidationResult,
  RuleOrderUpdate,
  SetActiveRequest,
} from '../types/api';

const http = axios.create({
  baseURL: API_BASE_URL,
});

export const validationService = {
  // ==================== VALIDATION RULES CRUD ====================

  /**
   * Get all validation rules with optional filtering
   */
  async getRules(params: {
    tenantId: string;
    entityType?: string;
    fieldName?: string;
    isActive?: boolean;
  }): Promise<ValidationRule[]> {
    const response = await http.get('/validation/rules', { params });
    return response.data;
  },

  /**
   * Get a specific validation rule by ID
   */
  async getRuleById(id: string, tenantId: string): Promise<ValidationRule> {
    const response = await http.get(`/validation/rules/${id}`, {
      params: { tenantId },
    });
    return response.data;
  },

  /**
   * Create a new validation rule
   */
  async createRule(
    tenantId: string,
    rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ValidationRule> {
    const response = await http.post('/validation/rules', rule, { params: { tenantId } });
    return response.data;
  },

  /**
   * Update an existing validation rule
   */
  async updateRule(id: string, tenantId: string, rule: ValidationRule): Promise<void> {
    await http.put(`/validation/rules/${id}`, rule, { params: { tenantId } });
  },

  /**
   * Delete a validation rule
   */
  async deleteRule(id: string, tenantId: string): Promise<void> {
    await http.delete(`/validation/rules/${id}`, {
      params: { tenantId },
    });
  },

  /**
   * Activate or deactivate a validation rule
   */
  async setRuleActive(id: string, tenantId: string, isActive: boolean): Promise<void> {
    await http.patch(`/validation/rules/${id}/active`, { isActive } as SetActiveRequest, {
      params: { tenantId },
    });
  },

  // ==================== VALIDATION OPERATIONS ====================

  /**
   * Validate entity data against all applicable rules
   */
  async validateEntity(tenantId: string, request: ValidateEntityRequest): Promise<ValidationResult> {
    const response = await http.post('/validation/validate', request, { params: { tenantId } });
    return response.data;
  },

  /**
   * Validate a specific field value
   */
  async validateField(tenantId: string, request: ValidateFieldRequest): Promise<ValidationResult> {
    const response = await http.post('/validation/validate-field', request, {
      params: { tenantId },
    });
    return response.data;
  },

  /**
   * Test a validation rule against sample data
   */
  async testRule(id: string, tenantId: string, testData: Record<string, unknown>): Promise<ValidationResult> {
    const response = await http.post(`/validation/rules/${id}/test`, testData, {
      params: { tenantId },
    });
    return response.data;
  },

  /**
   * Get all rules for a specific entity type
   */
  async getRulesForEntity(entityType: string, tenantId: string): Promise<ValidationRule[]> {
    const response = await http.get(`/validation/rules/entity/${entityType}`, {
      params: { tenantId },
    });
    return response.data;
  },

  /**
   * Get available entity types that have validation rules
   */
  async getEntityTypes(tenantId: string): Promise<string[]> {
    const response = await http.get('/validation/entity-types', {
      params: { tenantId },
    });
    return response.data;
  },

  /**
   * Validate a rule expression for correctness
   */
  async validateExpression(request: ValidateExpressionRequest): Promise<ExpressionValidationResult> {
    const response = await http.post('/validation/validate-expression', request);
    return response.data;
  },

  /**
   * Bulk update rule execution orders
   */
  async reorderRules(tenantId: string, updates: RuleOrderUpdate[]): Promise<void> {
    await http.patch('/validation/rules/reorder', updates, { params: { tenantId } });
  },
};

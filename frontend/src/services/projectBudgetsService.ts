import { api } from '../lib/api-client';
import type {
  ProjectBudget,
  CreateProjectBudgetRequest,
  UpdateProjectBudgetRequest,
  FiscalYearInfo,
  GetProjectBudgetsParams,
} from '../types/budget';

export const projectBudgetsService = {
  async getAll(params?: GetProjectBudgetsParams): Promise<ProjectBudget[]> {
    const searchParams = new URLSearchParams();

    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.fiscalYear !== undefined) searchParams.append('fiscalYear', params.fiscalYear.toString());
    if (params?.budgetType !== undefined) searchParams.append('budgetType', params.budgetType.toString());
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.includeSuperseded !== undefined) searchParams.append('includeSuperseded', params.includeSuperseded.toString());

    const query = searchParams.toString();
    return api.get<ProjectBudget[]>(`/projectbudgets${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<ProjectBudget> {
    return api.get<ProjectBudget>(`/projectbudgets/${id}`);
  },

  async getActiveByProjectId(projectId: string): Promise<ProjectBudget | null> {
    return api.get<ProjectBudget | null>(`/projectbudgets/project/${projectId}/active`);
  },

  async create(request: CreateProjectBudgetRequest): Promise<ProjectBudget> {
    return api.post<ProjectBudget>('/projectbudgets', request);
  },

  async update(id: string, request: UpdateProjectBudgetRequest): Promise<void> {
    return api.put<void>(`/projectbudgets/${id}`, request);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/projectbudgets/${id}`);
  },

  async activate(id: string): Promise<void> {
    return api.post<void>(`/projectbudgets/${id}/activate`, {});
  },

  async submit(id: string): Promise<void> {
    return api.post<void>(`/projectbudgets/${id}/submit`, {});
  },

  async approve(id: string, comments?: string): Promise<void> {
    return api.post<void>(`/projectbudgets/${id}/approve`, { comments });
  },

  async reject(id: string, reason: string): Promise<void> {
    return api.post<void>(`/projectbudgets/${id}/reject`, { reason });
  },

  async reforecast(id: string, name?: string, description?: string): Promise<ProjectBudget> {
    return api.post<ProjectBudget>(`/projectbudgets/${id}/reforecast`, { name, description });
  },

  async getCurrentFiscalYear(): Promise<FiscalYearInfo> {
    return api.get<FiscalYearInfo>('/projectbudgets/fiscalyear/current');
  },
};

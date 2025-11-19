import { api } from '../lib/api-client';
import { Project, ProjectStatus } from '../types/api';

export interface GetProjectsParams {
  tenantId?: string;
  status?: ProjectStatus;
  search?: string;
}

export const projectsService = {
  async getAll(params?: GetProjectsParams): Promise<Project[]> {
    const searchParams = new URLSearchParams();

    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return api.get<Project[]>(`/projects${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Project> {
    return api.get<Project>(`/projects/${id}`);
  },

  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return api.post<Project>('/projects', project);
  },

  async update(id: string, project: Project): Promise<void> {
    return api.put<void>(`/projects/${id}`, project);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/projects/${id}`);
  },
};

import { api } from '../lib/api-client';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';

export interface GetAssignmentsParams {
  tenantId?: string;
  personId?: string;
  projectId?: string;
  status?: AssignmentStatus;
}

export const assignmentsService = {
  async getAll(params?: GetAssignmentsParams): Promise<Assignment[]> {
    const searchParams = new URLSearchParams();

    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.personId) searchParams.append('personId', params.personId);
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());

    const query = searchParams.toString();
    return api.get<Assignment[]>(`/assignments${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Assignment> {
    return api.get<Assignment>(`/assignments/${id}`);
  },

  async create(assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assignment> {
    return api.post<Assignment>('/assignments', assignment);
  },

  async update(id: string, assignment: Assignment): Promise<void> {
    return api.put<void>(`/assignments/${id}`, assignment);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/assignments/${id}`);
  },

  async approve(id: string, approvedByUserId: string): Promise<void> {
    return api.post<void>(`/assignments/${id}/approve`, approvedByUserId);
  },
};

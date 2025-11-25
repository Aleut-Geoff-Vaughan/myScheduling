import { api } from '../lib/api-client';
import { AssignmentRequestStatus } from '../types/api';

export interface AssignmentRequest {
  id: string;
  tenantId: string;
  requestedByUserId: string;
  requestedForUserId: string;
  projectId: string;
  wbsElementId?: string;
  projectRoleId?: string;
  startDate?: string;
  endDate?: string;
  allocationPct: number;
  status: AssignmentRequestStatus;
  notes?: string;
  approvedByUserId?: string;
  resolvedAt?: string;
  assignmentId?: string;
  approverGroupId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAssignmentRequest {
  projectId: string;
  wbsElementId?: string;
  projectRoleId?: string;
  tenantId?: string;
  requestedForUserId?: string;
  startDate?: string;
  endDate?: string;
  allocationPct: number;
  notes?: string;
  approverGroupId?: string;
}

export interface AssignmentRequestQuery {
  tenantId?: string;
  status?: AssignmentRequestStatus;
  forUserId?: string;
  approverGroupId?: string;
}

export const assignmentRequestService = {
  async list(params?: AssignmentRequestQuery): Promise<AssignmentRequest[]> {
    const searchParams = new URLSearchParams();
    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.forUserId) searchParams.append('forUserId', params.forUserId);
    if (params?.approverGroupId) searchParams.append('approverGroupId', params.approverGroupId);

    const query = searchParams.toString();
    return api.get<AssignmentRequest[]>(`/assignmentrequests${query ? `?${query}` : ''}`);
  },

  async create(payload: CreateAssignmentRequest): Promise<AssignmentRequest> {
    return api.post<AssignmentRequest>('/assignmentrequests', payload);
  },

  async approve(id: string, allocationPct?: number): Promise<AssignmentRequest> {
    return api.post<AssignmentRequest>(`/assignmentrequests/${id}/approve`, {
      createAssignment: true,
      allocationPct,
    });
  },

  async reject(id: string, reason?: string): Promise<AssignmentRequest> {
    return api.post<AssignmentRequest>(`/assignmentrequests/${id}/reject`, { reason });
  },
};

import { api } from '../lib/api-client';
import type {
  WbsElement,
  WbsType,
  WbsApprovalStatus,
  WorkflowRequest,
  WbsChangeHistory,
} from '../types/wbs';

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface WbsFilters {
  projectId?: string;
  ownerId?: string;
  approverGroupId?: string;
  type?: WbsType;
  approvalStatus?: WbsApprovalStatus;
  includeHistory?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateWbsRequest {
  projectId: string;
  code: string;
  description: string;
  validFrom: string;
  validTo?: string;
  type: WbsType;
  ownerUserId?: string;
  approverUserId?: string;
}

export interface UpdateWbsRequest {
  description?: string;
  validFrom?: string;
  validTo?: string;
  type?: WbsType;
  ownerUserId?: string;
  approverUserId?: string;
}

const wbsService = {
  // List WBS elements with optional filters and pagination
  async getWbsElements(filters?: WbsFilters): Promise<PaginatedResponse<WbsElement>> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.ownerId) params.append('ownerId', filters.ownerId);
    if (filters?.approverGroupId) params.append('approverGroupId', filters.approverGroupId);
    if (filters?.type !== undefined) params.append('type', filters.type.toString());
    if (filters?.approvalStatus !== undefined)
      params.append('approvalStatus', filters.approvalStatus.toString());
    if (filters?.includeHistory) params.append('includeHistory', 'true');
    if (filters?.pageNumber) params.append('pageNumber', filters.pageNumber.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const queryString = params.toString();
    const url = `/wbs${queryString ? `?${queryString}` : ''}`;
    return api.get<PaginatedResponse<WbsElement>>(url);
  },

  // Get single WBS element by ID
  async getWbsElement(id: string): Promise<WbsElement> {
    return api.get<WbsElement>(`/wbs/${id}`);
  },

  // Get WBS elements pending approval
  async getPendingApprovals(): Promise<WbsElement[]> {
    return api.get<WbsElement[]>('/wbs/pending-approval');
  },

  // Get WBS change history
  async getWbsHistory(id: string): Promise<WbsChangeHistory[]> {
    return api.get<WbsChangeHistory[]>(`/wbs/${id}/history`);
  },

  // Create new WBS element
  async createWbs(data: CreateWbsRequest): Promise<WbsElement> {
    return api.post<WbsElement>('/wbs', data);
  },

  // Update WBS element
  async updateWbs(id: string, data: UpdateWbsRequest): Promise<WbsElement> {
    return api.put<WbsElement>(`/wbs/${id}`, data);
  },

  // Submit WBS for approval
  async submitForApproval(id: string, request?: WorkflowRequest): Promise<void> {
    await api.post(`/wbs/${id}/submit`, request || {});
  },

  // Approve WBS
  async approveWbs(id: string, request?: WorkflowRequest): Promise<void> {
    await api.post(`/wbs/${id}/approve`, request || {});
  },

  // Reject WBS
  async rejectWbs(id: string, request: WorkflowRequest): Promise<void> {
    await api.post(`/wbs/${id}/reject`, request);
  },

  // Suspend WBS
  async suspendWbs(id: string, request?: WorkflowRequest): Promise<void> {
    await api.post(`/wbs/${id}/suspend`, request || {});
  },

  // Close WBS
  async closeWbs(id: string, request?: WorkflowRequest): Promise<void> {
    await api.post(`/wbs/${id}/close`, request || {});
  },
};

export default wbsService;

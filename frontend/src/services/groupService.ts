import { api } from '../lib/api-client';
import type { Group, GroupMember } from '../types/api';
import { GroupMemberRole } from '../types/api';

interface ListParams {
  tenantId?: string;
  isActive?: boolean;
  search?: string;
  includeMembers?: boolean;
}

export interface CreateGroupPayload {
  tenantId: string;
  name: string;
  description?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface AddMemberPayload {
  userId: string;
  role?: GroupMemberRole;
}

export const groupService = {
  async list(params?: ListParams): Promise<Group[]> {
    const searchParams = new URLSearchParams();
    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.includeMembers) searchParams.append('includeMembers', 'true');

    const query = searchParams.toString();
    return api.get<Group[]>(`/groups${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<Group> {
    return api.get<Group>(`/groups/${id}`);
  },

  async create(payload: CreateGroupPayload): Promise<Group> {
    return api.post<Group>('/groups', payload);
  },

  async update(id: string, payload: UpdateGroupPayload): Promise<Group> {
    return api.put<Group>(`/groups/${id}`, payload);
  },

  async addMember(id: string, payload: AddMemberPayload): Promise<GroupMember> {
    return api.post<GroupMember>(`/groups/${id}/members`, payload);
  },

  async removeMember(id: string, userId: string): Promise<void> {
    return api.delete<void>(`/groups/${id}/members/${userId}`);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/groups/${id}`);
  },
};

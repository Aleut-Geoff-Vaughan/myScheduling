import { api } from '../lib/api-client';
import type {
  Space,
  FacilityPermission,
  SpaceMaintenanceLog,
} from '../types/api';
import {
  SpaceType,
  FacilityAccessLevel,
  MaintenanceStatus,
  MaintenanceType,
  AppRole,
} from '../types/api';

// Spaces

export interface GetSpacesParams {
  officeId?: string;
  type?: SpaceType;
  isActive?: boolean;
  managerId?: string;
  requiresApproval?: boolean;
}

export const facilitiesService = {
  // ==================== SPACES ====================

  async getSpaces(params?: GetSpacesParams): Promise<Space[]> {
    const searchParams = new URLSearchParams();

    if (params?.officeId) searchParams.append('officeId', params.officeId);
    if (params?.type !== undefined) searchParams.append('type', params.type.toString());
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.managerId) searchParams.append('managerId', params.managerId);
    if (params?.requiresApproval !== undefined) searchParams.append('requiresApproval', params.requiresApproval.toString());

    const query = searchParams.toString();
    return api.get<Space[]>(`/facilities/spaces${query ? `?${query}` : ''}`);
  },

  async getSpaceById(id: string): Promise<Space> {
    return api.get<Space>(`/facilities/spaces/${id}`);
  },

  async createSpace(space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>): Promise<Space> {
    return api.post<Space>('/facilities/spaces', space);
  },

  async updateSpace(id: string, space: Space): Promise<void> {
    return api.put<void>(`/facilities/spaces/${id}`, space);
  },

  async deleteSpace(id: string): Promise<void> {
    return api.delete<void>(`/facilities/spaces/${id}`);
  },

  // ==================== PERMISSIONS ====================

  async getPermissions(params?: {
    officeId?: string;
    spaceId?: string;
    userId?: string;
    role?: AppRole;
  }): Promise<FacilityPermission[]> {
    const searchParams = new URLSearchParams();

    if (params?.officeId) searchParams.append('officeId', params.officeId);
    if (params?.spaceId) searchParams.append('spaceId', params.spaceId);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.role !== undefined) searchParams.append('role', params.role.toString());

    const query = searchParams.toString();
    return api.get<FacilityPermission[]>(`/facilities/permissions${query ? `?${query}` : ''}`);
  },

  async getUserPermissions(userId: string): Promise<{
    userPermissions: FacilityPermission[];
    rolePermissions: FacilityPermission[];
    effectiveAccessLevel: FacilityAccessLevel;
  }> {
    return api.get<{
      userPermissions: FacilityPermission[];
      rolePermissions: FacilityPermission[];
      effectiveAccessLevel: FacilityAccessLevel;
    }>(`/facilities/permissions/user/${userId}`);
  },

  async grantPermission(
    permission: Omit<FacilityPermission, 'id' | 'createdAt' | 'updatedAt' | 'office' | 'space' | 'user'>
  ): Promise<FacilityPermission> {
    return api.post<FacilityPermission>('/facilities/permissions', permission);
  },

  async revokePermission(id: string): Promise<void> {
    return api.delete<void>(`/facilities/permissions/${id}`);
  },

  // ==================== MAINTENANCE ====================

  async getMaintenanceLogs(params?: {
    spaceId?: string;
    status?: MaintenanceStatus;
    type?: MaintenanceType;
    scheduledAfter?: string;
    scheduledBefore?: string;
  }): Promise<SpaceMaintenanceLog[]> {
    const searchParams = new URLSearchParams();

    if (params?.spaceId) searchParams.append('spaceId', params.spaceId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.type !== undefined) searchParams.append('type', params.type.toString());
    if (params?.scheduledAfter) searchParams.append('scheduledAfter', params.scheduledAfter);
    if (params?.scheduledBefore) searchParams.append('scheduledBefore', params.scheduledBefore);

    const query = searchParams.toString();
    return api.get<SpaceMaintenanceLog[]>(`/facilities/maintenance${query ? `?${query}` : ''}`);
  },

  async getSpaceMaintenanceLogs(spaceId: string): Promise<SpaceMaintenanceLog[]> {
    return api.get<SpaceMaintenanceLog[]>(`/facilities/spaces/${spaceId}/maintenance`);
  },

  async reportMaintenance(
    spaceId: string,
    log: Omit<SpaceMaintenanceLog, 'id' | 'spaceId' | 'createdAt' | 'updatedAt' | 'space' | 'reportedBy' | 'assignedTo'>
  ): Promise<SpaceMaintenanceLog> {
    return api.post<SpaceMaintenanceLog>(`/facilities/spaces/${spaceId}/maintenance`, log);
  },

  async updateMaintenance(id: string, log: SpaceMaintenanceLog): Promise<void> {
    return api.put<void>(`/facilities/maintenance/${id}`, log);
  },
};

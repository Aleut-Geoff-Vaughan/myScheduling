import { api } from '../lib/api-client';
import type { Tenant, User } from '../types/api';

export const tenantsService = {
  async getAll(): Promise<Tenant[]> {
    return api.get<Tenant[]>('/tenants');
  },

  async getById(id: string): Promise<Tenant> {
    return api.get<Tenant>(`/tenants/${id}`);
  },

  async create(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    return api.post<Tenant>('/tenants', tenant);
  },

  async update(id: string, tenant: Tenant): Promise<void> {
    return api.put<void>(`/tenants/${id}`, tenant);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/tenants/${id}`);
  },
};

// Response when user deletion is blocked by dependencies
export interface UserDeleteConflictResponse {
  message: string;
  dependencies: string[];
  suggestion: string;
  forceDeleteAvailable: boolean;
  forceDeleteUrl: string;
  reassignUrl: string;
}

// Options for deleting a user
export interface DeleteUserOptions {
  force?: boolean;
  reassignTo?: string;
}

export const usersService = {
  async getAll(tenantId?: string): Promise<User[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return api.get<User[]>(`/users${query}`);
  },

  async getById(id: string): Promise<User> {
    return api.get<User>(`/users/${id}`);
  },

  async create(user: Partial<User>): Promise<User> {
    return api.post<User>('/users', user);
  },

  async updateProfile(id: string, user: Partial<User>): Promise<User> {
    return api.patch<User>(`/users/${id}/profile`, user);
  },

  async delete(id: string, options?: DeleteUserOptions): Promise<void> {
    const params = new URLSearchParams();
    if (options?.force) params.append('force', 'true');
    if (options?.reassignTo) params.append('reassignTo', options.reassignTo);
    const query = params.toString();
    return api.delete<void>(`/users/${id}${query ? `?${query}` : ''}`);
  },

  async deactivate(id: string, deactivatedByUserId?: string): Promise<void> {
    return api.post<void>(`/users/${id}/deactivate`, { deactivatedByUserId });
  },

  async reactivate(id: string): Promise<void> {
    return api.post<void>(`/users/${id}/reactivate`);
  },

  async getLoginHistory(userId: string, take: number = 10): Promise<{
    totalLogins: number;
    lastSuccessfulAt?: string;
    lastFailedAt?: string;
    logins: {
      id: string;
      email?: string;
      isSuccess: boolean;
      ipAddress?: string;
      userAgent?: string;
      createdAt: string;
    }[];
  }> {
    const query = take ? `?take=${take}` : '';
    return api.get(`/users/${userId}/logins${query}`);
  },
};

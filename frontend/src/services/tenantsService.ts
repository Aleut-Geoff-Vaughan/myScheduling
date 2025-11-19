import { api } from '../lib/api-client';
import { Tenant, User } from '../types/api';

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

export const usersService = {
  async getAll(tenantId?: string): Promise<User[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return api.get<User[]>(`/users${query}`);
  },

  async getById(id: string): Promise<User> {
    return api.get<User>(`/users/${id}`);
  },

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return api.post<User>('/users', user);
  },

  async update(id: string, user: User): Promise<void> {
    return api.put<void>(`/users/${id}`, user);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/users/${id}`);
  },
};

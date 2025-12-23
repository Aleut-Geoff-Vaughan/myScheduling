import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tenantsService, usersService } from './tenantsService';
import { api, ApiError } from '../lib/api-client';
import type { Tenant, User } from '../types/api';
import { TenantStatus } from '../types/api';

// Mock the api-client
vi.mock('../lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public data?: unknown
    ) {
      super(`API Error: ${status} ${statusText}`);
      this.name = 'ApiError';
    }
  },
}));

describe('tenantsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockTenant: Tenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    status: TenantStatus.Active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('getAll', () => {
    it('should call GET /tenants', async () => {
      vi.mocked(api.get).mockResolvedValue([mockTenant]);

      await tenantsService.getAll();

      expect(api.get).toHaveBeenCalledWith('/tenants');
    });

    it('should return list of tenants', async () => {
      const tenants = [mockTenant, { ...mockTenant, id: 'tenant-456', name: 'Another Tenant' }];
      vi.mocked(api.get).mockResolvedValue(tenants);

      const result = await tenantsService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Tenant');
      expect(result[1].name).toBe('Another Tenant');
    });

    it('should return empty array when no tenants', async () => {
      vi.mocked(api.get).mockResolvedValue([]);

      const result = await tenantsService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should call GET /tenants/{id}', async () => {
      vi.mocked(api.get).mockResolvedValue(mockTenant);

      await tenantsService.getById('tenant-123');

      expect(api.get).toHaveBeenCalledWith('/tenants/tenant-123');
    });

    it('should return tenant by id', async () => {
      vi.mocked(api.get).mockResolvedValue(mockTenant);

      const result = await tenantsService.getById('tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.name).toBe('Test Tenant');
    });

    it('should throw ApiError when tenant not found', async () => {
      const mockError = new ApiError(404, 'Not Found', { message: 'Tenant not found' });
      vi.mocked(api.get).mockRejectedValue(mockError);

      await expect(tenantsService.getById('nonexistent')).rejects.toThrow(ApiError);
      await expect(tenantsService.getById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('create', () => {
    it('should call POST /tenants with tenant data', async () => {
      const newTenant = { name: 'New Tenant', status: TenantStatus.Active };
      vi.mocked(api.post).mockResolvedValue({ ...mockTenant, ...newTenant });

      await tenantsService.create(newTenant);

      expect(api.post).toHaveBeenCalledWith('/tenants', newTenant);
    });

    it('should return created tenant', async () => {
      const newTenant = { name: 'New Tenant', status: TenantStatus.Active };
      const createdTenant = { ...mockTenant, ...newTenant, id: 'new-tenant-id' };
      vi.mocked(api.post).mockResolvedValue(createdTenant);

      const result = await tenantsService.create(newTenant);

      expect(result.id).toBe('new-tenant-id');
      expect(result.name).toBe('New Tenant');
    });

    it('should throw ApiError on duplicate name', async () => {
      const mockError = new ApiError(409, 'Conflict', {
        message: "A tenant with name 'Test Tenant' already exists",
      });
      vi.mocked(api.post).mockRejectedValue(mockError);

      await expect(tenantsService.create({ name: 'Test Tenant', status: TenantStatus.Active })).rejects.toThrow(ApiError);
      await expect(tenantsService.create({ name: 'Test Tenant', status: TenantStatus.Active })).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('update', () => {
    it('should call PUT /tenants/{id} with tenant data', async () => {
      vi.mocked(api.put).mockResolvedValue(undefined);

      await tenantsService.update('tenant-123', mockTenant);

      expect(api.put).toHaveBeenCalledWith('/tenants/tenant-123', mockTenant);
    });

    it('should throw ApiError when tenant not found', async () => {
      const mockError = new ApiError(404, 'Not Found', { message: 'Tenant not found' });
      vi.mocked(api.put).mockRejectedValue(mockError);

      await expect(tenantsService.update('nonexistent', mockTenant)).rejects.toThrow(ApiError);
    });
  });

  describe('delete', () => {
    it('should call DELETE /tenants/{id}', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await tenantsService.delete('tenant-123');

      expect(api.delete).toHaveBeenCalledWith('/tenants/tenant-123');
    });

    it('should throw ApiError when tenant not found', async () => {
      const mockError = new ApiError(404, 'Not Found', { message: 'Tenant not found' });
      vi.mocked(api.delete).mockRejectedValue(mockError);

      await expect(tenantsService.delete('nonexistent')).rejects.toThrow(ApiError);
    });
  });
});

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    name: 'Test User',
    entraObjectId: '',
    isActive: true,
    isSystemAdmin: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantMemberships: [],
  };

  describe('getAll', () => {
    it('should call GET /users without tenant filter', async () => {
      vi.mocked(api.get).mockResolvedValue([mockUser]);

      await usersService.getAll();

      expect(api.get).toHaveBeenCalledWith('/users');
    });

    it('should call GET /users with tenantId query param', async () => {
      vi.mocked(api.get).mockResolvedValue([mockUser]);

      await usersService.getAll('tenant-123');

      expect(api.get).toHaveBeenCalledWith('/users?tenantId=tenant-123');
    });

    it('should return list of users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456', email: 'other@example.com' }];
      vi.mocked(api.get).mockResolvedValue(users);

      const result = await usersService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test@example.com');
    });
  });

  describe('getById', () => {
    it('should call GET /users/{id}', async () => {
      vi.mocked(api.get).mockResolvedValue(mockUser);

      await usersService.getById('user-123');

      expect(api.get).toHaveBeenCalledWith('/users/user-123');
    });

    it('should return user by id', async () => {
      vi.mocked(api.get).mockResolvedValue(mockUser);

      const result = await usersService.getById('user-123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ApiError when user not found', async () => {
      const mockError = new ApiError(404, 'Not Found', { message: 'User not found' });
      vi.mocked(api.get).mockRejectedValue(mockError);

      await expect(usersService.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should call POST /users with user data', async () => {
      const newUser = { email: 'new@example.com', displayName: 'New User' };
      vi.mocked(api.post).mockResolvedValue({ ...mockUser, ...newUser });

      await usersService.create(newUser);

      expect(api.post).toHaveBeenCalledWith('/users', newUser);
    });

    it('should return created user', async () => {
      const newUser = { email: 'new@example.com', displayName: 'New User' };
      vi.mocked(api.post).mockResolvedValue({ ...mockUser, ...newUser, id: 'new-user-id' });

      const result = await usersService.create(newUser);

      expect(result.id).toBe('new-user-id');
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('updateProfile', () => {
    it('should call PATCH /users/{id}/profile with partial user data', async () => {
      const updates = { displayName: 'Updated Name' };
      vi.mocked(api.patch).mockResolvedValue({ ...mockUser, ...updates });

      await usersService.updateProfile('user-123', updates);

      expect(api.patch).toHaveBeenCalledWith('/users/user-123/profile', updates);
    });

    it('should return updated user', async () => {
      const updates = { displayName: 'Updated Name' };
      vi.mocked(api.patch).mockResolvedValue({ ...mockUser, ...updates });

      const result = await usersService.updateProfile('user-123', updates);

      expect(result.displayName).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should call DELETE /users/{id} without options', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await usersService.delete('user-123');

      expect(api.delete).toHaveBeenCalledWith('/users/user-123');
    });

    it('should call DELETE /users/{id} with force=true', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await usersService.delete('user-123', { force: true });

      expect(api.delete).toHaveBeenCalledWith('/users/user-123?force=true');
    });

    it('should call DELETE /users/{id} with reassignTo param', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await usersService.delete('user-123', { reassignTo: 'other-user-456' });

      expect(api.delete).toHaveBeenCalledWith('/users/user-123?reassignTo=other-user-456');
    });

    it('should call DELETE /users/{id} with both force and reassignTo', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await usersService.delete('user-123', { force: true, reassignTo: 'other-user-456' });

      expect(api.delete).toHaveBeenCalledWith('/users/user-123?force=true&reassignTo=other-user-456');
    });

    it('should throw ApiError on conflict (has dependencies)', async () => {
      const mockError = new ApiError(409, 'Conflict', {
        message: 'User has active assignments',
        dependencies: ['StaffingAssignment', 'Project'],
        forceDeleteAvailable: true,
      });
      vi.mocked(api.delete).mockRejectedValue(mockError);

      await expect(usersService.delete('user-123')).rejects.toThrow(ApiError);
      await expect(usersService.delete('user-123')).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('deactivate', () => {
    it('should call POST /users/{id}/deactivate', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await usersService.deactivate('user-123');

      expect(api.post).toHaveBeenCalledWith('/users/user-123/deactivate', { deactivatedByUserId: undefined });
    });

    it('should call POST /users/{id}/deactivate with deactivatedByUserId', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await usersService.deactivate('user-123', 'admin-456');

      expect(api.post).toHaveBeenCalledWith('/users/user-123/deactivate', { deactivatedByUserId: 'admin-456' });
    });
  });

  describe('reactivate', () => {
    it('should call POST /users/{id}/reactivate', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await usersService.reactivate('user-123');

      expect(api.post).toHaveBeenCalledWith('/users/user-123/reactivate');
    });
  });

  describe('getLoginHistory', () => {
    const mockLoginHistory = {
      totalLogins: 10,
      lastSuccessfulAt: new Date().toISOString(),
      lastFailedAt: undefined,
      logins: [
        {
          id: 'login-1',
          email: 'test@example.com',
          isSuccess: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    it('should call GET /users/{userId}/logins with default take', async () => {
      vi.mocked(api.get).mockResolvedValue(mockLoginHistory);

      await usersService.getLoginHistory('user-123');

      expect(api.get).toHaveBeenCalledWith('/users/user-123/logins?take=10');
    });

    it('should call GET /users/{userId}/logins with custom take', async () => {
      vi.mocked(api.get).mockResolvedValue(mockLoginHistory);

      await usersService.getLoginHistory('user-123', 25);

      expect(api.get).toHaveBeenCalledWith('/users/user-123/logins?take=25');
    });

    it('should return login history', async () => {
      vi.mocked(api.get).mockResolvedValue(mockLoginHistory);

      const result = await usersService.getLoginHistory('user-123');

      expect(result.totalLogins).toBe(10);
      expect(result.logins).toHaveLength(1);
      expect(result.logins[0].isSuccess).toBe(true);
    });
  });
});

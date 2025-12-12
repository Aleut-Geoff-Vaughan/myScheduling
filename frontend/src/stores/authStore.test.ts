import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, AppRole } from './authStore';
import type { LoginResponse } from '../services/authService';

// Mock the services
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyMagicLink: vi.fn(),
    startImpersonation: vi.fn(),
    endImpersonation: vi.fn(),
  },
}));

vi.mock('../services/ssoService', () => ({
  ssoLoginPopup: vi.fn(),
  ssoLogout: vi.fn(),
  isSsoEnabled: vi.fn(),
}));

// Reset store state before each test
beforeEach(() => {
  // Reset store to initial state
  useAuthStore.setState({
    user: null,
    token: null,
    tokenExpiresAt: null,
    availableTenants: [],
    currentWorkspace: null,
    isAuthenticated: false,
    impersonation: null,
  });
});

describe('authStore', () => {
  describe('initial state', () => {
    it('should have null user when not logged in', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should have null token initially', () => {
      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });
  });

  describe('loginFromResponse', () => {
    it('should set user and token from login response', () => {
      const mockResponse: LoginResponse = {
        token: 'test-jwt-token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        displayName: 'Test User',
        isSystemAdmin: false,
        tenantAccess: [
          {
            tenantId: 'tenant-1',
            tenantName: 'Test Tenant',
            roles: ['Employee', 'TeamLead'],
          },
        ],
      };

      useAuthStore.getState().loginFromResponse(mockResponse);

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        id: mockResponse.userId,
        email: mockResponse.email,
        displayName: mockResponse.displayName,
        isSystemAdmin: false,
      });
      expect(state.token).toBe(mockResponse.token);
      expect(state.isAuthenticated).toBe(true);
      expect(state.availableTenants).toHaveLength(1);
      expect(state.currentWorkspace).toBeNull(); // Must select workspace
    });

    it('should set isSystemAdmin correctly', () => {
      const mockResponse: LoginResponse = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        userId: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin User',
        isSystemAdmin: true,
        tenantAccess: [],
      };

      useAuthStore.getState().loginFromResponse(mockResponse);

      const state = useAuthStore.getState();
      expect(state.user?.isSystemAdmin).toBe(true);
    });
  });

  describe('selectWorkspace', () => {
    it('should set the current workspace', () => {
      const workspace = {
        type: 'tenant' as const,
        tenantId: 'tenant-1',
        tenantName: 'Test Tenant',
        roles: [AppRole.Employee],
      };

      useAuthStore.getState().selectWorkspace(workspace);

      const { currentWorkspace } = useAuthStore.getState();
      expect(currentWorkspace).toEqual(workspace);
    });

    it('should allow selecting admin workspace', () => {
      const workspace = {
        type: 'admin' as const,
      };

      useAuthStore.getState().selectWorkspace(workspace);

      const { currentWorkspace } = useAuthStore.getState();
      expect(currentWorkspace?.type).toBe('admin');
    });
  });

  describe('switchWorkspace', () => {
    it('should clear the current workspace', () => {
      // First set a workspace
      useAuthStore.setState({
        currentWorkspace: {
          type: 'tenant',
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          roles: [AppRole.Employee],
        },
      });

      useAuthStore.getState().switchWorkspace();

      const { currentWorkspace } = useAuthStore.getState();
      expect(currentWorkspace).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the role', () => {
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
        },
        currentWorkspace: {
          type: 'tenant',
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          roles: [AppRole.Employee, AppRole.TeamLead],
        },
      });

      expect(useAuthStore.getState().hasRole(AppRole.Employee)).toBe(true);
      expect(useAuthStore.getState().hasRole(AppRole.TeamLead)).toBe(true);
    });

    it('should return false if user does not have the role', () => {
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
        },
        currentWorkspace: {
          type: 'tenant',
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          roles: [AppRole.Employee],
        },
      });

      expect(useAuthStore.getState().hasRole(AppRole.TenantAdmin)).toBe(false);
      expect(useAuthStore.getState().hasRole(AppRole.SysAdmin)).toBe(false);
    });

    it('should return true for all roles if user is system admin', () => {
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'admin@example.com',
          displayName: 'Admin User',
          isSystemAdmin: true,
        },
        currentWorkspace: {
          type: 'tenant',
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          roles: [AppRole.Employee],
        },
      });

      expect(useAuthStore.getState().hasRole(AppRole.SysAdmin)).toBe(true);
      expect(useAuthStore.getState().hasRole(AppRole.TenantAdmin)).toBe(true);
      expect(useAuthStore.getState().hasRole(AppRole.ResourceManager)).toBe(true);
    });

    it('should return false if no workspace is selected', () => {
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
        },
        currentWorkspace: null,
      });

      expect(useAuthStore.getState().hasRole(AppRole.Employee)).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update user properties', () => {
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
        },
      });

      useAuthStore.getState().setUser({
        displayName: 'Updated Name',
        profilePhotoUrl: 'https://example.com/photo.jpg',
      });

      const { user } = useAuthStore.getState();
      expect(user?.displayName).toBe('Updated Name');
      expect(user?.profilePhotoUrl).toBe('https://example.com/photo.jpg');
      expect(user?.email).toBe('test@example.com'); // Unchanged
    });

    it('should not update if no user is set', () => {
      useAuthStore.setState({ user: null });

      useAuthStore.getState().setUser({ displayName: 'New Name' });

      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token if not expired', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      useAuthStore.setState({
        token: 'valid-token',
        tokenExpiresAt: futureDate,
      });

      expect(useAuthStore.getState().getToken()).toBe('valid-token');
    });

    it('should return null if token is expired', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', displayName: 'Test', isSystemAdmin: false },
        token: 'expired-token',
        tokenExpiresAt: pastDate,
        isAuthenticated: true,
      });

      expect(useAuthStore.getState().getToken()).toBeNull();

      // Should also clear auth state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should return null if no token', () => {
      useAuthStore.setState({
        token: null,
        tokenExpiresAt: null,
      });

      expect(useAuthStore.getState().getToken()).toBeNull();
    });
  });

  describe('AppRole enum', () => {
    it('should have all expected roles', () => {
      expect(AppRole.Employee).toBe('Employee');
      expect(AppRole.ViewOnly).toBe('ViewOnly');
      expect(AppRole.TeamLead).toBe('TeamLead');
      expect(AppRole.ProjectManager).toBe('ProjectManager');
      expect(AppRole.ResourceManager).toBe('ResourceManager');
      expect(AppRole.OfficeManager).toBe('OfficeManager');
      expect(AppRole.TenantAdmin).toBe('TenantAdmin');
      expect(AppRole.SysAdmin).toBe('SysAdmin');
      expect(AppRole.Executive).toBe('Executive');
      expect(AppRole.OverrideApprover).toBe('OverrideApprover');
      expect(AppRole.Support).toBe('Support');
      expect(AppRole.Auditor).toBe('Auditor');
    });
  });
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type TenantAccessInfo, type LoginResponse } from '../services/authService';
import { ssoLoginPopup, ssoLogout, isSsoEnabled } from '../services/ssoService';

export enum AppRole {
  Employee = 'Employee',
  ViewOnly = 'ViewOnly',
  TeamLead = 'TeamLead',
  ProjectManager = 'ProjectManager',
  ResourceManager = 'ResourceManager',
  OfficeManager = 'OfficeManager',
  TenantAdmin = 'TenantAdmin',
  SysAdmin = 'SysAdmin',
  Executive = 'Executive',
  OverrideApprover = 'OverrideApprover',
  Support = 'Support',
  Auditor = 'Auditor',
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
  profilePhotoUrl?: string;
}

interface Workspace {
  type: 'admin' | 'tenant';
  tenantId?: string;
  tenantName?: string;
  roles?: AppRole[];
}

// Impersonation context
interface ImpersonationInfo {
  isImpersonating: boolean;
  sessionId: string;
  originalUser: User;
  impersonatedUser: User;
}

interface AuthState {
  // User info (set after login)
  user: User | null;

  // JWT token and expiry
  token: string | null;
  tokenExpiresAt: string | null;

  // Available workspaces
  availableTenants: TenantAccessInfo[];

  // Current selected workspace
  currentWorkspace: Workspace | null;

  // Auth status
  isAuthenticated: boolean;

  // Impersonation state
  impersonation: ImpersonationInfo | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (token: string) => Promise<void>;
  loginWithSso: () => Promise<void>;
  checkSsoEnabled: () => Promise<boolean>;
  loginFromResponse: (response: LoginResponse) => void;
  selectWorkspace: (workspace: Workspace) => void;
  switchWorkspace: () => void;
  logout: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  setUser: (user: Partial<User>) => void;
  getToken: () => string | null;

  // Impersonation actions
  startImpersonation: (targetUserId: string, reason: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiresAt: null,
      availableTenants: [],
      currentWorkspace: null,
      isAuthenticated: false,
      impersonation: null,

      login: async (email: string, password: string) => {
        try {
          const response = await authService.login({ email, password });
          get().loginFromResponse(response);
        } catch (error) {
          set({
            user: null,
            token: null,
            tokenExpiresAt: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false,
            impersonation: null
          });
          throw error;
        }
      },

      loginWithMagicLink: async (token: string) => {
        try {
          const response = await authService.verifyMagicLink(token);
          get().loginFromResponse(response);
        } catch (error) {
          set({
            user: null,
            token: null,
            tokenExpiresAt: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false,
            impersonation: null
          });
          throw error;
        }
      },

      loginWithSso: async () => {
        try {
          const result = await ssoLoginPopup();

          if (!result.success) {
            throw new Error(result.error || 'SSO login failed');
          }

          // Convert SSO result to LoginResponse format
          const response: LoginResponse = {
            token: result.token!,
            expiresAt: result.expiresAt!.toISOString(),
            userId: result.userId!,
            email: result.email!,
            displayName: result.displayName!,
            isSystemAdmin: result.isSystemAdmin!,
            tenantAccess: result.tenantAccess || [],
          };

          get().loginFromResponse(response);
        } catch (error) {
          set({
            user: null,
            token: null,
            tokenExpiresAt: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false,
            impersonation: null
          });
          throw error;
        }
      },

      checkSsoEnabled: async () => {
        return await isSsoEnabled();
      },

      loginFromResponse: (response: LoginResponse) => {
        const user: User = {
          id: response.userId,
          email: response.email,
          displayName: response.displayName,
          isSystemAdmin: response.isSystemAdmin,
        };

        set({
          user,
          token: response.token,
          tokenExpiresAt: response.expiresAt,
          availableTenants: response.tenantAccess,
          isAuthenticated: true,
          currentWorkspace: null,  // User must select workspace
          impersonation: null
        });
      },

      selectWorkspace: (workspace: Workspace) => {
        set({ currentWorkspace: workspace });
      },

      switchWorkspace: () => {
        set({ currentWorkspace: null });
      },

      logout: async () => {
        const { impersonation } = get();

        // If impersonating, end impersonation first
        if (impersonation?.isImpersonating) {
          try {
            await get().endImpersonation();
            return; // Don't log out, just end impersonation
          } catch (error) {
            console.error('Error ending impersonation during logout:', error);
          }
        }

        try {
          await authService.logout();
          // Also clear SSO state
          await ssoLogout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear notification banner dismissed state
          sessionStorage.removeItem('dismissedEnvironmentBanner');
          sessionStorage.removeItem('dismissedNotificationMessage');

          set({
            user: null,
            token: null,
            tokenExpiresAt: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false,
            impersonation: null
          });
        }
      },

      hasRole: (role: AppRole) => {
        const { currentWorkspace, user } = get();
        // System admins have all roles
        if (user?.isSystemAdmin) {
          return true;
        }
        return currentWorkspace?.roles?.includes(role) ?? false;
      },

      setUser: (updatedUser: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updatedUser } });
        }
      },

      getToken: () => {
        const { token, tokenExpiresAt } = get();

        // Check if token is expired
        if (token && tokenExpiresAt) {
          const expiryDate = new Date(tokenExpiresAt);
          if (expiryDate > new Date()) {
            return token;
          }
          // Token expired, clear auth state
          set({
            user: null,
            token: null,
            tokenExpiresAt: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false,
            impersonation: null
          });
        }
        return null;
      },

      // Impersonation actions
      startImpersonation: async (targetUserId: string, reason: string) => {
        const { user } = get();
        if (!user) {
          throw new Error('Must be logged in to impersonate');
        }

        const response = await authService.startImpersonation(targetUserId, reason);

        if (!response.success) {
          throw new Error('Failed to start impersonation');
        }

        const impersonatedUser: User = {
          id: response.impersonatedUser.userId,
          email: response.impersonatedUser.email,
          displayName: response.impersonatedUser.displayName,
          isSystemAdmin: false, // Impersonated users can't be system admins
        };

        set({
          user: impersonatedUser,
          token: response.token,
          tokenExpiresAt: response.expiresAt,
          availableTenants: response.tenantAccess,
          currentWorkspace: null, // Force workspace reselection
          impersonation: {
            isImpersonating: true,
            sessionId: response.sessionId,
            originalUser: user,
            impersonatedUser: impersonatedUser,
          },
        });
      },

      endImpersonation: async () => {
        const { impersonation } = get();

        if (!impersonation?.isImpersonating) {
          throw new Error('Not currently impersonating');
        }

        const response = await authService.endImpersonation();

        if (!response.success) {
          throw new Error('Failed to end impersonation');
        }

        // Restore original admin user
        set({
          user: impersonation.originalUser,
          token: response.token,
          tokenExpiresAt: response.expiresAt,
          availableTenants: response.tenantAccess,
          currentWorkspace: null, // Force workspace reselection
          impersonation: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      version: 4, // Increment for impersonation support
    }
  )
);

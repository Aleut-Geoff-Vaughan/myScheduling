import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type TenantAccessInfo } from '../services/authService';

export enum AppRole {
  Employee = 'Employee',
  ProjectManager = 'ProjectManager',
  ResourceManager = 'ResourceManager',
  OfficeManager = 'OfficeManager',
  SysAdmin = 'SysAdmin',
  Executive = 'Executive',
  OverrideApprover = 'OverrideApprover',
}

interface User {
  id: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
}

interface Workspace {
  type: 'admin' | 'tenant';
  tenantId?: string;
  tenantName?: string;
  roles?: AppRole[];
}

interface AuthState {
  // User info (set after login)
  user: User | null;

  // Available workspaces
  availableTenants: TenantAccessInfo[];

  // Current selected workspace
  currentWorkspace: Workspace | null;

  // Auth status
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  selectWorkspace: (workspace: Workspace) => void;
  switchWorkspace: () => void;
  logout: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      availableTenants: [],
      currentWorkspace: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await authService.login({ email, password });

          const user: User = {
            id: response.userId,
            email: response.email,
            displayName: response.displayName,
            isSystemAdmin: response.isSystemAdmin,
          };

          set({
            user,
            availableTenants: response.tenantAccess,
            isAuthenticated: true,
            currentWorkspace: null  // User must select workspace
          });
        } catch (error) {
          set({
            user: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false
          });
          throw error;
        }
      },

      selectWorkspace: (workspace: Workspace) => {
        set({ currentWorkspace: workspace });
      },

      switchWorkspace: () => {
        set({ currentWorkspace: null });
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            availableTenants: [],
            currentWorkspace: null,
            isAuthenticated: false
          });
        }
      },

      hasRole: (role: AppRole) => {
        const { currentWorkspace } = get();
        return currentWorkspace?.roles?.includes(role) ?? false;
      },
    }),
    {
      name: 'auth-storage',
      version: 2, // Increment this to force clear old incompatible storage
    }
  )
);

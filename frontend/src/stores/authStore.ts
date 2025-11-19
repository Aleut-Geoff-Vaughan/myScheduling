import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  tenantId: string;
  roles: AppRole[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: AppRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, _password: string) => {
        // TODO: Implement actual API call
        // For now, mock authentication
        const mockUser: User = {
          id: '1',
          email,
          displayName: email.split('@')[0],
          tenantId: 'default-tenant',
          roles: [AppRole.Employee, AppRole.ProjectManager],
        };

        set({ user: mockUser, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      hasRole: (role: AppRole) => {
        const { user } = get();
        return user?.roles.includes(role) ?? false;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

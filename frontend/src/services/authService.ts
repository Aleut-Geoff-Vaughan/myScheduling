import { api } from '../lib/api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TenantAccessInfo {
  tenantId: string;
  tenantName: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
  tenantAccess: TenantAccessInfo[];
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/login', credentials);
  },

  async logout(): Promise<void> {
    return api.post<void>('/auth/logout', {});
  },
};

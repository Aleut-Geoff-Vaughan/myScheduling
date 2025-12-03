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

// Magic Link Types
export interface MagicLinkRequestResponse {
  message: string;
}

export interface MagicLinkVerifyResponse extends LoginResponse {}

// Impersonation Types
export interface ImpersonatedUserInfo {
  userId: string;
  email: string;
  displayName: string;
}

export interface ImpersonationStartResponse {
  success: boolean;
  sessionId: string;
  token: string;
  expiresAt: string;
  impersonatedUser: ImpersonatedUserInfo;
  tenantAccess: TenantAccessInfo[];
}

export interface ImpersonationEndResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  user: ImpersonatedUserInfo;
  tenantAccess: TenantAccessInfo[];
}

export interface ImpersonationSessionInfo {
  active: boolean;
  sessionId?: string;
  adminUserId?: string;
  adminUserEmail?: string;
  adminUserName?: string;
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  impersonatedUserName?: string;
  startedAt?: string;
  endedAt?: string;
  reason?: string;
  endReason?: string;
  duration?: string;
}

export interface CanImpersonateResponse {
  canImpersonate: boolean;
  reason?: string;
}

export const authService = {
  // Standard Auth
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/login', credentials);
  },

  async logout(): Promise<void> {
    return api.post<void>('/auth/logout', {});
  },

  async setPassword(userId: string, password: string): Promise<void> {
    return api.post<void>('/auth/set-password', { userId, password });
  },

  // Magic Link
  async requestMagicLink(email: string): Promise<MagicLinkRequestResponse> {
    return api.post<MagicLinkRequestResponse>('/auth/magic-link/request', { email });
  },

  async verifyMagicLink(token: string): Promise<MagicLinkVerifyResponse> {
    return api.post<MagicLinkVerifyResponse>('/auth/magic-link/verify', { token });
  },

  // Impersonation
  async startImpersonation(targetUserId: string, reason: string): Promise<ImpersonationStartResponse> {
    return api.post<ImpersonationStartResponse>('/admin/impersonation/start', { targetUserId, reason });
  },

  async endImpersonation(): Promise<ImpersonationEndResponse> {
    return api.post<ImpersonationEndResponse>('/admin/impersonation/end', {});
  },

  async canImpersonate(targetUserId: string): Promise<CanImpersonateResponse> {
    return api.get<CanImpersonateResponse>(`/admin/impersonation/can-impersonate/${targetUserId}`);
  },

  async getActiveImpersonationSession(): Promise<ImpersonationSessionInfo> {
    return api.get<ImpersonationSessionInfo>('/admin/impersonation/active');
  },

  async getImpersonationSessions(count: number = 50): Promise<ImpersonationSessionInfo[]> {
    return api.get<ImpersonationSessionInfo[]>(`/admin/impersonation/sessions?count=${count}`);
  },
};

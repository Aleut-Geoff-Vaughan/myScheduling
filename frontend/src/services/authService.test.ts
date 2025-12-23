import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from './authService';
import type { LoginRequest, LoginResponse, ImpersonationStartResponse, ImpersonationEndResponse, CanImpersonateResponse, ImpersonationSessionInfo, MagicLinkRequestResponse } from './authService';
import { api, ApiError } from '../lib/api-client';

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

// Mock the logging service
vi.mock('./loggingService', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    const mockCredentials: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockLoginResponse: LoginResponse = {
      token: 'jwt-token-123',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      isSystemAdmin: false,
      tenantAccess: [
        {
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          roles: ['Employee'],
        },
      ],
    };

    it('should call POST /auth/login with credentials', async () => {
      vi.mocked(api.post).mockResolvedValue(mockLoginResponse);

      await authService.login(mockCredentials);

      expect(api.post).toHaveBeenCalledWith('/auth/login', mockCredentials);
    });

    it('should return login response on success', async () => {
      vi.mocked(api.post).mockResolvedValue(mockLoginResponse);

      const result = await authService.login(mockCredentials);

      expect(result).toEqual(mockLoginResponse);
      expect(result.token).toBe('jwt-token-123');
      expect(result.userId).toBe('user-123');
      expect(result.tenantAccess).toHaveLength(1);
    });

    it('should throw ApiError on invalid credentials', async () => {
      const mockError = new ApiError(401, 'Unauthorized', { message: 'Invalid email or password' });
      vi.mocked(api.post).mockRejectedValue(mockError);

      await expect(authService.login(mockCredentials)).rejects.toThrow(ApiError);
      await expect(authService.login(mockCredentials)).rejects.toMatchObject({
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    it('should throw ApiError on locked account', async () => {
      const mockError = new ApiError(401, 'Unauthorized', {
        message: 'Account is temporarily locked due to too many failed login attempts',
      });
      vi.mocked(api.post).mockRejectedValue(mockError);

      await expect(authService.login(mockCredentials)).rejects.toThrow(ApiError);
    });
  });

  describe('logout', () => {
    it('should call POST /auth/logout', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {});
    });

    it('should not throw on successful logout', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });

  describe('setPassword', () => {
    it('should call POST /auth/set-password with userId and password', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);

      await authService.setPassword('user-123', 'NewPassword123!');

      expect(api.post).toHaveBeenCalledWith('/auth/set-password', {
        userId: 'user-123',
        password: 'NewPassword123!',
      });
    });

    it('should throw ApiError on weak password', async () => {
      const mockError = new ApiError(400, 'Bad Request', {
        message: 'Password must be at least 8 characters long',
      });
      vi.mocked(api.post).mockRejectedValue(mockError);

      await expect(authService.setPassword('user-123', 'weak')).rejects.toThrow(ApiError);
    });
  });

  describe('magic link', () => {
    describe('requestMagicLink', () => {
      it('should call POST /auth/magic-link/request with email', async () => {
        const mockResponse: MagicLinkRequestResponse = {
          message: 'If an account exists with this email, a login link has been sent.',
        };
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        await authService.requestMagicLink('test@example.com');

        expect(api.post).toHaveBeenCalledWith('/auth/magic-link/request', { email: 'test@example.com' });
      });

      it('should return success message', async () => {
        const mockResponse: MagicLinkRequestResponse = {
          message: 'If an account exists with this email, a login link has been sent.',
        };
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        const result = await authService.requestMagicLink('test@example.com');

        expect(result.message).toContain('login link');
      });
    });

    describe('verifyMagicLink', () => {
      it('should call POST /auth/magic-link/verify with token', async () => {
        const mockResponse: LoginResponse = {
          token: 'jwt-token',
          expiresAt: new Date().toISOString(),
          userId: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
          tenantAccess: [],
        };
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        await authService.verifyMagicLink('magic-link-token');

        expect(api.post).toHaveBeenCalledWith('/auth/magic-link/verify', { token: 'magic-link-token' });
      });

      it('should return login response on valid token', async () => {
        const mockResponse: LoginResponse = {
          token: 'jwt-token',
          expiresAt: new Date().toISOString(),
          userId: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          isSystemAdmin: false,
          tenantAccess: [],
        };
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        const result = await authService.verifyMagicLink('magic-link-token');

        expect(result.token).toBe('jwt-token');
        expect(result.userId).toBe('user-123');
      });

      it('should throw ApiError on invalid/expired token', async () => {
        const mockError = new ApiError(401, 'Unauthorized', { message: 'Invalid or expired link' });
        vi.mocked(api.post).mockRejectedValue(mockError);

        await expect(authService.verifyMagicLink('invalid-token')).rejects.toThrow(ApiError);
      });
    });
  });

  describe('impersonation', () => {
    describe('startImpersonation', () => {
      const mockResponse: ImpersonationStartResponse = {
        success: true,
        sessionId: 'session-123',
        token: 'impersonation-jwt',
        expiresAt: new Date().toISOString(),
        impersonatedUser: {
          userId: 'target-user-123',
          email: 'target@example.com',
          displayName: 'Target User',
        },
        tenantAccess: [
          {
            tenantId: 'tenant-1',
            tenantName: 'Test Tenant',
            roles: ['Employee'],
          },
        ],
      };

      it('should call POST /admin/impersonation/start with targetUserId and reason', async () => {
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        await authService.startImpersonation('target-user-123', 'Testing user issue');

        expect(api.post).toHaveBeenCalledWith('/admin/impersonation/start', {
          targetUserId: 'target-user-123',
          reason: 'Testing user issue',
        });
      });

      it('should return impersonation response with new token', async () => {
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        const result = await authService.startImpersonation('target-user-123', 'Testing');

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe('session-123');
        expect(result.token).toBe('impersonation-jwt');
        expect(result.impersonatedUser.email).toBe('target@example.com');
      });

      it('should throw ApiError when not authorized to impersonate', async () => {
        const mockError = new ApiError(400, 'Bad Request', {
          message: 'Cannot impersonate other system administrators',
        });
        vi.mocked(api.post).mockRejectedValue(mockError);

        await expect(authService.startImpersonation('admin-user', 'Testing')).rejects.toThrow(ApiError);
      });
    });

    describe('endImpersonation', () => {
      const mockResponse: ImpersonationEndResponse = {
        success: true,
        token: 'original-jwt',
        expiresAt: new Date().toISOString(),
        user: {
          userId: 'admin-123',
          email: 'admin@example.com',
          displayName: 'Admin User',
        },
        tenantAccess: [],
      };

      it('should call POST /admin/impersonation/end', async () => {
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        await authService.endImpersonation();

        expect(api.post).toHaveBeenCalledWith('/admin/impersonation/end', {});
      });

      it('should return original user token', async () => {
        vi.mocked(api.post).mockResolvedValue(mockResponse);

        const result = await authService.endImpersonation();

        expect(result.success).toBe(true);
        expect(result.token).toBe('original-jwt');
        expect(result.user.email).toBe('admin@example.com');
      });
    });

    describe('canImpersonate', () => {
      it('should call GET /admin/impersonation/can-impersonate/{userId}', async () => {
        const mockResponse: CanImpersonateResponse = { canImpersonate: true };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        await authService.canImpersonate('target-user-123');

        expect(api.get).toHaveBeenCalledWith('/admin/impersonation/can-impersonate/target-user-123');
      });

      it('should return true when allowed to impersonate', async () => {
        const mockResponse: CanImpersonateResponse = { canImpersonate: true };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await authService.canImpersonate('target-user-123');

        expect(result.canImpersonate).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should return false with reason when not allowed', async () => {
        const mockResponse: CanImpersonateResponse = {
          canImpersonate: false,
          reason: 'Cannot impersonate other system administrators',
        };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await authService.canImpersonate('admin-user');

        expect(result.canImpersonate).toBe(false);
        expect(result.reason).toContain('system administrators');
      });
    });

    describe('getActiveImpersonationSession', () => {
      it('should call GET /admin/impersonation/active', async () => {
        const mockResponse: ImpersonationSessionInfo = { active: false };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        await authService.getActiveImpersonationSession();

        expect(api.get).toHaveBeenCalledWith('/admin/impersonation/active');
      });

      it('should return session info when active', async () => {
        const mockResponse: ImpersonationSessionInfo = {
          active: true,
          sessionId: 'session-123',
          impersonatedUserId: 'target-123',
          impersonatedUserEmail: 'target@example.com',
          reason: 'Testing',
        };
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await authService.getActiveImpersonationSession();

        expect(result.active).toBe(true);
        expect(result.sessionId).toBe('session-123');
      });
    });

    describe('getImpersonationSessions', () => {
      it('should call GET /admin/impersonation/sessions with count param', async () => {
        const mockResponse: ImpersonationSessionInfo[] = [];
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        await authService.getImpersonationSessions(25);

        expect(api.get).toHaveBeenCalledWith('/admin/impersonation/sessions?count=25');
      });

      it('should use default count of 50', async () => {
        const mockResponse: ImpersonationSessionInfo[] = [];
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        await authService.getImpersonationSessions();

        expect(api.get).toHaveBeenCalledWith('/admin/impersonation/sessions?count=50');
      });

      it('should return list of sessions', async () => {
        const mockResponse: ImpersonationSessionInfo[] = [
          {
            active: false,
            sessionId: 'session-1',
            adminUserId: 'admin-123',
            impersonatedUserId: 'target-123',
            reason: 'Testing 1',
          },
          {
            active: true,
            sessionId: 'session-2',
            adminUserId: 'admin-123',
            impersonatedUserId: 'target-456',
            reason: 'Testing 2',
          },
        ];
        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const result = await authService.getImpersonationSessions();

        expect(result).toHaveLength(2);
        expect(result[0].sessionId).toBe('session-1');
        expect(result[1].active).toBe(true);
      });
    });
  });
});

import { http, HttpResponse } from 'msw';

// Default mock data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  displayName: 'Test User',
  isSystemAdmin: false,
};

const mockTenant = {
  tenantId: '123e4567-e89b-12d3-a456-426614174001',
  tenantName: 'Test Tenant',
  roles: ['Employee'],
};

const mockLoginResponse = {
  token: 'mock-jwt-token',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  userId: mockUser.id,
  email: mockUser.email,
  displayName: mockUser.displayName,
  isSystemAdmin: false,
  tenantAccess: [mockTenant],
};

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'Password123!') {
      return HttpResponse.json(mockLoginResponse);
    }

    if (body.email === 'locked@example.com') {
      return HttpResponse.json(
        { message: 'Account is temporarily locked. Please try again in 30 minutes.' },
        { status: 401 }
      );
    }

    if (body.email === 'inactive@example.com') {
      return HttpResponse.json(
        { message: 'Account is inactive. Please contact your administrator.' },
        { status: 401 }
      );
    }

    return HttpResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  http.post('/api/auth/magic-link/request', async () => {
    return HttpResponse.json({
      message: 'If an account exists with this email, a login link has been sent.'
    });
  }),

  // Users endpoints
  http.get('/api/users/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json(mockUser);
  }),

  // Projects endpoints
  http.get('/api/projects', () => {
    return HttpResponse.json([
      { id: '1', name: 'Project Alpha', code: 'PA001', status: 'Active' },
      { id: '2', name: 'Project Beta', code: 'PB002', status: 'Active' },
    ]);
  }),

  // Health check
  http.get('/health', () => {
    return HttpResponse.json({ status: 'Healthy' });
  }),
];

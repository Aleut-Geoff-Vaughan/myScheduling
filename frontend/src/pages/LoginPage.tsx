import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface HealthStatus {
  status: string;
  environment: string;
  checks: Array<{
    name: string;
    status: string;
  }>;
}

export function LoginPage() {
  const [email, setEmail] = useState('admin@aleutfederal.com');
  const [password, setPassword] = useState('admin123');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Mock tenants - will be replaced with API call
  const availableTenants = [
    { id: 'system', name: 'System Administration', code: 'SYSTEM' },
    { id: '1', name: 'Aleut Federal', code: 'ALEUT' },
    { id: '2', name: 'Partner Organization', code: 'PARTNER' }
  ];

  // Health check on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.DEV
          ? 'http://localhost:5000'
          : window.location.origin;

        const response = await fetch(`${apiUrl}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setHealthStatus(data);
        } else {
          setHealthError('API is unavailable');
        }
      } catch (err) {
        setHealthError('Cannot connect to API');
      }
    };

    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTenant) {
      setError('Please select a tenant');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDatabaseHealthy = healthStatus?.checks.find(c => c.name === 'database')?.status === 'Healthy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Aleut Staffing</h1>
            <p className="text-gray-600 mt-2">Project Scheduling & Resource Management</p>
          </div>

          {/* System Health Status */}
          <div className="mb-6 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <div className="text-xs font-medium text-gray-700 mb-2">System Status</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">API:</span>
                <span className={`font-medium ${healthStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {healthStatus ? '● Online' : healthError || '● Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Database:</span>
                <span className={`font-medium ${isDatabaseHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {isDatabaseHealthy ? '● Connected' : '● Disconnected'}
                </span>
              </div>
              {healthStatus?.environment && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-medium text-gray-700">{healthStatus.environment}</span>
                </div>
              )}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-2">
                Tenant
              </label>
              <select
                id="tenant"
                required
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                disabled={isLoading}
              >
                <option value="">Select a tenant...</option>
                {availableTenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="you@company.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !healthStatus}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Default Credentials Helper */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-medium text-blue-900 mb-2">Default Admin Credentials:</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Email:</strong> admin@aleutfederal.com</div>
              <div><strong>Password:</strong> admin123</div>
              <div className="mt-2 pt-2 border-t border-blue-300">
                <div className="font-medium text-blue-800 mb-1">Tenant Selection:</div>
                <div className="text-blue-600">
                  • <strong>System Administration:</strong> Manage all tenants, users, and system settings
                </div>
                <div className="text-blue-600">
                  • <strong>Aleut Federal:</strong> Access tenant-specific resources and projects
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2025 Aleut Federal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

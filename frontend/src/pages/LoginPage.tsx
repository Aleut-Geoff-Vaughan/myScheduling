import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api';
import { Link } from 'react-router-dom';

interface HealthStatus {
  status: string;
  environment: string;
  checks: Array<{
    name: string;
    status: string;
  }>;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Health check on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(buildApiUrl('/health'));
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

  // Prefill remembered email
  useEffect(() => {
    const stored = localStorage.getItem('remembered-email');
    if (stored) {
      setEmail(stored);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('remembered-email', email);
      } else {
        localStorage.removeItem('remembered-email');
      }

      await login(email, password);
      toast.success('Login successful!');
      // After login, redirect to workspace selector
      navigate('/select-workspace');
    } catch (err) {
      const errorMessage = 'Invalid credentials. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
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
            <h1 className="text-3xl font-bold text-gray-900">myScheduling</h1>
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
              {!healthStatus && !healthError && (
                <div className="text-xs text-gray-500 italic">Checking system status...</div>
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
                autoComplete="username"
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
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                Remember me
              </label>
              <span className="text-gray-400">|</span>
              <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed border border-blue-700 shadow-sm tracking-wide"
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

              <button
                type="button"
                className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 font-medium py-3 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                onClick={() => toast('Login with Microsoft coming soon')}
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23" aria-hidden="true">
                  <rect width="10.5" height="10.5" x="0.5" y="0.5" fill="#F35325" />
                  <rect width="10.5" height="10.5" x="12" y="0.5" fill="#81BC06" />
                  <rect width="10.5" height="10.5" x="0.5" y="12" fill="#05A6F0" />
                  <rect width="10.5" height="10.5" x="12" y="12" fill="#FFBA08" />
                </svg>
                <span>Sign in with Microsoft</span>
              </button>
            </div>
          </form>

          {/* Login Helper */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-medium text-blue-900 mb-2">Test Accounts:</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Regular User:</strong> test@test.com (any password)</div>
              <div><strong>System Admin:</strong> admin@test.com (any password)</div>
              <div className="mt-2 pt-2 border-t border-blue-300 text-blue-600">
                After login, you'll select your workspace from available tenants.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2025 myScheduling. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

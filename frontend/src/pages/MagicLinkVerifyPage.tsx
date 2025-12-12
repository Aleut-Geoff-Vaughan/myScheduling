import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

type VerifyStatus = 'verifying' | 'success' | 'error';

export function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const loginWithMagicLink = useAuthStore((state) => state.loginWithMagicLink);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No login token provided. Please request a new magic link.');
        return;
      }

      try {
        await loginWithMagicLink(token);
        setStatus('success');
        toast.success('Successfully signed in!');

        // Redirect to workspace selector after short delay
        setTimeout(() => {
          navigate('/select-workspace');
        }, 1500);
      } catch (error) {
        setStatus('error');
        const message = error instanceof Error
          ? error.message
          : 'Failed to verify magic link. Please request a new one.';
        setErrorMessage(message);
        toast.error('Failed to verify login link');
      }
    };

    verifyToken();
  }, [searchParams, loginWithMagicLink, navigate]);

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
          </div>

          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying your login link...
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your credentials.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Successfully signed in!
              </h2>
              <p className="text-gray-600">
                Redirecting you to workspace selection...
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Unable to sign in
              </h2>
              <p className="text-gray-600 mb-6">
                {errorMessage}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2025 myScheduling. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

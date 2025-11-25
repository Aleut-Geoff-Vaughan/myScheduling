import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-sm text-gray-600 mt-1">
            Placeholder flow. Enter your email and we&apos;ll send reset instructions when configured.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition border border-blue-700 shadow-sm tracking-wide"
          >
            Send Reset Link
          </button>
        </form>

        {submitted && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            If this were wired up, we’d email a reset link to {email || 'your address'}.
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

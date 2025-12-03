import { useAuthStore } from '../stores/authStore';
import { AlertTriangle, X, User } from 'lucide-react';

/**
 * ImpersonationBanner - Displays a prominent warning when admin is impersonating a user.
 * Should be shown at the top of every page during impersonation.
 */
export function ImpersonationBanner() {
  const { impersonation, endImpersonation } = useAuthStore();

  if (!impersonation?.isImpersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    try {
      await endImpersonation();
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      alert('Failed to end impersonation. Please try again.');
    }
  };

  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Impersonating:</span>
              <span className="font-bold">
                {impersonation.impersonatedUser.displayName}
              </span>
              <span className="text-amber-800">
                ({impersonation.impersonatedUser.email})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-amber-800">
              <User className="h-4 w-4" />
              <span>Admin: {impersonation.originalUser.displayName}</span>
            </div>

            <button
              onClick={handleEndImpersonation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950 text-amber-100
                         text-sm font-medium rounded-md hover:bg-amber-900
                         transition-colors focus:outline-none focus:ring-2
                         focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-amber-500"
            >
              <X className="h-4 w-4" />
              <span>End Impersonation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

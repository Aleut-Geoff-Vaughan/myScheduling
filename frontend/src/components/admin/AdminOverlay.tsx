import { useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useModule } from '../../hooks/useModule';
import { getNavIcon } from '../navigation/NavIcons';
import { adminNavigation } from '../../config/modules';
import type { NavigationSection } from '../../config/modules';
import { useAuthStore } from '../../stores/authStore';

/**
 * AdminOverlay - A slide-over panel for admin functionality
 *
 * This component renders admin content in a full-screen overlay
 * that slides in from the right, allowing users to quickly access
 * admin functions without losing their place in the main app.
 */
export function AdminOverlay() {
  const location = useLocation();
  const { closeAdmin, previousPath } = useModule();
  const { hasRole } = useAuthStore();

  // Filter admin navigation based on roles
  const filteredNavigation = adminNavigation
    .filter((section) => {
      if (section.roles && section.roles.length > 0) {
        return section.roles.some((role) => hasRole(role));
      }
      return true;
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.roles && item.roles.length > 0) {
          return item.roles.some((role) => hasRole(role));
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  // Handle escape key to close overlay
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAdmin();
    }
  }, [closeAdmin]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    closeAdmin();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" />

      {/* Overlay Panel */}
      <div className="relative ml-auto flex w-full max-w-6xl flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-violet-50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to {previousPath?.includes('/forecast') ? 'Forecast' : previousPath?.includes('/facilities') ? 'Facilities' : 'Work'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">Administration</h1>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Admin Sidebar */}
          <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <nav className="p-4 space-y-6">
              {filteredNavigation.map((section) => (
                <AdminNavSection
                  key={section.id}
                  section={section}
                  currentPath={location.pathname}
                />
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-white">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

interface AdminNavSectionProps {
  section: NavigationSection;
  currentPath: string;
}

function AdminNavSection({ section, currentPath }: AdminNavSectionProps) {
  return (
    <div>
      <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {section.name}
      </h3>
      <div className="space-y-1">
        {section.items.map((item) => {
          const isActive = currentPath === item.path ||
            (item.path !== '/admin' && currentPath.startsWith(item.path + '/'));

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150
                ${isActive
                  ? 'bg-violet-100 text-violet-700 border-r-2 border-violet-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className={isActive ? 'text-violet-600' : 'text-gray-400'}>
                {getNavIcon(item.icon)}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default AdminOverlay;

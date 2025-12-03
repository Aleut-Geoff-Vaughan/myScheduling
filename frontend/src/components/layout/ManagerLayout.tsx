import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, AppRole } from '../../stores/authStore';
import { useInbox } from '../../hooks/useInbox';
import { AssignmentRequestStatus } from '../../types/api';
import { NotificationBanner } from '../NotificationBanner';
import { ImpersonationBanner } from '../ImpersonationBanner';
import { SearchModal, useSearchModal } from '../SearchModal';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: AppRole[];
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currentWorkspace, logout, hasRole } = useAuthStore();
  const searchModal = useSearchModal();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: inbox = [] } = useInbox(
    currentWorkspace?.tenantId
      ? { tenantId: currentWorkspace.tenantId, status: AssignmentRequestStatus.Pending }
      : undefined
  );
  const unreadCount = inbox.filter((i) => i.status === AssignmentRequestStatus.Pending).length;

  // Icons
  const icons = {
    managerDashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    people: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    teamStaffing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    projects: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    wbs: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    templates: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    facilities: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    staffingAdmin: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    reports: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    forecastApprovals: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  // Manager navigation structure
  const navigationGroups: NavGroup[] = [
    {
      name: 'Overview',
      items: [
        { name: 'Manager Dashboard', path: '/manager', icon: icons.managerDashboard },
        { name: 'People', path: '/manager/people', icon: icons.people },
        { name: 'Team Staffing', path: '/manager/staffing', icon: icons.teamStaffing },
        { name: 'Team Calendar', path: '/manager/team-calendar', icon: icons.calendar },
      ],
    },
    {
      name: 'Projects & Work',
      items: [
        { name: 'Projects', path: '/manager/projects', icon: icons.projects, roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.SysAdmin] },
        { name: 'WBS', path: '/manager/wbs', icon: icons.wbs, roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.SysAdmin] },
        { name: 'Templates', path: '/manager/templates', icon: icons.templates },
        { name: 'Facilities', path: '/manager/facilities', icon: icons.facilities, roles: [AppRole.OfficeManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin] },
      ],
    },
    {
      name: 'Administration',
      items: [
        { name: 'Forecast Approvals', path: '/manager/forecast-approvals', icon: icons.forecastApprovals, roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin] },
        { name: 'Staffing Admin', path: '/manager/staffing-admin', icon: icons.staffingAdmin, roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin] },
        { name: 'Reports', path: '/manager/reports', icon: icons.reports, roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.Executive, AppRole.SysAdmin] },
      ],
    },
  ];

  // Filter items based on roles
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.some((role) => hasRole(role))),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner - shows when admin is impersonating a user */}
      <ImpersonationBanner />

      {/* Notification Banner */}
      <NotificationBanner />

      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logo */}
              <div className="ml-4 flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <span className="text-xl font-semibold text-gray-900">myScheduling</span>
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">Manager</span>
                </div>
              </div>
            </div>

            {/* Right side - Actions (Clean 3-item layout) */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search Button */}
              <button
                onClick={searchModal.open}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title="Search (Ctrl+K)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded">
                  <span className="text-xs">Ctrl</span>+K
                </kbd>
              </button>

              {/* Inbox */}
              <Link
                to="/inbox"
                className="relative flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title="Inbox"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 pr-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-700 font-semibold text-sm">
                      {user?.displayName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <svg
                    className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {/* Profile Link */}
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>

                    {/* Portal Switching */}
                    <button
                      onClick={() => { navigate('/'); setUserMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      My Portal
                    </button>

                    {/* Admin Link */}
                    {(hasRole(AppRole.SysAdmin) || hasRole(AppRole.TenantAdmin)) && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Console
                      </Link>
                    )}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white shadow-sm transition-all duration-300 overflow-hidden min-h-[calc(100vh-4rem)] sticky top-16`}
        >
          <nav className="mt-4 px-3 pb-24 space-y-6 overflow-y-auto h-full">
            {filteredGroups.map((group) => (
              <div key={group.name}>
                <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.name}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        } group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition`}
                      >
                        <span className={isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}>
                          {item.icon}
                        </span>
                        <span className="ml-3">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 mb-2">Your Roles</p>
            <div className="flex flex-wrap gap-1">
              {currentWorkspace?.roles?.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />
    </div>
  );
}

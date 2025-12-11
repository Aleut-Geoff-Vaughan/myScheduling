import { Link, useLocation } from 'react-router-dom';
import { useModule } from '../../hooks/useModule';
import { useInbox } from '../../hooks/useInbox';
import { useAuthStore } from '../../stores/authStore';
import { AssignmentRequestStatus } from '../../types/api';

/**
 * MobileBottomTabs - Fixed bottom navigation bar for mobile devices
 *
 * Shows 5 tab items:
 * 1. Home - Current module dashboard
 * 2. Primary action (context-aware)
 * 3. Inbox with badge
 * 4. Search
 * 5. More (opens full navigation)
 */
interface MobileBottomTabsProps {
  onMoreClick: () => void;
  onSearchClick: () => void;
}

export function MobileBottomTabs({ onMoreClick, onSearchClick }: MobileBottomTabsProps) {
  const location = useLocation();
  const { currentModule, moduleConfig } = useModule();
  const { currentWorkspace } = useAuthStore();

  // Get inbox count for badge
  const { data: inbox = [] } = useInbox(
    currentWorkspace?.tenantId
      ? { tenantId: currentWorkspace.tenantId, status: AssignmentRequestStatus.Pending }
      : undefined
  );
  const inboxCount = inbox.filter((i) => i.status === AssignmentRequestStatus.Pending).length;

  // Context-aware tabs based on current module
  const tabs = getTabsForModule(currentModule, moduleConfig.basePath, inboxCount);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-area-bottom z-40">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          if (tab.type === 'action') {
            return (
              <button
                key={tab.id}
                onClick={tab.id === 'more' ? onMoreClick : onSearchClick}
                className="flex flex-col items-center justify-center flex-1 h-full py-2 text-gray-500 hover:text-gray-700"
              >
                {tab.icon}
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            );
          }

          const isActive = tab.path === location.pathname ||
            (tab.exactMatch !== true && tab.path !== '/' && location.pathname.startsWith(tab.path));

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-2 relative
                ${isActive ? getActiveColorClass(currentModule) : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 ${getActiveBarClass(currentModule)}`} />
              )}
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-1 right-1/4 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}

interface TabItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  exactMatch?: boolean;
  type?: 'link' | 'action';
}

function getTabsForModule(module: string, basePath: string, inboxCount: number): TabItem[] {
  const commonTabs: TabItem[] = [
    {
      id: 'search',
      label: 'Search',
      path: '#search',
      type: 'action',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'more',
      label: 'More',
      path: '#more',
      type: 'action',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  switch (module) {
    case 'work':
      return [
        {
          id: 'home',
          label: 'Home',
          path: '/work',
          exactMatch: true,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          ),
        },
        {
          id: 'schedule',
          label: 'Schedule',
          path: '/work/schedule',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          ),
        },
        {
          id: 'inbox',
          label: 'Inbox',
          path: '/work/assignments',
          badge: inboxCount,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
            </svg>
          ),
        },
        ...commonTabs,
      ];

    case 'forecast':
      return [
        {
          id: 'home',
          label: 'Home',
          path: '/forecast',
          exactMatch: true,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          ),
        },
        {
          id: 'forecasts',
          label: 'Forecasts',
          path: '/forecast/my-forecasts',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3.75m3-6v6.75m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
        },
        {
          id: 'projects',
          label: 'Projects',
          path: '/forecast/projects',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          ),
        },
        ...commonTabs,
      ];

    case 'facilities':
      return [
        {
          id: 'home',
          label: 'Home',
          path: '/facilities',
          exactMatch: true,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          ),
        },
        {
          id: 'book',
          label: 'Book',
          path: '/facilities/book',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M12 12.75v3.75m0 0v-3.75m0 3.75h3.75m-3.75 0H8.25" />
            </svg>
          ),
        },
        {
          id: 'checkin',
          label: 'Check In',
          path: '/facilities/check-in',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            </svg>
          ),
        },
        ...commonTabs,
      ];

    default:
      return [
        {
          id: 'home',
          label: 'Home',
          path: basePath,
          exactMatch: true,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          ),
        },
        ...commonTabs,
      ];
  }
}

function getActiveColorClass(module: string): string {
  switch (module) {
    case 'work':
      return 'text-blue-600';
    case 'forecast':
      return 'text-emerald-600';
    case 'facilities':
      return 'text-teal-600';
    default:
      return 'text-blue-600';
  }
}

function getActiveBarClass(module: string): string {
  switch (module) {
    case 'work':
      return 'bg-blue-600';
    case 'forecast':
      return 'bg-emerald-600';
    case 'facilities':
      return 'bg-teal-600';
    default:
      return 'bg-blue-600';
  }
}

export default MobileBottomTabs;

import { Link, useLocation } from 'react-router-dom';
import { useModule } from '../../hooks/useModule';
import { getNavIcon } from './NavIcons';
import type { NavigationSection } from '../../config/modules';
import { useInbox } from '../../hooks/useInbox';
import { useAuthStore } from '../../stores/authStore';
import { AssignmentRequestStatus } from '../../types/api';

interface SidebarNavItemProps {
  item: {
    id: string;
    name: string;
    path: string;
    icon: string;
    badge?: 'inbox' | 'assignments';
    desktopOnly?: boolean;
  };
  isActive: boolean;
  colorName: string;
}

function SidebarNavItem({ item, isActive, colorName }: SidebarNavItemProps) {
  const { currentWorkspace } = useAuthStore();

  // Get inbox count for badge
  const { data: inbox = [] } = useInbox(
    item.badge === 'assignments' && currentWorkspace?.tenantId
      ? { tenantId: currentWorkspace.tenantId, status: AssignmentRequestStatus.Pending }
      : undefined
  );
  const badgeCount = item.badge === 'assignments'
    ? inbox.filter((i) => i.status === AssignmentRequestStatus.Pending).length
    : 0;

  // Dynamic color classes based on module
  const activeClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-r-2 border-blue-600',
    emerald: 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600',
    teal: 'bg-teal-50 text-teal-700 border-r-2 border-teal-600',
    violet: 'bg-violet-50 text-violet-700 border-r-2 border-violet-600',
  };

  const iconActiveClasses: Record<string, string> = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    teal: 'text-teal-600',
    violet: 'text-violet-600',
  };

  return (
    <Link
      to={item.path}
      className={`
        group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150
        ${isActive
          ? activeClasses[colorName] || activeClasses.blue
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-r-2 border-transparent'
        }
        ${item.desktopOnly ? 'hidden lg:flex' : 'flex'}
      `}
    >
      <span className={isActive ? (iconActiveClasses[colorName] || iconActiveClasses.blue) : 'text-gray-400 group-hover:text-gray-600'}>
        {getNavIcon(item.icon)}
      </span>
      <span className="flex-1 truncate">{item.name}</span>
      {badgeCount > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-white bg-red-500 rounded-full">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      {item.desktopOnly && (
        <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 rounded">
          Desktop
        </span>
      )}
    </Link>
  );
}

interface SidebarSectionProps {
  section: NavigationSection;
  currentPath: string;
  colorName: string;
}

function SidebarSection({ section, currentPath, colorName }: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      {section.name && (
        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {section.name}
        </h3>
      )}
      {section.items.map((item) => {
        const isActive = currentPath === item.path ||
          (item.path !== '/' && currentPath.startsWith(item.path + '/'));

        return (
          <SidebarNavItem
            key={item.id}
            item={item}
            isActive={isActive}
            colorName={colorName}
          />
        );
      })}
    </div>
  );
}

interface ContextSidebarProps {
  collapsed?: boolean;
}

export function ContextSidebar({ collapsed = false }: ContextSidebarProps) {
  const location = useLocation();
  const { moduleConfig, filteredNavigation } = useModule();

  if (collapsed) {
    return null;
  }

  return (
    <aside className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Module title */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {moduleConfig.name}
        </h2>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {filteredNavigation.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            currentPath={location.pathname}
            colorName={moduleConfig.color.name}
          />
        ))}
      </nav>

      {/* Footer with workspace info */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <WorkspaceInfo />
      </div>
    </aside>
  );
}

function WorkspaceInfo() {
  const { currentWorkspace } = useAuthStore();

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Workspace
      </p>
      <p className="text-sm font-medium text-gray-900 truncate">
        {currentWorkspace.tenantName}
      </p>
      {currentWorkspace.roles && currentWorkspace.roles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {currentWorkspace.roles.slice(0, 3).map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded"
            >
              {role}
            </span>
          ))}
          {currentWorkspace.roles.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-400">
              +{currentWorkspace.roles.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ContextSidebar;

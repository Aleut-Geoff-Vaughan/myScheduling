import { useModule, useModuleAccess } from '../../hooks/useModule';
import { moduleColors } from '../../config/modules';
import type { ModuleId, ModuleColor } from '../../config/modules';

// Icon components for the module rail
const Icons = {
  work: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  forecast: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  facilities: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  admin: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  profile: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

interface ModuleButtonProps {
  moduleId: ModuleId;
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  color: ModuleColor;
  expanded: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ModuleButton({ moduleId: _, isActive, onClick, label, icon, color, expanded }: ModuleButtonProps) {
  // Dynamic classes based on module color
  const activeClasses = isActive
    ? `bg-${color.name}-50 text-${color.name}-600 border-l-4 border-${color.name}-600`
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-l-4 border-transparent';

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-3 transition-all duration-200
        ${activeClasses}
        ${expanded ? 'justify-start' : 'justify-center'}
      `}
      title={!expanded ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {expanded && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </button>
  );
}

interface ModuleRailProps {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ModuleRail({ expanded = false, onExpandedChange }: ModuleRailProps) {
  const { currentModule, navigateToModule, openAdmin, isAdminOpen } = useModule();
  const { hasForecastAccess, hasAdminAccess } = useModuleAccess();

  const handleMouseEnter = () => {
    if (onExpandedChange) {
      onExpandedChange(true);
    }
  };

  const handleMouseLeave = () => {
    if (onExpandedChange) {
      onExpandedChange(false);
    }
  };

  return (
    <div
      className={`
        flex flex-col bg-white border-r border-gray-200 h-full
        transition-all duration-200 ease-in-out
        ${expanded ? 'w-48' : 'w-16'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo area */}
      <div className={`flex items-center h-16 border-b border-gray-200 ${expanded ? 'px-4' : 'justify-center'}`}>
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {expanded && (
          <span className="ml-3 text-lg font-semibold text-gray-900 truncate">myScheduling</span>
        )}
      </div>

      {/* Module navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {/* myWork */}
        <ModuleButton
          moduleId="work"
          isActive={currentModule === 'work' && !isAdminOpen}
          onClick={() => navigateToModule('work')}
          label="myWork"
          icon={Icons.work}
          color={moduleColors.work}
          expanded={expanded}
        />

        {/* myForecast - conditional on role */}
        {hasForecastAccess && (
          <ModuleButton
            moduleId="forecast"
            isActive={currentModule === 'forecast' && !isAdminOpen}
            onClick={() => navigateToModule('forecast')}
            label="myForecast"
            icon={Icons.forecast}
            color={moduleColors.forecast}
            expanded={expanded}
          />
        )}

        {/* myFacilities */}
        <ModuleButton
          moduleId="facilities"
          isActive={currentModule === 'facilities' && !isAdminOpen}
          onClick={() => navigateToModule('facilities')}
          label="myFacilities"
          icon={Icons.facilities}
          color={moduleColors.facilities}
          expanded={expanded}
        />
      </nav>

      {/* Bottom section - Admin & Profile */}
      <div className="py-4 border-t border-gray-200 space-y-1">
        {/* Admin - conditional on role */}
        {hasAdminAccess && (
          <button
            onClick={openAdmin}
            className={`
              w-full flex items-center gap-3 px-3 py-3 transition-all duration-200
              ${isAdminOpen
                ? 'bg-violet-50 text-violet-600 border-l-4 border-violet-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-l-4 border-transparent'
              }
              ${expanded ? 'justify-start' : 'justify-center'}
            `}
            title={!expanded ? 'Administration' : undefined}
          >
            <span className="flex-shrink-0">{Icons.admin}</span>
            {expanded && (
              <span className="text-sm font-medium truncate">Admin</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ModuleRail;

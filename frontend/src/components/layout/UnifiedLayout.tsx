import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleProvider } from '../../contexts/ModuleContext';
import { ModuleRail, ContextSidebar, GlobalTopBar, MobileBottomTabs } from '../navigation';
import { NotificationBanner } from '../NotificationBanner';
import { ImpersonationBanner } from '../ImpersonationBanner';
import { SearchModal, useSearchModal } from '../SearchModal';

/**
 * UnifiedLayout - The main layout shell for the entire application
 *
 * Structure:
 * - ImpersonationBanner (top, conditional)
 * - NotificationBanner (top, conditional)
 * - Main container with:
 *   - ModuleRail (left edge, 60px collapsed / 200px expanded)
 *   - ContextSidebar (left, 240px)
 *   - Main content area with GlobalTopBar
 */
function UnifiedLayoutInner() {
  const [railExpanded, setRailExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const searchModal = useSearchModal();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      {/* Impersonation Banner - shows when admin is impersonating a user */}
      <ImpersonationBanner />

      {/* Notification Banner */}
      <NotificationBanner />

      {/* Main layout container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module Rail - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex flex-shrink-0">
          <ModuleRail
            expanded={railExpanded}
            onExpandedChange={setRailExpanded}
          />
        </div>

        {/* Context Sidebar - Hidden on mobile by default */}
        <div className="hidden lg:flex flex-shrink-0">
          <ContextSidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            />

            {/* Sidebar Panel */}
            <div className="relative flex w-full max-w-xs flex-col bg-white shadow-xl">
              {/* Close button */}
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile sidebar content */}
              <div className="flex flex-col h-full">
                {/* Module Rail in mobile sidebar */}
                <div className="border-b border-gray-200">
                  <MobileModuleSelector onClose={() => setMobileSidebarOpen(false)} />
                </div>

                {/* Context Sidebar */}
                <div className="flex-1 overflow-y-auto">
                  <ContextSidebar />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar */}
          <GlobalTopBar onMenuClick={() => setMobileSidebarOpen(true)} />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tabs */}
      <MobileBottomTabs
        onMoreClick={() => setMobileSidebarOpen(true)}
        onSearchClick={searchModal.open}
      />

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />
    </div>
  );
}

/**
 * Mobile Module Selector - Simplified module switcher for mobile drawer
 */
function MobileModuleSelector({ onClose }: { onClose: () => void }) {
  const modules = [
    { id: 'work', name: 'myWork', path: '/work', color: 'blue' },
    { id: 'forecast', name: 'myForecast', path: '/forecast', color: 'emerald' },
    { id: 'facilities', name: 'myFacilities', path: '/facilities', color: 'teal' },
  ];

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Modules
      </p>
      <div className="space-y-1">
        {modules.map((module) => (
          <a
            key={module.id}
            href={module.path}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <span className={`w-2 h-2 rounded-full bg-${module.color}-500`} />
            {module.name}
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * UnifiedLayout - Wrapper that provides the ModuleProvider context
 */
export function UnifiedLayout() {
  return (
    <ModuleProvider>
      <UnifiedLayoutInner />
    </ModuleProvider>
  );
}

export default UnifiedLayout;

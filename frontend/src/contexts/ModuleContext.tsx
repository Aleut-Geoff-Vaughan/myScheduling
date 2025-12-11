import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  modules,
  getModuleFromPath,
  isAdminPath,
  filterNavigationByRoles,
  adminNavigation,
} from '../config/modules';
import type { ModuleId, ModuleConfig, NavigationSection } from '../config/modules';
import { useAuthStore, AppRole } from '../stores/authStore';

interface ModuleContextValue {
  // Current module state
  currentModule: ModuleId;
  moduleConfig: ModuleConfig;
  filteredNavigation: NavigationSection[];

  // Admin overlay state
  isAdminOpen: boolean;
  adminNavigation: NavigationSection[];
  previousPath: string | null;

  // Sidebar state
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // For mobile drawer

  // Actions
  setCurrentModule: (module: ModuleId) => void;
  openAdmin: () => void;
  closeAdmin: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;
  navigateToModule: (module: ModuleId) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

interface ModuleProviderProps {
  children: React.ReactNode;
}

export function ModuleProvider({ children }: ModuleProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();

  // Determine current module from path
  const [currentModule, setCurrentModuleState] = useState<ModuleId>(() => {
    return getModuleFromPath(location.pathname) || 'work';
  });

  // Admin overlay state
  const [isAdminOpen, setIsAdminOpen] = useState(() => isAdminPath(location.pathname));
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update current module when path changes
  useEffect(() => {
    const moduleFromPath = getModuleFromPath(location.pathname);
    if (moduleFromPath && moduleFromPath !== currentModule) {
      setCurrentModuleState(moduleFromPath);
    }

    // Handle admin path
    if (isAdminPath(location.pathname) && !isAdminOpen) {
      setIsAdminOpen(true);
    }
  }, [location.pathname, currentModule, isAdminOpen]);

  // Get current module config
  const moduleConfig = modules[currentModule];

  // Filter navigation based on user roles
  const filteredNavigation = filterNavigationByRoles(
    moduleConfig.sections,
    hasRole
  );

  // Filter admin navigation based on user roles
  const filteredAdminNavigation = filterNavigationByRoles(
    adminNavigation,
    hasRole
  );

  // Set current module
  const setCurrentModule = useCallback((module: ModuleId) => {
    setCurrentModuleState(module);
  }, []);

  // Open admin overlay
  const openAdmin = useCallback(() => {
    if (!isAdminOpen) {
      setPreviousPath(location.pathname);
      setIsAdminOpen(true);
      navigate('/admin/users');
    }
  }, [isAdminOpen, location.pathname, navigate]);

  // Close admin overlay
  const closeAdmin = useCallback(() => {
    setIsAdminOpen(false);
    if (previousPath && !isAdminPath(previousPath)) {
      navigate(previousPath);
    } else {
      navigate(`/${currentModule === 'work' ? 'work' : currentModule}`);
    }
    setPreviousPath(null);
  }, [previousPath, currentModule, navigate]);

  // Toggle sidebar collapsed state
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Navigate to a module
  const navigateToModule = useCallback((module: ModuleId) => {
    setCurrentModuleState(module);
    const targetModule = modules[module];
    navigate(targetModule.basePath);
    // Close mobile sidebar when navigating
    setSidebarOpen(false);
  }, [navigate]);

  const value: ModuleContextValue = {
    currentModule,
    moduleConfig,
    filteredNavigation,
    isAdminOpen,
    adminNavigation: filteredAdminNavigation,
    previousPath,
    sidebarCollapsed,
    sidebarOpen,
    setCurrentModule,
    openAdmin,
    closeAdmin,
    toggleSidebarCollapsed,
    setSidebarOpen,
    navigateToModule,
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule(): ModuleContextValue {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}

// Hook for checking if user has access to a module
export function useModuleAccess() {
  const { hasRole } = useAuthStore();

  const hasWorkAccess = true; // All users have access to myWork

  const hasForecastAccess = hasRole(AppRole.ResourceManager) ||
    hasRole(AppRole.ProjectManager) ||
    hasRole(AppRole.TenantAdmin) ||
    hasRole(AppRole.SysAdmin) ||
    hasRole(AppRole.Executive);

  const hasFacilitiesAccess = true; // All users have access to myFacilities

  const hasAdminAccess = hasRole(AppRole.TenantAdmin) || hasRole(AppRole.SysAdmin);

  return {
    hasWorkAccess,
    hasForecastAccess,
    hasFacilitiesAccess,
    hasAdminAccess,
  };
}

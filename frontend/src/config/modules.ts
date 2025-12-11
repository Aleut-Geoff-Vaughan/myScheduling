import { AppRole } from '../stores/authStore';

// Module color type
export interface ModuleColor {
  primary: string;
  light: string;
  hover: string;
  text: string;
  name: string;
}

// Module color configurations
export const moduleColors: Record<string, ModuleColor> = {
  work: {
    primary: '#2563eb',    // blue-600
    light: '#eff6ff',      // blue-50
    hover: '#1d4ed8',      // blue-700
    text: '#1e40af',       // blue-800
    name: 'blue',
  },
  forecast: {
    primary: '#059669',    // emerald-600
    light: '#ecfdf5',      // emerald-50
    hover: '#047857',      // emerald-700
    text: '#065f46',       // emerald-800
    name: 'emerald',
  },
  facilities: {
    primary: '#0d9488',    // teal-600
    light: '#f0fdfa',      // teal-50
    hover: '#0f766e',      // teal-700
    text: '#115e59',       // teal-800
    name: 'teal',
  },
  admin: {
    primary: '#7c3aed',    // violet-600
    light: '#f5f3ff',      // violet-50
    hover: '#6d28d9',      // violet-700
    text: '#5b21b6',       // violet-800
    name: 'violet',
  },
};

export type ModuleId = 'work' | 'forecast' | 'facilities';

// Navigation item definition
export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string; // Icon name reference
  roles?: AppRole[];
  badge?: 'inbox' | 'assignments'; // Dynamic badge type
  desktopOnly?: boolean;
}

// Navigation section definition
export interface NavigationSection {
  id: string;
  name: string;
  roles?: AppRole[];
  items: NavigationItem[];
}

// Module configuration
export interface ModuleConfig {
  id: ModuleId;
  name: string;
  shortName: string;
  icon: string;
  basePath: string;
  color: typeof moduleColors.work;
  sections: NavigationSection[];
}

// myWork Module Configuration
export const workModule: ModuleConfig = {
  id: 'work',
  name: 'myWork',
  shortName: 'Work',
  icon: 'home',
  basePath: '/work',
  color: moduleColors.work,
  sections: [
    {
      id: 'dashboard',
      name: '',
      items: [
        { id: 'dashboard', name: 'Dashboard', path: '/work', icon: 'dashboard' },
      ],
    },
    {
      id: 'my-work',
      name: 'My Work',
      items: [
        { id: 'schedule', name: 'Schedule', path: '/work/schedule', icon: 'calendar' },
        { id: 'staffing', name: 'Staffing Plan', path: '/work/staffing', icon: 'users' },
        { id: 'assignments', name: 'Assignments', path: '/work/assignments', icon: 'inbox', badge: 'assignments' },
        { id: 'resumes', name: 'Resumes', path: '/work/resumes', icon: 'document' },
        { id: 'doa', name: 'DOA Letters', path: '/work/doa', icon: 'certificate' },
      ],
    },
    {
      id: 'team',
      name: 'Team',
      roles: [AppRole.TeamLead, AppRole.ProjectManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin, AppRole.Executive],
      items: [
        { id: 'team-people', name: 'People', path: '/work/team/people', icon: 'users-group' },
        { id: 'team-staffing', name: 'Team Staffing', path: '/work/team/staffing', icon: 'chart-bar' },
        { id: 'team-calendar', name: 'Team Calendar', path: '/work/team/calendar', icon: 'calendar-days' },
        { id: 'team-resumes', name: 'Team Resumes', path: '/work/team/resumes', icon: 'documents', roles: [AppRole.TeamLead, AppRole.ProjectManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin] },
      ],
    },
    {
      id: 'projects',
      name: 'Projects',
      roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'projects', name: 'All Projects', path: '/work/projects', icon: 'folder' },
        { id: 'wbs', name: 'WBS Elements', path: '/work/wbs', icon: 'list-tree' },
      ],
    },
    {
      id: 'reports',
      name: 'Reports',
      roles: [AppRole.ProjectManager, AppRole.ResourceManager, AppRole.Executive, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'reports', name: 'Staffing Reports', path: '/work/reports', icon: 'chart-pie' },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'staffing-admin', name: 'Staffing Admin', path: '/work/settings/staffing', icon: 'cog' },
        { id: 'certifications', name: 'Certifications', path: '/work/settings/certifications', icon: 'badge-check' },
      ],
    },
  ],
};

// myForecast Module Configuration
export const forecastModule: ModuleConfig = {
  id: 'forecast',
  name: 'myForecast',
  shortName: 'Forecast',
  icon: 'chart-line',
  basePath: '/forecast',
  color: moduleColors.forecast,
  sections: [
    {
      id: 'dashboard',
      name: '',
      items: [
        { id: 'dashboard', name: 'Dashboard', path: '/forecast', icon: 'dashboard' },
      ],
    },
    {
      id: 'planning',
      name: 'Planning',
      items: [
        { id: 'my-forecasts', name: 'My Forecasts', path: '/forecast/my-forecasts', icon: 'document-chart' },
        { id: 'projects', name: 'Project Forecasts', path: '/forecast/projects', icon: 'folder-chart' },
        { id: 'schedules', name: 'Schedules', path: '/forecast/schedules', icon: 'calendar-clock', roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin] },
      ],
    },
    {
      id: 'financials',
      name: 'Financials',
      roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin, AppRole.Executive],
      items: [
        { id: 'budgets', name: 'Budgets', path: '/forecast/budgets', icon: 'currency-dollar', desktopOnly: true },
        { id: 'cost-rates', name: 'Cost Rates', path: '/forecast/cost-rates', icon: 'calculator' },
        { id: 'non-labor', name: 'Non-Labor Costs', path: '/forecast/non-labor', icon: 'receipt' },
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin, AppRole.Executive],
      items: [
        { id: 'staffing-dashboard', name: 'Staffing Dashboard', path: '/forecast/staffing-dashboard', icon: 'presentation-chart' },
        { id: 'analytics', name: 'Analytics', path: '/forecast/analytics', icon: 'chart-bar-square' },
        { id: 'versions', name: 'Versions', path: '/forecast/versions', icon: 'clock-history' },
      ],
    },
    {
      id: 'workflow',
      name: 'Workflow',
      roles: [AppRole.ResourceManager, AppRole.Executive, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'review', name: 'Review Queue', path: '/forecast/review', icon: 'clipboard-check', desktopOnly: true },
        { id: 'approvals', name: 'Approvals', path: '/forecast/approvals', icon: 'check-badge', desktopOnly: true },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      roles: [AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'cost-types', name: 'Cost Types', path: '/forecast/settings', icon: 'adjustments' },
        { id: 'import-export', name: 'Import/Export', path: '/forecast/import-export', icon: 'arrows-up-down', desktopOnly: true },
      ],
    },
  ],
};

// myFacilities Module Configuration
export const facilitiesModule: ModuleConfig = {
  id: 'facilities',
  name: 'myFacilities',
  shortName: 'Facilities',
  icon: 'building-office',
  basePath: '/facilities',
  color: moduleColors.facilities,
  sections: [
    {
      id: 'dashboard',
      name: '',
      items: [
        { id: 'dashboard', name: 'Dashboard', path: '/facilities', icon: 'dashboard' },
      ],
    },
    {
      id: 'hoteling',
      name: 'Hoteling',
      items: [
        { id: 'book', name: 'Book Space', path: '/facilities/book', icon: 'calendar-plus' },
        { id: 'checkin', name: 'Check-in', path: '/facilities/check-in', icon: 'qr-code' },
        { id: 'whos-here', name: "Who's Here", path: '/facilities/whos-here', icon: 'map-pin' },
      ],
    },
    {
      id: 'offices',
      name: 'Offices',
      items: [
        { id: 'directory', name: 'Directory', path: '/facilities/offices', icon: 'building-library' },
        { id: 'travel-guides', name: 'Travel Guides', path: '/facilities/travel-guides', icon: 'map' },
        { id: 'announcements', name: 'Announcements', path: '/facilities/announcements', icon: 'megaphone' },
      ],
    },
    {
      id: 'management',
      name: 'Management',
      roles: [AppRole.OfficeManager, AppRole.ResourceManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'leases', name: 'Leases', path: '/facilities/leases', icon: 'document-text' },
        { id: 'option-years', name: 'Option Years', path: '/facilities/option-years', icon: 'calendar-range', desktopOnly: true },
        { id: 'field-assignments', name: 'Field Assignments', path: '/facilities/field-assignments', icon: 'briefcase' },
        { id: 'client-sites', name: 'Client Sites', path: '/facilities/client-sites', icon: 'building-storefront' },
      ],
    },
    {
      id: 'security',
      name: 'Security',
      roles: [AppRole.OfficeManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'clearances', name: 'Clearances', path: '/facilities/clearances', icon: 'shield-check', desktopOnly: true },
        { id: 'foreign-travel', name: 'Foreign Travel', path: '/facilities/foreign-travel', icon: 'globe', desktopOnly: true },
        { id: 'scif-access', name: 'SCIF Access', path: '/facilities/scif-access', icon: 'lock-closed', desktopOnly: true },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      roles: [AppRole.OfficeManager, AppRole.TenantAdmin, AppRole.SysAdmin],
      items: [
        { id: 'facilities-admin', name: 'Manage Facilities', path: '/facilities/admin', icon: 'cog' },
        { id: 'analytics', name: 'Usage Analytics', path: '/facilities/analytics', icon: 'chart-bar' },
      ],
    },
  ],
};

// Admin navigation configuration (for overlay)
export const adminNavigation: NavigationSection[] = [
  {
    id: 'identity',
    name: 'Identity',
    items: [
      { id: 'users', name: 'Users', path: '/admin/users', icon: 'users' },
      { id: 'groups', name: 'Groups', path: '/admin/groups', icon: 'user-group' },
      { id: 'invitations', name: 'Invitations', path: '/admin/invitations', icon: 'envelope' },
    ],
  },
  {
    id: 'organization',
    name: 'Organization',
    items: [
      { id: 'tenants', name: 'Tenants', path: '/admin/tenants', icon: 'building-office-2', roles: [AppRole.SysAdmin] },
      { id: 'career-families', name: 'Career Families', path: '/admin/career-families', icon: 'academic-cap' },
    ],
  },
  {
    id: 'templates',
    name: 'Templates',
    items: [
      { id: 'resume-templates', name: 'Resume Templates', path: '/admin/resume-templates', icon: 'document-duplicate' },
      { id: 'doa-templates', name: 'DOA Templates', path: '/admin/doa-templates', icon: 'clipboard-document' },
    ],
  },
  {
    id: 'configuration',
    name: 'Configuration',
    items: [
      { id: 'holidays', name: 'Holidays', path: '/admin/holidays', icon: 'calendar' },
      { id: 'team-calendars', name: 'Team Calendars', path: '/admin/team-calendars', icon: 'calendar-days' },
      { id: 'tenant-settings', name: 'Tenant Settings', path: '/admin/tenant-settings', icon: 'adjustments-horizontal' },
    ],
  },
  {
    id: 'system',
    name: 'System',
    roles: [AppRole.SysAdmin],
    items: [
      { id: 'logins', name: 'Login Reports', path: '/admin/logins', icon: 'clipboard-document-list' },
      { id: 'impersonation', name: 'Impersonation', path: '/admin/impersonation', icon: 'identification' },
      { id: 'email-test', name: 'Email Test', path: '/admin/email-test', icon: 'envelope-open' },
    ],
  },
];

// All modules configuration
export const modules: Record<ModuleId, ModuleConfig> = {
  work: workModule,
  forecast: forecastModule,
  facilities: facilitiesModule,
};

// Helper to get module from path
export function getModuleFromPath(pathname: string): ModuleId | null {
  if (pathname.startsWith('/work') || pathname === '/') {
    return 'work';
  }
  if (pathname.startsWith('/forecast')) {
    return 'forecast';
  }
  if (pathname.startsWith('/facilities')) {
    return 'facilities';
  }
  return null;
}

// Helper to check if path is admin
export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

// Helper to filter navigation by roles
export function filterNavigationByRoles(
  sections: NavigationSection[],
  hasRole: (role: AppRole) => boolean
): NavigationSection[] {
  return sections
    .filter((section) => {
      // If section has role requirements, check them
      if (section.roles && section.roles.length > 0) {
        return section.roles.some((role) => hasRole(role));
      }
      return true;
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If item has role requirements, check them
        if (item.roles && item.roles.length > 0) {
          return item.roles.some((role) => hasRole(role));
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

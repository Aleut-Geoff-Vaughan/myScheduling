/* eslint-disable react-refresh/only-export-components */
import { AppRole } from '../types/api';

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  roles: AppRole[];
  icon: string;
}

export const roleTemplates: RoleTemplate[] = [
  {
    id: 'employee',
    name: 'Employee',
    description: 'Standard access for employees - manage own profile and bookings',
    roles: [AppRole.Employee],
    icon: '👤',
  },
  {
    id: 'view-only',
    name: 'View Only',
    description: 'Read-only access to tenant data',
    roles: [AppRole.ViewOnly],
    icon: '👁️',
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    description: 'Team lead with employee access - view team data and manage assignments',
    roles: [AppRole.Employee, AppRole.TeamLead],
    icon: '👥',
  },
  {
    id: 'project-manager',
    name: 'Project Manager',
    description: 'Manage projects, WBS elements, assignments, and employee functions',
    roles: [AppRole.Employee, AppRole.ProjectManager],
    icon: '📊',
  },
  {
    id: 'resource-manager',
    name: 'Resource Manager',
    description: 'Manage people, skills, resource allocation, and employee functions',
    roles: [AppRole.Employee, AppRole.ResourceManager],
    icon: '🔧',
  },
  {
    id: 'office-manager',
    name: 'Office Manager',
    description: 'Manage offices, spaces, hoteling, and employee functions',
    roles: [AppRole.Employee, AppRole.OfficeManager],
    icon: '🏢',
  },
  {
    id: 'department-manager',
    name: 'Department Manager',
    description: 'Full management access - projects, resources, and team oversight',
    roles: [AppRole.Employee, AppRole.ProjectManager, AppRole.ResourceManager, AppRole.TeamLead],
    icon: '💼',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Executive access - view all data, approve overrides, access executive reports',
    roles: [AppRole.Employee, AppRole.Executive, AppRole.OverrideApprover],
    icon: '⭐',
  },
  {
    id: 'tenant-admin',
    name: 'Tenant Admin',
    description: 'Full administrative access within the tenant',
    roles: [AppRole.Employee, AppRole.TenantAdmin],
    icon: '👑',
  },
];

interface RoleTemplatesProps {
  onSelectTemplate: (roles: AppRole[]) => void;
  disabled?: boolean;
  showSystemRoles?: boolean;
}

export function RoleTemplates({ onSelectTemplate, disabled = false, showSystemRoles = false }: RoleTemplatesProps) {
  const filteredTemplates = showSystemRoles
    ? roleTemplates
    : roleTemplates;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">Quick Templates:</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template.roles)}
            disabled={disabled}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              disabled
                ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">
                  {template.name}
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {template.description}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {getRoleShortLabel(role)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getRoleShortLabel(role: AppRole): string {
  switch (role) {
    case AppRole.Employee:
      return 'Employee';
    case AppRole.ViewOnly:
      return 'View Only';
    case AppRole.TeamLead:
      return 'Team Lead';
    case AppRole.ProjectManager:
      return 'Proj Mgr';
    case AppRole.ResourceManager:
      return 'Res Mgr';
    case AppRole.OfficeManager:
      return 'Office Mgr';
    case AppRole.TenantAdmin:
      return 'Admin';
    case AppRole.Executive:
      return 'Executive';
    case AppRole.OverrideApprover:
      return 'Approver';
    case AppRole.SystemAdmin:
      return 'Sys Admin';
    case AppRole.Support:
      return 'Support';
    case AppRole.Auditor:
      return 'Auditor';
    default:
      return 'Unknown';
  }
}

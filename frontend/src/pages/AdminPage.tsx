import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal, Select, FormGroup } from '../components/ui';
import { useTenants, useUsers } from '../hooks/useTenants';
import { RoleSelector } from '../components/RoleSelector';
import { RoleTemplates } from '../components/RoleTemplates';
import { InviteUserModal } from '../components/InviteUserModal';
import { PendingInvitations } from '../components/PendingInvitations';
import { useAuthStore } from '../stores/authStore';
import type { Tenant as ApiTenant, User as ApiUser } from '../types/api';
import { TenantStatus, AppRole } from '../types/api';
import { tenantsService, usersService } from '../services/tenantsService';
import { tenantMembershipsService } from '../services/tenantMembershipsService';

type AdminView = 'dashboard' | 'tenants' | 'users' | 'settings';
type AdminScope = 'system' | 'tenant';

interface AdminPageProps {
  viewOverride?: AdminView;
}

export function AdminPage({ viewOverride }: AdminPageProps = {}) {
  const queryClient = useQueryClient();
  const { user, currentWorkspace } = useAuthStore();
  const [selectedView, setSelectedView] = useState<AdminView>(viewOverride || 'dashboard');
  const [adminScope, setAdminScope] = useState<AdminScope>('system');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApiTenant | ApiUser | undefined>();
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<AppRole[]>([]);

  // Update selected view when viewOverride changes
  useEffect(() => {
    if (viewOverride) {
      setSelectedView(viewOverride);
    }
  }, [viewOverride]);

  const [tenantForm, setTenantForm] = useState({
    name: '',
    code: '',
    status: TenantStatus.Active,
  });

  const [userForm, setUserForm] = useState({
    tenantId: '',
    displayName: '',
    email: '',
    azureAdObjectId: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    require2FA: false,
    allowSelfRegistration: false,
    maintenanceMode: false,
    sessionTimeout: 30,
    passwordMinLength: 8,
    failedLoginAttempts: 5,
  });

  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useTenants();
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();

  const createTenantMutation = useMutation({
    mutationFn: (data: Omit<ApiTenant, 'id' | 'createdAt' | 'updatedAt'>) =>
      tenantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowAddModal(false);
      setTenantForm({ name: '', code: '', status: TenantStatus.Active });
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.message || 'Failed to create tenant' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: Omit<ApiUser, 'id' | 'createdAt' | 'updatedAt'>) =>
      usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
      setUserForm({ tenantId: '', displayName: '', email: '', azureAdObjectId: '' });
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.message || 'Failed to create user' });
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ membershipId, roles }: { membershipId: string; roles: AppRole[] }) =>
      tenantMembershipsService.updateRoles(membershipId, { roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingMembershipId(null);
      setEditingRoles([]);
      toast.success('Roles updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update roles');
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) => usersService.deactivate(userId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate user');
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: (userId: string) => usersService.reactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reactivate user');
    },
  });

  const getStatusLabel = (status: TenantStatus): string => {
    switch (status) {
      case TenantStatus.Active:
        return 'Active';
      case TenantStatus.Inactive:
        return 'Inactive';
      case TenantStatus.Suspended:
        return 'Suspended';
      default:
        return 'Unknown';
    }
  };

  const getRoleLabel = (role: AppRole): string => {
    switch (role) {
      case AppRole.Employee:
        return 'Employee';
      case AppRole.ViewOnly:
        return 'View Only';
      case AppRole.TeamLead:
        return 'Team Lead';
      case AppRole.ProjectManager:
        return 'Project Manager';
      case AppRole.ResourceManager:
        return 'Resource Manager';
      case AppRole.OfficeManager:
        return 'Office Manager';
      case AppRole.TenantAdmin:
        return 'Tenant Admin';
      case AppRole.Executive:
        return 'Executive';
      case AppRole.OverrideApprover:
        return 'Override Approver';
      case AppRole.SystemAdmin:
        return 'System Admin';
      case AppRole.Support:
        return 'Support';
      case AppRole.Auditor:
        return 'Auditor';
      default:
        return 'Unknown';
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const startEditingRoles = (membershipId: string, currentRoles: AppRole[]) => {
    setEditingMembershipId(membershipId);
    setEditingRoles(currentRoles);
  };

  const cancelEditingRoles = () => {
    setEditingMembershipId(null);
    setEditingRoles([]);
  };

  const saveRoles = (membershipId: string) => {
    updateRolesMutation.mutate({ membershipId, roles: editingRoles });
  };

  const tenantColumns = [
    {
      key: 'name',
      header: 'Tenant Name',
      render: (tenant: ApiTenant) => (
        <div>
          <div className="font-medium text-gray-900">{tenant.name}</div>
          <div className="text-sm text-gray-500">{tenant.code}</div>
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (tenant: ApiTenant) => (
        <span className="text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (tenant: ApiTenant) => (
        <StatusBadge
          status={getStatusLabel(tenant.status)}
          variant={
            tenant.status === TenantStatus.Active ? 'success' :
            tenant.status === TenantStatus.Suspended ? 'warning' :
            'default'
          }
        />
      )
    }
  ];

  const userColumns = [
    {
      key: 'expand',
      header: '',
      render: (user: ApiUser) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleUserExpanded(user.id);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform ${expandedUserIds.has(user.id) ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )
    },
    {
      key: 'displayName',
      header: 'User',
      render: (user: ApiUser) => (
        <div>
          <div className="font-medium text-gray-900">{user.displayName}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
          {user.jobTitle && (
            <div className="text-xs text-gray-400 mt-0.5">{user.jobTitle}</div>
          )}
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (user: ApiUser) => (
        <div className="text-sm">
          {user.phoneNumber && (
            <div className="text-gray-900">{user.phoneNumber}</div>
          )}
          {user.department && (
            <div className="text-gray-500">{user.department}</div>
          )}
          {!user.phoneNumber && !user.department && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: ApiUser) => (
        <div className="flex flex-col gap-1">
          <div className="text-sm">
            {!user.isActive ? (
              <StatusBadge status="Deactivated" variant="default" />
            ) : user.isSystemAdmin ? (
              <StatusBadge status="System Admin" variant="warning" />
            ) : user.tenantMemberships && user.tenantMemberships.length > 0 ? (
              <StatusBadge status={`${user.tenantMemberships.length} Tenant${user.tenantMemberships.length !== 1 ? 's' : ''}`} variant="success" />
            ) : (
              <StatusBadge status="No Tenants" variant="default" />
            )}
          </div>
          {!user.isActive && user.deactivatedAt && (
            <div className="text-xs text-gray-500">
              {new Date(user.deactivatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (user: ApiUser) => (
        <span className="text-sm">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (user: ApiUser) => (
        <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
      )
    }
  ];

  const filteredTenants = tenants.filter(tenant =>
    tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter users based on admin scope
  const scopeFilteredUsers = adminScope === 'tenant' && currentWorkspace?.tenantId
    ? users.filter(user =>
        user.tenantMemberships?.some(tm =>
          tm.tenantId === currentWorkspace.tenantId && tm.isActive
        )
      )
    : users;

  const filteredUsers = scopeFilteredUsers.filter(user =>
    user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-2">
          Manage tenants, users, and system settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{tenants.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Tenants</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {tenants.filter(t => t.status === TenantStatus.Active).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active Tenants</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{users.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Users</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {users.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Users</div>
          </div>
        </Card>
      </div>

      {/* Scope & View Selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Scope Selector - Only for users view */}
            {selectedView === 'users' && user?.isSystemAdmin && (
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setAdminScope('system')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      adminScope === 'system'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    System Admin (All Tenants)
                  </button>
                  <button
                    onClick={() => setAdminScope('tenant')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      adminScope === 'tenant'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tenant Admin
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1">
              {(selectedView === 'tenants' || selectedView === 'users') && (
                <Input
                  placeholder={`Search ${selectedView}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              )}
            </div>
            {selectedView !== 'settings' && (
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                + Add {selectedView === 'tenants' ? 'Tenant' : 'User'}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Dashboard View */}
      {selectedView === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{users.length}</dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Tenants</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{tenants.length}</dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Tenants</dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {tenants.filter(t => t.status === TenantStatus.Active).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Recent Users" subtitle="Last 5 registered users" />
              <CardBody>
                <div className="space-y-3">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {user.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Tenant Status" subtitle="Distribution by status" />
              <CardBody>
                <div className="space-y-4">
                  {Object.values(TenantStatus).map(status => {
                    const count = tenants.filter(t => t.status === status).length;
                    const percentage = tenants.length > 0 ? (count / tenants.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{status}</span>
                          <span className="text-sm text-gray-500">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              status === TenantStatus.Active ? 'bg-green-500' :
                              status === TenantStatus.Suspended ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Tenants View */}
      {selectedView === 'tenants' && (
        <Card>
          <CardHeader
            title="All Tenants"
            subtitle={`${filteredTenants.length} ${filteredTenants.length === 1 ? 'tenant' : 'tenants'}`}
          />
          <Table
            data={filteredTenants}
            columns={tenantColumns}
            onRowClick={(tenant) => {
              setSelectedItem(tenant);
              setShowDetailModal(true);
            }}
            emptyMessage="No tenants found"
          />
        </Card>
      )}

      {/* Users View */}
      {selectedView === 'users' && (
        <Card>
          <CardHeader
            title="All Users"
            subtitle={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`}
            action={
              <Button onClick={() => setShowInviteModal(true)} variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite User
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {userColumns.map(column => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={userColumns.length} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <>
                      <tr
                        key={user.id}
                        onClick={() => {
                          setSelectedItem(user);
                          setShowDetailModal(true);
                        }}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        {userColumns.map(column => (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                            {column.render(user)}
                          </td>
                        ))}
                      </tr>
                      {expandedUserIds.has(user.id) && (
                        <tr key={`${user.id}-expanded`}>
                          <td colSpan={userColumns.length} className="px-6 py-4 bg-gray-50">
                            <div className="pl-8">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Tenant Memberships
                              </h4>
                              {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
                                <div className="space-y-3">
                                  {user.tenantMemberships.map(membership => {
                                    const isEditing = editingMembershipId === membership.id;
                                    return (
                                      <div
                                        key={membership.id}
                                        className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                              <span className="font-medium text-gray-900">
                                                {membership.tenant?.name || 'Unknown Tenant'}
                                              </span>
                                              <StatusBadge
                                                status={membership.isActive ? 'Active' : 'Inactive'}
                                                variant={membership.isActive ? 'success' : 'default'}
                                              />
                                            </div>
                                            <div className="text-sm text-gray-600 mb-3">
                                              Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                                            </div>

                                            {/* Roles Display/Edit */}
                                            {isEditing ? (
                                              <div className="space-y-4">
                                                {/* Role Templates */}
                                                <div>
                                                  <RoleTemplates
                                                    onSelectTemplate={setEditingRoles}
                                                    disabled={updateRolesMutation.isPending}
                                                  />
                                                </div>

                                                {/* Or divider */}
                                                <div className="relative">
                                                  <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-300"></div>
                                                  </div>
                                                  <div className="relative flex justify-center text-sm">
                                                    <span className="px-2 bg-white text-gray-500">or customize</span>
                                                  </div>
                                                </div>

                                                {/* Manual Role Selector */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Custom Roles
                                                  </label>
                                                  <RoleSelector
                                                    selectedRoles={editingRoles}
                                                    onChange={setEditingRoles}
                                                    disabled={updateRolesMutation.isPending}
                                                  />
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 pt-2 border-t">
                                                  <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => saveRoles(membership.id)}
                                                    disabled={updateRolesMutation.isPending || editingRoles.length === 0}
                                                  >
                                                    {updateRolesMutation.isPending ? 'Saving...' : 'Save'}
                                                  </Button>
                                                  <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={cancelEditingRoles}
                                                    disabled={updateRolesMutation.isPending}
                                                  >
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex flex-wrap gap-2">
                                                {membership.roles && membership.roles.length > 0 ? (
                                                  membership.roles.map(role => (
                                                    <span
                                                      key={role}
                                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                      {getRoleLabel(role)}
                                                    </span>
                                                  ))
                                                ) : (
                                                  <span className="text-xs text-gray-400">No roles assigned</span>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Edit Button */}
                                          {!isEditing && (
                                            <button
                                              onClick={() => startEditingRoles(membership.id, membership.roles || [])}
                                              className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="Edit roles"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No tenant memberships found
                                </p>
                              )}

                              {/* User Actions */}
                              <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  User Actions
                                </h4>
                                <div className="flex gap-3">
                                  {user.isActive && !user.isSystemAdmin ? (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to deactivate ${user.displayName}? This will deactivate all their tenant memberships.`)) {
                                          deactivateUserMutation.mutate(user.id);
                                        }
                                      }}
                                      disabled={deactivateUserMutation.isPending}
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                      </svg>
                                      {deactivateUserMutation.isPending ? 'Deactivating...' : 'Deactivate User'}
                                    </Button>
                                  ) : !user.isActive ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to reactivate ${user.displayName}? Note: You will need to manually reactivate their tenant memberships.`)) {
                                          reactivateUserMutation.mutate(user.id);
                                        }
                                      }}
                                      disabled={reactivateUserMutation.isPending}
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {reactivateUserMutation.isPending ? 'Reactivating...' : 'Reactivate User'}
                                    </Button>
                                  ) : user.isSystemAdmin ? (
                                    <p className="text-sm text-gray-500 italic">
                                      System administrators cannot be deactivated
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pending Invitations - shown in Users view */}
      {selectedView === 'users' && (
        <div className="mt-6">
          <PendingInvitations tenantId={adminScope === 'tenant' ? currentWorkspace?.tenantId : undefined} />
        </div>
      )}

      {/* Settings View */}
      {selectedView === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="System Settings" subtitle="Configure global system options" />
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-500">Send email notifications for system events</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Require Two-Factor Authentication</div>
                    <div className="text-sm text-gray-500">Force all users to enable 2FA</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.require2FA}
                      onChange={(e) => setSettings({ ...settings, require2FA: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Allow Self-Registration</div>
                    <div className="text-sm text-gray-500">Allow new users to register without invitation</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.allowSelfRegistration}
                      onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">Maintenance Mode</div>
                    <div className="text-sm text-gray-500">Disable access for all non-admin users</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Security Settings" subtitle="Configure security and authentication options" />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 0 })}
                    className="w-48"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Minimum Length
                  </label>
                  <Input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 0 })}
                    className="w-48"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Failed Login Attempts Before Lock
                  </label>
                  <Input
                    type="number"
                    value={settings.failedLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, failedLoginAttempts: parseInt(e.target.value) || 0 })}
                    className="w-48"
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="primary"
                  onClick={() => {
                    // TODO: Implement save settings to API
                    console.log('Save settings:', settings);
                    alert('Settings saved successfully!');
                  }}
                >
                  Save Security Settings
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Integration Settings" subtitle="Configure external integrations" />
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Microsoft 365 Integration</div>
                    <div className="text-sm text-gray-500">Sync users and calendar with Microsoft 365</div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // TODO: Open Microsoft 365 configuration modal
                      console.log('Configure Microsoft 365 integration');
                      alert('Microsoft 365 configuration will be available in a future update');
                    }}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Slack Integration</div>
                    <div className="text-sm text-gray-500">Send notifications to Slack channels</div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // TODO: Open Slack configuration modal
                      console.log('Configure Slack integration');
                      alert('Slack configuration will be available in a future update');
                    }}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">API Access</div>
                    <div className="text-sm text-gray-500">Manage API keys and webhooks</div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // TODO: Open API management modal
                      console.log('Manage API access');
                      alert('API management will be available in a future update');
                    }}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Add Tenant/User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormErrors({});
        }}
        title={`Add ${selectedView === 'tenants' ? 'Tenant' : 'User'}`}
        size="lg"
      >
        {formErrors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{formErrors.submit}</p>
          </div>
        )}

        {selectedView === 'tenants' ? (
          <div className="space-y-4">
            <FormGroup columns={1}>
              <Input
                label="Tenant Name"
                value={tenantForm.name}
                onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                error={formErrors.name}
                required
                placeholder="e.g., Acme Corporation"
              />
            </FormGroup>
            <FormGroup columns={2}>
              <Input
                label="Tenant Code"
                value={tenantForm.code}
                onChange={(e) => setTenantForm({ ...tenantForm, code: e.target.value })}
                error={formErrors.code}
                required
                placeholder="e.g., ALEUT"
              />
              <Select
                label="Status"
                value={tenantForm.status.toString()}
                onChange={(e) => setTenantForm({ ...tenantForm, status: parseInt(e.target.value) })}
                options={[
                  { value: TenantStatus.Active.toString(), label: 'Active' },
                  { value: TenantStatus.Inactive.toString(), label: 'Inactive' },
                  { value: TenantStatus.Suspended.toString(), label: 'Suspended' },
                ]}
                required
              />
            </FormGroup>
          </div>
        ) : (
          <div className="space-y-4">
            <FormGroup columns={1}>
              <Select
                label="Tenant"
                value={userForm.tenantId}
                onChange={(e) => setUserForm({ ...userForm, tenantId: e.target.value })}
                error={formErrors.tenantId}
                options={tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }))}
                required
              />
            </FormGroup>
            <FormGroup columns={1}>
              <Input
                label="Display Name"
                value={userForm.displayName}
                onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                error={formErrors.displayName}
                required
                placeholder="e.g., John Doe"
              />
            </FormGroup>
            <FormGroup columns={1}>
              <Input
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                error={formErrors.email}
                required
                placeholder="e.g., john.doe@company.com"
              />
            </FormGroup>
            <FormGroup columns={1}>
              <Input
                label="Azure AD Object ID (Optional)"
                value={userForm.azureAdObjectId}
                onChange={(e) => setUserForm({ ...userForm, azureAdObjectId: e.target.value })}
                placeholder="Azure AD Object ID"
                helper="Leave empty if not using Azure AD"
              />
            </FormGroup>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddModal(false);
              setFormErrors({});
            }}
            disabled={createTenantMutation.isPending || createUserMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setFormErrors({});
              if (selectedView === 'tenants') {
                if (!tenantForm.name.trim() || !tenantForm.code.trim()) {
                  setFormErrors({
                    name: !tenantForm.name.trim() ? 'Name is required' : '',
                    code: !tenantForm.code.trim() ? 'Code is required' : '',
                  });
                  return;
                }
                createTenantMutation.mutate(tenantForm);
              } else {
                if (!userForm.tenantId || !userForm.displayName.trim() || !userForm.email.trim()) {
                  setFormErrors({
                    tenantId: !userForm.tenantId ? 'Tenant is required' : '',
                    displayName: !userForm.displayName.trim() ? 'Display name is required' : '',
                    email: !userForm.email.trim() ? 'Email is required' : '',
                  });
                  return;
                }
                createUserMutation.mutate(userForm);
              }
            }}
            disabled={createTenantMutation.isPending || createUserMutation.isPending}
          >
            {createTenantMutation.isPending || createUserMutation.isPending
              ? 'Creating...'
              : `Create ${selectedView === 'tenants' ? 'Tenant' : 'User'}`}
          </Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(undefined);
        }}
        title={selectedView === 'tenants' ? 'Tenant Details' : 'User Details'}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            {selectedView === 'tenants' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiTenant).id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiTenant).name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiTenant).code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <StatusBadge
                      status={getStatusLabel((selectedItem as ApiTenant).status)}
                      variant={
                        (selectedItem as ApiTenant).status === TenantStatus.Active ? 'success' :
                        (selectedItem as ApiTenant).status === TenantStatus.Suspended ? 'warning' :
                        'default'
                      }
                    />
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date((selectedItem as ApiTenant).createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Updated At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date((selectedItem as ApiTenant).updatedAt).toLocaleString()}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).displayName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).email}</p>
                </div>
                {(selectedItem as ApiUser).phoneNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).phoneNumber}</p>
                  </div>
                )}
                {(selectedItem as ApiUser).jobTitle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Title</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).jobTitle}</p>
                  </div>
                )}
                {(selectedItem as ApiUser).department && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).department}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Admin</label>
                  <p className="mt-1">
                    <StatusBadge
                      status={(selectedItem as ApiUser).isSystemAdmin ? 'Yes' : 'No'}
                      variant={(selectedItem as ApiUser).isSystemAdmin ? 'warning' : 'default'}
                    />
                  </p>
                </div>
                {(selectedItem as ApiUser).lastLoginAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date((selectedItem as ApiUser).lastLoginAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {(selectedItem as ApiUser).entraObjectId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entra Object ID</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).entraObjectId}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date((selectedItem as ApiUser).createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Updated At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date((selectedItem as ApiUser).updatedAt).toLocaleString()}
                  </p>
                </div>

                {/* Tenant Memberships Section */}
                {(selectedItem as ApiUser).tenantMemberships && (selectedItem as ApiUser).tenantMemberships.length > 0 && (
                  <div className="col-span-2 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Tenant Memberships</label>
                    <div className="space-y-3">
                      {(selectedItem as ApiUser).tenantMemberships.map(membership => (
                        <div
                          key={membership.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">
                              {membership.tenant?.name || 'Unknown Tenant'}
                            </span>
                            <StatusBadge
                              status={membership.isActive ? 'Active' : 'Inactive'}
                              variant={membership.isActive ? 'success' : 'default'}
                            />
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 mr-2">Roles:</span>
                            {membership.roles && membership.roles.length > 0 ? (
                              membership.roles.map(role => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {getRoleLabel(role)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">No roles assigned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => {
            setShowDetailModal(false);
            setSelectedItem(undefined);
          }}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}

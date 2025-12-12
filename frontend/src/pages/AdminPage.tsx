import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal, FormGroup, Select } from '../components/ui';
import { useTenants, useUsers } from '../hooks/useTenants';
import { InviteUserModal } from '../components/InviteUserModal';
import { PendingInvitations } from '../components/PendingInvitations';
import { Pagination } from '../components/Pagination';
import { useAuthStore } from '../stores/authStore';
import type { Tenant as ApiTenant } from '../types/api';
import { TenantStatus } from '../types/api';
import { tenantsService } from '../services/tenantsService';

type AdminView = 'dashboard' | 'tenants' | 'users' | 'settings';
type AdminScope = 'system' | 'tenant';

interface AdminPageProps {
  viewOverride?: AdminView;
}

export function AdminPage({ viewOverride }: AdminPageProps = {}) {
  const queryClient = useQueryClient();
  const { user, currentWorkspace } = useAuthStore();
  const [selectedView, setSelectedView] = useState<AdminView>(() => viewOverride || 'dashboard');
  const [adminScope, setAdminScope] = useState<AdminScope>('system');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<ApiTenant | undefined>();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Update selected view when viewOverride changes
  useEffect(() => {
    if (viewOverride) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedView(viewOverride);
    }
  }, [viewOverride]);

  const [tenantForm, setTenantForm] = useState({
    name: '',
    code: '',
    status: TenantStatus.Active,
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

  const { data: tenants = [] } = useTenants();
  const { data: users = [] } = useUsers();

  const createTenantMutation = useMutation({
    mutationFn: (data: Omit<ApiTenant, 'id' | 'createdAt' | 'updatedAt'>) =>
      tenantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowAddModal(false);
      setTenantForm({ name: '', code: '', status: TenantStatus.Active });
    },
    onError: (error: Error) => {
      setFormErrors({ submit: error.message || 'Failed to create tenant' });
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

  const filteredTenants = tenants.filter(tenant =>
    tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter users based on admin scope
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const scopeFilteredUsers = useMemo(() => {
    return adminScope === 'tenant' && currentWorkspace?.tenantId
      ? users.filter(u =>
          u.tenantMemberships?.some(tm =>
            tm.tenantId === currentWorkspace.tenantId && tm.isActive
          )
        )
      : users;
  }, [adminScope, currentWorkspace?.tenantId, users]);

  const filteredUsers = useMemo(() => {
    return scopeFilteredUsers.filter(u =>
      u?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [scopeFilteredUsers, searchTerm]);

  // Paginated users - reset to page 1 when filteredUsers changes
  const { paginatedUsers, totalPages, effectiveCurrentPage } = useMemo(() => {
    const effectivePage = currentPage > Math.ceil(filteredUsers.length / itemsPerPage)
      ? 1
      : currentPage;
    const startIndex = (effectivePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedUsers: filteredUsers.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredUsers.length / itemsPerPage),
      effectiveCurrentPage: effectivePage,
    };
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Sync effectiveCurrentPage back to currentPage when search changes
  useEffect(() => {
    if (effectiveCurrentPage !== currentPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(effectiveCurrentPage);
    }
  }, [effectiveCurrentPage, currentPage]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-2">
          Manage tenants, users, and system settings
        </p>
        {user?.isSystemAdmin && (
          <div className="mt-4 flex gap-3">
            <Button
              variant="primary"
              onClick={() => {
                setSelectedView('tenants');
                setShowAddModal(true);
              }}
            >
              + Add Tenant
            </Button>
            <Button variant="ghost" onClick={() => setSelectedView('tenants')}>
              View Tenants
            </Button>
          </div>
        )}
      </div>

      {/* First-time tenant helper for system admins */}
      {user?.isSystemAdmin && tenants.length === 0 && (
        <Card className="mb-6 border border-dashed border-purple-300 bg-purple-50">
          <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-purple-900">No tenants yet</p>
              <p className="text-sm text-purple-800">
                Create your first tenant to start assigning admins and users.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedView('tenants');
                  setShowAddModal(true);
                }}
              >
                + Add Tenant
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedView('tenants')}
              >
                Go to Tenants
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

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
              {users.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active Users</div>
          </div>
        </Card>
      </div>

      {/* Scope & Search Bar */}
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
            {selectedView === 'tenants' && (
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                + Add Tenant
              </Button>
            )}
            {selectedView === 'users' && (
              <Button variant="primary" onClick={() => setShowInviteModal(true)}>
                + Invite User
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
                  {users.slice(0, 5).map(u => (
                    <Link
                      key={u.id}
                      to={`/admin/users/${u.id}`}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {u.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
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
              setSelectedTenant(tenant);
              setShowDetailModal(true);
            }}
            emptyMessage="No tenants found"
          />
        </Card>
      )}

      {/* Users View - Simplified */}
      {selectedView === 'users' && (
        <Card>
          <CardHeader
            title="All Users"
            subtitle={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                            {u.displayName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{u.displayName}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                            {u.jobTitle && (
                              <div className="text-xs text-gray-400">{u.jobTitle}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {u.phoneNumber && (
                            <div className="text-gray-900">{u.phoneNumber}</div>
                          )}
                          {u.department && (
                            <div className="text-gray-500">{u.department}</div>
                          )}
                          {!u.phoneNumber && !u.department && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {!u.isActive ? (
                            <StatusBadge status="Deactivated" variant="danger" />
                          ) : u.isSystemAdmin ? (
                            <StatusBadge status="System Admin" variant="warning" />
                          ) : u.tenantMemberships && u.tenantMemberships.length > 0 ? (
                            <StatusBadge status={`${u.tenantMemberships.length} Tenant${u.tenantMemberships.length !== 1 ? 's' : ''}`} variant="success" />
                          ) : (
                            <StatusBadge status="No Tenants" variant="default" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
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
                    toast.success('Settings saved successfully!');
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
                      toast('Microsoft 365 configuration will be available in a future update');
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
                      toast('Slack configuration will be available in a future update');
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
                      toast('API management will be available in a future update');
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

      {/* Add Tenant Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormErrors({});
        }}
        title="Add Tenant"
        size="lg"
      >
        {formErrors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{formErrors.submit}</p>
          </div>
        )}

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

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddModal(false);
              setFormErrors({});
            }}
            disabled={createTenantMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setFormErrors({});
              if (!tenantForm.name.trim() || !tenantForm.code.trim()) {
                setFormErrors({
                  name: !tenantForm.name.trim() ? 'Name is required' : '',
                  code: !tenantForm.code.trim() ? 'Code is required' : '',
                });
                return;
              }
              createTenantMutation.mutate(tenantForm);
            }}
            disabled={createTenantMutation.isPending}
          >
            {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
          </Button>
        </div>
      </Modal>

      {/* Tenant Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTenant(undefined);
        }}
        title="Tenant Details"
        size="lg"
      >
        {selectedTenant && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{selectedTenant.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1">
                <StatusBadge
                  status={getStatusLabel(selectedTenant.status)}
                  variant={
                    selectedTenant.status === TenantStatus.Active ? 'success' :
                    selectedTenant.status === TenantStatus.Suspended ? 'warning' :
                    'default'
                  }
                />
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created At</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(selectedTenant.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Updated At</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(selectedTenant.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => {
            setShowDetailModal(false);
            setSelectedTenant(undefined);
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

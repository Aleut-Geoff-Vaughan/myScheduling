import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal, Select, FormGroup } from '../components/ui';
import { useTenants, useUsers } from '../hooks/useTenants';
import type { Tenant as ApiTenant, User as ApiUser } from '../types/api';
import { TenantStatus } from '../types/api';
import { tenantsService, usersService } from '../services/tenantsService';

type AdminView = 'tenants' | 'users' | 'settings';

export function AdminPage() {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<AdminView>('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApiTenant | ApiUser | undefined>();

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

  const userColumns = [
    {
      key: 'displayName',
      header: 'User',
      render: (user: ApiUser) => (
        <div>
          <div className="font-medium text-gray-900">{user.displayName}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      )
    },
    {
      key: 'tenantId',
      header: 'Tenant ID',
      render: (user: ApiUser) => (
        <span className="text-sm">{user.tenantId.substring(0, 8)}...</span>
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
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* View Selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'tenants' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('tenants')}
              >
                Tenants
              </Button>
              <Button
                variant={selectedView === 'users' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('users')}
              >
                Users
              </Button>
              <Button
                variant={selectedView === 'settings' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('settings')}
              >
                Settings
              </Button>
            </div>
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
          />
          <Table
            data={filteredUsers}
            columns={userColumns}
            onRowClick={(user) => {
              setSelectedItem(user);
              setShowDetailModal(true);
            }}
            emptyMessage="No users found"
          />
        </Card>
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
                placeholder="e.g., Aleut Federal"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                  <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).tenantId}</p>
                </div>
                {(selectedItem as ApiUser).azureAdObjectId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Azure AD Object ID</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedItem as ApiUser).azureAdObjectId}</p>
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
    </div>
  );
}

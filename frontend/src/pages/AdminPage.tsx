import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal } from '../components/ui';
import { useTenants, useUsers } from '../hooks/useTenants';
import { Tenant as ApiTenant, User as ApiUser, TenantStatus } from '../types/api';

type AdminView = 'tenants' | 'users' | 'settings';

export function AdminPage() {
  const [selectedView, setSelectedView] = useState<AdminView>('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useTenants();
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();

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
            <div className="text-3xl font-bold text-blue-600">{mockTenants.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Tenants</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {mockTenants.filter(t => t.status === 'Active').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active Tenants</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{mockUsers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Users</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {mockUsers.filter(u => u.status === 'Pending').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Pending Users</div>
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
            onRowClick={(tenant) => console.log('View tenant:', tenant.id)}
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
            onRowClick={(user) => console.log('View user:', user.id)}
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
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Require Two-Factor Authentication</div>
                    <div className="text-sm text-gray-500">Force all users to enable 2FA</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Allow Self-Registration</div>
                    <div className="text-sm text-gray-500">Allow new users to register without invitation</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">Maintenance Mode</div>
                    <div className="text-sm text-gray-500">Disable access for all non-admin users</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
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
                  <Input type="number" defaultValue="30" className="w-48" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Minimum Length
                  </label>
                  <Input type="number" defaultValue="8" className="w-48" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Failed Login Attempts Before Lock
                  </label>
                  <Input type="number" defaultValue="5" className="w-48" />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <Button variant="primary">Save Security Settings</Button>
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
                  <Button variant="ghost">Configure</Button>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium text-gray-900">Slack Integration</div>
                    <div className="text-sm text-gray-500">Send notifications to Slack channels</div>
                  </div>
                  <Button variant="ghost">Configure</Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">API Access</div>
                    <div className="text-sm text-gray-500">Manage API keys and webhooks</div>
                  </div>
                  <Button variant="ghost">Manage</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Add Modal - Placeholder */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${selectedView === 'tenants' ? 'Tenant' : 'User'}`}
      >
        <div className="py-4 text-center text-gray-500">
          <p>Form to add new {selectedView === 'tenants' ? 'tenant' : 'user'} will appear here</p>
          <p className="text-sm mt-2">This will be implemented with API integration</p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(false)}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}

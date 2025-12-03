import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody, Input, Button, Table, StatusBadge } from '../components/ui';
import { ImpersonateUserModal } from '../components/ImpersonateUserModal';
import { useAuthStore } from '../stores/authStore';
import { authService, type ImpersonationSessionInfo } from '../services/authService';
import { useUsers } from '../hooks/useTenants';
import type { User as ApiUser } from '../types/api';
import { Search, UserCheck, Eye, Clock, Shield, AlertTriangle } from 'lucide-react';

export function AdminImpersonationPage() {
  const navigate = useNavigate();
  const { user, impersonation } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useUsers();

  // Fetch recent impersonation sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['impersonation-sessions'],
    queryFn: () => authService.getImpersonationSessions(20),
  });

  // Check if current user is system admin - use the user's isSystemAdmin flag, not workspace roles
  const isSystemAdmin = user?.isSystemAdmin ?? false;

  // Filter users based on search term (exclude system admins from impersonation)
  const filteredUsers = users.filter((u) => {
    // Can't impersonate yourself
    if (u.id === user?.id) return false;

    // Can't impersonate system admins
    if (u.isSystemAdmin) return false;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.jobTitle?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleImpersonateClick = (targetUser: ApiUser) => {
    setSelectedUser(targetUser);
    setShowImpersonateModal(true);
  };

  const handleImpersonationSuccess = () => {
    setShowImpersonateModal(false);
    setSelectedUser(null);
    // Redirect to workspace selection
    navigate('/select-workspace');
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '-';
    // Duration comes as HH:MM:SS format
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    return duration;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (!isSystemAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Access Denied</h2>
                <p className="text-sm text-gray-600">
                  Only System Administrators can access the impersonation feature.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (impersonation?.isImpersonating) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Currently Impersonating</h2>
                <p className="text-sm text-gray-600">
                  You are currently impersonating {impersonation.impersonatedUser.displayName}.
                  End the current impersonation session before starting a new one.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Impersonation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Impersonate users to troubleshoot issues or verify permissions
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800">All sessions are logged for audit</span>
        </div>
      </div>

      {/* User Search */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Find User to Impersonate</h2>
        </CardHeader>
        <CardBody>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No users found matching your search' : 'No users available to impersonate'}
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: 'user',
                  header: 'User',
                  render: (row: ApiUser) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                        {row.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{row.displayName}</div>
                        <div className="text-sm text-gray-500">{row.email}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'jobTitle',
                  header: 'Job Title',
                  render: (row: ApiUser) => row.jobTitle || '-',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row: ApiUser) => (
                    <StatusBadge
                      status={row.isActive ? 'Active' : 'Inactive'}
                      variant={row.isActive ? 'success' : 'default'}
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row: ApiUser) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonateClick(row)}
                      disabled={!row.isActive}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Impersonate
                    </Button>
                  ),
                },
              ]}
              data={filteredUsers.slice(0, 50)}
            />
          )}
          {filteredUsers.length > 50 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing first 50 results. Refine your search to see more specific users.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Recent Impersonation Sessions</h2>
          </div>
        </CardHeader>
        <CardBody>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No impersonation sessions recorded
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: 'admin',
                  header: 'Admin',
                  render: (row: ImpersonationSessionInfo) => (
                    <div>
                      <div className="font-medium text-gray-900">{row.adminUserName}</div>
                      <div className="text-sm text-gray-500">{row.adminUserEmail}</div>
                    </div>
                  ),
                },
                {
                  key: 'impersonatedUser',
                  header: 'Impersonated User',
                  render: (row: ImpersonationSessionInfo) => (
                    <div>
                      <div className="font-medium text-gray-900">{row.impersonatedUserName}</div>
                      <div className="text-sm text-gray-500">{row.impersonatedUserEmail}</div>
                    </div>
                  ),
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: (row: ImpersonationSessionInfo) => (
                    <div className="max-w-xs truncate" title={row.reason}>
                      {row.reason || '-'}
                    </div>
                  ),
                },
                {
                  key: 'startedAt',
                  header: 'Started',
                  render: (row: ImpersonationSessionInfo) => formatDateTime(row.startedAt),
                },
                {
                  key: 'duration',
                  header: 'Duration',
                  render: (row: ImpersonationSessionInfo) => formatDuration(row.duration),
                },
                {
                  key: 'sessionStatus',
                  header: 'Status',
                  render: (row: ImpersonationSessionInfo) => (
                    <StatusBadge
                      status={row.active ? 'Active' : 'Ended'}
                      variant={row.active ? 'warning' : 'success'}
                    />
                  ),
                },
              ]}
              data={sessions}
            />
          )}
        </CardBody>
      </Card>

      {/* Impersonate Modal */}
      {showImpersonateModal && selectedUser && (
        <ImpersonateUserModal
          user={selectedUser}
          onClose={() => {
            setShowImpersonateModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleImpersonationSuccess}
        />
      )}
    </div>
  );
}

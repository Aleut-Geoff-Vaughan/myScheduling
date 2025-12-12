import React, { memo } from 'react';
import { Button, StatusBadge, Input } from './ui';
import { RoleSelector } from './RoleSelector';
import { RoleTemplates } from './RoleTemplates';
import type { User as ApiUser } from '../types/api';
import { AppRole } from '../types/api';

interface LoginHistoryEntry {
  id: string;
  email?: string;
  isSuccess: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  createdAt: string;
}

interface AdminUserRowProps {
  user: ApiUser;
  userColumns: Array<{ key: string; header: string; render: (user: ApiUser) => React.ReactNode }>;
  isExpanded: boolean;
  editingMembershipId: string | null;
  editingRoles: AppRole[];
  addingMembershipForUser: string | null;
  newMembershipTenantId: string;
  newMembershipRoles: AppRole[];
  passwordForUserId: string | null;
  newPassword: string;
  confirmPassword: string;
  tenants: Array<{ id: string; name: string; code: string }>;
  onToggleExpand: (userId: string) => void;
  onRowClick: (user: ApiUser) => void;
  onStartEditingRoles: (membershipId: string, roles: AppRole[]) => void;
  onCancelEditingRoles: () => void;
  onSaveRoles: (membershipId: string) => void;
  onSetEditingRoles: (roles: AppRole[]) => void;
  onStartAddMembership: (userId: string) => void;
  onSaveMembership: (userId: string) => void;
  onCancelAddMembership: () => void;
  onSetNewMembershipTenantId: (tenantId: string) => void;
  onSetNewMembershipRoles: (roles: AppRole[]) => void;
  onStartSetPassword: (userId: string) => void;
  onSavePassword: (userId: string) => void;
  onCancelSetPassword: () => void;
  onSetNewPassword: (password: string) => void;
  onSetConfirmPassword: (password: string) => void;
  onDeactivateUser: (userId: string) => void;
  onReactivateUser: (userId: string) => void;
  onLoadLoginHistory: (userId: string) => void;
  loginHistory: Record<string, LoginHistoryEntry[]>;
  isUpdatingRoles: boolean;
  isCreatingMembership: boolean;
  isSettingPassword: boolean;
  getRoleLabel: (role: AppRole) => string;
}

export const AdminUserRow = memo(function AdminUserRow({
  user,
  userColumns,
  isExpanded,
  editingMembershipId,
  editingRoles,
  addingMembershipForUser,
  newMembershipTenantId,
  newMembershipRoles,
  passwordForUserId,
  newPassword,
  confirmPassword,
  tenants,
  // onToggleExpand,
  onRowClick,
  onStartEditingRoles,
  onCancelEditingRoles,
  onSaveRoles,
  onSetEditingRoles,
  onStartAddMembership,
  onSaveMembership,
  onCancelAddMembership,
  onSetNewMembershipTenantId,
  onSetNewMembershipRoles,
  onStartSetPassword,
  onSavePassword,
  onCancelSetPassword,
  onSetNewPassword,
  onSetConfirmPassword,
  onDeactivateUser,
  onReactivateUser,
  onLoadLoginHistory,
  loginHistory,
  isUpdatingRoles,
  isCreatingMembership,
  isSettingPassword,
  getRoleLabel,
}: AdminUserRowProps) {
  return (
    <React.Fragment>
      <tr
        onClick={() => onRowClick(user)}
        className="hover:bg-gray-50 cursor-pointer transition-colors"
      >
        {userColumns.map(column => (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap">
            {column.render(user)}
          </td>
        ))}
      </tr>
      {isExpanded && (
        <tr>
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

                            {isEditing ? (
                              <div className="space-y-4">
                                <div>
                                  <RoleTemplates
                                    onSelectTemplate={onSetEditingRoles}
                                    disabled={isUpdatingRoles}
                                  />
                                </div>
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                  </div>
                                  <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or customize</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Custom Roles
                                  </label>
                                  <RoleSelector
                                    selectedRoles={editingRoles}
                                    onChange={onSetEditingRoles}
                                    disabled={isUpdatingRoles}
                                  />
                                </div>
                                <div className="flex gap-2 pt-2 border-t">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onSaveRoles(membership.id)}
                                    disabled={isUpdatingRoles || editingRoles.length === 0}
                                  >
                                    {isUpdatingRoles ? 'Saving...' : 'Save'}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onCancelEditingRoles}
                                    disabled={isUpdatingRoles}
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

                          {!isEditing && (
                            <button
                              onClick={() => onStartEditingRoles(membership.id, membership.roles || [])}
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

                  {/* Add Tenant Access */}
                  <div className="mt-4 border-t pt-4">
                    {addingMembershipForUser === user.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tenant
                          </label>
                          <select
                            value={newMembershipTenantId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSetNewMembershipTenantId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="" disabled>Select tenant...</option>
                            {tenants.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Roles
                          </label>
                          <RoleSelector
                            selectedRoles={newMembershipRoles}
                            onChange={onSetNewMembershipRoles}
                            disabled={isCreatingMembership}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onSaveMembership(user.id)}
                            disabled={isCreatingMembership}
                          >
                            {isCreatingMembership ? 'Saving...' : 'Add Tenant'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={onCancelAddMembership}
                            disabled={isCreatingMembership}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onStartAddMembership(user.id)}
                        disabled={isCreatingMembership}
                      >
                        + Add tenant access
                      </Button>
                    )}
                  </div>

                  {/* Password Reset */}
                  <div className="mt-4 border-t pt-4">
                    {passwordForUserId === user.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => onSetNewPassword(e.target.value)}
                            disabled={isSettingPassword}
                          />
                          <Input
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => onSetConfirmPassword(e.target.value)}
                            disabled={isSettingPassword}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onSavePassword(user.id)}
                            disabled={isSettingPassword}
                          >
                            {isSettingPassword ? 'Updating...' : 'Update Password'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={onCancelSetPassword}
                            disabled={isSettingPassword}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onStartSetPassword(user.id)}
                      >
                        Set Password
                      </Button>
                    )}
                  </div>

                  {/* User Actions */}
                  <div className="mt-4 border-t pt-4 flex gap-2">
                    {user.isActive ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeactivateUser(user.id)}
                      >
                        Deactivate User
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onReactivateUser(user.id)}
                      >
                        Reactivate User
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onLoadLoginHistory(user.id)}
                    >
                      View Login History
                    </Button>
                  </div>

                  {/* Login History */}
                  {loginHistory[user.id] && (
                    <div className="mt-4 border-t pt-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Recent Login History</h5>
                      <div className="space-y-1">
                        {loginHistory[user.id].map((entry: LoginHistoryEntry, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600">
                            {new Date(entry.timestamp || entry.createdAt).toLocaleString()} - {entry.ipAddress}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tenant memberships</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.editingMembershipId === nextProps.editingMembershipId &&
    prevProps.addingMembershipForUser === nextProps.addingMembershipForUser &&
    prevProps.passwordForUserId === nextProps.passwordForUserId &&
    prevProps.isUpdatingRoles === nextProps.isUpdatingRoles &&
    prevProps.isCreatingMembership === nextProps.isCreatingMembership &&
    prevProps.isSettingPassword === nextProps.isSettingPassword &&
    JSON.stringify(prevProps.user.tenantMemberships) === JSON.stringify(nextProps.user.tenantMemberships)
  );
});

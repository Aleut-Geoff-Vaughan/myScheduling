import { useState, useEffect } from 'react';
import { AppRole } from '../types/api';
import { tenantMembershipsService } from '../services/tenantMembershipsService';
import type { RoleInfo } from '../services/tenantMembershipsService';

interface RoleSelectorProps {
  selectedRoles: AppRole[];
  onChange: (roles: AppRole[]) => void;
  disabled?: boolean;
  showSystemRoles?: boolean;
}

export function RoleSelector({ selectedRoles, onChange, disabled = false, showSystemRoles = false }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const roles = await tenantMembershipsService.getRoles();
        // Filter out system roles unless explicitly requested
        const filteredRoles = showSystemRoles
          ? roles
          : roles.filter(r => r.level === 'tenant');
        setAvailableRoles(filteredRoles);
      } catch (error) {
        console.error('Failed to load roles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [showSystemRoles]);

  const toggleRole = (role: AppRole) => {
    if (disabled) return;

    const isSelected = selectedRoles.includes(role);
    let newRoles: AppRole[];

    if (isSelected) {
      // Prevent removing the last role
      if (selectedRoles.length === 1) {
        return;
      }
      newRoles = selectedRoles.filter(r => r !== role);
    } else {
      newRoles = [...selectedRoles, role];
    }

    onChange(newRoles);
  };

  const getRoleLabel = (role: AppRole): string => {
    const roleInfo = availableRoles.find(r => r.value === role);
    return roleInfo?.name || `Role ${role}`;
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading roles...</div>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm ${
          disabled
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 cursor-pointer'
        } border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <div className="flex flex-wrap gap-1">
          {selectedRoles.length === 0 ? (
            <span className="text-gray-400">Select roles...</span>
          ) : (
            selectedRoles.map(role => (
              <span
                key={role}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {getRoleLabel(role)}
              </span>
            ))
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="p-2">
              {availableRoles.map((roleInfo) => {
                const isSelected = selectedRoles.includes(roleInfo.value);
                const isLastRole = selectedRoles.length === 1 && isSelected;

                return (
                  <button
                    key={roleInfo.value}
                    type="button"
                    onClick={() => toggleRole(roleInfo.value)}
                    disabled={isLastRole}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      isLastRole
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50 cursor-pointer'
                    } ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isLastRole}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {roleInfo.name}
                          </span>
                          {roleInfo.level === 'system' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {roleInfo.description}
                        </p>
                        {isLastRole && (
                          <p className="text-xs text-red-500 mt-1">
                            At least one role is required
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

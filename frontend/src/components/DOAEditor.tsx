import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useDOALetter,
  useCreateDOALetter,
  useUpdateDOALetter,
} from '../hooks/useDOA';
import type { CreateDOALetterRequest } from '../types/doa';
import { useUsers } from '../hooks/useTenants';
import type { User } from '../types/api';

interface DOAEditorProps {
  doaId: string | null;
  onClose: () => void;
}

export function DOAEditor({ doaId, onClose }: DOAEditorProps) {
  const isEdit = !!doaId;
  const { data: doa, isLoading: isLoadingDOA } = useDOALetter(doaId!);
  const { data: users = [], isLoading: isLoadingUsers, error: usersError } = useUsers();

  const createMutation = useCreateDOALetter();
  const updateMutation = useUpdateDOALetter();

  // Search state for designee
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<CreateDOALetterRequest>(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      designeeUserId: '',
      subjectLine: '',
      letterContent: '',
      effectiveStartDate: format(today, 'yyyy-MM-dd'),
      effectiveEndDate: format(nextWeek, 'yyyy-MM-dd'),
      notes: '',
    };
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const displayName = user.displayName || user.name || '';
    const email = user.email || '';
    return (
      displayName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (!doa || users.length === 0) return;
    
    // Only populate form if it's currently empty (initial load)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => {
      // If form already has data, don't override
      if (prev.designeeUserId !== '' && prev.designeeUserId !== doa.designeeUserId) {
        return prev;
      }
      
      return {
        designeeUserId: doa.designeeUserId,
        subjectLine: doa.subjectLine || '',
        letterContent: doa.letterContent,
        effectiveStartDate: format(new Date(doa.effectiveStartDate), 'yyyy-MM-dd'),
        effectiveEndDate: format(new Date(doa.effectiveEndDate), 'yyyy-MM-dd'),
        notes: doa.notes || '',
      };
    });
    
    // Set the selected user for display
    const user = users.find(u => u.id === doa.designeeUserId);
    if (user) {
      setSelectedUser(prev => prev?.id === user.id ? prev : user);
      setSearchTerm(prev => {
        const userDisplay = user.displayName || user.name || user.email;
        return prev === userDisplay ? prev : userDisplay;
      });
    }
  }, [doa, users]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm(user.displayName || user.name || user.email);
    setFormData(prev => ({ ...prev, designeeUserId: user.id }));
    setShowDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    // Clear selection if user is typing
    if (selectedUser && e.target.value !== (selectedUser.displayName || selectedUser.name || selectedUser.email)) {
      setSelectedUser(null);
      setFormData({ ...formData, designeeUserId: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.designeeUserId) {
      toast.error('Please select a designee');
      return;
    }

    if (!formData.subjectLine.trim()) {
      toast.error('Please enter a subject line');
      return;
    }

    if (!formData.letterContent.trim()) {
      toast.error('Please enter letter content');
      return;
    }

    try {
      if (isEdit && doaId) {
        await updateMutation.mutateAsync({
          id: doaId,
          request: { ...formData, id: doaId },
        });
        toast.success('DOA letter updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('DOA letter created successfully');
      }
      onClose();
    } catch {
      toast.error(
        isEdit ? 'Failed to update DOA letter' : 'Failed to create DOA letter'
      );
    }
  };

  if (isEdit && isLoadingDOA) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit DOA Letter' : 'Create DOA Letter'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Designee Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designee <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder={isLoadingUsers ? 'Loading users...' : 'Search by name or email...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingUsers}
              required
            />
            {/* Dropdown */}
            {showDropdown && !isLoadingUsers && filteredUsers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <div className="font-medium text-gray-900">
                      {user.displayName || user.name || user.email}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !isLoadingUsers && searchTerm && filteredUsers.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                No users found matching "{searchTerm}"
              </div>
            )}
            {usersError && (
              <p className="mt-1 text-sm text-red-600">
                Error loading users. Please try refreshing the page.
              </p>
            )}
            {!usersError && !isLoadingUsers && (
              <p className="mt-1 text-sm text-gray-500">
                Person to whom authority will be delegated ({users.length} users available)
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveStartDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, effectiveStartDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveEndDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, effectiveEndDate: e.target.value }))
                }
                min={formData.effectiveStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subjectLine}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, subjectLine: e.target.value }))
              }
              placeholder="e.g., Financial Authority, Operational Authority, Signing Authority..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Brief description of the authority being delegated
            </p>
          </div>

          {/* Letter Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Letter Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.letterContent}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, letterContent: e.target.value }))
              }
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter the delegation of authority letter content..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Formal letter specifying the scope and limitations of delegated authority
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional internal notes (not visible in the official letter)..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                ? 'Update DOA Letter'
                : 'Create DOA Letter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

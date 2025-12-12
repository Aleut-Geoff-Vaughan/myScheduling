import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody } from '../components/ui';
import { teamCalendarService } from '../services/teamCalendarService';
import toast from 'react-hot-toast';
import type {
  TeamCalendarResponse,
  CreateTeamCalendarRequest,
  UpdateTeamCalendarRequest,
  TeamCalendarType,
  MembershipType,
} from '../types/teamCalendar';
import { usersService } from '../services/tenantsService';

interface UserOption {
  id: string;
  displayName: string;
  email: string;
}

export function TeamCalendarAdminPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [calendars, setCalendars] = useState<TeamCalendarResponse[]>([]);
  const [people, setPeople] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<TeamCalendarResponse | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTeamCalendarRequest>({
    name: '',
    description: '',
    type: 0, // TeamCalendarType.Team
    ownerUserId: undefined,
    isActive: true,
  });

  // Member management state
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [membershipType, setMembershipType] = useState<MembershipType>(0); // OptIn

  const fetchCalendars = useCallback(async () => {
    if (!currentWorkspace?.tenantId) return;

    setIsLoading(true);
    try {
      const data = await teamCalendarService.getAll({
        tenantId: currentWorkspace.tenantId,
        includeInactive,
      });
      setCalendars(data);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to load calendars');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.tenantId, includeInactive]);

  const fetchPeople = useCallback(async () => {
    if (!currentWorkspace?.tenantId) return;

    try {
      const users = await usersService.getAll(currentWorkspace.tenantId);
      setPeople(
        users.map((u) => ({
          id: u.id,
          displayName: u.displayName || u.name || u.email,
          email: u.email,
        }))
      );
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to load users');
    }
  }, [currentWorkspace?.tenantId]);

  useEffect(() => {
    if (currentWorkspace?.tenantId) {
      void fetchCalendars();
      void fetchPeople();
    }
  }, [currentWorkspace?.tenantId, fetchCalendars, fetchPeople]);

  const handleCreate = async () => {
    if (!currentWorkspace?.tenantId || !user?.id) return;

    try {
      await teamCalendarService.create(
        currentWorkspace.tenantId,
        user.id,
        formData
      );
      toast.success('Team calendar created successfully');
      setShowCreateModal(false);
      resetForm();
      void fetchCalendars();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to create calendar');
    }
  };

  const handleUpdate = async () => {
    if (!selectedCalendar || !user?.id) return;

    try {
      const updateData: UpdateTeamCalendarRequest = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        ownerUserId: formData.ownerUserId,
        isActive: formData.isActive,
      };

      await teamCalendarService.update(selectedCalendar.id, user.id, updateData);
      toast.success('Team calendar updated successfully');
      setShowEditModal(false);
      resetForm();
      void fetchCalendars();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to update calendar');
    }
  };

  const handleDelete = async (calendarId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this calendar?')) return;

    try {
      await teamCalendarService.delete(calendarId, user.id);
      toast.success('Team calendar deleted successfully');
      void fetchCalendars();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to delete calendar');
    }
  };

  const handleAddMembers = async () => {
    if (!selectedCalendar || !user?.id || selectedPeople.length === 0) return;

    try {
      await teamCalendarService.bulkAddMembers(
        selectedCalendar.id,
        user.id,
        {
          userIds: selectedPeople,
          membershipType,
        }
      );
      toast.success(`Added ${selectedPeople.length} member(s) successfully`);
      setShowMembersModal(false);
      setSelectedPeople([]);
      void fetchCalendars();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to add members');
    }
  };

  const handleRemoveMember = async (calendarId: string, memberId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await teamCalendarService.removeMember(calendarId, memberId, user.id);
      toast.success('Member removed successfully');
      void fetchCalendars();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 0,
      ownerUserId: undefined,
      isActive: true,
    });
    setSelectedCalendar(null);
  };

  const openEditModal = (calendar: TeamCalendarResponse) => {
    setSelectedCalendar(calendar);
    setFormData({
      name: calendar.name,
      description: calendar.description || '',
      type: calendar.type,
      ownerUserId: calendar.ownerUserId,
      isActive: calendar.isActive,
    });
    setShowEditModal(true);
  };

  const openMembersModal = (calendar: TeamCalendarResponse) => {
    setSelectedCalendar(calendar);
    setShowMembersModal(true);
  };

  const getCalendarTypeLabel = (type: TeamCalendarType): string => {
    switch (type) {
      case 0: return 'Team';
      case 1: return 'Manager';
      case 2: return 'Department';
      case 3: return 'Project';
      default: return 'Unknown';
    }
  };

  const getMembershipTypeLabel = (type: MembershipType): string => {
    switch (type) {
      case 0: return 'Opt-In';
      case 1: return 'Forced';
      case 2: return 'Automatic';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Calendar Administration</h1>
          <p className="text-gray-600 mt-2">Manage team calendars and memberships</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create Calendar
          </button>
        </div>
      </div>

      {/* Calendars List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading calendars...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {calendars.map((calendar) => (
            <Card key={calendar.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{calendar.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {getCalendarTypeLabel(calendar.type)}
                      </span>
                      {!calendar.isActive && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {calendar.description && (
                      <p className="text-sm text-gray-600 mb-3">{calendar.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Members:</span> {calendar.memberCount}
                      </div>
                      {calendar.owner && (
                        <div>
                          <span className="font-medium">Owner:</span>{' '}
                          {calendar.owner.displayName || calendar.owner.email}
                        </div>
                      )}
                    </div>

                    {/* Members List */}
                    {calendar.members && calendar.members.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Members:</h4>
                        <div className="space-y-2">
                          {calendar.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {member.user.displayName || member.user.email}
                                </p>
                                <p className="text-xs text-gray-600">{member.user.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  {getMembershipTypeLabel(member.membershipType)}
                                </span>
                                <button
                                  onClick={() => handleRemoveMember(calendar.id, member.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openMembersModal(calendar)}
                      className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      Add Members
                    </button>
                    <button
                      onClick={() => openEditModal(calendar)}
                      className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(calendar.id)}
                      className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {calendars.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No team calendars found</p>
              <p className="text-sm mt-2">Create your first team calendar to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {showCreateModal ? 'Create Team Calendar' : 'Edit Team Calendar'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Engineering Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) as TeamCalendarType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Team</option>
                  <option value={1}>Manager</option>
                  <option value={2}>Department</option>
                  <option value={3}>Project</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (showCreateModal) {
                    setShowCreateModal(false);
                  } else {
                    setShowEditModal(false);
                  }
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {showCreateModal ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showMembersModal && selectedCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Add Members to {selectedCalendar.name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select People *
                </label>
                <select
                  multiple
                  value={selectedPeople}
                  onChange={(e) =>
                    setSelectedPeople(Array.from(e.target.selectedOptions, (option) => option.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={10}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName} ({person.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Membership Type *
                </label>
                <select
                  value={membershipType}
                  onChange={(e) => setMembershipType(Number(e.target.value) as MembershipType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Opt-In (Members can leave)</option>
                  <option value={1}>Forced (Members cannot leave)</option>
                  <option value={2}>Automatic (System managed)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedPeople([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedPeople.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedPeople.length > 0 ? `(${selectedPeople.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardBody, Button, Input, Modal, StatusBadge } from '../components/ui';
import { Pagination } from '../components/Pagination';
import { useAuthStore } from '../stores/authStore';
import { useTenants } from '../hooks/useTenants';
import { teamCalendarService } from '../services/teamCalendarService';
import { usersService } from '../services/tenantsService';
import type {
  TeamCalendarResponse,
  CreateTeamCalendarRequest,
  UpdateTeamCalendarRequest,
  TeamCalendarType,
  MembershipType,
} from '../types/teamCalendar';

interface UserOption {
  id: string;
  displayName: string;
  email: string;
  managerId?: string;
}

const ITEMS_PER_PAGE = 10;

export function AdminTeamCalendarsPage() {
  const { user, currentWorkspace } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();

  // Filters
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [searchOwner, setSearchOwner] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<TeamCalendarResponse | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateTeamCalendarRequest>({
    name: '',
    description: '',
    type: 0,
    ownerUserId: undefined,
    isActive: true,
  });

  // Member management
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [membershipType, setMembershipType] = useState<MembershipType>(0);
  const [people, setPeople] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'direct-reports'>('all');

  // Determine if user is system admin
  const isSystemAdmin = user?.isSystemAdmin === true;

  // Set default tenant
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      if (isSystemAdmin) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Init from props
        setSelectedTenantId('all');
      } else if (currentWorkspace?.tenantId) {
        setSelectedTenantId(currentWorkspace.tenantId);
      } else {
        setSelectedTenantId(tenants[0].id);
      }
    }
  }, [tenants, selectedTenantId, isSystemAdmin, currentWorkspace]);

  // Fetch all calendars across tenants (for system admin) or for current tenant
  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['admin-team-calendars', selectedTenantId, filterStatus],
    queryFn: async () => {
      if (selectedTenantId === 'all') {
        // Fetch from all tenants
        const allCalendars: TeamCalendarResponse[] = [];
        for (const tenant of tenants) {
          try {
            const tenantCalendars = await teamCalendarService.getAll({
              tenantId: tenant.id,
              includeInactive: filterStatus !== 'active',
            });
            allCalendars.push(...tenantCalendars);
          } catch {
            // Skip tenants with errors
          }
        }
        return allCalendars;
      } else if (selectedTenantId) {
        return teamCalendarService.getAll({
          tenantId: selectedTenantId,
          includeInactive: filterStatus !== 'active',
        });
      }
      return [];
    },
    enabled: !!selectedTenantId && tenants.length > 0,
  });

  // Fetch users for the selected tenant
  useEffect(() => {
    const fetchPeople = async () => {
      const tenantId = selectedTenantId === 'all'
        ? currentWorkspace?.tenantId
        : selectedTenantId;
      if (!tenantId) return;

      try {
        const users = await usersService.getAll(tenantId);
        setPeople(
          users.map((u) => ({
            id: u.id,
            displayName: u.displayName || u.name || u.email,
            email: u.email,
            managerId: u.managerId,
          }))
        );
      } catch {
        // Ignore errors
      }
    };
    fetchPeople();
  }, [selectedTenantId, currentWorkspace?.tenantId]);

  // Filter calendars based on criteria
  const filteredCalendars = useMemo(() => {
    return calendars.filter((cal) => {
      // Type filter
      if (filterType !== 'all' && cal.type !== parseInt(filterType)) {
        return false;
      }

      // Status filter
      if (filterStatus === 'active' && !cal.isActive) {
        return false;
      }
      if (filterStatus === 'inactive' && cal.isActive) {
        return false;
      }

      // Owner search
      if (searchOwner) {
        const ownerName = cal.owner?.displayName?.toLowerCase() || '';
        const ownerEmail = cal.owner?.email?.toLowerCase() || '';
        const search = searchOwner.toLowerCase();
        if (!ownerName.includes(search) && !ownerEmail.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [calendars, filterType, filterStatus, searchOwner]);

  // Pagination
  const totalPages = Math.ceil(filteredCalendars.length / ITEMS_PER_PAGE);
  const paginatedCalendars = filteredCalendars.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset on filter change
    setCurrentPage(1);
  }, [filterType, filterStatus, searchOwner, selectedTenantId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateTeamCalendarRequest) => {
      const tenantId = selectedTenantId === 'all'
        ? currentWorkspace?.tenantId
        : selectedTenantId;
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');
      return teamCalendarService.create(tenantId, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-calendars'] });
      toast.success('Team calendar created successfully');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create calendar');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTeamCalendarRequest }) => {
      if (!user?.id) throw new Error('Missing user');
      return teamCalendarService.update(id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-calendars'] });
      toast.success('Team calendar updated successfully');
      setShowEditModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update calendar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Missing user');
      return teamCalendarService.delete(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-calendars'] });
      toast.success('Team calendar deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete calendar');
    },
  });

  const bulkAddMembersMutation = useMutation({
    mutationFn: async ({ calendarId, userIds, membershipType }: { calendarId: string; userIds: string[]; membershipType: MembershipType }) => {
      if (!user?.id) throw new Error('Missing user');
      return teamCalendarService.bulkAddMembers(calendarId, user.id, { userIds, membershipType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-calendars'] });
      toast.success('Members added successfully');
      setShowMembersModal(false);
      setSelectedPeople([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add members');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ calendarId, memberId }: { calendarId: string; memberId: string }) => {
      if (!user?.id) throw new Error('Missing user');
      return teamCalendarService.removeMember(calendarId, memberId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-calendars'] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

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
    setSelectedPeople([]);
    setMemberSearch('');
    setMemberFilter('all');
    setShowMembersModal(true);
  };

  const handleDelete = (calendarId: string) => {
    if (!confirm('Are you sure you want to delete this calendar?')) return;
    deleteMutation.mutate(calendarId);
  };

  const handleRemoveMember = (calendarId: string, memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    removeMemberMutation.mutate({ calendarId, memberId });
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

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.name || 'Unknown';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Calendars</h1>
        <p className="text-gray-600 mt-1">Manage team calendars across the enterprise</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Tenant Filter (System Admin only) */}
            {isSystemAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="0">Team</option>
                <option value="1">Manager</option>
                <option value="2">Department</option>
                <option value="3">Project</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Owner Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
              <Input
                placeholder="Search by owner..."
                value={searchOwner}
                onChange={(e) => setSearchOwner(e.target.value)}
              />
            </div>

            {/* Create Button */}
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Calendar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {paginatedCalendars.length} of {filteredCalendars.length} calendars
      </div>

      {/* Calendars List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading calendars...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedCalendars.map((calendar) => (
            <Card key={calendar.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{calendar.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {getCalendarTypeLabel(calendar.type)}
                      </span>
                      <StatusBadge
                        status={calendar.isActive ? 'Active' : 'Inactive'}
                        variant={calendar.isActive ? 'success' : 'default'}
                      />
                    </div>
                    {calendar.description && (
                      <p className="text-sm text-gray-600 mb-3">{calendar.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {isSystemAdmin && selectedTenantId === 'all' && (
                        <div>
                          <span className="font-medium">Tenant:</span> {getTenantName(calendar.tenantId)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Members:</span> {calendar.memberCount}
                      </div>
                      {calendar.owner && (
                        <div>
                          <span className="font-medium">Owner:</span>{' '}
                          {calendar.owner.displayName || calendar.owner.email}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(calendar.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Members Preview */}
                    {calendar.members && calendar.members.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">Members</h4>
                          <button
                            onClick={() => openMembersModal(calendar)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Members
                          </button>
                        </div>
                        <div className="space-y-2">
                          {calendar.members.slice(0, 5).map((member) => (
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
                          {calendar.members.length > 5 && (
                            <p className="text-sm text-gray-500 text-center">
                              + {calendar.members.length - 5} more members
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openMembersModal(calendar)}
                    >
                      Add Members
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(calendar)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(calendar.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {filteredCalendars.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">No team calendars found</p>
              <p className="text-sm mt-2">Adjust your filters or create a new calendar</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCalendars.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={showCreateModal ? 'Create Team Calendar' : 'Edit Team Calendar'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <select
              value={formData.ownerUserId || ''}
              onChange={(e) => setFormData({ ...formData, ownerUserId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No owner</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName} ({person.email})
                </option>
              ))}
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

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (showCreateModal) {
                createMutation.mutate(formData);
              } else if (selectedCalendar) {
                updateMutation.mutate({
                  id: selectedCalendar.id,
                  data: formData as UpdateTeamCalendarRequest,
                });
              }
            }}
            disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : showCreateModal
              ? 'Create'
              : 'Update'}
          </Button>
        </div>
      </Modal>

      {/* Add Members Modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => {
          setShowMembersModal(false);
          setSelectedPeople([]);
          setMemberSearch('');
          setMemberFilter('all');
        }}
        title={`Add Members to ${selectedCalendar?.name || 'Calendar'}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Filter Row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Name
              </label>
              <Input
                placeholder="Type to search..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="member-filter-select" className="block text-sm font-medium text-gray-700 mb-1">
                Filter
              </label>
              <select
                id="member-filter-select"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value as 'all' | 'direct-reports')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All People</option>
                <option value="direct-reports">My Direct Reports</option>
              </select>
            </div>
          </div>

          {/* Available People List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available People
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {(() => {
                const availablePeople = people
                  .filter((p) => {
                    // Exclude already selected
                    if (selectedPeople.includes(p.id)) return false;
                    // Exclude already members
                    if (selectedCalendar?.members?.some((m) => m.userId === p.id)) return false;
                    // Apply search filter
                    if (memberSearch) {
                      const search = memberSearch.toLowerCase();
                      const matchesName = p.displayName.toLowerCase().includes(search);
                      const matchesEmail = p.email.toLowerCase().includes(search);
                      if (!matchesName && !matchesEmail) return false;
                    }
                    // Apply direct reports filter
                    if (memberFilter === 'direct-reports' && p.managerId !== user?.id) {
                      return false;
                    }
                    return true;
                  })
                  .slice(0, 50); // Limit to 50 for performance

                if (availablePeople.length === 0) {
                  return (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {memberSearch || memberFilter !== 'all'
                        ? 'No matching people found'
                        : 'All people have been added'}
                    </div>
                  );
                }

                return availablePeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {person.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{person.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPeople([...selectedPeople, person.id])}
                      className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    >
                      + Add
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Selected People List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected People ({selectedPeople.length})
            </label>
            <div className="border border-gray-300 rounded-lg max-h-36 overflow-y-auto">
              {selectedPeople.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No people selected yet. Click "+ Add" above to add people.
                </div>
              ) : (
                selectedPeople.map((personId) => {
                  const person = people.find((p) => p.id === personId);
                  if (!person) return null;
                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {person.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{person.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPeople(selectedPeople.filter((id) => id !== personId))}
                        className="ml-2 px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Membership Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membership Type
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

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowMembersModal(false);
              setSelectedPeople([]);
              setMemberSearch('');
              setMemberFilter('all');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (selectedCalendar && selectedPeople.length > 0) {
                bulkAddMembersMutation.mutate({
                  calendarId: selectedCalendar.id,
                  userIds: selectedPeople,
                  membershipType,
                });
              }
            }}
            disabled={selectedPeople.length === 0 || bulkAddMembersMutation.isPending}
          >
            {bulkAddMembersMutation.isPending
              ? 'Adding...'
              : `Add ${selectedPeople.length} Member${selectedPeople.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

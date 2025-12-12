import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody, Button, Input, StatusBadge, Modal } from '../components/ui';
import { RoleSelector } from '../components/RoleSelector';
import { RoleTemplates } from '../components/RoleTemplates';
import { useTenants } from '../hooks/useTenants';
import { usePeople } from '../hooks/usePeople';
import { useOffices } from '../hooks/useOffices';
import { usersService } from '../services/tenantsService';
import { tenantMembershipsService } from '../services/tenantMembershipsService';
import { authService } from '../services/authService';
import { teamCalendarService } from '../services/teamCalendarService';
import type { User, TenantMembership, Person } from '../types/api';
import { AppRole } from '../types/api';
import type { TeamCalendarResponse, CreateTeamCalendarRequest, UpdateTeamCalendarRequest, TeamCalendarType } from '../types/teamCalendar';
import { useAuthStore } from '../stores/authStore';

// Searchable Person Select Component
interface PersonSelectProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  people: Person[];
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
}

function PersonSelect({ label, value, onChange, people, excludeId, placeholder = 'Search...', disabled }: PersonSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredPeople = useMemo(() => {
    return people
      .filter(p => p.id !== excludeId)
      .filter(p =>
        search === '' ||
        p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 50);
  }, [people, excludeId, search]);

  const selectedPerson = people.find(p => p.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownId = `person-select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div ref={containerRef} className="relative">
      <label id={`${dropdownId}-label`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <div
          id={dropdownId}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`${dropdownId}-label`}
          aria-haspopup="listbox"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setIsOpen(!isOpen); } }}
          className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          {selectedPerson ? (
            <span className="flex items-center pr-6">
              <span>{selectedPerson.displayName} <span className="text-gray-400 text-sm">({selectedPerson.email})</span></span>
            </span>
          ) : (
            <span className="text-gray-400">None selected</span>
          )}
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-gray-500 italic"
            >
              None
            </button>
            {filteredPeople.map(person => (
              <button
                key={person.id}
                type="button"
                onClick={() => { onChange(person.id); setIsOpen(false); setSearch(''); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${value === person.id ? 'bg-blue-100' : ''}`}
              >
                <span className="font-medium">{person.displayName}</span>
                <span className="text-gray-400 ml-2">{person.email}</span>
              </button>
            ))}
            {filteredPeople.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Multi-select for Standard Delegates
interface MultiPersonSelectProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  people: Person[];
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
}

function MultiPersonSelect({ label, values, onChange, people, excludeId, placeholder = 'Search to add...', disabled }: MultiPersonSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredPeople = useMemo(() => {
    return people
      .filter(p => p.id !== excludeId)
      .filter(p => !values.includes(p.id))
      .filter(p =>
        search === '' ||
        p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 50);
  }, [people, excludeId, values, search]);

  const selectedPeople = people.filter(p => values.includes(p.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeDelegate = (id: string) => {
    onChange(values.filter(v => v !== id));
  };

  const addDelegate = (id: string) => {
    onChange([...values, id]);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="min-h-[42px] px-3 py-2 border rounded-md shadow-sm bg-white">
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedPeople.map(person => (
            <span key={person.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              {person.displayName}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeDelegate(person.id)}
                  className="hover:text-blue-900"
                  title={`Remove ${person.displayName}`}
                  aria-label={`Remove ${person.displayName}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && (
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={values.length === 0 ? placeholder : 'Add more...'}
            className="w-full text-sm focus:outline-none"
          />
        )}
      </div>
      {isOpen && !disabled && search && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredPeople.map(person => (
            <button
              key={person.id}
              type="button"
              onClick={() => addDelegate(person.id)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
            >
              <span className="font-medium">{person.displayName}</span>
              <span className="text-gray-400 ml-2">{person.email}</span>
            </button>
          ))}
          {filteredPeople.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, currentWorkspace } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<AppRole[]>([]);
  const [showAddMembership, setShowAddMembership] = useState(false);
  const [newMembershipTenantId, setNewMembershipTenantId] = useState('');
  const [newMembershipRoles, setNewMembershipRoles] = useState<AppRole[]>([AppRole.Employee]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loginHistory, setLoginHistory] = useState<{
    totalLogins: number;
    lastSuccessfulAt: string | null;
    lastFailedAt: string | null;
    logins: Array<{
      id: string;
      createdAt: string;
      isSuccess: boolean;
      ipAddress: string | null;
    }>;
  } | null>(null);

  // Team Calendars state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<TeamCalendarResponse | null>(null);
  const [calendarFormData, setCalendarFormData] = useState<CreateTeamCalendarRequest>({
    name: '',
    description: '',
    type: 0 as TeamCalendarType,
    isActive: true,
  });
  const [showDeleteCalendarConfirm, setShowDeleteCalendarConfirm] = useState<TeamCalendarResponse | null>(null);

  const { data: tenants = [] } = useTenants();

  // Get people list for manager dropdown - use first tenant membership's tenant or current workspace
  const { data: peopleOptions = [] } = usePeople({
    tenantId: currentWorkspace?.tenantId ?? '',
  });

  // Get offices for home office dropdown
  const { data: offices = [] } = useOffices({
    tenantId: currentWorkspace?.tenantId ?? '',
  });

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id!),
    enabled: !!id,
  });

  // Query for team calendars owned by this user
  const { data: ownedCalendars = [], isLoading: isLoadingCalendars } = useQuery({
    queryKey: ['user-team-calendars', id, currentWorkspace?.tenantId],
    queryFn: async () => {
      if (!currentWorkspace?.tenantId) return [];
      // Fetch all calendars and filter by owner
      const all = await teamCalendarService.getAll({ tenantId: currentWorkspace.tenantId, includeInactive: true });
      return all.filter(c => c.ownerUserId === id);
    },
    enabled: !!id && !!currentWorkspace?.tenantId,
  });

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from user prop
      setFormData({
        displayName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        managerId: user.managerId || '',
        isSystemAdmin: user.isSystemAdmin,
        entraObjectId: user.entraObjectId || '',
        homeOfficeId: user.homeOfficeId || '',
        executiveAssistantId: user.executiveAssistantId || '',
        standardDelegateIds: user.standardDelegateIds || [],
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => usersService.updateProfile(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ membershipId, roles }: { membershipId: string; roles: AppRole[] }) =>
      tenantMembershipsService.updateRoles(membershipId, { roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingMembershipId(null);
      setEditingRoles([]);
      toast.success('Roles updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update roles');
    },
  });

  const createMembershipMutation = useMutation({
    mutationFn: (payload: { userId: string; tenantId: string; roles: AppRole[] }) =>
      tenantMembershipsService.createTenantMembership(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Tenant access added');
      setShowAddMembership(false);
      setNewMembershipTenantId('');
      setNewMembershipRoles([AppRole.Employee]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add tenant access');
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: (membershipId: string) =>
      tenantMembershipsService.deleteTenantMembership(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Tenant access removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove tenant access');
    },
  });

  const updateMembershipStatusMutation = useMutation({
    mutationFn: ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) =>
      tenantMembershipsService.updateStatus(membershipId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Membership status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update membership status');
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: () => usersService.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to deactivate user');
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: () => usersService.reactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User reactivated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reactivate user');
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: (password: string) => authService.setPassword(id!, password),
    onSuccess: () => {
      toast.success('Password updated');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set password');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => usersService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
      navigate('/admin/users');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  // Team Calendar mutations
  const createCalendarMutation = useMutation({
    mutationFn: (data: CreateTeamCalendarRequest) => {
      if (!currentWorkspace?.tenantId || !currentUser?.id) {
        throw new Error('Missing tenant or user context');
      }
      return teamCalendarService.create(currentWorkspace.tenantId, currentUser.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-team-calendars', id] });
      toast.success('Team calendar created');
      closeCalendarModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create calendar');
    },
  });

  const updateCalendarMutation = useMutation({
    mutationFn: ({ calendarId, data }: { calendarId: string; data: UpdateTeamCalendarRequest }) => {
      if (!currentUser?.id) {
        throw new Error('Missing user context');
      }
      return teamCalendarService.update(calendarId, currentUser.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-team-calendars', id] });
      toast.success('Team calendar updated');
      closeCalendarModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update calendar');
    },
  });

  const deleteCalendarMutation = useMutation({
    mutationFn: (calendarId: string) => {
      if (!currentUser?.id) {
        throw new Error('Missing user context');
      }
      return teamCalendarService.delete(calendarId, currentUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-team-calendars', id] });
      toast.success('Team calendar deleted');
      setShowDeleteCalendarConfirm(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete calendar');
    },
  });

  const loadLoginHistory = async () => {
    try {
      const data = await usersService.getLoginHistory(id!, 20);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLoginHistory(data as any);
    } catch (error) {
      console.error('Failed to load login history', error);
    }
  };

  const handleSave = () => {
    if (!formData.email?.trim()) {
      toast.error('Email is required');
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handleSetPassword = () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm the password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordMutation.mutate(newPassword);
  };

  const handleAddMembership = () => {
    if (!newMembershipTenantId) {
      toast.error('Please select a tenant');
      return;
    }
    if (newMembershipRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }
    createMembershipMutation.mutate({
      userId: id!,
      tenantId: newMembershipTenantId,
      roles: newMembershipRoles,
    });
  };

  const getRoleLabel = (role: AppRole): string => {
    const labels: Record<AppRole, string> = {
      [AppRole.Employee]: 'Employee',
      [AppRole.ViewOnly]: 'View Only',
      [AppRole.TeamLead]: 'Team Lead',
      [AppRole.ProjectManager]: 'Project Manager',
      [AppRole.ResourceManager]: 'Resource Manager',
      [AppRole.OfficeManager]: 'Office Manager',
      [AppRole.TenantAdmin]: 'Tenant Admin',
      [AppRole.Executive]: 'Executive',
      [AppRole.OverrideApprover]: 'Override Approver',
      [AppRole.SystemAdmin]: 'System Admin',
      [AppRole.Support]: 'Support',
      [AppRole.Auditor]: 'Auditor',
    };
    return labels[role] || 'Unknown';
  };

  const copyPermalink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Team Calendar helpers
  const getCalendarTypeLabel = (type: TeamCalendarType): string => {
    const labels: Record<number, string> = {
      0: 'Team',
      1: 'Manager',
      2: 'Department',
      3: 'Project',
    };
    return labels[type as number] || 'Unknown';
  };

  const openCreateCalendarModal = () => {
    setEditingCalendar(null);
    setCalendarFormData({
      name: '',
      description: '',
      type: 0 as TeamCalendarType,
      ownerUserId: id,
      isActive: true,
    });
    setShowCalendarModal(true);
  };

  const openEditCalendarModal = (calendar: TeamCalendarResponse) => {
    setEditingCalendar(calendar);
    setCalendarFormData({
      name: calendar.name,
      description: calendar.description || '',
      type: calendar.type,
      ownerUserId: calendar.ownerUserId,
      isActive: calendar.isActive,
    });
    setShowCalendarModal(true);
  };

  const closeCalendarModal = () => {
    setShowCalendarModal(false);
    setEditingCalendar(null);
    setCalendarFormData({
      name: '',
      description: '',
      type: 0 as TeamCalendarType,
      isActive: true,
    });
  };

  const handleSaveCalendar = () => {
    if (!calendarFormData.name?.trim()) {
      toast.error('Calendar name is required');
      return;
    }

    if (editingCalendar) {
      updateCalendarMutation.mutate({
        calendarId: editingCalendar.id,
        data: calendarFormData as UpdateTeamCalendarRequest,
      });
    } else {
      // Owner is already set in calendarFormData via openCreateCalendarModal
      createCalendarMutation.mutate(calendarFormData);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Not Found</h3>
              <p className="text-gray-500 mb-4">The user you're looking for doesn't exist or has been deleted.</p>
              <Link to="/admin/users">
                <Button variant="primary">Back to Users</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Get tenants this user is not already a member of
  const availableTenants = tenants.filter(
    t => !user.tenantMemberships?.some(m => m.tenantId === t.id)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/admin/users" className="hover:text-blue-600">Users</Link>
          <span>/</span>
          <span className="text-gray-900">{user.displayName}</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-semibold">
              {user.displayName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {!user.isActive ? (
                  <StatusBadge status="Deactivated" variant="danger" />
                ) : user.isSystemAdmin ? (
                  <StatusBadge status="System Admin" variant="warning" />
                ) : (
                  <StatusBadge status="Active" variant="success" />
                )}
                {user.tenantMemberships?.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {user.tenantMemberships.length} tenant{user.tenantMemberships.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={copyPermalink}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Link
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader
              title="Profile Information"
              action={
                !isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                ) : null
              }
            />
            <CardBody>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Display Name"
                      value={formData.displayName || ''}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    <Input
                      label="Phone Number"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                    <Input
                      label="Job Title"
                      value={formData.jobTitle || ''}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                    <Input
                      label="Department"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                    <PersonSelect
                      label="Manager"
                      value={formData.managerId}
                      onChange={(value) => setFormData({ ...formData, managerId: value })}
                      people={peopleOptions}
                      excludeId={id}
                      placeholder="Search for manager..."
                    />
                    <div>
                      <label htmlFor="home-office-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Home Office
                      </label>
                      <select
                        id="home-office-select"
                        value={formData.homeOfficeId || ''}
                        onChange={(e) => setFormData({ ...formData, homeOfficeId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No Home Office</option>
                        {offices.map((office) => (
                          <option key={office.id} value={office.id}>
                            {office.name} {office.city ? `(${office.city})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <PersonSelect
                      label="Executive Assistant"
                      value={formData.executiveAssistantId}
                      onChange={(value) => setFormData({ ...formData, executiveAssistantId: value })}
                      people={peopleOptions}
                      excludeId={id}
                      placeholder="Search for EA..."
                    />
                    <div className="md:col-span-2">
                      <MultiPersonSelect
                        label="Standard Delegates"
                        values={formData.standardDelegateIds || []}
                        onChange={(values) => setFormData({ ...formData, standardDelegateIds: values })}
                        people={peopleOptions}
                        excludeId={id}
                        placeholder="Search to add delegates..."
                      />
                    </div>
                    <Input
                      label="Entra Object ID"
                      value={formData.entraObjectId || ''}
                      onChange={(e) => setFormData({ ...formData, entraObjectId: e.target.value })}
                      placeholder="Azure AD / Entra ID"
                    />
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isSystemAdmin || false}
                          onChange={(e) => setFormData({ ...formData, isSystemAdmin: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">System Administrator</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.displayName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.phoneNumber || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.jobTitle || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.department || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Manager</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.managerId
                        ? peopleOptions.find((p) => p.id === user.managerId)?.displayName || user.managerId
                        : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Home Office</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.homeOfficeId
                        ? offices.find((o) => o.id === user.homeOfficeId)?.name || user.homeOfficeName || user.homeOfficeId
                        : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Executive Assistant</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.executiveAssistantId
                        ? peopleOptions.find((p) => p.id === user.executiveAssistantId)?.displayName || user.executiveAssistantId
                        : '-'}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Standard Delegates</dt>
                    <dd className="mt-1">
                      {user.standardDelegateIds && user.standardDelegateIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.standardDelegateIds.map((delegateId) => {
                            const delegate = peopleOptions.find((p) => p.id === delegateId);
                            return (
                              <span key={delegateId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {delegate?.displayName || delegateId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">-</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">System Admin</dt>
                    <dd className="mt-1">
                      <StatusBadge
                        status={user.isSystemAdmin ? 'Yes' : 'No'}
                        variant={user.isSystemAdmin ? 'warning' : 'default'}
                      />
                    </dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          {/* Tenant Memberships */}
          <Card>
            <CardHeader
              title="Tenant Memberships"
              subtitle={`${user.tenantMemberships?.length || 0} tenant${(user.tenantMemberships?.length || 0) !== 1 ? 's' : ''}`}
              action={
                availableTenants.length > 0 && (
                  <Button variant="primary" size="sm" onClick={() => setShowAddMembership(true)}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tenant
                  </Button>
                )
              }
            />
            <CardBody>
              {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
                <div className="space-y-4">
                  {user.tenantMemberships.map((membership: TenantMembership) => (
                    <div
                      key={membership.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
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
                          <div className="text-sm text-gray-500 mb-3">
                            Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                          </div>

                          {editingMembershipId === membership.id ? (
                            <div className="space-y-4 bg-white p-4 rounded-lg border">
                              <RoleTemplates
                                onSelectTemplate={setEditingRoles}
                                disabled={updateRolesMutation.isPending}
                              />
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                  <span className="px-2 bg-white text-gray-500">or customize</span>
                                </div>
                              </div>
                              <RoleSelector
                                selectedRoles={editingRoles}
                                onChange={setEditingRoles}
                                disabled={updateRolesMutation.isPending}
                              />
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => updateRolesMutation.mutate({ membershipId: membership.id, roles: editingRoles })}
                                  disabled={updateRolesMutation.isPending || editingRoles.length === 0}
                                >
                                  {updateRolesMutation.isPending ? 'Saving...' : 'Save Roles'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMembershipId(null);
                                    setEditingRoles([]);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {membership.roles?.map(role => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {getRoleLabel(role)}
                                </span>
                              ))}
                              {(!membership.roles || membership.roles.length === 0) && (
                                <span className="text-xs text-gray-400 italic">No roles assigned</span>
                              )}
                            </div>
                          )}
                        </div>

                        {editingMembershipId !== membership.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingMembershipId(membership.id);
                                setEditingRoles(membership.roles || []);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit roles"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                updateMembershipStatusMutation.mutate({
                                  membershipId: membership.id,
                                  isActive: !membership.isActive,
                                });
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                membership.isActive
                                  ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={membership.isActive ? 'Deactivate membership' : 'Activate membership'}
                            >
                              {membership.isActive ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${user.displayName} from ${membership.tenant?.name}?`)) {
                                  deleteMembershipMutation.mutate(membership.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove from tenant"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p>No tenant memberships</p>
                  {availableTenants.length > 0 && (
                    <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowAddMembership(true)}>
                      Add to Tenant
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Login History */}
          <Card>
            <CardHeader
              title="Login History"
              action={
                <Button variant="ghost" size="sm" onClick={loadLoginHistory}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Load History
                </Button>
              }
            />
            <CardBody>
              {loginHistory ? (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">{loginHistory.totalLogins}</div>
                      <div className="text-gray-500">Total Logins</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {loginHistory.lastSuccessfulAt
                          ? new Date(loginHistory.lastSuccessfulAt).toLocaleDateString()
                          : 'Never'}
                      </div>
                      <div className="text-gray-500">Last Success</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {loginHistory.lastFailedAt
                          ? new Date(loginHistory.lastFailedAt).toLocaleDateString()
                          : 'Never'}
                      </div>
                      <div className="text-gray-500">Last Failed</div>
                    </div>
                  </div>
                  {loginHistory.logins && loginHistory.logins.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">When</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Result</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">IP</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {loginHistory.logins.map((log) => (
                            <tr key={log.id}>
                              <td className="px-3 py-2 text-gray-900">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                <StatusBadge
                                  status={log.isSuccess ? 'Success' : 'Failed'}
                                  variant={log.isSuccess ? 'success' : 'danger'}
                                />
                              </td>
                              <td className="px-3 py-2 text-gray-700">{log.ipAddress || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Click "Load History" to view login activity</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Team Calendars */}
          <Card>
            <CardHeader
              title="Team Calendars Owned"
              subtitle={`${ownedCalendars.length} calendar${ownedCalendars.length !== 1 ? 's' : ''}`}
              action={
                <Button variant="primary" size="sm" onClick={openCreateCalendarModal}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Calendar
                </Button>
              }
            />
            <CardBody>
              {isLoadingCalendars ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>Loading calendars...</p>
                </div>
              ) : ownedCalendars.length > 0 ? (
                <div className="space-y-3">
                  {ownedCalendars.map((calendar) => (
                    <div
                      key={calendar.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{calendar.name}</span>
                            <StatusBadge
                              status={calendar.isActive ? 'Active' : 'Inactive'}
                              variant={calendar.isActive ? 'success' : 'default'}
                            />
                          </div>
                          {calendar.description && (
                            <p className="text-sm text-gray-600 mb-2">{calendar.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {getCalendarTypeLabel(calendar.type)}
                            </span>
                            <span className="text-gray-500">
                              {calendar.memberCount || 0} member{(calendar.memberCount || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditCalendarModal(calendar)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit calendar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteCalendarConfirm(calendar)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete calendar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No team calendars owned by this user</p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={openCreateCalendarModal}>
                    Create First Calendar
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">User ID</dt>
                  <dd className="mt-1 font-mono text-xs text-gray-700 break-all">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      status={user.isActive ? 'Active' : 'Deactivated'}
                      variant={user.isActive ? 'success' : 'danger'}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Login</dt>
                  <dd className="mt-1 text-gray-900">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="mt-1 text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="mt-1 text-gray-900">{new Date(user.updatedAt).toLocaleString()}</dd>
                </div>
                {user.entraObjectId && (
                  <div>
                    <dt className="text-gray-500">Entra Object ID</dt>
                    <dd className="mt-1 font-mono text-xs text-gray-700 break-all">{user.entraObjectId}</dd>
                  </div>
                )}
                {!user.isActive && user.deactivatedAt && (
                  <div>
                    <dt className="text-gray-500">Deactivated</dt>
                    <dd className="mt-1 text-gray-900">{new Date(user.deactivatedAt).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader title="Actions" />
            <CardBody>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Set Password
                </Button>

                {user.isActive && !user.isSystemAdmin ? (
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-orange-600 hover:bg-orange-50"
                    onClick={() => {
                      if (confirm(`Deactivate ${user.displayName}? This will prevent them from logging in.`)) {
                        deactivateUserMutation.mutate();
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
                    variant="secondary"
                    className="w-full justify-start text-green-600 hover:bg-green-50"
                    onClick={() => {
                      if (confirm(`Reactivate ${user.displayName}?`)) {
                        reactivateUserMutation.mutate();
                      }
                    }}
                    disabled={reactivateUserMutation.isPending}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {reactivateUserMutation.isPending ? 'Reactivating...' : 'Reactivate User'}
                  </Button>
                ) : null}

                {user.isSystemAdmin && (
                  <p className="text-xs text-gray-500 italic px-2">
                    System admins cannot be deactivated
                  </p>
                )}

                <div className="border-t my-3"></div>

                <Button
                  variant="secondary"
                  className="w-full justify-start text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete User
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add Tenant Membership Modal */}
      <Modal
        isOpen={showAddMembership}
        onClose={() => {
          setShowAddMembership(false);
          setNewMembershipTenantId('');
          setNewMembershipRoles([AppRole.Employee]);
        }}
        title="Add Tenant Access"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
            <select
              id="tenant-select"
              value={newMembershipTenantId}
              onChange={(e) => setNewMembershipTenantId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select tenant...</option>
              {availableTenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Template</label>
            <RoleTemplates
              onSelectTemplate={setNewMembershipRoles}
              disabled={createMembershipMutation.isPending}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Roles</label>
            <RoleSelector
              selectedRoles={newMembershipRoles}
              onChange={setNewMembershipRoles}
              disabled={createMembershipMutation.isPending}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowAddMembership(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddMembership}
            disabled={createMembershipMutation.isPending || !newMembershipTenantId || newMembershipRoles.length === 0}
          >
            {createMembershipMutation.isPending ? 'Adding...' : 'Add Tenant Access'}
          </Button>
        </div>
      </Modal>

      {/* Set Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Set Password"
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          <p className="text-sm text-gray-500">Password must be at least 8 characters.</p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSetPassword}
            disabled={setPasswordMutation.isPending}
          >
            {setPasswordMutation.isPending ? 'Setting...' : 'Set Password'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600">
                Deleting this user will permanently remove all their data, including tenant memberships and login history.
              </p>
            </div>
          </div>
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{user.displayName}</strong>?
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteUserMutation.mutate()}
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
          </Button>
        </div>
      </Modal>

      {/* Create/Edit Team Calendar Modal */}
      <Modal
        isOpen={showCalendarModal}
        onClose={closeCalendarModal}
        title={editingCalendar ? 'Edit Team Calendar' : 'Create Team Calendar'}
      >
        <div className="space-y-4">
          <Input
            label="Calendar Name"
            value={calendarFormData.name || ''}
            onChange={(e) => setCalendarFormData({ ...calendarFormData, name: e.target.value })}
            placeholder="e.g., Engineering Team Calendar"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={calendarFormData.description || ''}
              onChange={(e) => setCalendarFormData({ ...calendarFormData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label htmlFor="calendar-type" className="block text-sm font-medium text-gray-700 mb-1">Calendar Type</label>
            <select
              id="calendar-type"
              value={calendarFormData.type as number}
              onChange={(e) => setCalendarFormData({ ...calendarFormData, type: parseInt(e.target.value) as TeamCalendarType })}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>Team</option>
              <option value={1}>Manager</option>
              <option value={2}>Department</option>
              <option value={3}>Project</option>
            </select>
          </div>


          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={calendarFormData.isActive ?? true}
                onChange={(e) => setCalendarFormData({ ...calendarFormData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={closeCalendarModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveCalendar}
            disabled={createCalendarMutation.isPending || updateCalendarMutation.isPending || !calendarFormData.name?.trim()}
          >
            {createCalendarMutation.isPending || updateCalendarMutation.isPending
              ? 'Saving...'
              : editingCalendar
              ? 'Update Calendar'
              : 'Create Calendar'}
          </Button>
        </div>
      </Modal>

      {/* Delete Team Calendar Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteCalendarConfirm}
        onClose={() => setShowDeleteCalendarConfirm(null)}
        title="Delete Team Calendar"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600">
                Deleting this calendar will remove all member associations.
              </p>
            </div>
          </div>
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{showDeleteCalendarConfirm?.name}</strong>?
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteCalendarConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => showDeleteCalendarConfirm && deleteCalendarMutation.mutate(showDeleteCalendarConfirm.id)}
            disabled={deleteCalendarMutation.isPending}
          >
            {deleteCalendarMutation.isPending ? 'Deleting...' : 'Delete Calendar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

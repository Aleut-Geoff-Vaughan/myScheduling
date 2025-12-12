import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Modal, Input, Select, FormGroup, StatusBadge } from '../components/ui';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { assignmentsService } from '../services/assignmentsService';
import { projectAssignmentsService } from '../services/projectAssignmentsService';
import wbsService from '../services/wbsService';
import { useUsers } from '../hooks/useTenants';
import { useAuthStore } from '../stores/authStore';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';

export function AdminAssignmentsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({
    userId: '',
    projectAssignmentId: '',
    wbsElementId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    hoursPerWeek: 40,
    status: AssignmentStatus.Draft,
    tenantId: currentWorkspace?.tenantId || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['admin-assignments', currentWorkspace?.tenantId],
    queryFn: () => assignmentsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const { data: projectAssignments = [] } = useQuery({
    queryKey: ['admin-project-assignments', currentWorkspace?.tenantId],
    queryFn: () => projectAssignmentsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const { data: wbsResponse } = useQuery({
    queryKey: ['admin-wbs', currentWorkspace?.tenantId],
    queryFn: () => wbsService.getWbsElements({ pageSize: 1000 }),
  });

  const { data: users = [] } = useUsers();

  const wbsElements = wbsResponse?.items || [];

  const createMutation = useMutation({
    mutationFn: (assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) =>
      assignmentsService.create(assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('WBS assignment created successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create WBS assignment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, assignment }: { id: string; assignment: Assignment }) =>
      assignmentsService.update(id, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('WBS assignment updated successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update WBS assignment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assignmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('WBS assignment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete WBS assignment');
    },
  });

  const getStatusLabel = (status: AssignmentStatus): string => {
    switch (status) {
      case AssignmentStatus.Draft:
        return 'Draft';
      case AssignmentStatus.PendingApproval:
        return 'Pending Approval';
      case AssignmentStatus.Active:
        return 'Active';
      case AssignmentStatus.Completed:
        return 'Completed';
      case AssignmentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: AssignmentStatus): 'success' | 'warning' | 'default' | 'danger' => {
    switch (status) {
      case AssignmentStatus.Active:
        return 'success';
      case AssignmentStatus.PendingApproval:
        return 'warning';
      case AssignmentStatus.Completed:
        return 'default';
      case AssignmentStatus.Cancelled:
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: 'userId',
      header: 'User',
      sortable: true,
      render: (assignment) => {
        const user = users.find(u => u.id === assignment.userId);
        return (
          <div>
            <div className="font-medium text-gray-900">{user?.displayName || 'Unknown User'}</div>
            <div className="text-sm text-gray-500">{user?.email || '-'}</div>
          </div>
        );
      },
    },
    {
      key: 'wbsElementId',
      header: 'WBS Element',
      sortable: true,
      render: (assignment) => {
        const wbs = wbsElements.find(w => w.id === assignment.wbsElementId);
        return (
          <div>
            <div className="font-medium text-gray-900">{wbs?.code || 'Unknown WBS'}</div>
            <div className="text-sm text-gray-500 truncate max-w-xs">{wbs?.description || '-'}</div>
          </div>
        );
      },
    },
    {
      key: 'projectAssignmentId',
      header: 'Project Assignment',
      sortable: true,
      render: (assignment) => {
        if (!assignment.projectAssignmentId) return <span className="text-sm text-gray-400">None</span>;
        const projectAssignment = projectAssignments.find(pa => pa.id === assignment.projectAssignmentId);
        return (
          <span className="text-sm text-gray-600">
            {projectAssignment ? 'Linked' : 'Unknown'}
          </span>
        );
      },
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (assignment) => (
        <span className="text-sm">{new Date(assignment.startDate).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (assignment) => (
        <span className="text-sm">
          {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : 'Ongoing'}
        </span>
      ),
    },
    {
      key: 'hoursPerWeek',
      header: 'Hours/Week',
      sortable: true,
      render: (assignment) => (
        <span className="text-sm">{assignment.hoursPerWeek}h</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (assignment) => (
        <StatusBadge
          status={getStatusLabel(assignment.status)}
          variant={getStatusVariant(assignment.status)}
        />
      ),
    },
  ];

  const handleCreate = () => {
    setEditingAssignment(null);
    setFormData({
      userId: '',
      projectAssignmentId: '',
      wbsElementId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      hoursPerWeek: 40,
      status: AssignmentStatus.Draft,
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      ...assignment,
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate?.split('T')[0] || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = (assignment: Assignment) => {
    const user = users.find(u => u.id === assignment.userId);
    const wbs = wbsElements.find(w => w.id === assignment.wbsElementId);
    if (confirm(`Are you sure you want to delete the WBS assignment for ${user?.displayName} on ${wbs?.code}? This action cannot be undone.`)) {
      deleteMutation.mutate(assignment.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setFormData({
      userId: '',
      projectAssignmentId: '',
      wbsElementId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      hoursPerWeek: 40,
      status: AssignmentStatus.Draft,
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.userId) {
      errors.userId = 'User is required';
    }

    if (!formData.wbsElementId) {
      errors.wbsElementId = 'WBS element is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date must be after start date';
    }

    if (formData.hoursPerWeek && (formData.hoursPerWeek < 0 || formData.hoursPerWeek > 168)) {
      errors.hoursPerWeek = 'Hours per week must be between 0 and 168';
    }

    // Validate dates are within project assignment timeline (if linked)
    if (formData.projectAssignmentId) {
      const projectAssignment = projectAssignments.find(pa => pa.id === formData.projectAssignmentId);
      if (projectAssignment && formData.startDate) {
        const paStart = new Date(projectAssignment.startDate).toISOString().split('T')[0];
        if (formData.startDate < paStart) {
          errors.startDate = `Start date cannot be before project assignment start date (${new Date(projectAssignment.startDate).toLocaleDateString()})`;
        }

        if (projectAssignment.endDate && formData.endDate) {
          const paEnd = new Date(projectAssignment.endDate).toISOString().split('T')[0];
          if (formData.endDate > paEnd) {
            errors.endDate = `End date cannot be after project assignment end date (${new Date(projectAssignment.endDate).toLocaleDateString()})`;
          }
        }
      }
    }

    // Validate dates are within WBS element timeline
    const selectedWbs = wbsElements.find(w => w.id === formData.wbsElementId);
    if (selectedWbs && formData.startDate) {
      const wbsStart = new Date(selectedWbs.validFrom).toISOString().split('T')[0];
      if (formData.startDate < wbsStart) {
        errors.startDate = `Start date cannot be before WBS valid from date (${new Date(selectedWbs.validFrom).toLocaleDateString()})`;
      }

      if (selectedWbs.validTo && formData.endDate) {
        const wbsEnd = new Date(selectedWbs.validTo).toISOString().split('T')[0];
        if (formData.endDate > wbsEnd) {
          errors.endDate = `End date cannot be after WBS valid to date (${new Date(selectedWbs.validTo).toLocaleDateString()})`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingAssignment) {
      updateMutation.mutate({
        id: editingAssignment.id,
        assignment: {
          ...editingAssignment,
          ...formData,
          tenantId: currentWorkspace?.tenantId || '',
        } as Assignment,
      });
    } else {
      createMutation.mutate({
        ...formData,
        tenantId: currentWorkspace?.tenantId || '',
      } as Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading WBS assignments...</div>
        </div>
      </div>
    );
  }

  const selectedProjectAssignment = projectAssignments.find(pa => pa.id === formData.projectAssignmentId);
  const selectedWbs = wbsElements.find(w => w.id === formData.wbsElementId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WBS Assignments Management</h1>
        <p className="text-gray-600 mt-2">
          Manage Step 2: User assignments to WBS elements
        </p>
      </div>

      <Card>
        <CardHeader
          title="All WBS Assignments"
          subtitle={`${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'}`}
          action={
            <Button variant="primary" onClick={handleCreate}>
              + New WBS Assignment
            </Button>
          }
        />
        <div className="p-6">
          <DataTable
            data={assignments}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No WBS assignments found"
            searchPlaceholder="Search WBS assignments..."
            itemsPerPage={20}
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAssignment ? 'Edit WBS Assignment' : 'Create WBS Assignment'}
        size="lg"
      >
        <div className="space-y-4">
          <FormGroup label="User" error={formErrors.userId} required>
            <Select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              disabled={!!editingAssignment}
            >
              <option value="">Select a user...</option>
              {users.filter(u => u.isActive).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.email})
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup label="Project Assignment (Optional)" helpText="Link to a project assignment">
            <Select
              value={formData.projectAssignmentId || ''}
              onChange={(e) => setFormData({ ...formData, projectAssignmentId: e.target.value || undefined })}
            >
              <option value="">None (standalone assignment)</option>
              {projectAssignments
                .filter(pa => pa.userId === formData.userId)
                .map((pa) => {
                  const user = users.find(u => u.id === pa.userId);
                  return (
                    <option key={pa.id} value={pa.id}>
                      {user?.displayName} - {new Date(pa.startDate).toLocaleDateString()}
                    </option>
                  );
                })}
            </Select>
          </FormGroup>

          {selectedProjectAssignment && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <div><strong>Project Assignment Timeline:</strong></div>
              <div>
                Start: {new Date(selectedProjectAssignment.startDate).toLocaleDateString()}
                {selectedProjectAssignment.endDate && ` - End: ${new Date(selectedProjectAssignment.endDate).toLocaleDateString()}`}
              </div>
            </div>
          )}

          <FormGroup label="WBS Element" error={formErrors.wbsElementId} required>
            <Select
              value={formData.wbsElementId}
              onChange={(e) => setFormData({ ...formData, wbsElementId: e.target.value })}
              disabled={!!editingAssignment}
            >
              <option value="">Select a WBS element...</option>
              {wbsElements.map((wbs) => (
                <option key={wbs.id} value={wbs.id}>
                  {wbs.code} - {wbs.description}
                </option>
              ))}
            </Select>
          </FormGroup>

          {selectedWbs && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <div><strong>WBS Timeline:</strong></div>
              <div>
                Valid From: {new Date(selectedWbs.validFrom).toLocaleDateString()}
                {selectedWbs.validTo && ` - Valid To: ${new Date(selectedWbs.validTo).toLocaleDateString()}`}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Start Date" error={formErrors.startDate} required>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="End Date" error={formErrors.endDate} helpText="Leave blank for indefinite">
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </FormGroup>
          </div>

          <FormGroup label="Hours Per Week" error={formErrors.hoursPerWeek}>
            <Input
              type="number"
              min="0"
              max="168"
              value={formData.hoursPerWeek}
              onChange={(e) => setFormData({ ...formData, hoursPerWeek: parseFloat(e.target.value) || 0 })}
            />
          </FormGroup>

          <FormGroup label="Status" required>
            <Select
              value={formData.status?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) as AssignmentStatus })}
            >
              <option value={AssignmentStatus.Draft}>Draft</option>
              <option value={AssignmentStatus.PendingApproval}>Pending Approval</option>
              <option value={AssignmentStatus.Active}>Active</option>
              <option value={AssignmentStatus.Completed}>Completed</option>
              <option value={AssignmentStatus.Cancelled}>Cancelled</option>
            </Select>
          </FormGroup>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : editingAssignment
              ? 'Update Assignment'
              : 'Create Assignment'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

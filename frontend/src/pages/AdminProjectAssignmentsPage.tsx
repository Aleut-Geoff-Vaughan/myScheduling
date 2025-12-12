import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Modal, Input, Select, FormGroup, StatusBadge } from '../components/ui';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { projectAssignmentsService } from '../services/projectAssignmentsService';
import { projectsService } from '../services/projectsService';
import { useUsers } from '../hooks/useTenants';
import { useAuthStore } from '../stores/authStore';
import type { ProjectAssignment } from '../types/api';
import { ProjectAssignmentStatus } from '../types/api';

export function AdminProjectAssignmentsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);
  const [formData, setFormData] = useState<Partial<ProjectAssignment>>({
    projectId: '',
    userId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: ProjectAssignmentStatus.Draft,
    notes: '',
    tenantId: currentWorkspace?.tenantId || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: projectAssignments = [], isLoading } = useQuery({
    queryKey: ['admin-project-assignments', currentWorkspace?.tenantId],
    queryFn: () => projectAssignmentsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const { data: users = [] } = useUsers();

  const createMutation = useMutation({
    mutationFn: (assignment: Omit<ProjectAssignment, 'id' | 'createdAt' | 'updatedAt'>) =>
      projectAssignmentsService.create(assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment created successfully');
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create project assignment';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, assignment }: { id: string; assignment: ProjectAssignment }) =>
      projectAssignmentsService.update(id, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment updated successfully');
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update project assignment';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectAssignmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment deleted successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete project assignment';
      toast.error(message);
    },
  });

  const getStatusLabel = (status: ProjectAssignmentStatus): string => {
    switch (status) {
      case ProjectAssignmentStatus.Draft:
        return 'Draft';
      case ProjectAssignmentStatus.PendingApproval:
        return 'Pending Approval';
      case ProjectAssignmentStatus.Active:
        return 'Active';
      case ProjectAssignmentStatus.Completed:
        return 'Completed';
      case ProjectAssignmentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: ProjectAssignmentStatus): 'success' | 'warning' | 'default' | 'danger' => {
    switch (status) {
      case ProjectAssignmentStatus.Active:
        return 'success';
      case ProjectAssignmentStatus.PendingApproval:
        return 'warning';
      case ProjectAssignmentStatus.Completed:
        return 'default';
      case ProjectAssignmentStatus.Cancelled:
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: DataTableColumn<ProjectAssignment>[] = [
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
      key: 'projectId',
      header: 'Project',
      sortable: true,
      render: (assignment) => {
        const project = projects.find(p => p.id === assignment.projectId);
        return (
          <div>
            <div className="font-medium text-gray-900">{project?.name || 'Unknown Project'}</div>
            {project?.programCode && (
              <div className="text-sm text-gray-500">{project.programCode}</div>
            )}
          </div>
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
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (assignment) => (
        <span className="text-sm text-gray-500">{new Date(assignment.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingAssignment(null);
    setFormData({
      projectId: '',
      userId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: ProjectAssignmentStatus.Draft,
      notes: '',
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (assignment: ProjectAssignment) => {
    setEditingAssignment(assignment);
    setFormData({
      ...assignment,
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate?.split('T')[0] || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = (assignment: ProjectAssignment) => {
    const user = users.find(u => u.id === assignment.userId);
    const project = projects.find(p => p.id === assignment.projectId);
    if (confirm(`Are you sure you want to delete the project assignment for ${user?.displayName} on ${project?.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(assignment.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setFormData({
      projectId: '',
      userId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: ProjectAssignmentStatus.Draft,
      notes: '',
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.projectId) {
      errors.projectId = 'Project is required';
    }

    if (!formData.userId) {
      errors.userId = 'User is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date must be after start date';
    }

    // Validate dates are within project timeline
    const selectedProject = projects.find(p => p.id === formData.projectId);
    if (selectedProject && formData.startDate) {
      const projectStart = new Date(selectedProject.startDate).toISOString().split('T')[0];
      if (formData.startDate < projectStart) {
        errors.startDate = `Start date cannot be before project start date (${new Date(selectedProject.startDate).toLocaleDateString()})`;
      }

      if (selectedProject.endDate && formData.endDate) {
        const projectEnd = new Date(selectedProject.endDate).toISOString().split('T')[0];
        if (formData.endDate > projectEnd) {
          errors.endDate = `End date cannot be after project end date (${new Date(selectedProject.endDate).toLocaleDateString()})`;
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
        } as ProjectAssignment,
      });
    } else {
      createMutation.mutate({
        ...formData,
        tenantId: currentWorkspace?.tenantId || '',
      } as Omit<ProjectAssignment, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading project assignments...</div>
        </div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Project Assignments Management</h1>
        <p className="text-gray-600 mt-2">
          Manage Step 1: User assignments to projects
        </p>
      </div>

      <Card>
        <CardHeader
          title="All Project Assignments"
          subtitle={`${projectAssignments.length} ${projectAssignments.length === 1 ? 'assignment' : 'assignments'}`}
          action={
            <Button variant="primary" onClick={handleCreate}>
              + New Project Assignment
            </Button>
          }
        />
        <div className="p-6">
          <DataTable
            data={projectAssignments}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No project assignments found"
            searchPlaceholder="Search project assignments..."
            itemsPerPage={20}
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAssignment ? 'Edit Project Assignment' : 'Create Project Assignment'}
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

          <FormGroup label="Project" error={formErrors.projectId} required>
            <Select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              disabled={!!editingAssignment}
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.programCode && `(${project.programCode})`}
                </option>
              ))}
            </Select>
          </FormGroup>

          {selectedProject && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <div><strong>Project Timeline:</strong></div>
              <div>
                Start: {new Date(selectedProject.startDate).toLocaleDateString()}
                {selectedProject.endDate && ` - End: ${new Date(selectedProject.endDate).toLocaleDateString()}`}
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

          <FormGroup label="Status" required>
            <Select
              value={formData.status?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) as ProjectAssignmentStatus })}
            >
              <option value={ProjectAssignmentStatus.Draft}>Draft</option>
              <option value={ProjectAssignmentStatus.PendingApproval}>Pending Approval</option>
              <option value={ProjectAssignmentStatus.Active}>Active</option>
              <option value={ProjectAssignmentStatus.Completed}>Completed</option>
              <option value={ProjectAssignmentStatus.Cancelled}>Cancelled</option>
            </Select>
          </FormGroup>

          <FormGroup label="Notes">
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this assignment"
            />
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

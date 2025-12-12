import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Modal, Input, Select, FormGroup, StatusBadge } from '../components/ui';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { projectsService } from '../services/projectsService';
import { useAuthStore } from '../stores/authStore';
import type { Project } from '../types/api';
import { ProjectStatus } from '../types/api';

export function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    programCode: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.Active,
    tenantId: currentWorkspace?.tenantId || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const createMutation = useMutation({
    mutationFn: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
      projectsService.create(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, project }: { id: string; project: Project }) =>
      projectsService.update(id, project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully');
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update project';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete project';
      toast.error(message);
    },
  });

  const getStatusLabel = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.Active:
        return 'Active';
      case ProjectStatus.OnHold:
        return 'On Hold';
      case ProjectStatus.Completed:
        return 'Completed';
      case ProjectStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: ProjectStatus): 'success' | 'warning' | 'default' | 'danger' => {
    switch (status) {
      case ProjectStatus.Active:
        return 'success';
      case ProjectStatus.OnHold:
        return 'warning';
      case ProjectStatus.Completed:
        return 'default';
      case ProjectStatus.Cancelled:
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (project) => (
        <div>
          <div className="font-medium text-gray-900">{project.name}</div>
          {project.description && (
            <div className="text-sm text-gray-500 truncate max-w-md">{project.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'programCode',
      header: 'Program Code',
      sortable: true,
      render: (project) => (
        <span className="text-sm text-gray-900">{project.programCode || '-'}</span>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (project) => (
        <span className="text-sm">{new Date(project.startDate).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      render: (project) => (
        <span className="text-sm">
          {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (project) => (
        <StatusBadge
          status={getStatusLabel(project.status)}
          variant={getStatusVariant(project.status)}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (project) => (
        <span className="text-sm text-gray-500">{new Date(project.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      programCode: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: ProjectStatus.Active,
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      ...project,
      startDate: project.startDate.split('T')[0],
      endDate: project.endDate?.split('T')[0] || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(project.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      programCode: '',
      startDate: '',
      endDate: '',
      status: ProjectStatus.Active,
      tenantId: currentWorkspace?.tenantId || '',
    });
    setFormErrors({});
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Project name is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingProject) {
      updateMutation.mutate({
        id: editingProject.id,
        project: {
          ...editingProject,
          ...formData,
          tenantId: currentWorkspace?.tenantId || '',
        } as Project,
      });
    } else {
      createMutation.mutate({
        ...formData,
        tenantId: currentWorkspace?.tenantId || '',
      } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Projects Management</h1>
        <p className="text-gray-600 mt-2">
          Manage all projects in the system
        </p>
      </div>

      <Card>
        <CardHeader
          title="All Projects"
          subtitle={`${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
          action={
            <Button variant="primary" onClick={handleCreate}>
              + New Project
            </Button>
          }
        />
        <div className="p-6">
          <DataTable
            data={projects}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No projects found"
            searchPlaceholder="Search projects..."
            itemsPerPage={20}
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingProject ? 'Edit Project' : 'Create Project'}
        size="lg"
      >
        <div className="space-y-4">
          <FormGroup label="Project Name" error={formErrors.name} required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Website Redesign"
            />
          </FormGroup>

          <FormGroup label="Description">
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional project description"
            />
          </FormGroup>

          <FormGroup label="Program Code">
            <Input
              value={formData.programCode || ''}
              onChange={(e) => setFormData({ ...formData, programCode: e.target.value })}
              placeholder="e.g., PRJ-2024-001"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Start Date" error={formErrors.startDate} required>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="End Date" error={formErrors.endDate}>
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
              onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) as ProjectStatus })}
            >
              <option value={ProjectStatus.Active}>Active</option>
              <option value={ProjectStatus.OnHold}>On Hold</option>
              <option value={ProjectStatus.Completed}>Completed</option>
              <option value={ProjectStatus.Cancelled}>Cancelled</option>
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
              : editingProject
              ? 'Update Project'
              : 'Create Project'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

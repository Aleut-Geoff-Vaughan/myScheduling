import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Modal, Input, Select, FormGroup, StatusBadge } from '../components/ui';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import wbsService, { type CreateWbsRequest, type UpdateWbsRequest } from '../services/wbsService';
import { projectsService } from '../services/projectsService';
import { useAuthStore } from '../stores/authStore';
import type { WbsElement } from '../types/api';
import { WbsType, WbsApprovalStatus } from '../types/api';

export function AdminWbsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace, user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingWbs, setEditingWbs] = useState<WbsElement | null>(null);
  const [formData, setFormData] = useState<Partial<CreateWbsRequest>>({
    projectId: '',
    code: '',
    description: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    type: WbsType.TaskOrder,
    ownerUserId: user?.id || '',
    approverUserId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: wbsResponse, isLoading } = useQuery({
    queryKey: ['admin-wbs', currentWorkspace?.tenantId],
    queryFn: () => wbsService.getWbsElements({ pageSize: 1000 }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
  });

  const wbsElements = wbsResponse?.items || [];

  const createMutation = useMutation({
    mutationFn: (wbs: CreateWbsRequest) => wbsService.createWbs(wbs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wbs'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      toast.success('WBS element created successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create WBS element');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWbsRequest }) =>
      wbsService.updateWbs(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wbs'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      toast.success('WBS element updated successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update WBS element');
    },
  });

  const getWbsTypeLabel = (type: WbsType): string => {
    switch (type) {
      case WbsType.TaskOrder:
        return 'Task Order';
      case WbsType.ProjectCode:
        return 'Project Code';
      case WbsType.SubTask:
        return 'Sub Task';
      case WbsType.Internal:
        return 'Internal';
      default:
        return 'Unknown';
    }
  };

  const getApprovalStatusLabel = (status: WbsApprovalStatus): string => {
    switch (status) {
      case WbsApprovalStatus.Draft:
        return 'Draft';
      case WbsApprovalStatus.PendingApproval:
        return 'Pending';
      case WbsApprovalStatus.Approved:
        return 'Approved';
      case WbsApprovalStatus.Rejected:
        return 'Rejected';
      case WbsApprovalStatus.Suspended:
        return 'Suspended';
      case WbsApprovalStatus.Closed:
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const getApprovalStatusVariant = (status: WbsApprovalStatus): 'success' | 'warning' | 'default' | 'danger' => {
    switch (status) {
      case WbsApprovalStatus.Approved:
        return 'success';
      case WbsApprovalStatus.PendingApproval:
        return 'warning';
      case WbsApprovalStatus.Rejected:
      case WbsApprovalStatus.Suspended:
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: DataTableColumn<WbsElement>[] = [
    {
      key: 'code',
      header: 'WBS Code',
      sortable: true,
      render: (wbs) => (
        <div>
          <div className="font-medium text-gray-900">{wbs.code}</div>
          <div className="text-sm text-gray-500">{getWbsTypeLabel(wbs.type)}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (wbs) => (
        <div className="max-w-md">
          <div className="text-sm text-gray-900 truncate">{wbs.description}</div>
        </div>
      ),
    },
    {
      key: 'projectId',
      header: 'Project',
      sortable: true,
      render: (wbs) => {
        const project = projects.find(p => p.id === wbs.projectId);
        return (
          <span className="text-sm text-gray-900">{project?.name || 'Unknown Project'}</span>
        );
      },
    },
    {
      key: 'validFrom',
      header: 'Valid From',
      sortable: true,
      render: (wbs) => (
        <span className="text-sm">{new Date(wbs.validFrom).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'validTo',
      header: 'Valid To',
      sortable: true,
      render: (wbs) => (
        <span className="text-sm">
          {wbs.validTo ? new Date(wbs.validTo).toLocaleDateString() : 'Ongoing'}
        </span>
      ),
    },
    {
      key: 'approvalStatus',
      header: 'Status',
      sortable: true,
      render: (wbs) => (
        <StatusBadge
          status={getApprovalStatusLabel(wbs.approvalStatus)}
          variant={getApprovalStatusVariant(wbs.approvalStatus)}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (wbs) => (
        <span className="text-sm text-gray-500">{new Date(wbs.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingWbs(null);
    setFormData({
      projectId: '',
      code: '',
      description: '',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      type: WbsType.TaskOrder,
      ownerUserId: user?.id || '',
      approverUserId: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (wbs: WbsElement) => {
    setEditingWbs(wbs);
    setFormData({
      projectId: wbs.projectId,
      code: wbs.code,
      description: wbs.description,
      validFrom: wbs.validFrom.split('T')[0],
      validTo: wbs.validTo?.split('T')[0] || '',
      type: wbs.type,
      ownerUserId: wbs.ownerUserId || '',
      approverUserId: wbs.approverUserId || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWbs(null);
    setFormData({
      projectId: '',
      code: '',
      description: '',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      type: WbsType.TaskOrder,
      ownerUserId: user?.id || '',
      approverUserId: '',
    });
    setFormErrors({});
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.projectId?.trim()) {
      errors.projectId = 'Project is required';
    }

    if (!formData.code?.trim()) {
      errors.code = 'WBS code is required';
    }

    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.validFrom) {
      errors.validFrom = 'Valid from date is required';
    }

    if (formData.validTo && formData.validFrom && formData.validTo < formData.validFrom) {
      errors.validTo = 'Valid to date must be after valid from date';
    }

    // Validate dates are within project timeline
    const selectedProject = projects.find(p => p.id === formData.projectId);
    if (selectedProject && formData.validFrom) {
      const projectStart = new Date(selectedProject.startDate).toISOString().split('T')[0];
      if (formData.validFrom < projectStart) {
        errors.validFrom = `Valid from date cannot be before project start date (${new Date(selectedProject.startDate).toLocaleDateString()})`;
      }

      if (selectedProject.endDate && formData.validTo) {
        const projectEnd = new Date(selectedProject.endDate).toISOString().split('T')[0];
        if (formData.validTo > projectEnd) {
          errors.validTo = `Valid to date cannot be after project end date (${new Date(selectedProject.endDate).toLocaleDateString()})`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingWbs) {
      const updateData: UpdateWbsRequest = {
        description: formData.description,
        validFrom: formData.validFrom,
        validTo: formData.validTo || undefined,
        type: formData.type,
        ownerUserId: formData.ownerUserId || undefined,
        approverUserId: formData.approverUserId || undefined,
      };
      updateMutation.mutate({ id: editingWbs.id, data: updateData });
    } else {
      createMutation.mutate(formData as CreateWbsRequest);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading WBS elements...</div>
        </div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WBS Elements Management</h1>
        <p className="text-gray-600 mt-2">
          Manage all Work Breakdown Structure elements in the system
        </p>
      </div>

      <Card>
        <CardHeader
          title="All WBS Elements"
          subtitle={`${wbsElements.length} ${wbsElements.length === 1 ? 'element' : 'elements'}`}
          action={
            <Button variant="primary" onClick={handleCreate}>
              + New WBS Element
            </Button>
          }
        />
        <div className="p-6">
          <DataTable
            data={wbsElements}
            columns={columns}
            onEdit={handleEdit}
            emptyMessage="No WBS elements found"
            searchPlaceholder="Search WBS elements..."
            itemsPerPage={20}
          />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingWbs ? 'Edit WBS Element' : 'Create WBS Element'}
        size="lg"
      >
        <div className="space-y-4">
          <FormGroup label="Project" error={formErrors.projectId} required>
            <Select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              disabled={!!editingWbs}
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

          <FormGroup label="WBS Code" error={formErrors.code} required>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., TO-2024-001"
              disabled={!!editingWbs}
            />
          </FormGroup>

          <FormGroup label="Description" error={formErrors.description} required>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="WBS element description"
            />
          </FormGroup>

          <FormGroup label="Type" required>
            <Select
              value={formData.type?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) as WbsType })}
            >
              <option value={WbsType.TaskOrder}>Task Order</option>
              <option value={WbsType.ProjectCode}>Project Code</option>
              <option value={WbsType.SubTask}>Sub Task</option>
              <option value={WbsType.Internal}>Internal</option>
            </Select>
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Valid From" error={formErrors.validFrom} required>
              <Input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Valid To" error={formErrors.validTo} helpText="Leave blank for ongoing">
              <Input
                type="date"
                value={formData.validTo || ''}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
              />
            </FormGroup>
          </div>
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
              : editingWbs
              ? 'Update WBS Element'
              : 'Create WBS Element'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

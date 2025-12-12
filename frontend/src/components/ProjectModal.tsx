import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { projectsService } from '../services/projectsService';
import { groupService } from '../services/groupService';
import type { Project } from '../types/api';
import { ProjectStatus } from '../types/api';
import { useTenants } from '../hooks/useTenants';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  mode: 'create' | 'edit';
}

export function ProjectModal({ isOpen, onClose, project, mode }: ProjectModalProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: approverGroups = [] } = useQuery({
    queryKey: ['groups', 'active'],
    queryFn: () => groupService.list({ isActive: true }),
    staleTime: 60_000,
  });

  // Initialize form data with useMemo to avoid setState in useEffect
  const initialFormData = useMemo(() => {
    if (project && mode === 'edit') {
      return {
        tenantId: project.tenantId,
        name: project.name,
        programCode: project.programCode || '',
        customer: project.customer || '',
        startDate: project.startDate.split('T')[0],
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        status: project.status,
        approverGroupId: (project as Project & { approverGroupId?: string }).approverGroupId || '',
      };
    } else if (mode === 'create' && tenants.length > 0) {
      return {
        tenantId: tenants[0].id,
        name: '',
        programCode: '',
        customer: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: ProjectStatus.Draft,
        approverGroupId: '',
      };
    }
    return {
      tenantId: '',
      name: '',
      programCode: '',
      customer: '',
      startDate: '',
      endDate: '',
      status: ProjectStatus.Draft,
      approverGroupId: '',
    };
  }, [project, mode, tenants]);

  const [formData, setFormData] = useState(initialFormData);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update formData when initialFormData changes
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
      projectsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to create project' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Project) => projectsService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to update project' });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.name.trim()) newErrors.name = 'Project name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const projectData = {
      ...formData,
      startDate: formData.startDate + 'T00:00:00',
      endDate: formData.endDate ? formData.endDate + 'T00:00:00' : undefined,
      approverGroupId: formData.approverGroupId || undefined,
    };

    if (mode === 'create') {
      createMutation.mutate(projectData);
    } else if (project) {
      updateMutation.mutate({ ...project, ...projectData });
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const tenantOptions = tenants.map(t => ({
    value: t.id,
    label: `${t.name} (${t.code})`,
  }));

  const statusOptions = [
    { value: ProjectStatus.Draft.toString(), label: 'Draft' },
    { value: ProjectStatus.Active.toString(), label: 'Active' },
    { value: ProjectStatus.Completed.toString(), label: 'Completed' },
    { value: ProjectStatus.OnHold.toString(), label: 'On Hold' },
    { value: ProjectStatus.Cancelled.toString(), label: 'Cancelled' },
  ];
  const approverGroupOptions = [{ value: '', label: 'None' }].concat(
    approverGroups.map((g) => ({ value: g.id, label: g.name }))
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Project' : 'Edit Project'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <FormGroup columns={1}>
          <Select
            label="Tenant"
            options={tenantOptions}
            value={formData.tenantId}
            onChange={(e) => handleChange('tenantId', e.target.value)}
            error={errors.tenantId}
            required
            disabled={mode === 'edit'}
          />
        </FormGroup>

        <FormGroup columns={1} className="mt-4">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            placeholder="e.g., Alaska Native Health System"
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="Program Code"
            value={formData.programCode}
            onChange={(e) => handleChange('programCode', e.target.value)}
            placeholder="e.g., PROG-2024-001"
          />
          <Input
            label="Customer"
            value={formData.customer}
            onChange={(e) => handleChange('customer', e.target.value)}
            placeholder="e.g., Federal Agency"
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            error={errors.startDate}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            error={errors.endDate}
            helper="Leave empty if ongoing"
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Select
            label="Status"
            options={statusOptions}
            value={formData.status.toString()}
            onChange={(e) => handleChange('status', parseInt(e.target.value))}
            required
          />
          <Select
            label="Approver Group"
            options={approverGroupOptions}
            value={formData.approverGroupId}
            onChange={(e) => handleChange('approverGroupId', e.target.value)}
          />
        </FormGroup>
      </form>
    </Modal>
  );
}

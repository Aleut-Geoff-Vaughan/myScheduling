import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { assignmentsService } from '../services/assignmentsService';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';
import { useTenants, useUsers } from '../hooks/useTenants';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment?: Assignment;
  mode: 'create' | 'edit';
}

export function AssignmentModal({ isOpen, onClose, assignment, mode }: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: users = [] } = useUsers();

  const [formData, setFormData] = useState({
    tenantId: '',
    userId: '',
    wbsElementId: '',
    projectRoleId: '',
    startDate: '',
    endDate: '',
    allocation: 100,
    status: AssignmentStatus.Draft,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (assignment && mode === 'edit') {
      setFormData({
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        wbsElementId: assignment.wbsElementId,
        projectRoleId: assignment.projectRoleId || '',
        startDate: assignment.startDate.split('T')[0],
        endDate: assignment.endDate?.split('T')[0] || '',
        allocation: assignment.allocation || 100,
        status: assignment.status,
      });
    } else {
      // Set default tenant if available
      setFormData(prev => ({
        ...prev,
        tenantId: tenants[0]?.id || '',
        startDate: new Date().toISOString().split('T')[0],
      }));
    }
  }, [assignment, mode, tenants]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'approvedByUserId'>) =>
      assignmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to create assignment' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Assignment) => assignmentsService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to update assignment' });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.userId) newErrors.userId = 'User is required';
    if (!formData.wbsElementId.trim()) newErrors.wbsElementId = 'WBS Element ID is required';
    if (!formData.projectRoleId.trim()) newErrors.projectRoleId = 'Project Role ID is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.allocation < 0 || formData.allocation > 100) {
      newErrors.allocation = 'Allocation must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const assignmentData = {
      ...formData,
      startDate: formData.startDate + 'T00:00:00',
      endDate: formData.endDate + 'T00:00:00',
    };

    if (mode === 'create') {
      createMutation.mutate(assignmentData);
    } else if (assignment) {
      updateMutation.mutate({ ...assignment, ...assignmentData });
    }
  };

  const handleChange = (field: string, value: any) => {
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

  const personOptions = users.map(p => ({
    value: p.id,
    label: `${p.displayName} - ${p.email}`,
  }));

  const statusOptions = [
    { value: AssignmentStatus.Draft.toString(), label: 'Draft' },
    { value: AssignmentStatus.PendingApproval.toString(), label: 'Pending Approval' },
    { value: AssignmentStatus.Active.toString(), label: 'Active' },
    { value: AssignmentStatus.Completed.toString(), label: 'Completed' },
    { value: AssignmentStatus.Cancelled.toString(), label: 'Cancelled' },
  ];

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Assignment' : 'Edit Assignment'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Assignment' : 'Save Changes'}
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
          <Select
            label="User"
            options={personOptions}
            value={formData.userId}
            onChange={(e) => handleChange('userId', e.target.value)}
            error={errors.userId}
            required
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="WBS Element ID"
            value={formData.wbsElementId}
            onChange={(e) => handleChange('wbsElementId', e.target.value)}
            error={errors.wbsElementId}
            required
            placeholder="Enter WBS Element UUID"
            helper="UUID of the WBS element from the project"
          />
          <Input
            label="Project Role ID"
            value={formData.projectRoleId}
            onChange={(e) => handleChange('projectRoleId', e.target.value)}
            error={errors.projectRoleId}
            required
            placeholder="Enter Project Role UUID"
            helper="UUID of the project role"
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
            required
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="Allocation (%)"
            type="number"
            min="0"
            max="100"
            value={formData.allocation}
            onChange={(e) => handleChange('allocation', parseInt(e.target.value) || 0)}
            error={errors.allocation}
            required
            helper="Percentage of time allocated (0-100)"
          />
          <Select
            label="Status"
            options={statusOptions}
            value={formData.status.toString()}
            onChange={(e) => handleChange('status', parseInt(e.target.value))}
            required
          />
        </FormGroup>
      </form>
    </Modal>
  );
}

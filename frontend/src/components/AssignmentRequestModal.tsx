import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { projectsService } from '../services/projectsService';
import wbsService from '../services/wbsService';
import { groupService } from '../services/groupService';
import { useAuthStore } from '../stores/authStore';
import type { CreateAssignmentRequest } from '../services/assignmentRequestService';

interface AssignmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateAssignmentRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function AssignmentRequestModal({ isOpen, onClose, onSubmit, isSubmitting = false }: AssignmentRequestModalProps) {
  const { user, currentWorkspace } = useAuthStore();

  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    projectId: '',
    wbsElementId: undefined,
    projectRoleId: undefined,
    tenantId: currentWorkspace?.tenantId,
    requestedForUserId: user?.id,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    allocationPct: 100,
    notes: '',
    approverGroupId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId && isOpen,
  });

  // Fetch WBS elements for selected project
  const { data: wbsResponse } = useQuery({
    queryKey: ['wbs', formData.projectId],
    queryFn: () => wbsService.getWbsElements({ projectId: formData.projectId, pageSize: 100 }),
    enabled: !!formData.projectId && isOpen,
  });

  const wbsElements = wbsResponse?.items || [];

  // Fetch approver groups
  const { data: approverGroups = [] } = useQuery({
    queryKey: ['groups', currentWorkspace?.tenantId, 'active'],
    queryFn: () => groupService.list({ tenantId: currentWorkspace?.tenantId, isActive: true }),
    enabled: !!currentWorkspace?.tenantId && isOpen,
  });

  const defaultFormData = useMemo(() => ({
   
    projectId: '',
    wbsElementId: undefined,
    projectRoleId: undefined,
    tenantId: currentWorkspace?.tenantId,
    requestedForUserId: user?.id,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    allocationPct: 100,
    notes: '',
    approverGroupId: undefined,
  }), [currentWorkspace?.tenantId, user?.id]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(defaultFormData);
      setErrors({});
    }
  }, [isOpen, defaultFormData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.allocationPct < 1 || formData.allocationPct > 200) {
      newErrors.allocationPct = 'Allocation must be between 1 and 200';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const requestData: CreateAssignmentRequest = {
      ...formData,
      projectId: formData.projectId, // Convert string to Guid on backend
      wbsElementId: formData.wbsElementId,
      projectRoleId: formData.projectRoleId,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      approverGroupId: formData.approverGroupId,
    };

    await onSubmit(requestData);
    onClose();
  };

  const handleChange = (field: keyof CreateAssignmentRequest, value: string | number | undefined) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Reset WBS when project changes
      if (field === 'projectId') {
        updated.wbsElementId = undefined;
      }

      return updated;
    });

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: `${p.name} (${p.programCode})`,
  }));

  const wbsOptions = wbsElements.map(w => ({
    value: w.id,
    label: `${w.code} - ${w.description}`,
  }));

  const approverGroupOptions = approverGroups.map(g => ({
    value: g.id,
    label: g.name,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Assignment"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
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
            label="Project"
            options={projectOptions}
            value={formData.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            error={errors.projectId}
            required
          />
        </FormGroup>

        {formData.projectId && wbsElements.length > 0 && (
          <FormGroup columns={1} className="mt-4">
            <Select
              label="WBS Element (Optional)"
              options={wbsOptions}
              value={formData.wbsElementId || ''}
              onChange={(e) => handleChange('wbsElementId', e.target.value || undefined)}
              helper="Leave empty if requesting at project level"
            />
          </FormGroup>
        )}

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
            min="1"
            max="200"
            value={formData.allocationPct}
            onChange={(e) => handleChange('allocationPct', parseInt(e.target.value) || 100)}
            error={errors.allocationPct}
            required
            helper="Percentage of time (1-200%)"
          />
          <Select
            label="Approver Group (Optional)"
            options={approverGroupOptions}
            value={formData.approverGroupId || ''}
            onChange={(e) => handleChange('approverGroupId', e.target.value || undefined)}
            helper="Leave empty to route to system admins"
          />
        </FormGroup>

        <FormGroup columns={1} className="mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional information about this request..."
            />
          </div>
        </FormGroup>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This request will be sent to{' '}
            {formData.approverGroupId
              ? approverGroups.find(g => g.id === formData.approverGroupId)?.name || 'the selected approver group'
              : 'system administrators'}{' '}
            for approval.
          </p>
        </div>
      </form>
    </Modal>
  );
}

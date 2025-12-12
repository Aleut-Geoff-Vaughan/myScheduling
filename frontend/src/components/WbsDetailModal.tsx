import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup, StatusBadge, Card, CardBody } from './ui';
import wbsService from '../services/wbsService';
import { projectsService } from '../services/projectsService';
import { groupService } from '../services/groupService';
import type { WbsElement, WorkflowRequest } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { WbsType, WbsApprovalStatus } from '../types/api';

interface WbsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  wbs?: WbsElement;
  mode: 'create' | 'edit' | 'view';
}

export function WbsDetailModal({ isOpen, onClose, wbs, mode }: WbsDetailModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showWorkflowAction, setShowWorkflowAction] = useState(false);
  const [workflowNotes, setWorkflowNotes] = useState('');
  const { data: approverGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['wbs-history', wbs?.id],
    queryFn: () => wbsService.getWbsHistory(wbs!.id),
    enabled: !!wbs?.id && activeTab === 'history',
  });

  // Initialize form data with useMemo to avoid setState in useEffect
  const initialFormData = useMemo(() => {
    if (wbs && (mode === 'edit' || mode === 'view')) {
      return {
        projectId: wbs.projectId,
        code: wbs.code,
        description: wbs.description,
        validFrom: wbs.validFrom.split('T')[0],
        validTo: wbs.validTo ? wbs.validTo.split('T')[0] : '',
        type: wbs.type,
        ownerUserId: wbs.ownerUserId || '',
        approverUserId: wbs.approverUserId || '',
        approverGroupId: wbs.approverGroupId || '',
      };
    } else if (mode === 'create' && projects.length > 0) {
      return {
        projectId: projects[0].id,
        code: '',
        description: '',
        validFrom: '',
        validTo: '',
        type: WbsType.TaskOrder,
        ownerUserId: '',
        approverUserId: '',
        approverGroupId: '',
      };
    }
    return {
      projectId: '',
      code: '',
      description: '',
      validFrom: '',
      validTo: '',
      type: WbsType.TaskOrder,
      ownerUserId: '',
      approverUserId: '',
      approverGroupId: '',
    };
  }, [wbs, mode, projects]);

  const [formData, setFormData] = useState(initialFormData);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update formData when initialFormData changes
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<WbsElement, 'id' | 'tenantId' | 'approvalStatus' | 'approvalNotes' | 'createdAt' | 'updatedAt'>) =>
      wbsService.createWbs(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to create WBS element' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WbsElement>) => wbsService.updateWbs(wbs!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to update WBS element' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (request: WorkflowRequest) => wbsService.submitForApproval(wbs!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      setShowWorkflowAction(false);
      setWorkflowNotes('');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (request: WorkflowRequest) => wbsService.approveWbs(wbs!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      setShowWorkflowAction(false);
      setWorkflowNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (request: WorkflowRequest) => wbsService.rejectWbs(wbs!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      setShowWorkflowAction(false);
      setWorkflowNotes('');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (request: WorkflowRequest) => wbsService.suspendWbs(wbs!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      setShowWorkflowAction(false);
      setWorkflowNotes('');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (request: WorkflowRequest) => wbsService.closeWbs(wbs!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      setShowWorkflowAction(false);
      setWorkflowNotes('');
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.code.trim()) newErrors.code = 'WBS code is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.validFrom) newErrors.validFrom = 'Valid from date is required';
    if (formData.validTo && formData.validTo < formData.validFrom) {
      newErrors.validTo = 'Valid to date must be after valid from date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const wbsData = {
      ...formData,
      validFrom: formData.validFrom + 'T00:00:00',
      validTo: formData.validTo ? formData.validTo + 'T00:00:00' : undefined,
    };

    if (mode === 'create') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(wbsData as any);
    } else if (mode === 'edit' && wbs) {
      updateMutation.mutate(wbsData);
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

  const handleWorkflowAction = (action: 'submit' | 'approve' | 'reject' | 'suspend' | 'close') => {
    const request: WorkflowRequest = { notes: workflowNotes || undefined, userId: user?.id || '' };

    switch (action) {
      case 'submit':
        submitMutation.mutate(request);
        break;
      case 'approve':
        approveMutation.mutate(request);
        break;
      case 'reject':
        rejectMutation.mutate(request);
        break;
      case 'suspend':
        suspendMutation.mutate(request);
        break;
      case 'close':
        closeMutation.mutate(request);
        break;
    }
  };

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: `${p.name} (${p.programCode || 'No Code'})`,
  }));

  const typeOptions = [
    { value: WbsType.TaskOrder.toString(), label: 'Task Order' },
    { value: WbsType.ProjectCode.toString(), label: 'Project Code' },
    { value: WbsType.SubTask.toString(), label: 'Sub Task' },
    { value: WbsType.Internal.toString(), label: 'Internal' },
  ];
  const approverGroupOptions = [{ value: '', label: 'None' }].concat(
    approverGroups.map((g) => ({ value: g.id, label: g.name }))
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isReadOnly = mode === 'view';

  const getApprovalStatusLabel = (status: WbsApprovalStatus): string => {
    switch (status) {
      case WbsApprovalStatus.Draft: return 'Draft';
      case WbsApprovalStatus.PendingApproval: return 'Pending Approval';
      case WbsApprovalStatus.Approved: return 'Approved';
      case WbsApprovalStatus.Rejected: return 'Rejected';
      case WbsApprovalStatus.Suspended: return 'Suspended';
      case WbsApprovalStatus.Closed: return 'Closed';
      default: return 'Unknown';
    }
  };

  const getApprovalStatusVariant = (status: WbsApprovalStatus): 'success' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case WbsApprovalStatus.Approved: return 'success';
      case WbsApprovalStatus.PendingApproval: return 'warning';
      case WbsApprovalStatus.Draft: return 'info';
      default: return 'default';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New WBS Element' : mode === 'edit' ? 'Edit WBS Element' : 'WBS Element Details'}
      size="xl"
      footer={
        mode === 'view' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {wbs && wbs.approvalStatus === WbsApprovalStatus.Draft && (
              <Button variant="primary" onClick={() => {
                setShowWorkflowAction(true);
              }}>
                Submit for Approval
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create WBS Element' : 'Save Changes'}
            </Button>
          </>
        )
      }
    >
      {mode === 'view' && wbs && (
        <div className="mb-4">
          <div className="flex gap-2 border-b">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('history')}
            >
              Change History
            </button>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {mode === 'view' && wbs && (
            <Card className="mb-4">
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Approval Status</span>
                  <StatusBadge
                    status={getApprovalStatusLabel(wbs.approvalStatus)}
                    variant={getApprovalStatusVariant(wbs.approvalStatus)}
                  />
                </div>
                {wbs.approvalNotes && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Notes: </span>
                    <span className="text-sm text-gray-900">{wbs.approvalNotes}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <FormGroup columns={1}>
            <Select
              label="Project"
              options={projectOptions}
              value={formData.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              error={errors.projectId}
              required
              disabled={isReadOnly || mode === 'edit'}
            />
          </FormGroup>

          <FormGroup columns={2} className="mt-4">
            <Input
              label="WBS Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              error={errors.code}
              required
              placeholder="e.g., WBS-001"
              disabled={isReadOnly}
            />
            <Select
              label="Type"
              options={typeOptions}
              value={formData.type.toString()}
              onChange={(e) => handleChange('type', parseInt(e.target.value))}
              required
              disabled={isReadOnly}
            />
          </FormGroup>

          <FormGroup columns={1} className="mt-4">
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={errors.description}
              required
              placeholder="Brief description of this WBS element"
              disabled={isReadOnly}
            />
          </FormGroup>

          <FormGroup columns={2} className="mt-4">
            <Input
              label="Valid From"
              type="date"
              value={formData.validFrom}
              onChange={(e) => handleChange('validFrom', e.target.value)}
              error={errors.validFrom}
              required
              disabled={isReadOnly}
            />
            <Input
              label="Valid To"
              type="date"
              value={formData.validTo}
              onChange={(e) => handleChange('validTo', e.target.value)}
              error={errors.validTo}
              helper="Leave empty for indefinite"
              disabled={isReadOnly}
            />
          </FormGroup>
          <FormGroup columns={2} className="mt-4">
            <Input
              label="Approver (User ID)"
              placeholder="Optional user approver"
              value={formData.approverUserId}
              onChange={(e) => handleChange('approverUserId', e.target.value)}
              disabled={isReadOnly}
            />
            <Select
              label="Approver Group"
              options={approverGroupOptions}
              value={formData.approverGroupId}
              onChange={(e) => handleChange('approverGroupId', e.target.value)}
              disabled={isReadOnly}
            />
          </FormGroup>
        </form>
      )}

      {activeTab === 'history' && wbs && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No change history available
            </div>
          ) : (
            history.map((change) => (
              <Card key={change.id}>
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{change.changeType}</div>
                      <div className="text-sm text-gray-600">
                        by {change.changedBy?.displayName || 'Unknown'} on {new Date(change.changedAt).toLocaleString()}
                      </div>
                      {change.notes && (
                        <div className="text-sm text-gray-700 mt-2">{change.notes}</div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {showWorkflowAction && wbs && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium mb-2">Workflow Action</h4>
          <Input
            label="Notes (optional)"
            value={workflowNotes}
            onChange={(e) => setWorkflowNotes(e.target.value)}
            placeholder="Add notes about this action..."
          />
          <div className="flex gap-2 mt-4">
            {wbs.approvalStatus === WbsApprovalStatus.Draft && (
              <Button
                variant="primary"
                onClick={() => handleWorkflowAction('submit')}
                disabled={submitMutation.isPending}
              >
                Submit for Approval
              </Button>
            )}
            {wbs.approvalStatus === WbsApprovalStatus.PendingApproval && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleWorkflowAction('approve')}
                  disabled={approveMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleWorkflowAction('reject')}
                  disabled={rejectMutation.isPending}
                >
                  Reject
                </Button>
              </>
            )}
            {wbs.approvalStatus === WbsApprovalStatus.Approved && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleWorkflowAction('suspend')}
                  disabled={suspendMutation.isPending}
                >
                  Suspend
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleWorkflowAction('close')}
                  disabled={closeMutation.isPending}
                >
                  Close
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setShowWorkflowAction(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

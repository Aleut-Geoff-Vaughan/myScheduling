import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { projectsService } from '../services/projectsService';
import { useAuthStore } from '../stores/authStore';
import { ProjectAssignmentStatus, type ProjectAssignment } from '../types/api';

interface ProjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectAssignment: Partial<ProjectAssignment>) => Promise<void>;
  isSubmitting?: boolean;
  existingAssignment?: ProjectAssignment;
}

export function ProjectAssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  existingAssignment
}: ProjectAssignmentModalProps) {
  const { user, currentWorkspace } = useAuthStore();

  const [formData, setFormData] = useState<Partial<ProjectAssignment>>({
    projectId: '',
    tenantId: currentWorkspace?.tenantId || '',
    userId: user?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: undefined,
    status: ProjectAssignmentStatus.Draft,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});


  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId && isOpen,
  });

  const initialData = useMemo(() => {
   
    if (existingAssignment) {
      return {
        ...existingAssignment,
        startDate: existingAssignment.startDate.split('T')[0],
        endDate: existingAssignment.endDate?.split('T')[0],
      };
    }
    return {
      projectId: '',
      tenantId: currentWorkspace?.tenantId || '',
      userId: user?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: undefined,
      status: ProjectAssignmentStatus.Draft,
      notes: '',
    };
  }, [existingAssignment, currentWorkspace?.tenantId, user?.id]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    // Validate against project dates
    const selectedProject = projects.find(p => p.id === formData.projectId);
    if (selectedProject && formData.startDate) {
      const projectStart = new Date(selectedProject.startDate).toISOString().split('T')[0];
      if (formData.startDate < projectStart) {
        newErrors.startDate = `Start date cannot be before project start date (${new Date(selectedProject.startDate).toLocaleDateString()})`;
      }

      if (selectedProject.endDate && formData.endDate) {
        const projectEnd = new Date(selectedProject.endDate).toISOString().split('T')[0];
        if (formData.endDate > projectEnd) {
          newErrors.endDate = `End date cannot be after project end date (${new Date(selectedProject.endDate).toLocaleDateString()})`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit project assignment:', error);
    }
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingAssignment ? 'Edit Project Assignment' : 'Create Project Assignment'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormGroup
          label="Project"
          error={errors.projectId}
          required
        >
          <Select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            disabled={!!existingAssignment}
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

        <FormGroup
          label="Start Date"
          error={errors.startDate}
          required
        >
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </FormGroup>

        <FormGroup
          label="End Date"
          error={errors.endDate}
          helpText="Leave blank for indefinite assignment"
        >
          <Input
            type="date"
            value={formData.endDate || ''}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value || undefined })}
          />
        </FormGroup>

        <FormGroup
          label="Status"
          required
        >
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) as ProjectAssignmentStatus })}
          >
            <option value={ProjectAssignmentStatus.Draft}>Draft</option>
            <option value={ProjectAssignmentStatus.PendingApproval}>Pending Approval</option>
            <option value={ProjectAssignmentStatus.Active}>Active</option>
            <option value={ProjectAssignmentStatus.Completed}>Completed</option>
            <option value={ProjectAssignmentStatus.Cancelled}>Cancelled</option>
          </Select>
        </FormGroup>

        <FormGroup
          label="Notes"
          helpText="Optional notes about this project assignment"
        >
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </FormGroup>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : existingAssignment ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

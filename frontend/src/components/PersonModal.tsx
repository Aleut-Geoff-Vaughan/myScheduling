import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { peopleService } from '../services/peopleService';
import type { Person } from '../types/api';
import { PersonStatus, PersonType } from '../types/api';
import { useTenants } from '../hooks/useTenants';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person;
  mode: 'create' | 'edit';
}

export function PersonModal({ isOpen, onClose, person, mode }: PersonModalProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();

  const [formData, setFormData] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    laborCategory: '',
    location: '',
    status: PersonStatus.Active,
    type: PersonType.Employee,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (person && mode === 'edit') {
      setFormData({
        tenantId: person.tenantId,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone || '',
        jobTitle: person.jobTitle || '',
        laborCategory: person.laborCategory || '',
        location: person.location || '',
        status: person.status,
        type: person.type,
      });
    } else {
      // Set default tenant if available
      setFormData(prev => ({
        ...prev,
        tenantId: tenants[0]?.id || '',
      }));
    }
  }, [person, mode, tenants]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'displayName' | 'userId'>) =>
      peopleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to create person' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Person) => peopleService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to update person' });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (mode === 'create') {
      createMutation.mutate(formData);
    } else if (person) {
      updateMutation.mutate({ ...person, ...formData });
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

  const statusOptions = [
    { value: PersonStatus.Active.toString(), label: 'Active' },
    { value: PersonStatus.Inactive.toString(), label: 'Inactive' },
    { value: PersonStatus.OnLeave.toString(), label: 'On Leave' },
  ];

  const typeOptions = [
    { value: PersonType.Employee.toString(), label: 'Employee' },
    { value: PersonType.Contractor.toString(), label: 'Contractor' },
    { value: PersonType.Vendor.toString(), label: 'Vendor' },
    { value: PersonType.External.toString(), label: 'External' },
  ];

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Person' : 'Edit Person'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Person' : 'Save Changes'}
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

        <FormGroup columns={2} className="mt-4">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="Job Title"
            value={formData.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
          />
          <Input
            label="Labor Category"
            value={formData.laborCategory}
            onChange={(e) => handleChange('laborCategory', e.target.value)}
          />
        </FormGroup>

        <FormGroup columns={1} className="mt-4">
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g., Anchorage, AK"
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Select
            label="Type"
            options={typeOptions}
            value={formData.type.toString()}
            onChange={(e) => handleChange('type', parseInt(e.target.value))}
            required
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

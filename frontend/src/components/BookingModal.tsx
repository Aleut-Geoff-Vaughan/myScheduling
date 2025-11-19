import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { bookingsService } from '../services/bookingsService';
import type { Booking } from '../types/api';
import { BookingStatus } from '../types/api';
import { useTenants } from '../hooks/useTenants';
import { usePeople } from '../hooks/usePeople';
import { useOffices, useSpaces } from '../hooks/useBookings';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking;
  mode: 'create' | 'edit';
}

export function BookingModal({ isOpen, onClose, booking, mode }: BookingModalProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: people = [] } = usePeople();
  const { data: offices = [] } = useOffices();

  const [formData, setFormData] = useState({
    tenantId: '',
    spaceId: '',
    personId: '',
    officeId: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    status: BookingStatus.Reserved,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch spaces for selected office
  const { data: spaces = [] } = useSpaces({
    officeId: formData.officeId || undefined
  });

  useEffect(() => {
    if (booking && mode === 'edit') {
      const startDT = new Date(booking.startDatetime);
      const endDT = new Date(booking.endDatetime);

      setFormData({
        tenantId: booking.tenantId,
        spaceId: booking.spaceId,
        personId: booking.personId,
        officeId: '',  // We don't have this on the booking object
        startDate: startDT.toISOString().split('T')[0],
        startTime: startDT.toTimeString().substring(0, 5),
        endDate: endDT.toISOString().split('T')[0],
        endTime: endDT.toTimeString().substring(0, 5),
        status: booking.status,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        tenantId: tenants[0]?.id || '',
        officeId: offices[0]?.id || '',
        startDate: today,
        endDate: today,
      }));
    }
  }, [booking, mode, tenants, offices]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
      bookingsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to create booking' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Booking) => bookingsService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Failed to update booking' });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.spaceId) newErrors.spaceId = 'Space is required';
    if (!formData.personId) newErrors.personId = 'Person is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';

    const startDateTime = `${formData.startDate}T${formData.startTime}`;
    const endDateTime = `${formData.endDate}T${formData.endTime}`;

    if (endDateTime <= startDateTime) {
      newErrors.endTime = 'End date/time must be after start date/time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const bookingData = {
      tenantId: formData.tenantId,
      spaceId: formData.spaceId,
      personId: formData.personId,
      startDatetime: `${formData.startDate}T${formData.startTime}:00`,
      endDatetime: `${formData.endDate}T${formData.endTime}:00`,
      status: formData.status,
    };

    if (mode === 'create') {
      createMutation.mutate(bookingData);
    } else if (booking) {
      updateMutation.mutate({ ...booking, ...bookingData });
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

  const personOptions = people
    .filter(p => !formData.tenantId || p.tenantId === formData.tenantId)
    .map(p => ({
      value: p.id,
      label: `${p.displayName} - ${p.email}`,
    }));

  const officeOptions = offices.map(o => ({
    value: o.id,
    label: `${o.name}${o.city ? ` - ${o.city}` : ''}`,
  }));

  const spaceOptions = spaces
    .filter(s => s.isAvailable)
    .map(s => ({
      value: s.id,
      label: `${s.name} (${s.type === 0 ? 'Desk' : s.type === 2 ? 'Conference Room' : 'Other'})`,
    }));

  const statusOptions = [
    { value: BookingStatus.Reserved.toString(), label: 'Reserved' },
    { value: BookingStatus.CheckedIn.toString(), label: 'Checked In' },
    { value: BookingStatus.Completed.toString(), label: 'Completed' },
    { value: BookingStatus.Cancelled.toString(), label: 'Cancelled' },
    { value: BookingStatus.NoShow.toString(), label: 'No Show' },
  ];

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Booking' : 'Edit Booking'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Booking' : 'Save Changes'}
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
            label="Person"
            options={personOptions}
            value={formData.personId}
            onChange={(e) => handleChange('personId', e.target.value)}
            error={errors.personId}
            required
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Select
            label="Office"
            options={officeOptions}
            value={formData.officeId}
            onChange={(e) => handleChange('officeId', e.target.value)}
            required
          />
          <Select
            label="Space"
            options={spaceOptions}
            value={formData.spaceId}
            onChange={(e) => handleChange('spaceId', e.target.value)}
            error={errors.spaceId}
            required
            disabled={!formData.officeId}
            helper={!formData.officeId ? 'Select an office first' : ''}
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
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup columns={2} className="mt-4">
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            error={errors.endDate}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(e) => handleChange('endTime', e.target.value)}
            error={errors.endTime}
            required
          />
        </FormGroup>

        <FormGroup columns={1} className="mt-4">
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

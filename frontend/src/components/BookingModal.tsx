import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup } from './ui';
import { bookingsService } from '../services/bookingsService';
import type { Booking } from '../types/api';
import { BookingStatus, SpaceType } from '../types/api';

const SPACE_TYPE_LABELS: Record<number, string> = {
  [SpaceType.Desk]: 'Desk',
  [SpaceType.HotDesk]: 'Hot Desk',
  [SpaceType.Office]: 'Private Office',
  [SpaceType.Cubicle]: 'Cubicle',
  [SpaceType.Room]: 'Room',
  [SpaceType.ConferenceRoom]: 'Conference Room',
  [SpaceType.HuddleRoom]: 'Huddle Room',
  [SpaceType.PhoneBooth]: 'Phone Booth',
  [SpaceType.TrainingRoom]: 'Training Room',
  [SpaceType.BreakRoom]: 'Break Room',
  [SpaceType.ParkingSpot]: 'Parking Spot',
};
import { useTenants } from '../hooks/useTenants';
import { useUsers } from '../hooks/useTenants';
import { useOffices, useSpaces } from '../hooks/useBookings';
import { useAuthStore } from '../stores/authStore';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking;
  mode: 'create' | 'edit';
  // Pre-populated values for when opening from specific context
  defaultOfficeId?: string;
  defaultSpaceId?: string;
  defaultTenantId?: string;
}

export function BookingModal({
  isOpen,
  onClose,
  booking,
  mode,
  defaultOfficeId,
  defaultSpaceId,
  defaultTenantId,
}: BookingModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: tenants = [] } = useTenants();
  const { data: users = [] } = useUsers();
  const { data: offices = [] } = useOffices();

  const [formData, setFormData] = useState({
    tenantId: '',
    spaceId: '',
    userId: '',
    officeId: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    status: BookingStatus.Reserved,
    isPermanent: false,
  });

  // "Book on behalf of" toggle - default is booking for yourself
  const [bookingOnBehalf, setBookingOnBehalf] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch spaces for selected office
  const { data: spaces = [] } = useSpaces({
    officeId: formData.officeId || undefined
  });

  // Initialize form for edit mode - compute values with useMemo
  const editModeData = useMemo(() => {
    if (booking && mode === 'edit') {
      const startDT = new Date(booking.startDatetime);
      let endDate = '';
      let endTime = '17:00';
      if (booking.endDatetime) {
        const endDT = new Date(booking.endDatetime);
        endDate = endDT.toISOString().split('T')[0];
        endTime = endDT.toTimeString().substring(0, 5);
      }
      const isOnBehalf = booking.bookedByUserId && booking.bookedByUserId !== booking.userId;
      return {
        formData: {
          tenantId: booking.tenantId,
          spaceId: booking.spaceId,
          userId: booking.userId,
          officeId: '',
          startDate: startDT.toISOString().split('T')[0],
          startTime: startDT.toTimeString().substring(0, 5),
          endDate,
          endTime,
          status: booking.status,
          isPermanent: booking.isPermanent || false,
        },
        isOnBehalf: !!isOnBehalf,
      };
    }
    return null;
  }, [booking, mode]);

  useEffect(() => {
    if (editModeData) {
       
      setFormData(editModeData.formData);
       
      setBookingOnBehalf(editModeData.isOnBehalf);
    }
  }, [editModeData]);

  // Set default values for create mode when data becomes available
   
  useEffect(() => {
    if (mode === 'create' && isOpen) {
      const today = new Date().toISOString().split('T')[0];

       
      setFormData(prev => {
        // Use props if provided, otherwise use first available or existing value
        const newTenantId = defaultTenantId || prev.tenantId || tenants[0]?.id || '';
        const newOfficeId = defaultOfficeId || prev.officeId || offices[0]?.id || '';
        const newStartDate = prev.startDate || today;
        const newEndDate = prev.endDate || today;
        // Default to current user
        const newUserId = prev.userId || user?.id || '';

        // Skip update if nothing changed
        if (prev.tenantId === newTenantId &&
            prev.officeId === newOfficeId &&
            prev.startDate === newStartDate &&
            prev.endDate === newEndDate &&
            prev.userId === newUserId) {
          return prev;
        }

        return {
          ...prev,
          tenantId: newTenantId,
          officeId: newOfficeId,
          startDate: newStartDate,
          endDate: newEndDate,
          userId: newUserId,
        };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isOpen, tenants.length, offices.length, defaultTenantId, defaultOfficeId, user?.id]);

  // Set default space when officeId changes and defaultSpaceId is provided
   
  useEffect(() => {
    if (mode === 'create' && defaultSpaceId && spaces.length > 0) {
      const spaceExists = spaces.some(s => s.id === defaultSpaceId);
      if (spaceExists && formData.spaceId !== defaultSpaceId) {
         
        setFormData(prev => ({
          ...prev,
          spaceId: defaultSpaceId,
        }));
      }
    }
  }, [mode, defaultSpaceId, spaces, formData.spaceId]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
      bookingsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['office-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['space-bookings'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to create booking' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Booking) => bookingsService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['office-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['space-bookings'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to update booking' });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.spaceId) newErrors.spaceId = 'Space is required';
    if (!formData.userId) newErrors.userId = 'User is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    // Only validate end date if not permanent
    if (!formData.isPermanent) {
      if (!formData.endDate) newErrors.endDate = 'End date is required for non-permanent bookings';

      if (formData.endDate) {
        const startDateTime = `${formData.startDate}T${formData.startTime}`;
        const endDateTime = `${formData.endDate}T${formData.endTime}`;

        if (endDateTime <= startDateTime) {
          newErrors.endTime = 'End date/time must be after start date/time';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const bookingData: Partial<Booking> = {
      tenantId: formData.tenantId,
      spaceId: formData.spaceId,
      userId: formData.userId,
      startDatetime: `${formData.startDate}T${formData.startTime}:00`,
      status: formData.status,
      isPermanent: formData.isPermanent,
      bookedByUserId: user?.id,  // Current user is always the one making the booking
      bookedAt: new Date().toISOString(),
    };

    // Only set endDatetime if not permanent
    if (!formData.isPermanent && formData.endDate) {
      bookingData.endDatetime = `${formData.endDate}T${formData.endTime}:00`;
    } else {
      bookingData.endDatetime = undefined;
    }

    if (mode === 'create') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(bookingData as any);
    } else if (booking) {
      updateMutation.mutate({ ...booking, ...bookingData });
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // When toggling "book on behalf of", reset userId appropriately
  const handleBookingOnBehalfToggle = (onBehalf: boolean) => {
    setBookingOnBehalf(onBehalf);
    if (!onBehalf && user?.id) {
      // Reset to current user
      setFormData(prev => ({ ...prev, userId: user.id }));
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

  const officeOptions = offices.map(o => ({
    value: o.id,
    label: `${o.name}${o.city ? ` - ${o.city}` : ''}`,
  }));

  const spaceOptions = spaces
    .filter(s => s.isAvailable !== false)  // Show spaces that are available or where isAvailable is undefined
    .map(s => ({
      value: s.id,
      label: `${s.name || 'Unnamed Space'} (${SPACE_TYPE_LABELS[s.type] || 'Unknown'})`,
    }));

  const statusOptions = [
    { value: BookingStatus.Reserved.toString(), label: 'Reserved' },
    { value: BookingStatus.CheckedIn.toString(), label: 'Checked In' },
    { value: BookingStatus.Completed.toString(), label: 'Completed' },
    { value: BookingStatus.Cancelled.toString(), label: 'Cancelled' },
    { value: BookingStatus.NoShow.toString(), label: 'No Show' },
  ];

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Find current user in the users list for display
  const currentUserDisplay = user ? `${user.displayName} (${user.email})` : 'Current User';

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

        {mode === 'create' ? (
          <>
            <FormGroup columns={1}>
              <Select
                label="Tenant"
                options={tenantOptions}
                value={formData.tenantId}
                onChange={(e) => handleChange('tenantId', e.target.value)}
                error={errors.tenantId}
                required
              />
            </FormGroup>

            {/* Booking For Section */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Booking For</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingOnBehalf}
                    onChange={(e) => handleBookingOnBehalfToggle(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Book on behalf of someone else</span>
                </label>
              </div>

              {!bookingOnBehalf ? (
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-800 font-medium">{currentUserDisplay}</p>
                  <p className="text-xs text-gray-500 mt-1">Booking for yourself</p>
                </div>
              ) : (
                <Select
                  label="Select User"
                  options={personOptions}
                  value={formData.userId}
                  onChange={(e) => handleChange('userId', e.target.value)}
                  error={errors.userId}
                  required
                />
              )}
            </div>

            <FormGroup columns={2} className="mt-4">
              <Select
                label="Office"
                options={officeOptions}
                value={formData.officeId}
                onChange={(e) => {
                  handleChange('officeId', e.target.value);
                  // Clear space when office changes
                  handleChange('spaceId', '');
                }}
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
          </>
        ) : (
          /* Edit Mode: Display-only fields */
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Booking Details (Read Only)</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Booked For</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {booking?.user?.displayName || 'Unknown User'}
                    {booking?.user?.email && (
                      <span className="text-gray-500 font-normal"> ({booking.user.email})</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Space</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {booking?.space?.name || 'Unknown Space'}
                    {booking?.space?.office?.name && (
                      <span className="text-gray-500 font-normal"> - {booking.space.office.name}</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd className="text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      booking?.status === BookingStatus.Reserved ? 'bg-blue-100 text-blue-800' :
                      booking?.status === BookingStatus.CheckedIn ? 'bg-green-100 text-green-800' :
                      booking?.status === BookingStatus.Completed ? 'bg-gray-100 text-gray-800' :
                      booking?.status === BookingStatus.Cancelled ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statusOptions.find(s => s.value === booking?.status?.toString())?.label || 'Unknown'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Permanent/Indefinite Booking Toggle */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPermanent}
              onChange={(e) => handleChange('isPermanent', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">Permanent Booking</span>
              <p className="text-xs text-gray-600 mt-0.5">
                This booking has no end date and will remain active indefinitely
              </p>
            </div>
          </label>
        </div>

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

        {!formData.isPermanent && (
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
        )}

        {/* Status dropdown - only in create mode */}
        {mode === 'create' && (
          <FormGroup columns={1} className="mt-4">
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status.toString()}
              onChange={(e) => handleChange('status', parseInt(e.target.value))}
              required
            />
          </FormGroup>
        )}

        {/* Booking Metadata (shown in edit mode) */}
        {mode === 'edit' && booking?.bookedAt && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">
              Booked on {new Date(booking.bookedAt).toLocaleDateString()} at {new Date(booking.bookedAt).toLocaleTimeString()}
              {booking.bookedBy && (
                <> by {booking.bookedBy.displayName}</>
              )}
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}

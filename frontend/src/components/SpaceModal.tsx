import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input } from './ui';
import { facilitiesService } from '../services/facilitiesService';
import { SpaceType, type Space, type Office } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface SpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  space?: Space | null;
  offices: Office[];
}

const SPACE_TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: SpaceType.Desk, label: 'Desk' },
  { value: SpaceType.HotDesk, label: 'Hot Desk' },
  { value: SpaceType.Office, label: 'Private Office' },
  { value: SpaceType.Cubicle, label: 'Cubicle' },
  { value: SpaceType.Room, label: 'Room' },
  { value: SpaceType.ConferenceRoom, label: 'Conference Room' },
  { value: SpaceType.HuddleRoom, label: 'Huddle Room' },
  { value: SpaceType.PhoneBooth, label: 'Phone Booth' },
  { value: SpaceType.TrainingRoom, label: 'Training Room' },
  { value: SpaceType.BreakRoom, label: 'Break Room' },
  { value: SpaceType.ParkingSpot, label: 'Parking Spot' },
];

interface SpaceFormData {
  officeId: string;
  name: string;
  type: SpaceType;
  capacity: number;
  requiresApproval: boolean;
  isActive: boolean;
  dailyCost?: number;
  maxBookingDays?: number;
  equipment?: string;
  features?: string;
}

export function SpaceModal({ isOpen, onClose, space, offices }: SpaceModalProps) {
  const { currentWorkspace } = useAuthStore();
  const queryClient = useQueryClient();
  const isEditing = !!space;

  // Create a stable key to force re-initialization when space or modal state changes
  const formKey = useMemo(() => `${space?.id || 'new'}-${isOpen}`, [space?.id, isOpen]);

  // Initialize form data based on space or default values
  const getInitialFormData = useCallback((): SpaceFormData => {
    if (space) {
      return {
        officeId: space.officeId,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        requiresApproval: space.requiresApproval,
        isActive: space.isActive,
        dailyCost: space.dailyCost,
        maxBookingDays: space.maxBookingDays,
        equipment: space.equipment || '',
        features: space.features || '',
      };
    } else {
      return {
        officeId: offices[0]?.id || '',
        name: '',
        type: SpaceType.HotDesk,
        capacity: 1,
        requiresApproval: false,
        isActive: true,
        dailyCost: undefined,
        maxBookingDays: undefined,
        equipment: '',
        features: '',
      };
    }
  }, [space, offices]);

  const [formData, setFormData] = useState<SpaceFormData>(getInitialFormData);

  // Reset form when key changes
  useEffect(() => {
    setFormData(getInitialFormData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>) =>
      facilitiesService.createSpace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities-spaces'] });
      toast.success('Space created successfully');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create space');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Space) => facilitiesService.updateSpace(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities-spaces'] });
      toast.success('Space updated successfully');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update space');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.officeId) {
      toast.error('Please select an office');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a space name');
      return;
    }

    if (isEditing && space) {
      updateMutation.mutate({
        ...space,
        ...formData,
        tenantId: currentWorkspace?.tenantId || space.tenantId,
      });
    } else {
      createMutation.mutate({
        ...formData,
        tenantId: currentWorkspace?.tenantId || '',
        isAvailable: true,
      } as Omit<Space, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Get suggested capacity based on space type
  const getSuggestedCapacity = (type: SpaceType): number => {
    switch (type) {
      case SpaceType.Desk:
      case SpaceType.HotDesk:
      case SpaceType.PhoneBooth:
      case SpaceType.ParkingSpot:
        return 1;
      case SpaceType.Cubicle:
      case SpaceType.Office:
        return 1;
      case SpaceType.HuddleRoom:
        return 4;
      case SpaceType.ConferenceRoom:
        return 10;
      case SpaceType.TrainingRoom:
        return 20;
      case SpaceType.BreakRoom:
      case SpaceType.Room:
        return 6;
      default:
        return 1;
    }
  };

  const handleTypeChange = (newType: SpaceType) => {
    setFormData({
      ...formData,
      type: newType,
      capacity: getSuggestedCapacity(newType),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Space' : 'Add New Space'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Office Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Office *
          </label>
          <select
            value={formData.officeId}
            onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select an office...</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name} {office.city && office.stateCode ? `(${office.city}, ${office.stateCode})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Space Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Space Name *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., D-101, Conference Room A, Parking P-001"
            required
          />
        </div>

        {/* Space Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Space Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(parseInt(e.target.value) as SpaceType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {SPACE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacity
          </label>
          <Input
            type="number"
            min={1}
            max={500}
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum number of people this space can accommodate
          </p>
        </div>

        {/* Two Column Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Daily Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Cost ($)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formData.dailyCost || ''}
              onChange={(e) => setFormData({ ...formData, dailyCost: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="Optional"
            />
          </div>

          {/* Max Booking Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Booking Days
            </label>
            <Input
              type="number"
              min={1}
              max={365}
              value={formData.maxBookingDays || ''}
              onChange={(e) => setFormData({ ...formData, maxBookingDays: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipment
          </label>
          <Input
            type="text"
            value={formData.equipment}
            onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            placeholder="e.g., Monitor, Webcam, Whiteboard"
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated list of equipment in this space
          </p>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Features
          </label>
          <Input
            type="text"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="e.g., Window view, Standing desk, Near kitchen"
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated list of features
          </p>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requiresApproval}
              onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Requires Approval</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Space' : 'Create Space'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SpaceModal;

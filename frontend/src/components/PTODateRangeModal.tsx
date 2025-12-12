import { useState, useMemo } from 'react';
import { Modal, Button, FormGroup } from './ui';
import { WorkLocationType, DayPortion } from '../types/api';
import { useTenants } from '../hooks/useTenants';
import { useCreateWorkLocationPreference, useUpdateWorkLocationPreference } from '../hooks/useWorkLocation';
import { workLocationService } from '../services/workLocationService';
import { useQueryClient } from '@tanstack/react-query';

interface PTODateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function PTODateRangeModal({
  isOpen,
  onClose,
  userId,
}: PTODateRangeModalProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const createMutation = useCreateWorkLocationPreference();
  const updateMutation = useUpdateWorkLocationPreference();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setNotes('');
    setProgress(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Calculate the weekdays between start and end date
  const weekdaysInRange = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    if (start > end) return [];

    const days: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      alert('No tenant found');
      return;
    }

    if (weekdaysInRange.length === 0) {
      alert('Please select a valid date range with at least one weekday');
      return;
    }

    setIsSubmitting(true);
    setProgress({ current: 0, total: weekdaysInRange.length });

    try {
      // Create or update PTO for each weekday in the range
      for (let i = 0; i < weekdaysInRange.length; i++) {
        const date = weekdaysInRange[i];
        const workDate = date.toISOString().split('T')[0];

        setProgress({ current: i + 1, total: weekdaysInRange.length });

        const preferenceData = {
          tenantId,
          userId,
          workDate,
          locationType: WorkLocationType.PTO,
          dayPortion: DayPortion.FullDay,
          notes: notes.trim() || undefined, // Clear notes if empty, don't default to 'PTO'
        };

        try {
          await createMutation.mutateAsync(preferenceData);
        } catch (createError) {
          // If preference already exists, update it
          const error = createError as { status?: number; message?: string };
          if (error?.status === 409 || error?.message?.includes('409')) {
            try {
              const preferences = await workLocationService.getAll({ userId });
              const existing = preferences.find((p) => p.workDate === workDate);

              if (existing) {
                await updateMutation.mutateAsync({
                  id: existing.id,
                  preference: {
                    ...existing,
                    ...preferenceData,
                    notes: notes.trim() || '', // Explicitly set to empty string to clear existing notes
                  },
                });
              }
            } catch (fetchError) {
              console.error('Failed to update existing preference:', fetchError);
            }
          } else {
            throw createError;
          }
        }
      }

      // Refresh dashboard data
      await queryClient.refetchQueries({
        predicate: (query) => query.queryKey[0] === 'dashboard'
      });

      handleClose();
    } catch (error) {
      console.error('Error saving PTO preferences:', error);
      alert('Failed to save some PTO days. Please check your calendar.');
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add PTO to Calendar"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select a date range to mark as PTO. Weekends will be automatically excluded.
        </p>

        <FormGroup columns={2}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
        </FormGroup>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Vacation, Personal day"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {weekdaysInRange.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-amber-900">
                {weekdaysInRange.length} weekday{weekdaysInRange.length !== 1 ? 's' : ''} will be marked as PTO
              </span>
            </div>
            <div className="text-xs text-amber-700">
              {weekdaysInRange.slice(0, 5).map((date, index) => (
                <span key={index}>
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {index < Math.min(4, weekdaysInRange.length - 1) && ', '}
                </span>
              ))}
              {weekdaysInRange.length > 5 && ` and ${weekdaysInRange.length - 5} more...`}
            </div>
          </div>
        )}

        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-blue-700">
                Saving day {progress.current} of {progress.total}...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || weekdaysInRange.length === 0}
        >
          {isSubmitting ? 'Saving...' : `Add ${weekdaysInRange.length || ''} PTO Day${weekdaysInRange.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </Modal>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Select, FormGroup, TextArea } from './ui';
import { WorkLocationType, DayPortion, type WorkLocationPreference } from '../types/api';
import { useOffices } from '../hooks/useBookings';
import { useTenants } from '../hooks/useTenants';
import { useCreateWorkLocationPreference, useUpdateWorkLocationPreference } from '../hooks/useWorkLocation';
import { workLocationService } from '../services/workLocationService';

type ScheduleMode = 'fullDay' | 'splitDay';

interface WorkLocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  existingPreference?: WorkLocationPreference;
  existingPmPreference?: WorkLocationPreference; // For split day mode
  userId: string;
}

export function WorkLocationSelector({
  isOpen,
  onClose,
  selectedDate,
  existingPreference,
  existingPmPreference,
  userId,
}: WorkLocationSelectorProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: allOffices = [] } = useOffices();
  const createMutation = useCreateWorkLocationPreference();
  const updateMutation = useUpdateWorkLocationPreference();

  // Compute initial values with useMemo to avoid setState in useEffect
  const initialScheduleMode = useMemo<ScheduleMode>(() => {
    if (!existingPreference) return 'fullDay';
    const isAmPreference = existingPreference.dayPortion === DayPortion.AM;
    const isPmPreference = existingPreference.dayPortion === DayPortion.PM;
    return ((isAmPreference || isPmPreference) || existingPmPreference) ? 'splitDay' : 'fullDay';
  }, [existingPreference, existingPmPreference]);

  const initialAmData = useMemo(() => ({
    locationType: existingPreference?.locationType ?? WorkLocationType.Remote,
    officeId: existingPreference?.officeId ?? '',
    remoteLocation: existingPreference?.remoteLocation ?? '',
    city: existingPreference?.city ?? '',
    state: existingPreference?.state ?? '',
    country: existingPreference?.country ?? '',
    notes: existingPreference?.notes ?? '',
  }), [existingPreference]);

  const initialPmData = useMemo(() => ({
    locationType: existingPmPreference?.locationType ?? WorkLocationType.Remote,
    officeId: existingPmPreference?.officeId ?? '',
    remoteLocation: existingPmPreference?.remoteLocation ?? '',
    city: existingPmPreference?.city ?? '',
    state: existingPmPreference?.state ?? '',
    country: existingPmPreference?.country ?? '',
    notes: existingPmPreference?.notes ?? '',
  }), [existingPmPreference]);

  // Schedule mode: fullDay or splitDay
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(initialScheduleMode);

  // AM (or full day) location state
  const [locationType, setLocationType] = useState<WorkLocationType>(initialAmData.locationType);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(initialAmData.officeId);
  const [remoteLocation, setRemoteLocation] = useState(initialAmData.remoteLocation);
  const [city, setCity] = useState(initialAmData.city);
  const [state, setState] = useState(initialAmData.state);
  const [country, setCountry] = useState(initialAmData.country);
  const [notes, setNotes] = useState(initialAmData.notes);

  // PM location state (for split day mode)
  const [pmLocationType, setPmLocationType] = useState<WorkLocationType>(initialPmData.locationType);
  const [pmSelectedOfficeId, setPmSelectedOfficeId] = useState<string>(initialPmData.officeId);
  const [pmRemoteLocation, setPmRemoteLocation] = useState(initialPmData.remoteLocation);
  const [pmCity, setPmCity] = useState(initialPmData.city);
  const [pmState, setPmState] = useState(initialPmData.state);
  const [pmCountry, setPmCountry] = useState(initialPmData.country);
  const [pmNotes, setPmNotes] = useState(initialPmData.notes);

  // Sync state when initial values change
  useEffect(() => {
    setScheduleMode(initialScheduleMode);
  }, [initialScheduleMode]);

  useEffect(() => {
    setLocationType(initialAmData.locationType);
    setSelectedOfficeId(initialAmData.officeId);
    setRemoteLocation(initialAmData.remoteLocation);
    setCity(initialAmData.city);
    setState(initialAmData.state);
    setCountry(initialAmData.country);
    setNotes(initialAmData.notes);
  }, [initialAmData]);

  useEffect(() => {
    setPmLocationType(initialPmData.locationType);
    setPmSelectedOfficeId(initialPmData.officeId);
    setPmRemoteLocation(initialPmData.remoteLocation);
    setPmCity(initialPmData.city);
    setPmState(initialPmData.state);
    setPmCountry(initialPmData.country);
    setPmNotes(initialPmData.notes);
  }, [initialPmData]);

  const companyOffices = allOffices.filter(o => !o.isClientSite);
  const clientSites = allOffices.filter(o => o.isClientSite);

  const handleSubmit = async () => {
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      alert('No tenant found');
      return;
    }

    const workDate = selectedDate.toISOString().split('T')[0];

    // Helper function to build preference data
    const buildPreferenceData = (
      lt: WorkLocationType,
      dp: DayPortion,
      officeId: string,
      remoteLoc: string,
      c: string,
      s: string,
      co: string,
      n: string
    ) => ({
      tenantId,
      userId,
      workDate,
      locationType: lt,
      dayPortion: dp,
      officeId: (lt === WorkLocationType.OfficeNoReservation || lt === WorkLocationType.ClientSite)
        ? officeId
        : undefined,
      bookingId: lt === WorkLocationType.OfficeWithReservation ? undefined : undefined,
      remoteLocation: lt === WorkLocationType.RemotePlus ? remoteLoc : undefined,
      city: lt === WorkLocationType.RemotePlus ? c : undefined,
      state: lt === WorkLocationType.RemotePlus ? s : undefined,
      country: lt === WorkLocationType.RemotePlus ? co : undefined,
      notes: n,
    });

    // Helper function to save a single preference (create or update)
    const savePreference = async (
      preferenceData: ReturnType<typeof buildPreferenceData>,
      existingPref?: WorkLocationPreference
    ) => {
      if (existingPref) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user, office, booking, ...cleanPreference } = existingPref;
        await updateMutation.mutateAsync({
          id: existingPref.id,
          preference: { ...cleanPreference, ...preferenceData },
        });
      } else {
        try {
          await createMutation.mutateAsync(preferenceData);
        } catch (createError) {
          const error = createError as { status?: number; message?: string };
          if (error?.status === 409 || error?.message?.includes('409')) {
            console.log('Preference already exists, fetching and updating instead');
            const preferences = await workLocationService.getAll({ userId: preferenceData.userId });
            const existing = preferences.find(
              (p) => p.workDate === preferenceData.workDate && p.dayPortion === preferenceData.dayPortion
            );
            if (existing) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { user, office, booking, ...cleanExisting } = existing;
              await updateMutation.mutateAsync({
                id: existing.id,
                preference: { ...cleanExisting, ...preferenceData },
              });
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }
    };

    try {
      if (scheduleMode === 'fullDay') {
        // Single full-day preference
        const preferenceData = buildPreferenceData(
          locationType,
          DayPortion.FullDay,
          selectedOfficeId,
          remoteLocation,
          city,
          state,
          country,
          notes
        );

        // If switching from split day to full day, we need to:
        // 1. Delete the PM preference if it exists
        // 2. Delete the AM preference if it exists (we'll create a new FullDay one)
        if (existingPmPreference) {
          console.log('Deleting PM preference:', existingPmPreference.id);
          await workLocationService.delete(existingPmPreference.id);
        }

        // If existing preference is AM (not FullDay), delete it and create new FullDay
        if (existingPreference && existingPreference.dayPortion === DayPortion.AM) {
          console.log('Deleting AM preference to replace with FullDay:', existingPreference.id);
          await workLocationService.delete(existingPreference.id);
          // Create new full day preference
          await createMutation.mutateAsync(preferenceData);
        } else {
          // Normal update or create
          await savePreference(preferenceData, existingPreference);
        }
      } else {
        // Split day: save both AM and PM preferences
        const amPreferenceData = buildPreferenceData(
          locationType,
          DayPortion.AM,
          selectedOfficeId,
          remoteLocation,
          city,
          state,
          country,
          notes
        );
        const pmPreferenceData = buildPreferenceData(
          pmLocationType,
          DayPortion.PM,
          pmSelectedOfficeId,
          pmRemoteLocation,
          pmCity,
          pmState,
          pmCountry,
          pmNotes
        );

        // If switching from full day to split day, delete the existing FullDay preference first
        if (existingPreference && existingPreference.dayPortion === DayPortion.FullDay) {
          console.log('Deleting FullDay preference to replace with AM/PM:', existingPreference.id);
          await workLocationService.delete(existingPreference.id);
          // Create both AM and PM preferences
          await createMutation.mutateAsync(amPreferenceData);
          await createMutation.mutateAsync(pmPreferenceData);
        } else {
          // Save AM preference (use existingPreference if it's an AM preference)
          const amExisting = existingPreference?.dayPortion === DayPortion.AM ? existingPreference : undefined;
          await savePreference(amPreferenceData, amExisting);

          // Save PM preference
          await savePreference(pmPreferenceData, existingPmPreference);
        }
      }

      // Wait for dashboard refetch to complete before closing modal
      console.log('Waiting for dashboard refetch...');
      await queryClient.refetchQueries({
        predicate: (query) => query.queryKey[0] === 'dashboard'
      });
      console.log('Dashboard refetch completed');

      onClose();
    } catch (error) {
      console.error('Error saving work location preference:', error);
      alert('Failed to save work location preference');
    }
  };

  const locationTypeOptions = [
    { value: WorkLocationType.Remote.toString(), label: 'Remote - Work from home' },
    { value: WorkLocationType.RemotePlus.toString(), label: 'Remote Plus - Specify location' },
    { value: WorkLocationType.ClientSite.toString(), label: 'Client Site - At client location' },
    { value: WorkLocationType.OfficeNoReservation.toString(), label: 'Office - No desk reservation' },
    { value: WorkLocationType.OfficeWithReservation.toString(), label: 'Office - With desk/room reservation' },
    { value: WorkLocationType.PTO.toString(), label: 'PTO - Paid Time Off' },
    { value: WorkLocationType.Travel.toString(), label: 'Travel - In transit/traveling' },
    { value: WorkLocationType.Holiday.toString(), label: 'Holiday - Company/Federal Holiday' },
  ];

  const officeOptions = companyOffices.map(o => ({
    value: o.id,
    label: `${o.name}${o.address ? ` - ${o.address}` : ''}`,
  }));

  const clientSiteOptions = clientSites.map(o => ({
    value: o.id,
    label: `${o.name}${o.address ? ` - ${o.address}` : ''}`,
  }));

  // Helper component for location type fields
  const renderLocationFields = (
    lt: WorkLocationType,
    officeId: string,
    setOfficeId: (v: string) => void,
    remoteLoc: string,
    setRemoteLoc: (v: string) => void,
    c: string,
    setC: (v: string) => void,
    s: string,
    setS: (v: string) => void,
    co: string,
    setCo: (v: string) => void
  ) => (
    <>
      {/* Remote Plus Fields */}
      {lt === WorkLocationType.RemotePlus && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          <FormGroup columns={1}>
            <Input
              label="Location Description"
              placeholder="e.g., Home, Coffee Shop, Co-working Space"
              value={remoteLoc}
              onChange={(e) => setRemoteLoc(e.target.value)}
            />
          </FormGroup>
          <FormGroup columns={3}>
            <Input
              label="City"
              placeholder="City"
              value={c}
              onChange={(e) => setC(e.target.value)}
            />
            <Input
              label="State/Province"
              placeholder="State"
              value={s}
              onChange={(e) => setS(e.target.value)}
            />
            <Input
              label="Country"
              placeholder="Country"
              value={co}
              onChange={(e) => setCo(e.target.value)}
            />
          </FormGroup>
        </div>
      )}

      {/* Client Site Selection */}
      {lt === WorkLocationType.ClientSite && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <Select
            label="Client Site"
            options={clientSiteOptions}
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            required
            helper={clientSiteOptions.length === 0 ? 'No client sites configured' : ''}
          />
        </div>
      )}

      {/* Office Selection (No Reservation) */}
      {lt === WorkLocationType.OfficeNoReservation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <Select
            label="Office Location"
            options={officeOptions}
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            required
          />
        </div>
      )}

      {/* Office with Reservation */}
      {lt === WorkLocationType.OfficeWithReservation && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-sm text-emerald-700">
            Booking flow not yet implemented.
          </p>
        </div>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Set Work Location - ${selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Schedule Mode Toggle */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Schedule Type:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScheduleMode('fullDay')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scheduleMode === 'fullDay'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Full Day
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('splitDay')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scheduleMode === 'splitDay'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Split Day (AM/PM)
            </button>
          </div>
        </div>

        {scheduleMode === 'fullDay' ? (
          /* Full Day Mode */
          <>
            <FormGroup columns={1}>
              <Select
                label="Location Type"
                options={locationTypeOptions}
                value={locationType.toString()}
                onChange={(e) => setLocationType(parseInt(e.target.value) as WorkLocationType)}
                required
              />
            </FormGroup>
            {renderLocationFields(
              locationType,
              selectedOfficeId,
              setSelectedOfficeId,
              remoteLocation,
              setRemoteLocation,
              city,
              setCity,
              state,
              setState,
              country,
              setCountry
            )}
            <FormGroup columns={1}>
              <TextArea
                label="Notes (Optional)"
                placeholder="Any additional notes about this day..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </FormGroup>
          </>
        ) : (
          /* Split Day Mode */
          <div className="space-y-4">
            {/* AM Section */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                <h4 className="font-semibold text-blue-900">Morning (AM)</h4>
              </div>
              <div className="p-4 space-y-3">
                <Select
                  label="Location Type"
                  options={locationTypeOptions}
                  value={locationType.toString()}
                  onChange={(e) => setLocationType(parseInt(e.target.value) as WorkLocationType)}
                  required
                />
                {renderLocationFields(
                  locationType,
                  selectedOfficeId,
                  setSelectedOfficeId,
                  remoteLocation,
                  setRemoteLocation,
                  city,
                  setCity,
                  state,
                  setState,
                  country,
                  setCountry
                )}
                <Input
                  label="AM Notes (Optional)"
                  placeholder="Notes for morning..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* PM Section */}
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                <h4 className="font-semibold text-amber-900">Afternoon (PM)</h4>
              </div>
              <div className="p-4 space-y-3">
                <Select
                  label="Location Type"
                  options={locationTypeOptions}
                  value={pmLocationType.toString()}
                  onChange={(e) => setPmLocationType(parseInt(e.target.value) as WorkLocationType)}
                  required
                />
                {renderLocationFields(
                  pmLocationType,
                  pmSelectedOfficeId,
                  setPmSelectedOfficeId,
                  pmRemoteLocation,
                  setPmRemoteLocation,
                  pmCity,
                  setPmCity,
                  pmState,
                  setPmState,
                  pmCountry,
                  setPmCountry
                )}
                <Input
                  label="PM Notes (Optional)"
                  placeholder="Notes for afternoon..."
                  value={pmNotes}
                  onChange={(e) => setPmNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            // AM/Full day validation
            (locationType === WorkLocationType.ClientSite && !selectedOfficeId) ||
            (locationType === WorkLocationType.OfficeNoReservation && !selectedOfficeId) ||
            // PM validation (only in split day mode)
            (scheduleMode === 'splitDay' && pmLocationType === WorkLocationType.ClientSite && !pmSelectedOfficeId) ||
            (scheduleMode === 'splitDay' && pmLocationType === WorkLocationType.OfficeNoReservation && !pmSelectedOfficeId)
          }
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : existingPreference || existingPmPreference
            ? 'Update'
            : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}

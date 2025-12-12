import React, { useState, useEffect } from 'react';
import { useCreateTemplate, useUpdateTemplate } from '../hooks/useTemplates';
import type {
  WorkLocationTemplate,
  CreateTemplateRequest,
  WorkLocationTemplateItem,
} from '../types/template';
import { TemplateType } from '../types/template';
import { WorkLocationType, DayPortion } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { useOffices } from '../hooks/useBookings';

interface TemplateEditorProps {
  template?: WorkLocationTemplate;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onClose }) => {
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const currentWorkspace = useAuthStore((state) => state.currentWorkspace);
  const { data: allOffices = [] } = useOffices();

  // Filter offices into company offices and client sites
  const companyOffices = allOffices.filter(o => !o.isClientSite);
  const clientSites = allOffices.filter(o => o.isClientSite);

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [templateType, setTemplateType] = useState<TemplateType>(
    template?.type ?? TemplateType.Week
  );
  const [isShared, setIsShared] = useState(template?.isShared || false);
  const [items, setItems] = useState<Omit<WorkLocationTemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>[]>(
    template?.items.map((item) => ({
      dayOffset: item.dayOffset,
      dayOfWeek: item.dayOfWeek,
      locationType: item.locationType,
      dayPortion: item.dayPortion ?? DayPortion.FullDay,
      officeId: item.officeId ?? undefined,
      remoteLocation: item.remoteLocation ?? undefined,
      city: item.city ?? undefined,
      state: item.state ?? undefined,
      country: item.country ?? undefined,
      notes: item.notes ?? undefined,
    })) || []
  );

  // Initialize items when template type changes - ONLY run on initial mount
  useEffect(() => {
    if (templateType === TemplateType.Week && items.length === 0) {
      const weekItems = DAYS_OF_WEEK.map((_, index) => ({
        dayOffset: index,
        dayOfWeek: index + 1,
        locationType: WorkLocationType.Remote,
        dayPortion: DayPortion.FullDay,
        officeId: undefined,
        remoteLocation: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        notes: undefined,
      }));
      setItems(weekItems);
    } else if (templateType === TemplateType.Day && items.length === 0) {
      setItems([
        {
          dayOffset: 0,
          dayOfWeek: undefined,
          locationType: WorkLocationType.Remote,
          dayPortion: DayPortion.FullDay,
          officeId: undefined,
          remoteLocation: undefined,
          city: undefined,
          state: undefined,
          country: undefined,
          notes: undefined,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        dayOffset: items.length,
        dayOfWeek: undefined,
        locationType: WorkLocationType.Remote,
        dayPortion: DayPortion.FullDay,
        officeId: undefined,
        remoteLocation: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        notes: undefined,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => {
      item.dayOffset = i;
    });
    setItems(newItems);
  };

  const handleItemChange = (
    index: number,
    field: keyof Omit<WorkLocationTemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>,
    value: string | number | undefined
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item to the template');
      return;
    }

    if (templateType === TemplateType.Week && items.length !== 5) {
      alert('A week template must have exactly 5 items (Monday-Friday)');
      return;
    }

    const tenantId = template?.tenantId || currentWorkspace?.tenantId;
    if (!tenantId) {
      alert('Select a tenant workspace before creating templates.');
      return;
    }

    const requestBase: CreateTemplateRequest = {
      tenantId,
      name: name.trim(),
      description: description.trim() || undefined,
      type: templateType,
      isShared,
      items: items.map((item) => ({
        ...item,
        officeId: item.officeId || undefined,
        remoteLocation: item.remoteLocation || undefined,
        city: item.city || undefined,
        state: item.state || undefined,
        country: item.country || undefined,
        notes: item.notes || undefined,
      })),
    };

    try {
      if (template) {
        const updateRequest = { ...requestBase, id: template.id };
        await updateTemplate.mutateAsync({ id: template.id, request: updateRequest });
      } else {
        await createTemplate.mutateAsync(requestBase);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  const getLocationTypeLabel = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'Remote';
      case WorkLocationType.RemotePlus:
        return 'Remote+';
      case WorkLocationType.ClientSite:
        return 'Client Site';
      case WorkLocationType.OfficeNoReservation:
        return 'Office (No Reservation)';
      case WorkLocationType.OfficeWithReservation:
        return 'Office (With Reservation)';
      case WorkLocationType.PTO:
        return 'PTO';
      case WorkLocationType.Travel:
        return 'Travel';
      case WorkLocationType.Holiday:
        return 'Holiday';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Regular Week Schedule"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type *
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(Number(e.target.value) as TemplateType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!!template}
                >
                  <option value={TemplateType.Day}>Single Day</option>
                  <option value={TemplateType.Week}>5-Day Week</option>
                  <option value={TemplateType.Custom}>Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Optional description of this template"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isShared"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isShared" className="ml-2 text-sm text-gray-700">
                Share with team
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Items</h3>
                {templateType === TemplateType.Custom && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                  >
                    + Add Day
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {templateType === TemplateType.Week
                          ? DAYS_OF_WEEK[index]
                          : `Day ${index + 1}`}
                      </span>
                      {templateType === TemplateType.Custom && items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Day Portion
                        </label>
                        <select
                          value={item.dayPortion}
                          onChange={(e) => handleItemChange(index, 'dayPortion', Number(e.target.value) as DayPortion)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value={DayPortion.FullDay}>Full Day</option>
                          <option value={DayPortion.AM}>AM Only</option>
                          <option value={DayPortion.PM}>PM Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location Type *
                        </label>
                        <select
                          value={item.locationType}
                          onChange={(e) => {
                            const newType = Number(e.target.value) as WorkLocationType;
                            // Update location type and clear officeId in a single state update
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              locationType: newType,
                              // Clear officeId when switching away from office/client site types
                              officeId: (newType === WorkLocationType.OfficeNoReservation ||
                                        newType === WorkLocationType.ClientSite)
                                ? newItems[index].officeId
                                : undefined,
                            };
                            setItems(newItems);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          {Object.values(WorkLocationType)
                            .filter((v) => typeof v === 'number')
                            .map((type) => (
                              <option key={type} value={type}>
                                {getLocationTypeLabel(type as WorkLocationType)}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Office Selection for Office (No Reservation) */}
                      {item.locationType === WorkLocationType.OfficeNoReservation && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Office *
                          </label>
                          <select
                            value={item.officeId || ''}
                            onChange={(e) => handleItemChange(index, 'officeId', e.target.value || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          >
                            <option value="">Select an office...</option>
                            {companyOffices.map((office) => (
                              <option key={office.id} value={office.id}>
                                {office.name}{office.city ? ` - ${office.city}` : ''}
                              </option>
                            ))}
                          </select>
                          {companyOffices.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">No offices configured</p>
                          )}
                        </div>
                      )}

                      {/* Client Site Selection */}
                      {item.locationType === WorkLocationType.ClientSite && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client Site *
                          </label>
                          <select
                            value={item.officeId || ''}
                            onChange={(e) => handleItemChange(index, 'officeId', e.target.value || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          >
                            <option value="">Select a client site...</option>
                            {clientSites.map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name}{site.city ? ` - ${site.city}` : ''}
                              </option>
                            ))}
                          </select>
                          {clientSites.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">No client sites configured</p>
                          )}
                        </div>
                      )}

                      {/* City field for Remote types */}
                      {(item.locationType === WorkLocationType.Remote ||
                        item.locationType === WorkLocationType.RemotePlus) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={item.city || ''}
                            onChange={(e) => handleItemChange(index, 'city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Optional"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTemplate.isPending || updateTemplate.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {createTemplate.isPending || updateTemplate.isPending
                ? 'Saving...'
                : template
                ? 'Update Template'
                : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

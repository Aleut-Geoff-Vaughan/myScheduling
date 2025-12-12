import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  useOffices,
  useCreateOffice,
  useUpdateOffice,
  useDeleteOffice,
} from '../hooks/useOffices';
import type { Office, CreateOfficeRequest, UpdateOfficeRequest } from '../types/api';
import { OfficeStatus } from '../types/api';
import toast from 'react-hot-toast';
import { OfficeIcon } from '../components/OfficeIcon';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

// Common US timezone options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

export function AdminOfficesPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || '';

  const { data: offices, isLoading } = useOffices({ tenantId });
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const deleteMutation = useDeleteOffice();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [formData, setFormData] = useState<Omit<CreateOfficeRequest, 'tenantId'>>({
    name: '',
    address: '',
    address2: '',
    city: '',
    stateCode: '',
    countryCode: 'US',
    timezone: 'America/New_York',
    status: OfficeStatus.Active,
    isClientSite: false,
    iconUrl: '',
    latitude: undefined,
    longitude: undefined,
  });

  const handleOpenModal = (office?: Office) => {
    if (office) {
      setEditingOffice(office);
      setFormData({
        name: office.name,
        address: office.address || '',
        address2: office.address2 || '',
        city: office.city || '',
        stateCode: office.stateCode || '',
        countryCode: office.countryCode || 'US',
        timezone: office.timezone || 'America/New_York',
        status: office.status,
        isClientSite: office.isClientSite,
        iconUrl: office.iconUrl || '',
        latitude: office.latitude,
        longitude: office.longitude,
      });
    } else {
      setEditingOffice(null);
      setFormData({
        name: '',
        address: '',
        address2: '',
        city: '',
        stateCode: '',
        countryCode: 'US',
        timezone: 'America/New_York',
        status: OfficeStatus.Active,
        isClientSite: false,
        iconUrl: '',
        latitude: undefined,
        longitude: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOffice(null);
    setFormData({
      name: '',
      address: '',
      address2: '',
      city: '',
      stateCode: '',
      countryCode: 'US',
      timezone: 'America/New_York',
      status: OfficeStatus.Active,
      isClientSite: false,
      iconUrl: '',
      latitude: undefined,
      longitude: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Office name is required');
      return;
    }

    try {
      if (editingOffice) {
        const updateRequest: UpdateOfficeRequest = {
          name: formData.name,
          address: formData.address,
          address2: formData.address2,
          city: formData.city,
          stateCode: formData.stateCode,
          countryCode: formData.countryCode,
          timezone: formData.timezone,
          status: formData.status ?? OfficeStatus.Active,
          isClientSite: formData.isClientSite ?? false,
          iconUrl: formData.iconUrl,
          latitude: formData.latitude,
          longitude: formData.longitude,
        };
        await updateMutation.mutateAsync({
          id: editingOffice.id,
          request: updateRequest,
        });
        toast.success('Office updated successfully');
      } else {
        const createRequest: CreateOfficeRequest = {
          tenantId,
          ...formData,
        };
        await createMutation.mutateAsync(createRequest);
        toast.success('Office created successfully');
      }
      handleCloseModal();
    } catch {
      toast.error(editingOffice ? 'Failed to update office' : 'Failed to create office');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the office "${name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Office deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete office';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status: OfficeStatus) => {
    if (status === OfficeStatus.Active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Office Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage office locations for your organization
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Add Office
        </button>
      </div>

      {/* Offices List */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading offices...</div>
        </div>
      ) : offices && offices.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timezone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spaces
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {offices.map((office) => (
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <OfficeIcon
                          stateCode={office.stateCode}
                          countryCode={office.countryCode}
                          iconUrl={office.iconUrl}
                          size="md"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{office.name}</div>
                        {office.city && office.stateCode && (
                          <div className="text-xs text-gray-500">{office.city}, {office.stateCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 whitespace-pre-line max-w-xs">
                      {office.address || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {TIMEZONE_OPTIONS.find((tz) => tz.value === office.timezone)?.label ||
                        office.timezone ||
                        '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(office.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {office.isClientSite ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Client Site
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Company Office
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {office.spaceCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(office)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(office.id, office.name)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No offices</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new office location.</p>
          <div className="mt-6">
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Office
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModal}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    {editingOffice ? 'Edit Office' : 'Add New Office'}
                  </h3>
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Office Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., National Headquarters"
                        required
                      />
                    </div>

                    {/* Address with Autocomplete */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address (start typing to search)
                      </label>
                      <AddressAutocomplete
                        value={formData.address || ''}
                        onChange={(value) => setFormData({ ...formData, address: value })}
                        onAddressSelect={(parsed) => {
                          setFormData({
                            ...formData,
                            address: parsed.fullAddress,
                            city: parsed.city || formData.city,
                            stateCode: parsed.stateCode || formData.stateCode,
                            countryCode: parsed.countryCode || formData.countryCode || 'US',
                            latitude: parsed.latitude,
                            longitude: parsed.longitude,
                          });
                        }}
                        placeholder="Start typing an address..."
                      />
                    </div>

                    {/* Address 2 - Suite/Floor */}
                    <div>
                      <label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-1">
                        Suite / Floor / Building
                      </label>
                      <input
                        type="text"
                        id="address2"
                        value={formData.address2 || ''}
                        onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Suite 100, Floor 3, Building A"
                      />
                    </div>

                    {/* City, State, Country Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label htmlFor="stateCode" className="block text-sm font-medium text-gray-700 mb-1">
                          State Code
                        </label>
                        <input
                          type="text"
                          id="stateCode"
                          value={formData.stateCode || ''}
                          onChange={(e) => setFormData({ ...formData, stateCode: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="VA"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          id="countryCode"
                          value={formData.countryCode || 'US'}
                          onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="US"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    {/* Icon Preview and Custom Icon URL */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                        <OfficeIcon
                          stateCode={formData.stateCode}
                          countryCode={formData.countryCode}
                          iconUrl={formData.iconUrl}
                          size="lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="iconUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Icon URL (optional)
                        </label>
                        <input
                          type="url"
                          id="iconUrl"
                          value={formData.iconUrl || ''}
                          onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com/icon.png"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Leave blank to use state/country auto-icon
                        </p>
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        value={formData.timezone || 'America/New_York'}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: parseInt(e.target.value) as OfficeStatus })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={OfficeStatus.Active}>Active</option>
                        <option value={OfficeStatus.Inactive}>Inactive</option>
                      </select>
                    </div>

                    {/* Is Client Site */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isClientSite"
                        checked={formData.isClientSite || false}
                        onChange={(e) => setFormData({ ...formData, isClientSite: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isClientSite" className="ml-2 block text-sm text-gray-700">
                        This is a client site location
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingOffice
                      ? 'Update Office'
                      : 'Create Office'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOfficesPage;

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { holidaysService } from '../services/holidaysService';
import {
  HolidayType,
  HolidayRecurrenceRule,
} from '../types/api';
import type {
  CompanyHoliday,
  SeedHolidaysResponse,
  ApplyHolidaysResponse,
} from '../types/api';
import toast from 'react-hot-toast';

const HolidayTypeLabels: Record<HolidayType, string> = {
  [HolidayType.Federal]: 'Federal',
  [HolidayType.Company]: 'Company',
  [HolidayType.Religious]: 'Religious',
  [HolidayType.Cultural]: 'Cultural',
  [HolidayType.Regional]: 'Regional',
};

const RecurrenceRuleLabels: Record<HolidayRecurrenceRule, string> = {
  [HolidayRecurrenceRule.FixedDate]: 'Fixed Date',
  [HolidayRecurrenceRule.FirstMondayOf]: '1st Monday',
  [HolidayRecurrenceRule.SecondMondayOf]: '2nd Monday',
  [HolidayRecurrenceRule.ThirdMondayOf]: '3rd Monday',
  [HolidayRecurrenceRule.FourthMondayOf]: '4th Monday',
  [HolidayRecurrenceRule.LastMondayOf]: 'Last Monday',
  [HolidayRecurrenceRule.FourthThursdayOf]: '4th Thursday',
  [HolidayRecurrenceRule.DayAfterThanksgiving]: 'Day After Thanksgiving',
};

export function AdminHolidaysPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;

  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<HolidayType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');

  // Seed modal state
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedStartYear, setSeedStartYear] = useState(new Date().getFullYear());
  const [seedEndYear, setSeedEndYear] = useState(new Date().getFullYear() + 1);
  const [seedIncludeDayAfter, setSeedIncludeDayAfter] = useState(true);
  const [seedAutoApplySchedule, setSeedAutoApplySchedule] = useState(true);
  const [seedAutoApplyForecast, setSeedAutoApplyForecast] = useState(true);
  const [isSeedingLoading, setIsSeedingLoading] = useState(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyYear, setApplyYear] = useState(new Date().getFullYear());
  const [applyOverwrite, setApplyOverwrite] = useState(false);
  const [isApplyingLoading, setIsApplyingLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [isSavingLoading, setIsSavingLoading] = useState(false);

  const loadHolidays = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const data = await holidaysService.getAll({
        tenantId,
        year: selectedYear,
        type: filterType === 'all' ? undefined : filterType,
        isActive: filterActive === 'all' ? undefined : filterActive,
      });
      setHolidays(data);
    } catch {
      toast.error('Failed to load holidays');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [tenantId, selectedYear, filterType, filterActive]);

  const handleSeedUSHolidays = async () => {
    if (!tenantId) return;

    setIsSeedingLoading(true);
    try {
      const response: SeedHolidaysResponse = await holidaysService.seedUSHolidays({
        tenantId,
        startYear: seedStartYear,
        endYear: seedEndYear,
        includeDayAfterThanksgiving: seedIncludeDayAfter,
        markAsActive: true,
        autoApplyToSchedule: seedAutoApplySchedule,
        autoApplyToForecast: seedAutoApplyForecast,
      });

      toast.success(`Created ${response.createdCount} holidays (${response.skippedCount} skipped)`);
      setShowSeedModal(false);
      loadHolidays();
    } catch {
      toast.error('Failed to seed US holidays');
    } finally {
      setIsSeedingLoading(false);
    }
  };

  const handleApplyToSchedules = async () => {
    if (!tenantId) return;

    setIsApplyingLoading(true);
    try {
      const response: ApplyHolidaysResponse = await holidaysService.applyToSchedules({
        tenantId,
        year: applyYear,
        overwriteExisting: applyOverwrite,
      });

      toast.success(
        `Applied holidays to ${response.totalUsersAffected} users. Created ${response.entriesCreated} entries (${response.entriesSkipped} skipped)`
      );
      setShowApplyModal(false);
    } catch {
      toast.error('Failed to apply holidays to schedules');
    } finally {
      setIsApplyingLoading(false);
    }
  };

  const handleToggleActive = async (holiday: CompanyHoliday) => {
    try {
      await holidaysService.update(holiday.id, {
        ...holiday,
        isActive: !holiday.isActive,
      });
      toast.success(`Holiday ${holiday.isActive ? 'deactivated' : 'activated'}`);
      loadHolidays();
    } catch {
      toast.error('Failed to update holiday');
    }
  };

  const handleEditHoliday = (holiday: CompanyHoliday) => {
    setEditingHoliday({ ...holiday });
    setShowEditModal(true);
  };

  const handleSaveHoliday = async () => {
    if (!editingHoliday) return;

    setIsSavingLoading(true);
    try {
      await holidaysService.update(editingHoliday.id, editingHoliday);
      toast.success('Holiday updated');
      setShowEditModal(false);
      setEditingHoliday(null);
      loadHolidays();
    } catch {
      toast.error('Failed to update holiday');
    } finally {
      setIsSavingLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await holidaysService.delete(id);
      toast.success('Holiday deleted');
      loadHolidays();
    } catch {
      toast.error('Failed to delete holiday');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a tenant to manage holidays.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Holidays</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage federal and company holidays. Holidays can be automatically applied to employee schedules.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Apply to Schedules
          </button>
          <button
            onClick={() => setShowSeedModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Seed US Holidays
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType === 'all' ? 'all' : filterType}
              onChange={(e) =>
                setFilterType(e.target.value === 'all' ? 'all' : (parseInt(e.target.value) as HolidayType))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(HolidayTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterActive === 'all' ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'active')
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading holidays...</div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No holidays found for {selectedYear}.</p>
            <p className="text-sm">Click "Seed US Holidays" to add US Federal holidays.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurrence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auto-Apply
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays.map((holiday) => (
                <tr key={holiday.id} className={!holiday.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{holiday.name}</div>
                    {holiday.description && (
                      <div className="text-sm text-gray-500">{holiday.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(holiday.holidayDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        holiday.type === HolidayType.Federal
                          ? 'bg-blue-100 text-blue-800'
                          : holiday.type === HolidayType.Company
                          ? 'bg-purple-100 text-purple-800'
                          : holiday.type === HolidayType.Religious
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {HolidayTypeLabels[holiday.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {holiday.isRecurring ? (
                      <span>
                        {holiday.recurrenceRule !== undefined
                          ? RecurrenceRuleLabels[holiday.recurrenceRule]
                          : 'Recurring'}
                      </span>
                    ) : (
                      <span className="text-gray-400">One-time</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {holiday.autoApplyToSchedule && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                          Schedule
                        </span>
                      )}
                      {holiday.autoApplyToForecast && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyan-100 text-cyan-800">
                          Forecast
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(holiday)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        holiday.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {holiday.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditHoliday(holiday)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Seed US Holidays Modal */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seed US Federal Holidays</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will create US Federal holidays for the selected year range. Existing holidays will be skipped.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    value={seedStartYear}
                    onChange={(e) => setSeedStartYear(parseInt(e.target.value))}
                    min={2020}
                    max={2050}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                  <input
                    type="number"
                    value={seedEndYear}
                    onChange={(e) => setSeedEndYear(parseInt(e.target.value))}
                    min={seedStartYear}
                    max={2050}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedIncludeDayAfter}
                    onChange={(e) => setSeedIncludeDayAfter(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include Day After Thanksgiving</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedAutoApplySchedule}
                    onChange={(e) => setSeedAutoApplySchedule(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-apply to employee schedules</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedAutoApplyForecast}
                    onChange={(e) => setSeedAutoApplyForecast(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-apply to staffing forecasts</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedUSHolidays}
                disabled={isSeedingLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSeedingLoading ? 'Seeding...' : 'Seed Holidays'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Schedules Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Apply Holidays to Schedules</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will create PTO entries in employee schedules for all active holidays that have "Auto-apply to
              Schedule" enabled.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={applyYear}
                  onChange={(e) => setApplyYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyOverwrite}
                  onChange={(e) => setApplyOverwrite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Overwrite existing schedule entries</span>
              </label>

              {applyOverwrite && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  Warning: This will replace any existing work location preferences on holiday dates.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyToSchedules}
                disabled={isApplyingLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isApplyingLoading ? 'Applying...' : 'Apply Holidays'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {showEditModal && editingHoliday && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Holiday</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingHoliday.name}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingHoliday.description || ''}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingHoliday.holidayDate}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, holidayDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editingHoliday.type}
                  onChange={(e) =>
                    setEditingHoliday({ ...editingHoliday, type: parseInt(e.target.value) as HolidayType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(HolidayTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHoliday.isObserved}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, isObserved: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Observed by company</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHoliday.autoApplyToSchedule}
                    onChange={(e) =>
                      setEditingHoliday({ ...editingHoliday, autoApplyToSchedule: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-apply to employee schedules</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHoliday.autoApplyToForecast}
                    onChange={(e) =>
                      setEditingHoliday({ ...editingHoliday, autoApplyToForecast: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-apply to staffing forecasts</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHoliday.isActive}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingHoliday(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoliday}
                disabled={isSavingLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

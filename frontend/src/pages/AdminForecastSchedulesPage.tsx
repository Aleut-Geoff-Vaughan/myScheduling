import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  forecastApprovalSchedulesService,
  type ForecastApprovalSchedule,
  type CreateForecastApprovalScheduleDto,
  type UpdateForecastApprovalScheduleDto,
} from '../services/staffingService';
import toast from 'react-hot-toast';

export function AdminForecastSchedulesPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;

  const [schedules, setSchedules] = useState<ForecastApprovalSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ForecastApprovalSchedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    isDefault: false,
    submissionDeadlineDay: 25,
    approvalDeadlineDay: 28,
    lockDay: 1,
    forecastMonthsAhead: 3,
    isActive: true,
  });

  const loadSchedules = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const data = await forecastApprovalSchedulesService.getAll({
        tenantId,
        isActive: filterActive === 'all' ? undefined : filterActive,
      });
      setSchedules(data);
    } catch {
      toast.error('Failed to load forecast approval schedules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [tenantId, filterActive]);

  const handleCreate = () => {
    setEditingSchedule(null);
    setFormData({
      name: '',
      isDefault: schedules.length === 0, // First one is default
      submissionDeadlineDay: 25,
      approvalDeadlineDay: 28,
      lockDay: 1,
      forecastMonthsAhead: 3,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (schedule: ForecastApprovalSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      isDefault: schedule.isDefault,
      submissionDeadlineDay: schedule.submissionDeadlineDay,
      approvalDeadlineDay: schedule.approvalDeadlineDay,
      lockDay: schedule.lockDay,
      forecastMonthsAhead: schedule.forecastMonthsAhead,
      isActive: schedule.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSchedule) {
        const dto: UpdateForecastApprovalScheduleDto = {
          name: formData.name,
          isDefault: formData.isDefault,
          submissionDeadlineDay: formData.submissionDeadlineDay,
          approvalDeadlineDay: formData.approvalDeadlineDay,
          lockDay: formData.lockDay,
          forecastMonthsAhead: formData.forecastMonthsAhead,
          isActive: formData.isActive,
        };
        await forecastApprovalSchedulesService.update(editingSchedule.id, dto);
        toast.success('Schedule updated');
      } else {
        const dto: CreateForecastApprovalScheduleDto = {
          tenantId,
          name: formData.name,
          isDefault: formData.isDefault,
          submissionDeadlineDay: formData.submissionDeadlineDay,
          approvalDeadlineDay: formData.approvalDeadlineDay,
          lockDay: formData.lockDay,
          forecastMonthsAhead: formData.forecastMonthsAhead,
        };
        await forecastApprovalSchedulesService.create(dto);
        toast.success('Schedule created');
      }
      setShowModal(false);
      loadSchedules();
    } catch {
      toast.error(editingSchedule ? 'Failed to update schedule' : 'Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (schedule: ForecastApprovalSchedule) => {
    if (schedule.isDefault) return;

    try {
      await forecastApprovalSchedulesService.setAsDefault(schedule.id);
      toast.success(`"${schedule.name}" is now the default schedule`);
      loadSchedules();
    } catch {
      toast.error('Failed to set default schedule');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await forecastApprovalSchedulesService.delete(id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch {
      toast.error('Cannot delete the default schedule. Set another as default first.');
    }
  };

  const handleToggleActive = async (schedule: ForecastApprovalSchedule) => {
    try {
      await forecastApprovalSchedulesService.update(schedule.id, {
        isActive: !schedule.isActive,
      });
      toast.success(`Schedule ${schedule.isActive ? 'deactivated' : 'activated'}`);
      loadSchedules();
    } catch {
      toast.error('Failed to update schedule');
    }
  };

  const formatDayOfMonth = (day: number) => {
    if (day === 0) return 'Last day';
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
    return `${day}${suffix}`;
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage forecast approval schedules.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Approval Schedules</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure deadlines and timelines for forecast submission and approval cycles.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Add Schedule
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How Forecast Schedules Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Submission Deadline:</strong> Day of month when PMs must submit their forecasts
          </li>
          <li>
            <strong>Approval Deadline:</strong> Day of month when approvers must complete reviews
          </li>
          <li>
            <strong>Lock Day:</strong> Day of month when forecasts are locked for the period
          </li>
          <li>
            <strong>Months Ahead:</strong> How many months into the future to forecast
          </li>
        </ul>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No forecast approval schedules found.</p>
            <p className="text-sm">Click "Add Schedule" to create your first schedule.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Months Ahead
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
              {schedules.map((schedule) => (
                <tr key={schedule.id} className={!schedule.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{schedule.name}</div>
                      {schedule.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDayOfMonth(schedule.submissionDeadlineDay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDayOfMonth(schedule.approvalDeadlineDay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDayOfMonth(schedule.lockDay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schedule.forecastMonthsAhead} month{schedule.forecastMonthsAhead !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(schedule)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        schedule.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!schedule.isDefault && (
                      <button
                        onClick={() => handleSetDefault(schedule)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    {!schedule.isDefault && (
                      <button
                        onClick={() => handleDelete(schedule.id, schedule.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Standard Monthly"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submission Deadline Day
                  </label>
                  <input
                    type="number"
                    value={formData.submissionDeadlineDay}
                    onChange={(e) =>
                      setFormData({ ...formData, submissionDeadlineDay: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="31"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = last day of month</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval Deadline Day
                  </label>
                  <input
                    type="number"
                    value={formData.approvalDeadlineDay}
                    onChange={(e) =>
                      setFormData({ ...formData, approvalDeadlineDay: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="31"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = last day of month</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lock Day</label>
                  <input
                    type="number"
                    value={formData.lockDay}
                    onChange={(e) => setFormData({ ...formData, lockDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="31"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = last day of month</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Months Ahead</label>
                  <input
                    type="number"
                    value={formData.forecastMonthsAhead}
                    onChange={(e) =>
                      setFormData({ ...formData, forecastMonthsAhead: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="24"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Set as default schedule</span>
              </label>

              {editingSchedule && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

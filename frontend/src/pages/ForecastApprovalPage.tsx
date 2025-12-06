import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  forecastVersionsService,
  forecastsService,
  type ForecastVersion,
  type Forecast,
  type ForecastSummary,
  ForecastStatus,
  getForecastStatusColor,
  getMonthShortName,
} from '../services/forecastService';
import toast from 'react-hot-toast';

export function ForecastApprovalPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  // Data state
  const [versions, setVersions] = useState<ForecastVersion[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ForecastStatus | 'pending'>(ForecastStatus.Submitted);
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overridingForecast, setOverridingForecast] = useState<Forecast | null>(null);
  const [overrideForm, setOverrideForm] = useState({ newHours: 0, reason: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Get unique projects from forecasts
  const projects = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string }>();
    forecasts.forEach(f => {
      if (f.projectId && f.projectName && !projectMap.has(f.projectId)) {
        projectMap.set(f.projectId, { id: f.projectId, name: f.projectName });
      }
    });
    return Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [forecasts]);

  // Filter forecasts
  const filteredForecasts = useMemo(() => {
    let result = forecasts;
    if (filterProjectId) {
      result = result.filter(f => f.projectId === filterProjectId);
    }
    return result;
  }, [forecasts, filterProjectId]);

  // Load data
  const loadVersions = async () => {
    if (!tenantId) return;
    try {
      const data = await forecastVersionsService.getAll({ tenantId, includeArchived: false });
      setVersions(data);
      const current = data.find(v => v.isCurrent);
      if (current && !selectedVersionId) {
        setSelectedVersionId(current.id);
      }
    } catch {
      toast.error('Failed to load forecast versions');
    }
  };

  const loadForecasts = async () => {
    if (!tenantId || !selectedVersionId) return;
    setIsLoading(true);
    try {
      const status = filterStatus === 'pending' ? ForecastStatus.Submitted : filterStatus;
      const data = await forecastsService.getAll({
        tenantId,
        versionId: selectedVersionId,
        status,
      });
      setForecasts(data);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to load forecasts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!tenantId || !selectedVersionId) return;
    try {
      const data = await forecastsService.getSummary({
        tenantId,
        versionId: selectedVersionId,
      });
      setSummary(data);
    } catch {
      // Summary is optional
    }
  };

  useEffect(() => {
    loadVersions();
  }, [tenantId]);

  useEffect(() => {
    if (selectedVersionId) {
      loadForecasts();
      loadSummary();
    }
  }, [selectedVersionId, filterStatus]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredForecasts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredForecasts.map(f => f.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Action handlers
  const handleApprove = async (forecast: Forecast) => {
    try {
      await forecastsService.approve(forecast.id);
      toast.success('Forecast approved');
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to approve forecast');
    }
  };

  const handleReject = async (forecast: Forecast) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      await forecastsService.reject(forecast.id, reason);
      toast.success('Forecast rejected');
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to reject forecast');
    }
  };

  const handleOpenOverride = (forecast: Forecast) => {
    setOverridingForecast(forecast);
    setOverrideForm({
      newHours: forecast.forecastedHours,
      reason: '',
    });
    setShowOverrideModal(true);
  };

  const handleOverride = async () => {
    if (!overridingForecast) return;
    if (!overrideForm.reason.trim()) {
      toast.error('Override reason is required');
      return;
    }

    setIsProcessing(true);
    try {
      await forecastsService.override(overridingForecast.id, {
        newHours: overrideForm.newHours,
        reason: overrideForm.reason,
      });
      toast.success('Forecast overridden');
      setShowOverrideModal(false);
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to override forecast');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error('No forecasts selected');
      return;
    }

    if (!tenantId) return;

    setIsProcessing(true);
    try {
      const result = await forecastsService.bulkApprove({
        tenantId,
        forecastIds: Array.from(selectedIds),
      });
      toast.success(`Approved ${result.approvedCount} forecasts`);
      setSelectedIds(new Set());
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to bulk approve forecasts');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage forecast approvals.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Approvals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve submitted labor hour forecasts
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : `Approve Selected (${selectedIds.size})`}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalHours.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400">
            <div className="text-sm text-gray-500">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.submittedCount}</div>
            <div className="text-xs text-gray-400">{summary.submittedHours.toLocaleString()} hrs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Approved</div>
            <div className="text-2xl font-bold text-green-600">{summary.approvedCount}</div>
            <div className="text-xs text-gray-400">{summary.approvedHours.toLocaleString()} hrs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Rejected</div>
            <div className="text-2xl font-bold text-red-600">{summary.rejectedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Overrides</div>
            <div className="text-2xl font-bold text-orange-600">{summary.overrideCount}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Select forecast version"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus === 'pending' ? 'pending' : filterStatus.toString()}
              onChange={(e) => setFilterStatus(e.target.value === 'pending' ? 'pending' : parseInt(e.target.value) as ForecastStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Filter by status"
            >
              <option value="pending">Pending Approval</option>
              <option value={ForecastStatus.Approved}>Approved</option>
              <option value={ForecastStatus.Rejected}>Rejected</option>
              <option value={ForecastStatus.Locked}>Locked</option>
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Filter by project"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Forecasts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading forecasts...</div>
        ) : !selectedVersionId ? (
          <div className="p-8 text-center text-gray-500">Select a version to view forecasts</div>
        ) : filteredForecasts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No forecasts found with the selected status.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredForecasts.length && filteredForecasts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    title="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position / Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredForecasts.map(forecast => (
                <tr key={forecast.id} className={selectedIds.has(forecast.id) ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(forecast.id)}
                      onChange={() => handleSelectOne(forecast.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      title={`Select forecast ${forecast.id}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{forecast.projectName}</div>
                    {forecast.wbsElementCode && (
                      <div className="text-xs text-gray-500">{forecast.wbsElementCode}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{forecast.positionTitle}</div>
                    <div className="text-xs text-gray-500">
                      {forecast.assigneeName || (forecast.isTbd ? 'TBD' : '-')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getMonthShortName(forecast.month)} {forecast.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="font-medium">{forecast.forecastedHours}</span>
                    {forecast.isOverride && (
                      <span className="ml-1 text-orange-500" title={`Original: ${forecast.originalForecastedHours}, Reason: ${forecast.overrideReason}`}>
                        *
                      </span>
                    )}
                    {forecast.recommendedHours && forecast.recommendedHours !== forecast.forecastedHours && (
                      <div className="text-xs text-gray-400">Rec: {forecast.recommendedHours}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getForecastStatusColor(forecast.status)}`}>
                      {forecast.statusName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={forecast.notes}>
                    {forecast.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {forecast.status === ForecastStatus.Submitted && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(forecast)}
                          className="text-green-600 hover:text-green-900 mr-2"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(forecast)}
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(forecast)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Override
                        </button>
                      </>
                    )}
                    {forecast.status === ForecastStatus.Approved && (
                      <button
                        type="button"
                        onClick={() => handleOpenOverride(forecast)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Override
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Override Modal */}
      {showOverrideModal && overridingForecast && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Override Forecast</h2>
            <p className="text-sm text-gray-500 mb-4">
              {overridingForecast.projectName} - {overridingForecast.positionTitle}<br />
              {getMonthShortName(overridingForecast.month)} {overridingForecast.year}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Hours: <span className="font-normal">{overridingForecast.forecastedHours}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Hours <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={overrideForm.newHours}
                  onChange={(e) => setOverrideForm({ ...overrideForm, newHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.5"
                  placeholder="Enter new hours"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reason for override..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverride}
                disabled={isProcessing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

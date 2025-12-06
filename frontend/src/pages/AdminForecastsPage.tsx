import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  forecastVersionsService,
  forecastsService,
  type ForecastVersion,
  type Forecast,
  type ForecastSummary,
  ForecastVersionType,
  ForecastStatus,
  getForecastStatusColor,
  getVersionTypeColor,
  getMonthShortName,
  generateMonthRange,
} from '../services/forecastService';
import { projectRoleAssignmentsService, type ProjectRoleAssignment } from '../services/staffingService';
import toast from 'react-hot-toast';

interface ForecastGridCell {
  forecast?: Forecast;
  year: number;
  month: number;
  assignmentId: string;
}

export function AdminForecastsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  // Data state
  const [versions, setVersions] = useState<ForecastVersion[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [assignments, setAssignments] = useState<ProjectRoleAssignment[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ForecastStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Period selection (defaults to current year, 12 months)
  const currentDate = new Date();
  const [startYear, setStartYear] = useState(currentDate.getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [monthCount, setMonthCount] = useState(12);

  // Modal state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ForecastVersion | null>(null);
  const [editingCell, setEditingCell] = useState<ForecastGridCell | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Version form state
  const [versionForm, setVersionForm] = useState({
    name: '',
    description: '',
    type: ForecastVersionType.WhatIf,
  });

  // Forecast form state
  const [forecastForm, setForecastForm] = useState({
    forecastedHours: 0,
    notes: '',
  });

  // Generate months for the grid
  const months = useMemo(() =>
    generateMonthRange(startYear, startMonth, monthCount),
    [startYear, startMonth, monthCount]
  );

  // Get unique projects from assignments
  const projects = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string }>();
    assignments.forEach(a => {
      if (a.projectId && a.projectName && !projectMap.has(a.projectId)) {
        projectMap.set(a.projectId, { id: a.projectId, name: a.projectName });
      }
    });
    return Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  // Filter assignments by project
  const filteredAssignments = useMemo(() => {
    let result = assignments;
    if (filterProjectId) {
      result = result.filter(a => a.projectId === filterProjectId);
    }
    return result;
  }, [assignments, filterProjectId]);

  // Build forecast grid data
  const forecastGrid = useMemo(() => {
    const grid: Map<string, Map<string, Forecast>> = new Map();

    forecasts.forEach(f => {
      const key = `${f.year}-${f.month}`;
      if (!grid.has(f.projectRoleAssignmentId)) {
        grid.set(f.projectRoleAssignmentId, new Map());
      }
      grid.get(f.projectRoleAssignmentId)!.set(key, f);
    });

    return grid;
  }, [forecasts]);

  const getForecastForCell = (assignmentId: string, year: number, month: number): Forecast | undefined => {
    return forecastGrid.get(assignmentId)?.get(`${year}-${month}`);
  };

  // Load data
  const loadVersions = async () => {
    if (!tenantId) return;
    try {
      const data = await forecastVersionsService.getAll({ tenantId, includeArchived: false });
      setVersions(data);

      // Select current version by default
      const current = data.find(v => v.isCurrent);
      if (current && !selectedVersionId) {
        setSelectedVersionId(current.id);
      }
    } catch {
      toast.error('Failed to load forecast versions');
    }
  };

  const loadAssignments = async () => {
    if (!tenantId) return;
    try {
      const data = await projectRoleAssignmentsService.getAll({
        tenantId,
        includeInactive: false,
      });
      setAssignments(data);
    } catch {
      toast.error('Failed to load assignments');
    }
  };

  const loadForecasts = async () => {
    if (!tenantId || !selectedVersionId) return;
    try {
      const data = await forecastsService.getAll({
        tenantId,
        versionId: selectedVersionId,
        projectId: filterProjectId || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });
      setForecasts(data);
    } catch {
      toast.error('Failed to load forecasts');
    }
  };

  const loadSummary = async () => {
    if (!tenantId || !selectedVersionId) return;
    try {
      const data = await forecastsService.getSummary({
        tenantId,
        versionId: selectedVersionId,
        projectId: filterProjectId || undefined,
      });
      setSummary(data);
    } catch {
      // Summary is optional, don't show error
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([loadVersions(), loadAssignments()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [tenantId]);

  useEffect(() => {
    if (selectedVersionId) {
      loadForecasts();
      loadSummary();
    }
  }, [selectedVersionId, filterProjectId, filterStatus]);

  // Version handlers
  const handleCreateVersion = () => {
    setEditingVersion(null);
    setVersionForm({
      name: '',
      description: '',
      type: ForecastVersionType.WhatIf,
    });
    setShowVersionModal(true);
  };

  const handleSaveVersion = async () => {
    if (!tenantId) return;
    if (!versionForm.name.trim()) {
      toast.error('Version name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVersion) {
        await forecastVersionsService.update(editingVersion.id, {
          name: versionForm.name,
          description: versionForm.description || undefined,
        });
        toast.success('Version updated');
      } else {
        await forecastVersionsService.create({
          tenantId,
          name: versionForm.name,
          description: versionForm.description || undefined,
          type: versionForm.type,
          startYear,
          startMonth,
          endYear: months[months.length - 1].year,
          endMonth: months[months.length - 1].month,
        });
        toast.success('Version created');
      }
      setShowVersionModal(false);
      loadVersions();
    } catch {
      toast.error('Failed to save version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloneVersion = async (version: ForecastVersion) => {
    const name = prompt('Enter name for the cloned version:', `${version.name} (Copy)`);
    if (!name) return;

    try {
      await forecastVersionsService.clone(version.id, {
        name,
        type: ForecastVersionType.WhatIf,
        copyForecasts: true,
      });
      toast.success('Version cloned');
      loadVersions();
    } catch {
      toast.error('Failed to clone version');
    }
  };

  const handlePromoteVersion = async (version: ForecastVersion) => {
    if (!confirm(`Promote "${version.name}" to the current version? This will archive the existing current version.`)) return;

    try {
      await forecastVersionsService.promote(version.id);
      toast.success('Version promoted to current');
      loadVersions();
    } catch {
      toast.error('Failed to promote version');
    }
  };

  const handleArchiveVersion = async (version: ForecastVersion) => {
    const reason = prompt('Enter archive reason (optional):');
    if (reason === null) return;

    try {
      await forecastVersionsService.archive(version.id, reason || undefined);
      toast.success('Version archived');
      loadVersions();
    } catch {
      toast.error('Failed to archive version');
    }
  };

  // Forecast handlers
  const handleCellClick = (assignment: ProjectRoleAssignment, year: number, month: number) => {
    const forecast = getForecastForCell(assignment.id, year, month);
    setEditingCell({
      forecast,
      year,
      month,
      assignmentId: assignment.id,
    });
    setForecastForm({
      forecastedHours: forecast?.forecastedHours || 0,
      notes: forecast?.notes || '',
    });
    setShowForecastModal(true);
  };

  const handleSaveForecast = async () => {
    if (!tenantId || !editingCell) return;

    setIsSaving(true);
    try {
      if (editingCell.forecast) {
        await forecastsService.update(editingCell.forecast.id, {
          forecastedHours: forecastForm.forecastedHours,
          notes: forecastForm.notes || undefined,
        });
        toast.success('Forecast updated');
      } else {
        await forecastsService.create({
          tenantId,
          projectRoleAssignmentId: editingCell.assignmentId,
          forecastVersionId: selectedVersionId,
          year: editingCell.year,
          month: editingCell.month,
          forecastedHours: forecastForm.forecastedHours,
          notes: forecastForm.notes || undefined,
        });
        toast.success('Forecast created');
      }
      setShowForecastModal(false);
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to save forecast');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForecast = async (forecast: Forecast) => {
    try {
      await forecastsService.submit(forecast.id);
      toast.success('Forecast submitted for approval');
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to submit forecast');
    }
  };

  const handleApproveForecast = async (forecast: Forecast) => {
    try {
      await forecastsService.approve(forecast.id);
      toast.success('Forecast approved');
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to approve forecast');
    }
  };

  const handleRejectForecast = async (forecast: Forecast) => {
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

  const handleLockMonth = async (year: number, month: number) => {
    if (!tenantId || !selectedVersionId) return;
    if (!confirm(`Lock all forecasts for ${getMonthShortName(month)} ${year}? This action cannot be undone.`)) return;

    try {
      const result = await forecastsService.lockMonth({
        tenantId,
        forecastVersionId: selectedVersionId,
        projectId: filterProjectId || undefined,
        year,
        month,
      });
      toast.success(`Locked ${result.lockedCount} forecasts`);
      loadForecasts();
      loadSummary();
    } catch {
      toast.error('Failed to lock month');
    }
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage forecasts.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecasts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage labor hour forecasts by project role assignment
          </p>
        </div>
        <button
          onClick={handleCreateVersion}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          New Version
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalHours.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Draft</div>
            <div className="text-2xl font-bold text-gray-600">{summary.draftCount}</div>
            <div className="text-xs text-gray-400">{summary.draftHours.toLocaleString()} hrs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Submitted</div>
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
            <div className="text-sm text-gray-500">Locked</div>
            <div className="text-2xl font-bold text-blue-600">{summary.lockedCount}</div>
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
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus === 'all' ? 'all' : filterStatus.toString()}
              onChange={(e) => setFilterStatus(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as ForecastStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value={ForecastStatus.Draft}>Draft</option>
              <option value={ForecastStatus.Submitted}>Submitted</option>
              <option value={ForecastStatus.Approved}>Approved</option>
              <option value={ForecastStatus.Rejected}>Rejected</option>
              <option value={ForecastStatus.Locked}>Locked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <div className="flex gap-2">
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{getMonthShortName(m)}</option>
                ))}
              </select>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value) || currentDate.getFullYear())}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
            <select
              value={monthCount}
              onChange={(e) => setMonthCount(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={18}>18 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Version Info */}
      {selectedVersion && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-lg font-medium">{selectedVersion.name}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getVersionTypeColor(selectedVersion.type)}`}>
                  {selectedVersion.typeName}
                </span>
                {selectedVersion.isCurrent && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                    Current
                  </span>
                )}
              </div>
              {selectedVersion.description && (
                <span className="text-sm text-gray-500">{selectedVersion.description}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCloneVersion(selectedVersion)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                Clone
              </button>
              {!selectedVersion.isCurrent && (
                <button
                  onClick={() => handlePromoteVersion(selectedVersion)}
                  className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                >
                  Promote
                </button>
              )}
              <button
                onClick={() => handleArchiveVersion(selectedVersion)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Loading forecasts...
        </div>
      ) : !selectedVersionId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Select a version to view forecasts
        </div>
      ) : viewMode === 'grid' ? (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                  Assignment
                </th>
                {months.map(({ year, month }) => (
                  <th key={`${year}-${month}`} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    <div>{getMonthShortName(month)}</div>
                    <div className="text-gray-400">{year}</div>
                    <button
                      onClick={() => handleLockMonth(year, month)}
                      className="text-blue-500 hover:text-blue-700 text-xs mt-1"
                      title="Lock month"
                    >
                      Lock
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={months.length + 2} className="px-4 py-8 text-center text-gray-500">
                    No assignments found. Create project role assignments first.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map(assignment => {
                  const rowTotal = months.reduce((sum, { year, month }) => {
                    const forecast = getForecastForCell(assignment.id, year, month);
                    return sum + (forecast?.forecastedHours || 0);
                  }, 0);

                  return (
                    <tr key={assignment.id}>
                      <td className="px-4 py-2 whitespace-nowrap sticky left-0 bg-white z-10 border-r">
                        <div className="text-sm font-medium text-gray-900">{assignment.projectName}</div>
                        <div className="text-xs text-gray-500">
                          {assignment.positionTitle}
                          {assignment.assigneeName && ` - ${assignment.assigneeName}`}
                        </div>
                      </td>
                      {months.map(({ year, month }) => {
                        const forecast = getForecastForCell(assignment.id, year, month);
                        return (
                          <td
                            key={`${year}-${month}`}
                            onClick={() => handleCellClick(assignment, year, month)}
                            className="px-2 py-2 text-center cursor-pointer hover:bg-blue-50"
                          >
                            {forecast ? (
                              <div>
                                <div className="text-sm font-medium">{forecast.forecastedHours}</div>
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  forecast.status === ForecastStatus.Draft ? 'bg-gray-400' :
                                  forecast.status === ForecastStatus.Submitted ? 'bg-yellow-400' :
                                  forecast.status === ForecastStatus.Approved ? 'bg-green-400' :
                                  forecast.status === ForecastStatus.Rejected ? 'bg-red-400' :
                                  'bg-blue-400'
                                }`} title={forecast.statusName}></span>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium">
                        {rowTotal > 0 ? rowTotal.toLocaleString() : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forecasts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No forecasts found for the selected filters.
                  </td>
                </tr>
              ) : (
                forecasts.map(forecast => (
                  <tr key={forecast.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {forecast.positionTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {forecast.assigneeName || (forecast.isTbd ? 'TBD' : '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {forecast.periodDisplay}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {forecast.forecastedHours}
                      {forecast.isOverride && (
                        <span className="ml-1 text-xs text-orange-500" title={`Original: ${forecast.originalForecastedHours}`}>*</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getForecastStatusColor(forecast.status)}`}>
                        {forecast.statusName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {forecast.status === ForecastStatus.Draft && (
                        <button
                          onClick={() => handleSubmitForecast(forecast)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Submit
                        </button>
                      )}
                      {forecast.status === ForecastStatus.Submitted && (
                        <>
                          <button
                            onClick={() => handleApproveForecast(forecast)}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectForecast(forecast)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingVersion ? 'Edit Version' : 'Create New Version'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={versionForm.name}
                  onChange={(e) => setVersionForm({ ...versionForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q1 2025 Forecast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={versionForm.description}
                  onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              {!editingVersion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={versionForm.type}
                    onChange={(e) => setVersionForm({ ...versionForm, type: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={ForecastVersionType.WhatIf}>What-If Scenario</option>
                    <option value={ForecastVersionType.Import}>Import</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingVersion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Modal */}
      {showForecastModal && editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCell.forecast ? 'Edit Forecast' : 'Create Forecast'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {getMonthShortName(editingCell.month)} {editingCell.year}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forecasted Hours
                </label>
                <input
                  type="number"
                  value={forecastForm.forecastedHours}
                  onChange={(e) => setForecastForm({ ...forecastForm, forecastedHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.5"
                />
                {editingCell.forecast?.recommendedHours && (
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: {editingCell.forecast.recommendedHours} hours
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={forecastForm.notes}
                  onChange={(e) => setForecastForm({ ...forecastForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>

              {editingCell.forecast && (
                <div className="text-sm text-gray-500">
                  <p>Status: <span className={`px-2 py-0.5 rounded-full text-xs ${getForecastStatusColor(editingCell.forecast.status)}`}>
                    {editingCell.forecast.statusName}
                  </span></p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForecastModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForecast}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingCell.forecast ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

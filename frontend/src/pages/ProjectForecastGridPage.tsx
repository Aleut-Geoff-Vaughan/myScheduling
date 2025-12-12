import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import {
  forecastsService,
  forecastVersionsService,
  type Forecast,
  ForecastStatus,
} from '../services/forecastService';
import { projectRoleAssignmentsService, type ProjectRoleAssignment } from '../services/staffingService';
import { projectsService } from '../services/projectsService';
import { AddPositionModal } from '../components/AddPositionModal';
import { NonLaborCostsGrid } from '../components/NonLaborCostsGrid';
import { useFiscalYear, getFiscalYearStartDate, type MonthInfo } from '../hooks/useFiscalYear';

type GranularityMode = 'monthly' | 'weekly';
type GroupByMode = 'wbs' | 'user';

export function ProjectForecastGridPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  // Fiscal year support
  const fiscalYear = useFiscalYear();

  const [granularity, setGranularity] = useState<GranularityMode>('monthly');
  const [groupBy, setGroupBy] = useState<GroupByMode>('wbs');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(fiscalYear.currentFiscalYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectRoleAssignment | null>(null);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getById(projectId!),
    enabled: !!projectId,
  });

  // Fetch assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: () => projectRoleAssignmentsService.getByProject(projectId!),
    enabled: !!projectId,
  });

  // Fetch current version
  const { data: currentVersion } = useQuery({
    queryKey: ['current-version', tenantId],
    queryFn: () => forecastVersionsService.getCurrent(tenantId),
    enabled: !!tenantId,
  });

  // Calculate the calendar year range that corresponds to the selected fiscal year
  const fiscalYearStartDate = useMemo(() => {
    return getFiscalYearStartDate(selectedFiscalYear, fiscalYear.config.startMonth);
  }, [selectedFiscalYear, fiscalYear.config.startMonth]);

  // For querying, we may need to fetch multiple calendar years for a fiscal year
  // that spans two calendar years (e.g., FY2025 = Oct 2024 - Sep 2025)
  const calendarYearsToFetch = useMemo(() => {
    if (fiscalYear.config.startMonth === 1) {
      return [selectedFiscalYear]; // Calendar year, just one
    }
    // Fiscal year spans two calendar years
    return [selectedFiscalYear - 1, selectedFiscalYear];
  }, [selectedFiscalYear, fiscalYear.config.startMonth]);

  // Fetch forecasts for all relevant calendar years
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ['project-forecasts', projectId, currentVersion?.id, calendarYearsToFetch],
    queryFn: async () => {
      const allForecasts = await Promise.all(
        calendarYearsToFetch.map(year =>
          forecastsService.getByProject(projectId!, {
            versionId: currentVersion?.id,
            year,
          })
        )
      );
      return allForecasts.flat();
    },
    enabled: !!projectId && !!currentVersion?.id,
  });

  // Update forecast mutation
  const updateForecastMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      forecastsService.update(id, { forecastedHours: hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-forecasts'] });
      toast.success('Forecast updated');
    },
    onError: () => {
      toast.error('Failed to update forecast');
    },
  });

  // Create forecast mutation
  const createForecastMutation = useMutation({
    mutationFn: (data: { assignmentId: string; year: number; month: number; hours: number }) =>
      forecastsService.create({
        tenantId,
        projectRoleAssignmentId: data.assignmentId,
        forecastVersionId: currentVersion?.id,
        year: data.year,
        month: data.month,
        forecastedHours: data.hours,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-forecasts'] });
      toast.success('Forecast created');
    },
    onError: () => {
      toast.error('Failed to create forecast');
    },
  });

  // Submit forecasts mutation
  const submitForecastsMutation = useMutation({
    mutationFn: async (forecastIds: string[]) => {
      await Promise.all(forecastIds.map(id => forecastsService.submit(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-forecasts'] });
      setSelectedRows(new Set());
      toast.success('Forecasts submitted');
    },
    onError: () => {
      toast.error('Failed to submit forecasts');
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => projectRoleAssignmentsService.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-forecasts'] });
      setShowDeleteConfirm(false);
      setSelectedAssignment(null);
      toast.success('Assignment deleted');
    },
    onError: () => {
      toast.error('Failed to delete assignment');
    },
  });

  // Generate month columns using fiscal year
  const months: MonthInfo[] = useMemo(() => {
    // Get start date for the fiscal year
    const startDate = fiscalYearStartDate;
    const count = selectedQuarter ? 3 : 12;

    // For quarter selection, offset the start date
    let adjustedStartDate = startDate;
    if (selectedQuarter) {
      const quarterOffset = (selectedQuarter - 1) * 3;
      adjustedStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + quarterOffset, 1);
    }

    return fiscalYear.getMonthRange(adjustedStartDate, count);
  }, [fiscalYearStartDate, selectedQuarter, fiscalYear]);

  // Build forecast lookup map
  const forecastMap = useMemo(() => {
    const map: Record<string, Forecast> = {};
    forecasts.forEach(f => {
      const key = `${f.projectRoleAssignmentId}-${f.year}-${f.month}`;
      map[key] = f;
    });
    return map;
  }, [forecasts]);

  // Group assignments by WBS
  const assignmentsByWbs = useMemo(() => {
    const groups: Record<string, { groupKey: string; groupLabel: string; groupSubLabel: string; assignments: ProjectRoleAssignment[] }> = {};
    const noWbs: ProjectRoleAssignment[] = [];

    assignments.forEach(a => {
      if (a.wbsElementId && a.wbsElementCode) {
        if (!groups[a.wbsElementId]) {
          groups[a.wbsElementId] = {
            groupKey: a.wbsElementId,
            groupLabel: a.wbsElementCode,
            groupSubLabel: a.wbsElementDescription || '',
            assignments: [],
          };
        }
        groups[a.wbsElementId].assignments.push(a);
      } else {
        noWbs.push(a);
      }
    });

    const result = Object.values(groups).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
    if (noWbs.length > 0) {
      result.push({ groupKey: 'no-wbs', groupLabel: 'No WBS', groupSubLabel: 'Unassigned', assignments: noWbs });
    }
    return result;
  }, [assignments]);

  // Group assignments by User
  const assignmentsByUser = useMemo(() => {
    const groups: Record<string, { groupKey: string; groupLabel: string; groupSubLabel: string; assignments: ProjectRoleAssignment[] }> = {};
    const unassigned: ProjectRoleAssignment[] = [];

    assignments.forEach(a => {
      const assigneeKey = a.userId || a.subcontractorId;
      if (assigneeKey && a.assigneeName && !a.isTbd) {
        if (!groups[assigneeKey]) {
          groups[assigneeKey] = {
            groupKey: assigneeKey,
            groupLabel: a.assigneeName,
            groupSubLabel: a.subcontractorCompanyName || '',
            assignments: [],
          };
        }
        groups[assigneeKey].assignments.push(a);
      } else {
        unassigned.push(a);
      }
    });

    const result = Object.values(groups).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
    if (unassigned.length > 0) {
      result.push({ groupKey: 'unassigned', groupLabel: 'TBD / Unassigned', groupSubLabel: '', assignments: unassigned });
    }
    return result;
  }, [assignments]);

  // Select the active grouping based on toggle
  const groupedAssignments = useMemo(() => {
    return groupBy === 'wbs' ? assignmentsByWbs : assignmentsByUser;
  }, [groupBy, assignmentsByWbs, assignmentsByUser]);

  // Calculate totals
  const totals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let total = 0;

    months.forEach(m => {
      const key = `${m.year}-${m.month}`;
      byMonth[key] = 0;
    });

    forecasts.forEach(f => {
      const key = `${f.year}-${f.month}`;
      if (byMonth[key] !== undefined) {
        byMonth[key] += f.forecastedHours;
        total += f.forecastedHours;
      }
    });

    return { byMonth, total };
  }, [forecasts, months]);

  const getCellKey = (assignmentId: string, year: number, month: number) =>
    `${assignmentId}-${year}-${month}`;

  const getCellForecast = useCallback(
    (assignmentId: string, year: number, month: number) =>
      forecastMap[getCellKey(assignmentId, year, month)],
    [forecastMap]
  );

  const handleCellClick = (assignmentId: string, year: number, month: number) => {
    const cellKey = getCellKey(assignmentId, year, month);
    const forecast = getCellForecast(assignmentId, year, month);

    // Don't edit locked or approved forecasts
    if (forecast && (forecast.status === ForecastStatus.Locked || forecast.status === ForecastStatus.Approved)) {
      return;
    }

    setEditingCell(cellKey);
    if (!cellValues[cellKey]) {
      setCellValues(prev => ({
        ...prev,
        [cellKey]: forecast?.forecastedHours || 0,
      }));
    }
  };

  const handleCellChange = (cellKey: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCellValues(prev => ({ ...prev, [cellKey]: numValue }));
  };

  const handleCellBlur = useCallback((assignmentId: string, year: number, month: number) => {
    const cellKey = getCellKey(assignmentId, year, month);
    const newValue = cellValues[cellKey];
    const forecast = getCellForecast(assignmentId, year, month);

    if (forecast) {
      if (newValue !== forecast.forecastedHours) {
        updateForecastMutation.mutate({ id: forecast.id, hours: newValue });
      }
    } else if (newValue > 0) {
      createForecastMutation.mutate({
        assignmentId,
        year,
        month,
        hours: newValue,
      });
    }

    setEditingCell(null);
  }, [cellValues, getCellForecast, updateForecastMutation, createForecastMutation]);

  const handleKeyDown = (e: React.KeyboardEvent, assignmentId: string, year: number, month: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur(assignmentId, year, month);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleRowSelect = (assignmentId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  const handleSubmitSelected = () => {
    const forecastIds = forecasts
      .filter(f => selectedRows.has(f.projectRoleAssignmentId) && f.status === ForecastStatus.Draft)
      .map(f => f.id);

    if (forecastIds.length === 0) {
      toast.error('No draft forecasts selected');
      return;
    }

    submitForecastsMutation.mutate(forecastIds);
  };

  const isLoading = projectLoading || assignmentsLoading || forecastsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/forecast/projects" className="hover:text-emerald-600">Projects</Link>
            <span>/</span>
            <span>{project?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Grid</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Group By Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
            <button
              type="button"
              onClick={() => setGroupBy('wbs')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${groupBy === 'wbs' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
              title="Group by WBS Element"
            >
              By WBS
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('user')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${groupBy === 'user' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
              title="Group by Assignee"
            >
              By User
            </button>
          </div>

          {/* Granularity Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
            <button
              type="button"
              onClick={() => setGranularity('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${granularity === 'monthly' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setGranularity('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${granularity === 'weekly' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Weekly
            </button>
          </div>

          {/* Fiscal/Calendar Year Toggle */}
          {!fiscalYear.isCalendarYear && (
            <button
              type="button"
              onClick={fiscalYear.toggleMode}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                fiscalYear.mode === 'fiscal'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
              title={`Switch to ${fiscalYear.mode === 'fiscal' ? 'calendar' : 'fiscal'} year view`}
            >
              {fiscalYear.mode === 'fiscal' ? 'FY' : 'CY'}
            </button>
          )}

          {/* Year Select */}
          <select
            value={selectedFiscalYear}
            onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            title="Select fiscal year"
            aria-label="Select fiscal year"
          >
            {[fiscalYear.currentFiscalYear - 1, fiscalYear.currentFiscalYear, fiscalYear.currentFiscalYear + 1].map(fy => (
              <option key={fy} value={fy}>
                {fiscalYear.isCalendarYear ? fy : `${fiscalYear.config.prefix}${fy}`}
              </option>
            ))}
          </select>

          {/* Quarter Filter - uses fiscal quarters */}
          <select
            value={selectedQuarter || ''}
            onChange={(e) => setSelectedQuarter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            title="Select quarter"
            aria-label="Select quarter"
          >
            <option value="">Full Year</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>

          {/* Add Position Button */}
          <button
            type="button"
            onClick={() => setShowAddPositionModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Position
          </button>

          {/* Actions */}
          {selectedRows.size > 0 && (
            <button
              type="button"
              onClick={handleSubmitSelected}
              disabled={submitForecastsMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Submit Selected ({selectedRows.size})
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-sm text-gray-500">Total Forecasted:</span>
            <span className="ml-2 text-lg font-bold text-emerald-600">{totals.total.toLocaleString()} hrs</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Budget:</span>
            <span className="ml-2 text-lg font-medium text-gray-900">- hrs</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Assignments:</span>
            <span className="ml-2 text-lg font-medium text-gray-900">{assignments.length}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Version:</span>
            <span className="ml-2 text-sm font-medium text-gray-700">{currentVersion?.name || 'Current'}</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                  <span className="sr-only">Select all</span>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(new Set(assignments.map(a => a.id)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    checked={selectedRows.size === assignments.length && assignments.length > 0}
                    aria-label="Select all rows"
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px] sticky left-0 bg-gray-50">
                  Position / Assignee
                </th>
                {months.map(m => (
                  <th key={`${m.year}-${m.month}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                    {fiscalYear.mode === 'fiscal' && !fiscalYear.isCalendarYear ? m.fiscalLabel : m.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24 sticky right-0 bg-gray-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupedAssignments.map(group => (
                <AssignmentGroup
                  key={group.groupKey}
                  group={group}
                  groupBy={groupBy}
                  months={months}
                  forecastMap={forecastMap}
                  editingCell={editingCell}
                  cellValues={cellValues}
                  selectedRows={selectedRows}
                  onCellClick={handleCellClick}
                  onCellChange={handleCellChange}
                  onCellBlur={handleCellBlur}
                  onKeyDown={handleKeyDown}
                  onRowSelect={handleRowSelect}
                  onEditRow={(assignment) => {
                    setSelectedAssignment(assignment);
                    setShowEditModal(true);
                  }}
                  onDeleteRow={(assignment) => {
                    setSelectedAssignment(assignment);
                    setShowDeleteConfirm(true);
                  }}
                />
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-50 font-medium">
                <td className="px-3 py-3"></td>
                <td className="px-4 py-3 sticky left-0 bg-gray-50 text-sm text-gray-900">Total</td>
                {months.map(m => {
                  const key = `${m.year}-${m.month}`;
                  return (
                    <td key={key} className="px-3 py-3 text-center text-sm text-gray-900">
                      {totals.byMonth[key] || 0}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right text-sm text-emerald-600 sticky right-0 bg-gray-50">
                  {totals.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></span> Draft
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span> Submitted
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span> Reviewed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> Locked
        </span>
      </div>

      {/* Non-Labor Costs Section */}
      {projectId && (
        <NonLaborCostsGrid
          projectId={projectId}
          months={months}
          versionId={currentVersion?.id}
          year={selectedFiscalYear}
        />
      )}

      {/* Add Position Modal */}
      {showAddPositionModal && project && (
        <AddPositionModal
          projectId={projectId!}
          projectName={project.name}
          tenantId={tenantId}
          onClose={() => setShowAddPositionModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] });
            setShowAddPositionModal(false);
          }}
        />
      )}

      {/* Edit Position Modal */}
      {showEditModal && selectedAssignment && project && (
        <AddPositionModal
          projectId={projectId!}
          projectName={project.name}
          tenantId={tenantId}
          editAssignment={selectedAssignment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] });
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Assignment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete the assignment for{' '}
                <span className="font-medium">{selectedAssignment.positionTitle}</span>
                {selectedAssignment.assigneeName && (
                  <> assigned to <span className="font-medium">{selectedAssignment.assigneeName}</span></>
                )}
                ? This will also delete all associated forecasts.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedAssignment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteAssignmentMutation.mutate(selectedAssignment.id)}
                  disabled={deleteAssignmentMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteAssignmentMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssignmentGroupProps {
  group: { groupKey: string; groupLabel: string; groupSubLabel: string; assignments: ProjectRoleAssignment[] };
  groupBy: GroupByMode;
  months: MonthInfo[];
  forecastMap: Record<string, Forecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  selectedRows: Set<string>;
  onCellClick: (assignmentId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (assignmentId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, assignmentId: string, year: number, month: number) => void;
  onRowSelect: (assignmentId: string) => void;
  onEditRow: (assignment: ProjectRoleAssignment) => void;
  onDeleteRow: (assignment: ProjectRoleAssignment) => void;
}

function AssignmentGroup({
  group,
  groupBy,
  months,
  forecastMap,
  editingCell,
  cellValues,
  selectedRows,
  onCellClick,
  onCellChange,
  onCellBlur,
  onKeyDown,
  onRowSelect,
  onEditRow,
  onDeleteRow,
}: AssignmentGroupProps) {
  const [expanded, setExpanded] = useState(true);

  // Calculate group totals
  const groupTotals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let total = 0;

    months.forEach(m => {
      byMonth[`${m.year}-${m.month}`] = 0;
    });

    group.assignments.forEach(a => {
      months.forEach(m => {
        const key = `${a.id}-${m.year}-${m.month}`;
        const forecast = forecastMap[key];
        if (forecast) {
          byMonth[`${m.year}-${m.month}`] += forecast.forecastedHours;
          total += forecast.forecastedHours;
        }
      });
    });

    return { byMonth, total };
  }, [group.assignments, months, forecastMap]);

  return (
    <>
      {/* Group Header Row */}
      <tr className="bg-gray-100">
        <td className="px-3 py-2"></td>
        <td className="px-4 py-2 sticky left-0 bg-gray-100">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {groupBy === 'user' && (
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            {group.groupLabel}
            {group.groupSubLabel && (
              <span className="text-gray-500 font-normal">- {group.groupSubLabel}</span>
            )}
            <span className="text-xs text-gray-400 font-normal">({group.assignments.length})</span>
          </button>
        </td>
        {months.map(m => {
          const key = `${m.year}-${m.month}`;
          return (
            <td key={key} className="px-3 py-2 text-center text-xs text-gray-600">
              {groupTotals.byMonth[key] || ''}
            </td>
          );
        })}
        <td className="px-4 py-2 text-right text-xs font-medium text-gray-700 sticky right-0 bg-gray-100">
          {groupTotals.total || ''}
        </td>
      </tr>
      {/* Assignment Rows */}
      {expanded && group.assignments.map(assignment => (
        <AssignmentRow
          key={assignment.id}
          assignment={assignment}
          groupBy={groupBy}
          months={months}
          forecastMap={forecastMap}
          editingCell={editingCell}
          cellValues={cellValues}
          isSelected={selectedRows.has(assignment.id)}
          onCellClick={onCellClick}
          onCellChange={onCellChange}
          onCellBlur={onCellBlur}
          onKeyDown={onKeyDown}
          onSelect={() => onRowSelect(assignment.id)}
          onEdit={() => onEditRow(assignment)}
          onDelete={() => onDeleteRow(assignment)}
        />
      ))}
    </>
  );
}

interface AssignmentRowProps {
  assignment: ProjectRoleAssignment;
  groupBy: GroupByMode;
  months: MonthInfo[];
  forecastMap: Record<string, Forecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  isSelected: boolean;
  onCellClick: (assignmentId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (assignmentId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, assignmentId: string, year: number, month: number) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AssignmentRow({
  assignment,
  groupBy,
  months,
  forecastMap,
  editingCell,
  cellValues,
  isSelected,
  onCellClick,
  onCellChange,
  onCellBlur,
  onKeyDown,
  onSelect,
  onEdit,
  onDelete,
}: AssignmentRowProps) {
  const [showActions, setShowActions] = useState(false);

  const rowTotal = useMemo(() => {
    return months.reduce((sum, m) => {
      const key = `${assignment.id}-${m.year}-${m.month}`;
      const forecast = forecastMap[key];
      return sum + (forecast?.forecastedHours || 0);
    }, 0);
  }, [assignment.id, months, forecastMap]);

  const getCellBgColor = (status?: ForecastStatus) => {
    if (status === undefined || status === null) return 'bg-white';
    if (status === ForecastStatus.Draft) return 'bg-gray-50';
    if (status === ForecastStatus.Submitted) return 'bg-yellow-50';
    if (status === ForecastStatus.Reviewed) return 'bg-purple-50';
    if (status === ForecastStatus.Approved) return 'bg-green-50';
    if (status === ForecastStatus.Locked) return 'bg-blue-50';
    if (status === ForecastStatus.Rejected) return 'bg-red-50';
    return 'bg-white';
  };

  // When grouped by user, show WBS info; when grouped by WBS, show user info
  const primaryLabel = groupBy === 'user'
    ? assignment.positionTitle
    : assignment.positionTitle;

  const secondaryLabel = groupBy === 'user'
    ? (assignment.wbsElementCode ? `WBS: ${assignment.wbsElementCode}` : 'No WBS')
    : (assignment.assigneeName || (assignment.isTbd ? 'TBD' : 'Unassigned'));

  return (
    <tr
      className={`hover:bg-gray-50 ${isSelected ? 'bg-emerald-50' : ''} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select ${assignment.positionTitle}`}
          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
      </td>
      <td className={`px-4 py-2 sticky left-0 ${isSelected ? 'bg-emerald-50' : 'bg-white'} group-hover:bg-gray-50`}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">{primaryLabel}</div>
            <div className="text-xs text-gray-500 truncate">
              {secondaryLabel}
              {groupBy === 'wbs' && assignment.isTbd && <span className="ml-1 text-amber-600">(TBD)</span>}
              {groupBy === 'wbs' && assignment.subcontractorCompanyName && (
                <span className="ml-1 text-cyan-600">({assignment.subcontractorCompanyName})</span>
              )}
            </div>
          </div>
          {/* Edit/Delete Actions */}
          <div className={`flex items-center gap-1 ml-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit assignment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete assignment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </td>
      {months.map(m => {
        const cellKey = `${assignment.id}-${m.year}-${m.month}`;
        const forecast = forecastMap[cellKey];
        const isEditing = editingCell === cellKey;
        const value = cellValues[cellKey] ?? forecast?.forecastedHours ?? 0;
        const isLocked = forecast?.status === ForecastStatus.Locked || forecast?.status === ForecastStatus.Approved;

        return (
          <td
            key={cellKey}
            className={`px-1 py-1 text-center ${getCellBgColor(forecast?.status)} ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isLocked && onCellClick(assignment.id, m.year, m.month)}
          >
            {isEditing ? (
              <input
                type="number"
                value={value}
                onChange={(e) => onCellChange(cellKey, e.target.value)}
                onBlur={() => onCellBlur(assignment.id, m.year, m.month)}
                onKeyDown={(e) => onKeyDown(e, assignment.id, m.year, m.month)}
                aria-label={`Hours for ${assignment.positionTitle} in ${m.label}`}
                className="w-16 px-1 py-0.5 text-center text-sm border border-emerald-500 rounded focus:ring-2 focus:ring-emerald-500"
                autoFocus
                min={0}
                step={1}
              />
            ) : (
              <span className={`text-sm ${value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {value > 0 ? value : '-'}
              </span>
            )}
          </td>
        );
      })}
      <td className={`px-4 py-2 text-right text-sm font-medium text-gray-900 sticky right-0 ${isSelected ? 'bg-emerald-50' : 'bg-white'} group-hover:bg-gray-50`}>
        {rowTotal > 0 ? rowTotal : '-'}
      </td>
    </tr>
  );
}

export default ProjectForecastGridPage;

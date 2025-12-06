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
  getMonthShortName,
  generateMonthRange,
} from '../services/forecastService';
import { projectRoleAssignmentsService, type ProjectRoleAssignment } from '../services/staffingService';
import { projectsService } from '../services/projectsService';

type GranularityMode = 'monthly' | 'weekly';

export function ProjectForecastGridPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  const [granularity, setGranularity] = useState<GranularityMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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

  // Fetch forecasts
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ['project-forecasts', projectId, currentVersion?.id, selectedYear],
    queryFn: () => forecastsService.getByProject(projectId!, {
      versionId: currentVersion?.id,
      year: selectedYear,
    }),
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

  // Generate month columns
  const months = useMemo(() => {
    const startMonth = selectedQuarter ? (selectedQuarter - 1) * 3 + 1 : 1;
    const count = selectedQuarter ? 3 : 12;
    return generateMonthRange(selectedYear, startMonth, count);
  }, [selectedYear, selectedQuarter]);

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
    const groups: Record<string, { wbsCode: string; wbsDescription: string; assignments: ProjectRoleAssignment[] }> = {};
    const noWbs: ProjectRoleAssignment[] = [];

    assignments.forEach(a => {
      if (a.wbsElementId && a.wbsElementCode) {
        if (!groups[a.wbsElementId]) {
          groups[a.wbsElementId] = {
            wbsCode: a.wbsElementCode,
            wbsDescription: a.wbsElementDescription || '',
            assignments: [],
          };
        }
        groups[a.wbsElementId].assignments.push(a);
      } else {
        noWbs.push(a);
      }
    });

    const result = Object.values(groups).sort((a, b) => a.wbsCode.localeCompare(b.wbsCode));
    if (noWbs.length > 0) {
      result.push({ wbsCode: 'No WBS', wbsDescription: 'Unassigned', assignments: noWbs });
    }
    return result;
  }, [assignments]);

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

  const getCellForecast = (assignmentId: string, year: number, month: number) =>
    forecastMap[getCellKey(assignmentId, year, month)];

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
  }, [cellValues, forecastMap, updateForecastMutation, createForecastMutation]);

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
          {/* Granularity Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setGranularity('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${granularity === 'monthly' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setGranularity('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${granularity === 'weekly' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Weekly
            </button>
          </div>

          {/* Year Select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Quarter Filter */}
          <select
            value={selectedQuarter || ''}
            onChange={(e) => setSelectedQuarter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Full Year</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>

          {/* Actions */}
          {selectedRows.size > 0 && (
            <button
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
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
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px] sticky left-0 bg-gray-50">
                  Position / Assignee
                </th>
                {months.map(m => (
                  <th key={`${m.year}-${m.month}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                    {getMonthShortName(m.month)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24 sticky right-0 bg-gray-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignmentsByWbs.map(group => (
                <WbsGroup
                  key={group.wbsCode}
                  group={group}
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
    </div>
  );
}

interface WbsGroupProps {
  group: { wbsCode: string; wbsDescription: string; assignments: ProjectRoleAssignment[] };
  months: { year: number; month: number }[];
  forecastMap: Record<string, Forecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  selectedRows: Set<string>;
  onCellClick: (assignmentId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (assignmentId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, assignmentId: string, year: number, month: number) => void;
  onRowSelect: (assignmentId: string) => void;
}

function WbsGroup({
  group,
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
}: WbsGroupProps) {
  const [expanded, setExpanded] = useState(true);

  // Calculate WBS totals
  const wbsTotals = useMemo(() => {
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
      {/* WBS Header Row */}
      <tr className="bg-gray-100">
        <td className="px-3 py-2"></td>
        <td className="px-4 py-2 sticky left-0 bg-gray-100">
          <button
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
            {group.wbsCode}
            {group.wbsDescription && (
              <span className="text-gray-500 font-normal">- {group.wbsDescription}</span>
            )}
          </button>
        </td>
        {months.map(m => {
          const key = `${m.year}-${m.month}`;
          return (
            <td key={key} className="px-3 py-2 text-center text-xs text-gray-600">
              {wbsTotals.byMonth[key] || ''}
            </td>
          );
        })}
        <td className="px-4 py-2 text-right text-xs font-medium text-gray-700 sticky right-0 bg-gray-100">
          {wbsTotals.total || ''}
        </td>
      </tr>
      {/* Assignment Rows */}
      {expanded && group.assignments.map(assignment => (
        <AssignmentRow
          key={assignment.id}
          assignment={assignment}
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
        />
      ))}
    </>
  );
}

interface AssignmentRowProps {
  assignment: ProjectRoleAssignment;
  months: { year: number; month: number }[];
  forecastMap: Record<string, Forecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  isSelected: boolean;
  onCellClick: (assignmentId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (assignmentId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, assignmentId: string, year: number, month: number) => void;
  onSelect: () => void;
}

function AssignmentRow({
  assignment,
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
}: AssignmentRowProps) {
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

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-emerald-50' : ''}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
      </td>
      <td className="px-4 py-2 sticky left-0 bg-white">
        <div className="text-sm font-medium text-gray-900">{assignment.positionTitle}</div>
        <div className="text-xs text-gray-500">
          {assignment.assigneeName}
          {assignment.isTbd && <span className="ml-1 text-amber-600">(TBD)</span>}
          {assignment.subcontractorCompanyName && (
            <span className="ml-1 text-cyan-600">({assignment.subcontractorCompanyName})</span>
          )}
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
      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 sticky right-0 bg-white">
        {rowTotal > 0 ? rowTotal : '-'}
      </td>
    </tr>
  );
}

export default ProjectForecastGridPage;

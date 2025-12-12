import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import {
  forecastsService,
  type Forecast,
  getMonthShortName,
} from '../services/forecastService';
import {
  projectRoleAssignmentsService,
  type ProjectRoleAssignment,
} from '../services/staffingService';
import { useFiscalYear, getFiscalYearStartDate, type MonthInfo } from '../hooks/useFiscalYear';
import { AssignmentRequestModal } from '../components/AssignmentRequestModal';
import { assignmentRequestService, type CreateAssignmentRequest } from '../services/assignmentRequestService';
import toast from 'react-hot-toast';

type ViewMode = 'byChargeCode' | 'byMonth';

export function MyStaffingPlanPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const fiscalYear = useFiscalYear();

  const [viewMode, setViewMode] = useState<ViewMode>('byChargeCode');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(fiscalYear.currentFiscalYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-assignments', tenantId],
    queryFn: () => projectRoleAssignmentsService.getMyAssignments(tenantId),
    enabled: !!tenantId,
  });

  // Calculate the calendar year range for the fiscal year
  const calendarYearsToFetch = useMemo(() => {
    if (fiscalYear.config.startMonth === 1) {
      return [selectedFiscalYear];
    }
    return [selectedFiscalYear - 1, selectedFiscalYear];
  }, [selectedFiscalYear, fiscalYear.config.startMonth]);

  // Fetch user's forecasts
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ['my-forecasts', tenantId, calendarYearsToFetch],
    queryFn: async () => {
      const allForecasts = await Promise.all(
        calendarYearsToFetch.map(year =>
          forecastsService.getMyForecasts({ tenantId, year })
        )
      );
      return allForecasts.flat();
    },
    enabled: !!tenantId,
  });

  // Generate months for the view
  const months: MonthInfo[] = useMemo(() => {
    const startDate = getFiscalYearStartDate(selectedFiscalYear, fiscalYear.config.startMonth);
    const count = selectedQuarter ? 3 : 12;

    let adjustedStartDate = startDate;
    if (selectedQuarter) {
      const quarterOffset = (selectedQuarter - 1) * 3;
      adjustedStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + quarterOffset, 1);
    }

    return fiscalYear.getMonthRange(adjustedStartDate, count);
  }, [selectedFiscalYear, selectedQuarter, fiscalYear]);

  // Build forecast lookup map: projectId -> year/month -> hours (will be used for future feature)
  // const forecastsByProject = useMemo(() => {
  //   const map: Record<string, Record<string, number>> = {};
  //   forecasts.forEach(f => {
  //     const projectId = f.projectId || 'unknown';
  //     if (!map[projectId]) {
  //       map[projectId] = {};
  //     }
  //     const key = `${f.year}-${f.month}`;
  //     map[projectId][key] = (map[projectId][key] || 0) + f.forecastedHours;
  //   });
  //   return map;
  // }, [forecasts]);

  // Group forecasts by project for the charge code view
  const chargeCodeGroups = useMemo(() => {
    const groups: Record<string, {
      projectId: string;
      projectName: string;
      assignments: ProjectRoleAssignment[];
      forecasts: Forecast[];
      monthlyHours: Record<string, number>;
      totalHours: number;
    }> = {};

    // First, group assignments by project
    assignments.forEach(a => {
      const projectId = a.projectId;
      if (!groups[projectId]) {
        groups[projectId] = {
          projectId,
          projectName: a.projectName,
          assignments: [],
          forecasts: [],
          monthlyHours: {},
          totalHours: 0,
        };
      }
      groups[projectId].assignments.push(a);
    });

    // Add forecasts to groups
    forecasts.forEach(f => {
      const projectId = f.projectId || 'unknown';
      if (!groups[projectId]) {
        groups[projectId] = {
          projectId,
          projectName: f.projectName || 'Unknown Project',
          assignments: [],
          forecasts: [],
          monthlyHours: {},
          totalHours: 0,
        };
      }
      groups[projectId].forecasts.push(f);

      // Only count hours within the selected fiscal year period
      const monthKey = `${f.year}-${f.month}`;
      const isInRange = months.some(m => `${m.year}-${m.month}` === monthKey);
      if (isInRange) {
        groups[projectId].monthlyHours[monthKey] = (groups[projectId].monthlyHours[monthKey] || 0) + f.forecastedHours;
        groups[projectId].totalHours += f.forecastedHours;
      }
    });

    return Object.values(groups).sort((a, b) => b.totalHours - a.totalHours);
  }, [assignments, forecasts, months]);

  // Group by month view
  const monthGroups = useMemo(() => {
    return months.map(m => {
      const monthKey = `${m.year}-${m.month}`;
      const monthForecasts = forecasts.filter(f => `${f.year}-${f.month}` === monthKey);
      const totalHours = monthForecasts.reduce((sum, f) => sum + f.forecastedHours, 0);

      // Group by project within month
      const byProject: Record<string, { projectName: string; hours: number }> = {};
      monthForecasts.forEach(f => {
        const pid = f.projectId || 'unknown';
        if (!byProject[pid]) {
          byProject[pid] = { projectName: f.projectName || 'Unknown', hours: 0 };
        }
        byProject[pid].hours += f.forecastedHours;
      });

      return {
        ...m,
        totalHours,
        byProject: Object.entries(byProject).map(([id, data]) => ({
          projectId: id,
          ...data,
        })).sort((a, b) => b.hours - a.hours),
      };
    });
  }, [months, forecasts]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalHours = chargeCodeGroups.reduce((sum, g) => sum + g.totalHours, 0);
    const directHours = chargeCodeGroups
      .filter(g => !g.projectName.toLowerCase().includes('indirect') && !g.projectName.toLowerCase().includes('overhead'))
      .reduce((sum, g) => sum + g.totalHours, 0);
    const indirectHours = totalHours - directHours;

    // Calculate available hours (assuming 8 hrs/day, ~21 working days/month)
    const monthCount = months.length;
    const standardHoursPerMonth = 168; // 8 * 21
    const availableHours = monthCount * standardHoursPerMonth;
    const overAllocated = Math.max(0, totalHours - availableHours);

    return {
      totalHours,
      directHours,
      indirectHours,
      availableHours: Math.max(0, availableHours - totalHours),
      overAllocated,
      chargeCodeCount: chargeCodeGroups.length,
    };
  }, [chargeCodeGroups, months]);

  const handleRequestSubmit = async (payload: CreateAssignmentRequest) => {
    try {
      setIsSubmitting(true);
      await assignmentRequestService.create(payload);
      toast.success('Assignment request submitted');
      setShowRequestModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit request';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = assignmentsLoading || forecastsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Staffing Plan</h1>
          <p className="text-gray-600 mt-1">Your assignments and forecasted hours</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            aria-label="Select year"
          >
            {[fiscalYear.currentFiscalYear - 1, fiscalYear.currentFiscalYear, fiscalYear.currentFiscalYear + 1].map(fy => (
              <option key={fy} value={fy}>
                {fiscalYear.isCalendarYear ? fy : `${fiscalYear.config.prefix}${fy}`}
              </option>
            ))}
          </select>

          {/* Quarter Filter */}
          <select
            value={selectedQuarter || ''}
            onChange={(e) => setSelectedQuarter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            aria-label="Select quarter"
          >
            <option value="">Full Year</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Direct</div>
          <div className="text-2xl font-bold text-blue-600">{stats.directHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Indirect</div>
          <div className="text-2xl font-bold text-purple-600">{stats.indirectHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Available</div>
          <div className="text-2xl font-bold text-green-600">{stats.availableHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Over Allocated</div>
          <div className={`text-2xl font-bold ${stats.overAllocated > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {stats.overAllocated.toLocaleString()}
          </div>
        </div>
      </div>

      {/* View Mode Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setViewMode('byChargeCode')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'byChargeCode' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            By Charge Code
          </button>
          <button
            onClick={() => setViewMode('byMonth')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'byMonth' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            By Month
          </button>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Request New Assignment
        </button>
      </div>

      {/* Content */}
      {chargeCodeGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No assignments yet</h3>
          <p className="mt-2 text-gray-500">
            You don't have any project assignments for this period.
          </p>
          <button
            onClick={() => setShowRequestModal(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Request an Assignment
          </button>
        </div>
      ) : viewMode === 'byChargeCode' ? (
        <ChargeCodeView
          groups={chargeCodeGroups}
          months={months}
          fiscalYear={fiscalYear}
        />
      ) : (
        <MonthView
          monthGroups={monthGroups}
          fiscalYear={fiscalYear}
        />
      )}

      {/* Request Modal */}
      <AssignmentRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Charge Code View Component
interface ChargeCodeViewProps {
  groups: {
    projectId: string;
    projectName: string;
    assignments: ProjectRoleAssignment[];
    forecasts: Forecast[];
    monthlyHours: Record<string, number>;
    totalHours: number;
  }[];
  months: MonthInfo[];
  fiscalYear: ReturnType<typeof useFiscalYear>;
}

function ChargeCodeView({ groups, months, fiscalYear }: ChargeCodeViewProps) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <ChargeCodeCard
          key={group.projectId}
          group={group}
          months={months}
          fiscalYear={fiscalYear}
        />
      ))}
    </div>
  );
}

interface ChargeCodeCardProps {
  group: ChargeCodeViewProps['groups'][0];
  months: MonthInfo[];
  fiscalYear: ReturnType<typeof useFiscalYear>;
}

function ChargeCodeCard({ group, months, fiscalYear }: ChargeCodeCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Determine if this is likely an indirect code
  const isIndirect = group.projectName.toLowerCase().includes('indirect') ||
                     group.projectName.toLowerCase().includes('overhead') ||
                     group.projectName.toLowerCase().includes('pto') ||
                     group.projectName.toLowerCase().includes('holiday');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="text-left">
            <span className="font-medium text-gray-900">{group.projectName}</span>
            {isIndirect && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                Indirect
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-emerald-600">{group.totalHours.toLocaleString()} hrs</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {/* Monthly Hours Row */}
          <div className="overflow-x-auto">
            <div className="flex min-w-max border-b border-gray-100">
              {months.map(m => {
                const key = `${m.year}-${m.month}`;
                const hours = group.monthlyHours[key] || 0;
                return (
                  <div
                    key={key}
                    className="flex-1 min-w-[70px] px-3 py-3 text-center border-r border-gray-100 last:border-r-0"
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {fiscalYear.mode === 'fiscal' && !fiscalYear.isCalendarYear
                        ? `M${m.fiscalMonth}`
                        : getMonthShortName(m.month)}
                    </div>
                    <div className={`text-sm font-medium ${hours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                      {hours > 0 ? hours : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignment Details (collapsed by default) */}
          {group.assignments.length > 0 && (
            <div className="px-6 py-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">
                {group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-2">
                {group.assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{a.positionTitle}</span>
                      {a.wbsElementCode && (
                        <span className="ml-2 text-gray-500">WBS: {a.wbsElementCode}</span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      a.status === 1 ? 'bg-green-100 text-green-700' :
                      a.status === 0 ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {a.statusName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Month View Component
interface MonthViewProps {
  monthGroups: (MonthInfo & {
    totalHours: number;
    byProject: { projectId: string; projectName: string; hours: number }[];
  })[];
  fiscalYear: ReturnType<typeof useFiscalYear>;
}

function MonthView({ monthGroups, fiscalYear }: MonthViewProps) {
  return (
    <div className="space-y-4">
      {monthGroups.map(month => (
        <MonthCard key={`${month.year}-${month.month}`} month={month} fiscalYear={fiscalYear} />
      ))}
    </div>
  );
}

interface MonthCardProps {
  month: MonthViewProps['monthGroups'][0];
  fiscalYear: ReturnType<typeof useFiscalYear>;
}

function MonthCard({ month, fiscalYear }: MonthCardProps) {
  const [expanded, setExpanded] = useState(month.totalHours > 0);

  const monthLabel = fiscalYear.mode === 'fiscal' && !fiscalYear.isCalendarYear
    ? `${fiscalYear.config.prefix}${String(month.fiscalYear).slice(-2)} Month ${month.fiscalMonth}`
    : `${getMonthShortName(month.month)} ${month.year}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900">{monthLabel}</span>
          <span className="text-sm text-gray-500">({month.byProject.length} charge codes)</span>
        </div>
        <span className="text-sm font-medium text-emerald-600">{month.totalHours.toLocaleString()} hrs</span>
      </button>

      {expanded && month.byProject.length > 0 && (
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charge Code</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {month.byProject.map(p => (
                <tr key={p.projectId} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{p.projectName}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{p.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && month.byProject.length === 0 && (
        <div className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
          No hours forecasted for this month
        </div>
      )}
    </div>
  );
}

export default MyStaffingPlanPage;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  staffingReportsService,
  getMonthShortName,
} from '../services/forecastService';
import type { ProjectStaffingSummary } from '../services/forecastService';

// Role Assignment Row Component
const AssignmentRow = ({
  assignment,
}: {
  assignment: ProjectStaffingSummary['assignments'][0];
}) => {
  const varianceColor = assignment.variance >= 0 ? 'text-green-600' : 'text-red-600';
  const statusColors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Completed: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{assignment.roleName}</div>
          {assignment.laborCategory && (
            <div className="text-sm text-gray-500">{assignment.laborCategory}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{assignment.assigneeName}</div>
        <div className="text-xs text-gray-500">{assignment.assigneeType}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {assignment.wbsCode || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
        {assignment.billRate ? `$${assignment.billRate.toFixed(2)}` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
        {assignment.totalForecastedHours.toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
        {assignment.totalBudgetedHours.toLocaleString()}
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${varianceColor}`}>
        {assignment.variance >= 0 ? '+' : ''}{assignment.variance.toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[assignment.status] || 'bg-gray-100 text-gray-800'}`}>
          {assignment.status}
        </span>
      </td>
    </tr>
  );
};

// Monthly Chart Component
const MonthlyStaffingChart = ({
  data,
}: {
  data: { year: number; month: number; forecastedHours: number; budgetedHours: number; actualHours: number }[];
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No monthly data available
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap(d => [d.forecastedHours, d.budgetedHours, d.actualHours]), 1);

  return (
    <div>
      <div className="flex items-end justify-between h-48 gap-2 mb-4">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex justify-center gap-0.5" style={{ height: '160px' }}>
              <div
                className="w-2 bg-blue-500 rounded-t"
                style={{
                  height: `${(item.forecastedHours / maxValue) * 100}%`,
                  marginTop: 'auto',
                }}
                title={`Forecasted: ${item.forecastedHours.toLocaleString()}`}
              />
              <div
                className="w-2 bg-gray-400 rounded-t"
                style={{
                  height: `${(item.budgetedHours / maxValue) * 100}%`,
                  marginTop: 'auto',
                }}
                title={`Budgeted: ${item.budgetedHours.toLocaleString()}`}
              />
              <div
                className="w-2 bg-green-500 rounded-t"
                style={{
                  height: `${(item.actualHours / maxValue) * 100}%`,
                  marginTop: 'auto',
                }}
                title={`Actual: ${item.actualHours.toLocaleString()}`}
              />
            </div>
            <span className="text-xs text-gray-600">
              {getMonthShortName(item.month)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-sm text-gray-600">Forecasted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded" />
          <span className="text-sm text-gray-600">Budgeted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-sm text-gray-600">Actual</span>
        </div>
      </div>
    </div>
  );
};

export default function ProjectStaffingDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProjectStaffingSummary | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectSummary(projectId);
    }
  }, [projectId]);

  const loadProjectSummary = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffingReportsService.getProjectSummary(id);
      setSummary(data);
    } catch (err) {
      console.error('Error loading project summary:', err);
      setError('Failed to load project staffing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => projectId && loadProjectSummary(projectId)}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          Project not found
        </div>
      </div>
    );
  }

  const variance = summary.totalBudgetedHours - summary.totalForecastedHours;
  const variancePercent = summary.totalBudgetedHours > 0
    ? ((variance / summary.totalBudgetedHours) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/admin/staffing/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{summary.project.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            {summary.project.programCode && (
              <span className="text-sm text-gray-500">
                Program: {summary.project.programCode}
              </span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              summary.project.status === 'Active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {summary.project.status}
            </span>
          </div>
          {summary.versionName && (
            <p className="text-sm text-gray-500 mt-2">
              Forecast Version: {summary.versionName}
            </p>
          )}
        </div>
        <button
          onClick={() => projectId && loadProjectSummary(projectId)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {!summary.hasData ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            {summary.message || 'No forecast data available for this project.'}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Forecasted</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalForecastedHours.toLocaleString()} hrs
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Budgeted</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalBudgetedHours.toLocaleString()} hrs
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Variance</p>
              <p className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {variance >= 0 ? '+' : ''}{variance.toLocaleString()} hrs
              </p>
              <p className="text-sm text-gray-500">{variancePercent}% {variance >= 0 ? 'under' : 'over'} budget</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{summary.assignmentCount}</p>
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Hours Breakdown</h2>
            <MonthlyStaffingChart data={summary.monthlyTotals} />
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Role Assignments</h2>
            </div>
            {summary.assignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No role assignments found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role / Labor Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        WBS
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forecasted
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budgeted
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.assignments.map((assignment) => (
                      <AssignmentRow key={assignment.id} assignment={assignment} />
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr className="font-semibold">
                      <td colSpan={4} className="px-6 py-3 text-sm text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {summary.totalForecastedHours.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {summary.totalBudgetedHours.toLocaleString()}
                      </td>
                      <td className={`px-6 py-3 text-sm text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

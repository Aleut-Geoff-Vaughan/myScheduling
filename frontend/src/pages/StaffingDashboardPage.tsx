import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  staffingReportsService,
  getMonthShortName,
} from '../services/forecastService';
import type {
  DashboardSummary,
  VarianceAnalysis,
  BurnRateAnalysis,
  CapacityUtilization,
  ProjectsSummaryItem,
} from '../services/forecastService';

// Summary Card Component
const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
}) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {trend && trendLabel && (
            <p className={`text-sm ${trendColors[trend]}`}>
              {trend === 'up' && '+'}{trendLabel}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
};

// Simple Bar Chart Component
const SimpleBarChart = ({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium">{item.value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${item.color || 'bg-blue-500'}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Monthly Trend Chart Component
const MonthlyTrendChart = ({
  data,
  title,
}: {
  data: { year: number; month: number; forecastedHours: number; budgetedHours: number }[];
  title: string;
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap(d => [d.forecastedHours, d.budgetedHours]), 1);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex justify-center gap-1" style={{ height: '160px' }}>
              <div
                className="w-3 bg-blue-500 rounded-t"
                style={{
                  height: `${(item.forecastedHours / maxValue) * 100}%`,
                  marginTop: 'auto',
                }}
                title={`Forecasted: ${item.forecastedHours.toLocaleString()}`}
              />
              <div
                className="w-3 bg-gray-300 rounded-t"
                style={{
                  height: `${(item.budgetedHours / maxValue) * 100}%`,
                  marginTop: 'auto',
                }}
                title={`Budgeted: ${item.budgetedHours.toLocaleString()}`}
              />
            </div>
            <span className="text-xs text-gray-600">
              {getMonthShortName(item.month)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-sm text-gray-600">Forecasted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded" />
          <span className="text-sm text-gray-600">Budgeted</span>
        </div>
      </div>
    </div>
  );
};

// Utilization Gauge Component
const UtilizationGauge = ({
  value,
  label,
}: {
  value: number;
  label: string;
}) => {
  const getColor = (pct: number) => {
    if (pct > 100) return 'text-red-500';
    if (pct >= 80) return 'text-green-500';
    if (pct >= 50) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getBgColor = (pct: number) => {
    if (pct > 100) return 'stroke-red-500';
    if (pct >= 80) return 'stroke-green-500';
    if (pct >= 50) return 'stroke-yellow-500';
    return 'stroke-gray-300';
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
          <circle
            className="stroke-gray-200"
            strokeWidth="8"
            fill="none"
            cx="50"
            cy="50"
            r="40"
          />
          <circle
            className={getBgColor(value)}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            cx="50"
            cy="50"
            r="40"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${getColor(value)}`}>
            {value.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );
};

// Projects Table Component
const ProjectsTable = ({
  projects,
  onProjectClick,
}: {
  projects: ProjectsSummaryItem[];
  onProjectClick: (projectId: string) => void;
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Projects Overview</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program Code
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignments
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Forecasted Hours
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onProjectClick(project.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                    {project.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.programCode || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {project.assignmentCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {project.totalForecastedHours.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function StaffingDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [varianceAnalysis, setVarianceAnalysis] = useState<VarianceAnalysis | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateAnalysis | null>(null);
  const [capacityUtilization, setCapacityUtilization] = useState<CapacityUtilization | null>(null);
  const [projects, setProjects] = useState<ProjectsSummaryItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, variance, burn, capacity, projectsData] = await Promise.all([
        staffingReportsService.getDashboardSummary(),
        staffingReportsService.getVarianceAnalysis(),
        staffingReportsService.getBurnRate(),
        staffingReportsService.getCapacityUtilization(),
        staffingReportsService.getProjectsSummary(),
      ]);

      setDashboardSummary(summary);
      setVarianceAnalysis(variance);
      setBurnRate(burn);
      setCapacityUtilization(capacity);
      setProjects(projectsData.projects);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/admin/staffing/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
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
            onClick={loadDashboardData}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasData = dashboardSummary?.hasData ?? false;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staffing Dashboard</h1>
          {dashboardSummary?.versionName && (
            <p className="text-sm text-gray-500">
              Current Version: {dashboardSummary.versionName}
            </p>
          )}
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {!hasData ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            {dashboardSummary?.message || 'No forecast data available. Please create forecasts first.'}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Forecasted Hours"
              value={dashboardSummary?.totalForecastedHours.toLocaleString() || '0'}
              subtitle={`${dashboardSummary?.forecastCount || 0} forecasts`}
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <SummaryCard
              title="Budget Variance"
              value={`${(dashboardSummary?.variance || 0).toLocaleString()} hrs`}
              subtitle={`${dashboardSummary?.variancePercent || 0}% ${(dashboardSummary?.variance || 0) >= 0 ? 'under' : 'over'} budget`}
              trend={(dashboardSummary?.variance || 0) >= 0 ? 'up' : 'down'}
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <SummaryCard
              title="Active Projects"
              value={dashboardSummary?.projectCount || 0}
              subtitle={`${dashboardSummary?.assignmentCount || 0} assignments`}
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <SummaryCard
              title="Avg Utilization"
              value={`${capacityUtilization?.summary.averageUtilization || 0}%`}
              subtitle={`${capacityUtilization?.summary.totalResources || 0} resources`}
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <MonthlyTrendChart
              data={dashboardSummary?.monthlyData || []}
              title="Monthly Forecast Trend"
            />

            {/* Capacity Utilization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Utilization Distribution</h3>
              <div className="flex justify-around items-center py-4">
                <UtilizationGauge
                  value={((capacityUtilization?.summary.overUtilized || 0) / (capacityUtilization?.summary.totalResources || 1)) * 100}
                  label={`Over Utilized (${capacityUtilization?.summary.overUtilized || 0})`}
                />
                <UtilizationGauge
                  value={((capacityUtilization?.summary.fullyUtilized || 0) / (capacityUtilization?.summary.totalResources || 1)) * 100}
                  label={`Fully Utilized (${capacityUtilization?.summary.fullyUtilized || 0})`}
                />
                <UtilizationGauge
                  value={((capacityUtilization?.summary.underUtilized || 0) / (capacityUtilization?.summary.totalResources || 1)) * 100}
                  label={`Under Utilized (${capacityUtilization?.summary.underUtilized || 0})`}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Employees: {capacityUtilization?.summary.employees || 0}</span>
                  <span className="text-gray-600">Subcontractors: {capacityUtilization?.summary.subcontractors || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Variance & Burn Rate Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Variance */}
            {varianceAnalysis?.hasData && (
              <SimpleBarChart
                data={varianceAnalysis.projectVariances.slice(0, 5).map((p) => ({
                  label: p.projectName,
                  value: Math.abs(p.variance),
                  color: p.status === 'UnderBudget' ? 'bg-green-500' : 'bg-red-500',
                }))}
                title="Top 5 Projects by Variance (Hours)"
              />
            )}

            {/* Burn Rate Summary */}
            {burnRate?.hasData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Forecasted Cost</span>
                    <span className="text-xl font-bold text-gray-900">
                      ${burnRate.summary.totalForecastedCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Budgeted Cost</span>
                    <span className="text-xl font-bold text-gray-900">
                      ${burnRate.summary.totalBudgetedCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-gray-600">Variance</span>
                    <span className={`text-xl font-bold ${(burnRate.summary.totalBudgetedCost - burnRate.summary.totalForecastedCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(burnRate.summary.totalBudgetedCost - burnRate.summary.totalForecastedCost).toLocaleString()}
                      {(burnRate.summary.totalBudgetedCost - burnRate.summary.totalForecastedCost) >= 0 ? ' under' : ' over'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Avg Monthly Forecast</span>
                    <span>${burnRate.summary.averageMonthlyForecastedCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Projects Table */}
          {projects.length > 0 && (
            <ProjectsTable
              projects={projects}
              onProjectClick={handleProjectClick}
            />
          )}
        </>
      )}
    </div>
  );
}

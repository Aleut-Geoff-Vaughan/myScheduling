import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { staffingReportsService } from '../services/forecastService';

type ChartType = 'status' | 'variance' | 'utilization';

export function ForecastAnalyticsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  const [selectedChart, setSelectedChart] = useState<ChartType>('status');

  // Fetch dashboard summary (has status counts)
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['forecast-analytics-dashboard', tenantId],
    queryFn: () => staffingReportsService.getDashboardSummary(),
    enabled: !!tenantId,
  });

  // Fetch project summary data
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['forecast-analytics-projects', tenantId],
    queryFn: () => staffingReportsService.getProjectsSummary(),
    enabled: !!tenantId,
  });

  // Fetch variance analysis
  const { data: varianceData, isLoading: varianceLoading } = useQuery({
    queryKey: ['forecast-analytics-variance', tenantId],
    queryFn: () => staffingReportsService.getVarianceAnalysis(),
    enabled: !!tenantId,
  });

  const isLoading = dashboardLoading || projectsLoading || varianceLoading;

  // Get status counts from dashboard
  const statusCounts = useMemo(() => {
    if (!dashboardData?.statusCounts) {
      return { draft: 0, submitted: 0, reviewed: 0, approved: 0, locked: 0 };
    }
    return {
      draft: dashboardData.statusCounts['Draft'] || dashboardData.statusCounts['0'] || 0,
      submitted: dashboardData.statusCounts['Submitted'] || dashboardData.statusCounts['1'] || 0,
      reviewed: dashboardData.statusCounts['Reviewed'] || dashboardData.statusCounts['2'] || 0,
      approved: dashboardData.statusCounts['Approved'] || dashboardData.statusCounts['3'] || 0,
      locked: dashboardData.statusCounts['Locked'] || dashboardData.statusCounts['5'] || 0,
    };
  }, [dashboardData]);

  const totalForecasts = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Get top projects by forecasted hours
  const topProjects = useMemo(() => {
    if (!projectsData?.projects) return [];
    return [...projectsData.projects]
      .sort((a, b) => b.totalForecastedHours - a.totalForecastedHours)
      .slice(0, 10);
  }, [projectsData]);

  // Get project variances
  const projectVariances = useMemo(() => {
    if (!varianceData?.projectVariances) return [];
    return varianceData.projectVariances
      .filter(p => Math.abs(p.variancePercent) > 0)
      .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))
      .slice(0, 10);
  }, [varianceData]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return {
      totalHours: dashboardData?.totalForecastedHours || 0,
      avgVariance: varianceData?.summary?.totalVariance ?
        (varianceData.summary.totalVariance / (varianceData.summary.totalBudgetedHours || 1)) * 100 : 0,
      completeness: totalForecasts > 0 ?
        ((statusCounts.approved + statusCounts.locked) / totalForecasts) * 100 : 0,
      projectCount: dashboardData?.projectCount || projectsData?.projects?.length || 0,
    };
  }, [dashboardData, varianceData, statusCounts, totalForecasts, projectsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-400';
      case 'submitted': return 'bg-blue-500';
      case 'reviewed': return 'bg-purple-500';
      case 'approved': return 'bg-green-500';
      case 'locked': return 'bg-emerald-700';
      default: return 'bg-gray-300';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 10) return 'text-green-600';
    if (variance > 10) return 'text-red-600';
    return 'text-amber-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Forecast Analytics</h1>
        <p className="text-gray-600 mt-1">Insights and reports on forecast data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <div className="text-sm text-gray-500">Total Forecasted Hours</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.totalHours.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{summaryStats.projectCount} projects</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Total Forecasts</div>
          <div className="text-2xl font-bold text-gray-900">{totalForecasts.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Across all periods</div>
        </div>
        <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${Math.abs(summaryStats.avgVariance) > 10 ? 'border-red-500' : 'border-green-500'}`}>
          <div className="text-sm text-gray-500">Avg Budget Variance</div>
          <div className={`text-2xl font-bold ${getVarianceColor(summaryStats.avgVariance)}`}>
            {summaryStats.avgVariance > 0 ? '+' : ''}{summaryStats.avgVariance.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Forecast vs budget</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-500">Approval Completeness</div>
          <div className="text-2xl font-bold text-gray-900">{summaryStats.completeness.toFixed(0)}%</div>
          <div className="text-xs text-gray-400 mt-1">Approved or locked</div>
        </div>
      </div>

      {/* Chart Type Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {[
            { id: 'status', label: 'Status Distribution' },
            { id: 'variance', label: 'Budget Variance' },
            { id: 'utilization', label: 'Top Projects' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedChart(tab.id as ChartType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedChart === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Status Distribution Chart */}
        {selectedChart === 'status' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Forecast Status Distribution</h3>
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Visual Bar Chart */}
              <div className="flex-1">
                <div className="space-y-4">
                  {(['draft', 'submitted', 'reviewed', 'approved', 'locked'] as const).map((status) => {
                    const count = statusCounts[status];
                    const percentage = totalForecasts > 0 ? (count / totalForecasts) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{status}</span>
                          <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(status)} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Legend / Summary */}
              <div className="lg:w-64">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Needs Action</span>
                      <span className="font-medium">{statusCounts.draft}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Review</span>
                      <span className="font-medium">{statusCounts.submitted + statusCounts.reviewed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Complete</span>
                      <span className="font-medium text-green-600">{statusCounts.approved + statusCounts.locked}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{totalForecasts}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Variance */}
        {selectedChart === 'variance' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top Budget Variances</h3>
            {projectVariances.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No projects with variance data</p>
            ) : (
              <div className="space-y-3">
                {projectVariances.map((project) => (
                  <div key={project.projectId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.projectName}</div>
                      <div className="text-sm text-gray-500">
                        Budget: {project.totalBudgetedHours.toLocaleString()} hrs | Forecast: {project.totalForecastedHours.toLocaleString()} hrs
                      </div>
                    </div>
                    <div className={`text-right font-bold text-lg ${getVarianceColor(project.variancePercent)}`}>
                      {project.variancePercent > 0 ? '+' : ''}{project.variancePercent.toFixed(1)}%
                    </div>
                    <div className="w-24">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden relative">
                        {/* Center line at 0% */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400" />
                        {/* Variance bar */}
                        <div
                          className={`absolute top-0 bottom-0 ${project.variancePercent >= 0 ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{
                            left: project.variancePercent >= 0 ? '50%' : `${50 + Math.max(project.variancePercent, -50)}%`,
                            width: `${Math.min(Math.abs(project.variancePercent), 50)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top Projects by Hours */}
        {selectedChart === 'utilization' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top Projects by Forecasted Hours</h3>
            {topProjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No projects with forecast data</p>
            ) : (
              <div className="space-y-3">
                {topProjects.map((project, index) => {
                  const maxHours = topProjects[0]?.totalForecastedHours || 1;
                  const barWidth = (project.totalForecastedHours / maxHours) * 100;
                  return (
                    <div key={project.id} className="flex items-center gap-4">
                      <div className="w-6 text-right text-gray-400 font-medium">#{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium truncate">{project.name}</span>
                          <span className="text-gray-600">{project.totalForecastedHours.toLocaleString()} hrs</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {project.assignmentCount} assignments | {project.forecastCount} forecasts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="/forecast/budgets"
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-amber-500"
        >
          <h4 className="font-medium text-gray-900">Budget Management</h4>
          <p className="text-sm text-gray-500 mt-1">Review and update project budgets</p>
        </a>
        <a
          href="/forecast/projects"
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500"
        >
          <h4 className="font-medium text-gray-900">All Projects</h4>
          <p className="text-sm text-gray-500 mt-1">Browse all forecast projects</p>
        </a>
        <a
          href="/forecast/import-export"
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500"
        >
          <h4 className="font-medium text-gray-900">Export Reports</h4>
          <p className="text-sm text-gray-500 mt-1">Download forecast data for analysis</p>
        </a>
      </div>
    </div>
  );
}

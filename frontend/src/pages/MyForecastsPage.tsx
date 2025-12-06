import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  forecastsService,
  type Forecast,
  ForecastStatus,
  getForecastStatusColor,
  getMonthShortName,
} from '../services/forecastService';

type ViewMode = 'byProject' | 'byMonth' | 'list';
type StatusFilter = 'all' | ForecastStatus;

export function MyForecastsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const [viewMode, setViewMode] = useState<ViewMode>('byProject');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: forecasts = [], isLoading, error } = useQuery({
    queryKey: ['my-forecasts', tenantId, selectedYear],
    queryFn: () => forecastsService.getMyForecasts({ tenantId, year: selectedYear }),
    enabled: !!tenantId,
  });

  // Filter by status
  const filteredForecasts = useMemo(() => {
    if (statusFilter === 'all') return forecasts;
    return forecasts.filter(f => f.status === statusFilter);
  }, [forecasts, statusFilter]);

  // Group by project
  const byProject = useMemo(() => {
    const groups: Record<string, { projectId: string; projectName: string; forecasts: Forecast[] }> = {};
    filteredForecasts.forEach(f => {
      const key = f.projectId || 'unknown';
      if (!groups[key]) {
        groups[key] = { projectId: key, projectName: f.projectName || 'Unknown Project', forecasts: [] };
      }
      groups[key].forecasts.push(f);
    });
    return Object.values(groups).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filteredForecasts]);

  // Group by month
  const byMonth = useMemo(() => {
    const groups: Record<string, { year: number; month: number; forecasts: Forecast[] }> = {};
    filteredForecasts.forEach(f => {
      const key = `${f.year}-${f.month}`;
      if (!groups[key]) {
        groups[key] = { year: f.year, month: f.month, forecasts: [] };
      }
      groups[key].forecasts.push(f);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [filteredForecasts]);

  // Summary stats
  const stats = useMemo(() => {
    const totalHours = filteredForecasts.reduce((sum, f) => sum + f.forecastedHours, 0);
    const draftCount = filteredForecasts.filter(f => f.status === ForecastStatus.Draft).length;
    const submittedCount = filteredForecasts.filter(f => f.status === ForecastStatus.Submitted).length;
    const reviewedCount = filteredForecasts.filter(f => f.status === ForecastStatus.Reviewed).length;
    const approvedCount = filteredForecasts.filter(f => f.status === ForecastStatus.Approved).length;
    const rejectedCount = filteredForecasts.filter(f => f.status === ForecastStatus.Rejected).length;
    return { totalHours, draftCount, submittedCount, reviewedCount, approvedCount, rejectedCount };
  }, [filteredForecasts]);

  const getStatusName = (status: ForecastStatus): string => {
    const names: Record<ForecastStatus, string> = {
      [ForecastStatus.Draft]: 'Draft',
      [ForecastStatus.Submitted]: 'Submitted',
      [ForecastStatus.Reviewed]: 'Reviewed',
      [ForecastStatus.Approved]: 'Approved',
      [ForecastStatus.Rejected]: 'Rejected',
      [ForecastStatus.Locked]: 'Locked',
    };
    return names[status] || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading forecasts. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Forecasts</h1>
          <p className="text-gray-600 mt-1">View and manage your project forecasts</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalHours.toLocaleString()}</div>
        </div>
        <button
          onClick={() => setStatusFilter(statusFilter === ForecastStatus.Draft ? 'all' : ForecastStatus.Draft)}
          className={`bg-white rounded-lg shadow-sm border p-4 text-left transition-colors ${statusFilter === ForecastStatus.Draft ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="text-sm text-gray-500">Draft</div>
          <div className="text-2xl font-bold text-gray-600">{stats.draftCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === ForecastStatus.Submitted ? 'all' : ForecastStatus.Submitted)}
          className={`bg-white rounded-lg shadow-sm border p-4 text-left transition-colors ${statusFilter === ForecastStatus.Submitted ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="text-sm text-gray-500">Submitted</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.submittedCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === ForecastStatus.Reviewed ? 'all' : ForecastStatus.Reviewed)}
          className={`bg-white rounded-lg shadow-sm border p-4 text-left transition-colors ${statusFilter === ForecastStatus.Reviewed ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="text-sm text-gray-500">Reviewed</div>
          <div className="text-2xl font-bold text-purple-600">{stats.reviewedCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === ForecastStatus.Approved ? 'all' : ForecastStatus.Approved)}
          className={`bg-white rounded-lg shadow-sm border p-4 text-left transition-colors ${statusFilter === ForecastStatus.Approved ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approvedCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === ForecastStatus.Rejected ? 'all' : ForecastStatus.Rejected)}
          className={`bg-white rounded-lg shadow-sm border p-4 text-left transition-colors ${statusFilter === ForecastStatus.Rejected ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="text-sm text-gray-500">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejectedCount}</div>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setViewMode('byProject')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'byProject' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          By Project
        </button>
        <button
          onClick={() => setViewMode('byMonth')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'byMonth' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          By Month
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          List View
        </button>
      </div>

      {/* Content */}
      {filteredForecasts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No forecasts found</h3>
          <p className="mt-2 text-gray-500">
            {statusFilter !== 'all'
              ? `No forecasts with status "${getStatusName(statusFilter as ForecastStatus)}" for ${selectedYear}.`
              : `You don't have any forecasts for ${selectedYear}.`}
          </p>
        </div>
      ) : viewMode === 'byProject' ? (
        <div className="space-y-4">
          {byProject.map(group => (
            <ProjectGroup key={group.projectId} group={group} />
          ))}
        </div>
      ) : viewMode === 'byMonth' ? (
        <div className="space-y-4">
          {byMonth.map(group => (
            <MonthGroup key={`${group.year}-${group.month}`} group={group} />
          ))}
        </div>
      ) : (
        <ForecastList forecasts={filteredForecasts} />
      )}
    </div>
  );
}

function ProjectGroup({ group }: { group: { projectId: string; projectName: string; forecasts: Forecast[] } }) {
  const [expanded, setExpanded] = useState(true);
  const totalHours = group.forecasts.reduce((sum, f) => sum + f.forecastedHours, 0);

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
          <span className="font-medium text-gray-900">{group.projectName}</span>
          <span className="text-sm text-gray-500">({group.forecasts.length} forecasts)</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-emerald-600">{totalHours.toLocaleString()} hrs</span>
          <Link
            to={`/forecast/projects/${group.projectId}/grid`}
            onClick={(e) => e.stopPropagation()}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            Edit Grid
          </Link>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {group.forecasts.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {getMonthShortName(f.month)} {f.year}
                    {f.week && <span className="text-gray-500"> W{f.week}</span>}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">{f.positionTitle || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{f.forecastedHours}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getForecastStatusColor(f.status)}`}>
                      {f.statusName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MonthGroup({ group }: { group: { year: number; month: number; forecasts: Forecast[] } }) {
  const [expanded, setExpanded] = useState(true);
  const totalHours = group.forecasts.reduce((sum, f) => sum + f.forecastedHours, 0);

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
          <span className="font-medium text-gray-900">
            {getMonthShortName(group.month)} {group.year}
          </span>
          <span className="text-sm text-gray-500">({group.forecasts.length} forecasts)</span>
        </div>
        <span className="text-sm font-medium text-emerald-600">{totalHours.toLocaleString()} hrs</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {group.forecasts.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">
                    <Link to={`/forecast/projects/${f.projectId}`} className="text-emerald-600 hover:text-emerald-700">
                      {f.projectName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">{f.positionTitle || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{f.forecastedHours}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getForecastStatusColor(f.status)}`}>
                      {f.statusName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ForecastList({ forecasts }: { forecasts: Forecast[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {forecasts.map(f => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="px-6 py-3 text-sm">
                <Link to={`/forecast/projects/${f.projectId}`} className="text-emerald-600 hover:text-emerald-700">
                  {f.projectName}
                </Link>
              </td>
              <td className="px-6 py-3 text-sm text-gray-900">
                {getMonthShortName(f.month)} {f.year}
                {f.week && <span className="text-gray-500"> W{f.week}</span>}
              </td>
              <td className="px-6 py-3 text-sm text-gray-900">{f.positionTitle || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{f.forecastedHours}</td>
              <td className="px-6 py-3 text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getForecastStatusColor(f.status)}`}>
                  {f.statusName}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MyForecastsPage;

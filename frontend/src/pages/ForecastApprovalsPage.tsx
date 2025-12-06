import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import {
  forecastsService,
  type Forecast,
  ForecastStatus,
  getForecastStatusColor,
  getMonthShortName,
  staffingReportsService,
} from '../services/forecastService';
import { MobileWarningBanner } from '../components/MobileWarningBanner';

type ViewMode = 'byProject' | 'list';

interface ProjectGroup {
  projectId: string;
  projectName: string;
  forecasts: Forecast[];
  totalHours: number;
  budgetedHours: number;
  variancePercent: number;
}

export function ForecastApprovalsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  const [selectedForecasts, setSelectedForecasts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('byProject');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Fetch reviewed forecasts (awaiting P&L approval)
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ['forecasts-for-approval', tenantId],
    queryFn: () => forecastsService.getAll({
      tenantId,
      status: ForecastStatus.Reviewed,
    }),
    enabled: !!tenantId,
  });

  // Fetch variance analysis for budget context
  const { data: varianceData } = useQuery({
    queryKey: ['variance-analysis', tenantId],
    queryFn: () => staffingReportsService.getVarianceAnalysis(),
    enabled: !!tenantId,
  });

  // Bulk approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ forecastIds, notes }: { forecastIds: string[]; notes?: string }) => {
      const results = await Promise.allSettled(
        forecastIds.map(id => forecastsService.approve(id, notes))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['forecasts-for-approval'] });
      setSelectedForecasts([]);
      setShowApproveModal(false);
      setApprovalNotes('');
      if (result.failed > 0) {
        toast.success(`Approved ${result.succeeded} forecasts. ${result.failed} failed.`);
      } else {
        toast.success(`Successfully approved ${result.succeeded} forecasts`);
      }
    },
    onError: () => {
      toast.error('Failed to approve forecasts');
    },
  });

  // Bulk reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ forecastIds, reason }: { forecastIds: string[]; reason: string }) => {
      const results = await Promise.allSettled(
        forecastIds.map(id => forecastsService.reject(id, reason))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['forecasts-for-approval'] });
      setSelectedForecasts([]);
      setShowRejectModal(false);
      setRejectReason('');
      if (result.failed > 0) {
        toast.success(`Rejected ${result.succeeded} forecasts. ${result.failed} failed.`);
      } else {
        toast.success(`Rejected ${result.succeeded} forecasts`);
      }
    },
    onError: () => {
      toast.error('Failed to reject forecasts');
    },
  });

  // Filter forecasts
  const filteredForecasts = useMemo(() => {
    if (!searchTerm) return forecasts;
    const term = searchTerm.toLowerCase();
    return forecasts.filter(f =>
      f.projectName?.toLowerCase().includes(term) ||
      f.assigneeName?.toLowerCase().includes(term)
    );
  }, [forecasts, searchTerm]);

  // Group by project with budget info
  const projectGroups = useMemo(() => {
    const groups: Record<string, ProjectGroup> = {};
    const varianceMap = new Map(
      varianceData?.projectVariances?.map(pv => [pv.projectId, pv]) || []
    );

    filteredForecasts.forEach(forecast => {
      const projectId = forecast.projectId || 'unknown';
      if (!groups[projectId]) {
        const variance = varianceMap.get(projectId);
        groups[projectId] = {
          projectId,
          projectName: forecast.projectName || 'Unknown Project',
          forecasts: [],
          totalHours: 0,
          budgetedHours: variance?.totalBudgetedHours || 0,
          variancePercent: variance?.variancePercent || 0,
        };
      }
      groups[projectId].forecasts.push(forecast);
      groups[projectId].totalHours += forecast.forecastedHours;
    });

    return Object.values(groups).sort((a, b) => {
      // Sort by variance (highest first - potential issues first)
      return Math.abs(b.variancePercent) - Math.abs(a.variancePercent);
    });
  }, [filteredForecasts, varianceData]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedForecasts.length === filteredForecasts.length) {
      setSelectedForecasts([]);
    } else {
      setSelectedForecasts(filteredForecasts.map(f => f.id));
    }
  };

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleForecastSelection = (id: string) => {
    setSelectedForecasts(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const selectProject = (forecasts: Forecast[]) => {
    const projectIds = forecasts.map(f => f.id);
    const allSelected = projectIds.every(id => selectedForecasts.includes(id));
    if (allSelected) {
      setSelectedForecasts(prev => prev.filter(id => !projectIds.includes(id)));
    } else {
      setSelectedForecasts(prev => [...new Set([...prev, ...projectIds])]);
    }
  };

  // Summary stats
  const stats = useMemo(() => ({
    total: filteredForecasts.length,
    totalHours: filteredForecasts.reduce((sum, f) => sum + f.forecastedHours, 0),
    projects: projectGroups.length,
    overBudget: projectGroups.filter(p => p.variancePercent > 10).length,
    onTrack: projectGroups.filter(p => Math.abs(p.variancePercent) <= 10).length,
  }), [filteredForecasts, projectGroups]);

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 10) return 'text-green-600 bg-green-50';
    if (variance > 10) return 'text-red-600 bg-red-50';
    return 'text-amber-600 bg-amber-50';
  };

  const getVarianceIcon = (variance: number) => {
    if (Math.abs(variance) <= 10) return '✓';
    if (variance > 0) return '▲';
    return '▼';
  };

  if (forecastsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <MobileWarningBanner pageName="The Approvals page" />
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Forecast Approvals</h1>
        <p className="text-gray-600 mt-1">Final approval for reviewed forecasts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Pending Approval</div>
          <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.totalHours.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Projects</div>
          <div className="text-2xl font-bold text-gray-900">{stats.projects}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">On Track</div>
          <div className="text-2xl font-bold text-green-600">{stats.onTrack}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Over Budget</div>
          <div className="text-2xl font-bold text-red-600">{stats.overBudget}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by project, person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('byProject')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'byProject' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                By Project
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                List
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedForecasts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedForecasts.length} selected</span>
              <button
                onClick={() => setShowApproveModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No Results */}
      {filteredForecasts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
          <p className="text-gray-500">No forecasts are currently awaiting your approval.</p>
        </div>
      ) : viewMode === 'byProject' ? (
        /* Project View */
        <div className="space-y-4">
          {projectGroups.map(group => (
            <div key={group.projectId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Project Header */}
              <div
                className="px-4 py-4 flex items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleProjectExpand(group.projectId)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectProject(group.forecasts);
                  }}
                  className="mr-3"
                >
                  <input
                    type="checkbox"
                    checked={group.forecasts.every(f => selectedForecasts.includes(f.id))}
                    onChange={() => selectProject(group.forecasts)}
                    className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                </button>
                <svg
                  className={`w-5 h-5 text-gray-400 mr-3 transition-transform ${expandedProjects.has(group.projectId) ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1">
                  <Link
                    to={`/forecast/projects/${group.projectId}`}
                    className="text-lg font-semibold text-emerald-600 hover:text-emerald-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.projectName}
                  </Link>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{group.forecasts.length} forecasts</span>
                    <span>•</span>
                    <span>{group.totalHours.toLocaleString()} hours forecasted</span>
                    {group.budgetedHours > 0 && (
                      <>
                        <span>•</span>
                        <span>{group.budgetedHours.toLocaleString()} hours budgeted</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {group.budgetedHours > 0 ? (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getVarianceColor(group.variancePercent)}`}>
                      {getVarianceIcon(group.variancePercent)} {group.variancePercent > 0 ? '+' : ''}{group.variancePercent.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">No budget</span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getForecastStatusColor(ForecastStatus.Reviewed)}`}>
                    Finance Reviewed
                  </span>
                </div>
              </div>

              {/* Project Forecasts */}
              {expandedProjects.has(group.projectId) && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                  {group.forecasts.map(forecast => (
                    <div
                      key={forecast.id}
                      className={`px-4 py-3 pl-16 flex items-center hover:bg-gray-50 ${selectedForecasts.includes(forecast.id) ? 'bg-emerald-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForecasts.includes(forecast.id)}
                        onChange={() => toggleForecastSelection(forecast.id)}
                        className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{forecast.assigneeName}</div>
                        <div className="text-sm text-gray-500">
                          {forecast.positionTitle}
                          {forecast.wbsElementCode && ` • ${forecast.wbsElementCode}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {getMonthShortName(forecast.month)} {forecast.year}
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-emerald-600 w-24 text-right">
                          {forecast.forecastedHours} hrs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
            <input
              type="checkbox"
              checked={selectedForecasts.length === filteredForecasts.length && filteredForecasts.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="ml-3 text-sm text-gray-500">Select All</span>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredForecasts.map(forecast => (
              <div
                key={forecast.id}
                className={`px-4 py-3 flex items-center hover:bg-gray-50 ${selectedForecasts.includes(forecast.id) ? 'bg-emerald-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedForecasts.includes(forecast.id)}
                  onChange={() => toggleForecastSelection(forecast.id)}
                  className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/forecast/projects/${forecast.projectId}`}
                      className="font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {forecast.projectName}
                    </Link>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-900">{forecast.assigneeName}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {forecast.positionTitle} • {getMonthShortName(forecast.month)} {forecast.year}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-emerald-600">
                    {forecast.forecastedHours} hrs
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getForecastStatusColor(forecast.status)}`}>
                    {forecast.statusName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Approve {selectedForecasts.length} Forecasts
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will give final approval to the selected forecasts. They will be ready for month-end lock.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approval Notes (optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setApprovalNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate({ forecastIds: selectedForecasts, notes: approvalNotes || undefined })}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reject {selectedForecasts.length} Forecasts
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will reject the selected forecasts and send them back to the PM for revision.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Please explain why these forecasts are being rejected..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ forecastIds: selectedForecasts, reason: rejectReason })}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default ForecastApprovalsPage;

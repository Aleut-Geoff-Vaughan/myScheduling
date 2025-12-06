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
} from '../services/forecastService';
import { MobileWarningBanner } from '../components/MobileWarningBanner';

type GroupBy = 'project' | 'person' | 'period';

export function ForecastReviewPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  const [selectedForecasts, setSelectedForecasts] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('project');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Fetch submitted forecasts (awaiting Finance review)
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['forecasts-for-review', tenantId],
    queryFn: () => forecastsService.getAll({
      tenantId,
      status: ForecastStatus.Submitted,
    }),
    enabled: !!tenantId,
  });

  // Bulk review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ forecastIds, notes }: { forecastIds: string[]; notes?: string }) => {
      const results = await Promise.allSettled(
        forecastIds.map(id => forecastsService.review(id, notes))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['forecasts-for-review'] });
      setSelectedForecasts([]);
      setShowReviewModal(false);
      setReviewNotes('');
      if (result.failed > 0) {
        toast.success(`Reviewed ${result.succeeded} forecasts. ${result.failed} failed.`);
      } else {
        toast.success(`Successfully reviewed ${result.succeeded} forecasts`);
      }
    },
    onError: () => {
      toast.error('Failed to review forecasts');
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
      queryClient.invalidateQueries({ queryKey: ['forecasts-for-review'] });
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
      f.assigneeName?.toLowerCase().includes(term) ||
      f.positionTitle?.toLowerCase().includes(term)
    );
  }, [forecasts, searchTerm]);

  // Group forecasts
  const groupedForecasts = useMemo(() => {
    const groups: Record<string, { label: string; sublabel?: string; forecasts: Forecast[]; totalHours: number }> = {};

    filteredForecasts.forEach(forecast => {
      let key: string;
      let label: string;
      let sublabel: string | undefined;

      switch (groupBy) {
        case 'project':
          key = forecast.projectId || 'unknown';
          label = forecast.projectName || 'Unknown Project';
          break;
        case 'person':
          key = forecast.assigneeName || 'unknown';
          label = forecast.assigneeName || 'Unknown';
          sublabel = forecast.positionTitle;
          break;
        case 'period':
          key = `${forecast.year}-${forecast.month}`;
          label = `${getMonthShortName(forecast.month)} ${forecast.year}`;
          break;
        default:
          key = 'all';
          label = 'All';
      }

      if (!groups[key]) {
        groups[key] = { label, sublabel, forecasts: [], totalHours: 0 };
      }
      groups[key].forecasts.push(forecast);
      groups[key].totalHours += forecast.forecastedHours;
    });

    return Object.entries(groups).sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [filteredForecasts, groupBy]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedForecasts.length === filteredForecasts.length) {
      setSelectedForecasts([]);
    } else {
      setSelectedForecasts(filteredForecasts.map(f => f.id));
    }
  };

  const toggleGroupExpand = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleForecastSelection = (id: string) => {
    setSelectedForecasts(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const selectGroup = (forecasts: Forecast[]) => {
    const groupIds = forecasts.map(f => f.id);
    const allSelected = groupIds.every(id => selectedForecasts.includes(id));
    if (allSelected) {
      setSelectedForecasts(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedForecasts(prev => [...new Set([...prev, ...groupIds])]);
    }
  };

  // Summary stats
  const stats = useMemo(() => ({
    total: filteredForecasts.length,
    totalHours: filteredForecasts.reduce((sum, f) => sum + f.forecastedHours, 0),
    projects: new Set(filteredForecasts.map(f => f.projectId)).size,
    people: new Set(filteredForecasts.map(f => f.assigneeName)).size,
  }), [filteredForecasts]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <MobileWarningBanner pageName="The Review Queue" />
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Forecast Review Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve submitted forecasts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Pending Review</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.total}</div>
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
          <div className="text-sm text-gray-500">People</div>
          <div className="text-2xl font-bold text-gray-900">{stats.people}</div>
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

          {/* Group By */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="project">Project</option>
              <option value="person">Person</option>
              <option value="period">Period</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedForecasts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedForecasts.length} selected</span>
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                Mark Reviewed
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-500">No forecasts are currently awaiting review.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
            <input
              type="checkbox"
              checked={selectedForecasts.length === filteredForecasts.length && filteredForecasts.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="ml-3 text-sm text-gray-500">Select All</span>
          </div>

          {/* Grouped List */}
          <div className="divide-y divide-gray-200">
            {groupedForecasts.map(([key, group]) => (
              <div key={key}>
                {/* Group Header */}
                <div
                  className="px-4 py-3 bg-gray-50 flex items-center cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleGroupExpand(key)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectGroup(group.forecasts);
                    }}
                    className="mr-3"
                  >
                    <input
                      type="checkbox"
                      checked={group.forecasts.every(f => selectedForecasts.includes(f.id))}
                      onChange={() => selectGroup(group.forecasts)}
                      className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                  </button>
                  <svg
                    className={`w-4 h-4 text-gray-400 mr-2 transition-transform ${expandedGroups.has(key) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{group.label}</span>
                    {group.sublabel && <span className="ml-2 text-sm text-gray-500">{group.sublabel}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{group.forecasts.length} forecasts</span>
                    <span className="text-sm font-medium text-emerald-600">{group.totalHours.toLocaleString()} hrs</span>
                  </div>
                </div>

                {/* Group Items */}
                {expandedGroups.has(key) && (
                  <div className="divide-y divide-gray-100">
                    {group.forecasts.map(forecast => (
                      <div
                        key={forecast.id}
                        className={`px-4 py-3 pl-12 flex items-center hover:bg-gray-50 ${selectedForecasts.includes(forecast.id) ? 'bg-emerald-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForecasts.includes(forecast.id)}
                          onChange={() => toggleForecastSelection(forecast.id)}
                          className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {groupBy !== 'project' && (
                              <Link
                                to={`/forecast/projects/${forecast.projectId}`}
                                className="font-medium text-emerald-600 hover:text-emerald-700"
                              >
                                {forecast.projectName}
                              </Link>
                            )}
                            {groupBy !== 'person' && (
                              <span className="text-gray-900">{forecast.assigneeName}</span>
                            )}
                            {groupBy !== 'period' && (
                              <span className="text-gray-500 text-sm">
                                {getMonthShortName(forecast.month)} {forecast.year}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {forecast.positionTitle}
                            {forecast.wbsElementCode && ` • ${forecast.wbsElementCode}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold text-gray-900">
                            {forecast.forecastedHours} hrs
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getForecastStatusColor(forecast.status)}`}>
                            {forecast.statusName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mark {selectedForecasts.length} Forecasts as Reviewed
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will mark the selected forecasts as reviewed and send them to the P&L Lead for final approval.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Add any notes for the P&L Lead..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ forecastIds: selectedForecasts, notes: reviewNotes || undefined })}
                  disabled={reviewMutation.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {reviewMutation.isPending ? 'Processing...' : 'Mark Reviewed'}
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
                  {rejectMutation.isPending ? 'Processing...' : 'Reject Forecasts'}
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

export default ForecastReviewPage;

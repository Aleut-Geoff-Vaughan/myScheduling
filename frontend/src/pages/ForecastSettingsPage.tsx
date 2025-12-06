import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import {
  forecastsService,
  forecastVersionsService,
  getMonthName,
} from '../services/forecastService';

interface LockSettings {
  autoLockEnabled: boolean;
  lockDayOfMonth: number;
  lockReminderDays: number;
}

export function ForecastSettingsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Lock month state
  const [lockYear, setLockYear] = useState(currentYear);
  const [lockMonth, setLockMonth] = useState(currentMonth > 1 ? currentMonth - 1 : 12);
  const [lockReason, setLockReason] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  // Settings state (placeholder for future API)
  const [settings, setSettings] = useState<LockSettings>({
    autoLockEnabled: false,
    lockDayOfMonth: 5,
    lockReminderDays: 3,
  });

  // Fetch current version
  const { data: currentVersion } = useQuery({
    queryKey: ['current-forecast-version', tenantId],
    queryFn: () => forecastVersionsService.getCurrent(tenantId),
    enabled: !!tenantId,
  });

  // Fetch summary to see lock status
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['forecast-summary', tenantId],
    queryFn: () => forecastsService.getSummary({ tenantId }),
    enabled: !!tenantId,
  });

  // Lock month mutation
  const lockMutation = useMutation({
    mutationFn: () => forecastsService.lockMonth({
      tenantId,
      year: lockYear,
      month: lockMonth,
      reason: lockReason || undefined,
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['forecast-summary'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
      setShowLockConfirm(false);
      setLockReason('');
      toast.success(`Locked ${result.lockedCount} forecasts for ${getMonthName(lockMonth)} ${lockYear}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to lock month');
    },
  });

  // Generate months for selector
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  // Generate years for selector
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (summaryLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Forecast Settings</h1>
        <p className="text-gray-600 mt-1">Configure forecast schedules and lock periods</p>
      </div>

      {/* Current Version Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Forecast Version</h2>
        {currentVersion ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Version Name</div>
              <div className="font-medium text-gray-900">{currentVersion.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Period</div>
              <div className="font-medium text-gray-900">
                {getMonthName(currentVersion.startMonth)} {currentVersion.startYear} - {getMonthName(currentVersion.endMonth)} {currentVersion.endYear}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="font-medium text-gray-900">{currentVersion.typeName}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No active forecast version found.</p>
        )}
      </div>

      {/* Forecast Status Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Forecast Status Summary</h2>
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{summary.draftCount}</div>
              <div className="text-xs text-gray-500">Draft</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summary.submittedCount}</div>
              <div className="text-xs text-gray-500">Submitted</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{summary.reviewedCount}</div>
              <div className="text-xs text-gray-500">Reviewed</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.approvedCount}</div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.rejectedCount}</div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.lockedCount}</div>
              <div className="text-xs text-gray-500">Locked</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No forecast data available.</p>
        )}
      </div>

      {/* Lock Month Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lock Forecast Period</h2>
        <p className="text-sm text-gray-600 mb-4">
          Locking a period prevents any further changes to forecasts for that month. Only approved forecasts will be locked.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={lockYear}
              onChange={(e) => setLockYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={lockMonth}
              onChange={(e) => setLockMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowLockConfirm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Lock Period
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              <strong>Warning:</strong> Locking a period is irreversible. Ensure all forecasts for the period have been approved before locking.
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Lock Settings (Future Feature) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Auto-Lock Settings</h2>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Coming Soon</span>
        </div>

        <div className="space-y-4 opacity-50 pointer-events-none">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Auto-Lock</div>
              <div className="text-sm text-gray-500">Automatically lock periods on a schedule</div>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoLockEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
              onClick={() => setSettings(s => ({ ...s, autoLockEnabled: !s.autoLockEnabled }))}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoLockEnabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lock Day of Month</label>
              <select
                value={settings.lockDayOfMonth}
                onChange={(e) => setSettings(s => ({ ...s, lockDayOfMonth: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Previous month will be locked on this day</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Days Before</label>
              <select
                value={settings.lockReminderDays}
                onChange={(e) => setSettings(s => ({ ...s, lockReminderDays: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {[1, 2, 3, 5, 7].map(days => (
                  <option key={days} value={days}>{days} days</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Send reminders before auto-lock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings (Future Feature) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Coming Soon</span>
        </div>

        <div className="space-y-4 opacity-50 pointer-events-none">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-gray-900">Submission Deadline Reminders</div>
              <div className="text-sm text-gray-500">Notify PMs before forecast due dates</div>
            </div>
            <input type="checkbox" className="h-4 w-4 text-emerald-600 rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-gray-900">Approval Notifications</div>
              <div className="text-sm text-gray-500">Notify on approval and rejection</div>
            </div>
            <input type="checkbox" className="h-4 w-4 text-emerald-600 rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-gray-900">Budget Variance Alerts</div>
              <div className="text-sm text-gray-500">Alert when forecasts exceed budget by 15%</div>
            </div>
            <input type="checkbox" className="h-4 w-4 text-emerald-600 rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-500">Send email in addition to in-app notifications</div>
            </div>
            <input type="checkbox" className="h-4 w-4 text-emerald-600 rounded" />
          </div>
        </div>
      </div>

      {/* Lock Confirmation Modal */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lock {getMonthName(lockMonth)} {lockYear}?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This action will lock all approved forecasts for {getMonthName(lockMonth)} {lockYear}.
                This cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Month-end close, financial reporting..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowLockConfirm(false);
                    setLockReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => lockMutation.mutate()}
                  disabled={lockMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {lockMutation.isPending ? 'Locking...' : 'Confirm Lock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForecastSettingsPage;

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardHeader, CardBody } from '../components/ui';
import { TeamCalendarView } from '../components/TeamCalendarView';
import { ViewSelector } from '../components/ViewSelector';
import { getMondayOfWeek } from '../utils/dateUtils';
import { teamCalendarService } from '../services/teamCalendarService';
import toast from 'react-hot-toast';
import type { TeamCalendarViewResponse, ManagerViewResponse, TeamCalendarSummary, CreateTeamCalendarRequest, TeamCalendarType } from '../types/teamCalendar';

export function TeamCalendarPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [selectedView, setSelectedView] = useState<'current-week' | 'two-weeks' | 'month'>('two-weeks');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'manager' | 'team'>('manager');
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<TeamCalendarSummary[]>([]);
  const [calendarData, setCalendarData] = useState<TeamCalendarViewResponse | ManagerViewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create calendar modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateTeamCalendarRequest>({
    name: '',
    description: '',
    type: 0, // TeamCalendarType.Team
    ownerUserId: undefined,
    isActive: true,
  });

  // Fetch available calendars for the user
  useEffect(() => {
    const fetchAvailableCalendars = async () => {
      if (!user?.id) return;

      try {
        const response = await teamCalendarService.getAvailableCalendars(user.id);
        setAvailableCalendars(response.memberOf);
      } catch (err) {
        console.error('Failed to fetch available calendars:', err);
      }
    };

    fetchAvailableCalendars();
  }, [user?.id]);

  // Fetch calendar data based on mode
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const monday = getMondayOfWeek(referenceDate);
        const startDate = monday.toISOString().split('T')[0];

        // Calculate end date based on view
        const endDate = new Date(monday);
        if (selectedView === 'current-week') {
          endDate.setDate(endDate.getDate() + 4); // Friday
        } else if (selectedView === 'two-weeks') {
          endDate.setDate(endDate.getDate() + 11); // Second Friday
        } else {
          // Month view - get last Friday of month
          const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
          const lastFriday = new Date(lastDay);
          lastFriday.setDate(lastDay.getDate() - ((lastDay.getDay() + 2) % 7));
          endDate.setTime(lastFriday.getTime());
        }

        if (viewMode === 'manager') {
          // Fetch manager view
          const response = await teamCalendarService.getManagerView({
            userId: user.id,
            startDate,
            endDate: endDate.toISOString().split('T')[0],
          });
          setCalendarData(response);
        } else if (selectedCalendar) {
          // Fetch team calendar view
          const response = await teamCalendarService.getCalendarView(selectedCalendar, {
            startDate,
            endDate: endDate.toISOString().split('T')[0],
          });
          setCalendarData(response);
        }
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load calendar data');
        console.error('Failed to fetch calendar data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [user?.id, viewMode, selectedCalendar, referenceDate, selectedView]);

  const handlePreviousPeriod = () => {
    const newDate = new Date(referenceDate);
    if (selectedView === 'current-week' || selectedView === 'two-weeks') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setReferenceDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(referenceDate);
    if (selectedView === 'current-week' || selectedView === 'two-weeks') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setReferenceDate(newDate);
  };

  const handleToday = () => {
    setReferenceDate(new Date());
  };

  const getWeeksToShow = (): 1 | 2 => {
    if (selectedView === 'current-week') return 1;
    if (selectedView === 'month') return 2; // We'll handle month differently
    return 2;
  };

  const getTitle = () => {
    if (viewMode === 'manager' && calendarData && 'manager' in calendarData) {
      const managerName = calendarData.manager.displayName || calendarData.manager.email || 'Manager';
      return `${managerName}'s Team`;
    } else if (viewMode === 'team' && calendarData && 'calendar' in calendarData) {
      return calendarData.calendar.name;
    }
    return 'Team Calendar';
  };

  const getSubtitle = () => {
    if (viewMode === 'manager' && calendarData && 'totalDirectReports' in calendarData) {
      return `${calendarData.totalDirectReports} direct report${calendarData.totalDirectReports !== 1 ? 's' : ''}`;
    } else if (viewMode === 'team' && calendarData && 'calendar' in calendarData) {
      return `${calendarData.calendar.memberCount} member${calendarData.calendar.memberCount !== 1 ? 's' : ''}`;
    }
    return 'View your team\'s work location schedule';
  };

  const fetchAvailableCalendarsCallback = async () => {
    if (!user?.id) return;
    try {
      const response = await teamCalendarService.getAvailableCalendars(user.id);
      setAvailableCalendars(response.memberOf);
    } catch (err) {
      console.error('Failed to fetch available calendars:', err);
    }
  };

  const handleCreate = async () => {
    if (!currentWorkspace?.tenantId || !user?.id) return;

    try {
      await teamCalendarService.create(
        currentWorkspace.tenantId,
        user.id,
        formData
      );
      toast.success('Team calendar created successfully');
      setShowCreateModal(false);
      resetForm();
      // Refresh available calendars
      void fetchAvailableCalendarsCallback();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to create calendar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 0,
      ownerUserId: undefined,
      isActive: true,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Calendar</h1>
          <p className="text-gray-600 mt-2">View and track your team's work locations</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Team Calendar
        </button>
      </div>

      {/* View Mode Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('manager')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${viewMode === 'manager'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
              }
            `}
          >
            My Direct Reports
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${viewMode === 'team'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
              }
            `}
          >
            Team Calendars
          </button>
        </div>
      </div>

      {/* Team Calendar Selector (only shown when in team mode) */}
      {viewMode === 'team' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Team Calendar
          </label>
          <select
            value={selectedCalendar || ''}
            onChange={(e) => setSelectedCalendar(e.target.value || null)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a calendar --</option>
            {availableCalendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name} ({cal.memberCount} members)
              </option>
            ))}
          </select>
          {availableCalendars.length === 0 && (
            <p className="text-sm text-gray-600 mt-2">
              You are not a member of any team calendars yet.
            </p>
          )}
        </div>
      )}

      {/* Calendar Card */}
      <Card>
        <CardHeader title={getTitle()} subtitle={getSubtitle()} />
        <CardBody>
          {/* View Selector */}
          <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-3">
            <button
              onClick={handlePreviousPeriod}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-md hover:bg-blue-50 transition"
            >
              Today
            </button>

            <button
              onClick={handleNextPeriod}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading calendar...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* No Calendar Selected (team mode) */}
          {!isLoading && !error && viewMode === 'team' && !selectedCalendar && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">Select a team calendar to view</p>
              <p className="text-sm mt-2">Choose a calendar from the dropdown above</p>
            </div>
          )}

          {/* Calendar View */}
          {!isLoading && !error && calendarData && (
            <TeamCalendarView
              memberSchedules={
                'directReports' in calendarData
                  ? calendarData.directReports
                  : calendarData.memberSchedules
              }
              startDate={getMondayOfWeek(referenceDate)}
              weeksToShow={getWeeksToShow()}
            />
          )}

          {/* Empty State (manager mode with no direct reports) */}
          {!isLoading &&
            !error &&
            viewMode === 'manager' &&
            calendarData &&
            'totalDirectReports' in calendarData &&
            calendarData.totalDirectReports === 0 && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium">No direct reports</p>
                <p className="text-sm mt-2">You don't have any direct reports assigned yet</p>
              </div>
            )}
        </CardBody>
      </Card>

      {/* Create Calendar Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create Team Calendar
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Engineering Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="calendarType" className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  id="calendarType"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) as TeamCalendarType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Team</option>
                  <option value={1}>Manager</option>
                  <option value={2}>Department</option>
                  <option value={3}>Project</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

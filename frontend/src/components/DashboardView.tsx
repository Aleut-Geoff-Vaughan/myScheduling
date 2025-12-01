import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from './ui';
import { WeekCalendarView } from './WeekCalendarView';
import { MonthCalendarView } from './MonthCalendarView';
import { ViewSelector } from './ViewSelector';
import { WorkLocationSelector } from './WorkLocationSelector';
import { PTODateRangeModal } from './PTODateRangeModal';
import { ShareCalendarModal } from './ShareCalendarModal';
import { ApplyTemplateSelectModal } from './ApplyTemplateSelectModal';
import { useDashboard } from '../hooks/useDashboard';
import { getMondayOfWeek } from '../utils/dateUtils';
import { CalendarSkeleton, StatsCardSkeleton } from './skeletons/CalendarSkeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { DayPortion } from '../types/api';

interface DashboardViewProps {
  userId: string;
  displayName: string;
  isSelf?: boolean;
  headlineOverride?: string;
  canEdit?: boolean;
}

export function DashboardView({
  userId,
  displayName,
  isSelf = true,
  headlineOverride,
  canEdit = true,
}: DashboardViewProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showPTOModal, setShowPTOModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'current-week' | 'two-weeks' | 'month'>('two-weeks');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [daysPerWeek, setDaysPerWeek] = useState<5 | 7>(5);

  const dateRange = useMemo(() => {
    const monday = getMondayOfWeek(referenceDate);
    let startDate: Date;
    let endDate: Date;

    if (selectedView === 'current-week') {
      startDate = monday;
      endDate = new Date(monday);
      endDate.setDate(endDate.getDate() + 6);
    } else if (selectedView === 'two-weeks') {
      startDate = monday;
      endDate = new Date(monday);
      endDate.setDate(endDate.getDate() + 13);
    } else {
      startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [selectedView, referenceDate]);

  const { data: dashboardData, isLoading, error } = useDashboard(userId, dateRange.startDate, dateRange.endDate);

  const handleDayClick = (date: Date) => {
    if (!canEdit) return;
    setSelectedDate(date);
    setShowLocationSelector(true);
  };

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

  // Find existing preferences for the selected date (handles full day and split day modes)
  const { existingPreference, existingPmPreference } = useMemo(() => {
    if (!selectedDate || !dashboardData) {
      return { existingPreference: undefined, existingPmPreference: undefined };
    }
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayPreferences = dashboardData.preferences.filter(
      (p) => p.workDate === dateStr && p.userId === dashboardData.user.id
    );

    // Look for FullDay, AM, or PM preferences
    const fullDay = dayPreferences.find((p) => p.dayPortion === DayPortion.FullDay);
    const am = dayPreferences.find((p) => p.dayPortion === DayPortion.AM);
    const pm = dayPreferences.find((p) => p.dayPortion === DayPortion.PM);

    // If there's a full day preference, use it as the primary
    // If there's AM/PM, use AM as primary and PM as secondary
    return {
      existingPreference: fullDay || am || dayPreferences[0],
      existingPmPreference: pm,
    };
  }, [selectedDate, dashboardData]);

  const stats = useMemo(() => {
    if (!dashboardData) return [];

    return [
      {
        name: 'Remote Days',
        value: dashboardData.stats.remoteDays.toString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
        color: 'bg-blue-500',
      },
      {
        name: 'Office Days',
        value: dashboardData.stats.officeDays.toString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        color: 'bg-green-500',
      },
      {
        name: 'Client Sites',
        value: dashboardData.stats.clientSites.toString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        color: 'bg-orange-500',
      },
      {
        name: 'Not Set',
        value: dashboardData.stats.notSet.toString(),
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'bg-gray-500',
      },
    ];
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {headlineOverride ?? (isSelf ? `Welcome back, ${displayName}!` : `Dashboard for ${displayName}`)}
          </h1>
          <p className="text-gray-600 mt-2">
            Plan work locations and view schedule details.
          </p>
        </div>
        <StatsCardSkeleton />
        <div className="mt-6">
          <Card>
            <CardHeader
              title={isSelf ? 'My Work Location Schedule' : `${displayName}'s Work Location`}
              subtitle="Click on any day to view work location"
            />
            <CardBody>
              <CalendarSkeleton />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-red-600 text-lg mb-2">Failed to load dashboard</div>
            <p className="text-gray-600">{error?.message || 'Please try refreshing the page'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-3 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            {headlineOverride ?? (isSelf ? `Welcome back, ${displayName}!` : `${displayName}'s Dashboard`)}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            {selectedView === 'current-week' && 'Plan work location for this week.'}
            {selectedView === 'two-weeks' && 'Plan work location for the next two weeks.'}
            {selectedView === 'month' && 'View and manage work location for the entire month.'}
          </p>
        </div>

        {/* Stats grid: 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-1.5 sm:p-2 flex-shrink-0`}>
                  <div className="text-white w-4 h-4 sm:w-6 sm:h-6">{stat.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="mb-4 sm:mb-6">
          <CardHeader
            title={isSelf ? 'My Work Location Schedule' : `${displayName}'s Work Location`}
            subtitle={canEdit ? 'Click on any day to set or update work location' : 'Viewing schedule'}
          />
          <CardBody>
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <ViewSelector
                selectedView={selectedView}
                onViewChange={setSelectedView}
                daysPerWeek={daysPerWeek}
                onDaysPerWeekChange={setDaysPerWeek}
              />
              {/* Action buttons - compact on mobile */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md sm:rounded-lg hover:bg-blue-100 hover:border-blue-400 transition"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-md sm:rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="hidden sm:inline">Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPTOModal(true)}
                      className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md sm:rounded-lg hover:bg-amber-100 hover:border-amber-400 transition"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="hidden sm:inline">PTO</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-2 sm:p-3">
              <button
                onClick={handlePreviousPeriod}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
              </button>

              <button
                onClick={handleToday}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-md hover:bg-blue-50 transition"
              >
                Today
              </button>

              <button
                onClick={handleNextPeriod}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition"
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {selectedView === 'current-week' && (
              <WeekCalendarView
                startDate={getMondayOfWeek(referenceDate)}
                preferences={dashboardData.preferences}
                onDayClick={handleDayClick}
                userId={dashboardData.user.id}
                weeksToShow={1}
                daysPerWeek={daysPerWeek}
              />
            )}

            {selectedView === 'two-weeks' && (
              <WeekCalendarView
                startDate={getMondayOfWeek(referenceDate)}
                preferences={dashboardData.preferences}
                onDayClick={handleDayClick}
                userId={dashboardData.user.id}
                weeksToShow={2}
                daysPerWeek={daysPerWeek}
              />
            )}

            {selectedView === 'month' && (
              <MonthCalendarView
                referenceDate={referenceDate}
                preferences={dashboardData.preferences}
                onDayClick={handleDayClick}
                userId={dashboardData.user.id}
              />
            )}
          </CardBody>
        </Card>

        {isSelf && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card hover onClick={() => navigate('/hoteling')}>
              <CardBody className="text-center py-6">
                <svg className="w-12 h-12 mx-auto mb-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-semibold text-lg">Desk Reservations</h3>
                <p className="text-sm text-gray-600 mt-1">Book a desk or conference room</p>
              </CardBody>
            </Card>

            <Card hover onClick={() => navigate('/staffing')}>
              <CardBody className="text-center py-6">
                <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="font-semibold text-lg">My Assignments</h3>
                <p className="text-sm text-gray-600 mt-1">View project assignments</p>
              </CardBody>
            </Card>

            <Card hover onClick={() => navigate('/projects')}>
              <CardBody className="text-center py-6">
                <svg className="w-12 h-12 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="font-semibold text-lg">Projects</h3>
                <p className="text-sm text-gray-600 mt-1">Browse active projects</p>
              </CardBody>
            </Card>
          </div>
        )}

        {selectedDate && canEdit && (
          <WorkLocationSelector
            isOpen={showLocationSelector}
            onClose={() => {
              setShowLocationSelector(false);
              setSelectedDate(null);
            }}
            selectedDate={selectedDate}
            existingPreference={existingPreference}
            existingPmPreference={existingPmPreference}
            userId={dashboardData.user.id}
          />
        )}

        {canEdit && (
          <PTODateRangeModal
            isOpen={showPTOModal}
            onClose={() => setShowPTOModal(false)}
            userId={dashboardData.user.id}
          />
        )}

        <ShareCalendarModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          preferences={dashboardData.preferences}
          user={dashboardData.user}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />

        {canEdit && (
          <ApplyTemplateSelectModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

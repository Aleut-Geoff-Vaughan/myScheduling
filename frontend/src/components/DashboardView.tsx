import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from './ui';
import { WeekCalendarView } from './WeekCalendarView';
import { MonthCalendarView } from './MonthCalendarView';
import { ViewSelector } from './ViewSelector';
import { WorkLocationSelector } from './WorkLocationSelector';
import { useDashboard } from '../hooks/useDashboard';
import { getMondayOfWeek } from '../utils/dateUtils';
import { CalendarSkeleton, StatsCardSkeleton } from './skeletons/CalendarSkeleton';
import { ErrorBoundary } from './ErrorBoundary';

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
  const [selectedView, setSelectedView] = useState<'current-week' | 'two-weeks' | 'month'>('two-weeks');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

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

  const existingPreference = useMemo(() => {
    if (!selectedDate || !dashboardData) return undefined;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return dashboardData.preferences.find(
      (p) => p.workDate === dateStr && p.userId === dashboardData.user.id
    );
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {headlineOverride ?? (isSelf ? `Welcome back, ${displayName}!` : `${displayName}'s Dashboard`)}
          </h1>
          <p className="text-gray-600 mt-2">
            {selectedView === 'current-week' && 'Plan work location for this week.'}
            {selectedView === 'two-weeks' && 'Plan work location for the next two weeks.'}
            {selectedView === 'month' && 'View and manage work location for the entire month.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-2`}>
                  <div className="text-white">{stat.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader
            title={isSelf ? 'My Work Location Schedule' : `${displayName}'s Work Location`}
            subtitle={canEdit ? 'Click on any day to set or update work location' : 'Viewing schedule'}
          />
          <CardBody>
            <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />

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

            {selectedView === 'current-week' && (
              <WeekCalendarView
                startDate={getMondayOfWeek(referenceDate)}
                preferences={dashboardData.preferences}
                onDayClick={handleDayClick}
                userId={dashboardData.user.id}
                weeksToShow={1}
              />
            )}

            {selectedView === 'two-weeks' && (
              <WeekCalendarView
                startDate={getMondayOfWeek(referenceDate)}
                preferences={dashboardData.preferences}
                onDayClick={handleDayClick}
                userId={dashboardData.user.id}
                weeksToShow={2}
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
            userId={dashboardData.user.id}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

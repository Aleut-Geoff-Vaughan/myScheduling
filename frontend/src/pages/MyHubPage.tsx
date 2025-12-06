import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useDashboard } from '../hooks/useDashboard';
import { bookingsService } from '../services/bookingsService';
import { doaService } from '../services/doaService';
import { projectAssignmentsService } from '../services/projectAssignmentsService';
import { forecastsService, type Forecast, ForecastStatus } from '../services/forecastService';
import { getMondayOfWeek } from '../utils/dateUtils';
import { Card, CardBody } from '../components/ui';
import { BookingStatus, ProjectAssignmentStatus } from '../types/api';
import type { DOAActivation } from '../types/doa';

// Get date range for the next two weeks
function getDateRange() {
  const monday = getMondayOfWeek(new Date());
  const endDate = new Date(monday);
  endDate.setDate(endDate.getDate() + 13);
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startDatetime: monday.toISOString(),
    endDatetime: endDate.toISOString(),
  };
}

export function MyHubPage() {
  const { user, currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || '';
  const dateRange = useMemo(() => getDateRange(), []);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // MySchedule data
  const { data: dashboardData, isLoading: scheduleLoading } = useDashboard(
    user?.id,
    dateRange.startDate,
    dateRange.endDate
  );

  // Hoteling Bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings', user?.id, dateRange.startDatetime, dateRange.endDatetime],
    queryFn: () =>
      bookingsService.getAll({
        userId: user?.id,
        startDate: dateRange.startDatetime,
        endDate: dateRange.endDatetime,
      }),
    enabled: !!user?.id,
  });

  // Active DOAs
  const { data: activeDOAs = [], isLoading: doasLoading } = useQuery({
    queryKey: ['active-doas', dateRange.startDate],
    queryFn: () => doaService.getActiveActivations(),
    enabled: true,
  });

  // Project Assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-project-assignments', user?.id],
    queryFn: () =>
      projectAssignmentsService.getAll({
        userId: user?.id,
        status: ProjectAssignmentStatus.Active,
      }),
    enabled: !!user?.id,
  });

  // My Forecasts
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ['my-forecasts-hub', tenantId],
    queryFn: () =>
      forecastsService.getMyForecasts({
        tenantId,
      }),
    enabled: !!tenantId,
  });

  // Calculate summary stats
  const scheduleStats = useMemo(() => {
    if (!dashboardData) return { remote: 0, office: 0, client: 0, pto: 0 };
    return {
      remote: dashboardData.stats.remoteDays,
      office: dashboardData.stats.officeDays,
      client: dashboardData.stats.clientSites,
      pto: 0,
    };
  }, [dashboardData]);

  const bookingStats = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => b.status === BookingStatus.Reserved && new Date(b.startDatetime) > new Date()
    );
    const today = bookings.filter((b) => {
      const startDate = new Date(b.startDatetime).toDateString();
      return startDate === new Date().toDateString();
    });
    return { total: bookings.length, upcoming: upcoming.length, today: today.length };
  }, [bookings]);

  const doaStats = useMemo(() => {
    const myDOAs = activeDOAs.filter(
      (d: DOAActivation) =>
        d.doaLetter?.designeeUserId === user?.id || d.doaLetter?.delegatorUserId === user?.id
    );
    return { active: myDOAs.length };
  }, [activeDOAs, user?.id]);

  const assignmentStats = useMemo(() => {
    return { active: assignments.length };
  }, [assignments]);

  const forecastStats = useMemo(() => {
    const draft = forecasts.filter((f: Forecast) => f.status === ForecastStatus.Draft).length;
    const submitted = forecasts.filter((f: Forecast) => f.status === ForecastStatus.Submitted).length;
    const totalHours = forecasts.reduce((sum: number, f: Forecast) => sum + f.forecastedHours, 0);
    return { total: forecasts.length, draft, submitted, totalHours };
  }, [forecasts]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!user) return null;

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">myHub</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Your unified dashboard - everything in one place
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <SummaryCard
          title="Schedule"
          subtitle="Next 2 weeks"
          stat={`${scheduleStats.office + scheduleStats.remote} days`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="bg-blue-500"
          link="/schedule"
          loading={scheduleLoading}
        />
        <SummaryCard
          title="Reservations"
          subtitle="Office bookings"
          stat={`${bookingStats.upcoming} upcoming`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="bg-emerald-500"
          link="/hoteling"
          loading={bookingsLoading}
        />
        <SummaryCard
          title="DOAs"
          subtitle="Active delegations"
          stat={`${doaStats.active} active`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="bg-purple-500"
          link="/doa"
          loading={doasLoading}
        />
        <SummaryCard
          title="Assignments"
          subtitle="Project roles"
          stat={`${assignmentStats.active} active`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="bg-orange-500"
          link="/staffing"
          loading={assignmentsLoading}
        />
        <SummaryCard
          title="Forecasts"
          subtitle="Hours forecast"
          stat={`${forecastStats.totalHours.toLocaleString()} hrs`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="bg-cyan-500"
          link="/forecast/my-forecasts"
          loading={forecastsLoading}
        />
      </div>

      {/* Detailed Sections */}
      <div className="space-y-4">
        {/* MySchedule Section */}
        <CollapsibleSection
          title="My Schedule"
          subtitle={`${scheduleStats.office} office, ${scheduleStats.remote} remote days`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="bg-blue-500"
          isExpanded={expandedSection === 'schedule'}
          onToggle={() => toggleSection('schedule')}
          loading={scheduleLoading}
          link="/schedule"
        >
          {dashboardData && dashboardData.preferences.length > 0 ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {dashboardData.preferences.slice(0, 14).map((pref, idx) => (
                <div
                  key={pref.id || idx}
                  className={`p-2 rounded text-center text-xs ${getScheduleColor(pref.locationType)}`}
                >
                  <div className="font-medium">{formatDayShort(pref.workDate)}</div>
                  <div className="truncate">{getLocationShort(pref.locationType)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No schedule preferences set for this period.</p>
          )}
        </CollapsibleSection>

        {/* Reservations Section */}
        <CollapsibleSection
          title="My Reservations"
          subtitle={`${bookingStats.today} today, ${bookingStats.upcoming} upcoming`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="bg-emerald-500"
          isExpanded={expandedSection === 'bookings'}
          onToggle={() => toggleSection('bookings')}
          loading={bookingsLoading}
          link="/hoteling"
        >
          {bookings.length > 0 ? (
            <div className="space-y-2">
              {bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(booking.startDatetime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(booking.startDatetime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${getBookingStatusColor(booking.status)}`}>
                    {getBookingStatusLabel(booking.status)}
                  </div>
                </div>
              ))}
              {bookings.length > 5 && (
                <Link to="/hoteling" className="text-emerald-600 text-sm hover:underline">
                  View all {bookings.length} reservations
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming reservations.</p>
          )}
        </CollapsibleSection>

        {/* DOAs Section */}
        <CollapsibleSection
          title="My DOAs"
          subtitle={`${doaStats.active} active delegations`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="bg-purple-500"
          isExpanded={expandedSection === 'doas'}
          onToggle={() => toggleSection('doas')}
          loading={doasLoading}
          link="/doa"
        >
          {activeDOAs.length > 0 ? (
            <div className="space-y-2">
              {activeDOAs
                .filter(
                  (d: DOAActivation) =>
                    d.doaLetter?.designeeUserId === user?.id ||
                    d.doaLetter?.delegatorUserId === user?.id
                )
                .slice(0, 5)
                .map((doa: DOAActivation) => (
                  <div
                    key={doa.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {doa.doaLetter?.subjectLine || 'Delegation'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {doa.doaLetter?.designeeUserId === user?.id ? 'Designee' : 'Delegator'}
                        {' - '}
                        {new Date(doa.startDate).toLocaleDateString()} to{' '}
                        {new Date(doa.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      Active
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active delegations.</p>
          )}
        </CollapsibleSection>

        {/* Project Assignments Section */}
        <CollapsibleSection
          title="My Project Assignments"
          subtitle={`${assignmentStats.active} active assignments`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="bg-orange-500"
          isExpanded={expandedSection === 'assignments'}
          onToggle={() => toggleSection('assignments')}
          loading={assignmentsLoading}
          link="/staffing"
        >
          {assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">Project Assignment</div>
                    <div className="text-xs text-gray-500">
                      {new Date(assignment.startDate).toLocaleDateString()}
                      {assignment.endDate && ` - ${new Date(assignment.endDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                    Active
                  </span>
                </div>
              ))}
              {assignments.length > 5 && (
                <Link to="/staffing" className="text-orange-600 text-sm hover:underline">
                  View all {assignments.length} assignments
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active project assignments.</p>
          )}
        </CollapsibleSection>

        {/* Forecasts Section */}
        <CollapsibleSection
          title="My Forecasts"
          subtitle={`${forecastStats.totalHours.toLocaleString()} total hours forecasted`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="bg-cyan-500"
          isExpanded={expandedSection === 'forecasts'}
          onToggle={() => toggleSection('forecasts')}
          loading={forecastsLoading}
          link="/forecast/my-forecasts"
        >
          {forecasts.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-gray-100 rounded">
                  <div className="text-lg font-bold text-gray-900">{forecastStats.draft}</div>
                  <div className="text-xs text-gray-500">Draft</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-700">{forecastStats.submitted}</div>
                  <div className="text-xs text-gray-500">Submitted</div>
                </div>
                <div className="text-center p-2 bg-cyan-50 rounded">
                  <div className="text-lg font-bold text-cyan-700">{forecastStats.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
              {forecasts.slice(0, 3).map((forecast: Forecast) => (
                <div
                  key={forecast.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{forecast.projectName || 'Project'}</div>
                    <div className="text-xs text-gray-500">
                      {forecast.periodDisplay} - {forecast.forecastedHours} hrs
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getForecastStatusColor(forecast.status)}`}>
                    {forecast.statusName}
                  </span>
                </div>
              ))}
              {forecasts.length > 3 && (
                <Link to="/forecast/my-forecasts" className="text-cyan-600 text-sm hover:underline">
                  View all {forecasts.length} forecasts
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No forecasts found.</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  subtitle: string;
  stat: string;
  icon: React.ReactNode;
  color: string;
  link: string;
  loading?: boolean;
}

function SummaryCard({ title, subtitle, stat, icon, color, link, loading }: SummaryCardProps) {
  return (
    <Link
      to={link}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md hover:border-gray-300 transition group"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
        <div className={`${color} rounded-lg p-1.5 sm:p-2 flex-shrink-0 group-hover:scale-110 transition`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <div className="mt-2">
        {loading ? (
          <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
        ) : (
          <p className="text-lg sm:text-xl font-bold text-gray-900">{stat}</p>
        )}
      </div>
    </Link>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  loading?: boolean;
  link: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  color,
  isExpanded,
  onToggle,
  loading,
  link,
  children,
}: CollapsibleSectionProps) {
  return (
    <Card>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`${color} rounded-lg p-2 text-white`}>{icon}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={link}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            View All
          </Link>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isExpanded && (
        <CardBody className="pt-0 border-t border-gray-100">
          {loading ? (
            <div className="space-y-2">
              <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            children
          )}
        </CardBody>
      )}
    </Card>
  );
}

// Helper functions
function getScheduleColor(locationType: number): string {
  switch (locationType) {
    case 0: // Remote
      return 'bg-blue-100 text-blue-800';
    case 1: // Office
      return 'bg-green-100 text-green-800';
    case 2: // Client
      return 'bg-orange-100 text-orange-800';
    case 3: // PTO
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getLocationShort(locationType: number): string {
  switch (locationType) {
    case 0:
      return 'Remote';
    case 1:
      return 'Office';
    case 2:
      return 'Client';
    case 3:
      return 'PTO';
    default:
      return '-';
  }
}

function formatDayShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function getBookingStatusColor(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.Reserved:
      return 'bg-blue-100 text-blue-800';
    case BookingStatus.CheckedIn:
      return 'bg-green-100 text-green-800';
    case BookingStatus.Completed:
      return 'bg-gray-100 text-gray-800';
    case BookingStatus.Cancelled:
      return 'bg-red-100 text-red-800';
    case BookingStatus.NoShow:
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.Reserved:
      return 'Reserved';
    case BookingStatus.CheckedIn:
      return 'Checked In';
    case BookingStatus.Completed:
      return 'Completed';
    case BookingStatus.Cancelled:
      return 'Cancelled';
    case BookingStatus.NoShow:
      return 'No Show';
    default:
      return 'Unknown';
  }
}

function getForecastStatusColor(status: ForecastStatus): string {
  switch (status) {
    case ForecastStatus.Draft:
      return 'bg-gray-100 text-gray-800';
    case ForecastStatus.Submitted:
      return 'bg-yellow-100 text-yellow-800';
    case ForecastStatus.Reviewed:
      return 'bg-purple-100 text-purple-800';
    case ForecastStatus.Approved:
      return 'bg-green-100 text-green-800';
    case ForecastStatus.Rejected:
      return 'bg-red-100 text-red-800';
    case ForecastStatus.Locked:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default MyHubPage;

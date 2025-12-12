import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useDashboard } from '../hooks/useDashboard';
import { bookingsService } from '../services/bookingsService';
import { doaService } from '../services/doaService';
import { projectAssignmentsService } from '../services/projectAssignmentsService';
import { forecastsService, type Forecast, ForecastStatus } from '../services/forecastService';
import { getMondayOfWeek } from '../utils/dateUtils';
import { BookingStatus, ProjectAssignmentStatus } from '../types/api';
import type { DelegationOfAuthorityLetter } from '../types/doa';
import type { Booking, ProjectAssignment } from '../types/api';
import { MyHubDetailModal } from '../components/MyHubDetailModal';
import {
  Calendar,
  Users,
  Briefcase,
  FileText,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Mail,
} from 'lucide-react';
import { ExpiringCertificationsWidget } from '../components/dashboard/ExpiringCertificationsWidget';

// Types for the detail modal
type ModalType = 'schedule' | 'booking' | 'doa' | 'assignment' | 'forecast';
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  date?: Date;
}

type ViewMode = '1week' | '2weeks' | 'month';

// Get date range based on view mode and offset
function getDateRange(viewMode: ViewMode, weekOffset: number = 0) {
  const today = new Date();
  let startDate: Date;
  let days: number;

  if (viewMode === 'month') {
    // Get first day of current month, then offset by months
    startDate = new Date(today.getFullYear(), today.getMonth() + weekOffset, 1);
    // Get last day of that month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
    days = lastDay.getDate();
    // Adjust to start from Sunday of the first week
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    // Calculate total days to show (full weeks)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
    const endDayOfWeek = endOfMonth.getDay();
    const daysAfterMonth = endDayOfWeek === 6 ? 0 : 6 - endDayOfWeek;
    days = startDayOfWeek + lastDay.getDate() + daysAfterMonth;
  } else {
    const weeksToShow = viewMode === '1week' ? 1 : 2;
    startDate = getMondayOfWeek(today);
    startDate.setDate(startDate.getDate() + weekOffset * 7);
    days = weeksToShow * 7;
  }

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + days - 1);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startDatetime: startDate.toISOString(),
    endDatetime: endDate.toISOString(),
    days,
    displayMonth: viewMode === 'month' ? new Date(today.getFullYear(), today.getMonth() + weekOffset, 1) : null,
  };
}

// Generate array of dates for the calendar
function generateCalendarDates(startDate: string, days: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Format date for display
function formatDateHeader(date: Date): { day: string; date: string; fullDate: string; isToday: boolean; isWeekend: boolean } {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    isToday,
    isWeekend,
  };
}

// Check if a date falls within a range
function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const dateOnly = new Date(date.toISOString().split('T')[0] + 'T00:00:00');
  const start = new Date(startStr.split('T')[0] + 'T00:00:00');
  const end = new Date(endStr.split('T')[0] + 'T00:00:00');
  return dateOnly >= start && dateOnly <= end;
}

// Check if a date matches a specific date string
function isSameDate(date: Date, dateStr: string): boolean {
  const dateOnly = date.toISOString().split('T')[0];
  const compareDate = dateStr.split('T')[0];
  return dateOnly === compareDate;
}

export function MyHubPage() {
  const navigate = useNavigate();
  const { user, currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || '';
  const [viewMode, setViewMode] = useState<ViewMode>('2weeks');
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'schedule',
    data: null,
  });
  const dateRange = useMemo(() => getDateRange(viewMode, weekOffset), [viewMode, weekOffset]);
  const calendarDates = useMemo(
    () => generateCalendarDates(dateRange.startDate, dateRange.days),
    [dateRange]
  );

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

  // Active DOA Letters for the visible date range (by effective dates)
  const { data: doaLetters = [], isLoading: doasLoading } = useQuery({
    queryKey: ['my-doa-letters-range', user?.id, dateRange.startDate, dateRange.endDate],
    queryFn: () => doaService.getActiveLettersInRange(dateRange.startDate, dateRange.endDate),
    enabled: !!user?.id,
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

  const isLoading = scheduleLoading || bookingsLoading || doasLoading || assignmentsLoading || forecastsLoading;

  if (!user) return null;

  // Quick Actions
  const quickActions = [
    {
      title: 'Log PTO',
      description: 'Request time off',
      icon: Clock,
      color: 'bg-amber-500',
      hoverColor: 'hover:bg-amber-50',
      borderColor: 'border-amber-200',
      onClick: () => navigate('/schedule'),
    },
    {
      title: 'Book a Room',
      description: 'Reserve a desk or meeting room',
      icon: Building2,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-50',
      borderColor: 'border-blue-200',
      onClick: () => navigate('/hoteling'),
    },
    {
      title: 'Facilities',
      description: 'Office directory & check-in',
      icon: Building2,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-50',
      borderColor: 'border-teal-200',
      onClick: () => navigate('/facilities'),
    },
    {
      title: 'Update Resume',
      description: 'Keep your skills current',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-50',
      borderColor: 'border-purple-200',
      onClick: () => navigate('/resumes'),
    },
    {
      title: 'Create DOA',
      description: 'Set up delegation of authority',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-50',
      borderColor: 'border-green-200',
      onClick: () => navigate('/doa'),
    },
    {
      title: 'Update Assignments',
      description: 'Manage project staffing',
      icon: Briefcase,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-50',
      borderColor: 'border-indigo-200',
      onClick: () => navigate('/staffing'),
    },
    {
      title: 'View Schedule',
      description: 'Plan work locations',
      icon: Calendar,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-50',
      borderColor: 'border-teal-200',
      onClick: () => navigate('/schedule'),
    },
  ];

  // Navigation handlers
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setWeekOffset((prev) => prev - 1);
    } else {
      setWeekOffset((prev) => prev - (viewMode === '1week' ? 1 : 2));
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setWeekOffset((prev) => prev + 1);
    } else {
      setWeekOffset((prev) => prev + (viewMode === '1week' ? 1 : 2));
    }
  };

  const goToToday = () => {
    setWeekOffset(0);
  };

  // Helper to get schedules for a specific date (returns array for split days)
  const getSchedulesForDate = (date: Date) => {
    if (!dashboardData?.preferences) return [];
    return dashboardData.preferences.filter((p) => isSameDate(date, p.workDate));
  };

  // Helper to get bookings for a specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    return bookings.filter((b) => isSameDate(date, b.startDatetime));
  };

  // Helper to get DOA letters active on a specific date (by effective dates)
  const getDOAsForDate = (date: Date): DelegationOfAuthorityLetter[] => {
    return doaLetters.filter((d: DelegationOfAuthorityLetter) =>
      isDateInRange(date, d.effectiveStartDate, d.effectiveEndDate)
    );
  };

  // Helper to get assignments active on a specific date
  const getAssignmentsForDate = (date: Date): ProjectAssignment[] => {
    return assignments.filter((a) => {
      const endDate = a.endDate || '2099-12-31';
      return isDateInRange(date, a.startDate, endDate);
    });
  };

  // Helper to check if forecast applies to date (monthly forecasts)
  const getForecastsForDate = (date: Date): Forecast[] => {
    const dateMonth = date.getMonth() + 1;
    const dateYear = date.getFullYear();
    return forecasts.filter((f: Forecast) => f.month === dateMonth && f.year === dateYear);
  };

  // Modal handlers
  const openModal = (type: ModalType, data: unknown, date?: Date) => {
    setModalState({ isOpen: true, type, data, date });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: 'schedule', data: null });
  };

  // Generate email content for sharing schedule
  const generateEmailContent = () => {
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T00:00:00');
    const dateRangeStr = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    let emailBody = `Hi,\n\nI wanted to share my schedule for ${dateRangeStr}:\n\n`;

    // Group data by date
    calendarDates.forEach((date) => {
      const schedules = getSchedulesForDate(date);
      const dayBookings = getBookingsForDate(date);
      const dayDOAs = getDOAsForDate(date);
      const dayAssignments = getAssignmentsForDate(date);

      // Only include days with some activity
      if (schedules.length > 0 || dayBookings.length > 0 || dayDOAs.length > 0 || dayAssignments.length > 0) {
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        emailBody += `${dateStr}\n`;
        emailBody += '─'.repeat(40) + '\n';

        // Work Location
        if (schedules.length > 0) {
          schedules.forEach((schedule) => {
            const locationLabel = getLocationLabel(schedule.locationType);
            const portionLabel = getDayPortionLabel(schedule.dayPortion);
            let scheduleText = `  • Work Location: ${locationLabel}`;
            if (portionLabel !== 'Full Day') {
              scheduleText += ` (${portionLabel})`;
            }
            if (schedule.office?.name) {
              scheduleText += ` - ${schedule.office.name}`;
            }
            emailBody += scheduleText + '\n';
          });
        }

        // Bookings
        if (dayBookings.length > 0) {
          dayBookings.forEach((booking) => {
            const time = new Date(booking.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const spaceName = booking.space?.name || 'Reserved Space';
            const officeName = booking.space?.office?.name ? ` at ${booking.space.office.name}` : '';
            emailBody += `  • Desk Reservation: ${time} - ${spaceName}${officeName}\n`;
          });
        }

        // DOAs
        if (dayDOAs.length > 0) {
          dayDOAs.forEach((doa) => {
            const isDesignee = doa.designeeUserId === user?.id;
            if (isDesignee) {
              emailBody += `  • Acting Authority: Covering for ${doa.delegatorUser?.displayName || 'colleague'}\n`;
            } else {
              emailBody += `  • Out of Office: Authority delegated to ${doa.designeeUser?.displayName || 'designee'}\n`;
            }
          });
        }

        // Assignments
        if (dayAssignments.length > 0) {
          emailBody += `  • Active Project Assignments: ${dayAssignments.length}\n`;
        }

        emailBody += '\n';
      }
    });

    // Summary section
    emailBody += '─'.repeat(40) + '\n';
    emailBody += 'SUMMARY\n';
    emailBody += '─'.repeat(40) + '\n';

    const totalScheduleDays = calendarDates.filter((d) => getSchedulesForDate(d).length > 0).length;
    const totalBookings = bookings.length;
    const totalActiveDOAs = doaLetters.length;
    const totalAssignments = assignments.length;
    const totalForecastHours = forecasts.reduce((sum: number, f: Forecast) => sum + f.forecastedHours, 0);

    emailBody += `• Schedule Days: ${totalScheduleDays}\n`;
    emailBody += `• Desk Reservations: ${totalBookings}\n`;
    if (totalActiveDOAs > 0) {
      emailBody += `• Active DOA Letters: ${totalActiveDOAs}\n`;
    }
    if (totalAssignments > 0) {
      emailBody += `• Project Assignments: ${totalAssignments}\n`;
    }
    if (totalForecastHours > 0) {
      emailBody += `• Forecasted Hours: ${totalForecastHours}h\n`;
    }

    emailBody += '\nPlease let me know if you have any questions.\n\nBest regards,\n' + (user?.displayName || 'Team Member');

    return emailBody;
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`My Schedule - ${getDisplayTitle()}`);
    const body = encodeURIComponent(generateEmailContent());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  // Get display title for current view
  const getDisplayTitle = () => {
    if (viewMode === 'month' && dateRange.displayMonth) {
      return dateRange.displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T00:00:00');
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Check if current date range includes today
  const isTodayInRange = calendarDates.some((d) => d.toDateString() === new Date().toDateString());

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">myHub</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Welcome back, {user.displayName}!
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={action.onClick}
              className={`p-4 rounded-lg border ${action.borderColor} ${action.hoverColor} bg-white transition-all hover:shadow-md text-left`}
            >
              <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{action.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Navigation & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title={viewMode === 'month' ? 'Previous month' : 'Previous week(s)'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            disabled={isTodayInRange && weekOffset === 0}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              isTodayInRange && weekOffset === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title={viewMode === 'month' ? 'Next month' : 'Next week(s)'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="ml-2 text-lg font-semibold text-gray-800">{getDisplayTitle()}</span>
        </div>

        {/* View Mode Toggle and Share Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setViewMode('1week'); setWeekOffset(0); }}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                viewMode === '1week'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              1 Week
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('2weeks'); setWeekOffset(0); }}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                viewMode === '2weeks'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              2 Weeks
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('month'); setWeekOffset(0); }}
              className={`px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1 ${
                viewMode === 'month'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Month
            </button>
          </div>

          {/* Share via Email Button */}
          <button
            type="button"
            onClick={shareViaEmail}
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
            title="Share schedule via email"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500"></span> Schedule
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500"></span> Reservations
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500"></span> DOAs
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500"></span> Assignments
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-cyan-500"></span> Forecasts
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : viewMode === 'month' ? (
          // Month Calendar Grid View
          <MonthCalendarView
            calendarDates={calendarDates}
            getSchedulesForDate={getSchedulesForDate}
            getBookingsForDate={getBookingsForDate}
            getDOAsForDate={getDOAsForDate}
            getAssignmentsForDate={getAssignmentsForDate}
            getForecastsForDate={getForecastsForDate}
            displayMonth={dateRange.displayMonth}
            user={user}
            onItemClick={openModal}
          />
        ) : (
          // Week/2-Week Table View
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              {/* Date Headers */}
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-28 p-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky left-0 z-10">
                    Category
                  </th>
                  {calendarDates.map((date, idx) => {
                    const header = formatDateHeader(date);
                    return (
                      <th
                        key={idx}
                        className={`p-2 text-center min-w-[100px] ${
                          header.isToday
                            ? 'bg-emerald-50 border-x-2 border-emerald-400'
                            : header.isWeekend
                            ? 'bg-gray-100'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className={`text-xs font-medium ${header.isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                          {header.day}
                        </div>
                        <div className={`text-sm font-bold ${header.isToday ? 'text-emerald-800' : 'text-gray-700'}`}>
                          {header.date}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Schedule Row */}
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <Link to="/schedule" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Schedule
                    </Link>
                  </td>
                  {calendarDates.map((date, idx) => {
                    const schedules = getSchedulesForDate(date);
                    const header = formatDateHeader(date);
                    return (
                      <td
                        key={idx}
                        className={`p-1 align-top ${
                          header.isToday ? 'border-x-2 border-emerald-400 bg-emerald-50/50' : ''
                        }`}
                      >
                        {schedules.length > 0 ? (
                          <div className="space-y-1">
                            {schedules.map((schedule, sIdx) => {
                              const portionLabel = getDayPortionLabel(schedule.dayPortion);
                              return (
                                <button
                                  type="button"
                                  key={sIdx}
                                  onClick={() => openModal('schedule', schedule, date)}
                                  className={`w-full text-left px-2 py-1 rounded text-xs cursor-pointer hover:ring-2 hover:ring-blue-400 transition ${getScheduleColor(schedule.locationType)}`}
                                  title={`${getLocationLabel(schedule.locationType)}${portionLabel ? ` (${portionLabel})` : ''}${schedule.office?.name ? ` - ${schedule.office.name}` : ''}`}
                                >
                                  <div className="font-medium">
                                    {portionLabel && <span className="mr-1">{portionLabel}:</span>}
                                    {getLocationLabel(schedule.locationType)}
                                  </div>
                                  {schedule.office?.name && (
                                    <div className="text-[10px] opacity-80 truncate">{schedule.office.name}</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-center block">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Reservations Row */}
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <Link to="/hoteling" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Reservations
                    </Link>
                  </td>
                  {calendarDates.map((date, idx) => {
                    const dayBookings = getBookingsForDate(date);
                    const header = formatDateHeader(date);
                    return (
                      <td
                        key={idx}
                        className={`p-1 align-top ${
                          header.isToday ? 'border-x-2 border-emerald-400 bg-emerald-50/50' : ''
                        }`}
                      >
                        {dayBookings.length > 0 ? (
                          <div className="space-y-1">
                            {dayBookings.slice(0, 3).map((booking, bIdx) => (
                              <button
                                type="button"
                                key={bIdx}
                                onClick={() => openModal('booking', booking, date)}
                                className={`w-full text-left px-2 py-1 rounded text-xs cursor-pointer hover:ring-2 hover:ring-emerald-400 transition ${getBookingStatusColor(booking.status)}`}
                                title={`${booking.space?.name || 'Booking'} - ${new Date(booking.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                              >
                                <div className="font-medium">
                                  {new Date(booking.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </div>
                                {booking.space?.name && (
                                  <div className="text-[10px] opacity-80 truncate">{booking.space.name}</div>
                                )}
                              </button>
                            ))}
                            {dayBookings.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">+{dayBookings.length - 3} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-center block">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* DOAs Row */}
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <Link to="/doa" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      DOAs
                    </Link>
                  </td>
                  {calendarDates.map((date, idx) => {
                    const dayDOAs = getDOAsForDate(date);
                    const header = formatDateHeader(date);
                    return (
                      <td
                        key={idx}
                        className={`p-1 align-top ${
                          header.isToday ? 'border-x-2 border-emerald-400 bg-emerald-50/50' : ''
                        }`}
                      >
                        {dayDOAs.length > 0 ? (
                          <div className="space-y-1">
                            {dayDOAs.slice(0, 2).map((doa, dIdx) => {
                              const isDesignee = doa.designeeUserId === user?.id;
                              const displayText = isDesignee ? 'Acting' : (doa.subjectLine || 'DOA');
                              return (
                                <button
                                  type="button"
                                  key={dIdx}
                                  onClick={() => openModal('doa', doa, date)}
                                  className={`w-full text-left px-2 py-1 rounded text-xs cursor-pointer hover:ring-2 hover:ring-purple-400 transition ${
                                    isDesignee
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                  title={`${doa.subjectLine || 'DOA'} - ${isDesignee ? 'You are acting for ' + (doa.delegatorUser?.displayName || 'delegator') : 'Delegated to ' + (doa.designeeUser?.displayName || 'designee')}`}
                                >
                                  <div className="font-medium truncate">{displayText}</div>
                                  <div className="text-[10px] opacity-80 truncate">
                                    {isDesignee
                                      ? `for ${doa.delegatorUser?.displayName || 'delegator'}`
                                      : `to ${doa.designeeUser?.displayName || 'designee'}`}
                                  </div>
                                </button>
                              );
                            })}
                            {dayDOAs.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{dayDOAs.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-center block">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Assignments Row */}
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <Link to="/staffing" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-orange-600">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Assignments
                    </Link>
                  </td>
                  {calendarDates.map((date, idx) => {
                    const dayAssignments = getAssignmentsForDate(date);
                    const header = formatDateHeader(date);
                    return (
                      <td
                        key={idx}
                        className={`p-1 align-top ${
                          header.isToday ? 'border-x-2 border-emerald-400 bg-emerald-50/50' : ''
                        }`}
                      >
                        {dayAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {dayAssignments.slice(0, 2).map((assignment, aIdx) => (
                              <button
                                type="button"
                                key={aIdx}
                                onClick={() => openModal('assignment', assignment, date)}
                                className="w-full text-left px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 cursor-pointer hover:ring-2 hover:ring-orange-400 transition"
                                title={`Assignment - ${assignment.status === ProjectAssignmentStatus.Active ? 'Active' : 'Assigned'}`}
                              >
                                <div className="font-medium truncate">
                                  {assignment.status === ProjectAssignmentStatus.Active ? 'Active' : 'Assigned'}
                                </div>
                                {assignment.notes && (
                                  <div className="text-[10px] opacity-80 truncate">{assignment.notes}</div>
                                )}
                              </button>
                            ))}
                            {dayAssignments.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{dayAssignments.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-center block">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Forecasts Row */}
                <tr className="hover:bg-gray-50">
                  <td className="p-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <Link to="/forecast/my-forecasts" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-cyan-600">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      Forecasts
                    </Link>
                  </td>
                  {calendarDates.map((date, idx) => {
                    const dayForecasts = getForecastsForDate(date);
                    const header = formatDateHeader(date);
                    // Only show on first day of the month or first visible day
                    const isFirstOfMonth = date.getDate() === 1;
                    const isFirstVisible = idx === 0;
                    const showForecast = (isFirstOfMonth || isFirstVisible) && dayForecasts.length > 0;

                    return (
                      <td
                        key={idx}
                        className={`p-1 align-top ${
                          header.isToday ? 'border-x-2 border-emerald-400 bg-emerald-50/50' : ''
                        }`}
                      >
                        {showForecast ? (
                          <div className="space-y-1">
                            {dayForecasts.slice(0, 2).map((forecast, fIdx) => (
                              <button
                                type="button"
                                key={fIdx}
                                onClick={() => openModal('forecast', forecast, date)}
                                className={`w-full text-left px-2 py-1 rounded text-xs cursor-pointer hover:ring-2 hover:ring-cyan-400 transition ${getForecastStatusColor(forecast.status)}`}
                                title={`${forecast.projectName}: ${forecast.forecastedHours}h - ${forecast.statusName}`}
                              >
                                <div className="font-medium">{forecast.forecastedHours}h</div>
                                <div className="text-[10px] opacity-80 truncate">{forecast.projectName}</div>
                              </button>
                            ))}
                            {dayForecasts.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{dayForecasts.length - 2} more</div>
                            )}
                          </div>
                        ) : dayForecasts.length > 0 ? (
                          <span className="text-cyan-300 text-center block">•</span>
                        ) : (
                          <span className="text-gray-300 text-center block">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <QuickStat
          label="Schedule Days"
          value={(dashboardData?.stats?.officeDays ?? 0) + (dashboardData?.stats?.remoteDays ?? 0)}
          link="/schedule"
          color="text-blue-600"
        />
        <QuickStat
          label="Reservations"
          value={bookings.filter((b) => b.status === BookingStatus.Reserved).length}
          link="/hoteling"
          color="text-emerald-600"
        />
        <QuickStat
          label="Active DOAs"
          value={doaLetters.length}
          link="/doa"
          color="text-purple-600"
        />
        <QuickStat
          label="Assignments"
          value={assignments.length}
          link="/staffing"
          color="text-orange-600"
        />
        <QuickStat
          label="Forecast Hours"
          value={forecasts.reduce((sum: number, f: Forecast) => sum + f.forecastedHours, 0)}
          link="/forecast/my-forecasts"
          color="text-cyan-600"
          suffix="hrs"
        />
      </div>

      {/* Expiring Certifications Widget */}
      <div className="mt-6">
        <ExpiringCertificationsWidget />
      </div>

      {/* Detail Modal */}
      <MyHubDetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        data={modalState.data}
        date={modalState.date}
      />
    </div>
  );
}

// Month Calendar View Component
interface MonthCalendarViewProps {
  calendarDates: Date[];
  getSchedulesForDate: (date: Date) => { locationType: number; dayPortion: number; office?: { name: string } }[];
  getBookingsForDate: (date: Date) => Booking[];
  getDOAsForDate: (date: Date) => DelegationOfAuthorityLetter[];
  getAssignmentsForDate: (date: Date) => ProjectAssignment[];
  getForecastsForDate: (date: Date) => Forecast[];
  displayMonth: Date | null;
  user: { id: string; displayName: string } | null;
  onItemClick: (type: ModalType, data: unknown, date: Date) => void;
}

function MonthCalendarView({
  calendarDates,
  getSchedulesForDate,
  getBookingsForDate,
  getDOAsForDate,
  getAssignmentsForDate,
  getForecastsForDate,
  displayMonth,
  user,
  onItemClick,
}: MonthCalendarViewProps) {
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDates.length; i += 7) {
    weeks.push(calendarDates.slice(i, i + 7));
  }

  const isCurrentMonth = (date: Date) => {
    if (!displayMonth) return true;
    return date.getMonth() === displayMonth.getMonth();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <th key={day} className="p-2 text-center text-xs font-medium text-gray-500 uppercase bg-gray-50 w-[14.28%]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => (
            <tr key={weekIdx} className="border-b border-gray-100">
              {week.map((date, dayIdx) => {
                const header = formatDateHeader(date);
                const schedules = getSchedulesForDate(date);
                const dayBookings = getBookingsForDate(date);
                const dayDOAs = getDOAsForDate(date);
                const dayAssignments = getAssignmentsForDate(date);
                const dayForecasts = getForecastsForDate(date);
                const inCurrentMonth = isCurrentMonth(date);

                return (
                  <td
                    key={dayIdx}
                    className={`p-1 align-top min-h-[120px] h-28 ${
                      header.isToday
                        ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-400'
                        : header.isWeekend
                        ? 'bg-gray-50'
                        : ''
                    } ${!inCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className="flex flex-col h-full">
                      <div className={`text-sm font-bold mb-1 ${header.isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {/* Schedule */}
                        {schedules.slice(0, 2).map((schedule, sIdx) => {
                          const portionLabel = getDayPortionLabel(schedule.dayPortion);
                          return (
                            <button
                              type="button"
                              key={`s-${sIdx}`}
                              onClick={() => onItemClick('schedule', schedule, date)}
                              className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:ring-1 hover:ring-blue-400 transition ${getScheduleColor(schedule.locationType)}`}
                              title={`${getLocationLabel(schedule.locationType)}${portionLabel ? ` (${portionLabel})` : ''}`}
                            >
                              {portionLabel ? `${portionLabel}: ` : ''}{getLocationShort(schedule.locationType)}
                            </button>
                          );
                        })}
                        {/* Bookings */}
                        {dayBookings.slice(0, 1).map((booking, bIdx) => (
                          <button
                            type="button"
                            key={`b-${bIdx}`}
                            onClick={() => onItemClick('booking', booking, date)}
                            className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:ring-1 hover:ring-blue-400 transition ${getBookingStatusColor(booking.status)}`}
                          >
                            {new Date(booking.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric' })}
                          </button>
                        ))}
                        {/* DOAs */}
                        {dayDOAs.slice(0, 1).map((doa, dIdx) => {
                          const isDesignee = doa.designeeUserId === user?.id;
                          const displayText = isDesignee ? 'Acting' : (doa.subjectLine || 'DOA');
                          return (
                            <button
                              type="button"
                              key={`d-${dIdx}`}
                              onClick={() => onItemClick('doa', doa, date)}
                              className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:ring-1 hover:ring-blue-400 transition ${
                                isDesignee ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                              }`}
                              title={doa.subjectLine || 'DOA'}
                            >
                              {displayText}
                            </button>
                          );
                        })}
                        {/* Assignments */}
                        {dayAssignments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onItemClick('assignment', dayAssignments[0], date)}
                            className="w-full text-left px-1 py-0.5 rounded text-[10px] truncate bg-orange-100 text-orange-800 cursor-pointer hover:ring-1 hover:ring-blue-400 transition"
                          >
                            {dayAssignments.length} proj
                          </button>
                        )}
                        {/* Forecasts - show only if first of month */}
                        {date.getDate() === 1 && dayForecasts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onItemClick('forecast', dayForecasts[0], date)}
                            className="w-full text-left px-1 py-0.5 rounded text-[10px] truncate bg-cyan-100 text-cyan-800 cursor-pointer hover:ring-1 hover:ring-blue-400 transition"
                          >
                            {dayForecasts.reduce((sum, f) => sum + f.forecastedHours, 0)}h
                          </button>
                        )}
                        {/* More indicator */}
                        {(dayBookings.length > 1 || dayDOAs.length > 1) && (
                          <div className="text-[9px] text-gray-500 text-center">
                            +{dayBookings.length + dayDOAs.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: number;
  link: string;
  color: string;
  suffix?: string;
}

function QuickStat({ label, value, link, color, suffix }: QuickStatProps) {
  return (
    <Link
      to={link}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition"
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${color}`}>
        {value.toLocaleString()}{suffix ? ` ${suffix}` : ''}
      </div>
    </Link>
  );
}

// Helper functions - WorkLocationType enum: Remote=0, RemotePlus=1, ClientSite=2, OfficeNoReservation=3, OfficeWithReservation=4, PTO=5, Travel=6
function getScheduleColor(locationType: number): string {
  switch (locationType) {
    case 0: // Remote
    case 1: // RemotePlus
      return 'bg-blue-100 text-blue-800';
    case 2: // ClientSite
      return 'bg-orange-100 text-orange-800';
    case 3: // OfficeNoReservation
    case 4: // OfficeWithReservation
      return 'bg-green-100 text-green-800';
    case 5: // PTO
      return 'bg-amber-100 text-amber-800';
    case 6: // Travel
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getLocationShort(locationType: number): string {
  switch (locationType) {
    case 0: return 'Remote';
    case 1: return 'Remote+';
    case 2: return 'Client';
    case 3: return 'Office';
    case 4: return 'Office';
    case 5: return 'PTO';
    case 6: return 'Travel';
    default: return '-';
  }
}

function getLocationLabel(locationType: number): string {
  switch (locationType) {
    case 0: return 'Remote';
    case 1: return 'Remote Plus';
    case 2: return 'Client Site';
    case 3: return 'In Office';
    case 4: return 'In Office (Reserved)';
    case 5: return 'PTO';
    case 6: return 'Travel';
    default: return 'Unknown';
  }
}

// DayPortion enum: FullDay=0, AM=1, PM=2
function getDayPortionLabel(dayPortion: number): string {
  switch (dayPortion) {
    case 1: return 'AM';
    case 2: return 'PM';
    default: return '';
  }
}

function getBookingStatusColor(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.Reserved:
      return 'bg-emerald-100 text-emerald-800';
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
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default MyHubPage;

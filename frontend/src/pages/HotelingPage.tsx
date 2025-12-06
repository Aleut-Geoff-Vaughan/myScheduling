import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal } from '../components/ui';
import { useBookings, useSpaces, useOffices } from '../hooks/useBookings';
import { useAuthStore } from '../stores/authStore';
import { ViewSelector } from '../components/ViewSelector';
import { ShareBookingsModal } from '../components/ShareBookingsModal';
import type { Booking } from '../types/api';
import { BookingStatus, SpaceType } from '../types/api';
import { BookingModal } from '../components/BookingModal';
import { getMondayOfWeek } from '../utils/dateUtils';

export function HotelingPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>();
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // View mode state (same as MySchedulePage)
  const [selectedView, setSelectedView] = useState<'current-week' | 'two-weeks' | 'month'>('two-weeks');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [daysPerWeek, setDaysPerWeek] = useState<5 | 7>(5);

  // Calculate date range based on selected view
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
      startDatetime: startDate.toISOString().split('T')[0] + 'T00:00:00',
      endDatetime: endDate.toISOString().split('T')[0] + 'T23:59:59',
    };
  }, [selectedView, referenceDate]);

  const { data: bookings = [], isLoading, error } = useBookings({
    startDate: dateRange.startDatetime,
    endDate: dateRange.endDatetime,
  });

  const { data: offices = [] } = useOffices();
  const { data: allSpaces = [] } = useSpaces();

  // Navigation handlers
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

  const exportToCSV = () => {
    const headers = ['Booking ID', 'User', 'Space', 'Date', 'Start Time', 'End Time', 'Status'];
    const rows = filteredBookings.map(booking => [
      booking.id,
      booking.user?.displayName || booking.userId,
      booking.space?.name || booking.spaceId,
      new Date(booking.startDatetime).toLocaleDateString(),
      new Date(booking.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      booking.isPermanent ? 'Permanent' : booking.endDatetime ? new Date(booking.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      getStatusLabel(booking.status)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.Reserved:
        return 'Confirmed';
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
  };

  const getStatusVariant = (status: BookingStatus): 'success' | 'warning' | 'default' | 'info' | 'danger' => {
    switch (status) {
      case BookingStatus.CheckedIn:
        return 'success';
      case BookingStatus.Reserved:
        return 'info';
      case BookingStatus.Completed:
        return 'default';
      case BookingStatus.Cancelled:
      case BookingStatus.NoShow:
        return 'danger';
      default:
        return 'warning';
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {new Date(booking.startDatetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      )
    },
    {
      key: 'user',
      header: 'User',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{booking.user?.displayName || booking.userId.substring(0, 8) + '...'}</div>
          {booking.user?.email && <div className="text-gray-500 text-xs">{booking.user.email}</div>}
        </div>
      )
    },
    {
      key: 'space',
      header: 'Space',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{booking.space?.name || booking.spaceId.substring(0, 8) + '...'}</div>
          {booking.space?.type !== undefined && (
            <div className="text-gray-500 text-xs">
              {booking.space.type === SpaceType.Desk ? 'Desk' : booking.space.type === SpaceType.ConferenceRoom ? 'Conference Room' : 'Other'}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'time',
      header: 'Time',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div>{new Date(booking.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-gray-500">
            {booking.isPermanent ? (
              <span className="text-blue-600 font-medium">Permanent</span>
            ) : booking.endDatetime ? (
              `to ${new Date(booking.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            ) : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking: Booking) => (
        <StatusBadge
          status={getStatusLabel(booking.status)}
          variant={getStatusVariant(booking.status)}
        />
      )
    }
  ];

  const filteredBookings = bookings.filter(booking =>
    booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.spaceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (booking.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (booking.space?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(b => b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn).length;
    const checkedIn = bookings.filter(b => b.status === BookingStatus.CheckedIn).length;
    const completed = bookings.filter(b => b.status === BookingStatus.Completed).length;

    return { total, active, checkedIn, completed };
  }, [bookings]);

  // Group bookings by date for calendar view
  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      const dateKey = booking.startDatetime.split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(booking);
    });
    return grouped;
  }, [bookings]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const monday = getMondayOfWeek(referenceDate);

    if (selectedView === 'current-week') {
      for (let i = 0; i < (daysPerWeek === 5 ? 5 : 7); i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
      }
    } else if (selectedView === 'two-weeks') {
      for (let i = 0; i < (daysPerWeek === 5 ? 10 : 14); i++) {
        const day = new Date(monday);
        if (daysPerWeek === 5) {
          // Skip weekends
          const weekOffset = Math.floor(i / 5);
          const dayOffset = i % 5;
          day.setDate(monday.getDate() + weekOffset * 7 + dayOffset);
        } else {
          day.setDate(monday.getDate() + i);
        }
        days.push(day);
      }
    } else {
      // Month view
      const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
    }

    return days;
  }, [selectedView, referenceDate, daysPerWeek]);

  const formatPeriodLabel = () => {
    if (selectedView === 'month') {
      return referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const monday = getMondayOfWeek(referenceDate);
    const endDate = new Date(monday);
    endDate.setDate(monday.getDate() + (selectedView === 'current-week' ? 6 : 13));
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Bookings</div>
              <div className="text-gray-600">{error.message}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Office Hoteling</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          {selectedView === 'current-week' && 'View and manage desk reservations for this week.'}
          {selectedView === 'two-weeks' && 'View and manage desk reservations for the next two weeks.'}
          {selectedView === 'month' && 'View and manage desk reservations for the entire month.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Bookings</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-0.5 sm:mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-500 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 mt-0.5 sm:mt-1">{stats.active}</p>
            </div>
            <div className="bg-green-500 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Checked In</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-0.5 sm:mt-1">{stats.checkedIn}</p>
            </div>
            <div className="bg-purple-500 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-600 mt-0.5 sm:mt-1">{stats.completed}</p>
            </div>
            <div className="bg-gray-500 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="mb-6">
        <CardHeader
          title="Reservations Calendar"
          subtitle={`${formatPeriodLabel()} - ${filteredBookings.length} reservations`}
        />
        <CardBody>
          {/* View Selector and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <ViewSelector
              selectedView={selectedView}
              onViewChange={setSelectedView}
              daysPerWeek={daysPerWeek}
              onDaysPerWeekChange={setDaysPerWeek}
            />
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
              <button
                type="button"
                onClick={exportToCSV}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md sm:rounded-lg hover:bg-green-100 hover:border-green-400 transition"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFloorPlan(true)}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-md sm:rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="hidden sm:inline">Floor Plan</span>
              </button>
            </div>
          </div>

          {/* Date Navigation */}
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

          {/* Calendar Grid */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid gap-2 ${selectedView === 'month' ? 'grid-cols-7' : daysPerWeek === 5 ? 'grid-cols-5' : 'grid-cols-7'}`}>
              {/* Day Headers */}
              {(selectedView === 'month' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] :
                daysPerWeek === 5 ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              ).map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2 border-b border-gray-200">
                  {day}
                </div>
              ))}

              {/* Month view: Add empty cells for days before the first of the month */}
              {selectedView === 'month' && (() => {
                const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
                const emptyCells = firstDay.getDay();
                return Array.from({ length: emptyCells }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] bg-gray-50 rounded"></div>
                ));
              })()}

              {/* Calendar Days */}
              {calendarDays.map((day) => {
                const dateKey = day.toISOString().split('T')[0];
                const dayBookings = bookingsByDate.get(dateKey) || [];
                const isToday = dateKey === new Date().toISOString().split('T')[0];
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[80px] sm:min-h-[100px] rounded-lg border p-1.5 sm:p-2 cursor-pointer transition hover:shadow-md ${
                      isToday ? 'border-blue-500 border-2 bg-blue-50' :
                      isWeekend && selectedView === 'month' ? 'border-gray-200 bg-gray-50' :
                      'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setIsModalOpen(true);
                    }}
                  >
                    <div className={`text-xs sm:text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {day.getDate()}
                      {selectedView !== 'month' && (
                        <span className="text-gray-400 ml-1 font-normal">
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${
                            booking.status === BookingStatus.CheckedIn ? 'bg-green-100 text-green-800' :
                            booking.status === BookingStatus.Reserved ? 'bg-blue-100 text-blue-800' :
                            booking.status === BookingStatus.Completed ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-800'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setIsModalOpen(true);
                          }}
                        >
                          {booking.space?.name || 'Space'}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
              <span className="text-xs text-gray-600">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span className="text-xs text-gray-600">Checked In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
              <span className="text-xs text-gray-600">Cancelled/No Show</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Search and Table */}
      <Card className="mb-6">
        <CardHeader
          title="Bookings List"
          subtitle="Search and manage all reservations"
        />
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by user, space, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              + New Booking
            </Button>
          </div>
          <Table
            data={filteredBookings}
            columns={columns}
            onRowClick={(booking) => {
              setSelectedBooking(booking);
              setIsModalOpen(true);
            }}
            emptyMessage={isLoading ? "Loading bookings..." : "No bookings found for this period"}
          />
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover onClick={() => setIsModalOpen(true)}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Desk</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve a workspace</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => setIsModalOpen(true)}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Room</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve conference room</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => setShowFloorPlan(true)}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h3 className="font-semibold text-lg">View Floor Plan</h3>
            <p className="text-sm text-gray-600 mt-1">See space availability</p>
          </CardBody>
        </Card>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(undefined);
        }}
        booking={selectedBooking}
        mode={selectedBooking ? 'edit' : 'create'}
      />

      {/* Share Modal */}
      <ShareBookingsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        bookings={filteredBookings}
        user={user || undefined}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        spaces={allSpaces}
      />

      {/* Floor Plan Modal */}
      <Modal
        isOpen={showFloorPlan}
        onClose={() => setShowFloorPlan(false)}
        title="Office Floor Plan"
        size="xl"
      >
        <div className="space-y-6">
          {/* Office selector */}
          {offices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Office
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                {offices.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name}{office.city ? ` - ${office.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Floor Plan Visualization */}
          <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="grid grid-cols-6 gap-4">
              {/* Legend */}
              <div className="col-span-6 flex gap-4 mb-4 pb-4 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm">Unavailable</span>
                </div>
              </div>

              {/* Spaces Grid */}
              {allSpaces.map((space) => {
                const isBooked = bookings.some(
                  b => b.spaceId === space.id &&
                  (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn)
                );

                const bgColor = !space.isAvailable ? 'bg-gray-400' :
                               isBooked ? 'bg-red-500' :
                               'bg-green-500';

                const icon = space.type === SpaceType.Desk ? '🪑' :
                            space.type === SpaceType.ConferenceRoom ? '🏢' :
                            '📦';

                return (
                  <div
                    key={space.id}
                    className={`${bgColor} rounded-lg p-4 flex flex-col items-center justify-center text-white cursor-pointer hover:opacity-80 transition relative`}
                    title={`${space.name} - ${space.type === SpaceType.Desk ? 'Desk' : space.type === SpaceType.ConferenceRoom ? 'Conference Room' : 'Other'}`}
                    onClick={() => {
                      if (space.isAvailable && !isBooked) {
                        setShowFloorPlan(false);
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xs font-medium text-center truncate w-full">
                      {space.name}
                    </div>
                    {space.capacity && (
                      <div className="text-xs opacity-90">
                        Cap: {space.capacity}
                      </div>
                    )}
                    {isBooked && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allSpaces.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No spaces available</p>
                <p className="text-sm mt-2">Add offices and spaces to see the floor plan</p>
              </div>
            )}
          </div>

          {/* Space Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {allSpaces.filter(s => s.isAvailable && !bookings.some(b => b.spaceId === s.id && (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn))).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Available Now</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {allSpaces.filter(s => bookings.some(b => b.spaceId === s.id && (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn))).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Currently Booked</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {allSpaces.filter(s => !s.isAvailable).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Unavailable</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowFloorPlan(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            setShowFloorPlan(false);
            setIsModalOpen(true);
          }}>
            Book a Space
          </Button>
        </div>
      </Modal>
    </div>
  );
}

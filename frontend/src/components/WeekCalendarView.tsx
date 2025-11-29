import { useMemo } from 'react';
import { WorkLocationType, type WorkLocationPreference } from '../types/api';
import { isToday, isPast, getMondayOfWeek } from '../utils/dateUtils';

interface WeekCalendarViewProps {
  startDate: Date;
  preferences: WorkLocationPreference[];
  onDayClick: (date: Date) => void;
  userId: string;
  weeksToShow?: 1 | 2; // Optional: show 1 or 2 weeks (default 2)
  daysPerWeek?: 5 | 7; // Optional: show 5 days (Mon-Fri) or 7 days (default 5)
}

export function WeekCalendarView({
  startDate,
  preferences,
  onDayClick,
  userId,
  weeksToShow = 2,
  daysPerWeek = 5
}: WeekCalendarViewProps) {
  // Generate days based on weeks and days per week setting
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const monday = getMondayOfWeek(startDate);

    for (let week = 0; week < weeksToShow; week++) {
      const weekStart = new Date(monday);
      weekStart.setDate(monday.getDate() + (week * 7));

      for (let day = 0; day < daysPerWeek; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        days.push(date);
      }
    }

    return days;
  }, [startDate, weeksToShow, daysPerWeek]);

  const getPreferenceForDate = (date: Date): WorkLocationPreference | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return preferences.find(p => p.workDate === dateStr && p.userId === userId);
  };

  const getLocationTypeLabel = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'Remote';
      case WorkLocationType.RemotePlus:
        return 'Remote+';
      case WorkLocationType.ClientSite:
        return 'Client Site';
      case WorkLocationType.OfficeNoReservation:
        return 'Office';
      case WorkLocationType.OfficeWithReservation:
        return 'Office (Reserved)';
      case WorkLocationType.PTO:
        return 'PTO';
      case WorkLocationType.Travel:
        return 'Travel';
      default:
        return 'Unknown';
    }
  };

  const getLocationTypeColor = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case WorkLocationType.RemotePlus:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case WorkLocationType.ClientSite:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case WorkLocationType.OfficeNoReservation:
        return 'bg-green-100 text-green-800 border-green-300';
      case WorkLocationType.OfficeWithReservation:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case WorkLocationType.PTO:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case WorkLocationType.Travel:
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLocationIcon = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
      case WorkLocationType.RemotePlus:
        return '🏠';
      case WorkLocationType.ClientSite:
        return '🏢';
      case WorkLocationType.OfficeNoReservation:
      case WorkLocationType.OfficeWithReservation:
        return '🏛️';
      case WorkLocationType.PTO:
        return '🌴';
      case WorkLocationType.Travel:
        return '✈️';
      default:
        return '📍';
    }
  };

  // Check if a date is a weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Get short label for mobile
  const getLocationTypeShortLabel = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'Remote';
      case WorkLocationType.RemotePlus:
        return 'Remote+';
      case WorkLocationType.ClientSite:
        return 'Client';
      case WorkLocationType.OfficeNoReservation:
        return 'Office';
      case WorkLocationType.OfficeWithReservation:
        return 'Office C...';
      case WorkLocationType.PTO:
        return 'PTO';
      case WorkLocationType.Travel:
        return 'Travel';
      default:
        return '?';
    }
  };

  // Render a single day card
  const renderDayCard = (date: Date) => {
    const preference = getPreferenceForDate(date);
    const today = isToday(date);
    const past = isPast(date);
    const weekend = isWeekend(date);

    return (
      <button
        key={date.toISOString()}
        onClick={() => onDayClick(date)}
        className={`
          relative p-2 sm:p-4 rounded-lg border-2 transition-all min-w-0
          ${today ? 'ring-2 ring-primary-500 ring-offset-1 sm:ring-offset-2' : ''}
          ${past ? 'opacity-60' : ''}
          ${weekend && !preference ? 'bg-gray-50 border-gray-200' : ''}
          ${preference
            ? getLocationTypeColor(preference.locationType)
            : weekend
              ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }
          hover:shadow-md cursor-pointer
        `}
      >
        {/* Day Header */}
        <div className="text-center mb-1 sm:mb-2">
          <div className={`text-[10px] sm:text-xs font-medium ${weekend ? 'text-gray-500' : 'text-gray-600'}`}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className={`text-base sm:text-lg font-bold ${today ? 'text-primary-600' : weekend ? 'text-gray-600' : 'text-gray-900'}`}>
            {date.getDate()}
          </div>
        </div>

        {/* Location Info */}
        {preference ? (
          <div className="text-center">
            <div className="text-lg sm:text-2xl mb-0.5 sm:mb-1">
              {getLocationIcon(preference.locationType)}
            </div>
            <div className="text-[9px] sm:text-xs font-semibold truncate">
              <span className="hidden sm:inline">{getLocationTypeLabel(preference.locationType)}</span>
              <span className="sm:hidden">{getLocationTypeShortLabel(preference.locationType)}</span>
            </div>
            {preference.remoteLocation && (
              <div className="text-[9px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 truncate hidden sm:block">
                {preference.remoteLocation}
              </div>
            )}
            {preference.office && (
              <div className="text-[9px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 truncate hidden sm:block">
                {preference.office.name}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-lg sm:text-2xl mb-0.5 sm:mb-1">{weekend ? '📅' : '❓'}</div>
            <div className="text-[9px] sm:text-xs">{weekend ? 'Weekend' : 'Not set'}</div>
          </div>
        )}

        {/* Today indicator */}
        {today && (
          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full"></div>
        )}
      </button>
    );
  };

  // Responsive grid columns - 5 columns on mobile fits tight, use gap to make it work
  const gridCols = daysPerWeek === 7
    ? 'grid-cols-7'
    : 'grid-cols-5';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Week 1 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
          {weeksToShow === 1 ? 'This Week' : 'Week 1'}
        </h3>
        <div className={`grid ${gridCols} gap-1.5 sm:gap-3`}>
          {weekDays.slice(0, daysPerWeek).map(renderDayCard)}
        </div>
      </div>

      {/* Week 2 - Only show if weeksToShow === 2 */}
      {weeksToShow === 2 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
            Week 2
          </h3>
          <div className={`grid ${gridCols} gap-1.5 sm:gap-3`}>
            {weekDays.slice(daysPerWeek, daysPerWeek * 2).map(renderDayCard)}
          </div>
        </div>
      )}

      {/* Legend - Compact on mobile */}
      <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span>🏠</span>
            <span className="hidden sm:inline">Remote / Remote+</span>
            <span className="sm:hidden">Remote</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏛️</span>
            <span>Office</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏢</span>
            <span className="hidden sm:inline">Client Site</span>
            <span className="sm:hidden">Client</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌴</span>
            <span>PTO</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✈️</span>
            <span>Travel</span>
          </div>
          <div className="flex items-center gap-1">
            <span>❓</span>
            <span className="hidden sm:inline">Not Set</span>
            <span className="sm:hidden">?</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

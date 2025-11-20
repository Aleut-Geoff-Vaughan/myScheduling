import { useMemo } from 'react';
import { WorkLocationType, type WorkLocationPreference } from '../types/api';

interface WeekCalendarViewProps {
  startDate: Date;
  preferences: WorkLocationPreference[];
  onDayClick: (date: Date) => void;
  personId: string;
}

export function WeekCalendarView({ startDate, preferences, onDayClick, personId }: WeekCalendarViewProps) {
  const twoWeeks = useMemo(() => {
    const days = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    // Get Monday of the current week
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    current.setDate(diff);

    // Generate 10 weekdays (M-F for 2 weeks)
    for (let week = 0; week < 2; week++) {
      for (let day = 0; day < 5; day++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      // Skip weekend
      current.setDate(current.getDate() + 2);
    }

    return days;
  }, [startDate]);

  const getPreferenceForDate = (date: Date): WorkLocationPreference | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return preferences.find(p => p.workDate === dateStr && p.personId === personId);
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
      default:
        return '📍';
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="space-y-6">
      {/* Week 1 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Current Week
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {twoWeeks.slice(0, 5).map((date) => {
            const preference = getPreferenceForDate(date);
            const today = isToday(date);
            const past = isPast(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => onDayClick(date)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${today ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                  ${past ? 'opacity-60' : ''}
                  ${preference
                    ? getLocationTypeColor(preference.locationType)
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                  hover:shadow-md cursor-pointer
                `}
              >
                {/* Day Header */}
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-600">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${today ? 'text-primary-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                </div>

                {/* Location Info */}
                {preference ? (
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {getLocationIcon(preference.locationType)}
                    </div>
                    <div className="text-xs font-semibold">
                      {getLocationTypeLabel(preference.locationType)}
                    </div>
                    {preference.remoteLocation && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {preference.remoteLocation}
                      </div>
                    )}
                    {preference.office && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {preference.office.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-2xl mb-1">❓</div>
                    <div className="text-xs">Not set</div>
                  </div>
                )}

                {/* Today indicator */}
                {today && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Week 2 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Next Week
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {twoWeeks.slice(5, 10).map((date) => {
            const preference = getPreferenceForDate(date);
            const today = isToday(date);
            const past = isPast(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => onDayClick(date)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${today ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                  ${past ? 'opacity-60' : ''}
                  ${preference
                    ? getLocationTypeColor(preference.locationType)
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                  hover:shadow-md cursor-pointer
                `}
              >
                {/* Day Header */}
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-600">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${today ? 'text-primary-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                </div>

                {/* Location Info */}
                {preference ? (
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {getLocationIcon(preference.locationType)}
                    </div>
                    <div className="text-xs font-semibold">
                      {getLocationTypeLabel(preference.locationType)}
                    </div>
                    {preference.remoteLocation && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {preference.remoteLocation}
                      </div>
                    )}
                    {preference.office && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {preference.office.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-2xl mb-1">❓</div>
                    <div className="text-xs">Not set</div>
                  </div>
                )}

                {/* Today indicator */}
                {today && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>🏠</span>
            <span>Remote / Remote+</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span>Client Site</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏛️</span>
            <span>Office</span>
          </div>
          <div className="flex items-center gap-2">
            <span>❓</span>
            <span>Not Set</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

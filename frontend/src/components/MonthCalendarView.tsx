import { useMemo } from 'react';
import { WorkLocationType, DayPortion, type WorkLocationPreference } from '../types/api';
import { getMonthWeekdays, getMonthYear, isToday, isPast } from '../utils/dateUtils';

interface MonthCalendarViewProps {
  referenceDate: Date;
  preferences: WorkLocationPreference[];
  onDayClick: (date: Date) => void;
  userId: string;
}

export function MonthCalendarView({ referenceDate, preferences, onDayClick, userId }: MonthCalendarViewProps) {
  const monthDays = useMemo(() => getMonthWeekdays(referenceDate), [referenceDate]);
  const monthName = useMemo(() => getMonthYear(referenceDate), [referenceDate]);

  // Get all preferences for a date (could be 1 FullDay, or 2 AM/PM, or just 1 AM or PM)
  const getPreferencesForDate = (date: Date): { am?: WorkLocationPreference; pm?: WorkLocationPreference; fullDay?: WorkLocationPreference } => {
    const dateStr = date.toISOString().split('T')[0];
    const dayPrefs = preferences.filter(p => p.workDate === dateStr && p.userId === userId);

    const fullDay = dayPrefs.find(p => p.dayPortion === DayPortion.FullDay);
    const am = dayPrefs.find(p => p.dayPortion === DayPortion.AM);
    const pm = dayPrefs.find(p => p.dayPortion === DayPortion.PM);

    return { am, pm, fullDay };
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

  // Group days by week for better layout
  const weeks: Date[][] = [];
  for (let i = 0; i < monthDays.length; i += 5) {
    weeks.push(monthDays.slice(i, i + 5));
  }

  return (
    <div className="space-y-6">
      {/* Month Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - One Week Per Row */}
      <div className="space-y-3">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-5 gap-2">
            {week.map((date) => {
              const { am, pm, fullDay } = getPreferencesForDate(date);
              const isSplitDay = am || pm;
              const today = isToday(date);
              const past = isPast(date);

              // Determine card background - for split days, use neutral background
              const getCardBackground = () => {
                if (isSplitDay) return 'bg-white border-gray-300';
                if (fullDay) return getLocationTypeColor(fullDay.locationType);
                return 'bg-white border-gray-200 hover:border-gray-300';
              };

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => onDayClick(date)}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all min-h-[100px]
                    ${today ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                    ${past ? 'opacity-60' : ''}
                    ${getCardBackground()}
                    hover:shadow-md cursor-pointer
                  `}
                >
                  {/* Day Number */}
                  <div className="text-left mb-2">
                    <div className={`text-sm font-bold ${today ? 'text-primary-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Location Info */}
                  {isSplitDay ? (
                    /* Split Day View - AM on top, PM on bottom */
                    <div className="flex flex-col gap-1">
                      {am ? (
                        <div className={`rounded p-1 ${getLocationTypeColor(am.locationType)}`}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm">{getLocationIcon(am.locationType)}</span>
                            <span className="text-[10px] font-bold px-1 rounded bg-amber-500 text-white">AM</span>
                          </div>
                          <div className="text-[10px] font-medium text-center truncate">
                            {getLocationTypeLabel(am.locationType)}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded p-1 bg-gray-100 text-center">
                          <div className="text-[10px] text-gray-400">AM not set</div>
                        </div>
                      )}
                      {pm ? (
                        <div className={`rounded p-1 ${getLocationTypeColor(pm.locationType)}`}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm">{getLocationIcon(pm.locationType)}</span>
                            <span className="text-[10px] font-bold px-1 rounded bg-indigo-500 text-white">PM</span>
                          </div>
                          <div className="text-[10px] font-medium text-center truncate">
                            {getLocationTypeLabel(pm.locationType)}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded p-1 bg-gray-100 text-center">
                          <div className="text-[10px] text-gray-400">PM not set</div>
                        </div>
                      )}
                    </div>
                  ) : fullDay ? (
                    /* Full Day View */
                    <div className="text-center">
                      <div className="text-xl mb-1">
                        {getLocationIcon(fullDay.locationType)}
                      </div>
                      <div className="text-xs font-semibold">
                        {getLocationTypeLabel(fullDay.locationType)}
                      </div>
                      {/* Show office name for office locations */}
                      {fullDay.office && (
                        <div className="text-xs text-gray-600 mt-1 truncate" title={fullDay.office.name}>
                          {fullDay.office.name}
                        </div>
                      )}
                      {/* Show remote location for Remote+ */}
                      {fullDay.remoteLocation && (
                        <div className="text-xs text-gray-600 mt-1 truncate" title={fullDay.remoteLocation}>
                          {fullDay.remoteLocation}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No Preference Set */
                    <div className="text-center text-gray-400">
                      <div className="text-xl mb-1">❓</div>
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
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
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
            <span>🌴</span>
            <span>PTO</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✈️</span>
            <span>Travel</span>
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

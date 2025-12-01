import { useState, useMemo } from 'react';
import type { TeamMemberSchedule, WorkLocationPreferenceResponse } from '../types/teamCalendar';
import { WorkLocationType, DayPortion } from '../types/api';
import { getWeekdays } from '../utils/dateUtils';

interface TeamCalendarViewProps {
  memberSchedules: TeamMemberSchedule[];
  startDate: Date;
  weeksToShow?: 1 | 2;
}

export function TeamCalendarView({ memberSchedules, startDate, weeksToShow = 2 }: TeamCalendarViewProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Generate weekdays for the date range
  const weekDays = useMemo(() => getWeekdays(startDate, weeksToShow), [startDate, weeksToShow]);

  const toggleMemberExpansion = (userId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Get all preferences for a date (could be 1 FullDay, or 2 AM/PM, or just 1 AM or PM)
  const getPreferencesForDate = (preferences: WorkLocationPreferenceResponse[], date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayPrefs = preferences.filter(p => p.workDate === dateStr);

    const fullDay = dayPrefs.find(p => p.dayPortion === DayPortion.FullDay);
    const am = dayPrefs.find(p => p.dayPortion === DayPortion.AM);
    const pm = dayPrefs.find(p => p.dayPortion === DayPortion.PM);

    return { am, pm, fullDay };
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
      default:
        return '❓';
    }
  };

  const getLocationLabel = (type: WorkLocationType): string => {
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
        return 'Office (Res)';
      case WorkLocationType.PTO:
        return 'PTO';
      default:
        return 'Unknown';
    }
  };

  const getLocationColor = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case WorkLocationType.RemotePlus:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case WorkLocationType.ClientSite:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case WorkLocationType.OfficeNoReservation:
      case WorkLocationType.OfficeWithReservation:
        return 'bg-green-50 text-green-700 border-green-200';
      case WorkLocationType.PTO:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (memberSchedules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No team members to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Header - Days of Week */}
      <div className="grid grid-cols-[200px_1fr] gap-2 mb-2">
        <div className="font-semibold text-gray-700 text-sm"></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(60px, 1fr))` }}>
          {weekDays.map((date, idx) => (
            <div key={idx} className="text-center">
              <div className="text-xs font-semibold text-gray-600">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Member Rows */}
      {memberSchedules.map((member) => {
        const isExpanded = expandedMembers.has(member.userId);

        return (
          <div
            key={member.userId}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition"
          >
            {/* Member Header Row */}
            <div className="grid grid-cols-[200px_1fr] gap-2 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMemberExpansion(member.userId)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{member.userName}</div>
                  {member.jobTitle && (
                    <div className="text-xs text-gray-600 truncate">{member.jobTitle}</div>
                  )}
                </div>
              </div>

              {/* Location Icons for Each Day */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(60px, 1fr))` }}>
                {weekDays.map((date, idx) => {
                  const { am, pm, fullDay } = getPreferencesForDate(member.preferences, date);
                  const isSplitDay = am || pm;

                  if (isSplitDay) {
                    // Split day view - stacked AM/PM
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-0.5 p-1 rounded border border-gray-300 bg-white"
                        title={`${am ? `AM: ${getLocationLabel(am.locationType)}` : 'AM: Not set'} / ${pm ? `PM: ${getLocationLabel(pm.locationType)}` : 'PM: Not set'}`}
                      >
                        {am ? (
                          <div className={`flex items-center justify-center gap-0.5 rounded px-1 py-0.5 ${getLocationColor(am.locationType)}`}>
                            <span className="text-xs">{getLocationIcon(am.locationType)}</span>
                            <span className="text-[8px] font-bold px-0.5 rounded bg-amber-500 text-white">AM</span>
                          </div>
                        ) : (
                          <div className="text-[8px] text-gray-400 text-center py-0.5">AM -</div>
                        )}
                        {pm ? (
                          <div className={`flex items-center justify-center gap-0.5 rounded px-1 py-0.5 ${getLocationColor(pm.locationType)}`}>
                            <span className="text-xs">{getLocationIcon(pm.locationType)}</span>
                            <span className="text-[8px] font-bold px-0.5 rounded bg-indigo-500 text-white">PM</span>
                          </div>
                        ) : (
                          <div className="text-[8px] text-gray-400 text-center py-0.5">PM -</div>
                        )}
                      </div>
                    );
                  }

                  // Full day or no preference
                  return (
                    <div
                      key={idx}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded border
                        ${fullDay ? getLocationColor(fullDay.locationType) : 'bg-white border-gray-200'}
                        text-center
                      `}
                      title={fullDay ? getLocationLabel(fullDay.locationType) : 'Not set'}
                    >
                      <span className="text-lg">
                        {fullDay ? getLocationIcon(fullDay.locationType) : '❓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="space-y-3">
                  {/* Member Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>{' '}
                      <span className="text-gray-900">{member.userEmail}</span>
                    </div>
                    {member.jobTitle && (
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>{' '}
                        <span className="text-gray-900">{member.jobTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Daily Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Schedule Details:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {weekDays.map((date, idx) => {
                        const { am, pm, fullDay } = getPreferencesForDate(member.preferences, date);
                        if (!fullDay && !am && !pm) return null;

                        const isSplitDay = am || pm;

                        if (isSplitDay) {
                          return (
                            <div key={idx} className="p-3 rounded-lg border border-gray-300 bg-white">
                              <div className="text-xs font-medium mb-2">
                                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="space-y-1">
                                {am && (
                                  <div className={`p-2 rounded ${getLocationColor(am.locationType)}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getLocationIcon(am.locationType)}</span>
                                      <span className="text-xs font-semibold">{getLocationLabel(am.locationType)}</span>
                                      <span className="text-[10px] font-bold px-1 rounded bg-amber-500 text-white">AM</span>
                                    </div>
                                    {am.officeName && <div className="text-[10px] text-gray-600 mt-0.5">{am.officeName}</div>}
                                  </div>
                                )}
                                {pm && (
                                  <div className={`p-2 rounded ${getLocationColor(pm.locationType)}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getLocationIcon(pm.locationType)}</span>
                                      <span className="text-xs font-semibold">{getLocationLabel(pm.locationType)}</span>
                                      <span className="text-[10px] font-bold px-1 rounded bg-indigo-500 text-white">PM</span>
                                    </div>
                                    {pm.officeName && <div className="text-[10px] text-gray-600 mt-0.5">{pm.officeName}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Full day
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getLocationColor(fullDay!.locationType)}`}
                          >
                            <div className="text-xs font-medium mb-1">
                              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getLocationIcon(fullDay!.locationType)}</span>
                              <span className="text-sm font-semibold">{getLocationLabel(fullDay!.locationType)}</span>
                            </div>
                            {fullDay!.officeName && (
                              <div className="text-xs text-gray-600 mt-1">{fullDay!.officeName}</div>
                            )}
                            {fullDay!.remoteLocation && (
                              <div className="text-xs text-gray-600 mt-1">{fullDay!.remoteLocation}</div>
                            )}
                            {fullDay!.notes && (
                              <div className="text-xs text-gray-600 mt-1 italic">{fullDay!.notes}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
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
            <span>❓</span>
            <span>Not Set</span>
          </div>
          <div className="text-gray-600">
            Click row to see details
          </div>
        </div>
      </div>
    </div>
  );
}

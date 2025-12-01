import { useState, useMemo } from 'react';
import { Modal, Button } from './ui';
import { WorkLocationType, DayPortion, type WorkLocationPreference, type User } from '../types/api';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: WorkLocationPreference[];
  user: User;
  startDate: string;
  endDate: string;
}

export function ShareCalendarModal({
  isOpen,
  onClose,
  preferences,
  user,
  startDate,
  endDate,
}: ShareCalendarModalProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'detailed' | 'summary'>('detailed');

  const getLocationTypeLabel = (type: WorkLocationType): string => {
    switch (type) {
      case WorkLocationType.Remote:
        return 'Remote';
      case WorkLocationType.RemotePlus:
        return 'Remote Plus';
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

  const getLocationEmoji = (type: WorkLocationType): string => {
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

  const getDayPortionLabel = (portion: DayPortion): string => {
    switch (portion) {
      case DayPortion.AM:
        return 'AM';
      case DayPortion.PM:
        return 'PM';
      default:
        return '';
    }
  };

  // Group preferences by date for handling split days
  const groupPreferencesByDate = (prefs: WorkLocationPreference[]): Map<string, { am?: WorkLocationPreference; pm?: WorkLocationPreference; fullDay?: WorkLocationPreference }> => {
    const grouped = new Map<string, { am?: WorkLocationPreference; pm?: WorkLocationPreference; fullDay?: WorkLocationPreference }>();

    prefs.forEach(pref => {
      if (!grouped.has(pref.workDate)) {
        grouped.set(pref.workDate, {});
      }
      const dayGroup = grouped.get(pref.workDate)!;

      if (pref.dayPortion === DayPortion.AM) {
        dayGroup.am = pref;
      } else if (pref.dayPortion === DayPortion.PM) {
        dayGroup.pm = pref;
      } else {
        dayGroup.fullDay = pref;
      }
    });

    return grouped;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper to format a single preference entry
  const formatPreferenceEntry = (pref: WorkLocationPreference, showPortionLabel: boolean = false): string => {
    const emoji = getLocationEmoji(pref.locationType);
    const label = getLocationTypeLabel(pref.locationType);
    const portionLabel = showPortionLabel && pref.dayPortion !== DayPortion.FullDay
      ? ` [${getDayPortionLabel(pref.dayPortion)}]`
      : '';

    let entry = `${emoji} ${label}${portionLabel}`;

    if (pref.office?.name) {
      entry += ` - ${pref.office.name}`;
      if (pref.office.city && pref.office.stateCode) {
        entry += ` (${pref.office.city}, ${pref.office.stateCode})`;
      }
    }
    if (pref.remoteLocation) {
      entry += ` - ${pref.remoteLocation}`;
      if (pref.city || pref.state) {
        const location = [pref.city, pref.state].filter(Boolean).join(', ');
        entry += ` (${location})`;
      }
    }

    return entry;
  };

  const generatedContent = useMemo(() => {
    // Filter and group preferences by date
    const userPrefs = preferences.filter(p => p.userId === user.id);
    const groupedByDate = groupPreferencesByDate(userPrefs);

    // Sort dates
    const sortedDates = Array.from(groupedByDate.keys()).sort();

    const displayName = user.displayName || user.name || user.email;
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    if (format === 'detailed') {
      let content = `Work Location Schedule for ${displayName}\n`;
      content += `═══════════════════════════════════════════════════\n`;
      content += `Period: ${formattedStartDate} - ${formattedEndDate}\n\n`;

      if (sortedDates.length === 0) {
        content += `No work locations have been set for this period.\n`;
      } else {
        // Group by week
        let currentWeek = -1;
        sortedDates.forEach((dateStr) => {
          const date = new Date(dateStr + 'T00:00:00');
          const weekNumber = getWeekNumber(date);
          const dayGroup = groupedByDate.get(dateStr)!;

          if (weekNumber !== currentWeek) {
            currentWeek = weekNumber;
            content += `\n📅 Week of ${getWeekStartDate(date)}\n`;
            content += `───────────────────────────────────────────────────\n`;
          }

          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          if (dayGroup.fullDay) {
            // Full day entry
            content += `${dayName}, ${formattedDate}: ${formatPreferenceEntry(dayGroup.fullDay)}`;
            if (dayGroup.fullDay.notes) {
              content += `\n   📝 Note: ${dayGroup.fullDay.notes}`;
            }
            content += '\n';
          } else {
            // Split day - AM and/or PM
            content += `${dayName}, ${formattedDate}:\n`;
            if (dayGroup.am) {
              content += `   🌅 AM: ${formatPreferenceEntry(dayGroup.am)}`;
              if (dayGroup.am.notes) {
                content += `\n      📝 ${dayGroup.am.notes}`;
              }
              content += '\n';
            }
            if (dayGroup.pm) {
              content += `   🌆 PM: ${formatPreferenceEntry(dayGroup.pm)}`;
              if (dayGroup.pm.notes) {
                content += `\n      📝 ${dayGroup.pm.notes}`;
              }
              content += '\n';
            }
          }
        });
      }

      content += `\n═══════════════════════════════════════════════════\n`;
      content += `Generated from MyScheduling on ${new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}\n`;

      return content;
    } else {
      // Summary format - more compact
      let content = `📆 ${displayName}'s Work Schedule\n`;
      content += `${formatShortDate(startDate)} - ${formatShortDate(endDate)}\n\n`;

      if (sortedDates.length === 0) {
        content += `No locations set.\n`;
      } else {
        sortedDates.forEach((dateStr) => {
          const dayGroup = groupedByDate.get(dateStr)!;
          const formattedDate = formatShortDate(dateStr);

          if (dayGroup.fullDay) {
            const emoji = getLocationEmoji(dayGroup.fullDay.locationType);
            const label = getLocationTypeLabel(dayGroup.fullDay.locationType);
            let line = `${emoji} ${formattedDate}: ${label}`;
            if (dayGroup.fullDay.office?.name) {
              line += ` @ ${dayGroup.fullDay.office.name}`;
            }
            if (dayGroup.fullDay.remoteLocation) {
              line += ` @ ${dayGroup.fullDay.remoteLocation}`;
            }
            content += line + '\n';
          } else {
            // Split day
            if (dayGroup.am && dayGroup.pm) {
              // Both AM and PM
              const amEmoji = getLocationEmoji(dayGroup.am.locationType);
              const pmEmoji = getLocationEmoji(dayGroup.pm.locationType);
              const amLabel = getLocationTypeLabel(dayGroup.am.locationType);
              const pmLabel = getLocationTypeLabel(dayGroup.pm.locationType);
              content += `${formattedDate}: ${amEmoji} AM: ${amLabel} | ${pmEmoji} PM: ${pmLabel}\n`;
            } else if (dayGroup.am) {
              const emoji = getLocationEmoji(dayGroup.am.locationType);
              const label = getLocationTypeLabel(dayGroup.am.locationType);
              content += `${emoji} ${formattedDate} (AM): ${label}\n`;
            } else if (dayGroup.pm) {
              const emoji = getLocationEmoji(dayGroup.pm.locationType);
              const label = getLocationTypeLabel(dayGroup.pm.locationType);
              content += `${emoji} ${formattedDate} (PM): ${label}\n`;
            }
          }
        });
      }

      return content;
    }
  }, [preferences, user, startDate, endDate, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = generatedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent(`Work Location Schedule - ${user.displayName || user.name || user.email}`);
    const body = encodeURIComponent(generatedContent);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Work Location Schedule"
      size="lg"
    >
      <div className="space-y-4">
        {/* Format Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setFormat('detailed')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${format === 'detailed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Detailed
          </button>
          <button
            type="button"
            onClick={() => setFormat('summary')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${format === 'summary'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Summary
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Preview</h4>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-4 rounded border border-gray-200 max-h-80 overflow-y-auto">
            {generatedContent}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={handleEmailClick}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Open in Email Client
          </Button>

          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Future: Direct email sending from the app will be available soon.
        </p>
      </div>
    </Modal>
  );
}

// Helper functions
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getWeekStartDate(date: Date): string {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default ShareCalendarModal;

import { useState, useMemo, useCallback } from 'react';
import { Modal, Button } from './ui';
import { BookingStatus, type Booking, type Space } from '../types/api';

// Flexible user type that accepts either authStore User or api User
interface ShareBookingsUser {
  displayName?: string;
  name?: string;
  email?: string;
}

interface ShareBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  user?: ShareBookingsUser;
  startDate: string;
  endDate: string;
  spaces?: Space[];
}

export function ShareBookingsModal({
  isOpen,
  onClose,
  bookings,
  user,
  startDate,
  endDate,
  spaces = [],
}: ShareBookingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'detailed' | 'summary'>('detailed');

  // Memoize helper functions to avoid useMemo dependency issues
  const getStatusLabel = useCallback((status: BookingStatus): string => {
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
  }, []);

  const getStatusEmoji = useCallback((status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.Reserved:
        return '📅';
      case BookingStatus.CheckedIn:
        return '✅';
      case BookingStatus.Completed:
        return '✔️';
      case BookingStatus.Cancelled:
        return '❌';
      case BookingStatus.NoShow:
        return '⚠️';
      default:
        return '📍';
    }
  }, []);

  const getSpaceName = useCallback((spaceId: string): string => {
    const space = spaces.find(s => s.id === spaceId);
    return space?.name || spaceId.substring(0, 8) + '...';
  }, [spaces]);

  const getSpaceType = useCallback((spaceId: string): string => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return '';
    return space.type === 0 ? 'Desk' : space.type === 1 ? 'Conference Room' : 'Space';
  }, [spaces]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Group bookings by date
  const groupBookingsByDate = (bookingsList: Booking[]): Map<string, Booking[]> => {
    const grouped = new Map<string, Booking[]>();

    bookingsList.forEach(booking => {
      const dateKey = booking.startDatetime.split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(booking);
    });

    return grouped;
  };

  const generatedContent = useMemo(() => {
    const displayName = user?.displayName || user?.name || user?.email || 'User';
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    const groupedByDate = groupBookingsByDate(bookings);
    const sortedDates = Array.from(groupedByDate.keys()).sort();

    if (format === 'detailed') {
      let content = `Office Reservations for ${displayName}\n`;
      content += `═══════════════════════════════════════════════════\n`;
      content += `Period: ${formattedStartDate} - ${formattedEndDate}\n\n`;

      if (sortedDates.length === 0) {
        content += `No reservations found for this period.\n`;
      } else {
        // Group by week
        let currentWeek = -1;
        sortedDates.forEach((dateStr) => {
          const date = new Date(dateStr + 'T00:00:00');
          const weekNumber = getWeekNumber(date);
          const dayBookings = groupedByDate.get(dateStr)!;

          if (weekNumber !== currentWeek) {
            currentWeek = weekNumber;
            content += `\n📅 Week of ${getWeekStartDate(date)}\n`;
            content += `───────────────────────────────────────────────────\n`;
          }

          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          content += `\n${dayName}, ${formattedDate}:\n`;

          // Sort bookings by start time
          dayBookings.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

          dayBookings.forEach(booking => {
            const emoji = getStatusEmoji(booking.status);
            const status = getStatusLabel(booking.status);
            const spaceName = getSpaceName(booking.spaceId);
            const spaceType = getSpaceType(booking.spaceId);
            const startTime = formatTime(booking.startDatetime);

            let timeRange = startTime;
            if (booking.isPermanent) {
              timeRange += ' (Permanent)';
            } else if (booking.endDatetime) {
              timeRange += ` - ${formatTime(booking.endDatetime)}`;
            }

            content += `   ${emoji} ${timeRange}\n`;
            content += `      ${spaceType}: ${spaceName}\n`;
            content += `      Status: ${status}\n`;
          });
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
      let content = `📆 ${displayName}'s Office Reservations\n`;
      content += `${formatShortDate(startDate)} - ${formatShortDate(endDate)}\n\n`;

      if (sortedDates.length === 0) {
        content += `No reservations.\n`;
      } else {
        sortedDates.forEach((dateStr) => {
          const dayBookings = groupedByDate.get(dateStr)!;
          const formattedDate = formatShortDate(dateStr);

          dayBookings.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

          dayBookings.forEach(booking => {
            const emoji = getStatusEmoji(booking.status);
            const spaceName = getSpaceName(booking.spaceId);
            const startTime = formatTime(booking.startDatetime);

            let line = `${emoji} ${formattedDate} ${startTime}: ${spaceName}`;
            if (booking.isPermanent) {
              line += ' (Permanent)';
            }
            content += line + '\n';
          });
        });
      }

      return content;
    }
  }, [bookings, user, startDate, endDate, format, getSpaceName, getSpaceType, getStatusEmoji, getStatusLabel]);

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
    const displayName = user?.displayName || user?.name || user?.email || 'User';
    const subject = encodeURIComponent(`Office Reservations - ${displayName}`);
    const body = encodeURIComponent(generatedContent);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Office Reservations"
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

export default ShareBookingsModal;

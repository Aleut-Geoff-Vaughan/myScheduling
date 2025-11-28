import { useState } from 'react';
import { Plus, Edit2, Trash2, Briefcase, Calendar } from 'lucide-react';
import { RichTextDisplay } from './RichTextEditor';
import { ExperienceEntryModal } from './ExperienceEntryModal';
import type { ResumeEntry } from '../../types/api';
import { format, parseISO, differenceInMonths, differenceInYears } from 'date-fns';

interface ExperienceSectionProps {
  entries: ResumeEntry[];
  isEditable?: boolean;
  onAdd?: (entry: Partial<ResumeEntry>) => Promise<void>;
  onUpdate?: (id: string, entry: Partial<ResumeEntry>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ExperienceSection({
  entries,
  isEditable = false,
  onAdd,
  onUpdate,
  onDelete
}: ExperienceSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResumeEntry | null>(null);

  // Sort entries by start date (most recent first)
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
    const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return '';
    const start = parseISO(startDate);
    const startFormatted = format(start, 'MMM yyyy');
    const endFormatted = endDate ? format(parseISO(endDate), 'MMM yyyy') : 'Present';
    return `${startFormatted} - ${endFormatted}`;
  };

  const calculateDuration = (startDate?: string, endDate?: string) => {
    if (!startDate) return '';
    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : new Date();
    const years = differenceInYears(end, start);
    const months = differenceInMonths(end, start) % 12;

    if (years === 0 && months === 0) return 'Less than a month';
    if (years === 0) return `${months} mo${months > 1 ? 's' : ''}`;
    if (months === 0) return `${years} yr${years > 1 ? 's' : ''}`;
    return `${years} yr${years > 1 ? 's' : ''} ${months} mo${months > 1 ? 's' : ''}`;
  };

  const handleSave = async (entry: Partial<ResumeEntry>) => {
    if (editingEntry) {
      await onUpdate?.(editingEntry.id, entry);
    } else {
      await onAdd?.(entry);
    }
    setShowModal(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: ResumeEntry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this experience entry?')) {
      await onDelete?.(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          Experience
        </h2>
        {isEditable && (
          <button
            onClick={() => {
              setEditingEntry(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Experience
          </button>
        )}
      </div>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-8">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {isEditable
              ? 'No experience added yet. Click "Add Experience" to get started.'
              : 'No experience listed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedEntries.map((entry, index) => (
            <div
              key={entry.id}
              className={`relative ${index !== sortedEntries.length - 1 ? 'pb-6 border-b border-gray-100' : ''}`}
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />

              <div className="pl-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{entry.title}</h3>
                    {entry.organization && (
                      <p className="text-gray-700 font-medium">{entry.organization}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateRange(entry.startDate, entry.endDate)}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span>{calculateDuration(entry.startDate, entry.endDate)}</span>
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {entry.description && (
                  <div className="mt-3">
                    <RichTextDisplay content={entry.description} className="text-gray-600" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ExperienceEntryModal
          entry={editingEntry}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

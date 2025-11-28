import { useState } from 'react';
import { Plus, Edit2, Trash2, GraduationCap, Calendar } from 'lucide-react';
import { RichTextDisplay } from './RichTextEditor';
import { EducationEntryModal } from './EducationEntryModal';
import type { ResumeEntry } from '../../types/api';
import { format, parseISO } from 'date-fns';

interface EducationSectionProps {
  entries: ResumeEntry[];
  isEditable?: boolean;
  onAdd?: (entry: Partial<ResumeEntry>) => Promise<void>;
  onUpdate?: (id: string, entry: Partial<ResumeEntry>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EducationSection({
  entries,
  isEditable = false,
  onAdd,
  onUpdate,
  onDelete
}: EducationSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResumeEntry | null>(null);

  // Sort by end date (most recent first), then by start date
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = a.endDate ? new Date(a.endDate) : a.startDate ? new Date(a.startDate) : new Date(0);
    const dateB = b.endDate ? new Date(b.endDate) : b.startDate ? new Date(b.startDate) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return '';
    const parts = [];
    if (startDate) parts.push(format(parseISO(startDate), 'yyyy'));
    if (endDate) parts.push(format(parseISO(endDate), 'yyyy'));
    else if (startDate) parts.push('Present');
    return parts.join(' - ');
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
    if (confirm('Are you sure you want to delete this education entry?')) {
      await onDelete?.(id);
    }
  };

  // Parse additional fields for degree type, field of study, GPA
  const parseAdditionalFields = (entry: ResumeEntry) => {
    try {
      return entry.additionalFields ? JSON.parse(entry.additionalFields) : {};
    } catch {
      return {};
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Education
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
            Add Education
          </button>
        )}
      </div>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-8">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {isEditable
              ? 'No education added yet. Click "Add Education" to get started.'
              : 'No education listed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedEntries.map((entry, index) => {
            const additionalFields = parseAdditionalFields(entry);
            return (
              <div
                key={entry.id}
                className={`${index !== sortedEntries.length - 1 ? 'pb-6 border-b border-gray-100' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {/* Institution Logo Placeholder */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{entry.organization}</h3>
                      <p className="text-gray-700">
                        {additionalFields.degreeType && `${additionalFields.degreeType} in `}
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateRange(entry.startDate, entry.endDate)}
                        </span>
                        {additionalFields.gpa && (
                          <>
                            <span className="text-gray-400">|</span>
                            <span>GPA: {additionalFields.gpa}</span>
                          </>
                        )}
                      </div>
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
                  <div className="mt-3 ml-16">
                    <RichTextDisplay content={entry.description} className="text-gray-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <EducationEntryModal
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

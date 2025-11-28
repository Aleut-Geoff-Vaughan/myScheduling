import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { RichTextEditor, RichTextDisplay } from './RichTextEditor';
import type { ResumeEntry } from '../../types/api';

interface SummarySectionProps {
  entry?: ResumeEntry;
  isEditable?: boolean;
  onSave?: (content: string) => Promise<void>;
}

export function SummarySection({ entry, isEditable = false, onSave }: SummarySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(entry?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save summary:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(entry?.description || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Professional Summary</h2>
        {isEditable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Write a compelling summary that highlights your professional background, key skills, and career objectives..."
        />
      ) : content ? (
        <RichTextDisplay content={content} className="text-gray-700 leading-relaxed" />
      ) : (
        <p className="text-gray-500 italic">
          {isEditable
            ? 'Click the edit button to add your professional summary.'
            : 'No summary provided.'}
        </p>
      )}
    </div>
  );
}

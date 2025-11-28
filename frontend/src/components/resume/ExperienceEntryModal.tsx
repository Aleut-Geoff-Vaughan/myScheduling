import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import type { ResumeEntry } from '../../types/api';

interface ExperienceEntryModalProps {
  entry: ResumeEntry | null;
  onSave: (entry: Partial<ResumeEntry>) => Promise<void>;
  onClose: () => void;
}

export function ExperienceEntryModal({ entry, onSave, onClose }: ExperienceEntryModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    startDate: '',
    endDate: '',
    description: '',
    isCurrent: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        organization: entry.organization || '',
        startDate: entry.startDate ? entry.startDate.split('T')[0] : '',
        endDate: entry.endDate ? entry.endDate.split('T')[0] : '',
        description: entry.description || '',
        isCurrent: !entry.endDate
      });
    }
  }, [entry]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    if (!formData.organization.trim()) {
      newErrors.organization = 'Company/Organization is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.isCurrent && !formData.endDate) {
      newErrors.endDate = 'End date is required (or mark as current)';
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        organization: formData.organization.trim(),
        startDate: formData.startDate,
        endDate: formData.isCurrent ? undefined : formData.endDate,
        description: formData.description
      });
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {entry ? 'Edit Experience' : 'Add Experience'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company / Organization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g., Acme Corporation"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.organization ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization}</p>}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={formData.isCurrent}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>

            {/* Currently Working */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCurrent"
                checked={formData.isCurrent}
                onChange={(e) => setFormData({
                  ...formData,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? '' : formData.endDate
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isCurrent" className="text-sm text-gray-700">
                I currently work here
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Describe your responsibilities, achievements, and key accomplishments.
                Use bullet points for better readability.
              </p>
              <RichTextEditor
                content={formData.description}
                onChange={(content) => setFormData({ ...formData, description: content })}
                placeholder="• Led development of key features&#10;• Managed a team of 5 engineers&#10;• Improved system performance by 40%"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (entry ? 'Update' : 'Add Experience')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

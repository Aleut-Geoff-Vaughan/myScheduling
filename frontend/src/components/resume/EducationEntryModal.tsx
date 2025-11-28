import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import type { ResumeEntry } from '../../types/api';

interface EducationEntryModalProps {
  entry: ResumeEntry | null;
  onSave: (entry: Partial<ResumeEntry>) => Promise<void>;
  onClose: () => void;
}

const DEGREE_TYPES = [
  'High School Diploma',
  'Associate Degree',
  'Bachelor of Arts (BA)',
  'Bachelor of Science (BS)',
  'Bachelor of Engineering (BE)',
  'Master of Arts (MA)',
  'Master of Science (MS)',
  'Master of Business Administration (MBA)',
  'Master of Engineering (ME)',
  'Doctor of Philosophy (PhD)',
  'Doctor of Medicine (MD)',
  'Juris Doctor (JD)',
  'Certificate',
  'Professional Certification',
  'Other'
];

export function EducationEntryModal({ entry, onSave, onClose }: EducationEntryModalProps) {
  const [formData, setFormData] = useState({
    organization: '',
    title: '',
    degreeType: '',
    startDate: '',
    endDate: '',
    gpa: '',
    description: '',
    inProgress: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry) {
      let additionalFields: Record<string, string> = {};
      try {
        additionalFields = entry.additionalFields ? JSON.parse(entry.additionalFields) : {};
      } catch {
        additionalFields = {};
      }

      setFormData({
        organization: entry.organization || '',
        title: entry.title || '',
        degreeType: additionalFields.degreeType || '',
        startDate: entry.startDate ? entry.startDate.split('T')[0] : '',
        endDate: entry.endDate ? entry.endDate.split('T')[0] : '',
        gpa: additionalFields.gpa || '',
        description: entry.description || '',
        inProgress: !entry.endDate
      });
    }
  }, [entry]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.organization.trim()) {
      newErrors.organization = 'School/University is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Field of study is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const additionalFields = JSON.stringify({
        degreeType: formData.degreeType,
        gpa: formData.gpa
      });

      await onSave({
        organization: formData.organization.trim(),
        title: formData.title.trim(),
        startDate: formData.startDate || undefined,
        endDate: formData.inProgress ? undefined : formData.endDate || undefined,
        description: formData.description,
        additionalFields
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
            {entry ? 'Edit Education' : 'Add Education'}
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
            {/* School/University */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School / University <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g., University of Virginia"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.organization ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization}</p>}
            </div>

            {/* Degree Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Degree Type
              </label>
              <select
                value={formData.degreeType}
                onChange={(e) => setFormData({ ...formData, degreeType: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select degree type</option>
                {DEGREE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Field of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field of Study / Major <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Computer Science"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Year
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Year (or Expected)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={formData.inProgress}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* In Progress */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inProgress"
                checked={formData.inProgress}
                onChange={(e) => setFormData({
                  ...formData,
                  inProgress: e.target.checked,
                  endDate: e.target.checked ? '' : formData.endDate
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="inProgress" className="text-sm text-gray-700">
                I'm currently enrolled
              </label>
            </div>

            {/* GPA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GPA (Optional)
              </label>
              <input
                type="text"
                value={formData.gpa}
                onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                placeholder="e.g., 3.8/4.0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activities & Achievements
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Add relevant coursework, honors, activities, or other accomplishments.
              </p>
              <RichTextEditor
                content={formData.description}
                onChange={(content) => setFormData({ ...formData, description: content })}
                placeholder="• Dean's List, 2018-2022&#10;• President of Computer Science Club&#10;• Senior thesis on machine learning"
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
              {isSaving ? 'Saving...' : (entry ? 'Update' : 'Add Education')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

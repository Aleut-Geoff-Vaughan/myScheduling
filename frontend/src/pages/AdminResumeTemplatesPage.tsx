import { useState, useEffect } from 'react';
import { FileText, Plus, Copy, Star, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate
} from '../services/resumeService';
import { type ResumeTemplate, ResumeTemplateType } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const TEMPLATE_TYPE_LABELS: Record<ResumeTemplateType, string> = {
  [ResumeTemplateType.Federal]: 'Federal',
  [ResumeTemplateType.Commercial]: 'Commercial',
  [ResumeTemplateType.Executive]: 'Executive',
  [ResumeTemplateType.Technical]: 'Technical',
  [ResumeTemplateType.Academic]: 'Academic',
  [ResumeTemplateType.Custom]: 'Custom',
};

const TEMPLATE_TYPE_COLORS: Record<ResumeTemplateType, string> = {
  [ResumeTemplateType.Federal]: 'bg-blue-100 text-blue-800',
  [ResumeTemplateType.Commercial]: 'bg-green-100 text-green-800',
  [ResumeTemplateType.Executive]: 'bg-purple-100 text-purple-800',
  [ResumeTemplateType.Technical]: 'bg-orange-100 text-orange-800',
  [ResumeTemplateType.Academic]: 'bg-cyan-100 text-cyan-800',
  [ResumeTemplateType.Custom]: 'bg-gray-100 text-gray-800',
};

interface TemplateFormData {
  name: string;
  description: string;
  type: ResumeTemplateType;
  templateContent: string;
  isDefault: boolean;
  isActive: boolean;
}

const initialFormData: TemplateFormData = {
  name: '',
  description: '',
  type: ResumeTemplateType.Commercial,
  templateContent: '',
  isDefault: false,
  isActive: true,
};

export function AdminResumeTemplatesPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;

  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResumeTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<ResumeTemplateType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');

  useEffect(() => {
    if (tenantId) {
      loadTemplates();
    }
  }, [tenantId]);

  const loadTemplates = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates(tenantId);
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: ResumeTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description,
        type: template.type,
        templateContent: template.templateContent,
        isDefault: template.isDefault,
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId) {
      toast.error('No tenant selected');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      setSubmitting(true);

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          templateContent: formData.templateContent,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
        });
        toast.success('Template updated successfully');
      } else {
        await createTemplate({
          tenantId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          templateContent: formData.templateContent,
          isDefault: formData.isDefault,
        });
        toast.success('Template created successfully');
      }

      handleCloseModal();
      await loadTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(editingTemplate ? 'Failed to update template' : 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template: ResumeTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      toast.success('Template deleted successfully');
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: ResumeTemplate) => {
    try {
      await duplicateTemplate(template.id, `${template.name} (Copy)`);
      toast.success('Template duplicated successfully');
      await loadTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast.error('Failed to duplicate template');
    }
  };

  const handleSetDefault = async (template: ResumeTemplate) => {
    try {
      await updateTemplate(template.id, { isDefault: true });
      toast.success(`${template.name} is now the default template for ${TEMPLATE_TYPE_LABELS[template.type]}`);
      await loadTemplates();
    } catch (err) {
      console.error('Error setting default template:', err);
      toast.error('Failed to set default template');
    }
  };

  const handleToggleActive = async (template: ResumeTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
      toast.success(template.isActive ? 'Template deactivated' : 'Template activated');
      await loadTemplates();
    } catch (err) {
      console.error('Error toggling template status:', err);
      toast.error('Failed to update template status');
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterActive !== 'all' && t.isActive !== filterActive) return false;
    return true;
  });

  // Group templates by type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const type = template.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {} as Record<ResumeTemplateType, ResumeTemplate[]>);

  if (!tenantId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h4 className="text-lg font-medium text-gray-900 mb-1">No Workspace Selected</h4>
        <p className="text-sm text-gray-500">Please select a workspace to manage resume templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage resume export templates for different purposes (Federal, Commercial, etc.)
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="text-sm font-medium text-gray-700">
            Type:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value === 'all' ? 'all' : Number(e.target.value) as ResumeTemplateType)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-active" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="filter-active"
            value={filterActive === 'all' ? 'all' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading templates...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
          <button
            type="button"
            onClick={loadTemplates}
            className="ml-2 text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Templates List */}
      {!loading && !error && filteredTemplates.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedTemplates)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([type, typeTemplates]) => (
              <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TEMPLATE_TYPE_COLORS[Number(type) as ResumeTemplateType]}`}>
                      {TEMPLATE_TYPE_LABELS[Number(type) as ResumeTemplateType]}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({typeTemplates.length} template{typeTemplates.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {typeTemplates.map((template) => (
                    <div key={template.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{template.name}</h3>
                              {template.isDefault && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                  <Star className="w-3 h-3" />
                                  Default
                                </span>
                              )}
                              {!template.isActive && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {template.description || 'No description'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created: {new Date(template.createdAt).toLocaleDateString()}
                              {template.updatedAt && ` · Updated: ${new Date(template.updatedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!template.isDefault && template.isActive && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(template)}
                              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(template)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg ${
                              template.isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {template.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTemplates.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Templates Found</h4>
          <p className="text-sm text-gray-500 mb-4">
            {templates.length === 0
              ? 'Get started by creating your first resume template.'
              : 'No templates match your current filters.'}
          </p>
          {templates.length === 0 && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Your First Template
            </button>
          )}
        </div>
      )}

      {/* Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="template-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Federal Proposal Template"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="template-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="template-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) as ResumeTemplateType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Type determines which category this template appears in when exporting resumes.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    id="template-description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Template Content */}
                <div>
                  <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Configuration (JSON)
                  </label>
                  <textarea
                    id="template-content"
                    value={formData.templateContent}
                    onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                    placeholder='{"headerStyle": "modern", "showPhoto": true, "showSkillBars": true, ...}'
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional JSON configuration for template styling and section visibility options.
                  </p>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Set as default template for this type
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active (available for use)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

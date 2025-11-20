import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Copy, Star, Eye } from 'lucide-react';
import {
  getResumeTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate
} from '../../services/resumeService';
import { ResumeTemplate, ResumeTemplateType } from '../../types/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TemplateManagementProps {
  tenantId?: string;
  onTemplateSelect?: (template: ResumeTemplate) => void;
}

export function TemplateManagement({ tenantId, onTemplateSelect }: TemplateManagementProps) {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResumeTemplate | null>(null);
  const [filterType, setFilterType] = useState<ResumeTemplateType | undefined>();
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [tenantId, filterType, showActiveOnly]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResumeTemplates(
        tenantId,
        filterType,
        showActiveOnly ? true : undefined
      );
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      await createTemplate(templateData);
      await loadTemplates();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (templateId: string, templateData: any) => {
    try {
      await updateTemplate(templateId, templateData);
      await loadTemplates();
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteTemplate(templateId);
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (templateId: string, newName: string) => {
    try {
      await duplicateTemplate(templateId, { newName });
      await loadTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError('Failed to duplicate template');
    }
  };

  const getTemplateTypeColor = (type: ResumeTemplateType) => {
    switch (type) {
      case ResumeTemplateType.Federal:
        return 'bg-purple-100 text-purple-800';
      case ResumeTemplateType.Commercial:
        return 'bg-blue-100 text-blue-800';
      case ResumeTemplateType.Technical:
        return 'bg-green-100 text-green-800';
      case ResumeTemplateType.Executive:
        return 'bg-orange-100 text-orange-800';
      case ResumeTemplateType.Academic:
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="p-4 text-red-800">{error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resume Templates
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterType ?? ''}
          onChange={(e) =>
            setFilterType(e.target.value ? (parseInt(e.target.value) as ResumeTemplateType) : undefined)
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value={ResumeTemplateType.Federal}>Federal</option>
          <option value={ResumeTemplateType.Commercial}>Commercial</option>
          <option value={ResumeTemplateType.Technical}>Technical</option>
          <option value={ResumeTemplateType.Executive}>Executive</option>
          <option value={ResumeTemplateType.Academic}>Academic</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Active only
        </label>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No templates found</h4>
            <p className="text-sm text-gray-500 mb-4">
              {filterType !== undefined || showActiveOnly
                ? 'Try adjusting your filters'
                : 'Create your first resume template to get started'}
            </p>
            {!filterType && (
              <Button onClick={() => setShowCreateModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`${
                template.isDefault ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      {template.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {!template.isActive && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTemplateTypeColor(
                        template.type
                      )}`}
                    >
                      {ResumeTemplateType[template.type]}
                    </span>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  {onTemplateSelect && (
                    <button
                      onClick={() => onTemplateSelect(template)}
                      className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const newName = prompt('Enter name for the duplicate:', `${template.name} (Copy)`);
                      if (newName) handleDuplicateTemplate(template.id, newName);
                    }}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          tenantId={tenantId}
          onSubmit={(data) => {
            if (editingTemplate) {
              handleUpdateTemplate(editingTemplate.id, data);
            } else {
              handleCreateTemplate(data);
            }
          }}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Template Modal Component
interface TemplateModalProps {
  template: ResumeTemplate | null;
  tenantId?: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

function TemplateModal({ template, tenantId, onSubmit, onClose }: TemplateModalProps) {
  const [formData, setFormData] = useState({
    tenantId: template?.tenantId || tenantId || '',
    name: template?.name || '',
    description: template?.description || '',
    type: template?.type || ResumeTemplateType.Commercial,
    templateContent: template?.templateContent || '',
    isDefault: template?.isDefault || false,
    isActive: template?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: parseInt(e.target.value) as ResumeTemplateType })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={ResumeTemplateType.Federal}>Federal</option>
              <option value={ResumeTemplateType.Commercial}>Commercial</option>
              <option value={ResumeTemplateType.Technical}>Technical</option>
              <option value={ResumeTemplateType.Executive}>Executive</option>
              <option value={ResumeTemplateType.Academic}>Academic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Content
            </label>
            <textarea
              value={formData.templateContent}
              onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter template content or markup..."
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-gray-300"
              />
              Set as default template
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

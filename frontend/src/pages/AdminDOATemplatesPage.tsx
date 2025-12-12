import { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import {
  useDOATemplates,
  useCreateDOATemplate,
  useUpdateDOATemplate,
  useDeleteDOATemplate,
} from '../hooks/useDOATemplates';
import type { DOATemplate, CreateDOATemplateRequest } from '../types/doa';
import toast from 'react-hot-toast';

export function AdminDOATemplatesPage() {
  const { data: templates, isLoading } = useDOATemplates();
  const createMutation = useCreateDOATemplate();
  const updateMutation = useUpdateDOATemplate();
  const deleteMutation = useDeleteDOATemplate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DOATemplate | null>(null);
  const [formData, setFormData] = useState<CreateDOATemplateRequest>({
    name: '',
    description: '',
    letterContent: '',
    isDefault: false,
    isActive: true,
    sortOrder: 0,
  });

  const handleOpenModal = (template?: DOATemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description,
        letterContent: template.letterContent,
        isDefault: template.isDefault,
        isActive: template.isActive,
        sortOrder: template.sortOrder,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        letterContent: '',
        isDefault: false,
        isActive: true,
        sortOrder: templates?.length || 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      letterContent: '',
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.letterContent.trim()) {
      toast.error('Letter content is required');
      return;
    }

    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          request: formData,
        });
        toast.success('Template updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Template created successfully');
      }
      handleCloseModal();
    } catch {
      toast.error(
        editingTemplate
          ? 'Failed to update template'
          : 'Failed to create template'
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Template deleted successfully');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DOA Letter Templates</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage reusable letter content templates for delegation of authority letters
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Template
          </button>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-pulse text-gray-500">Loading templates...</div>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sort Order
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{template.name}</div>
                        {template.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate">
                        {template.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          template.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {template.sortOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal(template)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id, template.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">No templates found</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Your First Template
            </button>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Financial Authority"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Letter Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Letter Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.letterContent}
                    onChange={(e) => setFormData({ ...formData, letterContent: e.target.value })}
                    placeholder="Enter the standard letter content. You can use placeholders like {DelegatorName}, {DesigneeName}, {StartDate}, {EndDate}..."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tip: Use placeholders that can be replaced when creating letters from this template
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isDefault || false}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Set as default template (will be auto-selected when creating new DOA letters)
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingTemplate
                    ? 'Update Template'
                    : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

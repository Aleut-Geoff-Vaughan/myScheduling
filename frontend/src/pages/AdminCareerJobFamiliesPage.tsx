import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  careerJobFamiliesService,
  type CareerJobFamily,
  type CreateCareerJobFamilyDto,
  type UpdateCareerJobFamilyDto,
} from '../services/staffingService';
import toast from 'react-hot-toast';

export function AdminCareerJobFamiliesPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;

  const [families, setFamilies] = useState<CareerJobFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<CareerJobFamily | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    sortOrder: 0,
    isActive: true,
  });

  const loadFamilies = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const data = await careerJobFamiliesService.getAll({
        tenantId,
        isActive: filterActive === 'all' ? undefined : filterActive,
        search: search || undefined,
      });
      setFamilies(data);
    } catch {
      toast.error('Failed to load career job families');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filterActive, search]);

  const handleCreate = () => {
    setEditingFamily(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      sortOrder: families.length,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (family: CareerJobFamily) => {
    setEditingFamily(family);
    setFormData({
      name: family.name,
      description: family.description || '',
      code: family.code || '',
      sortOrder: family.sortOrder,
      isActive: family.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingFamily) {
        const dto: UpdateCareerJobFamilyDto = {
          name: formData.name,
          description: formData.description || undefined,
          code: formData.code || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        };
        await careerJobFamiliesService.update(editingFamily.id, dto);
        toast.success('Career job family updated');
      } else {
        const dto: CreateCareerJobFamilyDto = {
          tenantId,
          name: formData.name,
          description: formData.description || undefined,
          code: formData.code || undefined,
          sortOrder: formData.sortOrder,
        };
        await careerJobFamiliesService.create(dto);
        toast.success('Career job family created');
      }
      setShowModal(false);
      loadFamilies();
    } catch {
      toast.error(editingFamily ? 'Failed to update career job family' : 'Failed to create career job family');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await careerJobFamiliesService.delete(id);
      toast.success('Career job family deleted');
      loadFamilies();
    } catch {
      toast.error('Failed to delete career job family. It may be in use.');
    }
  };

  const handleToggleActive = async (family: CareerJobFamily) => {
    try {
      await careerJobFamiliesService.update(family.id, {
        isActive: !family.isActive,
      });
      toast.success(`Career job family ${family.isActive ? 'deactivated' : 'activated'}`);
      loadFamilies();
    } catch {
      toast.error('Failed to update career job family');
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage career job families.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Job Families</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage career families like Engineering, Consulting, Project Management, etc.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Add Career Family
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterActive === 'all' ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'active')
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading career job families...</div>
        ) : families.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No career job families found.</p>
            <p className="text-sm">Click "Add Career Family" to create one.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sort Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {families.map((family) => (
                <tr key={family.id} className={!family.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{family.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {family.code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {family.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {family.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(family)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        family.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {family.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(family)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(family.id, family.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingFamily ? 'Edit Career Job Family' : 'Add Career Job Family'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ENG"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingFamily && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingFamily ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

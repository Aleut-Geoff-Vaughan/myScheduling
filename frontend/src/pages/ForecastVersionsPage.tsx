import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  forecastVersionsService,
  type ForecastVersion,
  type VersionCompareResponse,
  ForecastVersionType,
  getVersionTypeColor,
  getMonthShortName,
} from '../services/forecastService';
import toast from 'react-hot-toast';
import { GitCompare, Copy, ArrowUpCircle, Archive, Trash2, Plus, X, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export function ForecastVersionsPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  const [versions, setVersions] = useState<ForecastVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareData, setCompareData] = useState<VersionCompareResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedVersion1, setSelectedVersion1] = useState<string>('');
  const [selectedVersion2, setSelectedVersion2] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: ForecastVersionType.WhatIf,
  });

  const loadVersions = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const data = await forecastVersionsService.getAll({ tenantId, includeArchived });
      setVersions(data);
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, includeArchived]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreate = async () => {
    if (!tenantId || !createForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      await forecastVersionsService.create({
        tenantId,
        name: createForm.name,
        description: createForm.description || undefined,
        type: createForm.type,
        startYear: now.getFullYear(),
        startMonth: now.getMonth() + 1,
        endYear: now.getFullYear() + 1,
        endMonth: 12,
      });
      toast.success('Version created');
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', type: ForecastVersionType.WhatIf });
      loadVersions();
    } catch {
      toast.error('Failed to create version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = async (version: ForecastVersion) => {
    const name = prompt('Enter name for the cloned version:', `${version.name} (Copy)`);
    if (!name) return;

    try {
      await forecastVersionsService.clone(version.id, {
        name,
        type: ForecastVersionType.WhatIf,
        copyForecasts: true,
      });
      toast.success('Version cloned successfully');
      loadVersions();
    } catch {
      toast.error('Failed to clone version');
    }
  };

  const handlePromote = async (version: ForecastVersion) => {
    if (!confirm(`Promote "${version.name}" to current? This will archive the existing current version.`)) return;

    try {
      await forecastVersionsService.promote(version.id);
      toast.success('Version promoted to current');
      loadVersions();
    } catch {
      toast.error('Failed to promote version');
    }
  };

  const handleArchive = async (version: ForecastVersion) => {
    const reason = prompt('Enter archive reason (optional):');
    if (reason === null) return;

    try {
      await forecastVersionsService.archive(version.id, reason || undefined);
      toast.success('Version archived');
      loadVersions();
    } catch {
      toast.error('Failed to archive version');
    }
  };

  const handleDelete = async (version: ForecastVersion) => {
    if (!confirm(`Delete "${version.name}"? This cannot be undone.`)) return;

    try {
      await forecastVersionsService.delete(version.id);
      toast.success('Version deleted');
      loadVersions();
    } catch {
      toast.error('Failed to delete version. It may have forecasts associated.');
    }
  };

  const handleCompare = async () => {
    if (!selectedVersion1 || !selectedVersion2) {
      toast.error('Please select two versions to compare');
      return;
    }
    if (selectedVersion1 === selectedVersion2) {
      toast.error('Please select different versions');
      return;
    }

    setIsComparing(true);
    try {
      const data = await forecastVersionsService.compare(selectedVersion1, selectedVersion2);
      setCompareData(data);
      setShowCompareModal(true);
    } catch {
      toast.error('Failed to compare versions');
    } finally {
      setIsComparing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatPeriodRange = (v: ForecastVersion) => {
    return `${getMonthShortName(v.startMonth)} ${v.startYear} - ${getMonthShortName(v.endMonth)} ${v.endYear}`;
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage forecast versions.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Versions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and compare forecast versions for what-if analysis
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Version
        </button>
      </div>

      {/* Compare Tool */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <GitCompare className="w-5 h-5" />
          Compare Versions
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Version 1</label>
            <select
              value={selectedVersion1}
              onChange={(e) => setSelectedVersion1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Version 2</label>
            <select
              value={selectedVersion2}
              onChange={(e) => setSelectedVersion2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={isComparing || !selectedVersion1 || !selectedVersion2}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4" />
            {isComparing ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show archived versions
        </label>
      </div>

      {/* Versions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Based On</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Loading versions...
                </td>
              </tr>
            ) : versions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No versions found. Create one to get started.
                </td>
              </tr>
            ) : (
              versions.map(version => (
                <tr key={version.id} className={version.archivedAt ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{version.name}</div>
                    {version.description && (
                      <div className="text-sm text-gray-500">{version.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getVersionTypeColor(version.type)}`}>
                      {version.typeName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPeriodRange(version)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.basedOnVersionName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(version.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {version.isCurrent && (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                    {version.archivedAt && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleClone(version)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Clone version"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {!version.isCurrent && !version.archivedAt && (
                        <button
                          onClick={() => handlePromote(version)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Promote to current"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                      )}
                      {!version.isCurrent && !version.archivedAt && (
                        <button
                          onClick={() => handleArchive(version)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      {!version.isCurrent && (
                        <button
                          onClick={() => handleDelete(version)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Version</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q1 2025 What-If"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ForecastVersionType.WhatIf}>What-If Scenario</option>
                  <option value={ForecastVersionType.Import}>Import</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && compareData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Version Comparison</h2>
                <p className="text-sm text-gray-500">
                  {compareData.version1.name} vs {compareData.version2.name}
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">{compareData.version1.name}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {compareData.summary.totalHoursVersion1.toLocaleString()} hrs
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">{compareData.version2.name}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {compareData.summary.totalHoursVersion2.toLocaleString()} hrs
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Difference</div>
                  <div className={`text-2xl font-bold flex items-center gap-1 ${
                    compareData.summary.hoursDifference > 0 ? 'text-green-600' :
                    compareData.summary.hoursDifference < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {compareData.summary.hoursDifference > 0 && <ArrowUp className="w-5 h-5" />}
                    {compareData.summary.hoursDifference < 0 && <ArrowDown className="w-5 h-5" />}
                    {compareData.summary.hoursDifference === 0 && <Minus className="w-5 h-5" />}
                    {Math.abs(compareData.summary.hoursDifference).toLocaleString()} hrs
                  </div>
                  <div className="text-xs text-gray-500">
                    {compareData.summary.percentChange > 0 ? '+' : ''}{compareData.summary.percentChange}%
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Changes</div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-green-600 text-sm">+{compareData.summary.newForecastsCount} new</span>
                    <span className="text-red-600 text-sm">-{compareData.summary.removedForecastsCount} removed</span>
                    <span className="text-yellow-600 text-sm">{compareData.summary.changedForecastsCount} changed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{compareData.version1.name}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{compareData.version2.name}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {compareData.comparisons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No forecasts to compare
                      </td>
                    </tr>
                  ) : (
                    compareData.comparisons.map((item, idx) => (
                      <tr key={idx} className={
                        item.isNew ? 'bg-green-50' :
                        item.isRemoved ? 'bg-red-50' :
                        item.isChanged ? 'bg-yellow-50' : ''
                      }>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.projectName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.positionTitle}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.assigneeName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {getMonthShortName(item.month)} {item.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {item.version1Hours !== undefined ? item.version1Hours : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {item.version2Hours !== undefined ? item.version2Hours : '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          item.hoursDifference > 0 ? 'text-green-600' :
                          item.hoursDifference < 0 ? 'text-red-600' : ''
                        }`}>
                          {item.hoursDifference > 0 ? '+' : ''}{item.hoursDifference !== 0 ? item.hoursDifference : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isNew && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">New</span>
                          )}
                          {item.isRemoved && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Removed</span>
                          )}
                          {item.isChanged && (
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Changed</span>
                          )}
                          {!item.isNew && !item.isRemoved && !item.isChanged && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

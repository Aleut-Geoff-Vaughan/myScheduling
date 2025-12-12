import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCostRates,
  useCreateCostRate,
  useUpdateCostRate,
  useDeleteCostRate,
  useImportCostRates,
  useExportCostRates,
  useCostRateImportHistory,
} from '../hooks/useCostRates';
import type { EmployeeCostRate, CreateCostRateRequest, UpdateCostRateRequest, CostRateImportBatch } from '../types/forecast';
import { getCostRateSourceLabel, getImportStatusLabel, CostRateImportStatus } from '../types/forecast';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../services/peopleService';
import type { Person } from '../types/api';

export function CostRatesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<EmployeeCostRate | null>(null);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CreateCostRateRequest>({
    userId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: '',
    loadedCostRate: 0,
    notes: '',
  });

  // Fetch cost rates
  const { data: costRates = [], isLoading: ratesLoading } = useCostRates({
    includeInactive: showInactive,
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery<Person[]>({
    queryKey: ['people'],
    queryFn: () => peopleService.getPeople(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch import history
  const { data: importHistory = [], isLoading: historyLoading } = useCostRateImportHistory();

  // Mutations
  const createMutation = useCreateCostRate();
  const updateMutation = useUpdateCostRate();
  const deleteMutation = useDeleteCostRate();
  const importMutation = useImportCostRates();
  const exportMutation = useExportCostRates();

  // Filter rates by search term
  const filteredRates = costRates.filter(rate => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      rate.userDisplayName?.toLowerCase().includes(search) ||
      rate.userEmail?.toLowerCase().includes(search)
    );
  });

  // Group rates by user for display
  const ratesByUser = filteredRates.reduce((acc, rate) => {
    const key = rate.userId;
    if (!acc[key]) {
      acc[key] = {
        userId: rate.userId,
        displayName: rate.userDisplayName || 'Unknown User',
        email: rate.userEmail || '',
        rates: [],
      };
    }
    acc[key].rates.push(rate);
    return acc;
  }, {} as Record<string, { userId: string; displayName: string; email: string; rates: EmployeeCostRate[] }>);

  const handleOpenModal = (rate?: EmployeeCostRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        userId: rate.userId,
        effectiveDate: rate.effectiveDate.split('T')[0],
        endDate: rate.endDate?.split('T')[0] || '',
        loadedCostRate: rate.loadedCostRate,
        notes: rate.notes || '',
      });
    } else {
      setEditingRate(null);
      setFormData({
        userId: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        endDate: '',
        loadedCostRate: 0,
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRate(null);
  };

  const handleSave = async () => {
    try {
      if (editingRate) {
        await updateMutation.mutateAsync({
          id: editingRate.id,
          request: {
            effectiveDate: formData.effectiveDate,
            endDate: formData.endDate || undefined,
            loadedCostRate: formData.loadedCostRate,
            notes: formData.notes || undefined,
          } as UpdateCostRateRequest,
        });
        toast.success('Cost rate updated');
      } else {
        await createMutation.mutateAsync({
          ...formData,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Cost rate created');
      }
      handleCloseModal();
    } catch {
      toast.error(editingRate ? 'Failed to update cost rate' : 'Failed to create cost rate');
    }
  };

  const handleDelete = async (rate: EmployeeCostRate) => {
    if (!confirm(`Are you sure you want to delete this cost rate for ${rate.userDisplayName}?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(rate.id);
      toast.success('Cost rate deleted');
    } catch {
      toast.error('Failed to delete cost rate');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importMutation.mutateAsync(file);
      toast.success(`Imported ${result.successCount} records. ${result.failedCount} failed.`);
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch {
      toast.error('Failed to import cost rates');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({ includeInactive: showInactive });
      toast.success('Cost rates exported');
    } catch {
      toast.error('Failed to export cost rates');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isLoading = ratesLoading;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/forecast" className="hover:text-emerald-600">Forecasting</Link>
            <span>/</span>
            <span>Cost Rates</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Cost Rates</h1>
          <p className="text-gray-600 mt-1">Manage loaded cost rates (LCR) for employees</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowImportHistory(!showImportHistory)}
            className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {showImportHistory ? 'Hide History' : 'Import History'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {importMutation.isPending ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Rate
          </button>
        </div>
      </div>

      {/* Import History Panel */}
      {showImportHistory && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Import History</h3>
          {historyLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : importHistory.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No import history found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Success</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Errors</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importHistory.slice(0, 5).map((batch: CostRateImportBatch) => (
                    <tr key={batch.id}>
                      <td className="px-3 py-2 text-gray-900">{batch.fileName}</td>
                      <td className="px-3 py-2 text-gray-600">{formatDate(batch.createdAt)}</td>
                      <td className="px-3 py-2 text-center text-green-600">{batch.successCount}</td>
                      <td className="px-3 py-2 text-center text-red-600">{batch.errorCount}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          batch.status === CostRateImportStatus.Completed
                            ? 'bg-green-100 text-green-800'
                            : batch.status === CostRateImportStatus.CompletedWithErrors
                            ? 'bg-yellow-100 text-yellow-800'
                            : batch.status === CostRateImportStatus.Failed
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getImportStatusLabel(batch.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="searchCostRates" className="sr-only">Search employees</label>
            <input
              id="searchCostRates"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Show expired rates
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Object.keys(ratesByUser).length}</div>
            <div className="text-xs text-gray-500">Employees with Rates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{costRates.length}</div>
            <div className="text-xs text-gray-500">Total Rate Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(
                costRates.reduce((sum, r) => sum + r.loadedCostRate, 0) / (costRates.length || 1)
              )}
            </div>
            <div className="text-xs text-gray-500">Average Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{importHistory.length}</div>
            <div className="text-xs text-gray-500">Import Batches</div>
          </div>
        </div>
      </div>

      {/* Cost Rates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {Object.keys(ratesByUser).length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cost rates configured</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a cost rate or importing from CSV.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate ($/hr)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.values(ratesByUser).sort((a, b) => a.displayName.localeCompare(b.displayName)).flatMap(user =>
                  user.rates.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()).map((rate, idx) => {
                    const isExpired = rate.endDate && new Date(rate.endDate) < new Date();
                    return (
                      <tr key={rate.id} className={`hover:bg-gray-50 ${isExpired ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">Prev. rate</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${isExpired ? 'text-gray-500' : 'text-emerald-600'}`}>
                            {formatCurrency(rate.loadedCostRate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(rate.effectiveDate)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{rate.endDate ? formatDate(rate.endDate) : '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {getCostRateSourceLabel(rate.source)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenModal(rate)}
                              className="text-gray-600 hover:text-emerald-600"
                              title="Edit rate"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rate)}
                              className="text-gray-600 hover:text-red-600"
                              title="Delete rate"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Format Help */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Import Format</h4>
        <p className="text-sm text-blue-800 mb-2">
          Upload a CSV file with the following columns:
        </p>
        <code className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-900 block">
          Email,EffectiveDate,LoadedCostRate,EndDate,Notes
        </code>
        <p className="text-xs text-blue-700 mt-2">
          Example: john.doe@company.com,2025-01-01,125.50,2025-12-31,Annual rate
        </p>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingRate ? 'Edit Cost Rate' : 'Add Cost Rate'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="rateEmployee" className="block text-sm font-medium text-gray-700 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="rateEmployee"
                    value={formData.userId}
                    onChange={(e) => setFormData(f => ({ ...f, userId: e.target.value }))}
                    disabled={!!editingRate}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                  >
                    <option value="">Select employee...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="rateAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Loaded Cost Rate ($/hr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="rateAmount"
                    type="number"
                    value={formData.loadedCostRate}
                    onChange={(e) => setFormData(f => ({ ...f, loadedCostRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={0}
                    step={0.01}
                    placeholder="e.g., 125.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rateEffectiveDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="rateEffectiveDate"
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData(f => ({ ...f, effectiveDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="rateEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      id="rateEndDate"
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="rateNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="rateNotes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!formData.userId || !formData.effectiveDate || formData.loadedCostRate <= 0 || createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostRatesPage;

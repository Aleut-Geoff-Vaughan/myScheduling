import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { projectsService } from '../services/projectsService';
import {
  forecastVersionsService,
  forecastImportExportService,
  ForecastImportExportType,
  ForecastImportExportStatus,
  downloadBlob,
  getImportExportStatusColor,
  formatFileSize,
  getMonthName,
} from '../services/forecastService';
import type {
  ImportPreviewResponse,
  ImportValidationResult,
} from '../services/forecastService';

export function ForecastImportExportPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  const queryClient = useQueryClient();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'history'>('export');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [importOptions, setImportOptions] = useState({
    updateExisting: true,
    createNewVersion: false,
    newVersionName: '',
    newVersionDescription: '',
  });
  const [isDragging, setIsDragging] = useState(false);

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', tenantId],
    queryFn: () => projectsService.getAll({ tenantId }),
    enabled: !!tenantId,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['forecastVersions', tenantId],
    queryFn: () => forecastVersionsService.getAll({ tenantId }),
    enabled: !!tenantId,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['importExportHistory', tenantId],
    queryFn: () => forecastImportExportService.getHistory(tenantId, 50),
    enabled: !!tenantId && activeTab === 'history',
  });

  // Export mutations
  const exportCsvMutation = useMutation({
    mutationFn: () =>
      forecastImportExportService.exportCsv({
        tenantId,
        versionId: selectedVersionId || undefined,
        projectId: selectedProjectId || undefined,
        year: selectedYear,
        month: selectedMonth,
      }),
    onSuccess: (blob) => {
      const filename = `Forecasts_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      downloadBlob(blob, filename);
      toast.success('CSV export downloaded');
      queryClient.invalidateQueries({ queryKey: ['importExportHistory'] });
    },
    onError: () => toast.error('Failed to export CSV'),
  });

  const exportExcelMutation = useMutation({
    mutationFn: () =>
      forecastImportExportService.exportExcel({
        tenantId,
        versionId: selectedVersionId || undefined,
        projectId: selectedProjectId || undefined,
        year: selectedYear,
        month: selectedMonth,
      }),
    onSuccess: (blob) => {
      const filename = `Forecasts_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Excel export downloaded');
      queryClient.invalidateQueries({ queryKey: ['importExportHistory'] });
    },
    onError: () => toast.error('Failed to export Excel'),
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: () =>
      forecastImportExportService.downloadTemplate(tenantId, selectedProjectId || undefined),
    onSuccess: (blob) => {
      downloadBlob(blob, 'ForecastImportTemplate.xlsx');
      toast.success('Template downloaded');
    },
    onError: () => toast.error('Failed to download template'),
  });

  // Import mutations
  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      forecastImportExportService.importPreview({
        tenantId,
        versionId: selectedVersionId || undefined,
        file,
      }),
    onSuccess: (data) => {
      setPreviewData(data);
      if (data.isDuplicateImport) {
        toast('This file was previously imported', { icon: '!' });
      }
    },
    onError: (error: Error) => toast.error(error.message || 'Preview failed'),
  });

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected');
      return forecastImportExportService.importCommit({
        tenantId,
        versionId: selectedVersionId || undefined,
        updateExisting: importOptions.updateExisting,
        createNewVersion: importOptions.createNewVersion,
        newVersionName: importOptions.newVersionName || undefined,
        newVersionDescription: importOptions.newVersionDescription || undefined,
        file: selectedFile,
      });
    },
    onSuccess: (data) => {
      toast.success(
        `Import complete: ${data.createdCount} created, ${data.updatedCount} updated`
      );
      setSelectedFile(null);
      setPreviewData(null);
      queryClient.invalidateQueries({ queryKey: ['importExportHistory'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
      queryClient.invalidateQueries({ queryKey: ['forecastVersions'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Import failed'),
  });

  // File handling
  const handleFileSelect = useCallback(
    (file: File) => {
      const validExtensions = ['.csv', '.xlsx'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(ext)) {
        toast.error('Only CSV and Excel files are supported');
        return;
      }
      setSelectedFile(file);
      setPreviewData(null);
      previewMutation.mutate(file);
    },
    [previewMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const reDownloadExport = async (id: string, fileName: string) => {
    try {
      const blob = await forecastImportExportService.reDownload(id);
      downloadBlob(blob, fileName);
      toast.success('File downloaded');
    } catch {
      toast.error('Failed to re-download file');
    }
  };

  // Generate years array
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const getStatusIcon = (status: ForecastImportExportStatus) => {
    switch (status) {
      case ForecastImportExportStatus.Completed:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case ForecastImportExportStatus.CompletedWithErrors:
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case ForecastImportExportStatus.Failed:
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Import/Export</h1>
          <p className="text-gray-500 mt-1">Export forecasts to CSV/Excel or import from files</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'export', label: 'Export', icon: Download },
            { id: 'import', label: 'Import', icon: Upload },
            { id: 'history', label: 'History', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Export Forecasts</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <div className="relative">
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                >
                  <option value="">Current Version</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.typeName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <div className="relative">
                <select
                  value={selectedYear ?? ''}
                  onChange={(e) =>
                    setSelectedYear(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                >
                  <option value="">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <div className="relative">
                <select
                  value={selectedMonth ?? ''}
                  onChange={(e) =>
                    setSelectedMonth(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => exportCsvMutation.mutate()}
              disabled={exportCsvMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              {exportCsvMutation.isPending ? 'Exporting...' : 'Export as CSV'}
            </button>

            <button
              onClick={() => exportExcelMutation.mutate()}
              disabled={exportExcelMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5" />
              {exportExcelMutation.isPending ? 'Exporting...' : 'Export as Excel'}
            </button>

            <button
              onClick={() => downloadTemplateMutation.mutate()}
              disabled={downloadTemplateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {downloadTemplateMutation.isPending ? 'Downloading...' : 'Download Import Template'}
            </button>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Import Forecasts</h2>

            {/* Version Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Version
              </label>
              <div className="relative max-w-xs">
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                >
                  <option value="">Current Version</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.typeName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Drag and Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                {selectedFile ? selectedFile.name : 'Drag and drop a file here, or click to select'}
              </p>
              <p className="text-sm text-gray-500">Supports CSV and Excel (.xlsx) files</p>
            </div>

            {/* Import Options */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={importOptions.updateExisting}
                  onChange={(e) =>
                    setImportOptions({ ...importOptions, updateExisting: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Update existing forecasts</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={importOptions.createNewVersion}
                  onChange={(e) =>
                    setImportOptions({ ...importOptions, createNewVersion: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Create new version for imported data</span>
              </label>

              {importOptions.createNewVersion && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="Version name"
                    value={importOptions.newVersionName}
                    onChange={(e) =>
                      setImportOptions({ ...importOptions, newVersionName: e.target.value })
                    }
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={importOptions.newVersionDescription}
                    onChange={(e) =>
                      setImportOptions({ ...importOptions, newVersionDescription: e.target.value })
                    }
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview Results */}
          {previewMutation.isPending && (
            <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <span>Analyzing file...</span>
            </div>
          )}

          {previewData && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Preview Results</h3>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Rows</p>
                  <p className="text-2xl font-bold">{previewData.totalRows}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-700">{previewData.validRows}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Invalid Rows</p>
                  <p className="text-2xl font-bold text-red-700">{previewData.invalidRows}</p>
                </div>
              </div>

              {/* Duplicate Warning */}
              {previewData.isDuplicateImport && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800">
                      This file was previously imported
                      {previewData.previousImportDate &&
                        ` on ${format(new Date(previewData.previousImportDate), 'MMM d, yyyy HH:mm')}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Details */}
              {previewData.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Preview (first {Math.min(previewData.items.length, 100)} rows)
                  </h4>
                  <div className="overflow-auto max-h-64 border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Row
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Year
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Month
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Hours
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Errors
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.items.map((item: ImportValidationResult) => (
                          <tr
                            key={item.rowNumber}
                            className={item.isValid ? '' : 'bg-red-50'}
                          >
                            <td className="px-4 py-2 text-sm">{item.rowNumber}</td>
                            <td className="px-4 py-2">
                              {item.isValid ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">{item.year || '-'}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.month ? getMonthName(item.month) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.forecastedHours || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-red-600">
                              {item.errors.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Button */}
              <div className="flex gap-4">
                <button
                  onClick={() => commitMutation.mutate()}
                  disabled={commitMutation.isPending || previewData.validRows === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  {commitMutation.isPending
                    ? 'Importing...'
                    : `Import ${previewData.validRows} Valid Rows`}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Import/Export History</h2>
            <button
              onClick={() => refetchHistory()}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No import/export history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Records
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            item.type === ForecastImportExportType.Export
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.type === ForecastImportExportType.Export ? (
                            <Download className="w-3 h-3" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {item.typeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(new Date(item.operationAt), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.operationByUserName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{item.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(item.fileSizeBytes)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getImportExportStatusColor(
                            item.status
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-green-600">
                          {item.recordsSucceeded} succeeded
                        </div>
                        {item.recordsFailed > 0 && (
                          <div className="text-red-600">{item.recordsFailed} failed</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.type === ForecastImportExportType.Export && (
                          <button
                            onClick={() => reDownloadExport(item.id, item.fileName)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Re-download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

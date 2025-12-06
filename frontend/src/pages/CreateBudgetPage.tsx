import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { projectsService } from '../services/projectsService';
import { projectBudgetsService } from '../services/projectBudgetsService';
import wbsService from '../services/wbsService';
import {
  ProjectBudgetType,
  type CreateProjectBudgetRequest,
  type CreateBudgetLineRequest,
} from '../types/budget';
import * as XLSX from 'xlsx';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type BudgetEntryMode = 'project' | 'wbs';

export function CreateBudgetPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { currentWorkspace, availableTenants } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [budgetType, setBudgetType] = useState<ProjectBudgetType>(ProjectBudgetType.Original);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entryMode, setEntryMode] = useState<BudgetEntryMode>('project');
  // Project-level: key is "year-month"
  const [monthlyHours, setMonthlyHours] = useState<Record<string, number>>({});
  // WBS-level: key is "wbsId-year-month"
  const [wbsHours, setWbsHours] = useState<Record<string, number>>({});
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getById(projectId!),
    enabled: !!projectId,
  });

  // Fetch fiscal year info
  const { data: fiscalYearInfo, isLoading: fiscalYearLoading } = useQuery({
    queryKey: ['fiscal-year-current'],
    queryFn: () => projectBudgetsService.getCurrentFiscalYear(),
    enabled: !!tenantId,
  });

  // Fetch WBS elements for the project
  const { data: wbsResponse, isLoading: wbsLoading } = useQuery({
    queryKey: ['wbs-elements', projectId],
    queryFn: () => wbsService.getWbsElements({ projectId: projectId!, pageSize: 100 }),
    enabled: !!projectId,
  });

  const wbsElements = wbsResponse?.items || [];

  // Initialize monthly hours based on fiscal year
  useEffect(() => {
    if (fiscalYearInfo?.months) {
      const initial: Record<string, number> = {};
      fiscalYearInfo.months.forEach(m => {
        initial[`${m.year}-${m.month}`] = 0;
      });
      setMonthlyHours(initial);
    }
  }, [fiscalYearInfo]);

  // Calculate totals
  const projectTotalHours = Object.values(monthlyHours).reduce((sum, h) => sum + (h || 0), 0);
  const wbsTotalHours = Object.values(wbsHours).reduce((sum, h) => sum + (h || 0), 0);
  const totalHours = entryMode === 'project' ? projectTotalHours : wbsTotalHours;

  // Calculate WBS row totals
  const getWbsRowTotal = (wbsId: string) => {
    return fiscalYearInfo?.months?.reduce((sum, m) => {
      const key = `${wbsId}-${m.year}-${m.month}`;
      return sum + (wbsHours[key] || 0);
    }, 0) || 0;
  };

  // Calculate month column totals for WBS mode
  const getMonthColumnTotal = (year: number, month: number) => {
    return wbsElements.reduce((sum, wbs) => {
      const key = `${wbs.id}-${year}-${month}`;
      return sum + (wbsHours[key] || 0);
    }, 0);
  };

  // Create mutation
  const createBudgetMutation = useMutation({
    mutationFn: (request: CreateProjectBudgetRequest) => projectBudgetsService.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget created successfully');
      navigate('/forecast/budgets');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create budget'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!project || !fiscalYearInfo) return;

    let budgetLines: CreateBudgetLineRequest[] = [];

    if (entryMode === 'project') {
      budgetLines = Object.entries(monthlyHours)
        .filter(([_, hours]) => hours > 0)
        .map(([key, hours]) => {
          const [year, month] = key.split('-').map(Number);
          return { year, month, budgetedHours: hours };
        });
    } else {
      budgetLines = Object.entries(wbsHours)
        .filter(([_, hours]) => hours > 0)
        .map(([key, hours]) => {
          const [wbsId, year, month] = key.split('-');
          return {
            year: parseInt(year),
            month: parseInt(month),
            budgetedHours: hours,
            wbsElementId: wbsId,
          };
        });
    }

    createBudgetMutation.mutate({
      projectId: project.id,
      budgetType,
      fiscalYear: fiscalYearInfo.fiscalYear,
      name: name || undefined,
      description: description || undefined,
      budgetLines,
    });
  };

  // Handle spreadsheet import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

      if (jsonData.length < 2) {
        setImportError('Spreadsheet must have at least a header row and one data row');
        return;
      }

      const headerRow = jsonData[0].map(h => String(h).toLowerCase().trim());

      // Detect format: WBS-level or Project-level
      const hasWbsColumn = headerRow.some(h => h.includes('wbs') || h.includes('element'));

      if (hasWbsColumn && entryMode === 'project') {
        setEntryMode('wbs');
      }

      // Find month columns - look for month names or month/year patterns
      const monthColumns: { index: number; year: number; month: number }[] = [];

      headerRow.forEach((header, index) => {
        // Try to match "Jan 2025", "January 2025", "2025-01", "01/2025", etc.
        const headerStr = String(header);

        // Try "Month Year" format
        for (let m = 0; m < 12; m++) {
          const shortMonth = MONTH_NAMES[m].toLowerCase();
          const fullMonth = FULL_MONTH_NAMES[m].toLowerCase();

          if (headerStr.toLowerCase().includes(shortMonth) || headerStr.toLowerCase().includes(fullMonth)) {
            // Extract year
            const yearMatch = headerStr.match(/\b(20\d{2})\b/);
            if (yearMatch) {
              monthColumns.push({ index, year: parseInt(yearMatch[1]), month: m + 1 });
            }
          }
        }

        // Try "YYYY-MM" format
        const isoMatch = headerStr.match(/^(20\d{2})-(\d{1,2})$/);
        if (isoMatch) {
          monthColumns.push({ index, year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]) });
        }
      });

      if (monthColumns.length === 0) {
        setImportError('Could not find month columns. Use format like "Jan 2025" or "2025-01"');
        return;
      }

      // Find WBS column if in WBS mode
      let wbsColumnIndex = -1;
      if (hasWbsColumn) {
        wbsColumnIndex = headerRow.findIndex(h => h.includes('wbs') || h.includes('element') || h.includes('code'));
      }

      // Parse data rows
      const newMonthlyHours: Record<string, number> = { ...monthlyHours };
      const newWbsHours: Record<string, number> = { ...wbsHours };

      for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];
        if (!row || row.length === 0) continue;

        let wbsId: string | null = null;

        if (wbsColumnIndex >= 0) {
          const wbsCode = String(row[wbsColumnIndex] || '').trim();
          // Find matching WBS element
          const wbsElement = wbsElements.find(w =>
            w.code.toLowerCase() === wbsCode.toLowerCase() ||
            w.description?.toLowerCase().includes(wbsCode.toLowerCase())
          );
          if (wbsElement) {
            wbsId = wbsElement.id;
          }
        }

        // Parse hours from each month column
        for (const mc of monthColumns) {
          const hours = parseFloat(String(row[mc.index] || '0')) || 0;
          if (hours > 0) {
            if (wbsId) {
              const key = `${wbsId}-${mc.year}-${mc.month}`;
              newWbsHours[key] = (newWbsHours[key] || 0) + hours;
            } else {
              const key = `${mc.year}-${mc.month}`;
              newMonthlyHours[key] = (newMonthlyHours[key] || 0) + hours;
            }
          }
        }
      }

      if (hasWbsColumn) {
        setWbsHours(newWbsHours);
        setEntryMode('wbs');
      } else {
        setMonthlyHours(newMonthlyHours);
        setEntryMode('project');
      }

      toast.success(`Imported ${jsonData.length - 1} rows from spreadsheet`);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to parse spreadsheet. Please check the format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!fiscalYearInfo?.months) return;

    const headers = entryMode === 'wbs'
      ? ['WBS Code', 'WBS Description', ...fiscalYearInfo.months.map(m => m.label)]
      : ['Month', 'Budgeted Hours'];

    const data: (string | number)[][] = [headers];

    if (entryMode === 'wbs') {
      // Add a row for each WBS element
      wbsElements.forEach(wbs => {
        data.push([wbs.code, wbs.description || '', ...fiscalYearInfo.months!.map(() => 0)]);
      });
      if (wbsElements.length === 0) {
        // Add example rows
        data.push(['1.1', 'Example Task 1', ...fiscalYearInfo.months!.map(() => 0)]);
        data.push(['1.2', 'Example Task 2', ...fiscalYearInfo.months!.map(() => 0)]);
      }
    } else {
      // Add a row for each month
      fiscalYearInfo.months.forEach(m => {
        data.push([m.label, 0]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget');

    // Set column widths
    ws['!cols'] = entryMode === 'wbs'
      ? [{ wch: 15 }, { wch: 30 }, ...fiscalYearInfo.months.map(() => ({ wch: 12 }))]
      : [{ wch: 15 }, { wch: 15 }];

    XLSX.writeFile(wb, `budget_template_${project?.name || 'project'}_FY${fiscalYearInfo.fiscalYear}.xlsx`);
  };

  const isLoading = projectLoading || fiscalYearLoading || wbsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Project Not Found</h2>
          <p className="text-red-600 mt-1">The project could not be loaded.</p>
          <button
            onClick={() => navigate('/forecast/budgets')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Budgets
          </button>
        </div>
      </div>
    );
  }

  if (!fiscalYearInfo) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-yellow-800 font-medium">Fiscal Year Not Configured</h2>
          <p className="text-yellow-600 mt-1">Please configure your fiscal year in Tenant Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/forecast/budgets')}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Budgets
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Budget</h1>
        <p className="text-gray-600 mt-1">
          {project.name} &bull; FY{fiscalYearInfo.fiscalYear}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Budget Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget-type" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Type
              </label>
              <select
                id="budget-type"
                value={budgetType}
                onChange={(e) => setBudgetType(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value={ProjectBudgetType.Original}>Original</option>
                <option value={ProjectBudgetType.Reforecast}>Re-forecast</option>
                <option value={ProjectBudgetType.Amendment}>Amendment</option>
                <option value={ProjectBudgetType.WhatIf}>What-If</option>
              </select>
            </div>
            <div>
              <label htmlFor="budget-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                id="budget-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q2 Re-forecast"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="budget-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="budget-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Add any notes or context for this budget version"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import from Spreadsheet</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file (.xlsx) to import budget hours. You can download a template to get started.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>

            <label className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Spreadsheet
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {importError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {importError}
            </div>
          )}
        </div>

        {/* Entry Mode Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Budget Hours Entry</h2>
              <p className="text-sm text-gray-600">
                Enter hours manually or import from a spreadsheet
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-emerald-600">
                Total: {totalHours.toLocaleString()} hrs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg mb-6">
            <span className="text-sm font-medium text-gray-700">Entry Level:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEntryMode('project')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  entryMode === 'project'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Project Total
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('wbs')}
                disabled={wbsElements.length === 0}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  entryMode === 'wbs'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                By WBS Element ({wbsElements.length})
              </button>
            </div>
          </div>

          {entryMode === 'project' ? (
            /* Project-level budget entry */
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {fiscalYearInfo.months?.map((m) => {
                  const key = `${m.year}-${m.month}`;
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{m.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={monthlyHours[key] || ''}
                        onChange={(e) => setMonthlyHours(prev => ({
                          ...prev,
                          [key]: parseInt(e.target.value) || 0,
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* WBS-level budget entry */
            <div>
              {wbsElements.length === 0 ? (
                <div className="p-6 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="font-medium">No WBS elements found for this project</p>
                  <p className="text-sm mt-1">Create WBS elements first or use Project Total entry mode.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                          WBS Element
                        </th>
                        {fiscalYearInfo.months?.map((m) => (
                          <th key={`${m.year}-${m.month}`} className="px-2 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider min-w-[80px]">
                            {m.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider bg-gray-100 min-w-[100px]">
                          Row Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {wbsElements.map((wbs) => (
                        <tr key={wbs.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                            <div className="font-medium">{wbs.code}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[180px]" title={wbs.description}>
                              {wbs.description}
                            </div>
                          </td>
                          {fiscalYearInfo.months?.map((m) => {
                            const key = `${wbs.id}-${m.year}-${m.month}`;
                            return (
                              <td key={key} className="px-1 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={wbsHours[key] || ''}
                                  onChange={(e) => setWbsHours(prev => ({
                                    ...prev,
                                    [key]: parseInt(e.target.value) || 0,
                                  }))}
                                  className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                  placeholder="0"
                                />
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 bg-gray-50">
                            {getWbsRowTotal(wbs.id).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-gray-100 font-medium">
                        <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                          Column Totals
                        </td>
                        {fiscalYearInfo.months?.map((m) => (
                          <td key={`total-${m.year}-${m.month}`} className="px-2 py-3 text-center text-emerald-600">
                            {getMonthColumnTotal(m.year, m.month).toLocaleString()}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-emerald-700 bg-emerald-50 font-bold">
                          {totalHours.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button
            type="button"
            onClick={() => navigate('/forecast/budgets')}
            className="px-6 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createBudgetMutation.isPending || totalHours === 0}
            className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createBudgetMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Budget'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateBudgetPage;

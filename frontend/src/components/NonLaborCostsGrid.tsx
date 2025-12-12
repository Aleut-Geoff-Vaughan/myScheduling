import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useNonLaborCostTypes, useNonLaborForecasts, useUpsertNonLaborForecast } from '../hooks/useNonLaborCosts';
import type { NonLaborForecast, NonLaborCostType } from '../types/forecast';
import { getCostCategoryLabel } from '../types/forecast';
import { getMonthShortName } from '../services/forecastService';

interface NonLaborCostsGridProps {
  projectId: string;
  months: { year: number; month: number }[];
  versionId?: string;
  year: number;
}

export function NonLaborCostsGrid({ projectId, months, year }: NonLaborCostsGridProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(true);

  // Fetch cost types
  const { data: costTypes = [], isLoading: costTypesLoading } = useNonLaborCostTypes(false);

  // Fetch forecasts for this project
  const { data: forecasts = [], isLoading: forecastsLoading } = useNonLaborForecasts({
    projectId,
    year,
  });

  // Upsert mutation
  const upsertMutation = useUpsertNonLaborForecast();

  // Build forecast lookup map
  const forecastMap = useMemo(() => {
    const map: Record<string, NonLaborForecast> = {};
    forecasts.forEach(f => {
      const key = `${f.nonLaborCostTypeId}-${f.year}-${f.month}`;
      map[key] = f;
    });
    return map;
  }, [forecasts]);

  // Group cost types by category
  const costTypesByCategory = useMemo(() => {
    const groups: Record<number, NonLaborCostType[]> = {};
    costTypes.forEach(ct => {
      if (!groups[ct.category]) {
        groups[ct.category] = [];
      }
      groups[ct.category].push(ct);
    });
    // Sort by category and then by sortOrder within each category
    Object.keys(groups).forEach(cat => {
      groups[Number(cat)].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
    return groups;
  }, [costTypes]);

  // Calculate totals
  const totals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let total = 0;

    months.forEach(m => {
      const key = `${m.year}-${m.month}`;
      byMonth[key] = 0;
    });

    forecasts.forEach(f => {
      const key = `${f.year}-${f.month}`;
      if (byMonth[key] !== undefined) {
        byMonth[key] += f.forecastedAmount;
        total += f.forecastedAmount;
      }
    });

    return { byMonth, total };
  }, [forecasts, months]);

  // Category totals
  const categoryTotals = useMemo(() => {
    const result: Record<number, { byMonth: Record<string, number>; total: number }> = {};

    Object.keys(costTypesByCategory).forEach(cat => {
      const category = Number(cat);
      const catTotals: Record<string, number> = {};
      let catTotal = 0;

      months.forEach(m => {
        catTotals[`${m.year}-${m.month}`] = 0;
      });

      costTypesByCategory[category].forEach(ct => {
        months.forEach(m => {
          const key = `${ct.id}-${m.year}-${m.month}`;
          const forecast = forecastMap[key];
          if (forecast) {
            catTotals[`${m.year}-${m.month}`] += forecast.forecastedAmount;
            catTotal += forecast.forecastedAmount;
          }
        });
      });

      result[category] = { byMonth: catTotals, total: catTotal };
    });

    return result;
  }, [costTypesByCategory, months, forecastMap]);

  const getCellKey = (costTypeId: string, year: number, month: number) =>
    `${costTypeId}-${year}-${month}`;

  const getCellForecast = (costTypeId: string, year: number, month: number) =>
    forecastMap[getCellKey(costTypeId, year, month)];

  const handleCellClick = (costTypeId: string, year: number, month: number) => {
    const cellKey = getCellKey(costTypeId, year, month);
    const forecast = getCellForecast(costTypeId, year, month);

    setEditingCell(cellKey);
    if (cellValues[cellKey] === undefined) {
      setCellValues(prev => ({
        ...prev,
        [cellKey]: forecast?.forecastedAmount || 0,
      }));
    }
  };

  const handleCellChange = (cellKey: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCellValues(prev => ({ ...prev, [cellKey]: numValue }));
  };

  const handleCellBlur = useCallback((costTypeId: string, year: number, month: number) => {
    const cellKey = getCellKey(costTypeId, year, month);
    const newValue = cellValues[cellKey] ?? 0;
    const forecast = getCellForecast(costTypeId, year, month);

    // Only save if there's a change
    const existingValue = forecast?.forecastedAmount || 0;
    if (newValue !== existingValue) {
      upsertMutation.mutate({
        projectId,
        costTypeId,
        year,
        month,
        amount: newValue,
      }, {
        onSuccess: () => {
          toast.success('Non-labor cost updated');
        },
        onError: () => {
          toast.error('Failed to update non-labor cost');
        },
      });
    }

    setEditingCell(null);
    // getCellForecast is intentionally excluded as it's a stable function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellValues, forecastMap, upsertMutation, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent, costTypeId: string, year: number, month: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur(costTypeId, year, month);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isLoading = costTypesLoading || forecastsLoading;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (costTypes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No cost types configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure non-labor cost types in Forecast Settings to enable non-labor cost forecasting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Non-Labor Costs
        </button>
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-emerald-600">{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px] sticky left-0 bg-gray-50">
                  Cost Type
                </th>
                {months.map(m => (
                  <th key={`${m.year}-${m.month}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                    {getMonthShortName(m.month)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28 sticky right-0 bg-gray-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.keys(costTypesByCategory).sort((a, b) => Number(a) - Number(b)).map(cat => {
                const category = Number(cat);
                const types = costTypesByCategory[category];
                const catTotal = categoryTotals[category];

                return (
                  <CategoryGroup
                    key={category}
                    category={category}
                    costTypes={types}
                    months={months}
                    forecastMap={forecastMap}
                    editingCell={editingCell}
                    cellValues={cellValues}
                    categoryTotals={catTotal}
                    onCellClick={handleCellClick}
                    onCellChange={handleCellChange}
                    onCellBlur={handleCellBlur}
                    onKeyDown={handleKeyDown}
                    formatCurrency={formatCurrency}
                  />
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-gray-100 font-medium">
                <td className="px-4 py-3 sticky left-0 bg-gray-100 text-sm text-gray-900">Grand Total</td>
                {months.map(m => {
                  const key = `${m.year}-${m.month}`;
                  return (
                    <td key={key} className="px-3 py-3 text-center text-sm text-gray-900">
                      {totals.byMonth[key] > 0 ? formatCurrency(totals.byMonth[key]) : '-'}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right text-sm text-emerald-600 font-semibold sticky right-0 bg-gray-100">
                  {formatCurrency(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CategoryGroupProps {
  category: number;
  costTypes: NonLaborCostType[];
  months: { year: number; month: number }[];
  forecastMap: Record<string, NonLaborForecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  categoryTotals: { byMonth: Record<string, number>; total: number };
  onCellClick: (costTypeId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (costTypeId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, costTypeId: string, year: number, month: number) => void;
  formatCurrency: (value: number) => string;
}

function CategoryGroup({
  category,
  costTypes,
  months,
  forecastMap,
  editingCell,
  cellValues,
  categoryTotals,
  onCellClick,
  onCellChange,
  onCellBlur,
  onKeyDown,
  formatCurrency,
}: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* Category Header Row */}
      <tr className="bg-gray-50">
        <td className="px-4 py-2 sticky left-0 bg-gray-50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {getCostCategoryLabel(category)}
          </button>
        </td>
        {months.map(m => {
          const key = `${m.year}-${m.month}`;
          return (
            <td key={key} className="px-3 py-2 text-center text-xs text-gray-600">
              {categoryTotals.byMonth[key] > 0 ? formatCurrency(categoryTotals.byMonth[key]) : ''}
            </td>
          );
        })}
        <td className="px-4 py-2 text-right text-xs font-medium text-gray-700 sticky right-0 bg-gray-50">
          {categoryTotals.total > 0 ? formatCurrency(categoryTotals.total) : ''}
        </td>
      </tr>
      {/* Cost Type Rows */}
      {expanded && costTypes.map(costType => (
        <CostTypeRow
          key={costType.id}
          costType={costType}
          months={months}
          forecastMap={forecastMap}
          editingCell={editingCell}
          cellValues={cellValues}
          onCellClick={onCellClick}
          onCellChange={onCellChange}
          onCellBlur={onCellBlur}
          onKeyDown={onKeyDown}
          formatCurrency={formatCurrency}
        />
      ))}
    </>
  );
}

interface CostTypeRowProps {
  costType: NonLaborCostType;
  months: { year: number; month: number }[];
  forecastMap: Record<string, NonLaborForecast>;
  editingCell: string | null;
  cellValues: Record<string, number>;
  onCellClick: (costTypeId: string, year: number, month: number) => void;
  onCellChange: (cellKey: string, value: string) => void;
  onCellBlur: (costTypeId: string, year: number, month: number) => void;
  onKeyDown: (e: React.KeyboardEvent, costTypeId: string, year: number, month: number) => void;
  formatCurrency: (value: number) => string;
}

function CostTypeRow({
  costType,
  months,
  forecastMap,
  editingCell,
  cellValues,
  onCellClick,
  onCellChange,
  onCellBlur,
  onKeyDown,
  formatCurrency,
}: CostTypeRowProps) {
  const rowTotal = useMemo(() => {
    return months.reduce((sum, m) => {
      const key = `${costType.id}-${m.year}-${m.month}`;
      const forecast = forecastMap[key];
      return sum + (forecast?.forecastedAmount || 0);
    }, 0);
  }, [costType.id, months, forecastMap]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 sticky left-0 bg-white pl-8">
        <div className="text-sm text-gray-900">{costType.name}</div>
        {costType.code && (
          <div className="text-xs text-gray-500">{costType.code}</div>
        )}
      </td>
      {months.map(m => {
        const cellKey = `${costType.id}-${m.year}-${m.month}`;
        const forecast = forecastMap[cellKey];
        const isEditing = editingCell === cellKey;
        const value = cellValues[cellKey] ?? forecast?.forecastedAmount ?? 0;

        return (
          <td
            key={cellKey}
            className="px-1 py-1 text-center bg-white cursor-pointer"
            onClick={() => onCellClick(costType.id, m.year, m.month)}
          >
            {isEditing ? (
              <input
                type="number"
                value={value}
                onChange={(e) => onCellChange(cellKey, e.target.value)}
                onBlur={() => onCellBlur(costType.id, m.year, m.month)}
                onKeyDown={(e) => onKeyDown(e, costType.id, m.year, m.month)}
                className="w-20 px-1 py-0.5 text-center text-sm border border-emerald-500 rounded focus:ring-2 focus:ring-emerald-500"
                autoFocus
                min={0}
                step={100}
              />
            ) : (
              <span className={`text-sm ${value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {value > 0 ? formatCurrency(value) : '-'}
              </span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 sticky right-0 bg-white">
        {rowTotal > 0 ? formatCurrency(rowTotal) : '-'}
      </td>
    </tr>
  );
}

export default NonLaborCostsGrid;

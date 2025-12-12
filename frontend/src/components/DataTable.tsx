/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Button, Input } from './ui';
import { Pagination } from './Pagination';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  enableGlobalSearch?: boolean;
  itemsPerPage?: number;
  getRowKey?: (item: T) => string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onEdit,
  onDelete,
  emptyMessage = 'No data found',
  searchPlaceholder = 'Search...',
  enableGlobalSearch = true,
  itemsPerPage = 20,
  getRowKey,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(itemsPerPage);

  // Global search across all columns
  const searchedData = useMemo(() => {
    if (!enableGlobalSearch || !searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) =>
      columns.some((column) => {
        const value = item[column.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, searchTerm, columns, enableGlobalSearch]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return searchedData;

    return [...searchedData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedData, sortKey, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, perPage]);

  const totalPages = Math.ceil(sortedData.length / perPage);

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const showActions = onEdit || onDelete;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {enableGlobalSearch && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-600">
            {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="text-gray-400">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const key = getRowKey ? getRowKey(item) : item.id || index;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={`${
                      onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                    } transition-colors`}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          itemsPerPage={perPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { facilitiesPortalService, LeaseStatus } from '../../services/facilitiesPortalService';
import { format, differenceInDays, parseISO } from 'date-fns';

function getStatusLabel(status: LeaseStatus): string {
  switch (status) {
    case LeaseStatus.Draft: return 'Draft';
    case LeaseStatus.Active: return 'Active';
    case LeaseStatus.Expired: return 'Expired';
    case LeaseStatus.Terminated: return 'Terminated';
    case LeaseStatus.Pending: return 'Pending';
    default: return 'Unknown';
  }
}

function getStatusColor(status: LeaseStatus): string {
  switch (status) {
    case LeaseStatus.Active: return 'bg-teal-100 text-teal-800';
    case LeaseStatus.Pending: return 'bg-yellow-100 text-yellow-800';
    case LeaseStatus.Draft: return 'bg-gray-100 text-gray-800';
    case LeaseStatus.Expired: return 'bg-red-100 text-red-800';
    case LeaseStatus.Terminated: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getDaysUntilExpiration(endDate?: string): { days: number; label: string; color: string } {
  if (!endDate) {
    return { days: 0, label: 'No date', color: 'text-gray-400' };
  }
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) {
    return { days, label: 'Expired', color: 'text-red-600' };
  } else if (days <= 30) {
    return { days, label: `${days} days`, color: 'text-red-600 font-semibold' };
  } else if (days <= 90) {
    return { days, label: `${days} days`, color: 'text-yellow-600' };
  } else if (days <= 180) {
    return { days, label: `${days} days`, color: 'text-teal-600' };
  }
  return { days, label: `${days} days`, color: 'text-gray-600' };
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function LeaseManagementPage() {
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'endDate' | 'rent'>('endDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: leases = [], isLoading } = useQuery({
    queryKey: ['leases', statusFilter, includeExpired],
    queryFn: () => facilitiesPortalService.getLeases({
      status: statusFilter === 'all' ? undefined : statusFilter,
      includeExpired,
    }),
  });

  // Filter and sort leases
  const filteredLeases = leases
    .filter(lease => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lease.leaseName.toLowerCase().includes(query) ||
        lease.landlordName?.toLowerCase().includes(query) ||
        lease.office?.name?.toLowerCase().includes(query) ||
        lease.leaseNumber?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.leaseName.localeCompare(b.leaseName);
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'rent':
          comparison = (a.monthlyRent || 0) - (b.monthlyRent || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Calculate summary stats
  const activeLeases = leases.filter(l => l.status === LeaseStatus.Active);
  const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + (l.monthlyRent || 0), 0);
  const totalAnnualRent = activeLeases.reduce((sum, l) => sum + (l.annualRent || 0), 0);
  const expiringWithin90Days = activeLeases.filter(l => {
    if (!l.endDate) return false;
    const days = differenceInDays(parseISO(l.endDate), new Date());
    return days >= 0 && days <= 90;
  });

  const handleSort = (column: 'name' | 'endDate' | 'rent') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lease Management</h1>
          <p className="text-gray-600 mt-1">Manage office leases, track expiration dates, and monitor costs</p>
        </div>
        <Link
          to="/facilities/option-years"
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Option Years Calendar
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Leases</p>
              <p className="text-2xl font-bold text-gray-900">{activeLeases.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalMonthlyRent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAnnualRent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${expiringWithin90Days.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <svg className={`w-5 h-5 ${expiringWithin90Days.length > 0 ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expiring (90 days)</p>
              <p className={`text-2xl font-bold ${expiringWithin90Days.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {expiringWithin90Days.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search leases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as LeaseStatus)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value={LeaseStatus.Active}>Active</option>
            <option value={LeaseStatus.Pending}>Pending</option>
            <option value={LeaseStatus.Draft}>Draft</option>
            <option value={LeaseStatus.Expired}>Expired</option>
            <option value={LeaseStatus.Terminated}>Terminated</option>
          </select>

          {/* Include Expired */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            Include Expired
          </label>
        </div>
      </div>

      {/* Leases Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Lease
                    {sortBy === 'name' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Office
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Landlord
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('endDate')}
                >
                  <div className="flex items-center gap-1">
                    Expires
                    {sortBy === 'endDate' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('rent')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Monthly Rent
                    {sortBy === 'rent' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sq Ft
                </th>
                <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No leases found</p>
                    <p className="text-sm">Try adjusting your filters or search query</p>
                  </td>
                </tr>
              ) : (
                filteredLeases.map((lease) => {
                  const expiration = getDaysUntilExpiration(lease.endDate);
                  return (
                    <tr key={lease.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`/facilities/leases/${lease.id}`}
                            className="font-medium text-gray-900 hover:text-teal-600"
                          >
                            {lease.leaseName}
                          </Link>
                          {lease.leaseNumber && (
                            <p className="text-sm text-gray-500">#{lease.leaseNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {lease.office?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {lease.landlordName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lease.status)}`}>
                          {getStatusLabel(lease.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{lease.endDate ? format(parseISO(lease.endDate), 'MMM d, yyyy') : '-'}</p>
                          <p className={`text-xs ${expiration.color}`}>{expiration.label}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(lease.monthlyRent)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">
                        {lease.squareFootage?.toLocaleString() || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/facilities/leases/${lease.id}`}
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringWithin90Days.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Leases Expiring Soon</h3>
              <p className="text-sm text-red-700 mt-1">
                The following {expiringWithin90Days.length} lease{expiringWithin90Days.length > 1 ? 's' : ''} will expire within 90 days:
              </p>
              <ul className="mt-3 space-y-2">
                {expiringWithin90Days.map(lease => {
                  const expiration = getDaysUntilExpiration(lease.endDate);
                  return (
                    <li key={lease.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2">
                      <Link to={`/facilities/leases/${lease.id}`} className="font-medium text-red-900 hover:text-red-700">
                        {lease.leaseName}
                      </Link>
                      <span className="text-sm text-red-600 font-medium">{expiration.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

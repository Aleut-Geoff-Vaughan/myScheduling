import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { WbsDetailModal } from '../components/WbsDetailModal';
import wbsService from '../services/wbsService';
import { groupService } from '../services/groupService';
import type { WbsElement } from '../types/api';
import { WbsType, WbsApprovalStatus } from '../types/api';

export function WbsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | WbsType>('all');
  const [selectedApprovalFilter, setSelectedApprovalFilter] = useState<'all' | WbsApprovalStatus>('all');
  const [selectedApproverGroupFilter, setSelectedApproverGroupFilter] = useState<string>('all');
  const [selectedProject] = useState<string | undefined>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWbs, setSelectedWbs] = useState<WbsElement | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('view');

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['wbs', selectedProject, selectedTypeFilter, selectedApprovalFilter, selectedApproverGroupFilter, pageNumber, pageSize],
    queryFn: () => wbsService.getWbsElements({
      projectId: selectedProject,
      type: selectedTypeFilter !== 'all' ? selectedTypeFilter : undefined,
      approvalStatus: selectedApprovalFilter !== 'all' ? selectedApprovalFilter : undefined,
      approverGroupId: selectedApproverGroupFilter !== 'all' ? selectedApproverGroupFilter : undefined,
      includeHistory: false,
      pageNumber,
      pageSize,
    }),
  });

  const { data: approverGroups = [] } = useQuery({
    queryKey: ['groups', 'active'],
    queryFn: () => groupService.list({ isActive: true }),
    staleTime: 60_000,
  });

  const wbsElements = paginatedData?.items || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 0;
  const hasPreviousPage = paginatedData?.hasPreviousPage || false;
  const hasNextPage = paginatedData?.hasNextPage || false;

  const filteredWbsElements = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return wbsElements.filter(wbs => {
      const matchesSearch =
        !term ||
        wbs.code.toLowerCase().includes(term) ||
        wbs.description.toLowerCase().includes(term) ||
        wbs.project?.name?.toLowerCase().includes(term);

      const matchesGroup =
        selectedApproverGroupFilter === 'all' ||
        wbs.approverGroupId === selectedApproverGroupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [wbsElements, searchTerm, selectedApproverGroupFilter]);

  const getTypeLabel = (type: WbsType): string => {
    switch (type) {
      case WbsType.Billable:
        return 'Billable';
      case WbsType.NonBillable:
        return 'Non-Billable';
      case WbsType.BidAndProposal:
        return 'B&P';
      case WbsType.Overhead:
        return 'Overhead';
      case WbsType.GeneralAndAdmin:
        return 'G&A';
      default:
        return 'Unknown';
    }
  };

  const getTypeVariant = (type: WbsType): 'success' | 'warning' | 'default' | 'info' => {
    switch (type) {
      case WbsType.Billable:
        return 'success';
      case WbsType.NonBillable:
        return 'info';
      case WbsType.BidAndProposal:
        return 'warning';
      case WbsType.Overhead:
      case WbsType.GeneralAndAdmin:
        return 'default';
      default:
        return 'default';
    }
  };

  const getApprovalStatusLabel = (status: WbsApprovalStatus): string => {
    switch (status) {
      case WbsApprovalStatus.Draft:
        return 'Draft';
      case WbsApprovalStatus.PendingApproval:
        return 'Pending Approval';
      case WbsApprovalStatus.Approved:
        return 'Approved';
      case WbsApprovalStatus.Rejected:
        return 'Rejected';
      case WbsApprovalStatus.Suspended:
        return 'Suspended';
      case WbsApprovalStatus.Closed:
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const getApprovalStatusVariant = (status: WbsApprovalStatus): 'success' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case WbsApprovalStatus.Approved:
        return 'success';
      case WbsApprovalStatus.PendingApproval:
        return 'warning';
      case WbsApprovalStatus.Draft:
        return 'info';
      case WbsApprovalStatus.Rejected:
      case WbsApprovalStatus.Suspended:
      case WbsApprovalStatus.Closed:
        return 'default';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'WBS Code',
      render: (wbs: WbsElement) => (
        <div>
          <div className="font-medium text-gray-900">{wbs.code}</div>
          <div className="text-sm text-gray-500">{wbs.description}</div>
        </div>
      )
    },
    {
      key: 'project',
      header: 'Project',
      render: (wbs: WbsElement) => wbs.project?.name || '—',
    },
    {
      key: 'type',
      header: 'Type',
      render: (wbs: WbsElement) => (
        <StatusBadge
          status={getTypeLabel(wbs.type)}
          variant={getTypeVariant(wbs.type)}
        />
      )
    },
    {
      key: 'validity',
      header: 'Validity Period',
      render: (wbs: WbsElement) => (
        <div className="text-sm">
          <div>{new Date(wbs.validFrom).toLocaleDateString()}</div>
          {wbs.validTo ? (
            <div className="text-gray-500">to {new Date(wbs.validTo).toLocaleDateString()}</div>
          ) : (
            <div className="text-gray-500">Indefinite</div>
          )}
        </div>
      )
    },
    {
      key: 'approvalStatus',
      header: 'Approval Status',
      render: (wbs: WbsElement) => (
        <StatusBadge
          status={getApprovalStatusLabel(wbs.approvalStatus)}
          variant={getApprovalStatusVariant(wbs.approvalStatus)}
        />
      )
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (wbs: WbsElement) => wbs.owner?.displayName || '—',
    },
    {
      key: 'approverGroup',
      header: 'Approver Group',
      render: (wbs: WbsElement) => wbs.approverGroup?.name || '—',
    }
  ];

  const stats = useMemo(() => {
    const total = filteredWbsElements.length;
    const approved = filteredWbsElements.filter(w => w.approvalStatus === WbsApprovalStatus.Approved).length;
    const pending = filteredWbsElements.filter(w => w.approvalStatus === WbsApprovalStatus.PendingApproval).length;
    const draft = filteredWbsElements.filter(w => w.approvalStatus === WbsApprovalStatus.Draft).length;
    const billable = filteredWbsElements.filter(w => w.type === WbsType.Billable).length;

    return { total, approved, pending, draft, billable };
  }, [filteredWbsElements]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading WBS Elements</div>
              <div className="text-gray-600">{(error as Error).message}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WBS Management</h1>
        <p className="text-gray-600 mt-2">
          Manage Work Breakdown Structure elements with approval workflows
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total WBS</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600 mt-1">Approved</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 mt-1">Pending</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.draft}</div>
            <div className="text-sm text-gray-600 mt-1">Draft</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{stats.billable}</div>
            <div className="text-sm text-gray-600 mt-1">Billable</div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardBody>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search WBS by code, description, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">WBS Type</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedTypeFilter === 'all' ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={selectedTypeFilter === WbsType.Billable ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter(WbsType.Billable)}
                  size="sm"
                >
                  Billable
                </Button>
                <Button
                  variant={selectedTypeFilter === WbsType.NonBillable ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter(WbsType.NonBillable)}
                  size="sm"
                >
                  Non-Billable
                </Button>
                <Button
                  variant={selectedTypeFilter === WbsType.BidAndProposal ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter(WbsType.BidAndProposal)}
                  size="sm"
                >
                  B&P
                </Button>
                <Button
                  variant={selectedTypeFilter === WbsType.Overhead ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter(WbsType.Overhead)}
                  size="sm"
                >
                  Overhead
                </Button>
                <Button
                  variant={selectedTypeFilter === WbsType.GeneralAndAdmin ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTypeFilter(WbsType.GeneralAndAdmin)}
                  size="sm"
                >
                  G&A
                </Button>
              </div>
            </div>

            {/* Approval Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Approval Status</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedApprovalFilter === 'all' ? 'primary' : 'ghost'}
                  onClick={() => setSelectedApprovalFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={selectedApprovalFilter === WbsApprovalStatus.Draft ? 'primary' : 'ghost'}
                  onClick={() => setSelectedApprovalFilter(WbsApprovalStatus.Draft)}
                  size="sm"
                >
                  Draft
                </Button>
                <Button
                  variant={selectedApprovalFilter === WbsApprovalStatus.PendingApproval ? 'primary' : 'ghost'}
                  onClick={() => setSelectedApprovalFilter(WbsApprovalStatus.PendingApproval)}
                  size="sm"
                >
                  Pending
                </Button>
                <Button
                  variant={selectedApprovalFilter === WbsApprovalStatus.Approved ? 'primary' : 'ghost'}
                  onClick={() => setSelectedApprovalFilter(WbsApprovalStatus.Approved)}
                  size="sm"
                >
                  Approved
                </Button>
                <Button
                  variant={selectedApprovalFilter === WbsApprovalStatus.Rejected ? 'primary' : 'ghost'}
                  onClick={() => setSelectedApprovalFilter(WbsApprovalStatus.Rejected)}
                  size="sm"
                >
                  Rejected
                </Button>
              </div>
            </div>

            {/* Approver Group Filter */}
            <div className="min-w-[220px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Approver Group</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={selectedApproverGroupFilter}
                onChange={(e) => setSelectedApproverGroupFilter(e.target.value)}
              >
                <option value="all">All</option>
                {approverGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="primary" onClick={() => {
                setSelectedWbs(undefined);
                setModalMode('create');
                setIsModalOpen(true);
              }}>
                + New WBS Element
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* WBS Table */}
      <Card>
        <CardHeader
          title="WBS Elements"
          subtitle={`${filteredWbsElements.length} ${filteredWbsElements.length === 1 ? 'element' : 'elements'}`}
        />
        <Table
          data={filteredWbsElements}
          columns={columns}
          onRowClick={(wbs) => {
            setSelectedWbs(wbs);
            setModalMode('view');
            setIsModalOpen(true);
          }}
          emptyMessage={isLoading ? "Loading WBS elements..." : "No WBS elements found"}
        />

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Results info */}
              <div className="text-sm text-gray-600">
                Showing {((pageNumber - 1) * pageSize) + 1}-{Math.min(pageNumber * pageSize, totalCount)} of {totalCount} results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-4">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPageNumber(1); // Reset to first page
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageNumber(1)}
                    disabled={!hasPreviousPage}
                  >
                    First
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageNumber(p => p - 1)}
                    disabled={!hasPreviousPage}
                  >
                    Previous
                  </Button>

                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {pageNumber} of {totalPages}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageNumber(p => p + 1)}
                    disabled={!hasNextPage}
                  >
                    Next
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageNumber(totalPages)}
                    disabled={!hasNextPage}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* WBS Detail Modal */}
      <WbsDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWbs(undefined);
        }}
        wbs={selectedWbs}
        mode={modalMode}
      />
    </div>
  );
}

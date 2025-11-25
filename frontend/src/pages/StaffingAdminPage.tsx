import { useMemo, useState } from 'react';
import { Card, CardHeader, CardBody, Button, Table, Input } from '../components/ui';
import { useAssignments } from '../hooks/useAssignments';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';
import { useAuthStore } from '../stores/authStore';

export default function StaffingAdminPage() {
  const { currentWorkspace } = useAuthStore();
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<50 | 100 | 'all'>(50);
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [startAfter, setStartAfter] = useState<string>('');
  const [endBefore, setEndBefore] = useState<string>('');
  const { data: assignments = [], error, isLoading } = useAssignments(
    currentWorkspace?.tenantId ? { tenantId: currentWorkspace.tenantId } : undefined
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? assignments.filter(
          (a) =>
            a.id.toLowerCase().includes(term) ||
            a.userId.toLowerCase().includes(term) ||
            (a.projectRoleId ?? '').toLowerCase().includes(term) ||
            (a.wbsElementId ?? '').toLowerCase().includes(term)
        )
      : assignments;
    const statusApplied =
      statusFilter === 'all' ? base : base.filter((a) => a.status === statusFilter);

    const startFilter = startAfter ? new Date(startAfter) : null;
    const endFilter = endBefore ? new Date(endBefore) : null;
    const dateApplied = statusApplied.filter((a) => {
      const s = a.startDate ? new Date(a.startDate) : null;
      const e = a.endDate ? new Date(a.endDate) : null;
      if (startFilter && s && s < startFilter) return false;
      if (endFilter && e && e > endFilter) return false;
      return true;
    });

    if (pageSize === 'all') return statusApplied;
    return dateApplied.slice(0, pageSize);
  }, [assignments, search, pageSize, statusFilter, startAfter, endBefore]);

  const exportCsv = () => {
    const headers = ['Id', 'UserId', 'ProjectRoleId', 'Allocation', 'StartDate', 'EndDate', 'Status'];
    const rows = filtered.map((a) => [
      a.id,
      a.userId,
      a.projectRoleId ?? '',
      a.allocation,
      a.startDate,
      a.endDate,
      AssignmentStatus[a.status],
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'all-assignments.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <div className="p-6 text-red-600">Failed to load assignments</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staffing Admin</h1>
          <p className="text-gray-600">Manage assignments across the tenant.</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Assignments"
          subtitle={`${filtered.length} shown${pageSize !== 'all' ? ` (of ${assignments.length})` : ''}`}
        />
        <CardBody>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Input
              placeholder="Search by id/user/role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="text-sm border border-gray-300 rounded px-2 py-1"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as AssignmentStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value={AssignmentStatus.Draft}>Draft</option>
              <option value={AssignmentStatus.PendingApproval}>Pending Approval</option>
              <option value={AssignmentStatus.Active}>Active</option>
              <option value={AssignmentStatus.Completed}>Completed</option>
              <option value={AssignmentStatus.Cancelled}>Cancelled</option>
            </select>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600">Start on/after</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={startAfter}
                onChange={(e) => setStartAfter(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600">End on/before</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={endBefore}
                onChange={(e) => setEndBefore(e.target.value)}
              />
            </div>
            <select
              className="text-sm border border-gray-300 rounded px-2 py-1"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value) as any)}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <Table
              data={filtered}
              columns={[
                { key: 'userId', header: 'User', render: (a: Assignment) => a.userId.substring(0, 8) },
                { key: 'wbsElementId', header: 'WBS', render: (a: Assignment) => a.wbsElementId.substring(0, 8) },
                { key: 'projectRoleId', header: 'Role', render: (a: Assignment) => a.projectRoleId?.substring(0, 8) ?? '—' },
                { key: 'allocation', header: 'Allocation', render: (a: Assignment) => `${a.allocation}%` },
                {
                  key: 'dates',
                  header: 'Dates',
                  render: (a: Assignment) =>
                    `${a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'} - ${
                      a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'
                    }`,
                },
                { key: 'status', header: 'Status', render: (a: Assignment) => AssignmentStatus[a.status] },
              ]}
              emptyMessage="No assignments found"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

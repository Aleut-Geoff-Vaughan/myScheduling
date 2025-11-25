import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardBody, Button, Input } from '../components/ui';
import { useAssignments } from '../hooks/useAssignments';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';
import { assignmentRequestService, type CreateAssignmentRequest } from '../services/assignmentRequestService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { groupService } from '../services/groupService';

export function StaffingPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'assignments' | 'capacity'>('assignments');
  const [requesting, setRequesting] = useState(false);
  const [approverGroupId, setApproverGroupId] = useState('');

  const { data: assignments = [], error } = useAssignments(user ? { userId: user.id } : undefined);
  const { data: approverGroups = [] } = useQuery({
    queryKey: ['groups', currentWorkspace?.tenantId, 'active'],
    queryFn: () => groupService.list({ tenantId: currentWorkspace?.tenantId, isActive: true }),
    enabled: !!currentWorkspace?.tenantId,
    staleTime: 60_000,
  });

  const getStatusLabel = (status: AssignmentStatus): string => {
    switch (status) {
      case AssignmentStatus.Draft:
        return 'Draft';
      case AssignmentStatus.PendingApproval:
        return 'Pending Approval';
      case AssignmentStatus.Active:
        return 'Active';
      case AssignmentStatus.Completed:
        return 'Completed';
      case AssignmentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const handleRequest = async (payload: CreateAssignmentRequest) => {
    try {
      setRequesting(true);
      await assignmentRequestService.create(payload);
      toast.success('Assignment request submitted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  const stats = useMemo(() => {
  const total = assignments.length;
  const active = assignments.filter(a => a.status === AssignmentStatus.Active).length;
  const pending = assignments.filter(a => a.status === AssignmentStatus.PendingApproval).length;
  const avgAllocation = assignments.length > 0
    ? Math.round(assignments.reduce((sum, a) => sum + a.allocation, 0) / assignments.length)
    : 0;

  return { total, active, pending, avgAllocation };
}, [assignments]);

  const timeline = useMemo(() => {
    const now = new Date();
    const sixMonthsOut = new Date();
    sixMonthsOut.setMonth(now.getMonth() + 6);
    const totalMs = sixMonthsOut.getTime() - now.getTime();
    return assignments.map((a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const clampedStart = start < now ? now : start;
      const clampedEnd = end > sixMonthsOut ? sixMonthsOut : end;
      const leftPct = ((clampedStart.getTime() - now.getTime()) / totalMs) * 100;
      const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;
      return { ...a, leftPct: Math.max(0, leftPct), widthPct: Math.max(2, widthPct) };
    });
  }, [assignments]);

  const exportCsv = () => {
    const headers = ['Id', 'UserId', 'ProjectRoleId', 'Allocation', 'StartDate', 'EndDate', 'Status'];
    const rows = assignments.map((a) => [
      a.id,
      a.userId,
      a.projectRoleId ?? '',
      a.allocation,
      a.startDate,
      a.endDate,
      getStatusLabel(a.status),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assignments.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Assignments</div>
              <div className="text-gray-600">{error.message}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Staffing</h1>
        <p className="text-gray-600 mt-2">
          Your upcoming assignments and utilization
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Assignments</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 mt-1">Pending Approval</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.avgAllocation}%</div>
            <div className="text-sm text-gray-600 mt-1">Avg Utilization</div>
          </div>
        </Card>
      </div>

      {/* View Selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'assignments' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('assignments')}
              >
                Assignments
              </Button>
              <Button
                variant={selectedView === 'capacity' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('capacity')}
              >
                Capacity View
              </Button>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportCsv}>
                Export CSV
              </Button>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={approverGroupId}
                onChange={(e) => setApproverGroupId(e.target.value)}
              >
                <option value="">Approver Group (optional)</option>
                {approverGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={() =>
                  handleRequest({
                    projectId: assignments[0]?.projectRoleId || crypto.randomUUID(),
                    wbsElementId: assignments[0]?.wbsElementId,
                    projectRoleId: assignments[0]?.projectRoleId,
                    allocationPct: 50,
                    tenantId: currentWorkspace?.tenantId,
                    requestedForUserId: user?.id,
                    startDate: new Date().toISOString(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                    notes: 'Requesting assignment',
                    approverGroupId: approverGroupId || undefined,
                  })
                }
                disabled={requesting}
              >
                {requesting ? 'Submitting...' : '+ Request Assignment'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Assignments Table */}
      {selectedView === 'assignments' && (
        <Card>
          <CardHeader
            title="All Assignments"
            subtitle={`${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'}`}
          />

          {/* Gantt-style six-month view */}
          <div className="border-t border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">6-Month Timeline</h3>
            <div className="space-y-3">
              {timeline.slice(0, 20).map((item) => (
                <div key={item.id}>
                  <div className="text-sm text-gray-700 mb-1">
                    Project {item.projectRoleId ? item.projectRoleId.substring(0, 8) : '—'} • User {item.userId.substring(0,8)}
                  </div>
                  <div className="h-4 bg-gray-100 rounded relative overflow-hidden">
                    <div
                      className="h-4 bg-blue-500 rounded absolute"
                      style={{ left: `${item.leftPct}%`, width: `${item.widthPct}%` }}
                    />
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-sm text-gray-500">No timeline data.</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Capacity View */}
      {selectedView === 'capacity' && (
        <div className="space-y-6">
          {/* Capacity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation < 80).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Under Allocated</div>
                <div className="text-xs text-gray-500 mt-1">&lt;80% capacity</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation >= 80 && a.allocation <= 100).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Optimally Allocated</div>
                <div className="text-xs text-gray-500 mt-1">80-100% capacity</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation > 100).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Over Allocated</div>
                <div className="text-xs text-gray-500 mt-1">&gt;100% capacity</div>
              </div>
            </Card>
          </div>

          {/* Capacity Timeline */}
          <Card>
            <CardHeader
              title="Capacity Timeline"
              subtitle="Person utilization over time"
            />
            <CardBody>
              {/* Group assignments by user */}
              {(() => {
                // Group active assignments by userId
                const personMap = new Map<string, Assignment[]>();
                assignments
                  .filter(a => a.status === AssignmentStatus.Active)
                  .forEach(assignment => {
                    const existing = personMap.get(assignment.userId) || [];
                    personMap.set(assignment.userId, [...existing, assignment]);
                  });

                // Convert to array and display
                const personEntries = Array.from(personMap.entries());

                if (personEntries.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>No active assignments to display</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {personEntries.slice(0, 10).map(([userId, personAssignments]) => {
                      const totalAllocation = personAssignments.reduce((sum, a) => sum + a.allocation, 0);
                      const isOverAllocated = totalAllocation > 100;
                      const isUnderAllocated = totalAllocation < 80;

                      return (
                        <div key={userId} className="border-b pb-4 last:border-b-0">
                          {/* Person Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-gray-900">
                                User {userId.substring(0, 8)}...
                              </div>
                              <div className={`text-sm font-semibold ${
                                isOverAllocated ? 'text-red-600' :
                                isUnderAllocated ? 'text-green-600' :
                                'text-blue-600'
                              }`}>
                                {totalAllocation}% Total
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {personAssignments.length} active {personAssignments.length === 1 ? 'assignment' : 'assignments'}
                            </div>
                          </div>

                          {/* Capacity Bar */}
                          <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div
                                className={`h-6 rounded-full transition-all ${
                                  isOverAllocated ? 'bg-red-500' :
                                  isUnderAllocated ? 'bg-green-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(totalAllocation, 100)}%` }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                  {totalAllocation}%
                                </div>
                              </div>
                              {totalAllocation > 100 && (
                                <div
                                  className="absolute top-0 left-0 h-6 bg-red-600 opacity-50"
                                  style={{ width: `${totalAllocation - 100}%`, marginLeft: '100%' }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Assignment Details */}
                          <div className="space-y-2">
                            {personAssignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded hover:bg-gray-100 cursor-pointer"
                                onClick={() => {}}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">
                                    {assignment.allocation}%
                                  </div>
                                  <div className="text-gray-600">
                                    Role: {assignment.projectRoleId ? `${assignment.projectRoleId.substring(0, 8)}...` : '—'}
                                  </div>
                                </div>
                                <div className="text-gray-500">
                                  {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : '—'} -{' '}
                                  {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {personEntries.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-4">
                        Showing 10 of {personEntries.length} people with active assignments
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Requests */}
      {/* Request CTA */}
      <div className="mt-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request an Assignment</h3>
                <p className="text-sm text-gray-600">Submit a request to staffing managers for approval.</p>
              </div>
              <select
                className="border rounded px-3 py-2 text-sm mr-3"
                value={approverGroupId}
                onChange={(e) => setApproverGroupId(e.target.value)}
              >
                <option value="">Approver Group (optional)</option>
                {approverGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={() =>
                  handleRequest({
                    projectId: assignments[0]?.projectRoleId || crypto.randomUUID(),
                    wbsElementId: assignments[0]?.wbsElementId,
                    projectRoleId: assignments[0]?.projectRoleId,
                    allocationPct: 50,
                    tenantId: currentWorkspace?.tenantId,
                    requestedForUserId: user?.id,
                    startDate: new Date().toISOString(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                    notes: 'Requesting assignment',
                    approverGroupId: approverGroupId || undefined,
                  })
                }
                disabled={requesting}
              >
                {requesting ? 'Submitting...' : 'Request Assignment'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Requests route to the Inbox for approval.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

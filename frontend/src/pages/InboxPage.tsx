import { useMemo, useState } from 'react';
import { useApproveRequest, useInbox, useRejectRequest } from '../hooks/useInbox';
import { useAuthStore } from '../stores/authStore';
import { AssignmentRequestStatus } from '../types/api';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '../services/groupService';

export default function InboxPage() {
  const { currentWorkspace } = useAuthStore();
  const { data: inbox = [], isLoading, error } = useInbox({
    tenantId: currentWorkspace?.tenantId,
    status: AssignmentRequestStatus.Pending,
  });
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [reason, setReason] = useState('');
  const { data: groups = [] } = useQuery({
    queryKey: ['groups', 'active'],
    queryFn: () => groupService.list({ tenantId: currentWorkspace?.tenantId, isActive: true }),
    enabled: !!currentWorkspace?.tenantId,
    staleTime: 60_000,
  });

  const statusLabel = useMemo(
    () => ({
      [AssignmentRequestStatus.Pending]: 'Pending',
      [AssignmentRequestStatus.Approved]: 'Approved',
      [AssignmentRequestStatus.Rejected]: 'Rejected',
      [AssignmentRequestStatus.Cancelled]: 'Cancelled',
    }),
    []
  );

  const approverGroupName = (id?: string) =>
    id ? groups.find((g) => g.id === id)?.name ?? id.substring(0, 8) + '…' : '—';

  if (error) {
    return <div className="p-6 text-red-600">Failed to load inbox</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600">Assignment requests waiting for action.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border-b text-left">Project</th>
                <th className="px-3 py-2 border-b text-left">WBS</th>
                <th className="px-3 py-2 border-b text-left">Approver Group</th>
                <th className="px-3 py-2 border-b text-left">For</th>
                <th className="px-3 py-2 border-b text-left">Dates</th>
                <th className="px-3 py-2 border-b text-left">Allocation</th>
                <th className="px-3 py-2 border-b text-left">Status</th>
                <th className="px-3 py-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inbox.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{item.projectId.substring(0, 8)}...</td>
                  <td className="px-3 py-2">{item.wbsElementId ? `${item.wbsElementId.substring(0, 8)}...` : '—'}</td>
                  <td className="px-3 py-2">{approverGroupName(item.approverGroupId)}</td>
                  <td className="px-3 py-2">{item.requestedForUserId.substring(0, 8)}...</td>
                  <td className="px-3 py-2">
                    {item.startDate ? new Date(item.startDate).toLocaleDateString() : '—'} -{' '}
                    {item.endDate ? new Date(item.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2">{item.allocationPct}%</td>
                  <td className="px-3 py-2">{statusLabel[item.status]}</td>
                  <td className="px-3 py-2">
                    {item.status === AssignmentRequestStatus.Pending ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve.mutate({ id: item.id })}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject.mutate({ id: item.id, reason })}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                        >
                          Reject
                        </button>
                        <input
                          type="text"
                          placeholder="Reason"
                          className="border px-2 py-1 rounded text-xs"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
              {inbox.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    No requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

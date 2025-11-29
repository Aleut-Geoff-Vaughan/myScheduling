import { useMemo, useState } from 'react';
import { useApproveRequest, useInbox, useRejectRequest } from '../hooks/useInbox';
import { useAuthStore } from '../stores/authStore';
import { AssignmentRequestStatus } from '../types/api';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '../services/groupService';
import { useProjects } from '../hooks/useProjects';
import { usePeople } from '../hooks/usePeople';
import wbsService from '../services/wbsService';
import type { AssignmentRequest } from '../services/assignmentRequestService';

export default function InboxPage() {
  const { currentWorkspace } = useAuthStore();
  const { data: inbox = [], isLoading, error } = useInbox({
    tenantId: currentWorkspace?.tenantId,
    status: AssignmentRequestStatus.Pending,
  });
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', 'active'],
    queryFn: () => groupService.list({ tenantId: currentWorkspace?.tenantId, isActive: true }),
    enabled: !!currentWorkspace?.tenantId,
    staleTime: 60_000,
  });

  const { data: projects = [] } = useProjects({ tenantId: currentWorkspace?.tenantId });
  const { data: people = [] } = usePeople({ tenantId: currentWorkspace?.tenantId });

  // Fetch all WBS elements for the projects in the inbox
  const projectIds = useMemo(() => [...new Set(inbox.map((item) => item.projectId))], [inbox]);
  const { data: wbsData } = useQuery({
    queryKey: ['wbs', 'inbox', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const results = await Promise.all(
        projectIds.map((projectId) => wbsService.getWbsElements({ projectId, pageSize: 100 }))
      );
      return results.flatMap((r) => r.items);
    },
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });
  const wbsElements = wbsData ?? [];

  const statusLabel = useMemo(
    () => ({
      [AssignmentRequestStatus.Pending]: 'Pending',
      [AssignmentRequestStatus.Approved]: 'Approved',
      [AssignmentRequestStatus.Rejected]: 'Rejected',
      [AssignmentRequestStatus.Cancelled]: 'Cancelled',
    }),
    []
  );

  const getGroupName = (id?: string) =>
    id ? groups.find((g) => g.id === id)?.name ?? 'Unknown Group' : '—';

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? 'Unknown Project';

  const getWbsName = (id?: string) => {
    if (!id) return '—';
    const wbs = wbsElements.find((w) => w.id === id);
    return wbs ? wbs.description : 'Unknown WBS';
  };

  const getUserName = (id: string) =>
    people.find((p) => p.id === id)?.displayName ?? 'Unknown User';

  const handleApprove = (item: AssignmentRequest) => {
    approve.mutate({ id: item.id });
    setSelectedRequest(null);
  };

  const handleReject = (item: AssignmentRequest) => {
    reject.mutate({ id: item.id, reason: rejectReason });
    setSelectedRequest(null);
    setRejectReason('');
  };

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
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">Project</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">WBS</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">Approver Group</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">For</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">Dates</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">Allocation</th>
                <th className="px-4 py-3 border-b text-left font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {inbox.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRequest(item)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{getProjectName(item.projectId)}</td>
                  <td className="px-4 py-3 text-gray-700">{getWbsName(item.wbsElementId)}</td>
                  <td className="px-4 py-3 text-gray-600">{getGroupName(item.approverGroupId)}</td>
                  <td className="px-4 py-3 text-gray-700">{getUserName(item.requestedForUserId)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.startDate ? new Date(item.startDate).toLocaleDateString() : '—'} -{' '}
                    {item.endDate ? new Date(item.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.allocationPct}%</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {statusLabel[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {inbox.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No pending requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Assignment Request Details</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Project</label>
                  <p className="mt-1 text-gray-900 font-medium">{getProjectName(selectedRequest.projectId)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">WBS Element</label>
                  <p className="mt-1 text-gray-900">{getWbsName(selectedRequest.wbsElementId)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Requested For</label>
                  <p className="mt-1 text-gray-900">{getUserName(selectedRequest.requestedForUserId)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Requested By</label>
                  <p className="mt-1 text-gray-900">{getUserName(selectedRequest.requestedByUserId)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Date</label>
                  <p className="mt-1 text-gray-900">
                    {selectedRequest.startDate
                      ? new Date(selectedRequest.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Date</label>
                  <p className="mt-1 text-gray-900">
                    {selectedRequest.endDate
                      ? new Date(selectedRequest.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Allocation</label>
                  <p className="mt-1 text-gray-900 font-semibold">{selectedRequest.allocationPct}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Approver Group</label>
                  <p className="mt-1 text-gray-900">{getGroupName(selectedRequest.approverGroupId)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {statusLabel[selectedRequest.status]}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 text-gray-900 bg-gray-50 rounded-lg p-3">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.status === AssignmentRequestStatus.Pending && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedRequest.status === AssignmentRequestStatus.Pending && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(selectedRequest)}
                  disabled={reject.isPending}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                >
                  {reject.isPending ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={approve.isPending}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                >
                  {approve.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, MessageSquare, User } from 'lucide-react';
import {
  getApprovals,
  approveResume,
  rejectResume,
  requestChanges
} from '../../services/resumeService';
import { type ResumeApproval, ApprovalStatus } from '../../types/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

interface ApprovalWorkflowProps {
  resumeId: string;
  onApprovalChange?: () => void;
}

export function ApprovalWorkflow({ resumeId, onApprovalChange }: ApprovalWorkflowProps) {
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState<ResumeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ResumeApproval | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes'>('approve');

  useEffect(() => {
    loadApprovals();
  }, [resumeId]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      // This would need to be filtered by resumeId on the backend
      const data = await getApprovals();
      // Filter by resumeId on frontend for now
      const filteredApprovals = data.filter(a => a.resumeProfileId === resumeId);
      setApprovals(filteredApprovals);
    } catch (err) {
      console.error('Error loading approvals:', err);
      setError('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, reviewNotes: string) => {
    if (!user?.id) {
      setError('You must be logged in to approve resumes');
      return;
    }

    try {
      await approveResume(approvalId, {
        reviewedByUserId: user.id,
        reviewNotes
      });
      await loadApprovals();
      setShowActionModal(false);
      setSelectedApproval(null);
      onApprovalChange?.();
    } catch (err) {
      console.error('Error approving resume:', err);
      setError('Failed to approve resume');
    }
  };

  const handleReject = async (approvalId: string, reviewNotes: string) => {
    if (!user?.id) {
      setError('You must be logged in to reject resumes');
      return;
    }

    try {
      await rejectResume(approvalId, {
        reviewedByUserId: user.id,
        reviewNotes
      });
      await loadApprovals();
      setShowActionModal(false);
      setSelectedApproval(null);
      onApprovalChange?.();
    } catch (err) {
      console.error('Error rejecting resume:', err);
      setError('Failed to reject resume');
    }
  };

  const handleRequestChanges = async (approvalId: string, reviewNotes: string) => {
    if (!user?.id) {
      setError('You must be logged in to request changes');
      return;
    }

    try {
      await requestChanges(approvalId, {
        reviewedByUserId: user.id,
        reviewNotes
      });
      await loadApprovals();
      setShowActionModal(false);
      setSelectedApproval(null);
      onApprovalChange?.();
    } catch (err) {
      console.error('Error requesting changes:', err);
      setError('Failed to request changes');
    }
  };

  const openActionModal = (approval: ResumeApproval, type: 'approve' | 'reject' | 'changes') => {
    setSelectedApproval(approval);
    setActionType(type);
    setShowActionModal(true);
  };

  const getStatusConfig = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.Pending:
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending'
        };
      case ApprovalStatus.Approved:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Approved'
        };
      case ApprovalStatus.Rejected:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Rejected'
        };
      case ApprovalStatus.ChangesRequested:
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Changes Requested'
        };
      case ApprovalStatus.Cancelled:
        return {
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Cancelled'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading approval history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="p-4 text-red-800">{error}</div>
      </Card>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === ApprovalStatus.Pending);
  const completedApprovals = approvals.filter(a => a.status !== ApprovalStatus.Pending);

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Approvals
          </h3>
          <div className="space-y-3">
            {pendingApprovals.map((approval) => {
              const config = getStatusConfig(approval.status);
              const Icon = config.icon;

              return (
                <Card key={approval.id} className={`${config.borderColor} ${config.bgColor}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className={`font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(approval.requestedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4" />
                        <span>
                          Requested by: {approval.requestedBy?.name || 'Unknown'}
                        </span>
                      </div>
                      {approval.requestNotes && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <MessageSquare className="w-4 h-4 mt-0.5" />
                          <span>{approval.requestNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        onClick={() => openActionModal(approval, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openActionModal(approval, 'changes')}
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openActionModal(approval, 'reject')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval History */}
      {completedApprovals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Approval History</h3>
          <div className="space-y-3">
            {completedApprovals
              .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
              .map((approval) => {
                const config = getStatusConfig(approval.status);
                const Icon = config.icon;

                return (
                  <Card key={approval.id} className="border-gray-200">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${config.color}`} />
                          <span className={`font-medium ${config.color}`}>{config.label}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(approval.requestedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4" />
                          <span>
                            Requested by: {approval.requestedBy?.name || 'Unknown'}
                          </span>
                        </div>
                        {approval.reviewedBy && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4" />
                            <span>
                              Reviewed by: {approval.reviewedBy.name} on{' '}
                              {approval.reviewedAt && new Date(approval.reviewedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {approval.reviewNotes && (
                          <div className="flex items-start gap-2 text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                            <MessageSquare className="w-4 h-4 mt-0.5" />
                            <span>{approval.reviewNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {approvals.length === 0 && (
        <Card>
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No approval requests</h4>
            <p className="text-sm text-gray-500">
              Approval requests will appear here when submitted
            </p>
          </div>
        </Card>
      )}

      {/* Action Modal */}
      {showActionModal && selectedApproval && (
        <ApprovalActionModal
          approval={selectedApproval}
          actionType={actionType}
          onSubmit={(reviewNotes) => {
            if (actionType === 'approve') {
              handleApprove(selectedApproval.id, reviewNotes);
            } else if (actionType === 'reject') {
              handleReject(selectedApproval.id, reviewNotes);
            } else {
              handleRequestChanges(selectedApproval.id, reviewNotes);
            }
          }}
          onClose={() => {
            setShowActionModal(false);
            setSelectedApproval(null);
          }}
        />
      )}
    </div>
  );
}

// Approval Action Modal Component
interface ApprovalActionModalProps {
  approval: ResumeApproval;
  actionType: 'approve' | 'reject' | 'changes';
  onSubmit: (reviewNotes: string) => void;
  onClose: () => void;
}

function ApprovalActionModal({
  actionType,
  onSubmit,
  onClose
}: ApprovalActionModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType !== 'approve' && !reviewNotes.trim()) {
      alert('Review notes are required for rejections and change requests');
      return;
    }
    onSubmit(reviewNotes);
  };

  const getTitle = () => {
    switch (actionType) {
      case 'approve':
        return 'Approve Resume';
      case 'reject':
        return 'Reject Resume';
      case 'changes':
        return 'Request Changes';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'approve':
        return 'Approving this resume will mark it as ready for use.';
      case 'reject':
        return 'Rejecting will send the resume back to draft status.';
      case 'changes':
        return 'Requesting changes will notify the owner of required updates.';
    }
  };

  const getButtonText = () => {
    switch (actionType) {
      case 'approve':
        return 'Approve';
      case 'reject':
        return 'Reject';
      case 'changes':
        return 'Request Changes';
    }
  };

  const getButtonClass = () => {
    switch (actionType) {
      case 'approve':
        return 'bg-green-600 hover:bg-green-700';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700';
      case 'changes':
        return 'bg-orange-600 hover:bg-orange-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-2">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-4">{getDescription()}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes {actionType !== 'approve' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={
                actionType === 'approve'
                  ? 'Add optional feedback...'
                  : 'Please explain what needs to be changed...'
              }
              required={actionType !== 'approve'}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className={getButtonClass()}>
              {getButtonText()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

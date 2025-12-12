import { format } from 'date-fns';
import type { DelegationOfAuthorityLetter } from '../types/doa';
import { DOAStatus } from '../types/doa';
import { useDeleteDOALetter, useRevokeDOALetter } from '../hooks/useDOA';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface DOACardProps {
  doa: DelegationOfAuthorityLetter;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

export function DOACard({ doa, onView, onEdit }: DOACardProps) {
  const [showActions, setShowActions] = useState(false);
  const deleteMutation = useDeleteDOALetter();
  const revokeMutation = useRevokeDOALetter();

  const getStatusColor = (status: DOAStatus) => {
    switch (status) {
      case DOAStatus.Draft:
        return 'bg-gray-100 text-gray-800';
      case DOAStatus.PendingSignatures:
        return 'bg-yellow-100 text-yellow-800';
      case DOAStatus.Active:
        return 'bg-green-100 text-green-800';
      case DOAStatus.Expired:
        return 'bg-red-100 text-red-800';
      case DOAStatus.Revoked:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: DOAStatus) => {
    switch (status) {
      case DOAStatus.Draft:
        return 'Draft';
      case DOAStatus.PendingSignatures:
        return 'Pending Signatures';
      case DOAStatus.Active:
        return 'Active';
      case DOAStatus.Expired:
        return 'Expired';
      case DOAStatus.Revoked:
        return 'Revoked';
      default:
        return 'Unknown';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this DOA letter?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(doa.id);
      toast.success('DOA letter deleted successfully');
    } catch {
      toast.error('Failed to delete DOA letter');
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this active DOA letter?')) {
      return;
    }

    try {
      await revokeMutation.mutateAsync(doa.id);
      toast.success('DOA letter revoked successfully');
    } catch {
      toast.error('Failed to revoke DOA letter');
    }
  };

  const canEdit = doa.status === DOAStatus.Draft;
  const canDelete = doa.status === DOAStatus.Draft;
  const canRevoke = doa.status === DOAStatus.Active;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              doa.status
            )}`}
          >
            {getStatusLabel(doa.status)}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onView(doa.id);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                View Details
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    onEdit(doa.id);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
              )}
              {canRevoke && (
                <button
                  onClick={() => {
                    handleRevoke();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Revoke
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    handleDelete();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-500">Delegator</div>
          <div className="font-medium text-gray-900">
            {doa.delegatorUser?.displayName || 'Unknown'}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Designee</div>
          <div className="font-medium text-gray-900">
            {doa.designeeUser?.displayName || 'Unknown'}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Start Date</div>
            <div className="text-gray-900">
              {format(new Date(doa.effectiveStartDate), 'MMM d, yyyy')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">End Date</div>
            <div className="text-gray-900">
              {format(new Date(doa.effectiveEndDate), 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {doa.subjectLine && (
          <div className="pt-2">
            <div className="text-xs text-gray-500">Subject</div>
            <div className="font-medium text-gray-900">{doa.subjectLine}</div>
          </div>
        )}

        {/* Signature Status */}
        {doa.signatures && doa.signatures.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Signatures</div>
            <div className="flex items-center gap-2">
              {doa.signatures.some((s) => s.role === 0) && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Delegator
                </span>
              )}
              {doa.signatures.some((s) => s.role === 1) && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Designee
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => onView(doa.id)}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          View Full Letter
        </button>
      </div>
    </div>
  );
}

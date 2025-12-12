import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useDOALetter, useSignDOALetter } from '../hooks/useDOA';
import { DOAStatus, SignatureRole } from '../types/doa';
import { SignaturePad } from './SignaturePad';
import { useAuthStore } from '../stores/authStore';

interface DOAViewerProps {
  doaId: string;
  onClose: () => void;
}

export function DOAViewer({ doaId, onClose }: DOAViewerProps) {
  const { user } = useAuthStore();
  const { data: doa, isLoading } = useDOALetter(doaId);
  const signMutation = useSignDOALetter();
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSign = async (signatureData: string, signatureType: number, typedSignature?: string) => {
    try {
      // Remove the data:image/png;base64, prefix if present
      const base64Data = signatureData.split(',')[1] || signatureData;

      await signMutation.mutateAsync({
        id: doaId,
        request: {
          signatureData: base64Data,
          signatureType,
          typedSignature,
        },
      });
      toast.success('DOA letter signed successfully');
      setShowSignaturePad(false);
    } catch {
      toast.error('Failed to sign DOA letter');
    }
  };

  if (isLoading || !doa) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-pulse">Loading DOA Letter...</div>
        </div>
      </div>
    );
  }

  const canSign =
    doa.status === DOAStatus.Draft || doa.status === DOAStatus.PendingSignatures;
  const isDelegator = user?.id === doa.delegatorUserId;
  const isDesignee = user?.id === doa.designeeUserId;
  const delegatorSignature = doa.signatures?.find(
    (s) => s.role === SignatureRole.Delegator
  );
  const designeeSignature = doa.signatures?.find(
    (s) => s.role === SignatureRole.Designee
  );
  const hasUserSigned =
    (isDelegator && delegatorSignature) || (isDesignee && designeeSignature);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Delegation of Authority Letter
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                doa.status === DOAStatus.Draft
                  ? 'bg-gray-100 text-gray-800'
                  : doa.status === DOAStatus.PendingSignatures
                  ? 'bg-yellow-100 text-yellow-800'
                  : doa.status === DOAStatus.Active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {doa.status === DOAStatus.Draft && 'Draft'}
              {doa.status === DOAStatus.PendingSignatures && 'Pending Signatures'}
              {doa.status === DOAStatus.Active && 'Active'}
              {doa.status === DOAStatus.Expired && 'Expired'}
              {doa.status === DOAStatus.Revoked && 'Revoked'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Letter Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">Delegator</div>
                <div className="font-medium text-gray-900">
                  {doa.delegatorUser?.displayName}
                </div>
                <div className="text-sm text-gray-600">
                  {doa.delegatorUser?.email}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Designee</div>
                <div className="font-medium text-gray-900">
                  {doa.designeeUser?.displayName}
                </div>
                <div className="text-sm text-gray-600">
                  {doa.designeeUser?.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Effective Start Date</div>
                <div className="font-medium text-gray-900">
                  {format(new Date(doa.effectiveStartDate), 'MMMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Effective End Date</div>
                <div className="font-medium text-gray-900">
                  {format(new Date(doa.effectiveEndDate), 'MMMM d, yyyy')}
                </div>
              </div>
            </div>

            {doa.subjectLine && (
              <div className="mt-4">
                <div className="text-sm text-gray-500">Subject</div>
                <div className="font-medium text-gray-900">{doa.subjectLine}</div>
              </div>
            )}
          </div>

          {/* Letter Content */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Letter Content
            </h3>
            <div className="whitespace-pre-wrap font-serif text-gray-700 leading-relaxed">
              {doa.letterContent}
            </div>
          </div>

          {/* Internal Notes */}
          {doa.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">
                Internal Notes
              </h4>
              <p className="text-sm text-yellow-800">{doa.notes}</p>
            </div>
          )}

          {/* Signatures Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Signatures</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Delegator Signature */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Delegator Signature
                </div>
                {delegatorSignature ? (
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    <img
                      src={`data:image/png;base64,${delegatorSignature.signatureData}`}
                      alt="Delegator Signature"
                      className="h-24 w-full object-contain"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Signed on{' '}
                      {format(new Date(delegatorSignature.signedAt), 'PPpp')}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
                    Not signed yet
                  </div>
                )}
              </div>

              {/* Designee Signature */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Designee Signature
                </div>
                {designeeSignature ? (
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    <img
                      src={`data:image/png;base64,${designeeSignature.signatureData}`}
                      alt="Designee Signature"
                      className="h-24 w-full object-contain"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Signed on{' '}
                      {format(new Date(designeeSignature.signedAt), 'PPpp')}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
                    Not signed yet
                  </div>
                )}
              </div>
            </div>

            {/* Signature Pad */}
            {showSignaturePad && canSign && (isDelegator || isDesignee) && !hasUserSigned && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Add Your Signature
                </h4>
                <SignaturePad
                  onSave={handleSign}
                  onClear={() => setShowSignaturePad(false)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {canSign && (isDelegator || isDesignee) && !hasUserSigned && (
                <button
                  onClick={() => setShowSignaturePad(!showSignaturePad)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {showSignaturePad ? 'Cancel Signature' : 'Sign Document'}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

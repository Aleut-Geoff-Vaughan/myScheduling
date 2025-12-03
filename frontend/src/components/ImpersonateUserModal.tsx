import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal, Button, FormGroup, Input } from './ui';
import { useAuthStore } from '../stores/authStore';
import type { User as ApiUser } from '../types/api';
import { AlertTriangle, Eye, User, Shield } from 'lucide-react';

interface ImpersonateUserModalProps {
  user: ApiUser;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImpersonateUserModal({ user, onClose, onSuccess }: ImpersonateUserModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error('Please provide a reason for impersonation');
      }
      if (reason.trim().length < 10) {
        throw new Error('Reason must be at least 10 characters');
      }
      await startImpersonation(user.id, reason.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impersonation-sessions'] });
      toast.success(`Now impersonating ${user.displayName}`);
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to start impersonation');
      toast.error(err.message || 'Failed to start impersonation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    impersonateMutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title="Impersonate User">
      <form onSubmit={handleSubmit}>
        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Important Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                This action will be logged for security and compliance purposes.
                You will be acting as this user and can access their data.
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-lg">
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{user.displayName}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              {user.jobTitle && (
                <div className="text-sm text-gray-400">{user.jobTitle}</div>
              )}
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <FormGroup label="Reason for Impersonation" required>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a detailed reason for impersonating this user (minimum 10 characters)..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            required
            minLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">
            Examples: "Investigating support ticket #12345", "Verifying user permissions issue", "Testing reported UI bug"
          </p>
        </FormGroup>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Session Info */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <strong>Session Duration:</strong> Impersonation sessions automatically expire after 30 minutes.
              You can end the session early by clicking "End Impersonation" in the top banner.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={impersonateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={impersonateMutation.isPending || reason.trim().length < 10}
            className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
          >
            {impersonateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Starting...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Start Impersonation
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

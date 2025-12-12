import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { AppRole } from '../types/api';
import { userInvitationsService } from '../services/userInvitationsService';
import type { CreateInvitationRequest, InvitationResponse, CreateUserDirectRequest, DirectUserCreationResponse } from '../services/userInvitationsService';
import { Modal } from './ui/Modal';
import { RoleSelector } from './RoleSelector';
import { RoleTemplates } from './RoleTemplates';
import { useTenants } from '../hooks/useTenants';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  tenantName?: string;
}

type CreationMode = 'invitation' | 'direct';
type ViewMode = 'form' | 'emailContent' | 'directSuccess';

export function InviteUserModal({ isOpen, onClose, tenantId, tenantName }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId || '');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [creationMode, setCreationMode] = useState<CreationMode>('invitation');
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [invitationResult, setInvitationResult] = useState<InvitationResponse | null>(null);
  const [directResult, setDirectResult] = useState<DirectUserCreationResponse | null>(null);
  const queryClient = useQueryClient();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();



  // Sync selectedTenantId with tenantId prop when modal opens
  useEffect(() => {
    if (isOpen && tenantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenantId(tenantId);
    }
  }, [isOpen, tenantId]);

  const createInvitationMutation = useMutation({
    mutationFn: (request: CreateInvitationRequest) => userInvitationsService.createInvitation(request),
    onSuccess: (result) => {
      setInvitationResult(result);
      setViewMode('emailContent');
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      toast.success('Invitation created! Copy the email content below to send manually.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invitation');
    },
  });

  const createUserDirectMutation = useMutation({
    mutationFn: (request: CreateUserDirectRequest) => userInvitationsService.createUserDirect(request),
    onSuccess: (result) => {
      setDirectResult(result);
      setViewMode('directSuccess');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const handleClose = () => {
    setEmail('');
    setDisplayName('');
    setPassword('');
    setSelectedTenantId(tenantId || '');
    setSelectedRoles([]);
    setShowTemplates(true);
    setCreationMode('invitation');
    setViewMode('form');
    setInvitationResult(null);
    setDirectResult(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !selectedTenantId || selectedRoles.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (creationMode === 'invitation') {
      createInvitationMutation.mutate({
        email,
        tenantId: selectedTenantId,
        roles: selectedRoles,
      });
    } else {
      createUserDirectMutation.mutate({
        email,
        displayName: displayName || undefined,
        tenantId: selectedTenantId,
        roles: selectedRoles,
        password: password || undefined,
      });
    }
  };

  const handleTemplateSelect = (roles: AppRole[]) => {
    setSelectedRoles(roles);
    setShowTemplates(false);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Email content view after invitation is created
  if (viewMode === 'emailContent' && invitationResult) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Invitation Created - Manual Email Required" size="xl">
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Invitation Created</h3>
                <p className="text-sm text-green-700 mt-1">
                  Copy the information below and send it manually to <strong>{invitationResult.invitation.email}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Invitation URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Invitation URL</label>
              <button
                type="button"
                onClick={() => handleCopyToClipboard(invitationResult.invitationUrl, 'URL')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Copy URL
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <code className="text-sm text-gray-800 break-all">{invitationResult.invitationUrl}</code>
            </div>
          </div>

          {/* Email Subject */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Email Subject</label>
              <button
                type="button"
                onClick={() => handleCopyToClipboard(invitationResult.emailSubject, 'Subject')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Copy Subject
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-800">{invitationResult.emailSubject}</span>
            </div>
          </div>

          {/* Plain Text Email Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Plain Text Email (for copying)</label>
              <button
                type="button"
                onClick={() => handleCopyToClipboard(invitationResult.emailPlainTextBody, 'Email body')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Copy Email Body
              </button>
            </div>
            <textarea
              readOnly
              value={invitationResult.emailPlainTextBody}
              rows={10}
              aria-label="Plain text email body"
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 font-mono resize-none"
            />
          </div>

          {/* HTML Preview */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
              View HTML Email Preview
            </summary>
            <div className="p-4 border-t border-gray-200">
              <div
                className="bg-white rounded border"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(invitationResult.emailHtmlBody) }}
              />
            </div>
          </details>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Direct user creation success view
  if (viewMode === 'directSuccess' && directResult) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="User Created Successfully" size="lg">
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{directResult.message}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium text-gray-900">{directResult.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Display Name</label>
              <p className="font-medium text-gray-900">{directResult.displayName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Tenant</label>
              <p className="font-medium text-gray-900">{directResult.tenantName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Password Set</label>
              <p className="font-medium text-gray-900">{directResult.hasPassword ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Password Setup Link */}
          {directResult.setPasswordUrl && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Password Setup Link</label>
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(directResult.setPasswordUrl!, 'URL')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Copy URL
                </button>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <code className="text-sm text-gray-800 break-all">{directResult.setPasswordUrl}</code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Send this link to the user so they can set their password. Link expires in 7 days.
              </p>
            </div>
          )}

          {/* Email Content for Password Setup */}
          {directResult.setPasswordEmailContent && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Password Setup Email Content</label>
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(directResult.setPasswordEmailContent!, 'Email')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Copy Email
                </button>
              </div>
              <textarea
                readOnly
                value={directResult.setPasswordEmailContent}
                rows={8}
                aria-label="Password setup email content"
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 font-mono resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const isPending = createInvitationMutation.isPending || createUserDirectMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Creation Mode Toggle */}
        <div className="bg-gray-50 rounded-lg p-1 flex">
          <button
            type="button"
            onClick={() => setCreationMode('invitation')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              creationMode === 'invitation'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Send Invitation
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('direct')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              creationMode === 'direct'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create User Directly
          </button>
        </div>

        {/* Mode Description */}
        <div className={`p-3 rounded-lg text-sm ${
          creationMode === 'invitation'
            ? 'bg-blue-50 text-blue-800'
            : 'bg-amber-50 text-amber-800'
        }`}>
          {creationMode === 'invitation' ? (
            <>
              <strong>Invitation Mode:</strong> Creates a pending invitation. You'll receive the email content to send manually.
            </>
          ) : (
            <>
              <strong>Direct Creation:</strong> Creates the user account immediately. You can set a password or get a password setup link.
            </>
          )}
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
            disabled={isPending}
          />
        </div>

        {/* Display Name - Only for direct creation */}
        {creationMode === 'direct' && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe (defaults to email prefix)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isPending}
            />
          </div>
        )}

        {/* Tenant Selection - Only show if tenantId not provided */}
        {!tenantId && (
          <div>
            <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant <span className="text-red-500">*</span>
            </label>
            <select
              id="tenant"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              required
              disabled={isPending || tenantsLoading}
            >
              <option value="">Select a tenant...</option>
              {tenants?.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            {tenantsLoading && (
              <p className="mt-1 text-xs text-gray-500">Loading tenants...</p>
            )}
          </div>
        )}

        {/* Tenant Display - Show if tenantId provided */}
        {tenantId && tenantName && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{tenantName}</p>
              <p className="text-xs text-gray-500">{tenantId}</p>
            </div>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Roles <span className="text-red-500">*</span>
            </label>
            {!showTemplates && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                Show Templates
              </button>
            )}
          </div>

          {showTemplates ? (
            <RoleTemplates
              onSelectTemplate={handleTemplateSelect}
              disabled={isPending}
              showSystemRoles={false}
            />
          ) : (
            <div className="space-y-3">
              <RoleSelector
                selectedRoles={selectedRoles}
                onChange={setSelectedRoles}
                disabled={isPending}
                showSystemRoles={false}
              />
              {selectedRoles.length === 0 && (
                <p className="text-sm text-red-500">Please select at least one role</p>
              )}
            </div>
          )}
        </div>

        {/* Password - Only for direct creation */}
        {creationMode === 'direct' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password (optional)
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to generate password setup link"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-gray-500">
              If left blank, you'll get a password setup link to send to the user.
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending || selectedRoles.length === 0}
          >
            {isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : creationMode === 'invitation' ? (
              'Create Invitation'
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

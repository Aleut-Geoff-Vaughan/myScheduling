import { useState, useEffect } from 'react';
import { X, Link2, Copy, Check, Eye, Trash2, Loader2, Lock, Calendar, Globe } from 'lucide-react';
import { api } from '../../lib/api-client';

interface ShareModalProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareLink {
  id: string;
  shareToken: string;
  expiresAt: string | null;
  hasPassword: boolean;
  hideContactInfo: boolean;
  visibleSections: string | null;
  viewCount: number;
  createdAt: string;
  createdByName: string;
  versionName: string;
}

interface CreateShareLinkRequest {
  versionId?: string;
  expiresAt?: string;
  password?: string;
  visibleSections?: string;
  hideContactInfo?: boolean;
}

export function ShareModal({ resumeId, isOpen, onClose }: ShareModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [password, setPassword] = useState('');
  const [hideContactInfo, setHideContactInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen, resumeId]);

  const loadShareLinks = async () => {
    setLoading(true);
    try {
      const links = await api.get<ShareLink[]>(`/resumes/${resumeId}/shares`);
      setShareLinks(links);
    } catch (error) {
      console.error('Error loading share links:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    setCreating(true);
    try {
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const request: CreateShareLinkRequest = {
        expiresAt,
        password: password || undefined,
        hideContactInfo
      };

      await api.post<ShareLink>(`/resumes/${resumeId}/share`, request);
      await loadShareLinks();
      setShowCreateForm(false);
      setPassword('');
      setExpiresIn('never');
      setHideContactInfo(false);
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const deleteShareLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this share link?')) return;

    try {
      await api.delete(`/resumes/share/${linkId}`);
      setShareLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (error) {
      console.error('Error deleting share link:', error);
      alert('Failed to revoke share link. Please try again.');
    }
  };

  const copyToClipboard = async (token: string, linkId: string) => {
    const shareUrl = `${window.location.origin}/resume/share/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/resume/share/${token}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Resume</h2>
              <p className="text-sm text-gray-500">Create shareable links for external viewing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Create New Link Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Link2 className="w-5 h-5" />
              Create New Share Link
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-medium text-gray-900">Create Share Link</h3>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Expiration
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="never">Never expires</option>
                  <option value="7">Expires in 7 days</option>
                  <option value="30">Expires in 30 days</option>
                  <option value="90">Expires in 90 days</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Protection (optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Hide Contact Info */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideContactInfo}
                  onChange={(e) => setHideContactInfo(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hide contact information (email, phone)</span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createShareLink}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Existing Links */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Active Share Links</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No share links created yet</p>
                <p className="text-sm">Create a link to share your resume externally</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map(link => (
                  <div
                    key={link.id}
                    className={`p-4 rounded-lg border ${
                      isExpired(link.expiresAt)
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Link URL */}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate block max-w-md">
                            {getShareUrl(link.shareToken)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(link.shareToken, link.id)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            title="Copy link"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>

                        {/* Link Details */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {link.hasPassword && (
                            <span className="flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Password protected
                            </span>
                          )}
                          {link.expiresAt && (
                            <span className={`flex items-center gap-1 ${
                              isExpired(link.expiresAt) ? 'text-red-600' : ''
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {isExpired(link.expiresAt)
                                ? 'Expired'
                                : `Expires ${formatDate(link.expiresAt)}`}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {link.viewCount} views
                          </span>
                          <span>
                            Created {formatDate(link.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => deleteShareLink(link.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

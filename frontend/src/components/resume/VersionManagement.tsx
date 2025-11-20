import { useState, useEffect } from 'react';
import { Clock, GitBranch, Eye, Download, Tag } from 'lucide-react';
import {
  getResumeVersions,
  createResumeVersion,
  setActiveVersion,
  getVersionById
} from '../../services/resumeService';
import { ResumeVersion } from '../../types/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface VersionManagementProps {
  resumeId: string;
  currentVersionId?: string;
  onVersionChange?: () => void;
}

export function VersionManagement({
  resumeId,
  currentVersionId,
  onVersionChange
}: VersionManagementProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [resumeId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResumeVersions(resumeId);
      setVersions(data);
    } catch (err) {
      console.error('Error loading versions:', err);
      setError('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (versionNotes: string) => {
    try {
      await createResumeVersion(resumeId, { versionNotes });
      await loadVersions();
      setShowCreateModal(false);
      onVersionChange?.();
    } catch (err) {
      console.error('Error creating version:', err);
      setError('Failed to create version');
    }
  };

  const handleSetActive = async (versionId: string) => {
    if (!confirm('Set this version as active? This will update the current resume state.')) {
      return;
    }

    try {
      await setActiveVersion(resumeId, versionId);
      await loadVersions();
      onVersionChange?.();
    } catch (err) {
      console.error('Error setting active version:', err);
      setError('Failed to set active version');
    }
  };

  const handleViewVersion = async (versionId: string) => {
    try {
      const version = await getVersionById(resumeId, versionId);
      setSelectedVersion(version);
      setShowVersionDetails(true);
    } catch (err) {
      console.error('Error loading version details:', err);
      setError('Failed to load version details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading versions...</div>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Version History
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {versions.length} version{versions.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Tag className="w-4 h-4 mr-2" />
          Create Version
        </Button>
      </div>

      {/* Versions List */}
      {versions.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No versions yet</h4>
            <p className="text-sm text-gray-500">
              Create version snapshots to track changes over time
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((version) => (
              <Card
                key={version.id}
                className={`${
                  version.id === currentVersionId
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          Version {version.versionNumber}
                        </h4>
                        {version.id === currentVersionId && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(version.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {version.versionNotes && (
                        <p className="text-sm text-gray-700 mt-2">{version.versionNotes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleViewVersion(version.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {version.id !== currentVersionId && (
                        <button
                          onClick={() => handleSetActive(version.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          Set Active
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Version Metadata */}
                  {version.contentSnapshot && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Content snapshot captured
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateModal && (
        <CreateVersionModal
          onSubmit={handleCreateVersion}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Version Details Modal */}
      {showVersionDetails && selectedVersion && (
        <VersionDetailsModal
          version={selectedVersion}
          onClose={() => {
            setShowVersionDetails(false);
            setSelectedVersion(null);
          }}
        />
      )}
    </div>
  );
}

// Create Version Modal Component
interface CreateVersionModalProps {
  onSubmit: (versionNotes: string) => void;
  onClose: () => void;
}

function CreateVersionModal({ onSubmit, onClose }: CreateVersionModalProps) {
  const [versionNotes, setVersionNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(versionNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Create New Version</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version Notes
            </label>
            <textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what changed in this version..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Version</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Version Details Modal Component
interface VersionDetailsModalProps {
  version: ResumeVersion;
  onClose: () => void;
}

function VersionDetailsModal({ version, onClose }: VersionDetailsModalProps) {
  const contentData = version.contentSnapshot
    ? JSON.parse(version.contentSnapshot)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">Version {version.versionNumber}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Created {new Date(version.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {version.versionNotes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{version.versionNotes}</p>
          </div>
        )}

        {contentData && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Content Snapshot</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(contentData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

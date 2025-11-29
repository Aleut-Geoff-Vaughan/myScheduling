import { useState, useEffect } from 'react';
import { Clock, GitBranch, Eye, Tag, GitCompare, ArrowRight, Plus, Minus, RefreshCw } from 'lucide-react';
import {
  getVersions,
  createVersion,
  activateVersion,
  getVersion
} from '../../services/resumeService';
import { type ResumeVersion } from '../../types/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

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
  const { user } = useAuthStore();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ left: ResumeVersion | null; right: ResumeVersion | null }>({
    left: null,
    right: null
  });

  useEffect(() => {
    loadVersions();
  }, [resumeId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVersions(resumeId);
      setVersions(data);
    } catch (err) {
      console.error('Error loading versions:', err);
      setError('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (versionNotes: string) => {
    if (!user?.id) {
      setError('You must be logged in to create a version');
      return;
    }

    try {
      await createVersion(resumeId, {
        versionName: `Version ${versions.length + 1}`,
        description: versionNotes,
        createdByUserId: user.id
      });
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
      await activateVersion(resumeId, versionId);
      await loadVersions();
      onVersionChange?.();
    } catch (err) {
      console.error('Error setting active version:', err);
      setError('Failed to set active version');
    }
  };

  const handleViewVersion = async (versionId: string) => {
    try {
      const version = await getVersion(resumeId, versionId);
      setSelectedVersion(version);
      setShowVersionDetails(true);
    } catch (err) {
      console.error('Error loading version details:', err);
      setError('Failed to load version details');
    }
  };

  const handleOpenCompare = () => {
    // Default to comparing the two most recent versions
    const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    setCompareVersions({
      left: sortedVersions[1] || null,
      right: sortedVersions[0] || null
    });
    setShowCompareModal(true);
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
        <div className="flex gap-2">
          {versions.length >= 2 && (
            <Button onClick={handleOpenCompare} size="sm" variant="secondary">
              <GitCompare className="w-4 h-4 mr-2" />
              Compare
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Tag className="w-4 h-4 mr-2" />
            Create Version
          </Button>
        </div>
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
                      {version.description && (
                        <p className="text-sm text-gray-700 mt-2">{version.description}</p>
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

      {/* Version Compare Modal */}
      {showCompareModal && (
        <VersionCompareModal
          versions={versions}
          leftVersion={compareVersions.left}
          rightVersion={compareVersions.right}
          onSelectLeft={(v) => setCompareVersions({ ...compareVersions, left: v })}
          onSelectRight={(v) => setCompareVersions({ ...compareVersions, right: v })}
          onSwap={() => setCompareVersions({ left: compareVersions.right, right: compareVersions.left })}
          onClose={() => setShowCompareModal(false)}
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
            <Button type="button" variant="secondary" onClick={onClose}>
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

        {version.description && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{version.description}</p>
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

// Version Compare Modal Component
interface VersionCompareModalProps {
  versions: ResumeVersion[];
  leftVersion: ResumeVersion | null;
  rightVersion: ResumeVersion | null;
  onSelectLeft: (version: ResumeVersion) => void;
  onSelectRight: (version: ResumeVersion) => void;
  onSwap: () => void;
  onClose: () => void;
}

interface ContentSnapshot {
  displayName?: string;
  jobTitle?: string;
  email?: string;
  summary?: string;
  sections?: Array<{
    type: string;
    entries?: Array<{
      title?: string;
      organization?: string;
      description?: string;
    }>;
  }>;
  skills?: Array<{
    name?: string;
    proficiencyLevel?: number;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
  }>;
}

function VersionCompareModal({
  versions,
  leftVersion,
  rightVersion,
  onSelectLeft,
  onSelectRight,
  onSwap,
  onClose
}: VersionCompareModalProps) {
  const parseSnapshot = (snapshot: string | undefined): ContentSnapshot | null => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  };

  const leftData = parseSnapshot(leftVersion?.contentSnapshot);
  const rightData = parseSnapshot(rightVersion?.contentSnapshot);

  const compareField = (leftVal: string | undefined, rightVal: string | undefined, label: string) => {
    const hasChanged = leftVal !== rightVal;
    if (!leftVal && !rightVal) return null;

    return (
      <div className={`p-3 rounded-lg ${hasChanged ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {hasChanged && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Changed</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={`text-sm ${hasChanged && leftVal ? 'text-red-600' : 'text-gray-600'}`}>
            {leftVal ? (
              <span className="flex items-start gap-1">
                {hasChanged && <Minus className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {leftVal}
              </span>
            ) : (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
          <div className={`text-sm ${hasChanged && rightVal ? 'text-green-600' : 'text-gray-600'}`}>
            {rightVal ? (
              <span className="flex items-start gap-1">
                {hasChanged && <Plus className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {rightVal}
              </span>
            ) : (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <GitCompare className="w-6 h-6" />
              Compare Versions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Select two versions to compare their content snapshots
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close"
            aria-label="Close comparison modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="left-version-select" className="block text-sm font-medium text-gray-700 mb-2">
              Older Version (Left)
            </label>
            <select
              id="left-version-select"
              value={leftVersion?.id || ''}
              onChange={(e) => {
                const v = versions.find(ver => ver.id === e.target.value);
                if (v) onSelectLeft(v);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Select older version for comparison"
            >
              <option value="">Select version...</option>
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === rightVersion?.id}>
                  Version {v.versionNumber} - {new Date(v.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="right-version-select" className="block text-sm font-medium text-gray-700 mb-2">
                Newer Version (Right)
              </label>
              <select
                id="right-version-select"
                value={rightVersion?.id || ''}
                onChange={(e) => {
                  const v = versions.find(ver => ver.id === e.target.value);
                  if (v) onSelectRight(v);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select newer version for comparison"
              >
                <option value="">Select version...</option>
                {sortedVersions.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.id === leftVersion?.id}>
                    Version {v.versionNumber} - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onSwap}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Swap versions"
              aria-label="Swap left and right versions"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        {leftVersion && rightVersion ? (
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-2 gap-4 border-b pb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Clock className="w-4 h-4" />
                Version {leftVersion.versionNumber}
                <span className="text-gray-500 font-normal">
                  ({new Date(leftVersion.createdAt).toLocaleDateString()})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                Version {rightVersion.versionNumber}
                <span className="text-gray-500 font-normal">
                  ({new Date(rightVersion.createdAt).toLocaleDateString()})
                </span>
              </div>
            </div>

            {/* Basic Info Comparison */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h4>
              {compareField(leftData?.displayName, rightData?.displayName, 'Display Name')}
              {compareField(leftData?.jobTitle, rightData?.jobTitle, 'Job Title')}
              {compareField(leftData?.email, rightData?.email, 'Email')}
              {compareField(leftData?.summary, rightData?.summary, 'Summary')}
            </div>

            {/* Skills Comparison */}
            {(leftData?.skills?.length || rightData?.skills?.length) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Skills</h4>
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    {leftData?.skills?.map((skill, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {skill.name} (Level {skill.proficiencyLevel})
                      </div>
                    )) || <span className="text-gray-400 italic text-sm">No skills</span>}
                  </div>
                  <div className="space-y-1">
                    {rightData?.skills?.map((skill, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {skill.name} (Level {skill.proficiencyLevel})
                      </div>
                    )) || <span className="text-gray-400 italic text-sm">No skills</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Certifications Comparison */}
            {(leftData?.certifications?.length || rightData?.certifications?.length) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Certifications</h4>
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    {leftData?.certifications?.map((cert, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {cert.name} ({cert.issuer})
                      </div>
                    )) || <span className="text-gray-400 italic text-sm">No certifications</span>}
                  </div>
                  <div className="space-y-1">
                    {rightData?.certifications?.map((cert, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {cert.name} ({cert.issuer})
                      </div>
                    )) || <span className="text-gray-400 italic text-sm">No certifications</span>}
                  </div>
                </div>
              </div>
            )}

            {/* No Data State */}
            {!leftData && !rightData && (
              <div className="text-center py-8 text-gray-500">
                <GitCompare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No content snapshots available for comparison.</p>
                <p className="text-sm">Snapshots are captured when versions are created.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Select two versions to compare</p>
            <p className="text-sm mt-1">Choose versions from the dropdowns above</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

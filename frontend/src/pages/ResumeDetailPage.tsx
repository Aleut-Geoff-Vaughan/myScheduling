import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getResume,
  addSection,
  deleteEntry,
  getVersions,
  createVersion,
  requestApproval
} from '../services/resumeService';
import {
  ResumeStatus,
  ResumeSectionType,
  type ResumeProfile,
  type ResumeSection,
  type ResumeVersion,
  type CreateResumeSectionRequest,
  type UpdateResumeSectionRequest
} from '../types/api';

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // editMode removed - unused
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'versions'>('overview');

  // Form states
  const [editingSection, setEditingSection] = useState<ResumeSection | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadResumeData();
    } else if (id === 'new') {
      // Initialize empty resume for creation
      setLoading(false);
      setResume(null);
      setSections([]);
      setVersions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const resumeData = await getResume(id!);
      const versionsData = await getVersions(id!);
      setResume(resumeData);
      setSections(resumeData.sections || []);
      setVersions(versionsData);
    } catch (err) {
      setError('Failed to load resume data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionData: CreateResumeSectionRequest | UpdateResumeSectionRequest) => {
    try {
      if (editingSection) {
        // Update existing section - not yet implemented
        console.error('Update section not yet implemented');
      } else {
        // Create new section
        await addSection(id!, sectionData as CreateResumeSectionRequest);
      }
      await loadResumeData();
      setShowSectionModal(false);
      setEditingSection(null);
    } catch (err) {
      console.error('Failed to save section:', err);
      setError('Failed to save section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      await deleteEntry(sectionId);
      await loadResumeData();
    } catch (err) {
      console.error('Failed to delete section:', err);
      setError('Failed to delete section');
    }
  };

  const handleCreateVersion = async () => {
    if (!confirm('Create a new version snapshot of this resume?')) return;

    try {
      // TODO: Get current user ID from auth context
      const currentUserId = 'temp-user-id'; // Replace with actual user ID
      await createVersion(id!, {
        versionName: `Version ${new Date().toLocaleDateString()}`,
        description: `Version created on ${new Date().toLocaleDateString()}`,
        createdByUserId: currentUserId
      });
      await loadResumeData();
    } catch (err) {
      console.error('Failed to create version:', err);
      setError('Failed to create version');
    }
  };

  const handleRequestApproval = async () => {
    if (!confirm('Submit this resume for approval?')) return;

    try {
      // TODO: Get current user ID from auth context
      const currentUserId = 'temp-user-id'; // Replace with actual user ID
      await requestApproval({
        resumeProfileId: id!,
        requestedByUserId: currentUserId,
        requestNotes: 'Please review my resume'
      });
      await loadResumeData();
    } catch (err) {
      console.error('Failed to request approval:', err);
      setError('Failed to request approval');
    }
  };

  const getStatusBadge = (status: ResumeStatus) => {
    const badges: Record<ResumeStatus, string> = {
      [ResumeStatus.Draft]: 'bg-gray-100 text-gray-800',
      [ResumeStatus.PendingReview]: 'bg-yellow-100 text-yellow-800',
      [ResumeStatus.Approved]: 'bg-green-100 text-green-800',
      [ResumeStatus.ChangesRequested]: 'bg-orange-100 text-orange-800',
      [ResumeStatus.Active]: 'bg-blue-100 text-blue-800',
      [ResumeStatus.Archived]: 'bg-gray-100 text-gray-600'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading resume...</div>
      </div>
    );
  }

  if (id === 'new') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Resume</h1>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            <p className="font-medium">Resume Creation Not Fully Implemented</p>
            <p className="mt-1 text-sm">
              The resume creation feature is currently under development.
              Please use the API or contact your administrator to create a resume profile.
            </p>
          </div>
          <button
            onClick={() => navigate('/resumes')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Resumes
          </button>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Resume not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/resumes')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {resume.user
                  ? resume.user.displayName || resume.user.name || resume.user.email
                  : 'Resume'}
              </h1>
              <p className="text-gray-500">{resume.user?.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(resume.status)}`}>
              {resume.status}
            </span>
            {resume.status === ResumeStatus.Draft && (
              <button
                onClick={handleRequestApproval}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Request Approval
              </button>
            )}
            <button
              onClick={handleCreateVersion}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Create Version
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`${
                activeTab === 'sections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Sections ({sections.length})
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`${
                activeTab === 'versions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Versions ({versions.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Profile
                </label>
                {resume.linkedInProfileUrl ? (
                  <a
                    href={resume.linkedInProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {resume.linkedInProfileUrl}
                  </a>
                ) : (
                  <p className="text-gray-500">Not linked</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Synced
                </label>
                <p className="text-gray-900">
                  {resume.linkedInLastSyncedAt
                    ? new Date(resume.linkedInLastSyncedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            {resume.lastReviewedAt && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Last Review</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reviewed At
                    </label>
                    <p className="text-gray-900">
                      {new Date(resume.lastReviewedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Status
                    </label>
                    <p className="text-gray-900">
                      {resume.isPublic ? 'Public' : 'Private'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {resume.user && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <p className="text-gray-900">{resume.user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <p className="text-gray-900">
                      {resume.user.phoneNumber || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sections' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Resume Sections</h3>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setShowSectionModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Section
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sections</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a section.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((section) => (
                    <div
                      key={section.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{ResumeSectionType[section.type]}</h4>
                          <p className="text-sm text-gray-500">Order: {section.displayOrder}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingSection(section);
                              setShowSectionModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {section.entries && section.entries.length > 0 && (
                        <div className="mt-3 text-sm text-gray-600">
                          {section.entries.length} entries
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Version History</h3>
            </div>

            {versions.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No versions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Version snapshots will appear here when created.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">
                            Version {version.versionNumber}
                          </h4>
                          {version.id === resume.currentVersionId && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Created {new Date(version.createdAt).toLocaleString()}
                        </p>
                        {version.description && (
                          <p className="text-sm text-gray-700 mt-2">{version.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section Modal */}
      {showSectionModal && (
        <SectionModal
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => {
            setShowSectionModal(false);
            setEditingSection(null);
          }}
        />
      )}
    </div>
  );
}

// Section Modal Component
interface SectionModalProps {
  section: ResumeSection | null;
  onSave: (data: CreateResumeSectionRequest | UpdateResumeSectionRequest) => void;
  onClose: () => void;
}

function SectionModal({ section, onSave, onClose }: SectionModalProps) {
  const [formData, setFormData] = useState({
    type: section?.type ?? ResumeSectionType.Summary,
    displayOrder: section?.displayOrder || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {section ? 'Edit Section' : 'Add Section'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: parseInt(e.target.value) as ResumeSectionType })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={ResumeSectionType.Summary}>Summary</option>
              <option value={ResumeSectionType.Experience}>Experience</option>
              <option value={ResumeSectionType.Education}>Education</option>
              <option value={ResumeSectionType.Certifications}>Certifications</option>
              <option value={ResumeSectionType.Skills}>Skills</option>
              <option value={ResumeSectionType.Projects}>Projects</option>
              <option value={ResumeSectionType.Awards}>Awards</option>
              <option value={ResumeSectionType.Publications}>Publications</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData({ ...formData, displayOrder: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

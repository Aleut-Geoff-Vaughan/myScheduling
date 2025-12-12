import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Upload, Edit, PenLine } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ResumeVersionTile } from '../components/resume/ResumeVersionTile';
import { FileAttachmentList } from '../components/resume/FileAttachmentList';
import { FileUploadModal } from '../components/resume/FileUploadModal';
import { ExpiringCertificationsCompact } from '../components/resume/ExpiringCertificationsCompact';
import { getMyResume, createResume, getVersions, createVersion } from '../services/resumeService';
import { useFiles, useUploadFile, useDeleteFile, useDownloadFile } from '../hooks/useFileStorage';
import { useAuthStore } from '../stores/authStore';
import type { ResumeProfile, ResumeVersion } from '../types/api';
import { ResumeStatus } from '../types/api';
import toast from 'react-hot-toast';

export function ResumesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // File storage hooks
  const { data: filesData, isLoading: filesLoading } = useFiles('Resume');
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteFile();
  const downloadFileMutation = useDownloadFile();

  useEffect(() => {
    loadMyResume();
  }, []);

  const loadMyResume = async () => {
    try {
      setLoading(true);
      const data = await getMyResume();
      setResume(data);

      if (data?.id) {
        const versionsData = await getVersions(data.id);
        setVersions(versionsData);
      }
    } catch (err) {
      console.error('Error loading resume:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResume = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setCreating(true);
      const newResume = await createResume({ userId: user.id });
      toast.success('Resume created successfully!');
      navigate(`/resumes/${newResume.id}`);
    } catch (err) {
      console.error('Error creating resume:', err);
      const errorResponse = err as { response?: { status?: number } };
      if (errorResponse?.response?.status === 409) {
        toast.error('You already have a resume');
        loadMyResume();
      } else {
        toast.error('Failed to create resume');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!resume?.id || !user?.id) return;

    try {
      setCreatingVersion(true);
      const versionName = `Version ${versions.length + 1}`;
      await createVersion(resume.id, { versionName, createdByUserId: user.id });
      toast.success('New version created');
      loadMyResume();
    } catch (err) {
      console.error('Error creating version:', err);
      toast.error('Failed to create version');
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleVersionClick = (version: ResumeVersion) => {
    if (resume?.id) {
      navigate(`/resumes/${resume.id}?version=${version.id}`);
    }
  };

  const handleUpload = async (file: File, onProgress: (progress: number) => void) => {
    await uploadFileMutation.mutateAsync({ file, category: 'Resume', onProgress });
    setShowUploadModal(false);
  };

  const getStatusBadge = (status: ResumeStatus) => {
    const statusConfig: Record<ResumeStatus, { label: string; className: string }> = {
      [ResumeStatus.Draft]: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      [ResumeStatus.PendingReview]: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-700' },
      [ResumeStatus.Approved]: { label: 'Approved', className: 'bg-green-100 text-green-700' },
      [ResumeStatus.ChangesRequested]: { label: 'Changes Requested', className: 'bg-orange-100 text-orange-700' },
      [ResumeStatus.Active]: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
      [ResumeStatus.Archived]: { label: 'Archived', className: 'bg-gray-100 text-gray-500' },
    };
    const config = statusConfig[status] || statusConfig[ResumeStatus.Draft];
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your resume...</p>
        </div>
      </div>
    );
  }

  // No resume exists - show create prompt
  if (!resume) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Resume</h1>
          <p className="mt-2 text-gray-600">Manage your professional resume versions</p>
        </div>

        <Card className="p-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Create Your Resume</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You haven't created a resume yet. Get started by creating your professional
              resume to showcase your skills, experience, and qualifications.
            </p>
            <Button onClick={handleCreateResume} disabled={creating} size="lg">
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create My Resume
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Resume exists - show new simplified layout
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Resume</h1>
          <p className="mt-2 text-gray-600">Manage your professional resume versions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(`/resumes/${resume.id}`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Current
          </Button>
          <Button onClick={handleCreateVersion} disabled={creatingVersion}>
            {creatingVersion ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                New Version
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resume Versions Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume Versions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Current Draft Tile - Always shown */}
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300 border-2 border-dashed border-blue-300 bg-blue-50/30"
            onClick={() => navigate(`/resumes/${resume.id}`)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-blue-600" />
                </div>
                {getStatusBadge(resume.status)}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-blue-600 font-medium">Current</p>
                <h3 className="font-semibold text-gray-900 truncate">
                  Working Draft
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Your current resume content
              </p>
            </div>
          </Card>

          {/* Saved Versions */}
          {versions.map((version) => (
            <ResumeVersionTile
              key={version.id}
              version={version}
              onClick={() => handleVersionClick(version)}
            />
          ))}
        </div>
      </div>

      {/* Expiring Certifications */}
      <ExpiringCertificationsCompact />

      {/* My Attachments */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Attachments</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          {filesLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          ) : (
            <FileAttachmentList
              files={filesData?.items || []}
              onDownload={(fileId) => downloadFileMutation.mutate(fileId)}
              onDelete={(fileId) => {
                if (confirm('Are you sure you want to delete this file?')) {
                  deleteFileMutation.mutate(fileId);
                }
              }}
              isDeleting={deleteFileMutation.isPending}
              isDownloading={downloadFileMutation.isPending}
            />
          )}
        </div>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()} at{' '}
        {new Date(resume.updatedAt || resume.createdAt).toLocaleTimeString()}
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        isUploading={uploadFileMutation.isPending}
      />
    </div>
  );
}

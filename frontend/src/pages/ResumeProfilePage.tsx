import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Shield, ChevronUp } from 'lucide-react';
import { useAuthStore, AppRole } from '../stores/authStore';
import {
  getResume,
  getResumes,
  createResume,
  addSection,
  addEntry,
  updateEntry,
  deleteEntry,
  requestApproval
} from '../services/resumeService';
import {
  getSkills,
  getUserSkills,
  addUserSkill,
  updateUserSkill,
  deleteUserSkill
} from '../services/skillsService';
import {
  getCertifications,
  getUserCertifications,
  addUserCertification,
  updateUserCertification,
  deleteUserCertification,
  type Certification,
  type PersonCertification
} from '../services/certificationsService';
import {
  ResumeStatus,
  ResumeSectionType,
  type ResumeProfile,
  type ResumeSection,
  type ResumeEntry,
  type PersonSkill,
  type Skill
} from '../types/api';

// Import section components
import { ProfileHeader } from '../components/resume/ProfileHeader';
import { SummarySection } from '../components/resume/SummarySection';
import { ExperienceSection } from '../components/resume/ExperienceSection';
import { EducationSection } from '../components/resume/EducationSection';
import { SkillsSection } from '../components/resume/SkillsSection';
import { CertificationsSection } from '../components/resume/CertificationsSection';
import { ExportModal } from '../components/resume/ExportModal';
import { ShareModal } from '../components/resume/ShareModal';
import { VersionManagement } from '../components/resume/VersionManagement';
import { ApprovalWorkflow } from '../components/resume/ApprovalWorkflow';

export function ResumeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  // Skills state
  const [userSkills, setUserSkills] = useState<PersonSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);

  // Certifications state
  const [userCertifications, setUserCertifications] = useState<PersonCertification[]>([]);
  const [availableCertifications, setAvailableCertifications] = useState<Certification[]>([]);

  // Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Panel visibility state
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);

  // Determine if current user owns this resume
  const isOwner = resume?.userId === user?.id;

  // Check if user can approve resumes (managers and admins)
  const { hasRole } = useAuthStore();
  const canApprove = hasRole(AppRole.ResourceManager) || hasRole(AppRole.TenantAdmin) || hasRole(AppRole.SysAdmin);

  useEffect(() => {
    if (id) {
      if (id === 'new') {
        handleNewResume();
      } else {
        loadResume(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleNewResume = async () => {
    // Prevent double-invocation from React StrictMode
    if (isCreatingRef.current) {
      console.log('Already creating resume, skipping...');
      return;
    }

    console.log('handleNewResume called, user:', user);
    if (!user?.id) {
      console.log('No user ID, showing error');
      setError('You must be logged in to create a resume.');
      setLoading(false);
      return;
    }

    isCreatingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Check if user already has a resume
      console.log('Fetching existing resumes...');
      const existingResumes = await getResumes(undefined, undefined, undefined);
      console.log('Found resumes:', existingResumes);
      const userResume = existingResumes.find(r => r.userId === user.id);
      console.log('User resume:', userResume);

      if (userResume) {
        // Redirect to existing resume
        console.log('Redirecting to existing resume:', userResume.id);
        navigate(`/resumes/${userResume.id}`, { replace: true });
        return;
      }

      // Create a new resume for the user
      console.log('Creating new resume...');
      const newResume = await createResume({ userId: user.id });
      console.log('Created resume:', newResume);
      navigate(`/resumes/${newResume.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create resume:', err);
      setError('Failed to create resume. Please try again.');
      setLoading(false);
      isCreatingRef.current = false;
    }
  };

  const loadResume = async (resumeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResume(resumeId);
      setResume(data);

      // Load user skills and certifications if we have a userId
      if (data.userId) {
        try {
          const [skills, allSkills, certs, allCerts] = await Promise.all([
            getUserSkills(data.userId),
            getSkills(),
            getUserCertifications(data.userId),
            getCertifications()
          ]);
          setUserSkills(skills);
          setAvailableSkills(allSkills);
          setUserCertifications(certs);
          setAvailableCertifications(allCerts);
        } catch (err) {
          console.error('Failed to load skills/certifications:', err);
          // Don't fail the whole page if skills/certifications fail to load
        }
      }
    } catch (err) {
      console.error('Failed to load resume:', err);
      setError('Failed to load resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get section by type
  const getSection = (type: ResumeSectionType): ResumeSection | undefined => {
    return resume?.sections?.find(s => s.type === type);
  };

  // Get entries for a section type
  const getEntries = (type: ResumeSectionType): ResumeEntry[] => {
    const section = getSection(type);
    return section?.entries || [];
  };

  // Ensure a section exists (create if not)
  const ensureSection = async (type: ResumeSectionType): Promise<ResumeSection> => {
    const existing = getSection(type);
    if (existing) return existing;

    if (!resume?.id) throw new Error('No resume loaded');

    // Create the section and get it back from the API
    const newSection = await addSection(resume.id, {
      type,
      title: ResumeSectionType[type],
      displayOrder: type
    });

    // Also reload the resume to update the UI state
    loadResume(resume.id);

    // Return the new section directly (don't wait for state update)
    return newSection;
  };

  // Handler for saving summary
  const handleSaveSummary = async (content: string) => {
    if (!resume?.id) return;
    const section = await ensureSection(ResumeSectionType.Summary);
    const existingEntry = section.entries?.[0];

    if (existingEntry) {
      await updateEntry(existingEntry.id, { description: content });
    } else {
      await addEntry(section.id, {
        title: 'Professional Summary',
        description: content
      });
    }
    await loadResume(resume.id);
  };

  // Generic handler for adding entries
  const handleAddEntry = async (sectionType: ResumeSectionType, entry: Partial<ResumeEntry>) => {
    if (!resume?.id) return;
    const section = await ensureSection(sectionType);
    await addEntry(section.id, {
      title: entry.title || '',
      organization: entry.organization,
      startDate: entry.startDate,
      endDate: entry.endDate,
      description: entry.description,
      additionalFields: entry.additionalFields
    });
    await loadResume(resume.id);
  };

  // Generic handler for updating entries
  const handleUpdateEntry = async (_sectionType: ResumeSectionType, entryId: string, entry: Partial<ResumeEntry>) => {
    if (!resume?.id) return;
    await updateEntry(entryId, entry);
    await loadResume(resume.id);
  };

  // Generic handler for deleting entries
  const handleDeleteEntry = async (_sectionType: ResumeSectionType, entryId: string) => {
    if (!resume?.id) return;
    await deleteEntry(entryId);
    await loadResume(resume.id);
  };

  // Handler for requesting approval
  const handleRequestApproval = async () => {
    if (!user?.id || !resume?.id) return;
    await requestApproval({
      resumeProfileId: resume.id,
      requestedByUserId: user.id,
      requestNotes: 'Please review my updated resume.'
    });
    await loadResume(resume.id);
  };

  // Handler for export - opens export modal
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Handler for share - opens share modal
  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Resume Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            The resume you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate('/resumes')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Resumes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/resumes')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Resumes
            </button>

            <div className="flex items-center gap-2">
              {isOwner && resume && (
                <button
                  type="button"
                  onClick={() => setShowVersionPanel(!showVersionPanel)}
                  className={`p-2 rounded-lg transition-colors ${
                    showVersionPanel
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Version History"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              {canApprove && resume && (
                <button
                  type="button"
                  onClick={() => setShowApprovalPanel(!showApprovalPanel)}
                  className={`p-2 rounded-lg transition-colors ${
                    showApprovalPanel
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Approval Workflow"
                >
                  <Shield className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Panels */}
      {(showVersionPanel || showApprovalPanel) && (
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Version Management Panel */}
              {showVersionPanel && isOwner && resume && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Version History
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowVersionPanel(false)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Close version panel"
                      aria-label="Close version panel"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>
                  <VersionManagement
                    resumeId={resume.id}
                    currentVersionId={resume.versions?.[0]?.id}
                    onVersionChange={() => loadResume(resume.id)}
                  />
                </div>
              )}

              {/* Approval Workflow Panel */}
              {showApprovalPanel && canApprove && resume && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Approval Workflow
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowApprovalPanel(false)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Close approval panel"
                      aria-label="Close approval panel"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>
                  <ApprovalWorkflow
                    resumeId={resume.id}
                    onApprovalChange={() => loadResume(resume.id)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <ProfileHeader
            resume={resume}
            user={resume.user || null}
            isOwner={isOwner}
            onEdit={() => navigate(`/resumes/${resume.id}/edit`)}
            onExport={handleExport}
            onShare={handleShare}
            onRequestApproval={
              resume.status === ResumeStatus.Draft ? handleRequestApproval : undefined
            }
          />

          {/* Summary Section */}
          <SummarySection
            entry={getEntries(ResumeSectionType.Summary)[0]}
            isEditable={isOwner}
            onSave={handleSaveSummary}
          />

          {/* Experience Section */}
          <ExperienceSection
            entries={getEntries(ResumeSectionType.Experience)}
            isEditable={isOwner}
            onAdd={(entry) => handleAddEntry(ResumeSectionType.Experience, entry)}
            onUpdate={(entryId, entry) => handleUpdateEntry(ResumeSectionType.Experience, entryId, entry)}
            onDelete={(entryId) => handleDeleteEntry(ResumeSectionType.Experience, entryId)}
          />

          {/* Education Section */}
          <EducationSection
            entries={getEntries(ResumeSectionType.Education)}
            isEditable={isOwner}
            onAdd={(entry) => handleAddEntry(ResumeSectionType.Education, entry)}
            onUpdate={(entryId, entry) => handleUpdateEntry(ResumeSectionType.Education, entryId, entry)}
            onDelete={(entryId) => handleDeleteEntry(ResumeSectionType.Education, entryId)}
          />

          {/* Skills Section */}
          <SkillsSection
            skills={userSkills}
            availableSkills={availableSkills}
            isEditable={isOwner}
            onAdd={async (skill) => {
              if (!resume?.userId) return;
              await addUserSkill(resume.userId, {
                skillId: skill.skillId,
                skillName: skill.skillName,
                proficiencyLevel: skill.proficiencyLevel
              });
              // Reload skills
              const updatedSkills = await getUserSkills(resume.userId);
              setUserSkills(updatedSkills);
              // Also refresh available skills in case a new one was created
              const allSkills = await getSkills();
              setAvailableSkills(allSkills);
            }}
            onUpdate={async (personSkillId, level) => {
              if (!resume?.userId) return;
              await updateUserSkill(resume.userId, personSkillId, { proficiencyLevel: level });
              const updatedSkills = await getUserSkills(resume.userId);
              setUserSkills(updatedSkills);
            }}
            onDelete={async (personSkillId) => {
              if (!resume?.userId) return;
              await deleteUserSkill(resume.userId, personSkillId);
              const updatedSkills = await getUserSkills(resume.userId);
              setUserSkills(updatedSkills);
            }}
          />

          {/* Certifications Section */}
          <CertificationsSection
            certifications={userCertifications}
            availableCertifications={availableCertifications}
            isEditable={isOwner}
            onAdd={async (data) => {
              if (!resume?.userId) return;
              await addUserCertification(resume.userId, data);
              // Reload certifications
              const updatedCerts = await getUserCertifications(resume.userId);
              setUserCertifications(updatedCerts);
              // Also refresh available certifications in case a new one was created
              const allCerts = await getCertifications();
              setAvailableCertifications(allCerts);
            }}
            onUpdate={async (personCertificationId, data) => {
              if (!resume?.userId) return;
              await updateUserCertification(resume.userId, personCertificationId, data);
              const updatedCerts = await getUserCertifications(resume.userId);
              setUserCertifications(updatedCerts);
            }}
            onDelete={async (personCertificationId) => {
              if (!resume?.userId) return;
              await deleteUserCertification(resume.userId, personCertificationId);
              const updatedCerts = await getUserCertifications(resume.userId);
              setUserCertifications(updatedCerts);
            }}
          />

          {/* Additional sections can be added here:
              - Projects
              - Awards
              - Publications
          */}
        </div>
      </div>

      {/* Export Modal */}
      {resume && (
        <ExportModal
          resumeId={resume.id}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Share Modal */}
      {resume && (
        <ShareModal
          resumeId={resume.id}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

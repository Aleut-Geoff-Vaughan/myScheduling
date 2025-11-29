import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  Award
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { SkillCategory, ProficiencyLevel, ResumeStatus } from '../types/api';
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsAdminStats,
  getPendingReviewSkills,
  approveSkill,
  rejectSkill,
  bulkApproveSkills,
  type SkillsAdminStats,
  type SkillWithUsers
} from '../services/skillsService';
import {
  getResumeAdminStats,
  getAdminPendingApprovals,
  adminApproveResume,
  adminRejectResume,
  bulkApproveResumes,
  type ResumeAdminStats,
  type ResumeApprovalListItem
} from '../services/resumeService';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getCertificationsAdminStats,
  type Certification,
  type CertificationsAdminStats
} from '../services/certificationsService';
import type { Skill } from '../types/api';
import toast from 'react-hot-toast';

type TabType = 'dashboard' | 'skills-catalog' | 'certifications-catalog' | 'skills-review' | 'approvals';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  // Programming & Development
  [SkillCategory.ProgrammingLanguage]: 'Programming Languages',
  [SkillCategory.WebDevelopment]: 'Web Development',
  [SkillCategory.MobileDevelopment]: 'Mobile Development',
  [SkillCategory.DatabaseTechnology]: 'Database Technology',

  // Cloud & Infrastructure
  [SkillCategory.CloudPlatform]: 'Cloud Platforms',
  [SkillCategory.DevOpsTools]: 'DevOps Tools',
  [SkillCategory.Infrastructure]: 'Infrastructure',

  // Security & Compliance
  [SkillCategory.CyberSecurity]: 'Cybersecurity',
  [SkillCategory.SecurityClearance]: 'Security Clearances',
  [SkillCategory.Compliance]: 'Compliance',

  // Data & Analytics
  [SkillCategory.DataAnalytics]: 'Data Analytics',
  [SkillCategory.MachineLearning]: 'Machine Learning / AI',
  [SkillCategory.BusinessIntelligence]: 'Business Intelligence',

  // Design & User Experience
  [SkillCategory.UXDesign]: 'UX Design',
  [SkillCategory.UIDesign]: 'UI Design',
  [SkillCategory.DesignTools]: 'Design Tools',

  // Management & Methodology
  [SkillCategory.ProjectManagement]: 'Project Management',
  [SkillCategory.AgileMethodology]: 'Agile Methodology',
  [SkillCategory.Leadership]: 'Leadership',

  // Domain Expertise
  [SkillCategory.DefenseDoD]: 'Defense / DoD',
  [SkillCategory.StrategyConsulting]: 'Strategy Consulting',
  [SkillCategory.ITOperations]: 'IT Operations',
  [SkillCategory.Logistics]: 'Logistics',
  [SkillCategory.FinanceAccounting]: 'Finance & Accounting',

  // Business Tools & Software
  [SkillCategory.BusinessSoftware]: 'Business Software',
  [SkillCategory.CollaborationTools]: 'Collaboration Tools',

  // Professional Skills
  [SkillCategory.Communication]: 'Communication',
  [SkillCategory.Language]: 'Languages',
  [SkillCategory.Certification]: 'Certifications',

  // Other
  [SkillCategory.Other]: 'Other',
};

const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  [ProficiencyLevel.Beginner]: 'Beginner',
  [ProficiencyLevel.Intermediate]: 'Intermediate',
  [ProficiencyLevel.Advanced]: 'Advanced',
  [ProficiencyLevel.Expert]: 'Expert',
};

const STATUS_LABELS: Record<ResumeStatus, string> = {
  [ResumeStatus.Draft]: 'Draft',
  [ResumeStatus.PendingReview]: 'Pending Review',
  [ResumeStatus.ChangesRequested]: 'Changes Requested',
  [ResumeStatus.Approved]: 'Approved',
  [ResumeStatus.Active]: 'Active',
  [ResumeStatus.Archived]: 'Archived',
};

export function AdminResumesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  // Dashboard state
  const [resumeStats, setResumeStats] = useState<ResumeAdminStats | null>(null);
  const [skillsStats, setSkillsStats] = useState<SkillsAdminStats | null>(null);

  // Skills catalog state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | ''>('');
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  // Certifications catalog state
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [certificationSearch, setCertificationSearch] = useState('');
  const [issuerFilter, setIssuerFilter] = useState('');
  const [showAddCertificationModal, setShowAddCertificationModal] = useState(false);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
  const [_certificationsStats, setCertificationsStats] = useState<CertificationsAdminStats | null>(null);

  // Skills review state
  const [pendingSkills, setPendingSkills] = useState<SkillWithUsers[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());

  // Approvals state
  const [pendingApprovals, setPendingApprovals] = useState<ResumeApprovalListItem[]>([]);
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const [resumeData, skillsData, certsData] = await Promise.all([
          getResumeAdminStats(),
          getSkillsAdminStats(),
          getCertificationsAdminStats()
        ]);
        setResumeStats(resumeData);
        setSkillsStats(skillsData);
        setCertificationsStats(certsData);
      } else if (activeTab === 'skills-catalog') {
        const data = await getSkills(categoryFilter || undefined, skillSearch || undefined);
        setSkills(data);
      } else if (activeTab === 'certifications-catalog') {
        const data = await getCertifications(issuerFilter || undefined, certificationSearch || undefined);
        setCertifications(data);
      } else if (activeTab === 'skills-review') {
        const data = await getPendingReviewSkills();
        setPendingSkills(data);
      } else if (activeTab === 'approvals') {
        const data = await getAdminPendingApprovals();
        setPendingApprovals(data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Skills catalog handlers
  const handleCreateSkill = async (name: string, category: SkillCategory) => {
    try {
      await createSkill({ name, category });
      toast.success('Skill created successfully');
      setShowAddSkillModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create skill:', err);
      toast.error('Failed to create skill');
    }
  };

  const handleUpdateSkill = async (id: string, name: string, category: SkillCategory) => {
    try {
      await updateSkill(id, { name, category });
      toast.success('Skill updated successfully');
      setEditingSkill(null);
      loadData();
    } catch (err) {
      console.error('Failed to update skill:', err);
      toast.error('Failed to update skill');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await deleteSkill(id);
      toast.success('Skill deleted successfully');
      loadData();
    } catch (err: any) {
      console.error('Failed to delete skill:', err);
      toast.error(err.message || 'Failed to delete skill');
    }
  };

  // Certifications catalog handlers
  const handleCreateCertification = async (name: string, issuer?: string) => {
    try {
      await createCertification({ name, issuer });
      toast.success('Certification created successfully');
      setShowAddCertificationModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create certification:', err);
      toast.error('Failed to create certification');
    }
  };

  const handleUpdateCertification = async (id: string, name: string, issuer?: string) => {
    try {
      await updateCertification(id, { name, issuer });
      toast.success('Certification updated successfully');
      setEditingCertification(null);
      loadData();
    } catch (err) {
      console.error('Failed to update certification:', err);
      toast.error('Failed to update certification');
    }
  };

  const handleDeleteCertification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    try {
      await deleteCertification(id);
      toast.success('Certification deleted successfully');
      loadData();
    } catch (err: any) {
      console.error('Failed to delete certification:', err);
      toast.error(err.message || 'Failed to delete certification');
    }
  };

  // Skills review handlers
  const handleApproveSkill = async (id: string, name?: string, category?: SkillCategory) => {
    try {
      await approveSkill(id, { name, category });
      toast.success('Skill approved');
      loadData();
    } catch (err) {
      console.error('Failed to approve skill:', err);
      toast.error('Failed to approve skill');
    }
  };

  const handleRejectSkill = async (id: string, replacementId?: string) => {
    try {
      await rejectSkill(id, replacementId);
      toast.success('Skill rejected');
      loadData();
    } catch (err) {
      console.error('Failed to reject skill:', err);
      toast.error('Failed to reject skill');
    }
  };

  const handleBulkApproveSkills = async () => {
    if (selectedSkillIds.size === 0) return;
    try {
      const result = await bulkApproveSkills(Array.from(selectedSkillIds));
      toast.success(`Approved ${result.processed} skills`);
      setSelectedSkillIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to bulk approve skills:', err);
      toast.error('Failed to bulk approve skills');
    }
  };

  // Resume approval handlers
  const handleApproveResume = async (approvalId: string) => {
    if (!user?.id) return;
    try {
      await adminApproveResume(approvalId, user.id);
      toast.success('Resume approved');
      loadData();
    } catch (err) {
      console.error('Failed to approve resume:', err);
      toast.error('Failed to approve resume');
    }
  };

  const handleRejectResume = async (approvalId: string) => {
    if (!user?.id) return;
    const notes = prompt('Enter rejection reason (optional):');
    try {
      await adminRejectResume(approvalId, user.id, notes || undefined);
      toast.success('Resume rejected');
      loadData();
    } catch (err) {
      console.error('Failed to reject resume:', err);
      toast.error('Failed to reject resume');
    }
  };

  const handleBulkApproveResumes = async () => {
    if (selectedApprovalIds.size === 0 || !user?.id) return;
    try {
      const result = await bulkApproveResumes(Array.from(selectedApprovalIds), user.id);
      toast.success(`Approved ${result.processed} resumes`);
      setSelectedApprovalIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to bulk approve resumes:', err);
      toast.error('Failed to bulk approve resumes');
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FileText className="w-4 h-4" /> },
    { id: 'skills-catalog', label: 'Skills Catalog', icon: <Users className="w-4 h-4" /> },
    { id: 'certifications-catalog', label: 'Certifications', icon: <Award className="w-4 h-4" /> },
    { id: 'skills-review', label: 'Skills Review', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'approvals', label: 'Resume Approvals', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Administration</h1>
          <p className="text-gray-600 mt-1">Manage skills catalog, review user submissions, and approve resumes</p>
        </div>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'skills-review' && skillsStats?.userDefinedSkills ? (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
                  {skillsStats.userDefinedSkills}
                </span>
              ) : null}
              {tab.id === 'approvals' && resumeStats?.pendingApprovals ? (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {resumeStats.pendingApprovals}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTab
              resumeStats={resumeStats}
              skillsStats={skillsStats}
              onNavigate={navigate}
            />
          )}
          {activeTab === 'skills-catalog' && (
            <SkillsCatalogTab
              skills={skills}
              search={skillSearch}
              onSearchChange={setSkillSearch}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              onSearch={loadData}
              onAdd={() => setShowAddSkillModal(true)}
              onEdit={setEditingSkill}
              onDelete={handleDeleteSkill}
            />
          )}
          {activeTab === 'certifications-catalog' && (
            <CertificationsCatalogTab
              certifications={certifications}
              search={certificationSearch}
              onSearchChange={setCertificationSearch}
              issuerFilter={issuerFilter}
              onIssuerFilterChange={setIssuerFilter}
              onSearch={loadData}
              onAdd={() => setShowAddCertificationModal(true)}
              onEdit={setEditingCertification}
              onDelete={handleDeleteCertification}
            />
          )}
          {activeTab === 'skills-review' && (
            <SkillsReviewTab
              pendingSkills={pendingSkills}
              selectedIds={selectedSkillIds}
              onToggleSelect={(id) => {
                const newSet = new Set(selectedSkillIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedSkillIds(newSet);
              }}
              onSelectAll={() => {
                if (selectedSkillIds.size === pendingSkills.length) {
                  setSelectedSkillIds(new Set());
                } else {
                  setSelectedSkillIds(new Set(pendingSkills.map((s) => s.id)));
                }
              }}
              onApprove={handleApproveSkill}
              onReject={handleRejectSkill}
              onBulkApprove={handleBulkApproveSkills}
              approvedSkills={skills}
            />
          )}
          {activeTab === 'approvals' && (
            <ApprovalsTab
              pendingApprovals={pendingApprovals}
              selectedIds={selectedApprovalIds}
              onToggleSelect={(id) => {
                const newSet = new Set(selectedApprovalIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedApprovalIds(newSet);
              }}
              onSelectAll={() => {
                if (selectedApprovalIds.size === pendingApprovals.length) {
                  setSelectedApprovalIds(new Set());
                } else {
                  setSelectedApprovalIds(new Set(pendingApprovals.map((a) => a.id)));
                }
              }}
              onApprove={handleApproveResume}
              onReject={handleRejectResume}
              onBulkApprove={handleBulkApproveResumes}
              onViewResume={(id) => navigate(`/resumes/${id}`)}
            />
          )}
        </>
      )}

      {/* Add/Edit Skill Modal */}
      {(showAddSkillModal || editingSkill) && (
        <SkillModal
          skill={editingSkill}
          onSave={(name, category) => {
            if (editingSkill) {
              handleUpdateSkill(editingSkill.id, name, category);
            } else {
              handleCreateSkill(name, category);
            }
          }}
          onClose={() => {
            setShowAddSkillModal(false);
            setEditingSkill(null);
          }}
        />
      )}

      {/* Add/Edit Certification Modal */}
      {(showAddCertificationModal || editingCertification) && (
        <CertificationModal
          certification={editingCertification}
          onSave={(name, issuer) => {
            if (editingCertification) {
              handleUpdateCertification(editingCertification.id, name, issuer);
            } else {
              handleCreateCertification(name, issuer);
            }
          }}
          onClose={() => {
            setShowAddCertificationModal(false);
            setEditingCertification(null);
          }}
        />
      )}
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({
  resumeStats,
  skillsStats,
  onNavigate
}: {
  resumeStats: ResumeAdminStats | null;
  skillsStats: SkillsAdminStats | null;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Resumes"
          value={resumeStats?.totalResumes || 0}
          icon={<FileText className="w-6 h-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={resumeStats?.pendingApprovals || 0}
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          color="amber"
        />
        <StatCard
          title="Skills in Catalog"
          value={skillsStats?.totalSkills || 0}
          icon={<Users className="w-6 h-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title="Skills to Review"
          value={skillsStats?.userDefinedSkills || 0}
          icon={<AlertCircle className="w-6 h-6 text-red-600" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumes by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumes by Status</h3>
          <div className="space-y-3">
            {resumeStats?.resumesByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-gray-600">{STATUS_LABELS[item.status]}</span>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
            {(!resumeStats?.resumesByStatus || resumeStats.resumesByStatus.length === 0) && (
              <p className="text-gray-500 text-sm">No resume data available</p>
            )}
          </div>
        </div>

        {/* Skills by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills by Category</h3>
          <div className="space-y-3">
            {skillsStats?.skillsByCategory.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <span className="text-gray-600">{CATEGORY_LABELS[item.category]}</span>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
            {(!skillsStats?.skillsByCategory || skillsStats.skillsByCategory.length === 0) && (
              <p className="text-gray-500 text-sm">No skills data available</p>
            )}
          </div>
        </div>

        {/* Top Skills */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Skills</h3>
          <div className="space-y-3">
            {skillsStats?.topSkills.slice(0, 5).map((item, index) => (
              <div key={item.skillId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-600">{item.skillName}</span>
                </div>
                <span className="font-medium text-gray-900">{item.userCount} users</span>
              </div>
            ))}
            {(!skillsStats?.topSkills || skillsStats.topSkills.length === 0) && (
              <p className="text-gray-500 text-sm">No skills usage data available</p>
            )}
          </div>
        </div>

        {/* Recent Resumes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Resumes</h3>
          <div className="space-y-3">
            {resumeStats?.recentResumes.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => onNavigate(`/resumes/${item.id}`)}
              >
                <div>
                  <span className="text-gray-900 font-medium">{item.userName}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <span className="text-gray-500 text-sm">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!resumeStats?.recentResumes || resumeStats.recentResumes.length === 0) && (
              <p className="text-gray-500 text-sm">No recent resumes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'green' | 'red';
}) {
  const bgColors = {
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    green: 'bg-green-50',
    red: 'bg-red-50'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Skills Catalog Tab Component
function SkillsCatalogTab({
  skills,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete
}: {
  skills: Skill[];
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: SkillCategory | '';
  onCategoryFilterChange: (value: SkillCategory | '') => void;
  onSearch: () => void;
  onAdd: () => void;
  onEdit: (skill: Skill) => void;
  onDelete: (id: string) => void;
}) {
  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category as SkillCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Partial<Record<SkillCategory, Skill[]>>);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as SkillCategory | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={onSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>
      </div>

      {/* Skills List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {Object.entries(groupedSkills).map(([category, categorySkills]) => categorySkills && (
          <div key={category} className="border-b border-gray-200 last:border-b-0">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">
                {CATEGORY_LABELS[category as unknown as SkillCategory]} ({categorySkills.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {categorySkills.map((skill) => (
                <div key={skill.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900">{skill.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(skill)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(skill.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {skills.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No skills found. Click "Add Skill" to create one.
          </div>
        )}
      </div>
    </div>
  );
}

// Skills Review Tab Component
function SkillsReviewTab({
  pendingSkills,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApprove,
  onReject,
  onBulkApprove,
  approvedSkills: _approvedSkills
}: {
  pendingSkills: SkillWithUsers[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onApprove: (id: string, name?: string, category?: SkillCategory) => void;
  onReject: (id: string, replacementId?: string) => void;
  onBulkApprove: () => void;
  approvedSkills: Skill[];
}) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedSkills);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSkills(newSet);
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-800">
            {selectedIds.size} skill{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve Selected
          </button>
        </div>
      )}

      {/* Pending Skills List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {pendingSkills.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedIds.size === pendingSkills.length && pendingSkills.length > 0}
              onChange={onSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {pendingSkills.map((skill) => (
            <div key={skill.id} className="p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(skill.id)}
                  onChange={() => onToggleSelect(skill.id)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {CATEGORY_LABELS[skill.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApprove(skill.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(skill.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>{skill.userCount} user{skill.userCount !== 1 ? 's' : ''}</span>
                    <span>Created {new Date(skill.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => toggleExpand(skill.id)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      {expandedSkills.has(skill.id) ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Hide Users
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          Show Users
                        </>
                      )}
                    </button>
                  </div>
                  {expandedSkills.has(skill.id) && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      {skill.users.map((user) => (
                        <div key={user.userId} className="py-1 text-sm text-gray-600">
                          {user.userName} - {PROFICIENCY_LABELS[user.proficiencyLevel]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {pendingSkills.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p>No skills pending review</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Approvals Tab Component
function ApprovalsTab({
  pendingApprovals,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApprove,
  onReject,
  onBulkApprove,
  onViewResume
}: {
  pendingApprovals: ResumeApprovalListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBulkApprove: () => void;
  onViewResume: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-800">
            {selectedIds.size} resume{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve Selected
          </button>
        </div>
      )}

      {/* Pending Approvals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {pendingApprovals.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedIds.size === pendingApprovals.length && pendingApprovals.length > 0}
              onChange={onSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {pendingApprovals.map((approval) => (
            <div key={approval.id} className="p-4 flex items-start gap-4">
              <input
                type="checkbox"
                checked={selectedIds.has(approval.id)}
                onChange={() => onToggleSelect(approval.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{approval.userName}</span>
                    <span className="ml-2 text-sm text-gray-500">{approval.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewResume(approval.resumeProfileId)}
                      className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    >
                      View Resume
                    </button>
                    <button
                      onClick={() => onApprove(approval.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(approval.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <span>Requested by {approval.requestedByName}</span>
                  <span className="mx-2">|</span>
                  <span>{new Date(approval.requestedAt).toLocaleDateString()}</span>
                  {approval.requestNotes && (
                    <>
                      <span className="mx-2">|</span>
                      <span className="italic">"{approval.requestNotes}"</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {pendingApprovals.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p>No resume approvals pending</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Skill Modal Component
function SkillModal({
  skill,
  onSave,
  onClose
}: {
  skill: Skill | null;
  onSave: (name: string, category: SkillCategory) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(skill?.name || '');
  const [category, setCategory] = useState<SkillCategory>((skill?.category as SkillCategory) || SkillCategory.ProgrammingLanguage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), category);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {skill ? 'Edit Skill' : 'Add Skill'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skill Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Python, Project Management"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value) as SkillCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Skill category"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {skill ? 'Save Changes' : 'Add Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Certifications Catalog Tab Component
function CertificationsCatalogTab({
  certifications,
  search,
  onSearchChange,
  issuerFilter,
  onIssuerFilterChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete
}: {
  certifications: Certification[];
  search: string;
  onSearchChange: (value: string) => void;
  issuerFilter: string;
  onIssuerFilterChange: (value: string) => void;
  onSearch: () => void;
  onAdd: () => void;
  onEdit: (cert: Certification) => void;
  onDelete: (id: string) => void;
}) {
  // Get unique issuers from certifications
  const issuers = Array.from(new Set(certifications.map(c => c.issuer).filter(Boolean))) as string[];

  // Group certifications by issuer
  const groupedCertifications = certifications.reduce((acc, cert) => {
    const issuer = cert.issuer || 'Other';
    if (!acc[issuer]) acc[issuer] = [];
    acc[issuer].push(cert);
    return acc;
  }, {} as Record<string, Certification[]>);

  // Sort issuers alphabetically
  const sortedIssuers = Object.keys(groupedCertifications).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search certifications..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={issuerFilter}
            onChange={(e) => onIssuerFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by issuer"
          >
            <option value="">All Issuers</option>
            {issuers.sort().map((issuer) => (
              <option key={issuer} value={issuer}>{issuer}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Apply filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>
      </div>

      {/* Certifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {sortedIssuers.map((issuer) => (
          <div key={issuer} className="border-b border-gray-200 last:border-b-0">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">
                {issuer} ({groupedCertifications[issuer].length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedCertifications[issuer].map((cert) => (
                <div key={cert.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="text-gray-900">{cert.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(cert)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit certification"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(cert.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete certification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {certifications.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No certifications found. Click "Add Certification" to create one.</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {certifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total: {certifications.length} certification{certifications.length !== 1 ? 's' : ''}</span>
            <span>{sortedIssuers.length} issuer{sortedIssuers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Certification Modal Component
function CertificationModal({
  certification,
  onSave,
  onClose
}: {
  certification: Certification | null;
  onSave: (name: string, issuer?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(certification?.name || '');
  const [issuer, setIssuer] = useState(certification?.issuer || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), issuer.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {certification ? 'Edit Certification' : 'Add Certification'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certification Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., AWS Solutions Architect - Professional"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Organization
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Amazon Web Services (AWS)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {certification ? 'Save Changes' : 'Add Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

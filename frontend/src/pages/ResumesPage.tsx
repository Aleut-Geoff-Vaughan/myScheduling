import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getResumes } from '../services/resumeService';
import type { ResumeProfile, ResumeStatus } from '../types/api';

const statusConfig = {
  0: { label: 'Draft', icon: FileText, color: 'text-gray-500' },
  1: { label: 'Pending Review', icon: Clock, color: 'text-yellow-600' },
  2: { label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
  3: { label: 'Changes Requested', icon: XCircle, color: 'text-orange-600' },
  4: { label: 'Active', icon: FileCheck, color: 'text-blue-600' },
  5: { label: 'Archived', icon: FileText, color: 'text-gray-400' },
};

export function ResumesPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResumeStatus | undefined>();

  useEffect(() => {
    loadResumes();
  }, [statusFilter]);

  const loadResumes = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Get tenantId from auth context
      const tenantId = localStorage.getItem('currentTenantId') || undefined;
      const data = await getResumes(tenantId, statusFilter, searchTerm);
      setResumes(data);
    } catch (err) {
      console.error('Error loading resumes:', err);
      setError('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadResumes();
  };

  const handleCreateResume = () => {
    navigate('/resumes/new');
  };

  const handleViewResume = (resumeId: string) => {
    navigate(`/resumes/${resumeId}`);
  };

  const getStatusBadge = (status: ResumeStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} bg-opacity-10`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading && resumes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Repository</h1>
          <p className="mt-2 text-gray-600">
            Manage employee resumes, versions, and approvals
          </p>
        </div>
        <Button onClick={handleCreateResume}>
          <Plus className="w-4 h-4 mr-2" />
          Create Resume
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, job title, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter ?? ''}
                  onChange={(e) =>
                    setStatusFilter(e.target.value ? parseInt(e.target.value) as ResumeStatus : undefined)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="0">Draft</option>
                  <option value="1">Pending Review</option>
                  <option value="2">Approved</option>
                  <option value="3">Changes Requested</option>
                  <option value="4">Active</option>
                  <option value="5">Archived</option>
                </select>
              </div>
            </div>

            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      )}

      {/* Resumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.map((resume) => (
          <Card
            key={resume.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleViewResume(resume.id)}
          >
            <div className="p-6">
              {/* User Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {resume.user?.displayName || resume.user?.name || resume.user?.email || 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {resume.user?.jobTitle || 'No title'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">{getStatusBadge(resume.status)}</div>

              {/* Stats */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Sections:</span>
                  <span className="font-medium">{resume.sections?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Versions:</span>
                  <span className="font-medium">{resume.versions?.length || 0}</span>
                </div>
                {resume.lastReviewedAt && (
                  <div className="flex justify-between">
                    <span>Last Reviewed:</span>
                    <span className="font-medium">
                      {new Date(resume.lastReviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Updated {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
                  </span>
                  {resume.isPublic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                      Public
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && resumes.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== undefined
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first resume'}
            </p>
            {!searchTerm && statusFilter === undefined && (
              <Button onClick={handleCreateResume}>
                <Plus className="w-4 h-4 mr-2" />
                Create Resume
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Stats Footer */}
      {resumes.length > 0 && (
        <Card>
          <div className="p-4 flex justify-between items-center text-sm text-gray-600">
            <span>Showing {resumes.length} resume{resumes.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-4">
              <span>
                {resumes.filter((r) => r.status === 1).length} Pending Review
              </span>
              <span>
                {resumes.filter((r) => r.status === 2).length} Approved
              </span>
              <span>
                {resumes.filter((r) => r.status === 4).length} Active
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  FileCheck,
  Eye,
  User,
  Filter,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getTeamResumes } from '../services/resumeService';
import type { ResumeProfile, ResumeStatus } from '../types/api';

const statusConfig: Record<number, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  0: { label: 'Draft', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  1: { label: 'Pending Review', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  2: { label: 'Approved', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  3: { label: 'Changes Requested', icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  4: { label: 'Active', icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
  5: { label: 'Archived', icon: FileText, color: 'text-gray-400', bg: 'bg-gray-100' },
};

type TeamFilter = 'direct' | 'team' | 'all';

export function ManagerResumesPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('direct');
  const [statusFilter, setStatusFilter] = useState<ResumeStatus | undefined>(undefined);

  useEffect(() => {
    loadTeamResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter, statusFilter]);

  const loadTeamResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTeamResumes(teamFilter, statusFilter, search || undefined);
      setResumes(data);
    } catch (err) {
      console.error('Error loading team resumes:', err);
      setError('Failed to load team resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTeamResumes();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewResume = (resumeId: string) => {
    navigate(`/resumes/${resumeId}`);
  };

  const getStatusBadge = (status: ResumeStatus) => {
    const config = statusConfig[status];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Filter resumes by search term (client-side for responsiveness)
  const filteredResumes = search.trim()
    ? resumes.filter(r =>
        r.user?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.jobTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : resumes;

  // Group resumes by status for summary
  const statusCounts = resumes.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Resumes</h1>
          <p className="mt-2 text-gray-600">
            View and manage resumes for your team members
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or job title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
              title="Filter by team"
              aria-label="Filter by team"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="direct">Direct Reports</option>
              <option value="team">All Reports (Direct + Indirect)</option>
              <option value="all">All Team Members</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter ?? ''}
              onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) as ResumeStatus : undefined)}
              title="Filter by status"
              aria-label="Filter by status"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{resumes.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </Card>
        <Card className="p-4 text-center bg-gray-50">
          <div className="text-2xl font-bold text-gray-600">{statusCounts[0] || 0}</div>
          <div className="text-sm text-gray-500">Draft</div>
        </Card>
        <Card className="p-4 text-center bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts[1] || 0}</div>
          <div className="text-sm text-yellow-700">Pending</div>
        </Card>
        <Card className="p-4 text-center bg-green-50">
          <div className="text-2xl font-bold text-green-600">{statusCounts[2] || 0}</div>
          <div className="text-sm text-green-700">Approved</div>
        </Card>
        <Card className="p-4 text-center bg-orange-50">
          <div className="text-2xl font-bold text-orange-600">{statusCounts[3] || 0}</div>
          <div className="text-sm text-orange-700">Changes</div>
        </Card>
        <Card className="p-4 text-center bg-blue-50">
          <div className="text-2xl font-bold text-blue-600">{statusCounts[4] || 0}</div>
          <div className="text-sm text-blue-700">Active</div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team resumes...</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && filteredResumes.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resumes Found</h3>
            <p className="text-gray-600">
              {search
                ? 'No resumes match your search criteria.'
                : 'None of your team members have created resumes yet.'}
            </p>
          </div>
        </Card>
      )}

      {/* Resumes List */}
      {!loading && filteredResumes.length > 0 && (
        <Card>
          <div className="divide-y divide-gray-100">
            {filteredResumes.map((resume) => (
              <div
                key={resume.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>

                    {/* User Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {resume.user?.displayName || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {resume.user?.jobTitle || 'No title'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {resume.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Badge */}
                    {getStatusBadge(resume.status)}

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">{resume.sections?.length || 0}</span>
                        <span className="ml-1">sections</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{resume.versions?.length || 0}</span>
                        <span className="ml-1">versions</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewResume(resume.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="mt-2 ml-16 text-xs text-gray-400">
                  Last updated: {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { format } from 'date-fns';
import {
  useDOALetters,
  useDeleteDOALetter,
  useRevokeDOALetter,
} from '../hooks/useDOA';
import type { DelegationOfAuthorityLetter } from '../types/doa';
import { DOAStatus } from '../types/doa';
import { DOAEditor } from '../components/DOAEditor';
import { DOAViewer } from '../components/DOAViewer';
import toast from 'react-hot-toast';

export function AdminDOALettersPage() {
  const { data: letters, isLoading } = useDOALetters('all');
  const deleteMutation = useDeleteDOALetter();
  const revokeMutation = useRevokeDOALetter();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDOAId, setSelectedDOAId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DOAStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: DOAStatus) => {
    switch (status) {
      case DOAStatus.Draft:
        return 'bg-gray-100 text-gray-800';
      case DOAStatus.PendingSignatures:
        return 'bg-yellow-100 text-yellow-800';
      case DOAStatus.Active:
        return 'bg-green-100 text-green-800';
      case DOAStatus.Expired:
        return 'bg-red-100 text-red-800';
      case DOAStatus.Revoked:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: DOAStatus) => {
    switch (status) {
      case DOAStatus.Draft:
        return 'Draft';
      case DOAStatus.PendingSignatures:
        return 'Pending Signatures';
      case DOAStatus.Active:
        return 'Active';
      case DOAStatus.Expired:
        return 'Expired';
      case DOAStatus.Revoked:
        return 'Revoked';
      default:
        return 'Unknown';
    }
  };

  const filteredLetters = letters?.filter((letter) => {
    // Status filter
    if (statusFilter !== 'all' && letter.status !== statusFilter) {
      return false;
    }
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const delegatorName = letter.delegatorUser?.displayName?.toLowerCase() || '';
      const designeeName = letter.designeeUser?.displayName?.toLowerCase() || '';
      const subject = letter.subjectLine?.toLowerCase() || '';
      return (
        delegatorName.includes(search) ||
        designeeName.includes(search) ||
        subject.includes(search)
      );
    }
    return true;
  });

  const handleView = (letter: DelegationOfAuthorityLetter) => {
    setSelectedDOAId(letter.id);
    setIsViewerOpen(true);
  };

  const handleEdit = (letter: DelegationOfAuthorityLetter) => {
    setSelectedDOAId(letter.id);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedDOAId(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (letter: DelegationOfAuthorityLetter) => {
    if (letter.status !== DOAStatus.Draft) {
      toast.error('Only draft letters can be deleted');
      return;
    }
    if (!confirm(`Are you sure you want to delete this DOA letter?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(letter.id);
      toast.success('DOA letter deleted successfully');
    } catch {
      toast.error('Failed to delete DOA letter');
    }
  };

  const handleRevoke = async (letter: DelegationOfAuthorityLetter) => {
    if (letter.status !== DOAStatus.Active) {
      toast.error('Only active letters can be revoked');
      return;
    }
    if (!confirm(`Are you sure you want to revoke this DOA letter?`)) {
      return;
    }
    try {
      await revokeMutation.mutateAsync(letter.id);
      toast.success('DOA letter revoked successfully');
    } catch {
      toast.error('Failed to revoke DOA letter');
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedDOAId(null);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDOAId(null);
  };

  // Count by status for the filter badges
  const statusCounts = {
    all: letters?.length || 0,
    [DOAStatus.Draft]: letters?.filter((l) => l.status === DOAStatus.Draft).length || 0,
    [DOAStatus.PendingSignatures]: letters?.filter((l) => l.status === DOAStatus.PendingSignatures).length || 0,
    [DOAStatus.Active]: letters?.filter((l) => l.status === DOAStatus.Active).length || 0,
    [DOAStatus.Expired]: letters?.filter((l) => l.status === DOAStatus.Expired).length || 0,
    [DOAStatus.Revoked]: letters?.filter((l) => l.status === DOAStatus.Revoked).length || 0,
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DOA Letters Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage all Delegation of Authority letters across the organization
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create DOA Letter
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by delegator, designee, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter(DOAStatus.Draft)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === DOAStatus.Draft
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Draft ({statusCounts[DOAStatus.Draft]})
              </button>
              <button
                onClick={() => setStatusFilter(DOAStatus.PendingSignatures)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === DOAStatus.PendingSignatures
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                Pending ({statusCounts[DOAStatus.PendingSignatures]})
              </button>
              <button
                onClick={() => setStatusFilter(DOAStatus.Active)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === DOAStatus.Active
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Active ({statusCounts[DOAStatus.Active]})
              </button>
              <button
                onClick={() => setStatusFilter(DOAStatus.Expired)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === DOAStatus.Expired
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Expired ({statusCounts[DOAStatus.Expired]})
              </button>
              <button
                onClick={() => setStatusFilter(DOAStatus.Revoked)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === DOAStatus.Revoked
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Revoked ({statusCounts[DOAStatus.Revoked]})
              </button>
            </div>
          </div>
        </div>

        {/* Letters Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-pulse text-gray-500">Loading DOA letters...</div>
          </div>
        ) : filteredLetters && filteredLetters.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delegator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signatures
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLetters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          letter.status
                        )}`}
                      >
                        {getStatusLabel(letter.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {letter.delegatorUser?.displayName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {letter.delegatorUser?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {letter.designeeUser?.displayName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {letter.designeeUser?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {letter.subjectLine || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(letter.effectiveStartDate), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {format(new Date(letter.effectiveEndDate), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {letter.signatures?.some((s) => s.role === 0) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Delegator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Delegator
                          </span>
                        )}
                        {letter.signatures?.some((s) => s.role === 1) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Designee
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Designee
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(letter)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {letter.status === DOAStatus.Draft && (
                          <>
                            <button
                              onClick={() => handleEdit(letter)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(letter)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {letter.status === DOAStatus.Active && (
                          <button
                            onClick={() => handleRevoke(letter)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No DOA letters found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Get started by creating a new DOA letter.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreate}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create DOA Letter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <DOAEditor doaId={selectedDOAId} onClose={handleCloseEditor} />
      )}

      {/* Viewer Modal */}
      {isViewerOpen && selectedDOAId && (
        <DOAViewer doaId={selectedDOAId} onClose={handleCloseViewer} />
      )}
    </>
  );
}

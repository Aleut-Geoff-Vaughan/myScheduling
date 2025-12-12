import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeople } from '../hooks/usePeople';
import { useAuthStore, AppRole } from '../stores/authStore';
import type { Person } from '../types/api';
import { peopleService } from '../services/peopleService';
import { useQueryClient } from '@tanstack/react-query';
import type { UpdateUserProfileRequest } from '../types/user';
import toast from 'react-hot-toast';
import { PersonEditorModal } from '../components/PersonEditorModal';
import { Button } from '../components/ui';

interface PeopleTreeNode extends Person {
  reports: PeopleTreeNode[];
}

function findSubtree(rootId: string | undefined, people: Person[]): PeopleTreeNode | null {
  if (!rootId) return null;
  const map = new Map<string, PeopleTreeNode>();
  people.forEach((p) => map.set(p.id, { ...p, reports: [] }));

  let root: PeopleTreeNode | null = null;
  map.forEach((node) => {
    if (node.managerId && map.has(node.managerId)) {
      map.get(node.managerId)!.reports.push(node);
    }
    if (node.id === rootId) {
      root = node;
    }
  });

  return root;
}

const PersonCard = ({
  person,
  managerName,
  onOpenDashboard,
  onEditFull,
}: {
  person: Person;
  managerName: (id?: string) => string;
  onOpenDashboard: (id: string) => void;
  onEditFull: (person: Person) => void;
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-start gap-3">
    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
      {person.displayName.charAt(0).toUpperCase()}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-gray-900">{person.displayName}</p>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
          {person.type === 0 ? 'Employee' : 'Contractor'}
        </span>
      </div>
      <p className="text-sm text-gray-600">{person.jobTitle || '—'}</p>
      <p className="text-sm text-gray-500">{person.department || person.orgUnit || '—'}</p>
      <p className="text-sm text-gray-500">{person.email}</p>
      <p className="text-sm text-gray-500">
        Supervisor: <span className="font-medium">{managerName(person.managerId)}</span>
      </p>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => onOpenDashboard(person.id)}
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
        >
          Dashboard
        </button>
        <button
          onClick={() => onEditFull(person)}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          Edit Full
        </button>
      </div>
    </div>
  </div>
);

// Unused component - kept for future org chart feature
// const PeopleTree = ({ nodes, depth = 0, onOpenDashboard }: { nodes: PeopleTreeNode[]; depth?: number; onOpenDashboard: (id: string) => void }) => (
//   <div className={depth === 0 ? 'space-y-4' : 'space-y-3'}>
//     {nodes.map((node) => (
//       <div key={node.id} className="border-l-2 border-gray-200 pl-4">
//         <div className="flex items-center gap-2">
//           <span className="text-sm font-semibold text-gray-800">{node.displayName}</span>
//           <span className="text-xs text-gray-500">{node.jobTitle || '—'}</span>
//           <button
//             onClick={() => onOpenDashboard(node.id)}
//             className="text-xs text-indigo-600 hover:text-indigo-800"
//           >
//             View
//           </button>
//         </div>
//         {node.reports.length > 0 && (
//           <div className="mt-2">
//             <PeopleTree nodes={node.reports} depth={depth + 1} onOpenDashboard={onOpenDashboard} />
//           </div>
//         )}
//       </div>
//     ))}
//   </div>
// );

export default function PeoplePage() {
  const { currentWorkspace, user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'direct' | 'team'>('direct');
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['displayName', 'jobTitle', 'department', 'email', 'manager']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UpdateUserProfileRequest>>({});
  const [modalTarget, setModalTarget] = useState<Person | null>(null);
  const [pageSize, setPageSize] = useState<25 | 50 | 100 | 'all'>(25);
  const { data: people = [], isLoading } = usePeople({
    tenantId: currentWorkspace?.tenantId,
    search: search.trim() || undefined,
  });

  const canInlineEdit = useMemo(
    () =>
      currentWorkspace?.roles?.some((r) =>
        [AppRole.SysAdmin, AppRole.TenantAdmin, AppRole.ResourceManager, AppRole.TeamLead].includes(r)
      ) ?? false,
    [currentWorkspace?.roles]
  );

  const myTeam = useMemo(() => findSubtree(user?.id, people), [user?.id, people]);

  const visibleIds = useMemo(() => {
    if (filterMode === 'all') return new Set(people.map((p) => p.id));
    if (filterMode === 'direct') return new Set(people.filter((p) => p.managerId === user?.id).map((p) => p.id));
    if (filterMode === 'team') {
      const subtree = myTeam;
      const ids = new Set<string>();
      const visited = new Set<string>();
      const walk = (node?: PeopleTreeNode | null) => {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);
        node.reports.forEach((r) => {
          ids.add(r.id);
          walk(r);
        });
      };
      walk(subtree);
      return ids;
    }
    return new Set<string>();
  }, [filterMode, people, myTeam, user?.id]);

  const filteredPeople = useMemo(() => {
    const base = people.filter((p) => visibleIds.has(p.id));
    if (!search.trim()) return base;
    const term = search.trim().toLowerCase();
    return base.filter(
      (p) =>
        p.displayName.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        (p.jobTitle && p.jobTitle.toLowerCase().includes(term)) ||
        (p.department && p.department.toLowerCase().includes(term))
    );
  }, [people, search, visibleIds]);

  const limitedPeople = useMemo(() => {
    if (pageSize === 'all') return filteredPeople;
    return filteredPeople.slice(0, pageSize);
  }, [filteredPeople, pageSize]);

  const handleOpenDashboard = (personId: string) => {
    navigate(`/people/${personId}/dashboard`);
  };

  const managerName = (managerId?: string) => {
    if (!managerId) return '—';
    const mgr = people.find((p) => p.id === managerId);
    return mgr ? mgr.displayName : '—';
  };

  const exportCsv = () => {
    const headers = ['Id', 'Name', 'Email', 'JobTitle', 'Department', 'Manager'];
    const rows = limitedPeople.map((p) => [
      p.id,
      p.displayName,
      p.email,
      p.jobTitle ?? '',
      p.department ?? '',
      managerName(p.managerId),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'people.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setEditForm({
      displayName: person.displayName,
      jobTitle: person.jobTitle,
      department: person.department,
    });
  };

  const saveEdit = async (person: Person) => {
    if (!editForm.displayName) {
      return;
    }
    try {
      await peopleService.updateUserProfile(person.id, {
        displayName: editForm.displayName,
        jobTitle: editForm.jobTitle,
        department: editForm.department,
        // Required by API
        email: person.email,
      });
      toast.success('Updated');
      setEditingId(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ['people'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast.error(message);
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((cols) =>
      cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key]
    );
  };

  if (!currentWorkspace?.tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          Select a tenant workspace to view people.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="text-gray-600">Browse your organization, teams, and direct reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-72">
            <input
              type="search"
              placeholder="Search people by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg overflow-hidden text-sm">
            {(['tiles', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 ${viewMode === mode ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}
              >
                {mode === 'tiles' ? 'Tiles' : 'List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">People</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="text-sm border border-gray-300 rounded px-2 py-1"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              {canInlineEdit && <option value="all">All</option>}
            </select>
            <Button variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
            <span className="text-xs text-gray-500">{filteredPeople.length} people</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-sm rounded ${filterMode === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('direct')}
              className={`px-3 py-1 text-sm rounded ${filterMode === 'direct' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Direct
            </button>
            <button
              onClick={() => setFilterMode('team')}
              className={`px-3 py-1 text-sm rounded ${filterMode === 'team' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Direct+Indirect
            </button>
          </div>
          {viewMode === 'list' && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-600">Columns:</span>
              {[
                { key: 'displayName', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'jobTitle', label: 'Job Title' },
                { key: 'department', label: 'Department' },
                { key: 'manager', label: 'Manager' },
              ].map((col) => (
                <label key={col.key} className="flex items-center gap-1 text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading people...</p>
        ) : filteredPeople.length === 0 ? (
          <p className="text-sm text-gray-500">No people found for this tenant.</p>
        ) : viewMode === 'tiles' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                managerName={managerName}
                onOpenDashboard={handleOpenDashboard}
                onEditFull={(p) => canInlineEdit && setModalTarget(p)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedColumns.includes('displayName') && <th className="px-3 py-2 border-b">Name</th>}
                  {selectedColumns.includes('email') && <th className="px-3 py-2 border-b">Email</th>}
                  {selectedColumns.includes('jobTitle') && <th className="px-3 py-2 border-b">Job Title</th>}
                  {selectedColumns.includes('department') && <th className="px-3 py-2 border-b">Department</th>}
                  {selectedColumns.includes('manager') && <th className="px-3 py-2 border-b">Manager</th>}
                  <th className="px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => {
                  const isEditing = editingId === person.id;
                  return (
                    <tr key={person.id} className="border-b last:border-0">
                      {selectedColumns.includes('displayName') && (
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              className="w-full border border-gray-300 rounded px-2 py-1"
                              value={editForm.displayName ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                            />
                          ) : (
                            <div className="font-medium text-gray-900">{person.displayName}</div>
                          )}
                        </td>
                      )}
                      {selectedColumns.includes('email') && (
                        <td className="px-3 py-2 text-gray-700">{person.email}</td>
                      )}
                      {selectedColumns.includes('jobTitle') && (
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              className="w-full border border-gray-300 rounded px-2 py-1"
                              value={editForm.jobTitle ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                            />
                          ) : (
                            <span>{person.jobTitle || '—'}</span>
                          )}
                        </td>
                      )}
                      {selectedColumns.includes('department') && (
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              className="w-full border border-gray-300 rounded px-2 py-1"
                              value={editForm.department ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                            />
                          ) : (
                            <span>{person.department || '—'}</span>
                          )}
                        </td>
                      )}
                      {selectedColumns.includes('manager') && (
                        <td className="px-3 py-2 text-gray-700">{managerName(person.managerId)}</td>
                      )}
                      <td className="px-3 py-2 text-sm text-indigo-700">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(person)}
                              className="px-2 py-1 bg-indigo-600 text-white rounded"
                              disabled={!canInlineEdit}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({});
                              }}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenDashboard(person.id)}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              Dashboard
                            </button>
                            {canInlineEdit && (
                              <>
                                <button
                                  onClick={() => startEdit(person)}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  Edit Inline
                                </button>
                                <button
                                  onClick={() => setModalTarget(person)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Edit Full
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PersonEditorModal
        isOpen={!!modalTarget}
        person={modalTarget ?? undefined}
        onClose={() => setModalTarget(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['people'] });
          setModalTarget(null);
        }}
      />
    </div>
  );
}

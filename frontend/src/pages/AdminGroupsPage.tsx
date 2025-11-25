import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { groupService } from '../services/groupService';
import { peopleService } from '../services/peopleService';
import type { Group, GroupMember } from '../types/api';
import { GroupMemberRole } from '../types/api';
import { Card, CardHeader, CardBody, Button, Input, FormGroup, Modal } from '../components/ui';
import toast from 'react-hot-toast';

export default function AdminGroupsPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups', tenantId],
    queryFn: () => groupService.list({ tenantId, includeMembers: true }),
    enabled: !!tenantId,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people', tenantId, memberSearch],
    queryFn: () => peopleService.getPeople({ tenantId: tenantId!, search: memberSearch }),
    enabled: !!tenantId && memberSearch.length > 1,
  });

  const createGroup = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error('Tenant required');
      return groupService.create({ tenantId, name: newGroup.name.trim(), description: newGroup.description.trim() });
    },
    onSuccess: () => {
      toast.success('Group created');
      setNewGroup({ name: '', description: '' });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: any) => toast.error(err?.message ?? 'Failed to create group'),
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Group> }) => groupService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    onError: () => toast.error('Failed to update group'),
  });

  const addMember = useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role?: GroupMemberRole }) =>
      groupService.addMember(groupId, { userId, role }),
    onSuccess: () => {
      toast.success('Member added');
      setSelectedUserId(undefined);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMember = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => groupService.removeMember(groupId, userId),
    onSuccess: () => {
      toast.success('Member removed');
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          (g.description ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [groups, search]
  );

  if (!tenantId) {
    return <div className="p-6 text-sm text-gray-600">Select a tenant workspace to manage groups.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="text-gray-600">Use groups for approvals (projects/WBS) and staffing requests.</p>
      </div>

      <Card>
        <CardHeader title="Create Group" />
        <CardBody>
          <FormGroup columns={3}>
            <Input
              label="Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g., Staffing Approvers"
            />
            <Input
              label="Description"
              value={newGroup.description}
              onChange={(e) => setNewGroup((s) => ({ ...s, description: e.target.value }))}
              placeholder="Optional description"
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                disabled={!newGroup.name.trim() || createGroup.isPending}
                onClick={() => createGroup.mutate()}
              >
                {createGroup.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </FormGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All Groups"
          subtitle={`${filteredGroups.length} group${filteredGroups.length === 1 ? '' : 's'}`}
          action={
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          }
        />
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900">{group.name}</div>
                      {!group.isActive && <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">Inactive</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {group.description || 'No description'} • {group.members?.length ?? 0} members
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={group.isActive ? 'secondary' : 'primary'}
                      onClick={() =>
                        updateGroup.mutate({
                          id: group.id,
                          payload: { isActive: !group.isActive },
                        })
                      }
                    >
                      {group.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedGroup(group)}>
                      Manage Members
                    </Button>
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <p className="text-sm text-gray-500">No groups found for this tenant.</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={!!selectedGroup} onClose={() => setSelectedGroup(null)} title="Manage Members" size="lg">
        {selectedGroup && (
          <div className="space-y-4">
            <div>
              <div className="font-semibold text-gray-900">{selectedGroup.name}</div>
              <div className="text-xs text-gray-500">{selectedGroup.description || 'No description'}</div>
            </div>

            <FormGroup columns={3} className="items-end">
              <Input
                label="Search people"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Type a name or email"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select person</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(e.target.value || undefined)}
                >
                  <option value="">Select</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  disabled={!selectedUserId}
                  onClick={() =>
                    selectedUserId &&
                    addMember.mutate({
                      groupId: selectedGroup.id,
                      userId: selectedUserId,
                      role: GroupMemberRole.Approver,
                    })
                  }
                >
                  Add as Approver
                </Button>
              </div>
            </FormGroup>

            <div className="border rounded-lg divide-y">
              {(selectedGroup.members ?? []).map((m: GroupMember) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2">
                  <div className="text-sm text-gray-800">
                    {m.user?.displayName || m.userId.substring(0, 8)} • {m.role}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMember.mutate({ groupId: selectedGroup.id, userId: m.userId })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {(selectedGroup.members ?? []).length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500">No members yet.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

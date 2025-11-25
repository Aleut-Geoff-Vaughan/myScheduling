import { useMemo } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { usePeople } from '../hooks/usePeople';
import { useAuthStore, AppRole } from '../stores/authStore';
import { Card, CardHeader, CardBody, Button } from '../components/ui';
import { AssignmentStatus } from '../types/api';
import type { Assignment } from '../types/api';

export default function ManagementStaffingPage() {
  const { user, currentWorkspace, hasRole } = useAuthStore();
  const { data: people = [] } = usePeople({ tenantId: currentWorkspace?.tenantId });
  const { data: assignments = [], error } = useAssignments(
    currentWorkspace?.tenantId ? { tenantId: currentWorkspace.tenantId } : undefined
  );

  // Build set of team member IDs (direct + indirect) under current user
  const teamIds = useMemo(() => {
    if (!user) return new Set<string>();
    const map = new Map<string, string | undefined>();
    people.forEach((p) => map.set(p.id, p.managerId));
    const result = new Set<string>();
    const stack = [user.id];
    const visited = new Set<string>();
    while (stack.length) {
      const mgr = stack.pop()!;
      if (visited.has(mgr)) continue;
      visited.add(mgr);
      people
        .filter((p) => p.managerId === mgr)
        .forEach((p) => {
          if (!result.has(p.id)) {
            result.add(p.id);
            stack.push(p.id);
          }
        });
    }
    return result;
  }, [people, user]);

  const teamAssignments = assignments.filter((a) => teamIds.has(a.userId));

  const timeline = useMemo(() => {
    const now = new Date();
    const sixMonthsOut = new Date();
    sixMonthsOut.setMonth(now.getMonth() + 6);
    const totalMs = sixMonthsOut.getTime() - now.getTime();
    return teamAssignments.map((a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const clampedStart = start < now ? now : start;
      const clampedEnd = end > sixMonthsOut ? sixMonthsOut : end;
      const leftPct = ((clampedStart.getTime() - now.getTime()) / totalMs) * 100;
      const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;
      return { ...a, leftPct: Math.max(0, leftPct), widthPct: Math.max(2, widthPct) };
    });
  }, [teamAssignments]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        projectRoleId: string;
        wbsMap: Map<string | undefined, Assignment[]>;
      }
    >();
    teamAssignments.forEach((a) => {
      const roleKey = a.projectRoleId ?? 'unknown';
      if (!map.has(roleKey)) {
        map.set(roleKey, { projectRoleId: roleKey, wbsMap: new Map() });
      }
      const roleEntry = map.get(roleKey)!;
      const wbsKey = a.wbsElementId ?? 'none';
      if (!roleEntry.wbsMap.has(wbsKey)) {
        roleEntry.wbsMap.set(wbsKey, []);
      }
      roleEntry.wbsMap.get(wbsKey)!.push(a);
    });
    return Array.from(map.values());
  }, [teamAssignments]);

  const exportCsv = () => {
    const headers = ['Id', 'UserId', 'ProjectRoleId', 'Allocation', 'StartDate', 'EndDate', 'Status'];
    const rows = teamAssignments.map((a) => [
      a.id,
      a.userId,
      a.projectRoleId ?? '',
      a.allocation,
      a.startDate,
      a.endDate,
      AssignmentStatus[a.status],
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-assignments.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasRole(AppRole.TeamLead) && !hasRole(AppRole.ResourceManager) && !hasRole(AppRole.ProjectManager) && !hasRole(AppRole.TenantAdmin) && !hasRole(AppRole.SysAdmin)) {
    return <div className="p-6 text-red-600">Not authorized for team staffing view.</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Failed to load assignments</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Staffing</h1>
          <p className="text-gray-600">Assignments for your direct and indirect reports (6-month view).</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader title="Team Timeline (6 months)" subtitle={`${teamAssignments.length} assignments`} />
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-3">
            {timeline.slice(0, 50).map((item) => (
              <div key={item.id}>
                <div className="text-sm text-gray-700 mb-1">
                  User {item.userId.substring(0, 8)} • Role {item.projectRoleId ? item.projectRoleId.substring(0, 8) : '—'}
                </div>
                <div className="h-4 bg-gray-100 rounded relative overflow-hidden">
                  <div
                    className="h-4 bg-green-500 rounded absolute"
                    style={{ left: `${item.leftPct}%`, width: `${item.widthPct}%` }}
                  />
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-sm text-gray-500">No team assignments found.</p>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Assignments (table)" subtitle="For your team" />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border-b">User</th>
                  <th className="px-3 py-2 border-b">Role</th>
                  <th className="px-3 py-2 border-b">Allocation</th>
                  <th className="px-3 py-2 border-b">Dates</th>
                  <th className="px-3 py-2 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamAssignments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{a.userId.substring(0, 8)}...</td>
                    <td className="px-3 py-2">{a.projectRoleId ? `${a.projectRoleId.substring(0, 8)}...` : '—'}</td>
                    <td className="px-3 py-2">{a.allocation}%</td>
                    <td className="px-3 py-2">
                      {a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'} -{' '}
                      {a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">{AssignmentStatus[a.status]}</td>
                  </tr>
                ))}
                {teamAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-500">No assignments</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Projects / WBS" subtitle="Grouped view of assignments" />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border-b">Project Role</th>
                  <th className="px-3 py-2 border-b">WBS</th>
                  <th className="px-3 py-2 border-b">Assignments</th>
                  <th className="px-3 py-2 border-b">People</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) =>
                  Array.from(g.wbsMap.entries()).map(([wbsId, assigns]) => (
                    <tr key={`${g.projectRoleId}-${wbsId}`} className="border-b last:border-0">
                      <td className="px-3 py-2">{g.projectRoleId.substring(0, 8)}...</td>
                      <td className="px-3 py-2">{wbsId && wbsId !== 'none' ? `${wbsId.substring(0, 8)}...` : '—'}</td>
                      <td className="px-3 py-2">{assigns.length}</td>
                      <td className="px-3 py-2">
                        {assigns
                          .slice(0, 3)
                          .map((a) => a.userId.substring(0, 8))
                          .join(', ')}
                        {assigns.length > 3 && ` (+${assigns.length - 3})`}
                      </td>
                    </tr>
                  ))
                )}
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      No grouped assignments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

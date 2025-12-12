import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardBody, Button, Input } from '../components/ui';
import { useAssignments } from '../hooks/useAssignments';
import { useProjectAssignments } from '../hooks/useProjectAssignments';
import type { Assignment, ProjectAssignment } from '../types/api';
import { AssignmentStatus, ProjectAssignmentStatus } from '../types/api';
import { assignmentRequestService, type CreateAssignmentRequest } from '../services/assignmentRequestService';
import { assignmentsService } from '../services/assignmentsService';
import { projectAssignmentsService } from '../services/projectAssignmentsService';
import { projectsService } from '../services/projectsService';
import wbsService from '../services/wbsService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { AssignmentRequestModal } from '../components/AssignmentRequestModal';
import { ProjectAssignmentModal } from '../components/ProjectAssignmentModal';

type TimelineRange = '2months' | '6months' | '1year' | '3years';

export function StaffingPage() {
  const { user, currentWorkspace } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'assignments' | 'projectAssignments' | 'capacity'>('assignments');
  const [requesting, setRequesting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProjectAssignmentModal, setShowProjectAssignmentModal] = useState(false);
  const [editingProjectAssignment, setEditingProjectAssignment] = useState<ProjectAssignment | null>(null);
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('6months');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [editedDates, setEditedDates] = useState<{ startDate: string; endDate: string; allocation: number } | null>(null);

  const { data: assignments = [], error } = useAssignments(user ? { userId: user.id } : undefined);
  const { data: projectAssignments = [] } = useProjectAssignments(user ? { userId: user.id } : undefined);

  // Fetch all projects for the current tenant
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentWorkspace?.tenantId],
    queryFn: () => projectsService.getAll({ tenantId: currentWorkspace?.tenantId }),
    enabled: !!currentWorkspace?.tenantId,
    // Optimize: Add caching configuration
    staleTime: 2 * 60 * 1000, // Projects don't change frequently
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch all WBS elements for the current tenant
  // OPTIMIZE: This loads 1000 WBS elements - heavy query
  // Consider loading only WBS elements referenced by assignments if performance becomes an issue
  const { data: wbsResponse } = useQuery({
    queryKey: ['wbs-all', currentWorkspace?.tenantId],
    queryFn: () => wbsService.getWbsElements({ pageSize: 1000 }),
    enabled: !!currentWorkspace?.tenantId,
    // Optimize: Add aggressive caching since this is a heavy query
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - WBS doesn't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: false, // Use cached data if available and fresh
  });

  // Create lookup maps for quick access
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const wbsMap = useMemo(() => {
    const wbsElements = wbsResponse?.items || [];
    const map = new Map();
    wbsElements.forEach(w => map.set(w.id, w));
    return map;
  }, [wbsResponse?.items]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const getStatusLabel = (status: AssignmentStatus): string => {
    switch (status) {
      case AssignmentStatus.Draft:
        return 'Draft';
      case AssignmentStatus.PendingApproval:
        return 'Pending Approval';
      case AssignmentStatus.Active:
        return 'Active';
      case AssignmentStatus.Completed:
        return 'Completed';
      case AssignmentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const handleRequest = async (payload: CreateAssignmentRequest) => {
    try {
      setRequesting(true);
      await assignmentRequestService.create(payload);
      toast.success('Assignment request submitted');
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  const handleEditClick = (assignment: Assignment) => {
    setEditingAssignment(assignment.id);
    setEditedDates({
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate?.split('T')[0] || '',
      allocation: assignment.allocation || 0,
    });
  };

  const handleSaveEdit = async (assignment: Assignment) => {
    if (!editedDates) return;

    try {
      await assignmentsService.update(assignment.id, {
        ...assignment,
        startDate: new Date(editedDates.startDate).toISOString(),
        endDate: new Date(editedDates.endDate).toISOString(),
        allocation: editedDates.allocation,
      });

      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment updated successfully');
      setEditingAssignment(null);
      setEditedDates(null);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to update assignment');
    }
  };

  const handleCancelEdit = () => {
    setEditingAssignment(null);
    setEditedDates(null);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await assignmentsService.delete(assignmentId);
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment deleted successfully');
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to delete assignment');
    }
  };

  const handleCreateProjectAssignment = async (projectAssignment: Partial<ProjectAssignment>) => {
    try {
      await projectAssignmentsService.create(projectAssignment as ProjectAssignment);
      await queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment created successfully');
      setShowProjectAssignmentModal(false);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to create project assignment');
      throw err;
    }
  };

  const handleUpdateProjectAssignment = async (projectAssignment: Partial<ProjectAssignment>) => {
    if (!editingProjectAssignment) return;

    try {
      await projectAssignmentsService.update(editingProjectAssignment.id, {
        ...editingProjectAssignment,
        ...projectAssignment,
      } as ProjectAssignment);
      await queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment updated successfully');
      setShowProjectAssignmentModal(false);
      setEditingProjectAssignment(null);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to update project assignment');
      throw err;
    }
  };

  const handleDeleteProjectAssignment = async (projectAssignmentId: string) => {
    if (!confirm('Are you sure you want to delete this project assignment? This may affect associated WBS assignments.')) return;

    try {
      await projectAssignmentsService.delete(projectAssignmentId);
      await queryClient.invalidateQueries({ queryKey: ['projectAssignments'] });
      toast.success('Project assignment deleted successfully');
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? 'Failed to delete project assignment');
    }
  };

  const handleEditProjectAssignment = (projectAssignment: ProjectAssignment) => {
    setEditingProjectAssignment(projectAssignment);
    setShowProjectAssignmentModal(true);
  };

  const getProjectAssignmentStatusLabel = (status: ProjectAssignmentStatus): string => {
    switch (status) {
      case ProjectAssignmentStatus.Draft:
        return 'Draft';
      case ProjectAssignmentStatus.PendingApproval:
        return 'Pending Approval';
      case ProjectAssignmentStatus.Active:
        return 'Active';
      case ProjectAssignmentStatus.Completed:
        return 'Completed';
      case ProjectAssignmentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const stats = useMemo(() => {
  const total = assignments.length;
  const active = assignments.filter(a => a.status === AssignmentStatus.Active).length;
  const pending = assignments.filter(a => a.status === AssignmentStatus.PendingApproval).length;
  const avgAllocation = assignments.length > 0
    ? Math.round(assignments.reduce((sum, a) => sum + (a.allocation || 0), 0) / assignments.length)
    : 0;

  return { total, active, pending, avgAllocation };
}, [assignments]);

  const getTimelineEndDate = (range: TimelineRange): Date => {
    const endDate = new Date();
    switch (range) {
      case '2months':
        endDate.setMonth(endDate.getMonth() + 2);
        break;
      case '6months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '1year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case '3years':
        endDate.setFullYear(endDate.getFullYear() + 3);
        break;
    }
    return endDate;
  };

  const getTimelineMonths = (startDate: Date, endDate: Date): Date[] => {
    const months: Date[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  // Group assignments by project and WBS
  const groupedAssignments = useMemo(() => {
    const projMap = new Map<string, {
      projectId: string;
      wbsGroups: Map<string, Assignment[]>;
      noWbsAssignments: Assignment[];
    }>();

    assignments.forEach(assignment => {
      // Get the project ID from the WBS element
      const wbs = assignment.wbsElementId ? wbsMap.get(assignment.wbsElementId) : null;
      const projectId = wbs?.projectId || 'no-project';

      if (!projMap.has(projectId)) {
        projMap.set(projectId, {
          projectId,
          wbsGroups: new Map(),
          noWbsAssignments: [],
        });
      }

      const projectGroup = projMap.get(projectId)!;

      if (assignment.wbsElementId) {
        if (!projectGroup.wbsGroups.has(assignment.wbsElementId)) {
          projectGroup.wbsGroups.set(assignment.wbsElementId, []);
        }
        projectGroup.wbsGroups.get(assignment.wbsElementId)!.push(assignment);
      } else {
        projectGroup.noWbsAssignments.push(assignment);
      }
    });

    return Array.from(projMap.entries()).map(([projectId, data]) => ({
      projectId,
      wbsGroups: Array.from(data.wbsGroups.entries()).map(([wbsId, items]) => ({
        wbsId,
        assignments: items,
      })),
      noWbsAssignments: data.noWbsAssignments,
    }));
  }, [assignments, wbsMap]);

  // Timeline calculation removed - was unused
  // Can be re-added if needed for future timeline visualization features

  const exportCsv = () => {
    const headers = ['Id', 'UserId', 'ProjectRoleId', 'Allocation', 'StartDate', 'EndDate', 'Status'];
    const rows = assignments.map((a) => [
      a.id,
      a.userId,
      a.projectRoleId ?? '',
      a.allocation,
      a.startDate,
      a.endDate,
      getStatusLabel(a.status),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assignments.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Assignments</div>
              <div className="text-gray-600">{error.message}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Staffing</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          Your upcoming assignments and utilization
        </p>
      </div>

      {/* Stats - 2x2 grid on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Total Assignments</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Pending Approval</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-bold text-purple-600">{stats.avgAllocation}%</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Avg Utilization</div>
          </div>
        </Card>
      </div>

      {/* View Selector */}
      <Card className="mb-4 sm:mb-6">
        <CardBody>
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Tab buttons - horizontal scroll on mobile */}
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <Button
                variant={selectedView === 'projectAssignments' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('projectAssignments')}
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Project Assignments</span>
                <span className="sm:hidden">Projects</span>
              </Button>
              <Button
                variant={selectedView === 'assignments' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('assignments')}
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">WBS Assignments</span>
                <span className="sm:hidden">WBS</span>
              </Button>
              <Button
                variant={selectedView === 'capacity' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('capacity')}
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Capacity View</span>
                <span className="sm:hidden">Capacity</span>
              </Button>
            </div>

            {/* Search input */}
            <div className="w-full">
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportCsv} className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
              {selectedView === 'projectAssignments' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingProjectAssignment(null);
                    setShowProjectAssignmentModal(true);
                  }}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">+ New Project Assignment</span>
                  <span className="sm:hidden">+ Project</span>
                </Button>
              )}
              {selectedView === 'assignments' && (
                <Button
                  variant="primary"
                  onClick={() => setShowRequestModal(true)}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">+ Request WBS Assignment</span>
                  <span className="sm:hidden">+ Request WBS</span>
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Assignments Table */}
      {selectedView === 'assignments' && (
        <Card>
          <CardHeader
            title="All Assignments"
            subtitle={`${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'}`}
          />

          {/* Timeline with range toggle */}
          <div className="border-t border-gray-200 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Timeline</h3>
              <div className="flex gap-1 sm:gap-2 overflow-x-auto">
                <Button
                  size="sm"
                  variant={timelineRange === '2months' ? 'primary' : 'ghost'}
                  onClick={() => setTimelineRange('2months')}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">2 Months</span>
                  <span className="sm:hidden">2M</span>
                </Button>
                <Button
                  size="sm"
                  variant={timelineRange === '6months' ? 'primary' : 'ghost'}
                  onClick={() => setTimelineRange('6months')}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">6 Months</span>
                  <span className="sm:hidden">6M</span>
                </Button>
                <Button
                  size="sm"
                  variant={timelineRange === '1year' ? 'primary' : 'ghost'}
                  onClick={() => setTimelineRange('1year')}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">1 Year</span>
                  <span className="sm:hidden">1Y</span>
                </Button>
                <Button
                  size="sm"
                  variant={timelineRange === '3years' ? 'primary' : 'ghost'}
                  onClick={() => setTimelineRange('3years')}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">3 Years</span>
                  <span className="sm:hidden">3Y</span>
                </Button>
              </div>
            </div>

            {/* Month headers */}
            {(() => {
              const now = new Date();
              const endDate = getTimelineEndDate(timelineRange);
              const months = getTimelineMonths(now, endDate);
              const totalMs = endDate.getTime() - now.getTime();

              return (
                <>
                  <div className="overflow-x-auto mb-4">
                    <div className="flex border-b border-gray-300 min-w-max">
                      {months.map((month, idx) => {
                        const monthStart = month.getTime();
                        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).getTime();
                        const widthPct = ((monthEnd - Math.max(monthStart, now.getTime())) / totalMs) * 100;

                        return (
                          <div
                            key={idx}
                            className="h-8 border-l border-gray-200 first:border-l-0 text-xs text-gray-600 px-2 flex items-center justify-center bg-gray-50"
                            style={{ width: `${Math.max(widthPct, 8)}%`, minWidth: '70px' }}
                          >
                            {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grouped assignment bars with accordion */}
                  <div className="space-y-4">
                    {groupedAssignments.map((projectGroup) => {
                      const isExpanded = expandedProjects.has(projectGroup.projectId);
                      const allProjectAssignments = [
                        ...projectGroup.noWbsAssignments,
                        ...projectGroup.wbsGroups.flatMap(wg => wg.assignments),
                      ];
                      const project = projectMap.get(projectGroup.projectId);
                      const projectLabel = project
                        ? `${project.name} (${project.programCode || project.id.substring(0, 8)})`
                        : projectGroup.projectId === 'no-project'
                          ? 'No Project'
                          : projectGroup.projectId.substring(0, 8);

                      return (
                        <div key={projectGroup.projectId} className="border border-gray-200 rounded-md">
                          {/* Project header */}
                          <button
                            onClick={() => toggleProject(projectGroup.projectId)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-gray-900">
                                {projectLabel}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({allProjectAssignments.length} {allProjectAssignments.length === 1 ? 'assignment' : 'assignments'})
                              </span>
                            </div>
                          </button>

                          {/* Project timeline bar (always visible) */}
                          <div className="px-3 py-2">
                            {allProjectAssignments.map((assignment) => {
                              const start = new Date(assignment.startDate);
                              const end = new Date(assignment.endDate || assignment.startDate);
                              const clampedStart = start < now ? now : start;
                              const clampedEnd = end > endDate ? endDate : end;
                              const leftPct = ((clampedStart.getTime() - now.getTime()) / totalMs) * 100;
                              const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;

                              return (
                                <div key={assignment.id} className="mb-2">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {assignment.allocation ?? 0}% • {assignment.projectRoleId ? assignment.projectRoleId.substring(0, 8) : 'No Role'}
                                  </div>
                                  <div className="h-3 bg-gray-100 rounded relative overflow-hidden">
                                    <div
                                      className="h-3 bg-blue-500 rounded absolute"
                                      style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.max(2, widthPct)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expanded WBS details */}
                          {isExpanded && projectGroup.wbsGroups.length > 0 && (
                            <div className="border-t border-gray-200 bg-white p-3 space-y-3">
                              {projectGroup.wbsGroups.map((wbsGroup) => {
                                const wbs = wbsMap.get(wbsGroup.wbsId);
                                const wbsLabel = wbs
                                  ? `${wbs.code} - ${wbs.description}`
                                  : wbsGroup.wbsId.substring(0, 8);

                                return (
                                <div key={wbsGroup.wbsId} className="pl-4">
                                  <div className="font-medium text-sm text-gray-700 mb-2">
                                    {wbsLabel}
                                  </div>
                                  {wbsGroup.assignments.map((assignment) => {
                                    const start = new Date(assignment.startDate);
                                    const end = new Date(assignment.endDate || assignment.startDate);
                                    const clampedStart = start < now ? now : start;
                                    const clampedEnd = end > endDate ? endDate : end;
                                    const leftPct = ((clampedStart.getTime() - now.getTime()) / totalMs) * 100;
                                    const widthPct = ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100;

                                    return (
                                      <div key={assignment.id} className="mb-2">
                                        <div className="text-xs text-gray-500 mb-1">
                                          {assignment.allocation ?? 0}% • Role: {assignment.projectRoleId?.substring(0, 8) || 'None'}
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded relative overflow-hidden">
                                          <div
                                            className="h-2 bg-green-500 rounded absolute"
                                            style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.max(2, widthPct)}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {groupedAssignments.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No assignments to display.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Assignments Table */}
          <div className="border-t border-gray-200 p-3 sm:p-4">
            <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">All Assignments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project/WBS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => {
                    const wbs = assignment.wbsElementId ? wbsMap.get(assignment.wbsElementId) : null;
                    const project = wbs?.projectId ? projectMap.get(wbs.projectId) : null;
                    const projectLabel = project ? `${project.name} (${project.programCode || 'N/A'})` : 'No Project';
                    const wbsLabel = wbs ? `${wbs.code} - ${wbs.description}` : 'No WBS';
                    const isEditing = editingAssignment === assignment.id;

                    return (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{projectLabel}</div>
                        <div className="text-xs text-gray-500">{wbsLabel}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {assignment.projectRoleId?.substring(0, 8) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedDates?.startDate || ''}
                            onChange={(e) => setEditedDates(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            aria-label="Start Date"
                          />
                        ) : (
                          new Date(assignment.startDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedDates?.endDate || ''}
                            onChange={(e) => setEditedDates(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            aria-label="End Date"
                          />
                        ) : (
                          assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : 'Ongoing'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={editedDates?.allocation || 100}
                            onChange={(e) => setEditedDates(prev => prev ? { ...prev, allocation: parseInt(e.target.value) } : null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                            aria-label="Allocation Percentage"
                          />
                        ) : (
                          `${assignment.allocation ?? 0}%`
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === AssignmentStatus.Active
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === AssignmentStatus.PendingApproval
                            ? 'bg-yellow-100 text-yellow-800'
                            : assignment.status === AssignmentStatus.Completed
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getStatusLabel(assignment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => handleSaveEdit(assignment)}>
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClick(assignment)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(assignment.id)} className="text-red-600 hover:text-red-700">
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                        No assignments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Capacity View */}
      {selectedView === 'capacity' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Capacity Summary Cards - 3 cols on mobile too, just smaller */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card padding="sm">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && (a.allocation || 0) < 80).length}
                </div>
                <div className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Under Allocated</div>
                <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">&lt;80%</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && (a.allocation || 0) >= 80 && (a.allocation || 0) <= 100).length}
                </div>
                <div className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Optimal</div>
                <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">80-100%</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && (a.allocation || 0) > 100).length}
                </div>
                <div className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Over Allocated</div>
                <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">&gt;100%</div>
              </div>
            </Card>
          </div>

          {/* Capacity Timeline */}
          <Card>
            <CardHeader
              title="Capacity Timeline"
              subtitle="Person utilization over time"
            />
            <CardBody>
              {/* Group assignments by user */}
              {(() => {
                // Group active assignments by userId
                const personMap = new Map<string, Assignment[]>();
                assignments
                  .filter(a => a.status === AssignmentStatus.Active)
                  .forEach(assignment => {
                    const existing = personMap.get(assignment.userId) || [];
                    personMap.set(assignment.userId, [...existing, assignment]);
                  });

                // Convert to array and display
                const personEntries = Array.from(personMap.entries());

                if (personEntries.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>No active assignments to display</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {personEntries.slice(0, 10).map(([userId, personAssignments]) => {
                      const totalAllocation = personAssignments.reduce((sum, a) => sum + (a.allocation || 0), 0);
                      const isOverAllocated = totalAllocation > 100;
                      const isUnderAllocated = totalAllocation < 80;

                      return (
                        <div key={userId} className="border-b pb-4 last:border-b-0">
                          {/* Person Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-gray-900">
                                User {userId.substring(0, 8)}...
                              </div>
                              <div className={`text-sm font-semibold ${
                                isOverAllocated ? 'text-red-600' :
                                isUnderAllocated ? 'text-green-600' :
                                'text-blue-600'
                              }`}>
                                {totalAllocation}% Total
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {personAssignments.length} active {personAssignments.length === 1 ? 'assignment' : 'assignments'}
                            </div>
                          </div>

                          {/* Capacity Bar */}
                          <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div
                                className={`h-6 rounded-full transition-all ${
                                  isOverAllocated ? 'bg-red-500' :
                                  isUnderAllocated ? 'bg-green-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(totalAllocation, 100)}%` }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                  {totalAllocation}%
                                </div>
                              </div>
                              {totalAllocation > 100 && (
                                <div
                                  className="absolute top-0 left-0 h-6 bg-red-600 opacity-50"
                                  style={{ width: `${totalAllocation - 100}%`, marginLeft: '100%' }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Assignment Details */}
                          <div className="space-y-2">
                            {personAssignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded hover:bg-gray-100 cursor-pointer"
                                onClick={() => {}}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">
                                    {assignment.allocation ?? 0}%
                                  </div>
                                  <div className="text-gray-600">
                                    Role: {assignment.projectRoleId ? `${assignment.projectRoleId.substring(0, 8)}...` : '—'}
                                  </div>
                                </div>
                                <div className="text-gray-500">
                                  {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : '—'} -{' '}
                                  {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {personEntries.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-4">
                        Showing 10 of {personEntries.length} people with active assignments
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Project Assignments View */}
      {selectedView === 'projectAssignments' && (
        <Card>
          <CardHeader
            title="Project Assignments (Step 1)"
            subtitle={`${projectAssignments.length} project ${projectAssignments.length === 1 ? 'assignment' : 'assignments'}`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WBS Assignments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectAssignments.map((projectAssignment) => {
                    const project = projectMap.get(projectAssignment.projectId);
                    const projectLabel = project ? `${project.name} (${project.programCode || 'N/A'})` : 'Unknown Project';
                    const wbsCount = assignments.filter(a => a.projectAssignmentId === projectAssignment.id).length;

                    return (
                      <tr key={projectAssignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">{projectLabel}</div>
                          {projectAssignment.notes && (
                            <div className="text-xs text-gray-500 mt-1">{projectAssignment.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(projectAssignment.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {projectAssignment.endDate ? new Date(projectAssignment.endDate).toLocaleDateString() : 'Ongoing'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            projectAssignment.status === ProjectAssignmentStatus.Active
                              ? 'bg-green-100 text-green-800'
                              : projectAssignment.status === ProjectAssignmentStatus.PendingApproval
                              ? 'bg-yellow-100 text-yellow-800'
                              : projectAssignment.status === ProjectAssignmentStatus.Completed
                              ? 'bg-gray-100 text-gray-800'
                              : projectAssignment.status === ProjectAssignmentStatus.Draft
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getProjectAssignmentStatusLabel(projectAssignment.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {wbsCount} WBS {wbsCount === 1 ? 'assignment' : 'assignments'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditProjectAssignment(projectAssignment)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProjectAssignment(projectAssignment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {projectAssignments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No project assignments found. Create one to get started with the two-step assignment model.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <AssignmentRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequest}
        isSubmitting={requesting}
      />

      <ProjectAssignmentModal
        isOpen={showProjectAssignmentModal}
        onClose={() => {
          setShowProjectAssignmentModal(false);
          setEditingProjectAssignment(null);
        }}
        onSubmit={editingProjectAssignment ? handleUpdateProjectAssignment : handleCreateProjectAssignment}
        isSubmitting={requesting}
        existingAssignment={editingProjectAssignment || undefined}
      />
    </div>
  );
}

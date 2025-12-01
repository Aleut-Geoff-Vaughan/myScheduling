import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  projectRoleAssignmentsService,
  careerJobFamiliesService,
  laborCategoriesService,
  subcontractorsService,
  type ProjectRoleAssignment,
  type CreateProjectRoleAssignmentDto,
  type UpdateProjectRoleAssignmentDto,
  type CareerJobFamily,
  type LaborCategory,
  type Subcontractor,
  ProjectRoleAssignmentStatus,
} from '../services/staffingService';
import { projectsService } from '../services/projectsService';
import { peopleService } from '../services/peopleService';
import wbsService from '../services/wbsService';
import type { Project, Person } from '../types/api';
import type { WbsElement } from '../types/wbs';
import toast from 'react-hot-toast';

type AssignmentType = 'user' | 'subcontractor' | 'tbd';

export function AdminProjectRoleAssignmentsPage() {
  const { currentWorkspace } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId;

  const [assignments, setAssignments] = useState<ProjectRoleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ProjectRoleAssignmentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'subcontractor' | 'tbd'>('all');
  const [search, setSearch] = useState('');

  // Reference data
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [careerFamilies, setCareerFamilies] = useState<CareerJobFamily[]>([]);
  const [laborCategories, setLaborCategories] = useState<LaborCategory[]>([]);
  const [wbsElements, setWbsElements] = useState<WbsElement[]>([]);
  const [positionTitles, setPositionTitles] = useState<string[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectRoleAssignment | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fill TBD modal
  const [showFillTbdModal, setShowFillTbdModal] = useState(false);
  const [fillTbdAssignment, setFillTbdAssignment] = useState<ProjectRoleAssignment | null>(null);
  const [fillTbdType, setFillTbdType] = useState<'user' | 'subcontractor'>('user');
  const [fillTbdUserId, setFillTbdUserId] = useState('');
  const [fillTbdSubcontractorId, setFillTbdSubcontractorId] = useState('');

  // Form state
  const [formData, setFormData] = useState<{
    projectId: string;
    wbsElementId: string;
    assignmentType: AssignmentType;
    userId: string;
    subcontractorId: string;
    tbdDescription: string;
    positionTitle: string;
    careerJobFamilyId: string;
    careerLevel: number | '';
    laborCategoryId: string;
    startDate: string;
    endDate: string;
    status: ProjectRoleAssignmentStatus;
    notes: string;
  }>({
    projectId: '',
    wbsElementId: '',
    assignmentType: 'user',
    userId: '',
    subcontractorId: '',
    tbdDescription: '',
    positionTitle: '',
    careerJobFamilyId: '',
    careerLevel: '',
    laborCategoryId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: ProjectRoleAssignmentStatus.Active,
    notes: '',
  });

  // Load reference data
  useEffect(() => {
    if (!tenantId) return;

    const loadReferenceData = async () => {
      try {
        const [projectsData, usersData, subcontractorsData, familiesData, titlesData] = await Promise.all([
          projectsService.getAll({ tenantId }),
          peopleService.getPeople({ tenantId }),
          subcontractorsService.getAll({ tenantId }),
          careerJobFamiliesService.getAll({ tenantId, isActive: true }),
          projectRoleAssignmentsService.getPositionTitles(tenantId),
        ]);
        setProjects(projectsData);
        setUsers(usersData);
        setSubcontractors(subcontractorsData);
        setCareerFamilies(familiesData);
        setPositionTitles(titlesData);
      } catch {
        toast.error('Failed to load reference data');
      }
    };

    loadReferenceData();
  }, [tenantId]);

  // Load WBS elements when project changes
  useEffect(() => {
    if (!formData.projectId) {
      setWbsElements([]);
      setLaborCategories([]);
      return;
    }

    const loadProjectData = async () => {
      try {
        const [wbsData, lcData] = await Promise.all([
          wbsService.getWbsElements({ projectId: formData.projectId }),
          laborCategoriesService.getByProject(formData.projectId, true),
        ]);
        setWbsElements(wbsData.items);
        setLaborCategories(lcData);
      } catch {
        console.error('Failed to load project data');
      }
    };

    loadProjectData();
  }, [formData.projectId]);

  const loadAssignments = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const data = await projectRoleAssignmentsService.getAll({
        tenantId,
        projectId: filterProject || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
        isTbd: filterType === 'tbd' ? true : filterType === 'all' ? undefined : false,
        includeInactive: true,
      });
      setAssignments(data);
    } catch {
      toast.error('Failed to load project role assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [tenantId, filterProject, filterStatus, filterType]);

  const filteredAssignments = useMemo(() => {
    let result = assignments;

    // Filter by type (user vs subcontractor)
    if (filterType === 'user') {
      result = result.filter((a) => a.userId && !a.isTbd);
    } else if (filterType === 'subcontractor') {
      result = result.filter((a) => a.subcontractorId && !a.isTbd);
    }

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.assigneeName.toLowerCase().includes(term) ||
          a.positionTitle.toLowerCase().includes(term) ||
          a.projectName.toLowerCase().includes(term) ||
          (a.wbsElementCode?.toLowerCase().includes(term) ?? false) ||
          (a.careerJobFamilyName?.toLowerCase().includes(term) ?? false)
      );
    }

    return result;
  }, [assignments, filterType, search]);

  const handleCreate = () => {
    setEditingAssignment(null);
    setFormData({
      projectId: filterProject || '',
      wbsElementId: '',
      assignmentType: 'user',
      userId: '',
      subcontractorId: '',
      tbdDescription: '',
      positionTitle: '',
      careerJobFamilyId: '',
      careerLevel: '',
      laborCategoryId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: ProjectRoleAssignmentStatus.Active,
      notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = (assignment: ProjectRoleAssignment) => {
    setEditingAssignment(assignment);
    const assignmentType: AssignmentType = assignment.isTbd
      ? 'tbd'
      : assignment.userId
        ? 'user'
        : 'subcontractor';

    setFormData({
      projectId: assignment.projectId,
      wbsElementId: assignment.wbsElementId || '',
      assignmentType,
      userId: assignment.userId || '',
      subcontractorId: assignment.subcontractorId || '',
      tbdDescription: assignment.tbdDescription || '',
      positionTitle: assignment.positionTitle,
      careerJobFamilyId: assignment.careerJobFamilyId || '',
      careerLevel: assignment.careerLevel ?? '',
      laborCategoryId: assignment.laborCategoryId || '',
      startDate: assignment.startDate,
      endDate: assignment.endDate || '',
      status: assignment.status,
      notes: assignment.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    if (!formData.projectId) {
      toast.error('Project is required');
      return;
    }
    if (!formData.positionTitle.trim()) {
      toast.error('Position title is required');
      return;
    }
    if (!formData.startDate) {
      toast.error('Start date is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAssignment) {
        const dto: UpdateProjectRoleAssignmentDto = {
          wbsElementId: formData.wbsElementId || undefined,
          positionTitle: formData.positionTitle,
          careerJobFamilyId: formData.careerJobFamilyId || undefined,
          careerLevel: formData.careerLevel !== '' ? formData.careerLevel : undefined,
          laborCategoryId: formData.laborCategoryId || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
          tbdDescription: formData.assignmentType === 'tbd' ? formData.tbdDescription : undefined,
        };
        await projectRoleAssignmentsService.update(editingAssignment.id, dto);
        toast.success('Assignment updated');
      } else {
        const dto: CreateProjectRoleAssignmentDto = {
          tenantId,
          projectId: formData.projectId,
          wbsElementId: formData.wbsElementId || undefined,
          userId: formData.assignmentType === 'user' ? formData.userId : undefined,
          subcontractorId: formData.assignmentType === 'subcontractor' ? formData.subcontractorId : undefined,
          isTbd: formData.assignmentType === 'tbd',
          tbdDescription: formData.assignmentType === 'tbd' ? formData.tbdDescription : undefined,
          positionTitle: formData.positionTitle,
          careerJobFamilyId: formData.careerJobFamilyId || undefined,
          careerLevel: formData.careerLevel !== '' ? formData.careerLevel : undefined,
          laborCategoryId: formData.laborCategoryId || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        await projectRoleAssignmentsService.create(dto);
        toast.success('Assignment created');
      }
      setShowModal(false);
      loadAssignments();
    } catch {
      toast.error(editingAssignment ? 'Failed to update assignment' : 'Failed to create assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete assignment for "${name}"?`)) return;

    try {
      await projectRoleAssignmentsService.delete(id);
      toast.success('Assignment deleted');
      loadAssignments();
    } catch {
      toast.error('Failed to delete assignment. It may have forecasts associated with it.');
    }
  };

  const handleFillTbd = (assignment: ProjectRoleAssignment) => {
    setFillTbdAssignment(assignment);
    setFillTbdType('user');
    setFillTbdUserId('');
    setFillTbdSubcontractorId('');
    setShowFillTbdModal(true);
  };

  const handleFillTbdSave = async () => {
    if (!fillTbdAssignment) return;

    const dto = fillTbdType === 'user'
      ? { userId: fillTbdUserId }
      : { subcontractorId: fillTbdSubcontractorId };

    if (fillTbdType === 'user' && !fillTbdUserId) {
      toast.error('Please select a user');
      return;
    }
    if (fillTbdType === 'subcontractor' && !fillTbdSubcontractorId) {
      toast.error('Please select a subcontractor');
      return;
    }

    setIsSaving(true);
    try {
      await projectRoleAssignmentsService.fillTbd(fillTbdAssignment.id, dto);
      toast.success('TBD position filled');
      setShowFillTbdModal(false);
      loadAssignments();
    } catch {
      toast.error('Failed to fill TBD position');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeClass = (status: ProjectRoleAssignmentStatus) => {
    switch (status) {
      case ProjectRoleAssignmentStatus.Active:
        return 'bg-green-100 text-green-800';
      case ProjectRoleAssignmentStatus.Draft:
        return 'bg-gray-100 text-gray-800';
      case ProjectRoleAssignmentStatus.OnHold:
        return 'bg-yellow-100 text-yellow-800';
      case ProjectRoleAssignmentStatus.Completed:
        return 'bg-blue-100 text-blue-800';
      case ProjectRoleAssignmentStatus.Cancelled:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage project role assignments.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Role Assignments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage team member assignments to projects and WBS elements.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Add Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, title, project..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ProjectRoleAssignmentStatus))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value={ProjectRoleAssignmentStatus.Active}>Active</option>
              <option value={ProjectRoleAssignmentStatus.Draft}>Draft</option>
              <option value={ProjectRoleAssignmentStatus.OnHold}>On Hold</option>
              <option value={ProjectRoleAssignmentStatus.Completed}>Completed</option>
              <option value={ProjectRoleAssignmentStatus.Cancelled}>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="user">Employees</option>
              <option value="subcontractor">Subcontractors</option>
              <option value="tbd">TBD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading assignments...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No assignments found.</p>
            <p className="text-sm">Click "Add Assignment" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project / WBS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Career
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className={assignment.status !== ProjectRoleAssignmentStatus.Active ? 'bg-gray-50 opacity-70' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {assignment.isTbd ? (
                          <span className="text-orange-600">TBD</span>
                        ) : (
                          assignment.assigneeName
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.isTbd
                          ? assignment.tbdDescription || 'Open position'
                          : assignment.subcontractorId
                            ? `Sub: ${assignment.subcontractorCompanyName}`
                            : 'Employee'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{assignment.positionTitle}</div>
                      {assignment.laborCategoryCode && (
                        <div className="text-sm text-gray-500">LCAT: {assignment.laborCategoryCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{assignment.projectName}</div>
                      {assignment.wbsElementCode && (
                        <div className="text-sm text-gray-500">{assignment.wbsElementCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.careerJobFamilyName && (
                        <div>{assignment.careerJobFamilyName}</div>
                      )}
                      {assignment.careerLevel && (
                        <div>Level {assignment.careerLevel}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(assignment.startDate).toLocaleDateString()}</div>
                      {assignment.endDate && (
                        <div>to {new Date(assignment.endDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          assignment.status
                        )}`}
                      >
                        {assignment.statusName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {assignment.isTbd && assignment.status === ProjectRoleAssignmentStatus.Active && (
                        <button
                          onClick={() => handleFillTbd(assignment)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Fill
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id, assignment.assigneeName)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAssignment ? 'Edit Assignment' : 'Add Assignment'}
            </h2>

            <div className="space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value, wbsElementId: '', laborCategoryId: '' })}
                  disabled={!!editingAssignment}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* WBS Element */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WBS Element</label>
                <select
                  value={formData.wbsElementId}
                  onChange={(e) => setFormData({ ...formData, wbsElementId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.projectId}
                >
                  <option value="">Select WBS (optional)...</option>
                  {wbsElements.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Type (only for new) */}
              {!editingAssignment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="user"
                        checked={formData.assignmentType === 'user'}
                        onChange={() => setFormData({ ...formData, assignmentType: 'user', subcontractorId: '', tbdDescription: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Employee</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="subcontractor"
                        checked={formData.assignmentType === 'subcontractor'}
                        onChange={() => setFormData({ ...formData, assignmentType: 'subcontractor', userId: '', tbdDescription: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Subcontractor</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="tbd"
                        checked={formData.assignmentType === 'tbd'}
                        onChange={() => setFormData({ ...formData, assignmentType: 'tbd', userId: '', subcontractorId: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">TBD (Open Position)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* User Selection */}
              {formData.assignmentType === 'user' && !editingAssignment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subcontractor Selection */}
              {formData.assignmentType === 'subcontractor' && !editingAssignment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcontractor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subcontractorId}
                    onChange={(e) => setFormData({ ...formData, subcontractorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subcontractor...</option>
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.subcontractorCompanyName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TBD Description */}
              {formData.assignmentType === 'tbd' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TBD Description</label>
                  <input
                    type="text"
                    value={formData.tbdDescription}
                    onChange={(e) => setFormData({ ...formData, tbdDescription: e.target.value })}
                    placeholder="e.g., Senior Developer needed Q2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Position Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="positionTitles"
                  value={formData.positionTitle}
                  onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                  placeholder="e.g., Senior Software Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="positionTitles">
                  {positionTitles.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Career Family & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Job Family</label>
                  <select
                    value={formData.careerJobFamilyId}
                    onChange={(e) => setFormData({ ...formData, careerJobFamilyId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select family...</option>
                    {careerFamilies.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Level</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.careerLevel}
                    onChange={(e) => setFormData({ ...formData, careerLevel: e.target.value ? parseInt(e.target.value) : '' })}
                    placeholder="1-10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Labor Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labor Category</label>
                <select
                  value={formData.laborCategoryId}
                  onChange={(e) => setFormData({ ...formData, laborCategoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.projectId}
                >
                  <option value="">Select labor category...</option>
                  {laborCategories.map((lc) => (
                    <option key={lc.id} value={lc.id}>
                      {lc.code ? `${lc.code} - ` : ''}{lc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) as ProjectRoleAssignmentStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ProjectRoleAssignmentStatus.Active}>Active</option>
                  <option value={ProjectRoleAssignmentStatus.Draft}>Draft</option>
                  <option value={ProjectRoleAssignmentStatus.OnHold}>On Hold</option>
                  <option value={ProjectRoleAssignmentStatus.Completed}>Completed</option>
                  <option value={ProjectRoleAssignmentStatus.Cancelled}>Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingAssignment ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill TBD Modal */}
      {showFillTbdModal && fillTbdAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fill TBD Position</h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign someone to: <strong>{fillTbdAssignment.positionTitle}</strong> on{' '}
              <strong>{fillTbdAssignment.projectName}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fillTbdType"
                      value="user"
                      checked={fillTbdType === 'user'}
                      onChange={() => {
                        setFillTbdType('user');
                        setFillTbdSubcontractorId('');
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Employee</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fillTbdType"
                      value="subcontractor"
                      checked={fillTbdType === 'subcontractor'}
                      onChange={() => {
                        setFillTbdType('subcontractor');
                        setFillTbdUserId('');
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Subcontractor</span>
                  </label>
                </div>
              </div>

              {fillTbdType === 'user' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fillTbdUserId}
                    onChange={(e) => setFillTbdUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Subcontractor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fillTbdSubcontractorId}
                    onChange={(e) => setFillTbdSubcontractorId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subcontractor...</option>
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.subcontractorCompanyName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFillTbdModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleFillTbdSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

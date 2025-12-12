import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { staffingReportsService, type ProjectsSummaryItem } from '../services/forecastService';
import { projectsService } from '../services/projectsService';
import { projectBudgetsService } from '../services/projectBudgetsService';
import { tenantSettingsService } from '../services/tenantSettingsService';
import type { Project } from '../types/api';
import {
  ProjectBudgetType,
  ProjectBudgetStatus,
  type ProjectBudget,
  type FiscalYearInfo,
} from '../types/budget';

const BUDGET_TYPE_LABELS: Record<ProjectBudgetType, string> = {
  [ProjectBudgetType.Original]: 'Original',
  [ProjectBudgetType.Reforecast]: 'Re-forecast',
  [ProjectBudgetType.Amendment]: 'Amendment',
  [ProjectBudgetType.WhatIf]: 'What-If',
};

const BUDGET_STATUS_LABELS: Record<ProjectBudgetStatus, string> = {
  [ProjectBudgetStatus.Draft]: 'Draft',
  [ProjectBudgetStatus.Submitted]: 'Submitted',
  [ProjectBudgetStatus.Approved]: 'Approved',
  [ProjectBudgetStatus.Rejected]: 'Rejected',
  [ProjectBudgetStatus.Active]: 'Active',
  [ProjectBudgetStatus.Superseded]: 'Superseded',
};

const BUDGET_STATUS_COLORS: Record<ProjectBudgetStatus, string> = {
  [ProjectBudgetStatus.Draft]: 'bg-gray-100 text-gray-700',
  [ProjectBudgetStatus.Submitted]: 'bg-blue-100 text-blue-700',
  [ProjectBudgetStatus.Approved]: 'bg-green-100 text-green-700',
  [ProjectBudgetStatus.Rejected]: 'bg-red-100 text-red-700',
  [ProjectBudgetStatus.Active]: 'bg-emerald-100 text-emerald-700',
  [ProjectBudgetStatus.Superseded]: 'bg-gray-100 text-gray-500',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ProjectWithBudgetInfo extends Project {
  activeBudget?: ProjectBudget;
  forecastedHours: number;
  assignmentCount: number;
  variance: number;
}

// Move SortIcon component outside to avoid re-creation during render
function SortIcon({
  field,
  sortField,
  sortDirection
}: {
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}) {
  if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-emerald-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
}

export function BudgetManagementPage() {
  const navigate = useNavigate();
  const { currentWorkspace, availableTenants } = useAuthStore();
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId || '';
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'budget' | 'forecast' | 'variance'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // Fetch fiscal year info
  const { data: fiscalYearInfo } = useQuery({
    queryKey: ['fiscal-year-current'],
    queryFn: () => projectBudgetsService.getCurrentFiscalYear(),
    enabled: !!tenantId,
  });

  // Fetch tenant settings
  const { data: tenantSettings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsService.getSettings(),
    enabled: !!tenantId,
  });

  // Fetch projects summary with forecast data
  const { data: projectsSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['forecast-projects', tenantId],
    queryFn: () => staffingReportsService.getProjectsSummary(),
    enabled: !!tenantId,
  });

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', tenantId],
    queryFn: () => projectsService.getAll({ tenantId }),
    enabled: !!tenantId,
  });

  // Fetch all budgets for current fiscal year
  const { data: budgets = [] } = useQuery({
    queryKey: ['project-budgets', tenantId, fiscalYearInfo?.fiscalYear],
    queryFn: () => projectBudgetsService.getAll({
      fiscalYear: fiscalYearInfo?.fiscalYear,
      status: ProjectBudgetStatus.Active,
    }),
    enabled: !!tenantId && !!fiscalYearInfo?.fiscalYear,
  });

  // Fetch budgets for selected project
  const { data: projectBudgets = [] } = useQuery({
    queryKey: ['project-budgets-detail', selectedProject?.id],
    queryFn: () => projectBudgetsService.getAll({
      projectId: selectedProject?.id,
      includeSuperseded: true,
    }),
    enabled: !!selectedProject?.id,
  });

  // Fetch selected budget details
  const { data: selectedBudgetDetails } = useQuery({
    queryKey: ['budget-detail', selectedBudgetId],
    queryFn: () => projectBudgetsService.getById(selectedBudgetId!),
    enabled: !!selectedBudgetId,
  });

  // Mutations
  const activateBudgetMutation = useMutation({
    mutationFn: (id: string) => projectBudgetsService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget activated');
    },
    onError: () => toast.error('Failed to activate budget'),
  });

  const submitBudgetMutation = useMutation({
    mutationFn: (id: string) => projectBudgetsService.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget submitted for approval');
    },
    onError: () => toast.error('Failed to submit budget'),
  });

  const approveBudgetMutation = useMutation({
    mutationFn: (id: string) => projectBudgetsService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget approved');
    },
    onError: () => toast.error('Failed to approve budget'),
  });

  const reforecastMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      projectBudgetsService.reforecast(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Re-forecast budget created');
    },
    onError: () => toast.error('Failed to create re-forecast'),
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => projectBudgetsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget deleted');
      setSelectedBudgetId(null);
    },
    onError: () => toast.error('Failed to delete budget'),
  });

  // Merge project data with budget and forecast info
  const projectData = useMemo<ProjectWithBudgetInfo[]>(() => {
    const summaryMap: Record<string, ProjectsSummaryItem> = {};
    (projectsSummary?.projects || []).forEach(p => {
      summaryMap[p.id] = p;
    });

    const budgetMap: Record<string, ProjectBudget> = {};
    budgets.forEach(b => {
      if (b.status === ProjectBudgetStatus.Active) {
        budgetMap[b.projectId] = b;
      }
    });

    return projects.map(project => {
      const summary = summaryMap[project.id];
      const activeBudget = budgetMap[project.id];
      const forecastedHours = summary?.totalForecastedHours || 0;
      const budgetedHours = activeBudget?.totalBudgetedHours || 0;
      const variance = budgetedHours > 0 ? ((forecastedHours - budgetedHours) / budgetedHours) * 100 : 0;

      return {
        ...project,
        activeBudget,
        forecastedHours,
        assignmentCount: summary?.assignmentCount || 0,
        variance,
      };
    });
  }, [projects, projectsSummary, budgets]);

  // Filter and sort
  const filteredProjects = useMemo(() => {
    return projectData
      .filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.programCode?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'budget':
            comparison = (a.activeBudget?.totalBudgetedHours || 0) - (b.activeBudget?.totalBudgetedHours || 0);
            break;
          case 'forecast':
            comparison = a.forecastedHours - b.forecastedHours;
            break;
          case 'variance':
            comparison = a.variance - b.variance;
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [projectData, searchTerm, sortField, sortDirection]);

  // Summary stats
  const stats = useMemo(() => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.activeBudget?.totalBudgetedHours || 0), 0);
    const totalForecast = filteredProjects.reduce((sum, p) => sum + p.forecastedHours, 0);
    const overBudgetCount = filteredProjects.filter(p => p.activeBudget && p.variance > 10).length;
    const underBudgetCount = filteredProjects.filter(p => p.activeBudget && p.variance < -10).length;
    const onTrackCount = filteredProjects.filter(p => p.activeBudget && Math.abs(p.variance) <= 10).length;
    const noBudgetCount = filteredProjects.filter(p => !p.activeBudget).length;

    return { totalBudget, totalForecast, overBudgetCount, underBudgetCount, onTrackCount, noBudgetCount };
  }, [filteredProjects]);

  const handleSort = (field: 'name' | 'budget' | 'forecast' | 'variance') => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowBudgetModal(true);
  };

  const handleCreateBudget = (project: Project) => {
    navigate(`/forecast/budgets/create/${project.id}`);
  };

  const getVarianceColor = (variance: number, hasBudget: boolean) => {
    if (!hasBudget) return '';
    if (Math.abs(variance) <= 10) return 'text-green-600 bg-green-50';
    if (variance > 10) return 'text-red-600 bg-red-50';
    return 'text-amber-600 bg-amber-50';
  };

  const getVarianceIcon = (variance: number) => {
    if (Math.abs(variance) <= 10) return '✓';
    if (variance > 0) return '▲';
    return '▼';
  };

  const getFiscalYearLabel = () => {
    if (!fiscalYearInfo) return '';
    const startMonth = fiscalYearInfo.startMonth || 1;
    if (startMonth === 1) {
      return `Calendar Year ${fiscalYearInfo.fiscalYear}`;
    }
    const startYear = startMonth <= 6 ? fiscalYearInfo.fiscalYear - 1 : fiscalYearInfo.fiscalYear;
    const endYear = startMonth <= 6 ? fiscalYearInfo.fiscalYear : fiscalYearInfo.fiscalYear + 1;
    return `FY${endYear} (${MONTH_NAMES[startMonth - 1]} ${startYear} - ${MONTH_NAMES[(startMonth + 10) % 12]} ${endYear})`;
  };

  const isLoading = summaryLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-600 mt-1">
            {getFiscalYearLabel()} • Track and manage project budgets with version history
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Budget</div>
          <div className="text-xl font-bold text-gray-900">{stats.totalBudget.toLocaleString()} hrs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Forecast</div>
          <div className="text-xl font-bold text-emerald-600">{stats.totalForecast.toLocaleString()} hrs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">On Track</div>
          <div className="text-xl font-bold text-green-600">{stats.onTrackCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Over Budget</div>
          <div className="text-xl font-bold text-red-600">{stats.overBudgetCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Under Budget</div>
          <div className="text-xl font-bold text-amber-600">{stats.underBudgetCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">No Budget Set</div>
          <div className="text-xl font-bold text-gray-500">{stats.noBudgetCount}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Budget Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Project <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget Version
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('budget')}
                >
                  Budget (hrs) <SortIcon field="budget" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('forecast')}
                >
                  Forecast (hrs) <SortIcon field="forecast" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('variance')}
                >
                  Variance <SortIcon field="variance" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No projects found.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/forecast/projects/${project.id}`}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {project.name}
                      </Link>
                      {project.programCode && (
                        <div className="text-xs text-gray-500">{project.programCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {project.activeBudget ? (
                        <button
                          onClick={() => handleProjectClick(project)}
                          className="inline-flex items-center gap-1.5 text-sm"
                        >
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS_COLORS[project.activeBudget.status]}`}>
                            {BUDGET_TYPE_LABELS[project.activeBudget.budgetType]}
                          </span>
                          <span className="text-gray-400 text-xs">v{project.activeBudget.version}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateBudget(project)}
                          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                        >
                          + Create Budget
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {project.activeBudget?.totalBudgetedHours?.toLocaleString() || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-emerald-600">
                      {project.forecastedHours.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {project.activeBudget ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getVarianceColor(project.variance, true)}`}>
                          {getVarianceIcon(project.variance)} {project.variance > 0 ? '+' : ''}{project.variance.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No budget</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleProjectClick(project)}
                          className="text-gray-400 hover:text-emerald-600"
                          title="Manage Budgets"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <Link
                          to={`/forecast/projects/${project.id}/grid`}
                          className="text-gray-400 hover:text-emerald-600"
                          title="View Grid"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>
          On Track (±10%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span>
          Over Budget ({'>'}10%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></span>
          Under Budget ({'<'}-10%)
        </span>
      </div>

      {/* Budget Management Modal */}
      {showBudgetModal && selectedProject && (
        <BudgetManagementModal
          project={selectedProject}
          budgets={projectBudgets}
          selectedBudgetDetails={selectedBudgetDetails}
          selectedBudgetId={selectedBudgetId}
          fiscalYearInfo={fiscalYearInfo}
          requireApproval={tenantSettings?.requireBudgetApproval || false}
          onClose={() => {
            setShowBudgetModal(false);
            setSelectedProject(null);
            setSelectedBudgetId(null);
          }}
          onSelectBudget={setSelectedBudgetId}
          onActivate={(id) => activateBudgetMutation.mutate(id)}
          onSubmit={(id) => submitBudgetMutation.mutate(id)}
          onApprove={(id) => approveBudgetMutation.mutate(id)}
          onReforecast={(id) => reforecastMutation.mutate({ id })}
          onDelete={(id) => deleteBudgetMutation.mutate(id)}
          onCreateNew={() => {
            setShowBudgetModal(false);
            if (selectedProject) {
              navigate(`/forecast/budgets/create/${selectedProject.id}`);
            }
          }}
        />
      )}
    </div>
  );
}

interface BudgetManagementModalProps {
  project: Project;
  budgets: ProjectBudget[];
  selectedBudgetDetails?: ProjectBudget;
  selectedBudgetId: string | null;
  fiscalYearInfo?: FiscalYearInfo;
  requireApproval: boolean;
  onClose: () => void;
  onSelectBudget: (id: string | null) => void;
  onActivate: (id: string) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReforecast: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

function BudgetManagementModal({
  project,
  budgets,
  selectedBudgetDetails,
  selectedBudgetId,
  fiscalYearInfo: _fiscalYearInfo,
  requireApproval,
  onClose,
  onSelectBudget,
  onActivate,
  onSubmit,
  onApprove,
  onReforecast,
  onDelete,
  onCreateNew,
}: BudgetManagementModalProps) {
  void _fiscalYearInfo; // Reserved for future use
  const activeBudget = budgets.find(b => b.status === ProjectBudgetStatus.Active);
  const draftBudgets = budgets.filter(b => b.status === ProjectBudgetStatus.Draft);
  const pendingBudgets = budgets.filter(b => b.status === ProjectBudgetStatus.Submitted);
  const historicalBudgets = budgets.filter(b =>
    b.status === ProjectBudgetStatus.Superseded ||
    b.status === ProjectBudgetStatus.Approved ||
    b.status === ProjectBudgetStatus.Rejected
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
            <p className="text-sm text-gray-500">Budget History & Management</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Active Budget */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Active Budget</h3>
            {activeBudget ? (
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer ${
                  selectedBudgetId === activeBudget.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
                }`}
                onClick={() => onSelectBudget(activeBudget.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {activeBudget.name || BUDGET_TYPE_LABELS[activeBudget.budgetType]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS_COLORS[activeBudget.status]}`}>
                        {BUDGET_STATUS_LABELS[activeBudget.status]}
                      </span>
                      <span className="text-xs text-gray-500">v{activeBudget.version}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeBudget.totalBudgetedHours.toLocaleString()} hours • FY{activeBudget.fiscalYear}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onReforecast(activeBudget.id); }}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Re-forecast
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-gray-300 text-center">
                <p className="text-gray-500 mb-2">No active budget for this project</p>
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Create Budget
                </button>
              </div>
            )}
          </div>

          {/* Draft Budgets */}
          {draftBudgets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Draft Budgets</h3>
              <div className="space-y-2">
                {draftBudgets.map(budget => (
                  <div
                    key={budget.id}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedBudgetId === budget.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onSelectBudget(budget.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {budget.name || BUDGET_TYPE_LABELS[budget.budgetType]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS_COLORS[budget.status]}`}>
                          {BUDGET_STATUS_LABELS[budget.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {budget.totalBudgetedHours.toLocaleString()} hrs
                        </span>
                        {requireApproval ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSubmit(budget.id); }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Submit
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); onActivate(budget.id); }}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(budget.id); }}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Approval */}
          {pendingBudgets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Approval</h3>
              <div className="space-y-2">
                {pendingBudgets.map(budget => (
                  <div
                    key={budget.id}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedBudgetId === budget.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onSelectBudget(budget.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {budget.name || BUDGET_TYPE_LABELS[budget.budgetType]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS_COLORS[budget.status]}`}>
                          {BUDGET_STATUS_LABELS[budget.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {budget.totalBudgetedHours.toLocaleString()} hrs
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(budget.id); }}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Details */}
          {selectedBudgetDetails && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Budget Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500">Type</div>
                    <div className="font-medium">{BUDGET_TYPE_LABELS[selectedBudgetDetails.budgetType]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Version</div>
                    <div className="font-medium">{selectedBudgetDetails.version}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Fiscal Year</div>
                    <div className="font-medium">FY{selectedBudgetDetails.fiscalYear}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Hours</div>
                    <div className="font-medium">{selectedBudgetDetails.totalBudgetedHours.toLocaleString()}</div>
                  </div>
                </div>

                {selectedBudgetDetails.budgetLines && selectedBudgetDetails.budgetLines.length > 0 && (
                  <div>
                    {/* Check if any lines have WBS elements */}
                    {selectedBudgetDetails.budgetLines.some(l => l.wbsElementId) ? (
                      <>
                        <div className="text-xs text-gray-500 mb-2">WBS Monthly Breakdown</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-2 font-medium text-gray-600">WBS Element</th>
                                <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                                <th className="text-right py-2 px-2 font-medium text-gray-600">Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedBudgetDetails.budgetLines
                                .sort((a, b) => {
                                  const wbsCompare = (a.wbsElementCode || '').localeCompare(b.wbsElementCode || '');
                                  if (wbsCompare !== 0) return wbsCompare;
                                  return a.year !== b.year ? a.year - b.year : a.month - b.month;
                                })
                                .map((line) => (
                                  <tr key={line.id} className="border-b border-gray-100">
                                    <td className="py-2 px-2">
                                      <div className="font-medium">{line.wbsElementCode || 'N/A'}</div>
                                      {line.wbsElementDescription && (
                                        <div className="text-xs text-gray-500">{line.wbsElementDescription}</div>
                                      )}
                                    </td>
                                    <td className="py-2 px-2">{MONTH_NAMES[line.month - 1]} {line.year}</td>
                                    <td className="py-2 px-2 text-right">{line.budgetedHours.toLocaleString()}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-gray-500 mb-2">Monthly Breakdown</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-2 font-medium text-gray-600">Month</th>
                                <th className="text-right py-2 px-2 font-medium text-gray-600">Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedBudgetDetails.budgetLines
                                .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
                                .map((line) => (
                                  <tr key={line.id} className="border-b border-gray-100">
                                    <td className="py-2 px-2">{MONTH_NAMES[line.month - 1]} {line.year}</td>
                                    <td className="py-2 px-2 text-right">{line.budgetedHours.toLocaleString()}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Budgets */}
          {historicalBudgets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Budget History</h3>
              <div className="space-y-2">
                {historicalBudgets.map(budget => (
                  <div
                    key={budget.id}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedBudgetId === budget.id
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 opacity-75'
                    }`}
                    onClick={() => onSelectBudget(budget.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">
                          {budget.name || BUDGET_TYPE_LABELS[budget.budgetType]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS_COLORS[budget.status]}`}>
                          {BUDGET_STATUS_LABELS[budget.status]}
                        </span>
                        <span className="text-xs text-gray-500">v{budget.version}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {budget.totalBudgetedHours.toLocaleString()} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            + Create New Budget
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BudgetManagementPage;

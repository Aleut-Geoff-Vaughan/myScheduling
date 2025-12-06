import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/ui';
import { useAuthStore, AppRole } from '../stores/authStore';
import { useProjects } from '../hooks/useProjects';

// Determine user's primary forecast role
type ForecastRole = 'pm' | 'finance' | 'pl_lead' | 'executive';

function useUserForecastRole(): ForecastRole {
  const { hasRole } = useAuthStore();

  // Priority: Executive > P&L Lead (TenantAdmin) > Finance (ResourceManager) > PM
  if (hasRole(AppRole.Executive)) return 'executive';
  if (hasRole(AppRole.TenantAdmin) || hasRole(AppRole.SysAdmin)) return 'pl_lead';
  if (hasRole(AppRole.ResourceManager)) return 'finance';
  return 'pm';
}

export function ForecastDashboardPage() {
  const navigate = useNavigate();
  const { user, currentWorkspace, availableTenants } = useAuthStore();
  const forecastRole = useUserForecastRole();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  // Fetch projects for stats
  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    tenantId,
  });

  // Calculate mock statistics (these will be replaced with real API calls)
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 1).length; // Active status

    return {
      // PM stats
      myProjects: Math.min(activeProjects, 5),
      draftHours: 1240,
      submittedHours: 820,
      dueInDays: 3,

      // Finance stats
      pendingReview: 12,
      totalHours: 45200,
      completeness: 78,
      budgetVariance: 2.3,

      // P&L stats
      pendingApproval: 8,
      approvedPercent: 85,
      totalForecastHours: 125000,

      // Shared
      activeProjects,
    };
  }, [projects]);

  if (!user) return null;

  // Render role-specific dashboard
  switch (forecastRole) {
    case 'pm':
      return <PMDashboard stats={stats} isLoading={projectsLoading} navigate={navigate} />;
    case 'finance':
      return <FinanceDashboard stats={stats} isLoading={projectsLoading} navigate={navigate} />;
    case 'pl_lead':
    case 'executive':
      return <ExecutiveDashboard stats={stats} isLoading={projectsLoading} navigate={navigate} forecastRole={forecastRole} />;
    default:
      return <PMDashboard stats={stats} isLoading={projectsLoading} navigate={navigate} />;
  }
}

// PM Dashboard Component
interface DashboardProps {
  stats: {
    myProjects: number;
    draftHours: number;
    submittedHours: number;
    dueInDays: number;
    pendingReview: number;
    totalHours: number;
    completeness: number;
    budgetVariance: number;
    pendingApproval: number;
    approvedPercent: number;
    totalForecastHours: number;
    activeProjects: number;
  };
  isLoading: boolean;
  navigate: (path: string) => void;
  forecastRole?: ForecastRole;
}

function PMDashboard({ stats, isLoading, navigate }: DashboardProps) {
  // Mock action items
  const actionItems = [
    { type: 'warning', text: 'Project Alpha - January forecast due in 3 days' },
    { type: 'warning', text: 'Project Beta - 2 positions need forecast entries' },
    { type: 'info', text: 'Project Gamma - P&L requested revision (see notes)' },
  ];

  // Mock projects
  const myProjects = [
    { name: 'Project Alpha', jan: 160, feb: 160, mar: 120, total: 440, status: 'approved' },
    { name: 'Project Beta', jan: 80, feb: null, mar: null, total: 80, status: 'draft' },
    { name: 'Project Gamma', jan: 200, feb: 180, mar: 160, total: 540, status: 'revision' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Forecast Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your project forecasts and track submissions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="My Projects"
          value={stats.myProjects}
          icon={<ProjectIcon />}
          color="bg-emerald-500"
          loading={isLoading}
          onClick={() => navigate('/forecast/my-forecasts')}
        />
        <StatCard
          title="Draft Hours"
          value={stats.draftHours.toLocaleString()}
          icon={<DraftIcon />}
          color="bg-gray-500"
          loading={isLoading}
        />
        <StatCard
          title="Submitted"
          value={stats.submittedHours.toLocaleString()}
          icon={<SubmittedIcon />}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Due Soon"
          value={`${stats.dueInDays} days`}
          icon={<ClockIcon />}
          color="bg-amber-500"
          loading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Required */}
        <Card>
          <CardHeader
            title="Action Required"
            subtitle="Items needing your attention"
          />
          <CardBody>
            {actionItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                <p className="text-gray-500">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {item.type === 'warning' ? (
                      <WarningIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* My Projects Summary */}
        <Card>
          <CardHeader
            title="My Projects"
            subtitle="Forecast status by project"
            action={
              <button
                type="button"
                onClick={() => navigate('/forecast/my-forecasts')}
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
              >
                View All
              </button>
            }
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2">Project</th>
                    <th className="text-right pb-2">Jan</th>
                    <th className="text-right pb-2">Feb</th>
                    <th className="text-right pb-2">Mar</th>
                    <th className="text-right pb-2">Total</th>
                    <th className="text-center pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {myProjects.map((project) => (
                    <tr key={project.name} className="border-t border-gray-100">
                      <td className="py-2 font-medium text-gray-900">{project.name}</td>
                      <td className="py-2 text-right text-gray-600">{project.jan ?? '--'}</td>
                      <td className="py-2 text-right text-gray-600">{project.feb ?? '--'}</td>
                      <td className="py-2 text-right text-gray-600">{project.mar ?? '--'}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{project.total}</td>
                      <td className="py-2 text-center">
                        <StatusBadge status={project.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Enter Forecast"
            description="Update your project forecasts"
            icon={<EditIcon className="w-8 h-8" />}
            color="text-emerald-600"
            onClick={() => navigate('/forecast/my-forecasts')}
          />
          <QuickActionCard
            title="View Projects"
            description="Browse all forecast projects"
            icon={<ProjectIcon className="w-8 h-8" />}
            color="text-blue-600"
            onClick={() => navigate('/forecast/projects')}
          />
          <QuickActionCard
            title="Create Version"
            description="Create a what-if scenario"
            icon={<VersionIcon className="w-8 h-8" />}
            color="text-purple-600"
            onClick={() => navigate('/forecast/versions')}
          />
          <QuickActionCard
            title="Import Data"
            description="Upload forecast spreadsheet"
            icon={<ImportIcon className="w-8 h-8" />}
            color="text-indigo-600"
            onClick={() => navigate('/forecast/import-export')}
          />
        </div>
      </div>
    </div>
  );
}

// Finance Dashboard Component
function FinanceDashboard({ stats, isLoading, navigate }: DashboardProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Finance Forecast Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Review forecasts, track completeness, and manage approvals.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          icon={<ReviewIcon />}
          color="bg-amber-500"
          loading={isLoading}
          onClick={() => navigate('/forecast/review')}
        />
        <StatCard
          title="Total Hours"
          value={stats.totalHours.toLocaleString()}
          icon={<ClockIcon />}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Completeness"
          value={`${stats.completeness}%`}
          icon={<ChartIcon />}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Budget Variance"
          value={`${stats.budgetVariance > 0 ? '+' : ''}${stats.budgetVariance}%`}
          icon={<DollarIcon />}
          color={stats.budgetVariance > 5 ? 'bg-red-500' : 'bg-green-500'}
          loading={isLoading}
          onClick={() => navigate('/forecast/budgets')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Queue */}
        <Card>
          <CardHeader
            title="Review Queue"
            subtitle="Forecasts awaiting your review"
            action={
              <button
                type="button"
                onClick={() => navigate('/forecast/review')}
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
              >
                Review Now
              </button>
            }
          />
          <CardBody>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-600">{stats.pendingReview}</span>
              </div>
              <p className="text-gray-600">forecasts awaiting review</p>
              <p className="text-sm text-gray-500 mt-1">(3 high priority)</p>
            </div>
          </CardBody>
        </Card>

        {/* Forecast vs Budget */}
        <Card>
          <CardHeader
            title="Forecast vs Budget"
            subtitle="Current period comparison"
          />
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Budget:</span>
                <span className="font-semibold text-gray-900">$2.4M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Forecast:</span>
                <span className="font-semibold text-gray-900">$2.3M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Variance:</span>
                <span className="font-semibold text-emerald-600">-4.2%</span>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">By Project Type</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Billable</span>
                    <span className="text-gray-900">-2.1%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Non-Billable</span>
                    <span className="text-gray-900">-8.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Review Queue"
            description="Process pending forecasts"
            icon={<ReviewIcon className="w-8 h-8" />}
            color="text-amber-600"
            onClick={() => navigate('/forecast/review')}
          />
          <QuickActionCard
            title="Import Actuals"
            description="Upload ERP data"
            icon={<ImportIcon className="w-8 h-8" />}
            color="text-blue-600"
            onClick={() => navigate('/forecast/import-export')}
          />
          <QuickActionCard
            title="View Analytics"
            description="Forecast reports & charts"
            icon={<ChartIcon className="w-8 h-8" />}
            color="text-purple-600"
            onClick={() => navigate('/forecast/analytics')}
          />
          <QuickActionCard
            title="Manage Budgets"
            description="Update project budgets"
            icon={<DollarIcon className="w-8 h-8" />}
            color="text-emerald-600"
            onClick={() => navigate('/forecast/budgets')}
          />
        </div>
      </div>
    </div>
  );
}

// Executive / P&L Lead Dashboard Component
function ExecutiveDashboard({ stats, isLoading, navigate, forecastRole }: DashboardProps) {
  const isPlLead = forecastRole === 'pl_lead';

  // Mock projects awaiting approval
  const pendingApprovals = [
    { name: 'Project Alpha', value: '$245K', status: 'reviewed' },
    { name: 'Project Beta', value: '$180K', status: 'reviewed' },
    { name: 'Project Gamma', value: '$320K', status: 'reviewed' },
  ];

  // Mock health by division
  const divisionHealth = [
    { name: 'Engineering', percent: 85, status: 'good' },
    { name: 'Consulting', percent: 75, status: 'warning' },
    { name: 'Operations', percent: 90, status: 'good' },
    { name: 'Support', percent: 50, status: 'bad' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isPlLead ? 'P&L Forecast Overview' : 'Executive Forecast Overview'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isPlLead
            ? 'Review and approve forecasts, monitor budget alignment.'
            : 'High-level view of forecast health and completeness.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isPlLead && (
          <StatCard
            title="Pending Approval"
            value={stats.pendingApproval}
            icon={<ApprovalIcon />}
            color="bg-amber-500"
            loading={isLoading}
            onClick={() => navigate('/forecast/approvals')}
          />
        )}
        <StatCard
          title="Approved"
          value={`${stats.approvedPercent}%`}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Hours"
          value={stats.totalForecastHours.toLocaleString()}
          icon={<ClockIcon />}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Budget Variance"
          value={`-${Math.abs(stats.budgetVariance + 0.9)}%`}
          icon={<DollarIcon />}
          color="bg-green-500"
          loading={isLoading}
        />
        {!isPlLead && (
          <StatCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={<ProjectIcon />}
            color="bg-indigo-500"
            loading={isLoading}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals (P&L Lead only) */}
        {isPlLead && (
          <Card>
            <CardHeader
              title="Awaiting Your Approval"
              subtitle="Finance-reviewed forecasts"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/forecast/approvals')}
                  className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  View All
                </button>
              }
            />
            <CardBody>
              <div className="space-y-3">
                {pendingApprovals.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.value} (Finance Reviewed)</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 rounded"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Forecast Health by Division */}
        <Card className={!isPlLead ? 'lg:col-span-2' : ''}>
          <CardHeader
            title="Forecast Health by Division"
            subtitle="Completeness and status"
          />
          <CardBody>
            <div className="space-y-4">
              {divisionHealth.map((division) => (
                <div key={division.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{division.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{division.percent}%</span>
                      {division.status === 'good' && <CheckCircleIcon className="w-4 h-4 text-emerald-500" />}
                      {division.status === 'warning' && <WarningIcon className="w-4 h-4 text-amber-500" />}
                      {division.status === 'bad' && <XCircleIcon className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        division.status === 'good'
                          ? 'bg-emerald-500'
                          : division.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${division.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Forecast vs Actuals Chart Placeholder */}
        {!isPlLead && (
          <Card>
            <CardHeader
              title="Forecast vs Actuals"
              subtitle="Rolling 6 months"
            />
            <CardBody>
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <ChartIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Chart coming soon</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isPlLead && (
            <QuickActionCard
              title="Review Approvals"
              description="Process pending forecasts"
              icon={<ApprovalIcon className="w-8 h-8" />}
              color="text-amber-600"
              onClick={() => navigate('/forecast/approvals')}
            />
          )}
          <QuickActionCard
            title="View Analytics"
            description="Forecast reports & charts"
            icon={<ChartIcon className="w-8 h-8" />}
            color="text-purple-600"
            onClick={() => navigate('/forecast/analytics')}
          />
          <QuickActionCard
            title="Browse Projects"
            description="View all forecast projects"
            icon={<ProjectIcon className="w-8 h-8" />}
            color="text-blue-600"
            onClick={() => navigate('/forecast/projects')}
          />
          <QuickActionCard
            title="Export Data"
            description="Download forecast data"
            icon={<ExportIcon className="w-8 h-8" />}
            color="text-emerald-600"
            onClick={() => navigate('/forecast/import-export')}
          />
        </div>
      </div>
    </div>
  );
}

// Shared Components

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, loading, onClick }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
        </div>
        <div className={`${color} rounded-lg p-2`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function QuickActionCard({ title, description, icon, color, onClick }: QuickActionCardProps) {
  return (
    <Card hover onClick={onClick}>
      <CardBody className="text-center py-6">
        <div className={`mx-auto mb-3 ${color}`}>{icon}</div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-800',
    submitted: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-purple-100 text-purple-800',
    draft: 'bg-gray-100 text-gray-800',
    revision: 'bg-amber-100 text-amber-800',
  };

  const labels: Record<string, string> = {
    approved: 'Approved',
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    draft: 'Draft',
    revision: 'Revision',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

// Icons
function ProjectIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function SubmittedIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReviewIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function ChartIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DollarIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ApprovalIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function EditIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function VersionIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ImportIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  );
}

function ExportIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

export default ForecastDashboardPage;

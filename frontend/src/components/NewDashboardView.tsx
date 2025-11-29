import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from './ui';
import { useAssignments } from '../hooks/useAssignments';
// import { useAuthStore } from '../stores/authStore';
import { useDashboard } from '../hooks/useDashboard';
import { AssignmentStatus } from '../types/api';
import { Calendar, Users, Briefcase, FileText, CheckCircle, Clock, Building2, Home, MapPin, AlertCircle } from 'lucide-react';

interface NewDashboardViewProps {
  userId: string;
  displayName: string;
}

export function NewDashboardView({ userId, displayName }: NewDashboardViewProps) {
  const navigate = useNavigate();
  // const { currentWorkspace } = useAuthStore();

  // Get date range for this week
  const dateRange = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
    };
  }, []);

  // Fetch data for dashboard
  const { data: dashboardData } = useDashboard(userId, dateRange.startDate, dateRange.endDate);
  const { data: assignments = [] } = useAssignments({ userId });

  // Calculate stats
  const stats = useMemo(() => {
    const activeAssignments = assignments.filter(a => a.status === AssignmentStatus.Active).length;
    const pendingApprovals = assignments.filter(a => a.status === AssignmentStatus.PendingApproval).length;
    const totalAllocation = assignments
      .filter(a => a.status === AssignmentStatus.Active)
      .reduce((sum, a) => sum + (a.allocation || 0), 0);

    return {
      activeAssignments,
      pendingApprovals,
      totalAllocation,
      remoteDays: dashboardData?.stats.remoteDays ?? 0,
      officeDays: dashboardData?.stats.officeDays ?? 0,
      ptoDays: 0,
      notSetDays: dashboardData?.stats.notSet ?? 0,
    };
  }, [assignments, dashboardData]);

  // Quick action tiles
  const quickActions = [
    {
      title: 'Log PTO',
      description: 'Request time off',
      icon: Clock,
      color: 'bg-amber-500',
      hoverColor: 'hover:bg-amber-50',
      borderColor: 'border-amber-200',
      onClick: () => navigate('/schedule'),
    },
    {
      title: 'Book a Room',
      description: 'Reserve a desk or meeting room',
      icon: Building2,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-50',
      borderColor: 'border-blue-200',
      onClick: () => navigate('/hoteling'),
    },
    {
      title: 'Update Resume',
      description: 'Keep your skills current',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-50',
      borderColor: 'border-purple-200',
      onClick: () => navigate('/resumes'),
    },
    {
      title: 'Create DOA',
      description: 'Set up delegation of authority',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-50',
      borderColor: 'border-green-200',
      onClick: () => navigate('/doa'),
    },
    {
      title: 'Update Assignments',
      description: 'Manage project staffing',
      icon: Briefcase,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-50',
      borderColor: 'border-indigo-200',
      onClick: () => navigate('/staffing'),
    },
    {
      title: 'View Schedule',
      description: 'Plan work locations',
      icon: Calendar,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-50',
      borderColor: 'border-teal-200',
      onClick: () => navigate('/schedule'),
    },
  ];

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {displayName}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Here's your personal dashboard summary
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className={`p-4 rounded-lg border ${action.borderColor} ${action.hoverColor} bg-white transition-all hover:shadow-md text-left`}
            >
              <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{action.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* This Week's Schedule */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">This Week's Schedule</h3>
              <button
                onClick={() => navigate('/schedule')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View Full Schedule
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Home className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <div className="text-2xl font-bold text-blue-600">{stats.remoteDays}</div>
                <div className="text-xs text-gray-600">Remote</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <Building2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <div className="text-2xl font-bold text-green-600">{stats.officeDays}</div>
                <div className="text-xs text-gray-600">Office</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                <div className="text-2xl font-bold text-amber-600">{stats.ptoDays}</div>
                <div className="text-xs text-gray-600">PTO</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <AlertCircle className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                <div className="text-2xl font-bold text-gray-500">{stats.notSetDays}</div>
                <div className="text-xs text-gray-600">Not Set</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Staffing Overview */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Staffing Overview</h3>
              <button
                onClick={() => navigate('/staffing')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View Assignments
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <CheckCircle className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
                <div className="text-2xl font-bold text-indigo-600">{stats.activeAssignments}</div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                <div className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <Briefcase className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <div className="text-2xl font-bold text-purple-600">{stats.totalAllocation}%</div>
                <div className="text-xs text-gray-600">Utilization</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover onClick={() => navigate('/schedule')}>
          <CardBody className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-teal-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">mySchedule</h3>
            <p className="text-sm text-gray-600 mt-1">Plan work locations</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => navigate('/staffing')}>
          <CardBody className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Staffing</h3>
            <p className="text-sm text-gray-600 mt-1">Project assignments</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => navigate('/hoteling')}>
          <CardBody className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-blue-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Hoteling</h3>
            <p className="text-sm text-gray-600 mt-1">Book desks & rooms</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => navigate('/resumes')}>
          <CardBody className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Resumes</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your resume</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

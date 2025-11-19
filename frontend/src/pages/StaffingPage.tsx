import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { useAssignments } from '../hooks/useAssignments';
import { Assignment, AssignmentStatus } from '../types/api';

export function StaffingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'assignments' | 'capacity' | 'requests'>('assignments');

  const { data: assignments = [], isLoading, error } = useAssignments();

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

  const getStatusVariant = (status: AssignmentStatus): 'success' | 'warning' | 'default' | 'danger' => {
    switch (status) {
      case AssignmentStatus.Active:
        return 'success';
      case AssignmentStatus.PendingApproval:
      case AssignmentStatus.Draft:
        return 'warning';
      case AssignmentStatus.Cancelled:
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'personId',
      header: 'Person ID',
      render: (assignment: Assignment) => (
        <div className="font-medium text-gray-900 text-sm">{assignment.personId.substring(0, 8)}...</div>
      )
    },
    {
      key: 'projectRoleId',
      header: 'Role ID',
      render: (assignment: Assignment) => (
        <div className="text-sm">{assignment.projectRoleId.substring(0, 8)}...</div>
      )
    },
    {
      key: 'allocation',
      header: 'Allocation',
      align: 'center' as const,
      render: (assignment: Assignment) => (
        <div>
          <div className="font-medium">{assignment.allocation}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${assignment.allocation}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (assignment: Assignment) => (
        <div className="text-sm">
          <div>{new Date(assignment.startDate).toLocaleDateString()}</div>
          <div className="text-gray-500">to {new Date(assignment.endDate).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (assignment: Assignment) => (
        <StatusBadge
          status={getStatusLabel(assignment.status)}
          variant={getStatusVariant(assignment.status)}
        />
      )
    }
  ];

  const filteredAssignments = assignments.filter(assignment =>
    assignment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.personId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter(a => a.status === AssignmentStatus.Active).length;
    const pending = assignments.filter(a => a.status === AssignmentStatus.PendingApproval).length;
    const avgAllocation = assignments.length > 0
      ? Math.round(assignments.reduce((sum, a) => sum + a.allocation, 0) / assignments.length)
      : 0;

    return { total, active, pending, avgAllocation };
  }, [assignments]);

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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Staffing</h1>
        <p className="text-gray-600 mt-2">
          Manage assignments, capacity, and staffing requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Assignments</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 mt-1">Pending Approval</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.avgAllocation}%</div>
            <div className="text-sm text-gray-600 mt-1">Avg Utilization</div>
          </div>
        </Card>
      </div>

      {/* View Selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'assignments' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('assignments')}
              >
                Assignments
              </Button>
              <Button
                variant={selectedView === 'capacity' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('capacity')}
              >
                Capacity View
              </Button>
              <Button
                variant={selectedView === 'requests' ? 'primary' : 'ghost'}
                onClick={() => setSelectedView('requests')}
              >
                Requests
              </Button>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="primary">
              + New Assignment
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Assignments Table */}
      {selectedView === 'assignments' && (
        <Card>
          <CardHeader
            title="All Assignments"
            subtitle={`${filteredAssignments.length} ${filteredAssignments.length === 1 ? 'assignment' : 'assignments'}`}
          />
          <Table
            data={filteredAssignments}
            columns={columns}
            onRowClick={(assignment) => console.log('View assignment:', assignment.id)}
            emptyMessage={isLoading ? "Loading assignments..." : "No assignments found"}
          />
        </Card>
      )}

      {/* Capacity View */}
      {selectedView === 'capacity' && (
        <Card>
          <CardHeader title="Capacity Overview" subtitle="Team capacity and utilization" />
          <CardBody className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">Capacity View</p>
            <p className="text-sm mt-2">Visual capacity timeline and allocation charts will appear here</p>
          </CardBody>
        </Card>
      )}

      {/* Requests */}
      {selectedView === 'requests' && (
        <Card>
          <CardHeader title="Staffing Requests" subtitle="Pending approval and assignments" />
          <CardBody className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">Staffing Requests</p>
            <p className="text-sm mt-2">Showing {assignments.filter(a => a.status === AssignmentStatus.PendingApproval).length} pending requests</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

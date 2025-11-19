import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';

interface Assignment {
  id: string;
  personName: string;
  projectName: string;
  roleName: string;
  allocation: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Cancelled';
}

export function StaffingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'assignments' | 'capacity' | 'requests'>('assignments');

  // Mock data
  const mockAssignments: Assignment[] = [
    {
      id: '1',
      personName: 'John Smith',
      projectName: 'ERP Implementation',
      roleName: 'Senior Developer',
      allocation: 100,
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      status: 'Active'
    },
    {
      id: '2',
      personName: 'Sarah Johnson',
      projectName: 'Cloud Migration',
      roleName: 'Project Manager',
      allocation: 75,
      startDate: '2024-03-01',
      endDate: '2024-12-31',
      status: 'Active'
    },
    {
      id: '3',
      personName: 'Michael Chen',
      projectName: 'Data Analytics Platform',
      roleName: 'Data Analyst',
      allocation: 50,
      startDate: '2024-06-01',
      endDate: '2024-11-30',
      status: 'Pending'
    }
  ];

  const columns = [
    {
      key: 'personName',
      header: 'Person',
      render: (assignment: Assignment) => (
        <div className="font-medium text-gray-900">{assignment.personName}</div>
      )
    },
    {
      key: 'projectName',
      header: 'Project'
    },
    {
      key: 'roleName',
      header: 'Role'
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
          status={assignment.status}
          variant={
            assignment.status === 'Active' ? 'success' :
            assignment.status === 'Pending' ? 'warning' :
            assignment.status === 'Completed' ? 'default' :
            'danger'
          }
        />
      )
    }
  ];

  const filteredAssignments = mockAssignments.filter(assignment =>
    assignment.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="text-3xl font-bold text-blue-600">{mockAssignments.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Assignments</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {mockAssignments.filter(a => a.status === 'Active').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {mockAssignments.filter(a => a.status === 'Pending').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Pending Approval</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {Math.round(mockAssignments.reduce((sum, a) => sum + a.allocation, 0) / mockAssignments.length)}%
            </div>
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
            subtitle={`${filteredAssignments.length} active ${filteredAssignments.length === 1 ? 'assignment' : 'assignments'}`}
          />
          <Table
            data={filteredAssignments}
            columns={columns}
            onRowClick={(assignment) => console.log('View assignment:', assignment.id)}
            emptyMessage="No assignments found"
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
            <p className="text-lg font-medium">No Pending Requests</p>
            <p className="text-sm mt-2">Staffing requests awaiting approval will appear here</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

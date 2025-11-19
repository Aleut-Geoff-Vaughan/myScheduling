import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { useAssignments } from '../hooks/useAssignments';
import type { Assignment } from '../types/api';
import { AssignmentStatus } from '../types/api';
import { AssignmentModal } from '../components/AssignmentModal';

export function StaffingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'assignments' | 'capacity' | 'requests'>('assignments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | undefined>();

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
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
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
            onRowClick={(assignment) => {
              setSelectedAssignment(assignment);
              setIsModalOpen(true);
            }}
            emptyMessage={isLoading ? "Loading assignments..." : "No assignments found"}
          />
        </Card>
      )}

      {/* Capacity View */}
      {selectedView === 'capacity' && (
        <div className="space-y-6">
          {/* Capacity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation < 80).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Under Allocated</div>
                <div className="text-xs text-gray-500 mt-1">&lt;80% capacity</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation >= 80 && a.allocation <= 100).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Optimally Allocated</div>
                <div className="text-xs text-gray-500 mt-1">80-100% capacity</div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {assignments.filter(a => a.status === AssignmentStatus.Active && a.allocation > 100).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Over Allocated</div>
                <div className="text-xs text-gray-500 mt-1">&gt;100% capacity</div>
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
              {/* Group assignments by person */}
              {(() => {
                // Group active assignments by personId
                const personMap = new Map<string, Assignment[]>();
                assignments
                  .filter(a => a.status === AssignmentStatus.Active)
                  .forEach(assignment => {
                    const existing = personMap.get(assignment.personId) || [];
                    personMap.set(assignment.personId, [...existing, assignment]);
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
                    {personEntries.slice(0, 10).map(([personId, personAssignments]) => {
                      const totalAllocation = personAssignments.reduce((sum, a) => sum + a.allocation, 0);
                      const isOverAllocated = totalAllocation > 100;
                      const isUnderAllocated = totalAllocation < 80;

                      return (
                        <div key={personId} className="border-b pb-4 last:border-b-0">
                          {/* Person Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-gray-900">
                                Person {personId.substring(0, 8)}...
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
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setIsModalOpen(true);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">
                                    {assignment.allocation}%
                                  </div>
                                  <div className="text-gray-600">
                                    Role: {assignment.projectRoleId.substring(0, 8)}...
                                  </div>
                                </div>
                                <div className="text-gray-500">
                                  {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
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

      {/* Requests */}
      {selectedView === 'requests' && (
        <Card>
          <CardHeader
            title="Staffing Requests"
            subtitle={`${assignments.filter(a => a.status === AssignmentStatus.PendingApproval || a.status === AssignmentStatus.Draft).length} pending requests`}
          />
          <Table
            data={assignments.filter(a => a.status === AssignmentStatus.PendingApproval || a.status === AssignmentStatus.Draft)}
            columns={[
              ...columns,
              {
                key: 'actions',
                header: 'Actions',
                render: (assignment: Assignment) => (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Approve assignment:', assignment.id);
                      }}
                      disabled={assignment.status !== AssignmentStatus.PendingApproval}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Reject assignment:', assignment.id);
                      }}
                      disabled={assignment.status !== AssignmentStatus.PendingApproval}
                    >
                      Reject
                    </Button>
                  </div>
                )
              }
            ]}
            onRowClick={(assignment) => {
              setSelectedAssignment(assignment);
              setIsModalOpen(true);
            }}
            emptyMessage={isLoading ? "Loading requests..." : "No pending requests"}
          />
        </Card>
      )}

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAssignment(undefined);
        }}
        assignment={selectedAssignment}
        mode={selectedAssignment ? 'edit' : 'create'}
      />
    </div>
  );
}

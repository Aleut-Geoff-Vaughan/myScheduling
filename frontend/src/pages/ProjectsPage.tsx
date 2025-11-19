import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';

interface Project {
  id: string;
  name: string;
  programCode: string;
  customer: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Planned' | 'Completed' | 'On Hold';
  assignedStaff: number;
}

export function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock data
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Enterprise Resource Planning Implementation',
      programCode: 'ERP-2024-001',
      customer: 'Department of Defense',
      startDate: '2024-01-15',
      endDate: '2024-12-31',
      status: 'Active',
      assignedStaff: 12
    },
    {
      id: '2',
      name: 'Cloud Migration Initiative',
      programCode: 'CLOUD-2024-002',
      customer: 'Department of Energy',
      startDate: '2024-03-01',
      endDate: '2025-02-28',
      status: 'Active',
      assignedStaff: 8
    },
    {
      id: '3',
      name: 'Data Analytics Platform',
      programCode: 'DATA-2024-003',
      customer: 'Department of Commerce',
      startDate: '2024-06-01',
      endDate: '2024-11-30',
      status: 'Planned',
      assignedStaff: 0
    }
  ];

  const columns = [
    {
      key: 'name',
      header: 'Project Name',
      render: (project: Project) => (
        <div>
          <div className="font-medium text-gray-900">{project.name}</div>
          <div className="text-sm text-gray-500">{project.programCode}</div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer'
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (project: Project) => (
        <div className="text-sm">
          <div>{new Date(project.startDate).toLocaleDateString()}</div>
          <div className="text-gray-500">to {new Date(project.endDate).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'assignedStaff',
      header: 'Staff',
      align: 'center' as const,
      render: (project: Project) => (
        <span className="font-medium">{project.assignedStaff}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (project: Project) => (
        <StatusBadge
          status={project.status}
          variant={
            project.status === 'Active' ? 'success' :
            project.status === 'Planned' ? 'info' :
            project.status === 'Completed' ? 'default' :
            'warning'
          }
        />
      )
    }
  ];

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.programCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || project.status.toLowerCase() === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 mt-2">
          Manage projects, WBS elements, and project assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{mockProjects.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Projects</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {mockProjects.filter(p => p.status === 'Active').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {mockProjects.reduce((sum, p) => sum + p.assignedStaff, 0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Staff</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {mockProjects.filter(p => p.status === 'Planned').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Planned</div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter('all')}
              >
                All
              </Button>
              <Button
                variant={selectedFilter === 'active' ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={selectedFilter === 'planned' ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter('planned')}
              >
                Planned
              </Button>
            </div>
            <Button variant="primary">
              + New Project
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader
          title="All Projects"
          subtitle={`${filteredProjects.length} ${filteredProjects.length === 1 ? 'project' : 'projects'}`}
        />
        <Table
          data={filteredProjects}
          columns={columns}
          onRowClick={(project) => console.log('Navigate to project:', project.id)}
          emptyMessage="No projects found"
        />
      </Card>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { useProjects } from '../hooks/useProjects';
import { Project, ProjectStatus } from '../types/api';

export function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ProjectStatus>('all');

  const { data: projects = [], isLoading, error } = useProjects({
    search: searchTerm || undefined,
    status: selectedFilter !== 'all' ? selectedFilter : undefined,
  });

  const getStatusLabel = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.Draft:
        return 'Draft';
      case ProjectStatus.Active:
        return 'Active';
      case ProjectStatus.Closed:
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: ProjectStatus): 'success' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case ProjectStatus.Active:
        return 'success';
      case ProjectStatus.Draft:
        return 'info';
      case ProjectStatus.Closed:
        return 'default';
      default:
        return 'warning';
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Project Name',
      render: (project: Project) => (
        <div>
          <div className="font-medium text-gray-900">{project.name}</div>
          <div className="text-sm text-gray-500">{project.programCode || '—'}</div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (project: Project) => project.customer || '—',
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (project: Project) => (
        <div className="text-sm">
          <div>{new Date(project.startDate).toLocaleDateString()}</div>
          {project.endDate && (
            <div className="text-gray-500">to {new Date(project.endDate).toLocaleDateString()}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (project: Project) => (
        <StatusBadge
          status={getStatusLabel(project.status)}
          variant={getStatusVariant(project.status)}
        />
      )
    }
  ];

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === ProjectStatus.Active).length;
    const draft = projects.filter(p => p.status === ProjectStatus.Draft).length;
    const closed = projects.filter(p => p.status === ProjectStatus.Closed).length;

    return { total, active, draft, closed };
  }, [projects]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Projects</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 mt-2">
          Manage projects, WBS elements, and project assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Projects</div>
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
            <div className="text-3xl font-bold text-purple-600">{stats.draft}</div>
            <div className="text-sm text-gray-600 mt-1">Draft</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-sm text-gray-600 mt-1">Closed</div>
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
                variant={selectedFilter === ProjectStatus.Active ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter(ProjectStatus.Active)}
              >
                Active
              </Button>
              <Button
                variant={selectedFilter === ProjectStatus.Draft ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter(ProjectStatus.Draft)}
              >
                Draft
              </Button>
              <Button
                variant={selectedFilter === ProjectStatus.Closed ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter(ProjectStatus.Closed)}
              >
                Closed
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
          subtitle={`${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
        />
        <Table
          data={projects}
          columns={columns}
          onRowClick={(project) => console.log('Navigate to project:', project.id)}
          emptyMessage={isLoading ? "Loading projects..." : "No projects found"}
        />
      </Card>
    </div>
  );
}

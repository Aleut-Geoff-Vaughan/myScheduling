import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { usePeople } from '../hooks/usePeople';
import type { Person } from '../types/api';
import { PersonStatus } from '../types/api';
import { PersonModal } from '../components/PersonModal';

export function PeoplePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | PersonStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | undefined>();

  const { data: people = [], isLoading, error } = usePeople({
    search: searchTerm || undefined,
    status: selectedFilter !== 'all' ? selectedFilter : undefined,
  });

  const getStatusLabel = (status: PersonStatus): string => {
    switch (status) {
      case PersonStatus.Active:
        return 'Active';
      case PersonStatus.Inactive:
        return 'Inactive';
      case PersonStatus.OnLeave:
        return 'On Leave';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: PersonStatus): 'success' | 'warning' | 'default' => {
    switch (status) {
      case PersonStatus.Active:
        return 'success';
      case PersonStatus.OnLeave:
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'displayName',
      header: 'Name',
      render: (person: Person) => (
        <div>
          <div className="font-medium text-gray-900">{person.displayName}</div>
          <div className="text-sm text-gray-500">{person.email}</div>
        </div>
      )
    },
    {
      key: 'jobTitle',
      header: 'Job Title',
      render: (person: Person) => person.jobTitle || '—',
    },
    {
      key: 'laborCategory',
      header: 'Labor Category',
      render: (person: Person) => person.laborCategory || '—',
    },
    {
      key: 'location',
      header: 'Location',
      render: (person: Person) => person.location || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (person: Person) => (
        <StatusBadge
          status={getStatusLabel(person.status)}
          variant={getStatusVariant(person.status)}
        />
      )
    }
  ];

  const stats = useMemo(() => {
    const total = people.length;
    const active = people.filter(p => p.status === PersonStatus.Active).length;
    const onLeave = people.filter(p => p.status === PersonStatus.OnLeave).length;
    const inactive = people.filter(p => p.status === PersonStatus.Inactive).length;

    return { total, active, onLeave, inactive };
  }, [people]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading People</div>
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
        <h1 className="text-3xl font-bold text-gray-900">People</h1>
        <p className="text-gray-600 mt-2">
          Manage employees, contractors, and their profiles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {isLoading ? '...' : stats.total}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total People</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? '...' : stats.active}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {isLoading ? '...' : stats.onLeave}
            </div>
            <div className="text-sm text-gray-600 mt-1">On Leave</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {isLoading ? '...' : stats.inactive}
            </div>
            <div className="text-sm text-gray-600 mt-1">Inactive</div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
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
                variant={selectedFilter === PersonStatus.Active ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter(PersonStatus.Active)}
              >
                Active
              </Button>
              <Button
                variant={selectedFilter === PersonStatus.OnLeave ? 'primary' : 'ghost'}
                onClick={() => setSelectedFilter(PersonStatus.OnLeave)}
              >
                On Leave
              </Button>
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              + Add Person
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* People Table */}
      <Card>
        <CardHeader
          title="All People"
          subtitle={
            isLoading
              ? 'Loading...'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'} found`
          }
        />
        <Table
          data={people}
          columns={columns}
          onRowClick={(person) => {
            setSelectedPerson(person);
            setIsModalOpen(true);
          }}
          emptyMessage={
            isLoading
              ? 'Loading people...'
              : 'No people found matching your search'
          }
        />
      </Card>

      {/* Person Modal */}
      <PersonModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPerson(undefined);
        }}
        person={selectedPerson}
        mode={selectedPerson ? 'edit' : 'create'}
      />
    </div>
  );
}

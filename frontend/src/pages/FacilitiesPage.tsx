import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input } from '../components/ui';
import { facilitiesService } from '../services/facilitiesService';
import type { Space, FacilityPermission, SpaceMaintenanceLog, Office } from '../types/api';
import { SpaceType, FacilityAccessLevel, MaintenanceStatus, MaintenanceType } from '../types/api';
import { bookingsService } from '../services/bookingsService';

type TabType = 'spaces' | 'permissions' | 'maintenance';

export function FacilitiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('spaces');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | SpaceType>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch offices for filter dropdown
  const { data: offices = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => bookingsService.getOffices(),
  });

  // Fetch spaces
  const { data: spaces = [], isLoading: spacesLoading } = useQuery({
    queryKey: ['facilities-spaces', selectedOfficeFilter, selectedTypeFilter, selectedStatusFilter],
    queryFn: () => facilitiesService.getSpaces({
      officeId: selectedOfficeFilter !== 'all' ? selectedOfficeFilter : undefined,
      type: selectedTypeFilter !== 'all' ? selectedTypeFilter : undefined,
      isActive: selectedStatusFilter === 'active' ? true : selectedStatusFilter === 'inactive' ? false : undefined,
    }),
  });

  // Fetch permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['facilities-permissions'],
    queryFn: () => facilitiesService.getPermissions(),
    enabled: activeTab === 'permissions',
  });

  // Fetch maintenance logs
  const { data: maintenanceLogs = [], isLoading: maintenanceLoading } = useQuery({
    queryKey: ['facilities-maintenance'],
    queryFn: () => facilitiesService.getMaintenanceLogs(),
    enabled: activeTab === 'maintenance',
  });

  // Filter spaces by search term
  const filteredSpaces = useMemo(() => {
    if (!searchTerm) return spaces;

    const term = searchTerm.toLowerCase();
    return spaces.filter(space =>
      space.name.toLowerCase().includes(term) ||
      getSpaceTypeLabel(space.type).toLowerCase().includes(term)
    );
  }, [spaces, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalSpaces: spaces.length,
      activeSpaces: spaces.filter(s => s.isActive).length,
      inactiveSpaces: spaces.filter(s => !s.isActive).length,
      requiresApproval: spaces.filter(s => s.requiresApproval).length,
      pendingMaintenance: maintenanceLogs.filter(m => m.status === MaintenanceStatus.Reported || m.status === MaintenanceStatus.Scheduled).length,
    };
  }, [spaces, maintenanceLogs]);

  // Helper functions
  const getSpaceTypeLabel = (type: SpaceType): string => {
    const labels: Record<SpaceType, string> = {
      [SpaceType.Desk]: 'Desk',
      [SpaceType.HotDesk]: 'Hot Desk',
      [SpaceType.Office]: 'Office',
      [SpaceType.Cubicle]: 'Cubicle',
      [SpaceType.Room]: 'Room',
      [SpaceType.ConferenceRoom]: 'Conference Room',
      [SpaceType.HuddleRoom]: 'Huddle Room',
      [SpaceType.PhoneBooth]: 'Phone Booth',
      [SpaceType.TrainingRoom]: 'Training Room',
      [SpaceType.BreakRoom]: 'Break Room',
      [SpaceType.ParkingSpot]: 'Parking Spot',
    };
    return labels[type] || 'Unknown';
  };

  const getAccessLevelLabel = (level: FacilityAccessLevel): string => {
    const labels: Record<FacilityAccessLevel, string> = {
      [FacilityAccessLevel.View]: 'View',
      [FacilityAccessLevel.Book]: 'Book',
      [FacilityAccessLevel.Manage]: 'Manage',
      [FacilityAccessLevel.Configure]: 'Configure',
      [FacilityAccessLevel.FullAdmin]: 'Full Admin',
    };
    return labels[level] || 'Unknown';
  };

  const getMaintenanceStatusLabel = (status: MaintenanceStatus): string => {
    const labels: Record<MaintenanceStatus, string> = {
      [MaintenanceStatus.Reported]: 'Reported',
      [MaintenanceStatus.Scheduled]: 'Scheduled',
      [MaintenanceStatus.InProgress]: 'In Progress',
      [MaintenanceStatus.Completed]: 'Completed',
      [MaintenanceStatus.Cancelled]: 'Cancelled',
    };
    return labels[status] || 'Unknown';
  };

  const getMaintenanceStatusVariant = (status: MaintenanceStatus): 'success' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case MaintenanceStatus.Completed:
        return 'success';
      case MaintenanceStatus.InProgress:
        return 'warning';
      case MaintenanceStatus.Reported:
      case MaintenanceStatus.Scheduled:
        return 'info';
      default:
        return 'default';
    }
  };

  const getMaintenanceTypeLabel = (type: MaintenanceType): string => {
    const labels: Record<MaintenanceType, string> = {
      [MaintenanceType.Routine]: 'Routine',
      [MaintenanceType.Repair]: 'Repair',
      [MaintenanceType.Inspection]: 'Inspection',
      [MaintenanceType.Cleaning]: 'Cleaning',
      [MaintenanceType.EquipmentIssue]: 'Equipment Issue',
      [MaintenanceType.SafetyConcern]: 'Safety Concern',
    };
    return labels[type] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facilities Management</h1>
          <p className="text-gray-600">Manage spaces, permissions, and maintenance</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            // TODO: Open create modal based on active tab
            console.log('Create new', activeTab);
          }}
        >
          + {activeTab === 'spaces' ? 'Add Space' : activeTab === 'permissions' ? 'Grant Permission' : 'Report Maintenance'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">Total Spaces</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalSpaces}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.activeSpaces}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-500">{stats.inactiveSpaces}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">Requires Approval</div>
            <div className="text-2xl font-bold text-blue-600">{stats.requiresApproval}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600">Pending Maintenance</div>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingMaintenance}</div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('spaces')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'spaces'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Spaces
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Permissions
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'maintenance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maintenance
            </button>
          </div>
        </CardHeader>

        <CardBody>
          {/* Spaces Tab */}
          {activeTab === 'spaces' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Input
                    type="text"
                    placeholder="Search spaces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={selectedOfficeFilter}
                  onChange={(e) => setSelectedOfficeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Offices</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value={SpaceType.Desk}>Desk</option>
                  <option value={SpaceType.HotDesk}>Hot Desk</option>
                  <option value={SpaceType.Office}>Office</option>
                  <option value={SpaceType.Cubicle}>Cubicle</option>
                  <option value={SpaceType.ConferenceRoom}>Conference Room</option>
                  <option value={SpaceType.HuddleRoom}>Huddle Room</option>
                  <option value={SpaceType.PhoneBooth}>Phone Booth</option>
                  <option value={SpaceType.TrainingRoom}>Training Room</option>
                  <option value={SpaceType.BreakRoom}>Break Room</option>
                  <option value={SpaceType.ParkingSpot}>Parking Spot</option>
                </select>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Spaces Table */}
              {spacesLoading ? (
                <div className="text-center py-8 text-gray-600">Loading spaces...</div>
              ) : filteredSpaces.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No spaces found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { key: 'name', label: 'Name', className: 'font-medium' },
                      { key: 'type', label: 'Type' },
                      { key: 'office', label: 'Office' },
                      { key: 'capacity', label: 'Capacity', className: 'text-center' },
                      { key: 'status', label: 'Status' },
                      { key: 'approval', label: 'Approval Required' },
                      { key: 'dailyCost', label: 'Daily Cost' },
                      { key: 'actions', label: '', className: 'text-right' },
                    ]}
                    data={filteredSpaces.map((space) => ({
                      key: space.id,
                      name: space.name,
                      type: getSpaceTypeLabel(space.type),
                      office: offices.find(o => o.id === space.officeId)?.name || 'Unknown',
                      capacity: space.capacity.toString(),
                      status: (
                        <StatusBadge variant={space.isActive ? 'success' : 'default'}>
                          {space.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      ),
                      approval: space.requiresApproval ? 'Yes' : 'No',
                      dailyCost: space.dailyCost ? `$${space.dailyCost.toFixed(2)}` : '-',
                      actions: (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => console.log('Edit space', space.id)}
                        >
                          Edit
                        </Button>
                      ),
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {permissionsLoading ? (
                <div className="text-center py-8 text-gray-600">Loading permissions...</div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No permissions configured</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { key: 'user', label: 'User/Role' },
                      { key: 'accessLevel', label: 'Access Level' },
                      { key: 'scope', label: 'Scope' },
                      { key: 'actions', label: '', className: 'text-right' },
                    ]}
                    data={permissions.map((permission) => ({
                      key: permission.id,
                      user: permission.user?.displayName || permission.role?.toString() || 'Unknown',
                      accessLevel: (
                        <StatusBadge variant="info">
                          {getAccessLevelLabel(permission.accessLevel)}
                        </StatusBadge>
                      ),
                      scope: permission.space ? `Space: ${permission.space.name}` : permission.office ? `Office: ${permission.office.name}` : 'Global',
                      actions: (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => console.log('Revoke permission', permission.id)}
                        >
                          Revoke
                        </Button>
                      ),
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              {maintenanceLoading ? (
                <div className="text-center py-8 text-gray-600">Loading maintenance logs...</div>
              ) : maintenanceLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No maintenance logs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { key: 'space', label: 'Space' },
                      { key: 'type', label: 'Type' },
                      { key: 'status', label: 'Status' },
                      { key: 'scheduled', label: 'Scheduled Date' },
                      { key: 'reportedBy', label: 'Reported By' },
                      { key: 'assignedTo', label: 'Assigned To' },
                      { key: 'cost', label: 'Cost' },
                      { key: 'actions', label: '', className: 'text-right' },
                    ]}
                    data={maintenanceLogs.map((log) => ({
                      key: log.id,
                      space: log.space?.name || 'Unknown',
                      type: getMaintenanceTypeLabel(log.type),
                      status: (
                        <StatusBadge variant={getMaintenanceStatusVariant(log.status)}>
                          {getMaintenanceStatusLabel(log.status)}
                        </StatusBadge>
                      ),
                      scheduled: new Date(log.scheduledDate).toLocaleDateString(),
                      reportedBy: log.reportedBy?.displayName || 'Unknown',
                      assignedTo: log.assignedTo?.displayName || 'Unassigned',
                      cost: log.cost ? `$${log.cost.toFixed(2)}` : '-',
                      actions: (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => console.log('Edit maintenance', log.id)}
                        >
                          Edit
                        </Button>
                      ),
                    }))}
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

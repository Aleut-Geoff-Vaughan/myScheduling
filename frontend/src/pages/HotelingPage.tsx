import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Select } from '../components/ui';
import { useBookings } from '../hooks/useBookings';
import { Booking, BookingStatus } from '../types/api';

export function HotelingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const startDate = selectedDate + 'T00:00:00';
  const endDate = selectedDate + 'T23:59:59';

  const { data: bookings = [], isLoading, error } = useBookings({
    startDate,
    endDate,
  });

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.Reserved:
        return 'Confirmed';
      case BookingStatus.CheckedIn:
        return 'Checked In';
      case BookingStatus.Completed:
        return 'Completed';
      case BookingStatus.Cancelled:
        return 'Cancelled';
      case BookingStatus.NoShow:
        return 'No Show';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: BookingStatus): 'success' | 'warning' | 'default' | 'info' | 'danger' => {
    switch (status) {
      case BookingStatus.CheckedIn:
        return 'success';
      case BookingStatus.Reserved:
        return 'info';
      case BookingStatus.Completed:
        return 'default';
      case BookingStatus.Cancelled:
      case BookingStatus.NoShow:
        return 'danger';
      default:
        return 'warning';
    }
  };

  const columns = [
    {
      key: 'personId',
      header: 'Person ID',
      render: (booking: Booking) => (
        <div className="font-medium text-gray-900 text-sm">{booking.personId.substring(0, 8)}...</div>
      )
    },
    {
      key: 'spaceId',
      header: 'Space ID',
      render: (booking: Booking) => (
        <div className="text-sm">{booking.spaceId.substring(0, 8)}...</div>
      )
    },
    {
      key: 'datetime',
      header: 'Time',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div>{new Date(booking.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-gray-500">to {new Date(booking.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking: Booking) => (
        <StatusBadge
          status={getStatusLabel(booking.status)}
          variant={getStatusVariant(booking.status)}
        />
      )
    }
  ];

  const filteredBookings = bookings.filter(booking =>
    booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.personId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.spaceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(b => b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn).length;
    const checkedIn = bookings.filter(b => b.status === BookingStatus.CheckedIn).length;
    const completed = bookings.filter(b => b.status === BookingStatus.Completed).length;

    return { total, active, checkedIn, completed };
  }, [bookings]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Bookings</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Office Hoteling</h1>
        <p className="text-gray-600 mt-2">
          Book desks, conference rooms, and manage space reservations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Bookings</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600 mt-1">Active Today</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.checkedIn}</div>
            <div className="text-sm text-gray-600 mt-1">Checked In</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{stats.completed}</div>
            <div className="text-sm text-gray-600 mt-1">Completed</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary">
              + New Booking
            </Button>
            <Button variant="secondary">
              View Floor Plan
            </Button>
            <Button variant="ghost">
              Export Schedule
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader
          title={`Bookings for ${new Date(selectedDate).toLocaleDateString()}`}
          subtitle={`${filteredBookings.length} ${filteredBookings.length === 1 ? 'booking' : 'bookings'}`}
        />
        <Table
          data={filteredBookings}
          columns={columns}
          onRowClick={(booking) => console.log('View booking:', booking.id)}
          emptyMessage={isLoading ? "Loading bookings..." : "No bookings found for this date"}
        />
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card hover onClick={() => console.log('Navigate to desk booking')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Desk</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve a workspace</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => console.log('Navigate to room booking')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Room</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve conference room</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => console.log('View my bookings')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-lg">My Bookings</h3>
            <p className="text-sm text-gray-600 mt-1">View your reservations</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

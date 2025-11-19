import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Select } from '../components/ui';

interface Booking {
  id: string;
  personName: string;
  spaceName: string;
  spaceType: 'Desk' | 'Conference Room' | 'Office';
  office: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Confirmed' | 'Pending' | 'Checked In' | 'Completed';
}

export function HotelingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock data
  const mockBookings: Booking[] = [
    {
      id: '1',
      personName: 'John Smith',
      spaceName: 'Desk 42',
      spaceType: 'Desk',
      office: 'Seattle Office',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      status: 'Checked In'
    },
    {
      id: '2',
      personName: 'Sarah Johnson',
      spaceName: 'Conference Room A',
      spaceType: 'Conference Room',
      office: 'Seattle Office',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '12:00',
      status: 'Confirmed'
    },
    {
      id: '3',
      personName: 'Michael Chen',
      spaceName: 'Desk 15',
      spaceType: 'Desk',
      office: 'Portland Office',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '16:00',
      status: 'Confirmed'
    }
  ];

  const columns = [
    {
      key: 'personName',
      header: 'Person',
      render: (booking: Booking) => (
        <div className="font-medium text-gray-900">{booking.personName}</div>
      )
    },
    {
      key: 'space',
      header: 'Space',
      render: (booking: Booking) => (
        <div>
          <div className="font-medium">{booking.spaceName}</div>
          <div className="text-sm text-gray-500">{booking.spaceType}</div>
        </div>
      )
    },
    {
      key: 'office',
      header: 'Office'
    },
    {
      key: 'date',
      header: 'Date',
      render: (booking: Booking) => (
        <div className="text-sm">{new Date(booking.date).toLocaleDateString()}</div>
      )
    },
    {
      key: 'time',
      header: 'Time',
      render: (booking: Booking) => (
        <div className="text-sm">
          {booking.startTime} - {booking.endTime}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking: Booking) => (
        <StatusBadge
          status={booking.status}
          variant={
            booking.status === 'Checked In' ? 'success' :
            booking.status === 'Confirmed' ? 'info' :
            booking.status === 'Completed' ? 'default' :
            'warning'
          }
        />
      )
    }
  ];

  const filteredBookings = mockBookings.filter(booking => {
    const matchesSearch = booking.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.spaceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOffice = selectedOffice === 'all' || booking.office === selectedOffice;
    const matchesDate = booking.date === selectedDate;
    return matchesSearch && matchesOffice && matchesDate;
  });

  const offices = ['all', ...Array.from(new Set(mockBookings.map(b => b.office)))];

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
            <div className="text-3xl font-bold text-blue-600">{mockBookings.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Bookings</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {mockBookings.filter(b => b.status === 'Confirmed' || b.status === 'Checked In').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active Today</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {mockBookings.filter(b => b.spaceType === 'Desk').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Desk Bookings</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {mockBookings.filter(b => b.spaceType === 'Conference Room').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Room Bookings</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              options={offices.map(office => ({
                value: office,
                label: office === 'all' ? 'All Offices' : office
              }))}
            />
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
          emptyMessage="No bookings found for this date"
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

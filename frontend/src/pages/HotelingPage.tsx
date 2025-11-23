import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Table, StatusBadge, Input, Modal } from '../components/ui';
import { useBookings, useSpaces, useOffices } from '../hooks/useBookings';
import type { Booking } from '../types/api';
import { BookingStatus } from '../types/api';
import { BookingModal } from '../components/BookingModal';

export function HotelingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>();
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const startDate = selectedDate + 'T00:00:00';
  const endDate = selectedDate + 'T23:59:59';

  const { data: bookings = [], isLoading, error } = useBookings({
    startDate,
    endDate,
  });

  const { data: offices = [] } = useOffices();
  const { data: allSpaces = [] } = useSpaces();

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Booking ID', 'Person ID', 'Space ID', 'Start Time', 'End Time', 'Status'];
    const rows = filteredBookings.map(booking => [
      booking.id,
      booking.personId,
      booking.spaceId,
      new Date(booking.startDatetime).toLocaleString(),
      new Date(booking.endDatetime).toLocaleString(),
      getStatusLabel(booking.status)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              + New Booking
            </Button>
            <Button variant="secondary" onClick={() => setShowFloorPlan(true)}>
              View Floor Plan
            </Button>
            <Button variant="ghost" onClick={exportToCSV}>
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
          onRowClick={(booking) => {
            setSelectedBooking(booking);
            setIsModalOpen(true);
          }}
          emptyMessage={isLoading ? "Loading bookings..." : "No bookings found for this date"}
        />
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card hover onClick={() => setIsModalOpen(true)}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Desk</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve a workspace</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => setIsModalOpen(true)}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="font-semibold text-lg">Book a Room</h3>
            <p className="text-sm text-gray-600 mt-1">Reserve conference room</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => console.log('View my bookings - filter by current user')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-lg">My Bookings</h3>
            <p className="text-sm text-gray-600 mt-1">View your reservations</p>
          </CardBody>
        </Card>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(undefined);
        }}
        booking={selectedBooking}
        mode={selectedBooking ? 'edit' : 'create'}
      />

      {/* Floor Plan Modal */}
      <Modal
        isOpen={showFloorPlan}
        onClose={() => setShowFloorPlan(false)}
        title="Office Floor Plan"
        size="xl"
      >
        <div className="space-y-6">
          {/* Office selector */}
          {offices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Office
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                {offices.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name}{office.city ? ` - ${office.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Floor Plan Visualization */}
          <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="grid grid-cols-6 gap-4">
              {/* Legend */}
              <div className="col-span-6 flex gap-4 mb-4 pb-4 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm">Unavailable</span>
                </div>
              </div>

              {/* Spaces Grid */}
              {allSpaces.map((space) => {
                const isBooked = bookings.some(
                  b => b.spaceId === space.id &&
                  (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn)
                );

                const bgColor = !space.isAvailable ? 'bg-gray-400' :
                               isBooked ? 'bg-red-500' :
                               'bg-green-500';

                const icon = space.type === SpaceType.Desk ? '🪑' :
                            space.type === SpaceType.ConferenceRoom ? '🏢' :
                            '📦';

                return (
                  <div
                    key={space.id}
                    className={`${bgColor} rounded-lg p-4 flex flex-col items-center justify-center text-white cursor-pointer hover:opacity-80 transition relative`}
                    title={`${space.name} - ${space.type === SpaceType.Desk ? 'Desk' : space.type === SpaceType.ConferenceRoom ? 'Conference Room' : 'Other'}`}
                    onClick={() => {
                      if (space.isAvailable && !isBooked) {
                        setShowFloorPlan(false);
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xs font-medium text-center truncate w-full">
                      {space.name}
                    </div>
                    {space.capacity && (
                      <div className="text-xs opacity-90">
                        Cap: {space.capacity}
                      </div>
                    )}
                    {isBooked && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allSpaces.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No spaces available</p>
                <p className="text-sm mt-2">Add offices and spaces to see the floor plan</p>
              </div>
            )}
          </div>

          {/* Space Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {allSpaces.filter(s => s.isAvailable && !bookings.some(b => b.spaceId === s.id && (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn))).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Available Now</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {allSpaces.filter(s => bookings.some(b => b.spaceId === s.id && (b.status === BookingStatus.Reserved || b.status === BookingStatus.CheckedIn))).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Currently Booked</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {allSpaces.filter(s => !s.isAvailable).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Unavailable</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowFloorPlan(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            setShowFloorPlan(false);
            setIsModalOpen(true);
          }}>
            Book a Space
          </Button>
        </div>
      </Modal>
    </div>
  );
}

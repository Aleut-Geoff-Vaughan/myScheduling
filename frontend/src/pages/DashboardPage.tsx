import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardHeader, CardBody, Button } from '../components/ui';
import { WeekCalendarView } from '../components/WeekCalendarView';
import { WorkLocationSelector } from '../components/WorkLocationSelector';
import { useWorkLocationPreferences } from '../hooks/useWorkLocation';
import { usePeople } from '../hooks/usePeople';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Get current user's person record
  const { data: people = [] } = usePeople();
  const currentPerson = people.find(p => p.userId === user?.id);

  // Calculate date range for 2 weeks (10 weekdays)
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    // Get Monday of current week
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setDate(diff);

    // End date is Friday of next week (10 weekdays later)
    const end = new Date(start);
    end.setDate(end.getDate() + 11); // 10 weekdays + weekend

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  // Fetch work location preferences for current user
  const { data: preferences = [], isLoading } = useWorkLocationPreferences({
    personId: currentPerson?.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowLocationSelector(true);
  };

  const existingPreference = useMemo(() => {
    if (!selectedDate || !currentPerson) return undefined;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return preferences.find(p => p.workDate === dateStr && p.personId === currentPerson.id);
  }, [selectedDate, preferences, currentPerson]);

  const stats = [
    {
      name: 'Remote Days',
      value: preferences.filter(p => p.locationType === 0 || p.locationType === 1).length.toString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      name: 'Office Days',
      value: preferences.filter(p => p.locationType === 3 || p.locationType === 4).length.toString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      name: 'Client Sites',
      value: preferences.filter(p => p.locationType === 2).length.toString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
    },
    {
      name: 'Not Set',
      value: (10 - preferences.length).toString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-gray-500',
    },
  ];

  if (!currentPerson) {
    return (
      <div className="p-6">
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-gray-600 text-lg">Loading your profile...</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.displayName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Plan your work location for the next two weeks.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-2`}>
                <div className="text-white">{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Work Location Calendar */}
      <Card className="mb-6">
        <CardHeader
          title="My Work Location Schedule"
          subtitle="Click on any day to set or update your work location"
        />
        <CardBody>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading your schedule...
            </div>
          ) : (
            <WeekCalendarView
              startDate={new Date()}
              preferences={preferences}
              onDayClick={handleDayClick}
              personId={currentPerson.id}
            />
          )}
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover onClick={() => navigate('/hoteling')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-lg">Desk Reservations</h3>
            <p className="text-sm text-gray-600 mt-1">Book a desk or conference room</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => navigate('/staffing')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="font-semibold text-lg">My Assignments</h3>
            <p className="text-sm text-gray-600 mt-1">View project assignments</p>
          </CardBody>
        </Card>

        <Card hover onClick={() => navigate('/projects')}>
          <CardBody className="text-center py-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="font-semibold text-lg">Projects</h3>
            <p className="text-sm text-gray-600 mt-1">Browse active projects</p>
          </CardBody>
        </Card>
      </div>

      {/* Work Location Selector Modal */}
      {selectedDate && (
        <WorkLocationSelector
          isOpen={showLocationSelector}
          onClose={() => {
            setShowLocationSelector(false);
            setSelectedDate(null);
          }}
          selectedDate={selectedDate}
          existingPreference={existingPreference}
          personId={currentPerson.id}
        />
      )}
    </div>
  );
}

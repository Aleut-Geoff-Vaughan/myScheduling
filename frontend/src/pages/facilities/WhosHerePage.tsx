import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { facilitiesPortalService } from '../../services/facilitiesPortalService';
import type { WhosHereItem } from '../../services/facilitiesPortalService';

export function WhosHerePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selectedOfficeId from URL params or empty string
  const initialOfficeId = searchParams.get('office') || '';
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(initialOfficeId);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch offices
  const { data: offices = [], isLoading: loadingOffices } = useQuery({
    queryKey: ['office-directory'],
    queryFn: () => facilitiesPortalService.getOfficeDirectory(),
  });

  // Fetch who's here for selected office
  const { data: whosHere = [], isLoading: loadingWhosHere, refetch } = useQuery({
    queryKey: ['whos-here', selectedOfficeId],
    queryFn: () => facilitiesPortalService.getWhosHere(selectedOfficeId),
    enabled: !!selectedOfficeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update URL when office changes
  useEffect(() => {
    if (selectedOfficeId) {
      setSearchParams({ office: selectedOfficeId });
    } else {
      setSearchParams({});
    }
  }, [selectedOfficeId, setSearchParams]);

  // Filter people by search term
  const filteredPeople = whosHere.filter(person => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      person.userName.toLowerCase().includes(term) ||
      person.email.toLowerCase().includes(term) ||
      person.spaceName?.toLowerCase().includes(term)
    );
  });

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);

  if (loadingOffices) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Who's Here</h1>
          <p className="text-gray-600 mt-1">See who's currently in the office</p>
        </div>
        <Link
          to="/facilities/check-in"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Check In
        </Link>
      </div>

      {/* Office Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Office
            </label>
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Choose an office...</option>
              {offices.filter(o => o.status === 0).map(office => (
                <option key={office.id} value={office.id}>
                  {office.name} {office.city && `- ${office.city}, ${office.stateCode}`}
                </option>
              ))}
            </select>
          </div>

          {selectedOfficeId && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search People
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {!selectedOfficeId ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Office</h3>
          <p className="text-gray-500">Choose an office to see who's currently there</p>
        </div>
      ) : loadingWhosHere ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-900">{whosHere.length}</p>
                  <p className="text-sm text-teal-700">People at {selectedOffice?.name}</p>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* People List */}
          {filteredPeople.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matches found' : 'No one is here yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Be the first to check in!'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredPeople.map((person, index) => (
                  <PersonRow key={`${person.userId}-${index}`} person={person} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: WhosHereItem }) {
  const initials = person.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const checkedInDuration = () => {
    const checkInTime = new Date(person.checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkInTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m ago`;
    }
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
          <span className="text-teal-700 font-semibold">{initials}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{person.userName}</p>
          <p className="text-sm text-gray-500">{person.email}</p>
        </div>
      </div>
      <div className="text-right">
        {person.spaceName && (
          <p className="text-sm font-medium text-gray-900">{person.spaceName}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Checked in {checkedInDuration()}</span>
        </div>
      </div>
    </div>
  );
}

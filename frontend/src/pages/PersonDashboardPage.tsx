import { useParams, Navigate } from 'react-router-dom';
import { DashboardView } from '../components/DashboardView';
import { usePerson } from '../hooks/usePeople';

export default function PersonDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading, error } = usePerson(id);

  if (!id) return <Navigate to="/" replace />;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Failed to load person dashboard. {error.message}
        </div>
      </div>
    );
  }

  if (isLoading || !person) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      userId={person.id}
      displayName={person.displayName}
      isSelf={false}
      headlineOverride={`${person.displayName}'s Dashboard`}
      canEdit={false}
    />
  );
}

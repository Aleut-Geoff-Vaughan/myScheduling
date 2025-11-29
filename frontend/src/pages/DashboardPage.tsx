import { useAuthStore } from '../stores/authStore';
import { NewDashboardView } from '../components/NewDashboardView';

export function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return <NewDashboardView userId={user.id} displayName={user.displayName} />;
}

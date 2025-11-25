import { useAuthStore } from '../stores/authStore';
import { DashboardView } from '../components/DashboardView';

export function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return <DashboardView userId={user.id} displayName={user.displayName} isSelf />;
}

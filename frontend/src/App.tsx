import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WbsPage } from './pages/WbsPage';
import { StaffingPage } from './pages/StaffingPage';
import { HotelingPage } from './pages/HotelingPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { ResumesPage } from './pages/ResumesPage';
import { ResumeDetailPage } from './pages/ResumeDetailPage';
import { AdminPage } from './pages/AdminPage';
import { TeamCalendarPage } from './pages/TeamCalendarPage';
import { TeamCalendarAdminPage } from './pages/TeamCalendarAdminPage';
import { UserProfilePage } from './pages/UserProfilePage';
import TemplatesPage from './pages/TemplatesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DOAPage from './pages/DOAPage';
import { useAuthStore } from './stores/authStore';
import { AdminLoginReport } from './pages/AdminLoginReport';
import PeoplePage from './pages/PeoplePage';
import PersonDashboardPage from './pages/PersonDashboardPage';
import InboxPage from './pages/InboxPage';
import ManagementStaffingPage from './pages/ManagementStaffingPage';
import StaffingAdminPage from './pages/StaffingAdminPage';
import AdminGroupsPage from './pages/AdminGroupsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentWorkspace } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated but hasn't selected a workspace yet
  if (!currentWorkspace) {
    return <Navigate to="/select-workspace" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/select-workspace" element={<WorkspaceSelectorPage />} />

            {/* Admin Portal Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminPage />} />
              <Route path="users" element={<AdminPage viewOverride="users" />} />
              <Route path="tenants" element={<AdminPage viewOverride="tenants" />} />
              <Route path="groups" element={<AdminGroupsPage />} />
              <Route path="settings" element={<AdminPage viewOverride="settings" />} />
              <Route path="logins" element={<AdminLoginReport />} />
            </Route>

            {/* Main Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="wbs" element={<WbsPage />} />
              <Route path="staffing" element={<StaffingPage />} />
              <Route path="staffing/manage" element={<ManagementStaffingPage />} />
              <Route path="staffing/admin" element={<StaffingAdminPage />} />
              <Route path="hoteling" element={<HotelingPage />} />
              <Route path="facilities" element={<FacilitiesPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people/:id/dashboard" element={<PersonDashboardPage />} />
              <Route path="resumes" element={<ResumesPage />} />
              <Route path="resumes/:id" element={<ResumeDetailPage />} />
              <Route path="team-calendar" element={<TeamCalendarPage />} />
              <Route path="team-calendar/admin" element={<TeamCalendarAdminPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="doa" element={<DOAPage />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="reports" element={<div className="p-6">Reports Module (Coming Soon)</div>} />
            </Route>
            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

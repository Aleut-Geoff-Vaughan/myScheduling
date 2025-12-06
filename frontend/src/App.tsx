import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage';
import { MeLayout } from './components/layout/MeLayout';
import { ManagerLayout } from './components/layout/ManagerLayout';
import { AdminLayout } from './components/layout/AdminLayout';
// DashboardPage removed - MyHubPage is now the home page
import { ProjectsPage } from './pages/ProjectsPage';
import { WbsPage } from './pages/WbsPage';
import { StaffingPage } from './pages/StaffingPage';
import { HotelingPage } from './pages/HotelingPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { ResumesPage } from './pages/ResumesPage';
import { ResumeProfilePage } from './pages/ResumeProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AdminProjectsPage } from './pages/AdminProjectsPage';
import { AdminWbsPage } from './pages/AdminWbsPage';
import { AdminProjectAssignmentsPage } from './pages/AdminProjectAssignmentsPage';
import { AdminAssignmentsPage } from './pages/AdminAssignmentsPage';
import { TeamCalendarPage } from './pages/TeamCalendarPage';
import { TeamCalendarAdminPage } from './pages/TeamCalendarAdminPage';
import { UserProfilePage } from './pages/UserProfilePage';
import TemplatesPage from './pages/TemplatesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { MagicLinkVerifyPage } from './pages/MagicLinkVerifyPage';
import DOAPage from './pages/DOAPage';
import { useAuthStore } from './stores/authStore';
import { AdminLoginReport } from './pages/AdminLoginReport';
import PeoplePage from './pages/PeoplePage';
import PersonDashboardPage from './pages/PersonDashboardPage';
import InboxPage from './pages/InboxPage';
import ManagementStaffingPage from './pages/ManagementStaffingPage';
import StaffingAdminPage from './pages/StaffingAdminPage';
import AdminGroupsPage from './pages/AdminGroupsPage';
import { AdminDOATemplatesPage } from './pages/AdminDOATemplatesPage';
import { AdminTenantSettingsPage } from './pages/AdminTenantSettingsPage';
import { AdminOfficesPage } from './pages/AdminOfficesPage';
import { AdminFacilitiesPage } from './pages/AdminFacilitiesPage';
import { AdminOfficeDetailPage } from './pages/AdminOfficeDetailPage';
import { AdminSpaceDetailPage } from './pages/AdminSpaceDetailPage';
import { AdminResumesPage } from './pages/AdminResumesPage';
import { AdminResumeTemplatesPage } from './pages/AdminResumeTemplatesPage';
import { AdminHolidaysPage } from './pages/AdminHolidaysPage';
import { AdminCareerJobFamiliesPage } from './pages/AdminCareerJobFamiliesPage';
import { AdminSubcontractorCompaniesPage } from './pages/AdminSubcontractorCompaniesPage';
import { AdminForecastSchedulesPage } from './pages/AdminForecastSchedulesPage';
import { AdminProjectRoleAssignmentsPage } from './pages/AdminProjectRoleAssignmentsPage';
import { AdminForecastsPage } from './pages/AdminForecastsPage';
import { ForecastVersionsPage } from './pages/ForecastVersionsPage';
import { ForecastImportExportPage } from './pages/ForecastImportExportPage';
import { ForecastApprovalPage } from './pages/ForecastApprovalPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ResumeSharePage } from './pages/ResumeSharePage';
import { MySchedulePage } from './pages/MySchedulePage';
import { MyHubPage } from './pages/MyHubPage';
import StaffingDashboardPage from './pages/StaffingDashboardPage';
import ProjectStaffingDetailPage from './pages/ProjectStaffingDetailPage';
import { AdminImpersonationPage } from './pages/AdminImpersonationPage';
import { AdminUserEditPage } from './pages/AdminUserEditPage';
import { AdminTeamCalendarsPage } from './pages/AdminTeamCalendarsPage';
import { ForecastLayout } from './components/layout/ForecastLayout';
import { ForecastDashboardPage } from './pages/ForecastDashboardPage';
import { MyForecastsPage } from './pages/MyForecastsPage';
import { ForecastProjectsPage } from './pages/ForecastProjectsPage';
import { ProjectForecastGridPage } from './pages/ProjectForecastGridPage';
import { BudgetManagementPage } from './pages/BudgetManagementPage';
import { CreateBudgetPage } from './pages/CreateBudgetPage';
import { ForecastAnalyticsPage } from './pages/ForecastAnalyticsPage';
import { ForecastReviewPage } from './pages/ForecastReviewPage';
import { ForecastApprovalsPage } from './pages/ForecastApprovalsPage';
import { ForecastSettingsPage } from './pages/ForecastSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      refetchOnMount: false, // Don't refetch on every mount if data is fresh
      refetchOnReconnect: false, // Don't refetch on network reconnect
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
            <Route path="/auth/magic-link" element={<MagicLinkVerifyPage />} />
            <Route path="/select-workspace" element={<WorkspaceSelectorPage />} />

            {/* Public shared resume view (no auth required) */}
            <Route path="/resume/share/:token" element={<ResumeSharePage />} />

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
              <Route path="users/:id" element={<AdminUserEditPage />} />
              <Route path="tenants" element={<AdminPage viewOverride="tenants" />} />
              <Route path="groups" element={<AdminGroupsPage />} />
              <Route path="team-calendars" element={<AdminTeamCalendarsPage />} />
              <Route path="settings" element={<AdminPage viewOverride="settings" />} />
              <Route path="logins" element={<AdminLoginReport />} />
              <Route path="impersonation" element={<AdminImpersonationPage />} />
              <Route path="data/projects" element={<AdminProjectsPage />} />
              <Route path="data/wbs" element={<AdminWbsPage />} />
              <Route path="data/project-assignments" element={<AdminProjectAssignmentsPage />} />
              <Route path="data/assignments" element={<AdminAssignmentsPage />} />
              <Route path="doa-templates" element={<AdminDOATemplatesPage />} />
              <Route path="tenant-settings" element={<AdminTenantSettingsPage />} />
              <Route path="offices" element={<AdminOfficesPage />} />
              <Route path="facilities" element={<AdminFacilitiesPage />} />
              <Route path="facilities/office/:officeId" element={<AdminOfficeDetailPage />} />
              <Route path="facilities/space/:spaceId" element={<AdminSpaceDetailPage />} />
              <Route path="resumes" element={<AdminResumesPage />} />
              <Route path="resume-templates" element={<AdminResumeTemplatesPage />} />
              <Route path="holidays" element={<AdminHolidaysPage />} />
              <Route path="career-families" element={<AdminCareerJobFamiliesPage />} />
            </Route>

            {/* Me Portal Routes (mobile-friendly top nav) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MyHubPage />} />
              <Route path="schedule" element={<MySchedulePage />} />
              <Route path="staffing" element={<StaffingPage />} />
              <Route path="hoteling" element={<HotelingPage />} />
              <Route path="resumes" element={<ResumesPage />} />
              <Route path="resumes/:id" element={<ResumeProfilePage />} />
              <Route path="doa" element={<DOAPage />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="inbox" element={<InboxPage />} />
            </Route>

            {/* Manager Portal Routes (sidebar nav) */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManagerDashboardPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people/:id/dashboard" element={<PersonDashboardPage />} />
              <Route path="staffing" element={<ManagementStaffingPage />} />
              <Route path="team-calendar" element={<TeamCalendarPage />} />
              <Route path="team-calendar/admin" element={<TeamCalendarAdminPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="wbs" element={<WbsPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="facilities" element={<FacilitiesPage />} />
              <Route path="staffing-admin" element={<StaffingAdminPage />} />
              <Route path="forecast-approvals" element={<ForecastApprovalPage />} />
              <Route path="reports" element={<div className="p-6">Reports Module (Coming Soon)</div>} />
            </Route>

            {/* myForecast Portal Routes (sidebar nav) */}
            <Route
              path="/forecast"
              element={
                <ProtectedRoute>
                  <ForecastLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ForecastDashboardPage />} />
              <Route path="my-forecasts" element={<MyForecastsPage />} />
              <Route path="projects" element={<ForecastProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectForecastGridPage />} />
              <Route path="projects/:projectId/grid" element={<ProjectForecastGridPage />} />
              <Route path="budgets" element={<BudgetManagementPage />} />
              <Route path="budgets/create/:projectId" element={<CreateBudgetPage />} />
              <Route path="analytics" element={<ForecastAnalyticsPage />} />
              <Route path="review" element={<ForecastReviewPage />} />
              <Route path="approvals" element={<ForecastApprovalsPage />} />
              <Route path="versions" element={<ForecastVersionsPage />} />
              <Route path="import-export" element={<ForecastImportExportPage />} />
              <Route path="settings" element={<ForecastSettingsPage />} />
              {/* Staffing Admin - moved from /admin/staffing */}
              <Route path="staffing-dashboard" element={<StaffingDashboardPage />} />
              <Route path="staffing/projects/:projectId" element={<ProjectStaffingDetailPage />} />
              <Route path="role-assignments" element={<AdminProjectRoleAssignmentsPage />} />
              <Route path="subcontractors" element={<AdminSubcontractorCompaniesPage />} />
              <Route path="schedules" element={<AdminForecastSchedulesPage />} />
              <Route path="forecasts" element={<AdminForecastsPage />} />
            </Route>

            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

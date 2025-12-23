import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HelpProvider } from './contexts/HelpContext';
import { HelpPanel } from './components/help';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { UnifiedLayout } from './components/layout/UnifiedLayout';
// DashboardPage removed - MyHubPage is now the home page
import { ProjectsPage } from './pages/ProjectsPage';
import { WbsPage } from './pages/WbsPage';
import { MyStaffingPlanPage } from './pages/MyStaffingPlanPage';
import { HotelingPage } from './pages/HotelingPage';
import { ResumesPage } from './pages/ResumesPage';
import { ResumeProfilePage } from './pages/ResumeProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AdminProjectsPage } from './pages/AdminProjectsPage';
import { AdminWbsPage } from './pages/AdminWbsPage';
import { AdminProjectAssignmentsPage } from './pages/AdminProjectAssignmentsPage';
import { AdminAssignmentsPage } from './pages/AdminAssignmentsPage';
import { TeamCalendarPage } from './pages/TeamCalendarPage';
import { TeamCalendarAdminPage } from './pages/TeamCalendarAdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SetPasswordPage from './pages/SetPasswordPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
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
import { AdminDOALettersPage } from './pages/AdminDOALettersPage';
import { AdminTenantSettingsPage } from './pages/AdminTenantSettingsPage';
import { AdminOfficesPage } from './pages/AdminOfficesPage';
import { AdminFacilitiesPage } from './pages/AdminFacilitiesPage';
import { AdminOfficeDetailPage } from './pages/AdminOfficeDetailPage';
import { AdminSpaceDetailPage } from './pages/AdminSpaceDetailPage';
import { AdminResumesPage } from './pages/AdminResumesPage';
import { AdminResumeTemplatesPage } from './pages/AdminResumeTemplatesPage';
import { AdminHolidaysPage } from './pages/AdminHolidaysPage';
import { AdminCareerJobFamiliesPage } from './pages/AdminCareerJobFamiliesPage';
import { EmailTestPage } from './pages/admin/EmailTestPage';
import { AdminHelpArticlesPage } from './pages/AdminHelpArticlesPage';
import { AdminSubcontractorCompaniesPage } from './pages/AdminSubcontractorCompaniesPage';
import { AdminForecastSchedulesPage } from './pages/AdminForecastSchedulesPage';
import { AdminProjectRoleAssignmentsPage } from './pages/AdminProjectRoleAssignmentsPage';
import { AdminForecastsPage } from './pages/AdminForecastsPage';
import { ForecastVersionsPage } from './pages/ForecastVersionsPage';
import { ForecastImportExportPage } from './pages/ForecastImportExportPage';
import { ManagerResumesPage } from './pages/ManagerResumesPage';
import { ResumeSharePage } from './pages/ResumeSharePage';
import { MySchedulePage } from './pages/MySchedulePage';
import { MyHubPage } from './pages/MyHubPage';
import StaffingDashboardPage from './pages/StaffingDashboardPage';
import ProjectStaffingDetailPage from './pages/ProjectStaffingDetailPage';
import { AdminImpersonationPage } from './pages/AdminImpersonationPage';
import { AdminUserEditPage } from './pages/AdminUserEditPage';
import { AdminTeamCalendarsPage } from './pages/AdminTeamCalendarsPage';
import { ForecastDashboardPage } from './pages/ForecastDashboardPage';
import { FacilitiesDashboardPage } from './pages/FacilitiesDashboardPage';
import { FacilitiesAdminPage } from './pages/facilities/FacilitiesAdminPage';
import { OfficeManagementPage } from './pages/facilities/OfficeManagementPage';
import { OfficeDirectoryPage } from './pages/facilities/OfficeDirectoryPage';
import { CheckInPage } from './pages/facilities/CheckInPage';
import { WhosHerePage } from './pages/facilities/WhosHerePage';
import { AnnouncementsPage } from './pages/facilities/AnnouncementsPage';
import { TravelGuidesPage } from './pages/facilities/TravelGuidesPage';
import { OfficeDetailPage } from './pages/facilities/OfficeDetailPage';
import { LeaseManagementPage } from './pages/facilities/LeaseManagementPage';
import { LeaseDetailPage } from './pages/facilities/LeaseDetailPage';
import { OptionYearsCalendarPage } from './pages/facilities/OptionYearsCalendarPage';
import { FieldAssignmentsPage } from './pages/facilities/FieldAssignmentsPage';
import { ClientSitesPage } from './pages/facilities/ClientSitesPage';
import { ClearancesPage } from './pages/facilities/ClearancesPage';
import { ForeignTravelPage } from './pages/facilities/ForeignTravelPage';
import { ScifAccessPage } from './pages/facilities/ScifAccessPage';
import AppLauncherPage from './pages/AppLauncherPage';
import FeedbackPage from './pages/FeedbackPage';
import { UsageAnalyticsPage } from './pages/facilities/UsageAnalyticsPage';
import { MyForecastsPage } from './pages/MyForecastsPage';
import {
  SalesOpsDashboardPage,
  SalesOpsOpportunitiesPage,
  SalesOpsOpportunityDetailPage,
  SalesOpsOpportunityFormPage,
  SalesOpsPipelinePage,
  SalesOpsAccountsPage,
  SalesOpsAccountDetailPage,
  SalesOpsAccountFormPage,
  SalesOpsContactsPage,
  SalesOpsContactDetailPage,
  SalesOpsContactFormPage,
  SalesOpsVehiclesPage,
  SalesOpsVehicleDetailPage,
  SalesOpsVehicleFormPage,
  SalesOpsCalendarPage,
  SalesOpsForecastPage,
  SalesOpsReportsPage,
  SalesOpsSettingsPage,
  SalesOpsStagesPage,
  SalesOpsPicklistsPage,
  SalesOpsEntitiesPage,
  SalesOpsEntityDetailPage,
  SalesOpsEntityFormPage,
  SalesOpsCustomFieldsPage,
} from './pages/salesops';
import { ForecastProjectsPage } from './pages/ForecastProjectsPage';
import { ProjectForecastGridPage } from './pages/ProjectForecastGridPage';
import { BudgetManagementPage } from './pages/BudgetManagementPage';
import { CreateBudgetPage } from './pages/CreateBudgetPage';
import { ForecastAnalyticsPage } from './pages/ForecastAnalyticsPage';
import { ForecastReviewPage } from './pages/ForecastReviewPage';
import { ForecastApprovalsPage } from './pages/ForecastApprovalsPage';
import { ForecastSettingsPage } from './pages/ForecastSettingsPage';
import { CostRatesPage } from './pages/CostRatesPage';

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

/**
 * Catch-all component for 404 routes
 * Always redirects to /login - this clears any invalid routes and lets
 * the normal auth flow handle routing after login
 */
function NotFoundRedirect() {
  return <Navigate to="/login" replace />;
}

/**
 * Helper component to redirect legacy routes with :id params to new routes
 * React Router v6 doesn't interpolate :id in Navigate's to prop
 */
function LegacyResumeRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/work/resumes/${id}`} replace />;
}

function LegacyPersonDashboardRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/work/team/people/${id}/dashboard`} replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HelpProvider>
          <HelpPanel />
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
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="/auth/magic-link" element={<MagicLinkVerifyPage />} />
            <Route path="/select-workspace" element={<WorkspaceSelectorPage />} />

            {/* Public shared resume view (no auth required) */}
            <Route path="/resume/share/:token" element={<ResumeSharePage />} />

            {/* App Launcher and Feedback (protected, with unified layout) */}
            <Route
              path="/apps"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AppLauncherPage />} />
            </Route>
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FeedbackPage />} />
            </Route>

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
              <Route path="doa-letters" element={<AdminDOALettersPage />} />
              <Route path="tenant-settings" element={<AdminTenantSettingsPage />} />
              <Route path="offices" element={<AdminOfficesPage />} />
              <Route path="facilities" element={<AdminFacilitiesPage />} />
              <Route path="facilities/office/:officeId" element={<AdminOfficeDetailPage />} />
              <Route path="facilities/space/:spaceId" element={<AdminSpaceDetailPage />} />
              <Route path="resumes" element={<AdminResumesPage />} />
              <Route path="resume-templates" element={<AdminResumeTemplatesPage />} />
              <Route path="holidays" element={<AdminHolidaysPage />} />
              <Route path="career-families" element={<AdminCareerJobFamiliesPage />} />
              <Route path="email-test" element={<EmailTestPage />} />
              <Route path="help-articles" element={<AdminHelpArticlesPage />} />
            </Route>

            {/* Root redirect to /work */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/work" replace />
                </ProtectedRoute>
              }
            />

            {/* Legacy routes - redirect to new unified routes */}
            <Route path="/schedule" element={<Navigate to="/work/schedule" replace />} />
            <Route path="/staffing" element={<Navigate to="/work/staffing" replace />} />
            <Route path="/hoteling" element={<Navigate to="/facilities/book" replace />} />
            <Route path="/resumes" element={<Navigate to="/work/resumes" replace />} />
            <Route path="/resumes/:id" element={<LegacyResumeRedirect />} />
            <Route path="/doa" element={<Navigate to="/work/doa" replace />} />
            <Route path="/inbox" element={<Navigate to="/work/assignments" replace />} />
            <Route path="/profile" element={<Navigate to="/work" replace />} />

            {/* Manager Portal - Legacy redirects to unified /work routes */}
            <Route path="/manager" element={<Navigate to="/work" replace />} />
            <Route path="/manager/people" element={<Navigate to="/work/team/people" replace />} />
            <Route path="/manager/people/:id/dashboard" element={<LegacyPersonDashboardRedirect />} />
            <Route path="/manager/staffing" element={<Navigate to="/work/team/staffing" replace />} />
            <Route path="/manager/team-calendar" element={<Navigate to="/work/team/calendar" replace />} />
            <Route path="/manager/team-calendar/admin" element={<Navigate to="/work/team/calendar/admin" replace />} />
            <Route path="/manager/projects" element={<Navigate to="/work/projects" replace />} />
            <Route path="/manager/wbs" element={<Navigate to="/work/wbs" replace />} />
            <Route path="/manager/facilities" element={<Navigate to="/facilities" replace />} />
            <Route path="/manager/resumes" element={<Navigate to="/work/team/resumes" replace />} />
            <Route path="/manager/staffing-admin" element={<Navigate to="/work/settings/staffing" replace />} />
            <Route path="/manager/forecast-approvals" element={<Navigate to="/forecast/approvals" replace />} />
            <Route path="/manager/reports" element={<Navigate to="/work/reports" replace />} />

            {/* NEW: Unified myWork Routes (new navigation system) */}
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<MyHubPage />} />

              {/* My Work section */}
              <Route path="schedule" element={<MySchedulePage />} />
              <Route path="staffing" element={<MyStaffingPlanPage />} />
              <Route path="assignments" element={<InboxPage />} />
              <Route path="resumes" element={<ResumesPage />} />
              <Route path="resumes/:id" element={<ResumeProfilePage />} />
              <Route path="doa" element={<DOAPage />} />

              {/* Team section */}
              <Route path="team/people" element={<PeoplePage />} />
              <Route path="team/people/:id/dashboard" element={<PersonDashboardPage />} />
              <Route path="team/staffing" element={<ManagementStaffingPage />} />
              <Route path="team/calendar" element={<TeamCalendarPage />} />
              <Route path="team/calendar/admin" element={<TeamCalendarAdminPage />} />
              <Route path="team/resumes" element={<ManagerResumesPage />} />

              {/* Projects section */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="wbs" element={<WbsPage />} />

              {/* Reports */}
              <Route path="reports" element={<div className="p-6">Reports Module (Coming Soon)</div>} />

              {/* Settings */}
              <Route path="settings/staffing" element={<StaffingAdminPage />} />
            </Route>

            {/* NEW: Unified myForecast Routes (new navigation system) */}
            <Route
              path="/forecast"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
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
              <Route path="cost-rates" element={<CostRatesPage />} />
              <Route path="non-labor" element={<ForecastSettingsPage />} />
              {/* Staffing Dashboard */}
              <Route path="staffing-dashboard" element={<StaffingDashboardPage />} />
              <Route path="staffing/projects/:projectId" element={<ProjectStaffingDetailPage />} />
              <Route path="role-assignments" element={<AdminProjectRoleAssignmentsPage />} />
              <Route path="subcontractors" element={<AdminSubcontractorCompaniesPage />} />
              <Route path="schedules" element={<AdminForecastSchedulesPage />} />
              <Route path="forecasts" element={<AdminForecastsPage />} />
            </Route>

            {/* NEW: Unified myFacilities Routes (new navigation system) */}
            <Route
              path="/facilities"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FacilitiesDashboardPage />} />
              {/* Hoteling section */}
              <Route path="book" element={<HotelingPage />} />
              <Route path="check-in" element={<CheckInPage />} />
              <Route path="whos-here" element={<WhosHerePage />} />
              {/* Offices section */}
              <Route path="offices" element={<OfficeDirectoryPage />} />
              <Route path="offices/:officeId" element={<OfficeDetailPage />} />
              <Route path="travel-guides" element={<TravelGuidesPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              {/* Management section */}
              <Route path="leases" element={<LeaseManagementPage />} />
              <Route path="leases/:leaseId" element={<LeaseDetailPage />} />
              <Route path="option-years" element={<OptionYearsCalendarPage />} />
              <Route path="field-assignments" element={<FieldAssignmentsPage />} />
              <Route path="client-sites" element={<ClientSitesPage />} />
              {/* Security section */}
              <Route path="clearances" element={<ClearancesPage />} />
              <Route path="foreign-travel" element={<ForeignTravelPage />} />
              <Route path="scif-access" element={<ScifAccessPage />} />
              {/* Settings section */}
              <Route path="admin" element={<FacilitiesAdminPage />} />
              <Route path="admin/offices" element={<OfficeManagementPage />} />
              <Route path="admin/offices/:officeId" element={<AdminOfficeDetailPage />} />
              <Route path="admin/spaces/:spaceId" element={<AdminSpaceDetailPage />} />
              <Route path="analytics" element={<UsageAnalyticsPage />} />
            </Route>

            {/* NEW: Unified mySalesOps Routes (new navigation system) */}
            <Route
              path="/salesops"
              element={
                <ProtectedRoute>
                  <UnifiedLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SalesOpsDashboardPage />} />
              {/* Pipeline section */}
              <Route path="pipeline" element={<SalesOpsPipelinePage />} />
              <Route path="opportunities" element={<SalesOpsOpportunitiesPage />} />
              <Route path="opportunities/new" element={<SalesOpsOpportunityFormPage />} />
              <Route path="opportunities/:id" element={<SalesOpsOpportunityDetailPage />} />
              <Route path="opportunities/:id/edit" element={<SalesOpsOpportunityFormPage />} />
              <Route path="calendar" element={<SalesOpsCalendarPage />} />
              {/* Accounts section */}
              <Route path="accounts" element={<SalesOpsAccountsPage />} />
              <Route path="accounts/new" element={<SalesOpsAccountFormPage />} />
              <Route path="accounts/:id" element={<SalesOpsAccountDetailPage />} />
              <Route path="accounts/:id/edit" element={<SalesOpsAccountFormPage />} />
              <Route path="contacts" element={<SalesOpsContactsPage />} />
              <Route path="contacts/new" element={<SalesOpsContactFormPage />} />
              <Route path="contacts/:id" element={<SalesOpsContactDetailPage />} />
              <Route path="contacts/:id/edit" element={<SalesOpsContactFormPage />} />
              {/* Contracts section */}
              <Route path="vehicles" element={<SalesOpsVehiclesPage />} />
              <Route path="vehicles/new" element={<SalesOpsVehicleFormPage />} />
              <Route path="vehicles/:id" element={<SalesOpsVehicleDetailPage />} />
              <Route path="vehicles/:id/edit" element={<SalesOpsVehicleFormPage />} />
              {/* Forecasting section */}
              <Route path="forecast" element={<SalesOpsForecastPage />} />
              <Route path="reports" element={<SalesOpsReportsPage />} />
              {/* Administration section */}
              <Route path="settings" element={<SalesOpsSettingsPage />} />
              <Route path="settings/stages" element={<SalesOpsStagesPage />} />
              <Route path="settings/picklists" element={<SalesOpsPicklistsPage />} />
              <Route path="entities" element={<SalesOpsEntitiesPage />} />
              <Route path="entities/new" element={<SalesOpsEntityFormPage />} />
              <Route path="entities/:id" element={<SalesOpsEntityDetailPage />} />
              <Route path="entities/:id/edit" element={<SalesOpsEntityFormPage />} />
              <Route path="fields" element={<SalesOpsCustomFieldsPage />} />
            </Route>

            {/* 404 Catch-all: redirect to /work if authenticated, /login if not */}
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
          </HelpProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

# myScheduling

Enterprise staffing, work-location management, hoteling, WBS workflow, resumes, and tenant-aware RBAC. All historical docs now live in `docs/archive/`; this README is the current source of truth.

## Overview
- Work locations: calendars (week/two-week/month), templates (day/week/custom), stats, and supervisor visibility.
- Staffing: assignments with statuses, capacity view, request handling with inbox/approvals, admin/manager views.
- WBS & projects: lifecycle workflow, approvals, history, and bulk ops.
- Hoteling & Facilities: comprehensive enterprise facilities management with spaces/bookings, check-in tracking, floors/zones hierarchy, space assignments, booking rules, bulk Excel import/export, admin portal with booking management, on-behalf booking support, and permanent/indefinite booking capabilities.
- Resumes: profiles, sections, versions, approvals (needs full E2E testing).
- Admin portal: users/tenants/roles, invitations, profile editing (manager hierarchy), groups for approvers, login reports.
- Delegation of Authority (DOA): letter creation/management with flexible subject lines, digital signatures (drawn/typed), template library, tenant branding settings with logo upload, and print preview configuration.

## Architecture & Stack
- Backend: .NET 8 Web API, EF Core, PostgreSQL, Swagger.
- Frontend: React + TypeScript, Vite, Tailwind, TanStack Query, React Router, Zustand.
- Auth: JWT bearer (dev symmetric key), bcrypt password hashing, `[RequiresPermission]` authorization (coverage still in progress).
- Dev DB: Azure PostgreSQL (`myscheduling` @ `myscheduling.postgres.database.azure.com`).
- Ports: API `5107`; Frontend `5173` proxied to API.

## Setup & Run (local)
Prereqs: .NET 8 SDK, Node 18+, PostgreSQL (or the provided Azure DB), npm.

Backend
```bash
cd backend/src/MyScheduling.Api
dotnet restore
dotnet run --urls http://localhost:5107
# or set the connection string:
# ConnectionStrings__DefaultConnection="Host=...;Port=5432;Database=...;Username=...;Password=...;SslMode=Require"
```

Frontend
```bash
cd frontend
npm install
VITE_API_PROXY_TARGET=http://localhost:5107 npm run dev -- --host 0.0.0.0 --port 5173
```

Build checks
```bash
cd frontend && npm run build
cd backend  && dotnet build
```

Sample accounts: `admin@admin.com`.

## Data, Roles, Auth
- Tenants: isolation enforced in code; JWT claims carry tenant IDs and roles.
- Roles: Employee, ViewOnly, TeamLead, ProjectManager, ResourceManager, OfficeManager, TenantAdmin, Executive, OverrideApprover, SysAdmin (system), Support, Auditor.
- Manager hierarchy: `managerId` on users; used for supervisor display and team filters.
- JWT: replace dev key per environment; plan for refresh tokens/SSO (Entra ID) for production.

## Key Modules
- Dashboard: reusable view (self or reports) with calendars, stats, and quick links.
- MyHub (`/hub`): Unified employee dashboard with collapsible sections for MySchedule, MyReservations, MyDOAs, Project Assignments, and Forecasts—all in one view with summary stats.
- People: tiles/list, filters (all/direct/direct+indirect), supervisor display, inline edit (permissions), full-record modal edit, default delegate setting.
- Work Location Templates: CRUD/apply; dashboard/cache refresh polish in progress.
- Staffing: assignments, capacity timeline, tenant-scoped assignment requests with approvals/inbox, CSV export, and admin/manager views.
- WBS/Projects: workflow, approvals, history, bulk operations.
- Hoteling & Facilities Management:
  - Spaces/bookings with check-in UI and multiple view modes (day/week/month)
  - Share bookings via email with copy-to-clipboard functionality
  - Hierarchical organization: Office → Floor → Zone → Space
  - Space types: Desk, HotDesk, Office, Cubicle, ConferenceRoom, HuddleRoom, PhoneBooth, TrainingRoom, BreakRoom, ParkingSpot
  - Space availability: Shared, Assigned, Reservable, Restricted
  - Long-term assignments: Permanent, LongTerm, Temporary, Visitor
  - Booking rules: duration limits, advance booking, time restrictions, recurring settings, approval requirements
  - Maintenance tracking with status workflow
  - Admin portal: `/admin/facilities` with tabs for Overview, Import/Export, Floors, Zones
  - Office detail page: `/admin/facilities/offices/:id` with space management and booking overview
  - Space detail page: `/admin/facilities/spaces/:id` with booking tables showing "Booked For" user
  - On-behalf booking: Managers can book spaces for other users with self-booking toggle
  - Permanent bookings: Support for indefinite/permanent space reservations
  - Booking edit restrictions: Edit mode only allows changing isPermanent and dates (read-only for user/space/status)
  - Booking tracking: Records who created the booking (BookedBy) and when (BookedAt)
  - Bulk Excel import/export for Offices, Spaces, Floors, Zones, and Assignments
  - Downloadable Excel templates for easy data entry
- Resumes: CRUD + versions/approvals; needs thorough testing.
- Admin: user/tenant/role management, invitations, profile editing (searchable manager), groups for approvers, login reports, DOA templates library, tenant branding/settings, facilities admin (floors/zones/bulk import-export).
- Delegation of Authority (DOA):
  - Letter creation with flexible subject line (replaces fixed authority types)
  - Default duration: 7 days (configurable)
  - Digital signatures: draw on canvas or type full name (converted to signature format)
  - Template library: reusable letter content with placeholders, sortable, default template selection
  - Tenant settings: logo upload (PNG/JPEG/SVG, max 2MB), company information, print template configuration (header/footer/letterhead), styling options (colors, fonts)
  - Status workflow: Draft → Pending Signatures → Active/Expired/Revoked
  - Admin routes: `/admin/doa-templates`, `/admin/tenant-settings`, `/admin/facilities`

## Known Risks & TODO Highlights
- Authorization coverage incomplete: remaining controllers to secure include WorkLocationPreferences, WBS, Facilities, Invitations, TenantMemberships, ResumeApprovals/Templates, Holidays, DelegationOfAuthority, Validation.
- Auth hardening: rotate JWT secrets per env; add refresh tokens/SSO/MFA; ensure tokens drive all identity (no header overrides).
- Manager data hygiene: avoid cycles; UI now guards but data needs validation.
- Testing gap: no automated suites (backend xUnit/integration, frontend Vitest/Playwright needed).
- Observability: add structured logs/metrics/traces.
- Performance: review N+1 queries; add DB indexes for hot paths.
- Storage: profile photo upload stubbed—implement real storage (Azure Blob/S3) and cleanup.
- Notifications: invitation/workflow emails unimplemented; staffing approvals need messaging.
- Work location templates/calendar: ensure apply/refresh flows are reliable and covered by tests.

## Testing & Verification
- Manual: `dotnet build`, `npm run build`.
- Health: `http://localhost:5107/health`.
- Dev app: `http://localhost:5173` (proxied to API).
- Add automated integration and UI tests as priority.

## Repo Layout
- `backend/` – .NET solution and API.
- `frontend/` – React app (Vite).
- `scripts/` – utilities/seeding.
- `docs/archive/` – historical docs (designs, reviews, setup notes).
- `TODO.md` – current backlog/priorities.
- `LICENSE` – licensing.

## Quick Commands
- Start API: `cd backend/src/MyScheduling.Api && dotnet run --urls http://localhost:5107`
- Start FE: `cd frontend && VITE_API_PROXY_TARGET=http://localhost:5107 npm run dev -- --host 0.0.0.0 --port 5173`
- Build: `cd frontend && npm run build` ; `cd backend && dotnet build`

## Support
Use the archived docs in `docs/archive/` for historical reference. Keep `README.md` and `TODO.md` current with active work.

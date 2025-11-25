# myScheduling

Enterprise staffing, work-location management, hoteling, WBS workflow, resumes, and tenant-aware RBAC. All historical docs now live in `docs/archive/`; this README is the current source of truth.

## Overview
- Work locations: calendars (week/two-week/month), templates (day/week/custom), stats, and supervisor visibility.
- Staffing: assignments with statuses, capacity view, request handling with inbox/approvals, admin/manager views.
- WBS & projects: lifecycle workflow, approvals, history, and bulk ops.
- Hoteling: spaces/bookings with check-in tracking UI.
- Resumes: profiles, sections, versions, approvals (needs full E2E testing).
- Admin portal: users/tenants/roles, invitations, profile editing (manager hierarchy), groups for approvers, login reports.

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

Sample accounts (dev seed): `admin@test.com`, `test@test.com` (password per your seed/setup).

## Data, Roles, Auth
- Tenants: isolation enforced in code; JWT claims carry tenant IDs and roles.
- Roles: Employee, ViewOnly, TeamLead, ProjectManager, ResourceManager, OfficeManager, TenantAdmin, Executive, OverrideApprover, SysAdmin (system), Support, Auditor.
- Manager hierarchy: `managerId` on users; used for supervisor display and team filters.
- JWT: replace dev key per environment; plan for refresh tokens/SSO (Entra ID) for production.

## Key Modules
- Dashboard: reusable view (self or reports) with calendars, stats, and quick links.
- People: tiles/list, filters (all/direct/direct+indirect), supervisor display, inline edit (permissions), full-record modal edit.
- Work Location Templates: CRUD/apply; dashboard/cache refresh polish in progress.
- Staffing: assignments, capacity timeline, tenant-scoped assignment requests with approvals/inbox, CSV export, and admin/manager views.
- WBS/Projects: workflow, approvals, history, bulk operations.
- Hoteling: spaces/bookings with check-in UI.
- Resumes: CRUD + versions/approvals; needs thorough testing.
- Admin: user/tenant/role management, invitations, profile editing (searchable manager), groups for approvers, login reports.

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

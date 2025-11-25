# TODO - myScheduling

Focused, current backlog. Historical notes are in `docs/archive/`.

## Highest Priority
- Authorization coverage: add `[RequiresPermission]` to remaining controllers (WorkLocationPreferences, WBS, Facilities, Invitations, TenantMemberships, ResumeApprovals/Templates, Holidays, DelegationOfAuthority, Validation) and verify soft-delete/audit where applicable.
- Auth hardening: rotate JWT secrets per environment; consider refresh tokens/SSO/MFA (Entra ID) before production; ensure all identity is token-based (no header overrides).
- Automated tests: add backend xUnit/integration tests (auth, authorization, work locations, staffing, resumes) and frontend Vitest/Playwright coverage for critical flows.
- Manager data hygiene: prevent/clean cycles and invalid references; add validation in APIs when setting `managerId`.
- Storage revamp: implement Azure Blob-backed storage with configurable provider (Blob/Local), SAS upload flow, tenant prefixes, validation (type/size), and profile photo/document support. Keep room for future OCR/AI search (Azure AI Search + skillset) on documents.
  - Config knobs: `Storage:Mode` (Blob|Local), `Storage:ConnectionString` or `UseManagedIdentity`, `ContainerProfiles`, `ContainerDocuments`, `BaseUrl`, `MaxBytes`, `AllowedContentTypes`, `SasTtlMinutes`, `EnableCognitiveSearch`.
  - Abstraction: `IFileStorageService` with Blob + Local implementations; methods for upload (SAS or stream), delete, access URL.
  - Upload flow: issue SAS for client upload or stream through API; store metadata (blob URL/name, content type, size, tenantId, userId); generate thumb for images.
  - Serving: use SAS/private access unless content is public; refresh SAS as needed.
  - Validation: enforce type/size, tenant ownership; optional AV scanning hook.
  - Future AI/OCR: wire Azure AI Search/skillset on `ContainerDocuments`, index text/metadata per tenant.
- Staffing enhancements (in progress)
  - Assignment requests: persisted with approvals/inbox; remaining: status transitions, approvals audit trail, direct booking option for staffing managers, notifications.
  - Project/WBS approvers: approver groups added; TODO: enforce active users, support multiple approvers (user/group), and expose selections in project UI.
  - Staffing admin page: manage all assignments with filters, bulk actions, and export; avoid loading entire set on employee page.
  - Project/WBS view: show project with child WBS, and all assignments grouped by WBS; add approver display and request/booking entry points.
  - Timeline/Gantt: improve styling and performance; show project/WBS spans; allow zoom to 6/12 months; include utilization heat/overlay.
  - Permissions: add 'Staffing Master Data Management' role/permission to secure project/WBS admin endpoints.

## Feature Polish & Bugs
- Work Location Templates: ensure apply/refresh updates the dashboard/calendar reliably; cover with tests.
- Resumes: complete end-to-end testing for creation/editing/approvals and document export gap.
- Staffing: refine capacity view and requests; handle missing IDs/dates gracefully (in progress).
- Profile/people: finish inline vs full-edit flows; ensure manager changes persist and are reflected in team filters.

## Operational/Quality
- Observability: add structured logging/metrics/traces; better error handling and user-friendly errors.
- Performance: review N+1 query hot spots; add DB indexes for frequent filters.
- Storage: implement real profile photo storage (Azure Blob/S3) and cleanup flow.
- Notifications: implement invitation/workflow email delivery.

## Future/Backlog
- SSO/Entra ID integration.
- Advanced reporting/analytics (staffing/utilization/work-location).
- Hoteling check-in (mobile) and floorplan visualization.
- Admin configuration portal (system settings, integrations, branding).

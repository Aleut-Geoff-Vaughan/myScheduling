# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

myScheduling is an enterprise staffing and work-location management application with hoteling, WBS workflow, resumes, and multi-tenant RBAC.

## Architecture

- **Backend**: .NET 8 Web API with Entity Framework Core, PostgreSQL database
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router, Zustand
- **Auth**: JWT bearer tokens with bcrypt password hashing, `[RequiresPermission]` attribute-based authorization
- **Database**: Azure PostgreSQL (dev), SQLite supported for local testing

## Project Structure

```
backend/
  src/
    MyScheduling.Api/        # Web API, Controllers, Program.cs
    MyScheduling.Core/       # Domain models, interfaces
    MyScheduling.Infrastructure/  # EF Core, repositories, services
frontend/
  src/
    components/    # Reusable UI components
    pages/         # Route pages
    services/      # API client services
    stores/        # Zustand state stores
    hooks/         # Custom React hooks
    types/         # TypeScript type definitions
docs/archive/      # Historical documentation
scripts/           # Utility and seeding scripts
```

## Common Commands

### Backend (.NET)
```bash
cd backend/src/MyScheduling.Api
dotnet restore                           # Restore packages
dotnet build                             # Build solution
dotnet run --urls http://localhost:5107  # Run API on port 5107
```

### Frontend (React/Vite)
```bash
cd frontend
npm install                              # Install dependencies
npm run dev                              # Start dev server on port 5173
npm run build                            # Production build (includes tsc)
npm run lint                             # ESLint
```

### Full Stack Development
Start backend first, then frontend with proxy:
```bash
# Terminal 1: Backend
cd backend/src/MyScheduling.Api && dotnet run --urls http://localhost:5107

# Terminal 2: Frontend (proxies /api to backend)
cd frontend && VITE_API_PROXY_TARGET=http://localhost:5107 npm run dev
```

## Key Patterns

### Backend
- Controllers use `[RequiresPermission("PermissionName")]` for authorization
- Multi-tenant: JWT claims carry `tenantId`, enforced in service layer
- Services in Infrastructure project, interfaces in Core project
- EF Core with PostgreSQL; migrations in Infrastructure

### Multi-Tenant ID Pattern (IMPORTANT)
When writing controller endpoints that need tenant context:

1. **JWT Claim Name**: The claim is `TenantId` (PascalCase), NOT `tenant_id`
2. **Frontend Header**: Frontend sends `X-Tenant-Id` header via `api-client.ts`
3. **Recommended Pattern**: Check header first, fall back to JWT claims

```csharp
// For controllers inheriting AuthorizedControllerBase, use:
var tenantIds = GetUserTenantIds();  // Returns List<Guid> from "TenantId" claims

// For standalone controllers, implement this helper:
private Guid? GetCurrentTenantId()
{
    // Check X-Tenant-Id header first (set by frontend when workspace selected)
    if (Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId) &&
        Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderTenantId))
    {
        // Verify user has access to this tenant
        var userTenantIds = User.FindAll("TenantId")
            .Select(c => Guid.TryParse(c.Value, out var tid) ? tid : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToList();
        if (userTenantIds.Contains(parsedHeaderTenantId))
            return parsedHeaderTenantId;
    }
    // Fallback to first TenantId claim
    var tenantIdClaim = User.FindFirst("TenantId")?.Value;
    if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var parsedTenantId))
        return parsedTenantId;
    return null;
}

// Usage in endpoint:
var tenantId = GetCurrentTenantId();
if (!tenantId.HasValue)
    return BadRequest(new { message = "Invalid tenant context" });
```

Reference implementations:
- `AuthorizedControllerBase.cs` - base class with tenant helpers
- `RequiresPermissionAttribute.cs` - shows X-Tenant-Id header handling
- `StaffingReportsController.cs` - example of GetCurrentTenantId() pattern

### Frontend
- API calls via Axios in `services/` directory
- State management with Zustand stores in `stores/`
- Data fetching with TanStack Query (React Query)
- Routing with React Router v7
- Styling with Tailwind CSS utility classes

### Roles
Employee, ViewOnly, TeamLead, ProjectManager, ResourceManager, OfficeManager, TenantAdmin, Executive, OverrideApprover, ResumeViewer, FinanceLead, SystemAdmin, Support, Auditor

## Forecast Module Features

### Fiscal Year / Calendar Year Toggle
- Configurable fiscal year start month (default: October for federal)
- Toggle between FY and CY views in forecast screens
- Settings in `TenantSettings.FiscalYearStartMonth` and `FiscalYearPrefix`
- Frontend hook: `useFiscalYear()` in `hooks/useFiscalYear.ts`

### Working Days Calculation
- Calculates business days minus weekends, holidays, and PTO
- Backend service: `WorkingDaysService` with memory caching
- API endpoint: `GET /api/workingdays/{year}/{month}`
- Tenant settings: `StandardHoursPerDay`, `ExcludeSaturdays`, `ExcludeSundays`, `DefaultPtoDaysPerMonth`

### Non-Labor Cost Types & Forecasting
- Cost categories: Travel, Meals, Equipment, Supplies, Subcontracts, Training, Communications, Facilities, Other
- Entities: `NonLaborCostType`, `NonLaborForecast`, `NonLaborBudgetLine`
- API: `NonLaborCostsController` at `/api/non-labor-costs`
- Frontend:
  - Management: `/forecast/settings` (Non-Labor Cost Types section)
  - Forecasting: `NonLaborCostsGrid` component on project forecast pages
  - Hooks: `useNonLaborCostTypes`, `useNonLaborForecasts` in `hooks/useNonLaborCosts.ts`

### Employee Loaded Cost Rates (LCR)
- Simple $/hour rate with effective dates (no formula breakdown)
- Supports CSV import/export
- Entities: `EmployeeCostRate`, `CostRateImportBatch`
- API: `CostRatesController` at `/api/cost-rates`
- Frontend:
  - Management: `/forecast/cost-rates`
  - Hooks: `useCostRates`, `useImportCostRates`, `useExportCostRates` in `hooks/useCostRates.ts`

### CSV Import Format for Cost Rates
```csv
Email,EffectiveDate,LoadedCostRate,EndDate,Notes
john.doe@company.com,2025-01-01,125.50,2025-12-31,Annual rate
```

## Testing

### URLs
- Health check: `http://localhost:5107/health`
- Swagger: `http://localhost:5107/swagger`
- Frontend: `http://localhost:5173`
- Test account: `admin@admin.com`

### Automated Testing

#### Backend (xUnit) - 378 tests (359 passing, 19 skipped)
Test projects:
```
backend/tests/
  MyScheduling.Core.Tests/              # Domain model tests
  MyScheduling.Infrastructure.Tests/    # Service tests
    Services/WorkingDaysServiceTests.cs       # 13 tests - working days calculations
    Services/ImpersonationServiceTests.cs     # 15 tests - impersonation service
    Services/MagicLinkServiceTests.cs         # 18 tests - magic link auth
    Services/WorkflowNotificationServiceTests.cs  # Tests for workflow emails
  MyScheduling.Api.Tests/               # Controller & auth tests
    Auth/AuthControllerTests.cs         # 4 tests - login, token refresh, logout
    Auth/RequiresPermissionAttributeTests.cs  # 20 tests - authorization attribute
    MultiTenant/MultiTenantIsolationTests.cs  # 25 tests - tenant isolation
    MultiTenant/TenantIsolationIntegrationTests.cs  # Integration tests
    Controllers/
      ImpersonationControllerTests.cs   # 26 tests - impersonation endpoints
      TenantsControllerTests.cs         # 24 tests - tenant CRUD
      TenantMembershipsControllerTests.cs  # 28 tests - membership management
      UserInvitationsControllerTests.cs # 28 tests - invitation workflow
      WbsControllerTests.cs             # 37 tests - WBS CRUD, approval workflow
      FacilitiesPortalControllerTests.cs  # 41 tests - facilities dashboard, check-in
      LeasesControllerTests.cs          # 32 tests - lease management
      BookingsControllerTests.cs        # 30 tests - booking CRUD, conflicts
```

**Note:** Some tests are skipped due to InMemory database limitations:
- Transaction support (BeginTransactionAsync) not available
- DateOnly comparison issues in LINQ queries
- Different FK handling from real PostgreSQL database

Commands:
```bash
cd backend
dotnet test                          # Run all tests
dotnet test --collect:"XPlat Code Coverage"  # With coverage
```

#### Frontend (Vitest) - 155 tests
Test files:
```
frontend/src/
  stores/authStore.test.ts           # 18 tests - auth state management
  pages/LoginPage.test.tsx           # 28 tests - login page rendering
  components/ui/Button.test.tsx      # 25 tests - button variants, states
  components/ui/Modal.test.tsx       # 25 tests - modal behavior
  hooks/useFiscalYear.test.ts        # 36 tests - fiscal year calculations
  hooks/useWorkingDays.test.tsx      # 14 tests - working days hooks
```

```bash
cd frontend
npm run test                         # Run unit tests
npm run test:coverage                # With coverage
npm run test:ui                      # Interactive UI
```

#### E2E (Playwright) - 11 tests
Test files:
```
frontend/e2e/
  login.spec.ts                      # 11 tests - login page E2E
```

```bash
cd frontend
npx playwright test                  # Run all E2E tests
npx playwright test --ui             # Interactive mode
npx playwright show-report           # View results
npx playwright install               # Install browsers (first time)
```

#### Current Coverage
- **Total:** 533 tests (378 backend + 155 frontend) + 11 E2E
- **Backend:** 378 tests (359 passing, 19 skipped for InMemory DB limitations)
- **CI/CD:** Tests run on every push via GitHub Actions

## File Storage (Azure Blob)

### Implementation
- [AzureBlobStorageService.cs](backend/src/MyScheduling.Infrastructure/Services/AzureBlobStorageService.cs) - Azure Blob implementation
- [LocalFileStorageService.cs](backend/src/MyScheduling.Infrastructure/Services/LocalFileStorageService.cs) - Local dev fallback
- [FilesController.cs](backend/src/MyScheduling.Api/Controllers/FilesController.cs) - REST API (upload, list, download, delete)
- [IFileStorageService.cs](backend/src/MyScheduling.Core/Interfaces/IFileStorageService.cs) - Interface with versioning, search, SAS URLs
- Frontend: `fileStorageService.ts`, `useFileStorage.ts` hooks

### Configuration
- Environment variable: `AZURE_STORAGE_CONNECTION_STRING` (set in Azure App Service)
- Container: `myscheduling-files`
- Provider selection: `FileStorage:Provider` in appsettings.json ("AzureBlob" | "Local")

## Known Considerations

- Profile photo upload is stubbed (could use IFileStorageService)
- Review N+1 queries when modifying data access code

## Logging Configuration

### Backend Logging (Serilog)
Backend uses Serilog for structured logging:

```json
{
  "Serilog": {
    "MinimumLevel": { "Default": "Information" },
    "WriteTo": [
      { "Name": "Console" },
      { "Name": "File", "Args": { "path": "logs/myscheduling-.log", "rollingInterval": "Day" }}
    ]
  },
  "Logging": { "VerboseMode": false }
}
```

### Runtime Log Level Control
System administrators can toggle verbose logging at runtime:

```bash
# Get current config
GET /api/admin/logging/config

# Enable verbose mode
POST /api/admin/logging/verbose
{ "enabled": true }

# Set log level
POST /api/admin/logging/level
{ "level": "Debug" }  # Options: Verbose, Debug, Information, Warning, Error, Fatal
```

### Frontend Logging
Use `logger` from `services/loggingService.ts`:
- Configuration persisted in localStorage
- Verbose mode toggle via browser console:

```javascript
// Enable verbose logging
__mySchedulingLogger.enableVerbose()

// Disable verbose logging
__mySchedulingLogger.disableVerbose()

// Get log buffer for debugging
__mySchedulingLogger.getLogBuffer()
```

### Correlation IDs
- Frontend generates correlation ID per session
- Sent with every API request via `X-Correlation-Id` header
- Backend returns correlation ID in response headers
- Useful for tracing requests across frontend and backend logs

## Help System

### Backend Entity
`HelpArticle` entity for storing configurable help content:
- `ContextKey` - Page/route identifier (e.g., "work.staffing", "forecast.budgets")
- `Title`, `Description` - Display content
- `JiraArticleUrl` - Link to JIRA knowledge base article
- `VideoUrl`, `VideoTitle` - Link to video tutorials
- `ModuleName` - Module category (work, forecast, facilities, admin)
- `SortOrder`, `IsActive` - Display configuration

### API Endpoints
```bash
GET /api/helparticles?contextKey={key}     # Get help for current page
GET /api/helparticles/module/{name}        # Get all module help
GET /api/helparticles/search?query={q}     # Search help articles
POST/PUT/DELETE /api/helparticles          # Admin CRUD
```

### Frontend Components
- `HelpButton` - Header icon to open help panel
- `HelpPanel` - Slide-out panel with articles, videos, search
- `HelpContext` - Context provider for page-aware help
- Admin page at `/admin/help-articles` for content management

### JIRA Integration
Simple link approach - store JIRA URLs directly, open in new tab:
- Pattern: `https://{domain}.atlassian.net/wiki/spaces/{SPACE}/pages/{ID}`

## Database

Connection string format:
```
Host=myscheduling.postgres.database.azure.com;Port=5432;Database=myscheduling;Username=...;Password=...;SslMode=Require
```

Set via environment variable: `ConnectionStrings__DefaultConnection`

## Deployment & Secrets Management

### Local Development
- Secrets are stored in `appsettings.Development.json` (gitignored)
- `appsettings.json` contains empty placeholders - NEVER commit secrets to this file
- Copy values from Azure Portal or team password manager to your local Development file

### Azure App Service Configuration
Secrets are configured in **Azure Portal > App Services > myscheduling-api > Configuration > Application settings**.
Use double underscore (`__`) for nested .NET configuration keys:

| Setting Name | Description |
|--------------|-------------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `App__FrontendUrl` | Frontend URL for user-facing links (e.g., `https://myscheduling.aleutfederal.com`) |
| `AzureEmail__ConnectionString` | Azure Communication Services connection string |
| `AzureEmail__SenderAddress` | Email sender address (from Azure Communication Services) |
| `AzureEmail__SkipIfNotConfigured` | Set to `false` in production |

### GitHub Secrets (CI/CD)
Only these secrets are used by GitHub Actions workflows:

| Secret | Used By |
|--------|---------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Backend deploy to Azure App Service |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PROUD_OCEAN_0C7274110` | Frontend deploy to Azure Static Web Apps |
| `VITE_API_URL` | Frontend build - API base URL |

### GitHub Actions Workflows
- `.github/workflows/azure-backend-deploy.yml` - Deploys backend on push to `main` (backend/** path)
- `.github/workflows/azure-static-web-apps-proud-ocean-0c7274110.yml` - Deploys frontend on push to `main`

### Adding New Secrets
1. Add empty placeholder to `appsettings.json` (committed)
2. Add actual value to `appsettings.Development.json` (gitignored) for local dev
3. Add to Azure Portal App Service Configuration for production
4. Document in this section

## Kubernetes & Multi-Environment (PLANNED)

### Multi-Environment Database Strategy

| Environment | Database | Purpose |
|-------------|----------|---------|
| Development | SQLite | Local dev, no external deps |
| Test | Azure PostgreSQL | Dedicated test instance |
| Production | Azure PostgreSQL | Current prod database |

### Docker Configuration (PLANNED)
Backend Dockerfile location: `backend/Dockerfile`

```bash
# Build container locally
cd backend
docker build -t myscheduling-api .

# Run locally
docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development myscheduling-api
```

### Kubernetes Structure (PLANNED)
```
k8s/
  base/                    # Base manifests
    namespace.yaml
    backend-deployment.yaml
    backend-service.yaml
    configmap.yaml
    secrets.yaml
    ingress.yaml
    hpa.yaml
  overlays/                # Environment-specific overrides
    dev/
    test/
    prod/
  argo-rollouts/           # Canary deployment config
    backend-rollout.yaml
    analysis-template.yaml
```

### Canary Deployment Strategy
Using Argo Rollouts:
1. 5% traffic → 2 min pause → health check
2. 20% traffic → 5 min pause
3. 50% traffic → 5 min pause → health check
4. 100% traffic (full rollout)

Automatic rollback on:
- Health endpoint failure
- Error rate > 5%

### Cost Comparison

| Setup | Monthly Cost |
|-------|--------------|
| Current (App Service) | ~$25 |
| Azure Container Apps | ~$50 |
| AKS (full Kubernetes) | ~$119 |

**Recommendation:** Consider Azure Container Apps as middle ground before full AKS migration.

## Recent Completions (December 2025)

### Comprehensive Test Suite (December 2025)
- **Backend Tests (378 total, 359 passing, 19 skipped)**:
  - Auth & Authorization:
    - `RequiresPermissionAttributeTests.cs` - 20 tests for authorization attribute
    - `AuthControllerTests.cs` - 4 tests for login, token refresh, logout
    - `MultiTenantIsolationTests.cs` - 25 tests for tenant data isolation
    - `TenantIsolationIntegrationTests.cs` - Integration tests for tenant boundaries
  - Infrastructure Services:
    - `WorkingDaysServiceTests.cs` - 13 tests for working days calculations
    - `ImpersonationServiceTests.cs` - 15 tests for impersonation service
    - `MagicLinkServiceTests.cs` - 18 tests for magic link authentication
    - `WorkflowNotificationServiceTests.cs` - Workflow email notification tests
  - Controller Tests:
    - `ImpersonationControllerTests.cs` - 26 tests for impersonation endpoints
    - `TenantsControllerTests.cs` - 24 tests for tenant CRUD operations
    - `TenantMembershipsControllerTests.cs` - 28 tests for membership management
    - `UserInvitationsControllerTests.cs` - 28 tests for invitation workflow
    - `WbsControllerTests.cs` - 37 tests for WBS CRUD, approval workflow, bulk operations
    - `FacilitiesPortalControllerTests.cs` - 41 tests for facilities dashboard, analytics, check-in
    - `LeasesControllerTests.cs` - 32 tests for lease management, amendments, attachments
    - `BookingsControllerTests.cs` - 30 tests for booking CRUD, conflicts, soft delete
  - **Note:** 19 tests skipped due to InMemory database limitations (transactions, DateOnly comparisons, FK handling)
- **Frontend Tests (155 total)**:
  - `LoginPage.test.tsx` - 28 tests for login page rendering and behavior
  - `Button.test.tsx` - 25 tests for button variants, sizes, states
  - `Modal.test.tsx` - 25 tests for modal behavior, ConfirmDialog
  - `useFiscalYear.test.ts` - 36 tests for fiscal year calculations (October federal FY)
  - `useWorkingDays.test.tsx` - 14 tests for working days React Query hooks
  - `authStore.test.ts` - 18 tests for Zustand auth state
  - `authService.test.ts` - Auth service tests
  - `tenantsService.test.ts` - Tenant service tests
- **E2E Tests (Playwright)**:
  - `login.spec.ts` - 11 tests for login page E2E flows
  - Configured for Chromium, Firefox, WebKit browsers
  - Auto-starts dev server for CI

### Staffing Features (December 2025)
- Approver group admin UI per project/WBS
- Interactive timeline/Gantt for staffing requests
- Bulk assignment operations from admin page
- Direct booking option for staffing managers
- Workflow notification emails via Azure Communication Services

### Auth Hardening
- **Refresh Tokens**: Added secure refresh token mechanism with rotation on use
  - New `RefreshToken` entity with SHA256 hashing
  - Endpoints: `POST /api/auth/refresh`, `POST /api/auth/revoke`, `POST /api/auth/revoke-all`
  - 7-day expiration, automatic rotation, IP/user-agent tracking
- **Token-Based Identity**: Removed all `X-User-Id` header overrides
  - All identity now derived from JWT claims only
  - Updated `AuthController.ChangePassword` and `ImpersonationController`

### Code Cleanup
- **UsersController.cs**: Implemented proper BCrypt password verification with validation
- **UsersController.cs**: Implemented file deletion from storage when removing profile photos
- **ResumeTemplatesController.cs**: Implemented template preview with placeholder replacement
  - `RenderTemplate()` replaces `{{placeholder}}` tokens with sample data
  - `ExtractPlaceholders()` lists all available placeholders
- **AdminPage.tsx**: Connected security settings to tenant settings API
- **ResumeDetailPage.tsx**: Updated to use auth context for user ID

### WBS Improvements
- Transaction support in bulk operations
- N+1 query optimization
- PaginatedResponse moved to Core layer
- Database indexes for WBS queries
- Date range validation
- Pagination UI controls
- Bulk selection UI
- WBS Approval Queue page

### Enhanced Logging & Error Diagnostics (December 2025)

**Backend Correlation ID & Request Context:**
- `CorrelationIdMiddleware` - Extracts/generates `X-Correlation-Id` for distributed tracing
- `RequestLoggingMiddleware` - Pushes UserId, UserEmail, TenantId, ClientIp, RequestPath, RequestMethod to Serilog context for ALL logs
- `ApiErrorResponse.cs` - Standardized error DTO with `{ message, correlationId, errorCode, details }`
- `AuthorizedControllerBase` helpers: `CreateErrorResponse()`, `InternalServerError()`, `ForbiddenWithLog()`

**Security Audit Logging:**
- `TenantMembershipsController` - Full audit trail for create, update roles, update status, delete with before/after state
- `UsersController` - Hard delete logging with before-state snapshot
- `FilesController` - Authorization failure logging via `ForbiddenWithLog()`
- `MagicLinkService` - Suspicious pattern detection (IP tracking, token reuse attempts, IP change warnings)

**External Service Error Handling:**
- `AzureEmailService` - Retry with exponential backoff, detailed failure logging with duration/attempts
- `AzureBlobStorageService` - Azure SDK error handling
- `WorkflowNotificationService` - Batch error aggregation (X of Y emails failed)

**Frontend Service Layer Logging:**
- `authService.ts`, `resumeService.ts`, `forecastService.ts` - Error context with ApiError details
- `api-client.ts` - JSON parse error logging instead of swallowing
- Consistent pattern: `logXxxError()` helper functions with operation context

**Files Modified:**
- `RequestLoggingMiddleware.cs` - Query string logging with sensitive param redaction
- `TenantMembershipsController.cs` - AUDIT prefix logs for membership changes
- `UsersController.cs` - Try-catch on GetUserLogins, enhanced error context
- `FilesController.cs` - FileNotFoundException logging, ForbiddenWithLog usage

### CI/CD & Code Quality Fixes (December 2025)

**ESLint Build Fixes:**
- Moved `SortIcon` components outside render functions in SalesOps pages to avoid recreating on each render
- Added `eslint-disable` comments for legitimate `setState` in `useEffect` patterns (form initialization)
- Fixed JSX in try/catch block in `CustomFieldRenderer.tsx` by extracting JSON parsing outside JSX
- Wrapped async load functions with `useCallback` in resume components (`ApprovalWorkflow`, `ShareModal`, `TemplateManagement`, `VersionManagement`)
- Memoized opportunities arrays in SalesOps pages with `useMemo`

**Files Modified:**
- `SalesOpsAccountsPage.tsx`, `SalesOpsContactsPage.tsx`, `SalesOpsOpportunitiesPage.tsx`, `SalesOpsVehiclesPage.tsx` - SortIcon extraction
- `CustomFieldRenderer.tsx` - JSX try/catch fix
- `AdminPage.tsx`, `SalesOpsAccountFormPage.tsx` - setState eslint-disable comments

### Forecast Module Fixes (December 2025)

**Budget Hours Entry Fix:**
- `ProjectBudgetsController.cs` - Fixed `GetFiscalYearInfo` to return months array in `FiscalYearInfo` DTO
- Added `FiscalMonthInfo` class with `Year`, `Month`, `Label` properties
- Frontend `CreateBudgetPage.tsx` now properly receives month data for budget entry grid

### Facilities Module Enhancements (December 2025)

**Check-In Fix:**
- `FacilitiesPortalController.cs` - Fixed `GetCurrentUserId()` to check `ClaimTypes.NameIdentifier` claim first
- Resolves 400 error on `/api/facilities-portal/my-check-ins` endpoint

**Real-Time Analytics:**
- Added analytics endpoint: `GET /api/facilities-portal/analytics?days={days}&officeId={officeId}`
- New DTOs: `FacilitiesAnalytics`, `SpaceTypeStats`, `DailyTrendItem`, `TopOfficeItem`
- Returns: total check-ins/bookings, average daily metrics, occupancy percent, space breakdown, daily trends, top offices
- Frontend: `UsageAnalyticsPage.tsx` now fetches real data with date range (7d/30d/90d/1y) and office filters
- Service: `facilitiesPortalService.getAnalytics()` method added

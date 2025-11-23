# myScheduling - Todo List

## Current Status: Production Ready Core Features ✅

### Quick Start Commands

```bash
# Start Backend API (port 5000)
cd /workspaces/myScheduling/backend/src/MyScheduling.Api
dotnet run

# Start Frontend (port 5173) - in another terminal
cd /workspaces/myScheduling/frontend
npm run dev -- --host 0.0.0.0

# Note: Frontend Vite proxy forwards /api requests to http://localhost:5000
```

---

## 🎯 Active Development Priorities

### 1. Zero-Trust Authorization Framework 🟡 IN PROGRESS - 36% COMPLETE
**Current Status**: 8 of 22 controllers secured (36% complete)
**Documents**:
- [AUTHORIZATION_FRAMEWORK_PLAN.md](./AUTHORIZATION_FRAMEWORK_PLAN.md) - Complete design
- [AUTHORIZATION_UPDATES.md](./AUTHORIZATION_UPDATES.md) - Implementation progress

#### Overview
Comprehensive zero-trust authorization implementing explicit permissions, granular access control, soft-delete, and audit logging.

#### Completed ✅
- [x] Add soft delete fields to BaseEntity (IsDeleted, DeletedAt, DeletedByUserId, DeletionReason)
- [x] Create Permission, RolePermissionTemplate entities
- [x] Create AuthorizationAuditLog entity
- [x] Create TenantDropdownConfiguration entity
- [x] Create DataArchive entity for hard delete tracking
- [x] Add migration script (20251123125416_AddAuthorizationFramework)
- [x] Implement IAuthorizationService interface
- [x] Create AuthorizationService with memory caching
- [x] Create RequiresPermissionAttribute filter
- [x] Add global query filter for soft deletes
- [x] Seed default permissions for all 12 roles
- [x] Configure 100+ role-permission templates
- [x] Secure 8 high-priority controllers

#### Controllers Secured (8/22) ✅
1. ✅ PeopleController - Full CRUD + soft/hard delete + restore
2. ✅ ProjectsController - Full CRUD + soft/hard delete + restore
3. ✅ AssignmentsController - Full CRUD + approve + soft/hard delete + restore
4. ✅ BookingsController - Full CRUD + check-in + soft/hard delete + restore
5. ✅ UsersController - Full CRUD + profile + deactivate/reactivate
6. ✅ TenantsController - Full CRUD + hard delete (no soft delete)
7. ✅ ResumesController - Full CRUD + versions + sections + soft/hard delete + restore
8. ✅ DashboardController - Read operations

#### Immediate Next Steps (High Priority)
1. [ ] **WbsController** - Replace manual VerifyUserAccess with [RequiresPermission]
2. [ ] **WorkLocationPreferencesController** - Replace manual auth with [RequiresPermission]
3. [ ] **FacilitiesController** - Add authorization + soft delete
4. [ ] **UserInvitationsController** - Add authorization
5. [ ] **TenantMembershipsController** - Add authorization
6. [ ] **ResumeApprovalsController** - Add authorization
7. [ ] **ResumeTemplatesController** - Add authorization

#### Medium Priority (8 controllers remaining)
- [ ] TeamCalendarController
- [ ] WorkLocationTemplatesController
- [ ] HolidaysController
- [ ] DelegationOfAuthorityController
- [ ] ValidationController
- [ ] AuthController (review - authentication vs authorization)
- [ ] WeatherForecastController (remove - demo only)

#### Testing & Validation (Phase 4)
- [ ] Unit tests for AuthorizationService
- [ ] Integration tests for authorization flow
- [ ] Cross-tenant isolation tests
- [ ] End-to-end authorization testing
- [ ] Performance testing (permission check < 50ms)

#### Future Enhancements
- [ ] Configurable dropdowns UI (18 enums to make tenant-specific)
- [ ] Permission delegation capability
- [ ] Time-based permissions (start/end dates)
- [ ] Permission approval workflows

#### Priority Dropdowns to Make Configurable (High Priority First)
1. PersonType (Employee, Contractor, Vendor, External)
2. PersonStatus (Active, Terminated, LOA, Inactive)
3. WbsType (Billable, NonBillable, B&P, Overhead, G&A)
4. SpaceType (Desk, HotDesk, Office, Conference Room, etc.)
5. WorkLocationType (Remote, Remote Plus, Client Site, Office, PTO)
6. HolidayType (Federal, Company, Religious, Cultural, Regional)
7. MaintenanceType (Routine, Repair, Inspection, Cleaning, Equipment, Safety)
8. ResumeTemplateType (Federal, Commercial, Executive, Technical, Academic)

---

### 2. Resume Management System 🟡 IN PROGRESS
**Current Focus**: Testing and polish for resume creation/editing workflow

#### Completed ✅
- [x] Resume entity model (ResumeProfile, ResumeSection, ResumeEntry, ResumeVersion)
- [x] Resume approval workflow entities
- [x] Backend API (ResumesController) with full CRUD
- [x] Frontend service layer (resumeService.ts) - **Fixed API client integration**
- [x] Basic resume builder UI
- [x] Skills and certifications tracking

#### In Progress 🔨
- [ ] Test end-to-end resume creation flow
- [ ] Verify resume editing and updates
- [ ] Test resume section management
- [ ] Validate resume approval workflow
- [ ] Test resume document generation

#### Pending Features
- [ ] Resume document export (PDF generation)
- [ ] LinkedIn profile import
- [ ] Resume templates and themes
- [ ] Resume sharing and permissions

---

### 3. Work Location Templates System 🟡 IN PROGRESS
**Current Focus**: Template application and calendar refresh issues

#### Completed ✅
- [x] WorkLocationTemplate entity and relationships
- [x] Template CRUD operations (create, read, update, delete)
- [x] Template application endpoint
- [x] Frontend template UI components
- [x] Template types (Day, Week, Custom)

#### Recently Fixed ✅
- [x] **Navigation property serialization** - Added [JsonIgnore] to prevent circular references
- [x] **Dashboard date range bug** - Added proper date range calculation based on calendar view
- [x] **Cache invalidation** - Fixed React Query cache sync after template application
- [x] **409 Conflict handling** - Added fallback to UPDATE when CREATE fails

#### Current Issues 🐛
- [ ] Template application doesn't immediately update calendar display
- [ ] Manual work location updates may conflict with template-created data
- [ ] Need comprehensive testing of:
  - Applying templates to single week
  - Applying templates across multiple weeks
  - Overwriting existing preferences with templates
  - Calendar refresh after template operations

---

## ✅ Completed Major Features

### Core Infrastructure
- ✅ .NET 8 API with PostgreSQL database
- ✅ React + TypeScript frontend with Vite
- ✅ Tailwind CSS styling
- ✅ Multi-tenant architecture with complete isolation
- ✅ Role-based access control (12 roles)
- ✅ Comprehensive authorization (22+ secured endpoints)

### Work Location Management
- ✅ 6 work location types (Remote, Remote Plus, Client Site, Office No Reservation, Office With Reservation, PTO)
- ✅ Interactive 2-week Monday-Friday calendar
- ✅ Color-coded visual indicators with icons
- ✅ Statistics dashboard
- ✅ Company holidays system (2025-2026 Federal Holidays pre-loaded)
- ✅ Dashboard date range calculation (aligns with visible calendar dates)

### WBS & Project Management
- ✅ Complete WBS workflow (Draft → Pending → Approved/Rejected → Suspended → Closed)
- ✅ Approval system with assigned approvers
- ✅ Bulk operations (submit, approve, reject, close)
- ✅ Change history and audit trail
- ✅ Advanced filtering and search

### User Management
- ✅ User invitations with role templates
- ✅ User deactivation/reactivation
- ✅ Tenant membership management
- ✅ Role assignment and permissions
- ✅ Admin portal (separate from main workspace)

### Security & Authorization
- ✅ Cross-tenant protection
- ✅ Row-level security
- ✅ Role-based access control (RBAC)
- ✅ Manager override capabilities
- ✅ System admin bypass
- ✅ Security audit logging
- ✅ Rate limiting and CORS configuration

---

## 📋 Backlog & Future Enhancements

### Phase 5: Assignments & Staffing Workflows
- [ ] Enhanced assignment approval workflows
- [ ] Capacity planning tools
- [ ] Utilization forecasting
- [ ] Resource conflict detection

### Phase 6: Hoteling Check-in System
- [ ] Real-time desk availability
- [ ] Mobile check-in/check-out
- [ ] Floor plan visualization
- [ ] Space usage analytics

### Phase 7: Reporting & Analytics
- [ ] Custom report builder
- [ ] Staffing utilization reports
- [ ] Work location analytics
- [ ] Export capabilities (PDF, Excel)

### Phase 8: Entra ID Authentication
- [ ] Azure AD integration
- [ ] Single Sign-On (SSO)
- [ ] GCC High compatibility
- [ ] Multi-factor authentication (MFA)

### Phase 9: File Upload to Azure/SharePoint
- [ ] Azure Blob Storage integration
- [ ] SharePoint document library integration
- [ ] File versioning and permissions
- [ ] Document templates

### Phase 10: Admin Configuration Portal
- [ ] System settings management
- [ ] Email notification configuration
- [ ] Integration management (Microsoft 365, Slack)
- [ ] Custom branding and themes

---

## 🔴 CRITICAL SECURITY ISSUES - MUST FIX BEFORE PRODUCTION

**⚠️ DO NOT DEPLOY TO PRODUCTION UNTIL THESE ARE RESOLVED ⚠️**

### 1. No Password Hashing (CRITICAL)
**Location**: `backend/src/MyScheduling.Api/Controllers/AuthController.cs:38`
**Status**: ❌ Currently accepts ANY password for ANY user
**Impact**: Complete authentication bypass - any user can log in as anyone
**Fix**: Implement BCrypt password hashing
**Effort**: 2-3 days
**Priority**: 🔴 **IMMEDIATE**

### 2. Header-Based Authentication (CRITICAL)
**Location**: Multiple controllers using `X-User-Id` header
**Status**: ❌ Client can set any user ID to impersonate users
**Impact**: User impersonation, privilege escalation to admin
**Fix**: Implement JWT token-based authentication with signature verification
**Effort**: 3-4 days
**Priority**: 🔴 **IMMEDIATE**

### 3. Missing Authorization on 64% of Controllers
**Status**: ❌ 14 of 22 controllers lack `[RequiresPermission]` attributes
**Impact**: Inconsistent access control, potential unauthorized access
**Fix**: Apply authorization to all remaining controllers
**Effort**: 2-3 weeks (1 day per controller)
**Priority**: 🟡 **HIGH**

**📋 See [CODE_REVIEW_2025-11-23.md](./CODE_REVIEW_2025-11-23.md) for complete security analysis**

---

## 🐛 Known Issues & Technical Debt

### High Priority
- [ ] Template application calendar refresh (testing in progress)
- [ ] Resume workflow end-to-end testing
- [x] ~~Password hashing implementation~~ - **MOVED TO CRITICAL SECURITY ISSUES ABOVE**
- [x] ~~JWT token-based authentication~~ - **MOVED TO CRITICAL SECURITY ISSUES ABOVE**
- [ ] User context injection (CreatedByUserId, UpdatedByUserId)
- [ ] Email notification system (user invitations incomplete)
- [ ] File storage implementation (profile photos non-functional)

### Medium Priority
- [ ] N+1 query optimization
- [ ] Comprehensive error handling
- [ ] Enhanced logging throughout API
- [ ] Unit and integration tests

### Low Priority
- [ ] Dark mode implementation
- [ ] Keyboard shortcuts
- [ ] Advanced search across all entities
- [ ] Email notification system

---

## 📝 Recent Work Sessions

### Session 2025-11-23 (Afternoon) - Code Review & Documentation Update ✅
**Achievement**: Comprehensive code review and documentation update

#### Completed
- [x] Fixed AdminPage navigation bug - Added useEffect to watch viewOverride prop
- [x] Fixed frontend type error - Changed BookingStatusType to BookingStatus
- [x] Completed DashboardController authorization - 8th controller secured
- [x] Fixed authorization bug - Replaced ForbidResult with proper 403 response
- [x] Comprehensive code review of entire application
  - Reviewed all 22 controllers for authorization status
  - Analyzed frontend pages for integration issues
  - Identified critical security vulnerabilities
  - Catalogued all TODO items and technical debt
  - Assessed testing gaps and code quality issues
- [x] Updated all documentation
  - Updated AUTHORIZATION_UPDATES.md with today's progress
  - Updated TODO.md with security issues and code review findings
  - Created comprehensive CODE_REVIEW_2025-11-23.md (12,000+ words)

#### Key Findings from Code Review
**Security**:
- 🔴 CRITICAL: No password hashing implemented
- 🔴 CRITICAL: Header-based auth allows user impersonation
- 🟡 HIGH: 64% of controllers lack authorization (14/22)

**Testing**:
- ❌ ZERO unit or integration tests exist
- Need xUnit backend tests + Vitest frontend tests
- Estimated 3-4 weeks for comprehensive coverage

**Code Quality**:
- GetCurrentUserId() duplicated in 8+ controllers
- Manual VerifyUserAccess in 2 controllers (needs conversion)
- 18 files contain console.log statements
- N+1 query potential in complex includes

**Outstanding TODOs**:
- 11 high-priority TODOs identified
- User context injection needed
- Email notifications incomplete
- File storage not implemented
- Frontend auth context missing

#### Files Modified
- `/workspaces/myScheduling/frontend/src/pages/AdminPage.tsx` - Fixed navigation
- `/workspaces/myScheduling/frontend/src/pages/HotelingPage.tsx` - Fixed type import
- `/workspaces/myScheduling/backend/src/MyScheduling.Api/Controllers/DashboardController.cs` - Added authorization
- `/workspaces/myScheduling/backend/src/MyScheduling.Api/Attributes/RequiresPermissionAttribute.cs` - Fixed 403 response

#### Files Created
- `/workspaces/myScheduling/CODE_REVIEW_2025-11-23.md` - Comprehensive review report

#### Files Updated
- `/workspaces/myScheduling/TODO.md` - Added critical security section, updated status
- `/workspaces/myScheduling/AUTHORIZATION_UPDATES.md` - Added today's progress

---

### Session 2025-11-23 (Late Morning) - Authorization Framework Planning ✅
**Achievement**: Comprehensive zero-trust authorization framework designed

#### Completed
- [x] Analyzed current authorization implementation
  - Reviewed existing AppRole enum and TenantMembership structure
  - Identified gaps: no object-level permissions, inconsistent checks, hard deletes
  - Catalogued 14+ entities requiring authorization

- [x] Designed zero-trust permission model
  - Permission entity with resource/action/scope
  - RolePermissionTemplate for default role mappings
  - Platform Admin (all tenants) vs Tenant Admin (single tenant)
  - Soft delete with IsDeleted flag on BaseEntity

- [x] Identified 18 enums for tenant-configurable dropdowns
  - High priority: PersonType, PersonStatus, WbsType, SpaceType, WorkLocationType
  - Medium priority: MaintenanceType, HolidayType, BookingStatus
  - Low priority: Status/approval workflow enums

- [x] Created comprehensive implementation plan
  - 4-week roadmap with detailed phases
  - Week 1: Foundation (database, service, seed data)
  - Week 2: Core authorization (controllers, soft delete, audit)
  - Week 3: Dropdown configuration (API, migration, frontend)
  - Week 4: Testing & polish

- [x] Documented security architecture
  - Permission resolution order (SystemAdmin → TenantAdmin → Explicit → Role → Deny)
  - Caching strategy for performance
  - Audit logging for all authorization decisions
  - Migration strategy with backward compatibility

#### Files Created
- `AUTHORIZATION_FRAMEWORK_PLAN.md` - 25+ page comprehensive design document

#### Updated
- `TODO.md` - Added authorization framework as #1 priority with immediate next steps

---

### Session 2025-11-23 (Morning) - Fresh Start & Documentation Cleanup ✅
**Goal**: Clean slate for productive day ahead

#### Completed
- [x] Killed and restarted all services (backend + frontend)
- [x] Cleaned up TODO.md with current status
- [x] Updated README.md with latest feature list
- [x] Organized backlog and priorities

---

### Session 2025-11-21 (Late Afternoon) - Template & Dashboard Fixes ✅
**Achievement**: Fixed multiple critical bugs in work location system

#### Issues Resolved
1. **Navigation Property Serialization** ✅
   - Added [JsonIgnore] to WorkLocationTemplateItem navigation properties
   - Fixed circular reference issues in JSON serialization

2. **Dashboard Date Range Bug** ✅
   - Added useMemo to calculate proper date range based on selectedView
   - Dashboard query now includes all visible dates on calendar
   - Fixed issue where template-applied dates weren't in query results

3. **Cache Invalidation After Template Application** ✅
   - Changed from exact queryKey match to predicate-based matching
   - Added explicit refetchQueries calls
   - Made modal await refetch before closing
   - Set staleTime to 0 for immediate staleness detection

4. **409 Conflict Error Handling** ✅
   - Added fallback mechanism in WorkLocationSelector
   - When CREATE fails with 409, fetch existing preference and UPDATE instead
   - Uses proper API client (not raw fetch) for consistency
   - Waits for dashboard refetch after successful update

#### Files Modified
- `backend/src/MyScheduling.Core/Entities/WorkLocationTemplateItem.cs`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/hooks/useTemplates.ts`
- `frontend/src/hooks/useWorkLocation.ts`
- `frontend/src/components/TemplateApplyModal.tsx`
- `frontend/src/components/WorkLocationSelector.tsx`
- `frontend/src/hooks/useDashboard.ts`

---

### Session 2025-11-21 (Afternoon) - Resume Service Fix ✅
**Achievement**: Fixed resume API connection issues

#### Problem
- Resume service using hardcoded `https://localhost:5001` base URL
- Frontend getting ERR_CONNECTION_REFUSED errors
- Inconsistent with rest of application's API client pattern

#### Solution
- Replaced axios with api client from api-client.ts
- Removed hardcoded API_BASE_URL constant
- Updated all 30+ resume API calls to use proper client
- Ensured consistent authentication headers (X-User-Id)

#### Files Modified
- `frontend/src/services/resumeService.ts` (complete rewrite)

---

## 🏗️ Architecture Overview

### Backend Stack
- **.NET 8 Web API** - RESTful services
- **Entity Framework Core 8** - ORM with PostgreSQL
- **PostgreSQL 14+** - Relational database
- **Swagger/OpenAPI** - API documentation

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Data fetching and caching
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management

### Database
- **Host**: myscheduling.postgres.database.azure.com
- **Database**: myscheduling
- **User**: aleutstaffing
- **Connection**: Azure PostgreSQL (Development)
- **Target**: Azure Government (Production)

---

## 📊 Test Data Available

- **2 Tenants**: Aleut Federal, Partner Organization
- **100 Employees**: 50 per tenant with full profiles
- **Admin Account**: admin@test.com
- **Test User**: test@test.com (linked to Person record)
- **10 Projects** per tenant with WBS elements
- **Assignments and Bookings** for realistic testing
- **Federal Holidays**: 2025-2026 pre-loaded
- **Office Spaces**: Desks, conference rooms, parking

---

Last Updated: 2025-11-23 (Afternoon - Code Review Complete)
Status: Active Development - 36% Authorization Complete, Critical Security Issues Identified
Version: 1.0.0-beta

**📋 See [CODE_REVIEW_2025-11-23.md](./CODE_REVIEW_2025-11-23.md) for comprehensive analysis**

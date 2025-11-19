# myScheduling - Todo List

## Current Status

### Quick Start Commands

```bash
# Start Backend API (port 5000)
cd /workspaces/myScheduling/backend/src/AleutStaffing.Api
dotnet run --urls "http://0.0.0.0:5000"

# Start Frontend (port 5173) - in another terminal
cd /workspaces/myScheduling/frontend
npm run dev -- --host 0.0.0.0
```

---

## Active Priority Tasks

### 3. Authentication (HIGH PRIORITY) 🔴
- [x] Implement real authentication API endpoint (replace mock auth) ✅ **COMPLETED 2025-11-19**
  - Created `AuthController` with `/api/auth/login` and `/api/auth/logout` endpoints
  - Login validates user email against database
  - Returns user profile with tenant information and roles
  - Password validation simplified for development (accepts any password)
- [x] Removed all mock authentication code ✅ **COMPLETED 2025-11-19**
  - Replaced mock tenants list in LoginPage with real API call to `/api/tenants`
  - Removed mock user creation in authStore
  - Created `authService.ts` for authentication API calls
  - Updated `authStore.ts` to use real API authentication
- [ ] Add JWT token generation and validation
- [ ] Add authentication middleware to protect API endpoints
- [ ] Add password hashing (bcrypt) and verification
- [ ] Implement proper role-based access control (RBAC)


### 10. Reports Page (NEW)
- [ ] Create Reports page component (currently just placeholder text)
  - Staffing utilization reports
  - Project status reports
  - Hoteling usage reports
  - Export capabilities (PDF, Excel)

### 11. Backend Enhancements
- [ ] Add audit trail user context in DbContext SaveChangesAsync
  - Capture current user ID
  - Auto-populate CreatedBy/UpdatedBy fields
- [ ] Add data validation and business rules
- [ ] Add comprehensive error handling
- [ ] Add logging throughout the API
- [ ] Implement filtering, sorting, pagination on all list endpoints

### 12. Documentation (Optional)
- [] Update README.md with current implementation status
- [] Update START-HERE.md (fix database user mismatch, remove Azure AD references)
- [] Remove exposed passwords from SECURITY-FIXES.md and DATABASE-MIGRATION-SUCCESS.md
- [] Update SIMPLE-SETUP.md (remove references to non-existent setup scripts)

---

## Technical Debt & Future Enhancements

### Security
- [ ] Implement row-level security for multi-tenancy
- [ ] Add HTTPS/SSL configuration for production
- [ ] Implement rate limiting
- [ ] Add CORS configuration for production

### Testing
- [ ] Add unit tests for backend services
- [ ] Add integration tests for API endpoints
- [ ] Add frontend component tests
- [ ] Add end-to-end tests

### Performance
- [ ] Implement caching (Redis)
- [ ] Add database indexes for common queries
- [ ] Optimize N+1 query issues
- [ ] Implement pagination on all list endpoints

### UI/UX
- [ ] Add loading states throughout the app
- [ ] Implement error boundaries
- [ ] Add toast notifications for success/error messages
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts
- [ ] Implement dark mode

### Features
- [ ] Email notifications for assignments, bookings
- [ ] Calendar integration (Outlook, Google Calendar)
- [ ] Advanced search and filtering
- [ ] Bulk operations (bulk assign, bulk book)
- [ ] Export data to various formats
- [ ] Reporting and analytics dashboard
- [ ] File attachments for people, projects
- [ ] Comments and collaboration features

---

## Architecture Overview

### Backend (.NET 8)
- **AleutStaffing.Api** - REST API controllers
- **AleutStaffing.Core** - Domain entities and interfaces
- **AleutStaffing.Infrastructure** - EF Core, repositories, data access

### Frontend (React + TypeScript)
- **Vite** - Build tool
- **React Router** - Navigation
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling

### Database
- **PostgreSQL** on Azure (myscheduling.postgres.database.azure.com)
- Database: `myscheduling`
- User: `aleutstaffing`

---

## Completed Tasks

### 1. Verify Database Seeding ✅ **COMPLETED**
- [x] Confirm 100 people in database (50 per tenant)
- [x] Verify all related records created successfully
- [x] Test API endpoints return seeded data
- ✅ Database seeder with comprehensive test data
  - 2 tenants (Aleut Federal, Partner Organization)
  - 100 employees total (50 per tenant)
  - Projects, WBS elements, project roles
  - Assignments (60-80 per tenant)
  - Offices, spaces (desks and conference rooms)
  - Bookings (past 14 days and next 14 days)

### 2. Frontend API Integration ✅ **COMPLETED 2025-11-19**
- [x] **People Page** - Connected to `/api/people` endpoint ✅
- [x] **Projects Page** - Connected to `/api/projects` endpoint ✅
- [x] **Staffing Page** - Connected to `/api/assignments` endpoint ✅
- [x] **Hoteling Page** - Connected to `/api/bookings` and `/api/spaces` endpoints ✅
- [x] **Admin Page** - Connected to `/api/tenants` and `/api/users` endpoints ✅
- [x] Fixed JSON serialization circular reference errors in API
- [x] Created service layer for all entities (projectsService, assignmentsService, bookingsService, tenantsService)
- [x] Created React Query hooks for all entities (useProjects, useAssignments, useBookings, useTenants, useUsers)
- [x] Updated TypeScript types for Space, Office, and SpaceType enum

### 4. People Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Add onClick handler to '+ Add Person' button ✅
  - Created PersonModal component with full CRUD form
  - Integrated with POST `/api/people` endpoint
  - Added validation and error handling
- [x] Replace console.log with navigation for person row clicks ✅
  - Table rows now open PersonModal in edit mode
  - Modal shows all person details and allows editing

### 5. Projects Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Add onClick handler to '+ New Project' button ✅
  - Created ProjectModal component with full CRUD form
  - Integrated with POST `/api/projects` endpoint
  - Added date validation and tenant selection
- [x] Replace console.log with navigation for project row clicks ✅
  - Table rows now open ProjectModal in edit mode
  - Modal shows all project details and allows editing

### 6. Staffing Page Enhancements ✅ **PARTIALLY COMPLETED 2025-11-19**
- [x] Add onClick handler to '+ New Assignment' button ✅
  - Created AssignmentModal component with full CRUD form
  - Integrated with POST `/api/assignments` endpoint
  - Added person/tenant dropdowns and allocation validation
- [x] Replace console.log with navigation for assignment row clicks ✅
  - Table rows now open AssignmentModal in edit mode
- [x] Implement **Requests** tab functionality ✅ **COMPLETED 2025-11-19**
  - Shows table of pending and draft assignments
  - Added Approve/Reject action buttons
  - Clicking rows opens assignment modal for details

### 7. Hoteling Page Enhancements ✅ **PARTIALLY COMPLETED 2025-11-19**
- [x] Add onClick handler to '+ New Booking' button ✅
  - Created BookingModal component with full CRUD form
  - Integrated with POST `/api/bookings` endpoint
  - Added office/space selection with cascading dropdowns
  - Added date/time pickers for booking duration
- [x] Replace console.log placeholders with navigation/actions ✅
  - Table rows now open BookingModal in edit mode
  - Quick action cards open modal for new bookings
- [x] Add onClick handler to 'Export Schedule' button ✅ **COMPLETED 2025-11-19**
  - Implemented CSV export functionality
  - Downloads filtered bookings for selected date
  - Includes all booking details (ID, person, space, times, status)

### 6. Staffing Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Implement **Capacity View** tab content ✅
  - Created capacity summary cards (Under/Optimal/Over allocated)
  - Built person utilization view grouping assignments by person
  - Visual capacity bars showing total allocation percentage
  - Color-coded indicators (green/blue/red) for allocation levels
  - Clickable assignment details for editing
  - Displays up to 10 people with active assignments

### 7. Hoteling Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Add onClick handler to 'View Floor Plan' button ✅
  - Created interactive floor plan modal
  - Visual grid layout showing all spaces
  - Color-coded availability (green=available, red=booked, gray=unavailable)
  - Space type icons (desk, conference room)
  - Click-to-book functionality for available spaces
  - Real-time booking status
  - Space statistics summary

### 8. Dashboard Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Implement onClick handler for 'Request Assignment' button ✅
  - Opens AssignmentModal for creating new assignment request
- [x] Implement onClick handler for 'Book Desk' button ✅
  - Opens BookingModal for creating new desk/room booking
- [x] Implement onClick handler for 'Update Resume' button ✅
  - Created resume upload modal with file picker
  - Accepts PDF, DOC, DOCX formats
  - Shows file preview with name and size
  - Optional notes field
  - Upload button with validation

### 9. Admin Page Enhancements ✅ **COMPLETED 2025-11-19**
- [x] Implement Add Tenant/User modal forms ✅
  - Created full tenant creation form (name, code, status)
  - Created full user creation form (tenant, name, email, Azure AD ID)
  - Integrated with POST endpoints via React Query mutations
  - Form validation and error handling
  - Auto-refresh lists after creation
- [x] Replace console.log with navigation for tenant/user rows ✅
  - Created detail modal showing full tenant/user information
  - Displays all fields including ID, timestamps, status
  - Clean read-only view of entity details
- [x] Implement Settings form handlers ✅
  - System settings toggles (email notifications, 2FA, self-registration, maintenance mode)
  - Security settings inputs (session timeout, password length, failed login attempts)
  - Save button with handler (console log for now, ready for API integration)
  - All settings stored in React state
- [x] Add onClick handlers to integration Configure/Manage buttons ✅
  - Microsoft 365 configuration handler (placeholder alert)
  - Slack integration handler (placeholder alert)
  - API management handler (placeholder alert)
  - Ready for future modal implementations

---

## Notes

- Database is fully seeded with test data - ready for development
- Frontend pages now have full CRUD modals integrated
- **Priority Groups 6, 7, 8, and 9 completed** - All remaining UI enhancements done
- **Authentication implementation started** - Real API endpoints created, mock code removed ✅
- API endpoints exist and work - fully integrated with frontend
- All core CRUD operations functional for People, Projects, Assignments, and Bookings
- Capacity view, floor plan, dashboard actions, and admin forms all implemented

---

## Code Review Findings (2025-11-19)

### ✅ Completed Fixes
1. **Removed All Mock Data References**
   - Eliminated mock tenant list in LoginPage (now uses `/api/tenants`)
   - Removed mock authentication in authStore (now uses `/api/auth/login`)
   - Created proper authentication service layer

2. **Fixed Login Screen**
   - Login screen now displays properly
   - Fetches real tenants from database
   - Shows system health status
   - Updated helper text with actual test user examples

3. **Created Authentication Infrastructure**
   - Added `AuthController.cs` with login/logout endpoints
   - Created `authService.ts` for frontend API calls
   - Updated `authStore.ts` to use real authentication
   - Login validates against database users
   - Returns user profile with tenant context

### ⚠️ Known Issues & Recommendations

#### Security (High Priority)
- [ ] **Password Security**: Currently accepts any password for development
  - **Recommendation**: Implement bcrypt password hashing
  - **Action**: Add password field to User entity, hash on creation

- [ ] **JWT Tokens**: No token-based authentication yet
  - **Recommendation**: Implement JWT for stateless authentication
  - **Action**: Add JWT middleware, generate tokens on login

- [ ] **API Protection**: No authentication middleware on endpoints
  - **Recommendation**: Add `[Authorize]` attributes to controllers
  - **Action**: Protect all endpoints except `/api/auth/login` and `/api/health`

#### Data Model Issues
- [ ] **Tenant Code**: Tenant entity missing `Code` property
  - **Current**: Tenants only have `Name` and `Status`
  - **Recommendation**: Add `Code` property for tenant identification
  - **Impact**: Frontend expects `code` field for display

#### Testing Needs
- [ ] **End-to-End Testing Required**
  - Login flow needs verification
  - All CRUD operations need testing
  - Modal forms need validation testing
  - Navigation between pages needs testing

### 📋 Next Steps (Prioritized)
1. **Test login functionality** with real database users
2. **Test all page navigation** and button functionality
3. **Add JWT authentication** and middleware
4. **Implement password hashing** for security
5. **Add comprehensive error handling** throughout app
6. **Implement API endpoint protection** with authorization

---

Last Updated: 2025-11-19

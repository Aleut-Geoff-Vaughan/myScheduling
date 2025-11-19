# myScheduling - Todo List

## Current Status

### Completed
- ✅ Database schema created and migrated
- ✅ Backend API with People, Projects, Assignments, Bookings, Tenants, Users endpoints
- ✅ Frontend React application with all main pages (Dashboard, People, Projects, Staffing, Hoteling, Admin, Reports)
- ✅ Database seeder with comprehensive test data
  - 2 tenants (Aleut Federal, Partner Organization)
  - 100 employees total (50 per tenant)
  - Projects, WBS elements, project roles
  - Assignments (60-80 per tenant)
  - Offices, spaces (desks and conference rooms)
  - Bookings (past 14 days and next 14 days)

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

## Priority Tasks

### 1. Verify Database Seeding ✓
- [ ] Confirm 100 people in database (50 per tenant)
- [ ] Verify all related records created successfully
- [ ] Test API endpoints return seeded data

### 2. Frontend API Integration (HIGH PRIORITY)
- [ ] **People Page** - Connect to `/api/people` endpoint (currently using hook)
- [ ] **Projects Page** - Connect to `/api/projects` endpoint
- [ ] **Staffing Page** - Connect to `/api/assignments` and `/api/project-roles` endpoints
- [ ] **Hoteling Page** - Connect to `/api/bookings` and `/api/spaces` endpoints
- [ ] **Admin Page** - Connect to `/api/tenants` and `/api/users` endpoints

### 3. Authentication (HIGH PRIORITY)
- [ ] Implement real authentication API endpoint (replace mock auth)
- [ ] Add JWT token generation and validation
- [ ] Implement login/logout functionality
- [ ] Add authentication middleware to protect API endpoints
- [ ] Store tenant context from authenticated user

### 4. People Page Enhancements
- [ ] Add onClick handler to '+ Add Person' button
  - Create modal/form for adding new person
  - Integrate with POST `/api/people` endpoint
- [ ] Replace console.log with navigation for person row clicks
  - Create person detail page/modal
  - Show person details, assignments, bookings

### 5. Projects Page Enhancements
- [ ] Add onClick handler to '+ New Project' button
  - Create modal/form for adding new project
  - Integrate with POST `/api/projects` endpoint
- [ ] Replace console.log with navigation for project row clicks
  - Create project detail page
  - Show project WBS, roles, assignments

### 6. Staffing Page Enhancements
- [ ] Add onClick handler to '+ New Assignment' button
  - Create modal/form for creating assignment
  - Integrate with POST `/api/assignments` endpoint
- [ ] Replace console.log with navigation for assignment row clicks
  - Create assignment detail page/modal
- [ ] Implement **Capacity View** tab content
  - Create timeline/Gantt chart visualization
  - Show person utilization over time
  - Highlight over/under allocation
- [ ] Implement **Requests** tab functionality
  - Create request submission form
  - Show pending requests
  - Add approval workflow

### 7. Hoteling Page Enhancements
- [ ] Add onClick handler to '+ New Booking' button
  - Create booking form with space selection
  - Integrate with POST `/api/bookings` endpoint
- [ ] Add onClick handler to 'View Floor Plan' button
  - Create floor plan visualization
  - Show space availability
- [ ] Add onClick handler to 'Export Schedule' button
  - Implement CSV/Excel export
- [ ] Replace console.log placeholders with navigation/actions
  - Booking detail view
  - Edit/cancel booking

### 8. Dashboard Page Enhancements
- [ ] Implement onClick handler for 'Request Assignment' button
  - Open staffing request modal
- [ ] Implement onClick handler for 'Book Desk' button
  - Open hoteling booking modal
- [ ] Implement onClick handler for 'Update Resume' button
  - Upload resume document
  - Store in database or blob storage

### 9. Admin Page Enhancements
- [ ] Implement Add Tenant/User modal form (currently placeholder)
  - Create tenant form with validation
  - Create user form with role assignment
  - Integrate with POST endpoints
- [ ] Replace console.log placeholders with navigation for tenant/user rows
  - Tenant detail/edit page
  - User detail/edit page
- [ ] Implement Settings form handlers
  - Toggle switches onChange handlers
  - Input fields onChange handlers
  - 'Save Security Settings' button handler
  - Integrate with settings API endpoint
- [ ] Add onClick handlers to integration 'Configure/Manage' buttons
  - Azure AD configuration
  - SAP integration settings
  - SharePoint connection

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
- [ ] Update README.md with current implementation status
- [ ] Update START-HERE.md (fix database user mismatch, remove Azure AD references)
- [ ] Remove exposed passwords from SECURITY-FIXES.md and DATABASE-MIGRATION-SUCCESS.md
- [ ] Update SIMPLE-SETUP.md (remove references to non-existent setup scripts)

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

## Notes

- Database is fully seeded with test data - ready for development
- Frontend is partially integrated with backend (People page uses real API)
- Authentication is currently mocked - needs real implementation
- Most button handlers are console.log placeholders - need implementation
- API endpoints exist and work - just need frontend integration

---

Last Updated: 2025-11-19

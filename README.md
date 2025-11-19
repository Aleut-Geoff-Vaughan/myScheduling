# Aleut Federal Staffing & Hoteling Platform

A comprehensive web application for managing project staffing, resource allocation, and office hoteling for Aleut Federal.

## 🎯 Project Overview

This system provides:
- **Staffing Management**: Assign people to projects and WBS elements with approval workflows
- **Resource Forecasting**: Track utilization and capacity across the organization
- **Office Hoteling**: Book desks, rooms, and conference rooms with check-in tracking
- **Resume Management**: Database-driven employee profiles with skills and certifications
- **Audit Trail**: Complete history of all staffing decisions and assignments

## 🏗️ Architecture

### Tech Stack

**Backend**
- .NET 8 Web API
- Entity Framework Core 8
- PostgreSQL (via Npgsql)
- Swagger/OpenAPI

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router v6 (routing)
- TanStack Query (data fetching)
- Zustand (state management)

**Deployment** (Future)
- Azure Commercial (current development)
- Azure Government (production target)
- Entra ID GCC High (authentication target)

### Project Structure

```
/myScheduling
  /backend
    /src
      /AleutStaffing.Api          # Web API endpoints
      /AleutStaffing.Core         # Domain entities
      /AleutStaffing.Infrastructure  # Data layer, DbContext
  /frontend
    /src
      /components                 # Reusable UI components
      /pages                      # Page components
      /stores                     # Zustand state stores
```

## 🚀 Getting Started

### Prerequisites

- .NET 8 SDK
- Node.js 18+ and npm
- PostgreSQL 14+

### Backend Setup

1. **Start PostgreSQL** (or use Docker):
   ```bash
   docker run --name postgres-aleutstaffing -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
   ```

2. **Update connection string** (if needed) in [backend/src/AleutStaffing.Api/appsettings.json](backend/src/AleutStaffing.Api/appsettings.json)

3. **Run migrations**:
   ```bash
   cd backend/src/AleutStaffing.Api
   dotnet ef database update --project ../AleutStaffing.Infrastructure
   ```

4. **Start the API**:
   ```bash
   cd backend/src/AleutStaffing.Api
   dotnet run
   ```

   API will be available at: `http://localhost:5000`
   Swagger UI: `http://localhost:5000/swagger`

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

   Frontend will be available at: `http://localhost:5173`

3. **Login**: Use any email (password not validated in dev mode)

## 📊 Database Schema

### Core Entities

**Identity & Tenancy**
- `Tenant` - Multi-tenant isolation
- `User` - User accounts (linked to Entra ID)
- `RoleAssignment` - User role mappings

**People & Resume**
- `Person` - Employee/contractor records
- `ResumeProfile`, `ResumeSection`, `ResumeEntry` - Structured resumes
- `Skill`, `PersonSkill` - Skills tracking
- `Certification`, `PersonCertification` - Certifications

**Projects**
- `Project` - Programs and projects
- `WbsElement` - Work Breakdown Structure (charge codes)

**Staffing**
- `ProjectRole` - Open seats/roles on projects
- `Assignment` - Person assigned to role/WBS
- `AssignmentHistory` - Audit trail

**Hoteling**
- `Office`, `Space` - Physical locations
- `Booking` - Space reservations
- `CheckInEvent` - Check-in tracking

## 🔐 Security & Compliance

### Current State (Phase 1)
- Mock authentication (development only)
- Basic RBAC with Zustand
- CORS configured for local development

### Planned (Phase 2+)
- Entra ID OIDC integration
- JWT bearer token authentication
- Row-level security in PostgreSQL
- CMMC Level 2 / FedRAMP High alignment
- Comprehensive audit logging
- Separation of Duties (SoD) enforcement

## 📈 Development Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
- [x] .NET 8 API with PostgreSQL
- [x] Complete entity model (all domains)
- [x] EF Core migrations
- [x] React + TypeScript frontend
- [x] Tailwind CSS styling
- [x] Login page and dashboard shell
- [x] Protected routes
- [x] Navigation with role-based menu

### 🔄 Phase 2: Authentication & Multi-Tenancy (NEXT)
- [ ] Entra ID OIDC integration
- [ ] JWT authentication middleware
- [ ] Tenant isolation in data layer
- [ ] User profile management
- [ ] Role-based authorization policies

### 📋 Phase 3-12: Feature Modules
- Phase 3: People & Resume Module
- Phase 4: Projects & WBS Module
- Phase 5: Staffing - Role Management
- Phase 6: Staffing - Assignment Workflows
- Phase 7: Capacity Tracking & SoD
- Phase 8: Office Hoteling
- Phase 9: Reporting & Analytics
- Phase 10: Admin Configuration
- Phase 11: Polish & Optimization
- Phase 12: Testing & Documentation

## 🧪 Testing

### Backend
```bash
cd backend
dotnet test
```

### Frontend
```bash
cd frontend
npm run test
```

## 🛠️ API Endpoints (Planned)

```
GET  /api/health                    # Health check
GET  /api/tenants                   # List tenants
GET  /api/people                    # List people
POST /api/people                    # Create person
GET  /api/projects                  # List projects
POST /api/projects                  # Create project
GET  /api/projects/{id}/wbs         # Get WBS for project
POST /api/assignments/request       # Request assignment
POST /api/assignments/{id}/approve  # Approve assignment
GET  /api/offices                   # List offices
POST /api/bookings                  # Create booking
POST /api/bookings/{id}/checkin     # Check in to booking
GET  /api/reports/utilization       # Utilization report
```

## 📝 Environment Variables

**Backend** (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=aleutstaffing;Username=postgres;Password=postgres"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  }
}
```

**Frontend** (.env)
```
VITE_API_URL=http://localhost:5000
```

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests
4. Submit a pull request

## 📄 License

Copyright © 2025 Aleut Federal. All rights reserved.

## 🆘 Support

For issues or questions, contact the development team or create an issue in this repository.

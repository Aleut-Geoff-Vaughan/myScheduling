# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

This guide will get your development environment running quickly.

### Step 1: Start PostgreSQL

**Option A: Docker (Recommended)**
```bash
docker run --name postgres-aleutstaffing \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Local PostgreSQL**
- Ensure PostgreSQL is running on port 5432
- Create database: `createdb aleutstaffing`

### Step 2: Start the Backend API

```bash
# Navigate to API project
cd backend/src/AleutStaffing.Api

# Run database migrations
dotnet ef database update --project ../AleutStaffing.Infrastructure

# Start the API
dotnet run
```

✅ **Backend running at:** http://localhost:5000
✅ **Swagger UI at:** http://localhost:5000/swagger

### Step 3: Start the Frontend

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

✅ **Frontend running at:** http://localhost:5173

### Step 4: Login and Explore

1. Open http://localhost:5173 in your browser
2. **Login with any email** (e.g., `john.doe@aleutfederal.com`)
3. Password is not validated in development mode
4. Explore the dashboard and navigation

## 🎯 What You'll See

### Dashboard Features
- **Stats Cards**: Assignments, Projects, Capacity, Bookings (placeholder data)
- **Quick Actions**: Request assignment, book space, update resume
- **Navigation Menu**: People, Projects, Staffing, Hoteling, Reports
- **Role-Based Menu**: Items show/hide based on your assigned roles

### Current User Roles (Mock)
- Employee
- Project Manager

You can modify roles in [frontend/src/stores/authStore.ts](frontend/src/stores/authStore.ts:25)

## 🔍 Verify Everything Works

### Check Backend Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T23:00:00.000Z"
}
```

### Check Database Connection
```bash
cd backend/src/AleutStaffing.Api
dotnet ef dbcontext info --project ../AleutStaffing.Infrastructure
```

Should show PostgreSQL connection info.

### Check Frontend Build
```bash
cd frontend
npm run build
```

Should build without errors.

## 🛠️ Common Issues

### Port Already in Use

**Backend (5000)**
```bash
# Find process using port 5000
lsof -i :5000
# Kill it
kill -9 <PID>
```

**Frontend (5173)**
```bash
# Find process using port 5173
lsof -i :5173
# Kill it
kill -9 <PID>
```

### PostgreSQL Connection Failed

1. Check PostgreSQL is running: `docker ps` or `systemctl status postgresql`
2. Verify credentials in [backend/src/AleutStaffing.Api/appsettings.json](backend/src/AleutStaffing.Api/appsettings.json)
3. Try connecting with psql: `psql -h localhost -U postgres`

### Migration Errors

```bash
# Remove migrations and recreate
cd backend/src/AleutStaffing.Api
dotnet ef migrations remove --project ../AleutStaffing.Infrastructure
dotnet ef migrations add InitialCreate --project ../AleutStaffing.Infrastructure
dotnet ef database update --project ../AleutStaffing.Infrastructure
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

Once you're up and running:

1. **Explore the codebase:**
   - Backend entities: [backend/src/AleutStaffing.Core/Entities/](backend/src/AleutStaffing.Core/Entities/)
   - Frontend pages: [frontend/src/pages/](frontend/src/pages/)
   - Navigation layout: [frontend/src/components/layout/DashboardLayout.tsx](frontend/src/components/layout/DashboardLayout.tsx)

2. **Review the specification:** See main [README.md](README.md) for full architecture details

3. **Start Phase 2:** Begin implementing authentication with Entra ID

## 🆘 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the Phase 1 completion checklist
- Create an issue in the repository

---

**Happy Coding! 🎉**

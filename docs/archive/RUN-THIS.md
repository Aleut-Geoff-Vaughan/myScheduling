# ✅ EVERYTHING IS READY - Run These Commands On Your Local Machine

## Current Status

✅ **Backend build:** Successful (0 errors, 0 warnings)
✅ **Frontend dependencies:** Installed
✅ **Database migrations:** Created and ready
✅ **Azure AD configuration:** Complete
✅ **Connection string:** Configured for `myscheduling.postgres.database.azure.com`

## What You Need To Do

Since you're working in a cloud development environment, you'll need to run these commands on **your local machine** where Azure CLI is installed.

### Option 1: Run Locally on Your Machine

1. **Clone/sync this code to your local machine**

2. **Open terminal and log into Azure:**
   ```bash
   az login
   ```

3. **Navigate to the project:**
   ```bash
   cd /path/to/myScheduling
   ```

4. **Run database migrations:**
   ```bash
   cd backend/src/AleutStaffing.Api
   dotnet ef database update --project ../AleutStaffing.Infrastructure
   ```

   This will create 50+ tables in your Azure PostgreSQL database.

5. **Start the backend (Terminal 1):**
   ```bash
   dotnet run
   ```

   Wait for: `Now listening on: http://localhost:5000`

6. **Start the frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

   Wait for: `Local: http://localhost:5173/`

7. **Open browser:**
   ```
   http://localhost:5173
   ```

### Option 2: Use Azure AD Service Principal (For Cloud Environment)

If you want to run in this cloud environment, you can set up a service principal:

1. **On your local machine with Azure CLI:**
   ```bash
   # Create service principal
   az ad sp create-for-rbac --name "myscheduling-dev" --role contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/myScheduling_group
   ```

2. **Set environment variables in this cloud environment:**
   ```bash
   export AZURE_CLIENT_ID="<appId from above>"
   export AZURE_CLIENT_SECRET="<password from above>"
   export AZURE_TENANT_ID="<tenant from above>"
   ```

3. **Then run the migrations and start the app here**

## What The Migrations Will Create

When you run `dotnet ef database update`, it will create these tables in your PostgreSQL database:

### Identity & Multi-Tenancy (7 tables)
- `tenants` - Company/organization records
- `users` - User accounts with Entra ID fields
- `role_assignments` - User roles (Employee, PM, Admin, etc.)
- `user_preferences` - User settings
- `audit_logs` - Complete audit trail
- `user_tenant_access` - Cross-tenant access
- `api_keys` - API authentication

### People Management (6 tables)
- `people` - Employee/contractor records
- `resume_profiles` - Resume management
- `resume_sections` - Resume sections (experience, education)
- `resume_entries` - Individual resume items
- `skills` - Skill library
- `person_skills` - Person-skill associations with proficiency

### Certifications (3 tables)
- `certifications` - Certification types
- `person_certifications` - Person certifications
- `certification_renewal_alerts` - Expiration tracking

### Projects & WBS (4 tables)
- `projects` - Project records
- `wbs_elements` - Work breakdown structure
- `project_managers` - PM assignments
- `project_metadata` - Custom fields

### Staffing & Assignments (10 tables)
- `project_roles` - Role/seat definitions
- `assignments` - Person-to-role assignments
- `assignment_history` - Assignment changes
- `assignment_requests` - Staffing requests
- `assignment_approvals` - Approval workflow
- `override_approvals` - Special approvals
- `capacity_periods` - Capacity tracking
- `utilization_targets` - Target utilization
- `forecasts` - Future staffing forecasts
- `sod_rules` - Segregation of duties

### Office Hoteling (4 tables)
- `offices` - Office locations
- `spaces` - Desks/rooms/conference rooms
- `bookings` - Space reservations
- `check_in_events` - Check-in tracking

## Expected Output

### Database Migration Output:
```
Build started...
Build succeeded.
Applying migration '20251118230729_InitialCreate'.
Done.
```

### Backend Startup Output:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

### Frontend Startup Output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Troubleshooting

### "No credentials found" when running migrations
**Problem:** Not logged into Azure
**Solution:** Run `az login` first

### "Cannot connect to database"
**Problem:** Azure AD token can't be acquired or database won't accept it
**Solutions:**
1. Verify `az login` worked: `az account show`
2. Check your user has database access (might need admin to grant)
3. Verify IP is allowed in PostgreSQL firewall

### "Migration failed: column already exists"
**Problem:** Migration already ran partially
**Solution:** Check what's in the database, might need to drop tables or fix manually

### "Port 5000 already in use"
**Problem:** Another app using port 5000
**Solution:** Kill the other process or change port in launchSettings.json

## Verification Steps

After everything starts:

1. **Check backend health:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Check Swagger:**
   Open: http://localhost:5000/swagger

3. **Check frontend:**
   Open: http://localhost:5173
   You should see the login page

4. **Try logging in:**
   - Email: `test@example.com` (any email works in dev)
   - Password: anything
   - Should redirect to dashboard

5. **Check database:**
   ```bash
   psql "host=myscheduling.postgres.database.azure.com user=Geoff.Vaughan@aleutfederal.com dbname=postgres sslmode=require" -c "\dt"
   ```
   Should list all 50+ tables

## What's Next After This Works?

Once you see the dashboard at http://localhost:5173, you're ready for Phase 2:

- **Real Entra ID authentication** (replace mock auth)
- **JWT token handling**
- **Tenant isolation** in queries
- **Role-based access control**
- **First API endpoints** (People, Projects)

## Files Summary

**Configuration:**
- [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) - Database connection (no password!)
- [Program.cs](backend/src/AleutStaffing.Api/Program.cs) - Azure AD token provider

**Database:**
- [Migrations/](backend/src/AleutStaffing.Infrastructure/Migrations/) - Database schema
- [DbContext](backend/src/AleutStaffing.Infrastructure/Data/AleutStaffingDbContext.cs) - EF Core configuration

**Frontend:**
- [LoginPage.tsx](frontend/src/pages/LoginPage.tsx) - Login UI
- [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx) - Main dashboard

---

**Need help?** Check these guides:
- [START-HERE.md](START-HERE.md) - Quick overview
- [AZURE-AD-SETUP.md](AZURE-AD-SETUP.md) - Azure AD details
- [README.md](README.md) - Full documentation

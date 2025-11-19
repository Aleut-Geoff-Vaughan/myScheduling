# 🚀 Quick Start - Get Your App Running NOW!

## What You Have

Your application is **fully configured** and ready to run! Here's what's already set up:

✅ .NET 8 Web API backend
✅ React + TypeScript frontend
✅ PostgreSQL database at `myscheduling.postgres.database.azure.com`
✅ **Azure AD authentication** (no passwords needed!)
✅ Complete entity model (50+ tables)
✅ All packages installed
✅ Build successful - ready to go!

## Your Database Connection

You're using **Azure Active Directory (Entra ID) authentication** - this is the modern, secure way!

- **Server:** `myscheduling.postgres.database.azure.com`
- **User:** `Geoff.Vaughan@aleutfederal.com`
- **Authentication:** Azure AD tokens (automatic!)
- **No passwords in code!** ✨

## 3 Simple Steps to Run

### Step 1: Log Into Azure (One Time)

Open a terminal and run:

```bash
az login
```

A browser will open → Log in with your Azure account → Close browser. Done!

### Step 2: Create Database Tables (One Time)

```bash
cd /workspaces/myScheduling/backend/src/AleutStaffing.Api
dotnet ef database update --project ../AleutStaffing.Infrastructure
```

This creates all your tables in PostgreSQL. Takes about 30 seconds.

### Step 3: Start Everything

**Terminal 1 - Backend:**
```bash
cd /workspaces/myScheduling/backend/src/AleutStaffing.Api
dotnet run
```

Wait until you see: `Now listening on: http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd /workspaces/myScheduling/frontend
npm run dev
```

Wait until you see: `Local: http://localhost:5173/`

## Open Your Browser

Go to: **http://localhost:5173**

You'll see the login page! (In dev mode, any email works for now)

## What's Next?

Your application has:
- ✅ Complete database schema (Identity, People, Projects, Staffing, Hoteling)
- ✅ Modern React UI with routing
- ✅ Secure Azure AD database connection
- ✅ API ready for controllers

Next phase: Build out the actual features!

## Need Help?

- **Detailed Azure AD info:** See [AZURE-AD-SETUP.md](AZURE-AD-SETUP.md)
- **General setup:** See [README.md](README.md)
- **5-minute guide:** See [QUICKSTART.md](QUICKSTART.md)

## What Makes This Special?

### Traditional Setup ❌
- Passwords in config files
- Key Vault management
- Credential rotation
- Security risks

### Your Setup ✅
- No passwords anywhere
- Auto-refreshing tokens
- Azure AD authentication
- Maximum security
- Works locally AND in Azure

## Architecture

```
┌─────────────────┐
│   Your Browser  │  http://localhost:5173
└────────┬────────┘
         │
    ┌────▼────┐
    │  React  │  Port 5173
    │Frontend │  (Vite dev server)
    └────┬────┘
         │ API calls
    ┌────▼────┐
    │ .NET 8  │  Port 5000
    │   API   │  (Kestrel)
    └────┬────┘
         │ EF Core
    ┌────▼──────────────────┐
    │   PostgreSQL          │  myscheduling.postgres.database.azure.com
    │   (Azure AD Auth)     │  (Azure Database for PostgreSQL)
    └───────────────────────┘
         ▲
         │ Azure AD Token
    ┌────┴────┐
    │ Azure   │  Your credentials from `az login`
    │Identity │  Auto-refreshes every 55 minutes
    └─────────┘
```

## Files You Care About

### Configuration
- [backend/src/AleutStaffing.Api/appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) - Connection string (no password!)
- [backend/src/AleutStaffing.Api/Program.cs](backend/src/AleutStaffing.Api/Program.cs) - Azure AD token provider

### Frontend
- [frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx) - Login UI
- [frontend/src/pages/DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx) - Main dashboard
- [frontend/src/components/layout/DashboardLayout.tsx](frontend/src/components/layout/DashboardLayout.tsx) - Navigation

### Database
- [backend/src/AleutStaffing.Core/Entities/](backend/src/AleutStaffing.Core/Entities/) - All entity models
- [backend/src/AleutStaffing.Infrastructure/Data/AleutStaffingDbContext.cs](backend/src/AleutStaffing.Infrastructure/Data/AleutStaffingDbContext.cs) - Database configuration

## Current Status

**✅ COMPLETED: Phase 1 - Foundation**
- Solution structure
- PostgreSQL with Azure AD authentication
- React app with routing
- Mock authentication
- Dashboard layout

**🔜 NEXT: Phase 2 - Real Authentication**
- Entra ID OIDC integration
- JWT tokens
- Tenant isolation
- Role-based routing

## Troubleshooting

### "az: command not found"
Install Azure CLI: https://aka.ms/installazurecliwindows

### "Not logged in to Azure"
Run: `az login`

### "Cannot connect to database"
1. Make sure you ran `az login`
2. Check that `Geoff.Vaughan@aleutfederal.com` has database access
3. Verify your IP is allowed in PostgreSQL firewall

### Frontend doesn't load
1. Make sure backend is running first
2. Check terminal for errors
3. Try refreshing the browser

## Ready?

1. `az login`
2. `dotnet ef database update --project ../AleutStaffing.Infrastructure`
3. `dotnet run` (in backend)
4. `npm run dev` (in frontend)
5. Open http://localhost:5173

**You're all set! 🎉**

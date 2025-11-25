# Security Fixes Applied

## Date: 2025-11-19

## Issues Fixed

### 1. Database Password Exposure
**Problem**: Database password was committed in [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) and exposed in git history

**Solution**:
- Removed password from [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json)
- Created [appsettings.Development.json](backend/src/AleutStaffing.Api/appsettings.Development.json) with the password
- Added `appsettings.Development.json` to [.gitignore](.gitignore)
- Password is now only in local development file (not in git)

**Files Changed**:
- [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) - Removed `Password=` parameter
- [appsettings.Development.json](backend/src/AleutStaffing.Api/appsettings.Development.json) - Created with password (not tracked by git)
- [.gitignore](.gitignore) - Added rules to exclude environment files

**Configuration Now**:
```json
// appsettings.json (committed to git - NO password)
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Port=5432;Database=myscheduling;Username=aleutstaffing_admin;SslMode=Require"
  }
}

// appsettings.Development.json (NOT in git - has password)
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Port=5432;Database=myscheduling;Username=aleutstaffing_admin;Password=a7f3e9d2-4b8c-4e1f-9a5d-6c2b8f4e7a3c;SslMode=Require"
  }
}
```

### 2. Azure Static Web Apps Build Failure
**Problem**: GitHub Actions workflow was failing with error:
```
Could not detect any platform in the source directory.
Failed to find a default file in the app artifacts folder (/).
```

**Solution**:
- Updated [.github/workflows/azure-static-web-apps-proud-ocean-0c7274110.yml](.github/workflows/azure-static-web-apps-proud-ocean-0c7274110.yml)
- Changed `app_location` from "/" to "frontend"
- Changed `output_location` from "" to "dist"
- Now Oryx can correctly detect the React/Vite application

**Files Changed**:
- [.github/workflows/azure-static-web-apps-proud-ocean-0c7274110.yml](.github/workflows/azure-static-web-apps-proud-ocean-0c7274110.yml)

**Configuration Now**:
```yaml
app_location: "frontend"    # Was: "/"
output_location: "dist"     # Was: ""
```

## Security Best Practices Applied

### .gitignore Improvements
Added comprehensive rules to prevent future credential leaks:

```gitignore
# Environment files
/.env
.env
*.env

# .NET appsettings with secrets
appsettings.Development.json
appsettings.*.json
!appsettings.json
```

This ensures:
- All `.env` files are ignored
- `appsettings.Development.json` is ignored
- Any `appsettings.*.json` files are ignored
- Only the base `appsettings.json` (without secrets) is tracked

## Production Deployment Notes

**IMPORTANT**: For production deployment, you'll need to configure the database password using one of these methods:

### Option 1: Environment Variables (Recommended)
Set an environment variable in your production environment:
```bash
export ConnectionStrings__DefaultConnection="Host=...;Password=YOUR_PRODUCTION_PASSWORD;..."
```

### Option 2: Azure Key Vault
Store the connection string in Azure Key Vault and reference it in your app configuration.

### Option 3: Azure App Configuration
Use Azure App Configuration service to manage your connection strings securely.

### Option 4: User Secrets (Development Only)
For local development, you can also use .NET User Secrets:
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Password=...;..."
```

## How .NET Configuration Works

.NET uses a layered configuration system where settings are loaded in this order:

1. **appsettings.json** (base settings - no secrets)
2. **appsettings.{Environment}.json** (environment-specific - can have secrets)
3. **User Secrets** (development only)
4. **Environment Variables** (all environments)
5. **Command Line Arguments** (all environments)

Later sources override earlier ones. This means:
- Your Development environment will load `appsettings.json` first, then `appsettings.Development.json` which adds the password
- Your Production environment can use environment variables or Azure Key Vault to inject the password

## Git History

**Note**: The password was in git history from commits:
- 735ea21 - Initial build
- cc8ecec - Configure database connection to myscheduling database

While we've removed the password from future commits, it still exists in the git history. To fully clean this:

### Option 1: Accept Historical Exposure (Recommended for Development)
- Change the database password in Azure Portal
- The old password in git history becomes useless
- This is the simplest and safest option

### Option 2: Rewrite Git History (Not Recommended - Can Break Things)
- Use tools like `git filter-repo` or `BFG Repo-Cleaner`
- This rewrites history and requires force pushing
- **WARNING**: This can break things for anyone who has cloned the repo

**Recommendation**: Since this is a development database, simply rotate the password in Azure Portal.

## Current Status

✅ Password removed from [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json)
✅ Password in [appsettings.Development.json](backend/src/AleutStaffing.Api/appsettings.Development.json) (not tracked)
✅ [.gitignore](.gitignore) updated to prevent future credential leaks
✅ Azure Static Web Apps workflow fixed
✅ Backend API running with Development configuration
✅ Frontend running on port 5173
✅ Changes committed and pushed to GitHub

## Verification

You can verify the fixes by:

1. **Check git status**:
   ```bash
   git status
   ```
   Should show `appsettings.Development.json` is untracked

2. **Check appsettings.json**:
   ```bash
   cat backend/src/AleutStaffing.Api/appsettings.json
   ```
   Should NOT contain the password

3. **Check application runs**:
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

## Next Steps for Production

When deploying to production:

1. **Rotate the database password** (since it was exposed in git history)
2. **Configure production connection string** using environment variables or Azure Key Vault
3. **Never commit secrets** to git (our .gitignore now prevents this)
4. **Use Azure Managed Identities** for production (no passwords at all!)

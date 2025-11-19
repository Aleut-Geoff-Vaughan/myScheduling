# Azure AD Authentication Setup (Simple!)

Your PostgreSQL database is configured to use **Azure Active Directory (Entra ID)** authentication instead of passwords. This is more secure and simpler!

## What This Means

✅ **No passwords needed** - Uses your Azure login
✅ **No Key Vault needed** - Access tokens are generated automatically
✅ **More secure** - Tokens expire after 60 minutes and auto-refresh
✅ **Same Azure account** - Works with `az login`

## Your Database Configuration

- **Server:** `myscheduling.postgres.database.azure.com`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `Geoff.Vaughan@aleutfederal.com`
- **Authentication:** Azure AD (Entra ID)

## Setup Steps (Super Simple!)

### Step 1: Log Into Azure

Open a terminal and run:

```bash
az login
```

A browser will open. Log in with your `Geoff.Vaughan@aleutfederal.com` account and close the browser.

### Step 2: That's It!

Seriously, that's all you need to do. The application is now configured to:

1. Use your Azure AD credentials automatically
2. Get access tokens for PostgreSQL
3. Refresh tokens automatically every 55 minutes
4. Connect securely to your database

## Running the Application

### Create Database Tables (First Time Only)

```bash
cd /workspaces/myScheduling/backend/src/AleutStaffing.Api
dotnet ef database update --project ../AleutStaffing.Infrastructure
```

This creates all the tables in your PostgreSQL database.

### Start the Backend API

```bash
dotnet run
```

You should see:
```
Now listening on: http://localhost:5000
```

### Start the Frontend (New Terminal)

```bash
cd /workspaces/myScheduling/frontend
npm run dev
```

You should see:
```
Local: http://localhost:5173/
```

### Open Your Browser

Go to: **http://localhost:5173**

## How It Works

### Local Development
1. You run `az login`
2. Your Azure credentials are cached locally
3. When the app starts, it uses `DefaultAzureCredential`
4. This automatically finds your Azure CLI credentials
5. Gets an access token for PostgreSQL
6. Connects to the database
7. Tokens auto-refresh every 55 minutes

### Azure Deployment (Later)
1. Your app gets a Managed Identity in Azure
2. The Managed Identity is granted access to PostgreSQL
3. Same code works automatically - no changes needed!

## What Changed in the Code

### [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Port=5432;Database=postgres;Username=Geoff.Vaughan@aleutfederal.com;SslMode=Require"
  }
}
```

**No password in the connection string!** That's the magic of Azure AD authentication.

### [Program.cs](backend/src/AleutStaffing.Api/Program.cs)

```csharp
// Configure Azure AD authentication for PostgreSQL
var credential = new DefaultAzureCredential();

builder.Services.AddDbContext<AleutStaffingDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);

    // Automatically get Azure AD tokens for PostgreSQL
    dataSourceBuilder.UsePeriodicPasswordProvider(async (_, ct) =>
    {
        var tokenRequestContext = new TokenRequestContext(
            new[] { "https://ossrdbms-aad.database.windows.net/.default" });
        var token = await credential.GetTokenAsync(tokenRequestContext, ct);
        return token.Token;
    },
    TimeSpan.FromMinutes(55), // Refresh every 55 minutes
    TimeSpan.FromSeconds(5));  // Initial timeout

    var dataSource = dataSourceBuilder.Build();
    options.UseNpgsql(dataSource,
        npgsqlOptions => npgsqlOptions.MigrationsAssembly("AleutStaffing.Infrastructure"));
});
```

## Troubleshooting

### "Not logged in to Azure"
**Problem:** Need to authenticate with Azure
**Solution:** Run `az login`

### "No access to database"
**Problem:** Your Azure AD account doesn't have PostgreSQL access
**Solution:** Someone with PostgreSQL admin access needs to run:
```sql
-- In PostgreSQL as admin
CREATE ROLE "Geoff.Vaughan@aleutfederal.com" WITH LOGIN;
GRANT ALL PRIVILEGES ON DATABASE postgres TO "Geoff.Vaughan@aleutfederal.com";
```

### "Token request failed"
**Problem:** Wrong Azure AD resource endpoint
**Solution:** Already configured correctly in Program.cs with `https://ossrdbms-aad.database.windows.net/.default`

### "Connection refused"
**Problem:** PostgreSQL firewall might be blocking your IP
**Solution:** Add your IP to PostgreSQL firewall rules in Azure Portal

## Testing the Connection

You can test the connection manually:

```bash
# Set environment variables
export PGHOST=myscheduling.postgres.database.azure.com
export PGUSER=Geoff.Vaughan@aleutfederal.com
export PGPORT=5432
export PGDATABASE=postgres
export PGPASSWORD="$(az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken --output tsv)"

# Connect with psql
psql
```

If this works, your application will work too!

## Security Benefits

### Traditional Password Authentication
❌ Passwords in Key Vault
❌ Password rotation needed
❌ Password could be leaked
❌ Static credentials

### Azure AD Authentication (What You Have)
✅ No passwords ever
✅ Tokens expire automatically
✅ Nothing to rotate
✅ Audit trail in Azure AD
✅ Works with MFA
✅ Can revoke access instantly

## Next Steps

1. Run `az login` if you haven't already
2. Run the database migration command
3. Start the backend with `dotnet run`
4. Start the frontend with `npm run dev`
5. Open http://localhost:5173 in your browser

You're all set! No scripts to run, no Key Vault to configure - just log in and go!

## Related Files

- [Program.cs](backend/src/AleutStaffing.Api/Program.cs) - Database configuration with Azure AD
- [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) - Connection string
- [README.md](README.md) - Main project documentation

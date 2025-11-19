# Azure Setup Scripts

Automated scripts to configure Azure resources for the Aleut Federal Staffing Platform.

## What These Scripts Do

Both scripts automatically:

1. ✅ Create Azure Key Vault (or use existing one)
2. ✅ Add database credentials as Key Vault secrets (`DbUsername` and `DbPassword`)
3. ✅ Grant your Azure user access to Key Vault
4. ✅ Optionally configure your Static Web App with managed identity and Key Vault access
5. ✅ Update your local `appsettings.json` with the Key Vault URI

## Prerequisites

- **Azure CLI** installed ([Install Guide](https://learn.microsoft.com/cli/azure/install-azure-cli))
- **Authenticated to Azure**: Run `az login` before using these scripts
- **Resource Group**: Your existing `myScheduling_group` resource group
- **Database Credentials**: Username and password for your PostgreSQL database

## Option 1: PowerShell Script (Windows/Mac/Linux)

### Usage

```powershell
./setup-azure-resources.ps1 `
    -DbUsername "your_postgres_username" `
    -DbPassword "your_postgres_password"
```

### With Optional Parameters

```powershell
./setup-azure-resources.ps1 `
    -ResourceGroup "myScheduling_group" `
    -KeyVaultName "myscheduling-kv" `
    -DbUsername "your_postgres_username" `
    -DbPassword "your_postgres_password" `
    -StaticWebAppName "your-static-web-app-name"
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `DbUsername` | Yes | - | PostgreSQL username |
| `DbPassword` | Yes | - | PostgreSQL password |
| `ResourceGroup` | No | `myScheduling_group` | Azure resource group name |
| `Location` | No | `eastus` | Azure region (auto-detected from resource group) |
| `KeyVaultName` | No | `myscheduling-kv` | Key Vault name (must be globally unique) |
| `StaticWebAppName` | No | - | Static Web App name (for managed identity setup) |
| `SkipLocalConfig` | No | `false` | Skip updating local appsettings.json |

## Option 2: Bash Script (Linux/Mac)

### Usage

```bash
# Simple usage
DB_USERNAME="your_postgres_username" \
DB_PASSWORD="your_postgres_password" \
./setup-azure-resources.sh
```

### With Optional Parameters

```bash
# Full configuration
RESOURCE_GROUP="myScheduling_group" \
KEYVAULT_NAME="myscheduling-kv" \
DB_USERNAME="your_postgres_username" \
DB_PASSWORD="your_postgres_password" \
STATIC_WEB_APP_NAME="your-static-web-app-name" \
./setup-azure-resources.sh
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_USERNAME` | Yes | - | PostgreSQL username |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `RESOURCE_GROUP` | No | `myScheduling_group` | Azure resource group name |
| `LOCATION` | No | `eastus` | Azure region (auto-detected from resource group) |
| `KEYVAULT_NAME` | No | `myscheduling-kv` | Key Vault name (must be globally unique) |
| `STATIC_WEB_APP_NAME` | No | - | Static Web App name (for managed identity setup) |

## What Happens During Setup

### 1. Authentication Check
```
✓ Authenticated as: your-email@domain.com
✓ Subscription: Your Subscription Name (subscription-id)
```

### 2. Resource Group Verification
```
✓ Resource group found in location: eastus
```

### 3. Key Vault Creation
```
✓ Key Vault created/updated: https://myscheduling-kv.vault.azure.net/
```

### 4. Access Policy Configuration
```
✓ User Object ID: your-user-object-id
✓ Access granted (get, list, set, delete secrets)
```

### 5. Secrets Creation
```
✓ Added secret: DbUsername
✓ Added secret: DbPassword
```

### 6. Optional: Static Web App Configuration
```
✓ Managed identity enabled: managed-identity-id
✓ Access granted to Static Web App
```

### 7. Local Configuration Update
```
✓ Updated appsettings.json with Key Vault URI
```

## After Running the Script

The script will output next steps:

### 1. Run Database Migrations

```bash
cd backend/src/AleutStaffing.Api
dotnet ef database update --project ../AleutStaffing.Infrastructure
```

This creates all database tables in your Azure PostgreSQL database.

### 2. Start the Backend API

```bash
dotnet run
```

The API will:
- Connect to Azure Key Vault using your Azure CLI credentials
- Retrieve database credentials from Key Vault
- Connect to Azure PostgreSQL
- Start listening on http://localhost:5000

### 3. Start the Frontend

```bash
cd ../../../frontend
npm run dev
```

The frontend will start on http://localhost:5173

## Configuration Created

After running the script, your `appsettings.json` will look like:

```json
{
  "KeyVaultUri": "https://myscheduling-kv.vault.azure.net/",
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Database=aleutstaffing;Username={DbUsername};Password={DbPassword};SslMode=Require;Trust Server Certificate=true"
  }
}
```

The `{DbUsername}` and `{DbPassword}` placeholders are automatically replaced with values from Key Vault when the application starts.

## Troubleshooting

### "Not logged in to Azure"

**Solution:** Run `az login` and authenticate with your Azure account.

### "Resource group not found"

**Solution:** Verify your resource group name. Check with:
```bash
az group list --query "[].name" -o table
```

### "Key Vault name already exists"

**Solution:** This is normal if you've run the script before. The script will use the existing Key Vault and update its secrets.

### "Failed to create Key Vault"

**Possible Causes:**
- Key Vault name must be globally unique (3-24 characters, alphanumeric and hyphens)
- You need Contributor or Owner access to the resource group

**Solution:** Try a different Key Vault name:
```powershell
# PowerShell
./setup-azure-resources.ps1 -KeyVaultName "myscheduling-kv-unique123" -DbUsername "..." -DbPassword "..."
```

```bash
# Bash
KEYVAULT_NAME="myscheduling-kv-unique123" DB_USERNAME="..." DB_PASSWORD="..." ./setup-azure-resources.sh
```

### "Access denied to Key Vault"

**Solution:** The script should grant access automatically. If not, manually grant access:
```bash
az keyvault set-policy \
  --name myscheduling-kv \
  --upn your-email@domain.com \
  --secret-permissions get list
```

## Security Notes

### What Gets Stored in Key Vault
- ✅ Database username
- ✅ Database password

### What's Safe to Commit to Git
- ✅ `appsettings.json` with Key Vault URI
- ✅ Connection string with placeholders `{DbUsername}` and `{DbPassword}`
- ✅ These scripts

### What Should NEVER Be Committed
- ❌ Actual database passwords
- ❌ `appsettings.Development.json` with real credentials (already in .gitignore)
- ❌ Any file containing plain-text secrets

## Authentication Flow

### Local Development
1. You run `az login`
2. Application uses `DefaultAzureCredential`
3. It authenticates with your Azure CLI credentials
4. Retrieves secrets from Key Vault
5. Connects to Azure PostgreSQL

### Azure Deployment (Static Web App / App Service)
1. Managed Identity is enabled on your app
2. Application uses `DefaultAzureCredential`
3. It authenticates with Managed Identity
4. Retrieves secrets from Key Vault
5. Connects to Azure PostgreSQL

## Next Steps

1. Run one of these scripts to set up your Azure resources
2. Follow the "After Running the Script" steps above
3. Your application will be connected to Azure PostgreSQL with secure credential management
4. Continue with Phase 2: Authentication & Multi-Tenancy implementation

## Related Documentation

- [AZURE-KEYVAULT-SETUP.md](../AZURE-KEYVAULT-SETUP.md) - Detailed manual setup guide
- [QUICKSTART.md](../QUICKSTART.md) - Quick start guide
- [README.md](../README.md) - Main project documentation

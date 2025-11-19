# Azure Key Vault Setup Guide

This guide shows you how to configure Azure Key Vault to securely store database credentials and other secrets.

## Prerequisites

- Azure subscription
- Azure CLI installed (`az`)
- Owner or Contributor access to your Azure subscription
- PostgreSQL database already created: `myscheduling.postgres.database.azure.com`

## Step 1: Create Azure Key Vault

```bash
# Set variables
RESOURCE_GROUP="myscheduling-rg"
LOCATION="eastus"
KEYVAULT_NAME="myscheduling-kv"  # Must be globally unique
APP_NAME="myscheduling-app"

# Create resource group (if it doesn't exist)
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Key Vault
az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization false
```

## Step 2: Add Database Credentials to Key Vault

```bash
# Add PostgreSQL username
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "DbUsername" \
  --value "your_postgres_username"

# Add PostgreSQL password
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "DbPassword" \
  --value "your_postgres_password"
```

**Important:** The secret names (`DbUsername` and `DbPassword`) match the placeholders in our connection string!

## Step 3: Create Managed Identity for Your App

### Option A: User-Assigned Managed Identity (Recommended)

```bash
# Create user-assigned managed identity
az identity create \
  --name "${APP_NAME}-identity" \
  --resource-group $RESOURCE_GROUP

# Get the principal ID
PRINCIPAL_ID=$(az identity show \
  --name "${APP_NAME}-identity" \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

### Option B: System-Assigned Managed Identity (for App Service)

If deploying to Azure App Service:

```bash
# Enable system-assigned identity on App Service
az webapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

## Step 4: Configure Your Application

### Update appsettings.json

Update [appsettings.json](backend/src/AleutStaffing.Api/appsettings.json) with your Key Vault URI:

```json
{
  "KeyVaultUri": "https://myscheduling-kv.vault.azure.net/",
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Database=aleutstaffing;Username={DbUsername};Password={DbPassword};SslMode=Require;Trust Server Certificate=true"
  }
}
```

**Note:** The `{DbUsername}` and `{DbPassword}` placeholders will be automatically replaced by Key Vault secrets!

## Step 5: Test Locally with Azure CLI Authentication

### Authenticate with Azure CLI

```bash
az login
```

### Set environment variable (optional, for local dev)

```bash
export KeyVaultUri="https://myscheduling-kv.vault.azure.net/"
```

### Run the application

```bash
cd backend/src/AleutStaffing.Api
dotnet run
```

The app will use your Azure CLI credentials to access Key Vault via `DefaultAzureCredential`.

## Step 6: Deploy to Azure App Service

### Create App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --runtime "DOTNETCORE:8.0"

# Configure Key Vault URI
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings KeyVaultUri="https://${KEYVAULT_NAME}.vault.azure.net/"

# Enable system-assigned managed identity
az webapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Grant Key Vault access (see Option B above)
```

## How It Works

### DefaultAzureCredential Authentication Chain

The `DefaultAzureCredential` tries authentication methods in this order:

1. **Environment Variables** - For service principals
2. **Managed Identity** - For Azure-hosted apps (App Service, VMs, etc.)
3. **Visual Studio** - For local development
4. **Azure CLI** - For local development (`az login`)
5. **Azure PowerShell** - For local development

### Connection String Secret Replacement

When the app starts:
1. It loads `appsettings.json`
2. If `KeyVaultUri` is set, it connects to Key Vault using `DefaultAzureCredential`
3. It loads all secrets from Key Vault
4. When the connection string is accessed, placeholders like `{DbUsername}` are replaced with the corresponding Key Vault secret values

## Alternative: Using Environment Variables (Simpler for Development)

If you don't want to use Key Vault locally, you can use environment variables:

### Linux/Mac:
```bash
export ConnectionStrings__DefaultConnection="Host=myscheduling.postgres.database.azure.com;Database=aleutstaffing;Username=youruser;Password=yourpassword;SslMode=Require"
```

### Windows PowerShell:
```powershell
$env:ConnectionStrings__DefaultConnection="Host=myscheduling.postgres.database.azure.com;Database=aleutstaffing;Username=youruser;Password=yourpassword;SslMode=Require"
```

### appsettings.Development.json (Git-ignored)

Create `appsettings.Development.json` (already in .gitignore):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=myscheduling.postgres.database.azure.com;Database=aleutstaffing;Username=youruser;Password=yourpassword;SslMode=Require"
  }
}
```

## Security Best Practices

✅ **Do:**
- Use Managed Identity in production
- Rotate secrets regularly
- Use separate Key Vaults for dev/test/prod
- Enable Key Vault audit logging
- Use Azure RBAC for Key Vault access control

❌ **Don't:**
- Commit secrets to source control
- Share Key Vault access widely
- Use the same credentials for dev and prod
- Disable Key Vault firewall in production

## Troubleshooting

### Error: "No valid credentials found"

**Solution:** Run `az login` to authenticate with Azure CLI

### Error: "Access denied to Key Vault"

**Solution:** Check that your user/managed identity has the correct Key Vault access policy:

```bash
az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --upn your-email@domain.com \
  --secret-permissions get list
```

### Error: "Secret not found"

**Solution:** Verify secret names match exactly (case-sensitive):

```bash
az keyvault secret list --vault-name $KEYVAULT_NAME --query "[].name"
```

### Error: "Connection to PostgreSQL failed"

**Solution:** Ensure your IP is allowed in PostgreSQL firewall rules:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name myscheduling \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

## Next Steps

1. Set up your Key Vault following this guide
2. Add your database credentials as secrets
3. Update `KeyVaultUri` in appsettings.json
4. Run the application
5. Verify connection to Azure PostgreSQL

---

**Need help?** Check the main [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md)

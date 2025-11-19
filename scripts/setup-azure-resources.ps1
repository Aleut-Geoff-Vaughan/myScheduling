#Requires -Modules Az

<#
.SYNOPSIS
    Automated Azure Resource Setup for Aleut Federal Staffing Platform

.DESCRIPTION
    This script will:
    1. Create Azure Key Vault
    2. Add database credentials as secrets
    3. Grant your user access to Key Vault
    4. Configure your Static Web App with Key Vault access (optional)
    5. Update your local appsettings.json with Key Vault URI

.NOTES
    Prerequisites:
    - Azure CLI installed and authenticated (run: az login)
    - Owner or Contributor access to your Azure subscription
    - Database credentials ready
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "myScheduling_group",

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false)]
    [string]$KeyVaultName = "myscheduling-kv",

    [Parameter(Mandatory=$true)]
    [string]$DbUsername,

    [Parameter(Mandatory=$true)]
    [string]$DbPassword,

    [Parameter(Mandatory=$false)]
    [string]$StaticWebAppName = "",

    [Parameter(Mandatory=$false)]
    [switch]$SkipLocalConfig
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Azure Resource Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in to Azure
Write-Host "Checking Azure authentication..." -ForegroundColor Yellow
$account = az account show 2>&1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Authenticated as: $($account.user.name)" -ForegroundColor Green
Write-Host "✓ Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host ""

# Verify resource group exists
Write-Host "Verifying resource group '$ResourceGroup'..." -ForegroundColor Yellow
$rg = az group show --name $ResourceGroup 2>&1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Resource group '$ResourceGroup' not found." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Resource group found in location: $($rg.location)" -ForegroundColor Green
$Location = $rg.location
Write-Host ""

# Check if Key Vault name is available
Write-Host "Checking Key Vault name availability..." -ForegroundColor Yellow
$kvAvailable = az keyvault list --query "[?name=='$KeyVaultName'].name" -o tsv
if ($kvAvailable) {
    Write-Host "⚠ Key Vault '$KeyVaultName' already exists. Using existing Key Vault." -ForegroundColor Yellow
} else {
    Write-Host "✓ Key Vault name '$KeyVaultName' is available." -ForegroundColor Green
}
Write-Host ""

# Create Key Vault
Write-Host "Creating/Updating Key Vault..." -ForegroundColor Yellow
$kv = az keyvault create `
    --name $KeyVaultName `
    --resource-group $ResourceGroup `
    --location $Location `
    --enable-rbac-authorization false `
    --enabled-for-deployment true `
    --enabled-for-template-deployment true `
    2>&1 | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create Key Vault." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Key Vault created/updated: $($kv.properties.vaultUri)" -ForegroundColor Green
$KeyVaultUri = $kv.properties.vaultUri
Write-Host ""

# Get current user's object ID
Write-Host "Getting your user identity..." -ForegroundColor Yellow
$userId = az ad signed-in-user show --query id -o tsv
Write-Host "✓ User Object ID: $userId" -ForegroundColor Green
Write-Host ""

# Grant Key Vault access to current user
Write-Host "Granting Key Vault access to your user..." -ForegroundColor Yellow
az keyvault set-policy `
    --name $KeyVaultName `
    --object-id $userId `
    --secret-permissions get list set delete `
    --query "properties.accessPolicies[?objectId=='$userId']" `
    | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set Key Vault access policy." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Access granted (get, list, set, delete secrets)" -ForegroundColor Green
Write-Host ""

# Add database credentials
Write-Host "Adding database credentials to Key Vault..." -ForegroundColor Yellow

# Add username
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "DbUsername" `
    --value $DbUsername `
    | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to add DbUsername secret." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Added secret: DbUsername" -ForegroundColor Green

# Add password
az keyvault secret set `
    --vault-name $KeyVaultName `
    --name "DbPassword" `
    --value $DbPassword `
    | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to add DbPassword secret." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Added secret: DbPassword" -ForegroundColor Green
Write-Host ""

# Configure Static Web App (if provided)
if ($StaticWebAppName) {
    Write-Host "Configuring Static Web App '$StaticWebAppName'..." -ForegroundColor Yellow

    # Check if Static Web App exists
    $swa = az staticwebapp show --name $StaticWebAppName --resource-group $ResourceGroup 2>&1 | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Static Web App '$StaticWebAppName' not found. Skipping." -ForegroundColor Yellow
    } else {
        # Enable managed identity on Static Web App
        Write-Host "Enabling managed identity..." -ForegroundColor Yellow
        $identity = az staticwebapp identity assign `
            --name $StaticWebAppName `
            --resource-group $ResourceGroup `
            2>&1 | ConvertFrom-Json

        if ($LASTEXITCODE -eq 0) {
            $principalId = $identity.principalId
            Write-Host "✓ Managed identity enabled: $principalId" -ForegroundColor Green

            # Grant Key Vault access to managed identity
            Write-Host "Granting Key Vault access to Static Web App..." -ForegroundColor Yellow
            az keyvault set-policy `
                --name $KeyVaultName `
                --object-id $principalId `
                --secret-permissions get list `
                | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Access granted to Static Web App" -ForegroundColor Green
            }
        }
    }
    Write-Host ""
}

# Update local appsettings.json
if (-not $SkipLocalConfig) {
    Write-Host "Updating local appsettings.json..." -ForegroundColor Yellow
    $appsettingsPath = Join-Path $PSScriptRoot "..\backend\src\AleutStaffing.Api\appsettings.json"

    if (Test-Path $appsettingsPath) {
        $appsettings = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
        $appsettings.KeyVaultUri = $KeyVaultUri
        $appsettings | ConvertTo-Json -Depth 10 | Set-Content $appsettingsPath
        Write-Host "✓ Updated appsettings.json with Key Vault URI" -ForegroundColor Green
    } else {
        Write-Host "⚠ appsettings.json not found at: $appsettingsPath" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resources Created/Updated:" -ForegroundColor White
Write-Host "  • Key Vault: $KeyVaultName" -ForegroundColor White
Write-Host "  • Key Vault URI: $KeyVaultUri" -ForegroundColor White
Write-Host "  • Secrets: DbUsername, DbPassword" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run database migrations:" -ForegroundColor White
Write-Host "     cd backend/src/AleutStaffing.Api" -ForegroundColor Gray
Write-Host "     dotnet ef database update --project ../AleutStaffing.Infrastructure" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start the backend API:" -ForegroundColor White
Write-Host "     dotnet run" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start the frontend:" -ForegroundColor White
Write-Host "     cd ../../../frontend" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Configuration Details:" -ForegroundColor Yellow
Write-Host "  • Database: myscheduling.postgres.database.azure.com" -ForegroundColor White
Write-Host "  • Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  • Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "  • Swagger: http://localhost:5000/swagger" -ForegroundColor White
Write-Host ""

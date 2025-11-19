#!/bin/bash

################################################################################
# Automated Azure Resource Setup for Aleut Federal Staffing Platform
#
# This script will:
# 1. Create Azure Key Vault
# 2. Add database credentials as secrets
# 3. Grant your user access to Key Vault
# 4. Update your local appsettings.json with Key Vault URI
#
# Prerequisites:
# - Azure CLI installed and authenticated (run: az login)
# - Owner or Contributor access to your Azure subscription
# - Database credentials ready
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
RESOURCE_GROUP="${RESOURCE_GROUP:-myScheduling_group}"
LOCATION="${LOCATION:-eastus}"
KEYVAULT_NAME="${KEYVAULT_NAME:-myscheduling-kv}"
STATIC_WEB_APP_NAME="${STATIC_WEB_APP_NAME:-}"

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}Azure Resource Setup Script${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Check for required parameters
if [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: Database credentials required.${NC}"
    echo ""
    echo "Usage:"
    echo "  DB_USERNAME=myuser DB_PASSWORD=mypassword ./setup-azure-resources.sh"
    echo ""
    echo "Optional environment variables:"
    echo "  RESOURCE_GROUP       (default: myScheduling_group)"
    echo "  LOCATION             (default: eastus)"
    echo "  KEYVAULT_NAME        (default: myscheduling-kv)"
    echo "  STATIC_WEB_APP_NAME  (optional)"
    echo ""
    exit 1
fi

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure authentication...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}ERROR: Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

ACCOUNT_NAME=$(az account show --query name -o tsv)
ACCOUNT_EMAIL=$(az account show --query user.name -o tsv)
ACCOUNT_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✓ Authenticated as: $ACCOUNT_EMAIL${NC}"
echo -e "${GREEN}✓ Subscription: $ACCOUNT_NAME ($ACCOUNT_ID)${NC}"
echo ""

# Verify resource group exists
echo -e "${YELLOW}Verifying resource group '$RESOURCE_GROUP'...${NC}"
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${RED}ERROR: Resource group '$RESOURCE_GROUP' not found.${NC}"
    exit 1
fi
RG_LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
echo -e "${GREEN}✓ Resource group found in location: $RG_LOCATION${NC}"
LOCATION=$RG_LOCATION
echo ""

# Check if Key Vault name is available
echo -e "${YELLOW}Checking Key Vault name availability...${NC}"
if az keyvault show --name "$KEYVAULT_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ Key Vault '$KEYVAULT_NAME' already exists. Using existing Key Vault.${NC}"
else
    echo -e "${GREEN}✓ Key Vault name '$KEYVAULT_NAME' is available.${NC}"
fi
echo ""

# Create Key Vault
echo -e "${YELLOW}Creating/Updating Key Vault...${NC}"
az keyvault create \
    --name "$KEYVAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-rbac-authorization false \
    --enabled-for-deployment true \
    --enabled-for-template-deployment true \
    > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to create Key Vault.${NC}"
    exit 1
fi

KEYVAULT_URI=$(az keyvault show --name "$KEYVAULT_NAME" --query properties.vaultUri -o tsv)
echo -e "${GREEN}✓ Key Vault created/updated: $KEYVAULT_URI${NC}"
echo ""

# Get current user's object ID
echo -e "${YELLOW}Getting your user identity...${NC}"
USER_ID=$(az ad signed-in-user show --query id -o tsv)
echo -e "${GREEN}✓ User Object ID: $USER_ID${NC}"
echo ""

# Grant Key Vault access to current user
echo -e "${YELLOW}Granting Key Vault access to your user...${NC}"
az keyvault set-policy \
    --name "$KEYVAULT_NAME" \
    --object-id "$USER_ID" \
    --secret-permissions get list set delete \
    > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to set Key Vault access policy.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Access granted (get, list, set, delete secrets)${NC}"
echo ""

# Add database credentials
echo -e "${YELLOW}Adding database credentials to Key Vault...${NC}"

# Add username
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "DbUsername" \
    --value "$DB_USERNAME" \
    > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to add DbUsername secret.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Added secret: DbUsername${NC}"

# Add password
az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "DbPassword" \
    --value "$DB_PASSWORD" \
    > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to add DbPassword secret.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Added secret: DbPassword${NC}"
echo ""

# Configure Static Web App (if provided)
if [ -n "$STATIC_WEB_APP_NAME" ]; then
    echo -e "${YELLOW}Configuring Static Web App '$STATIC_WEB_APP_NAME'...${NC}"

    # Check if Static Web App exists
    if ! az staticwebapp show --name "$STATIC_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo -e "${YELLOW}⚠ Static Web App '$STATIC_WEB_APP_NAME' not found. Skipping.${NC}"
    else
        # Enable managed identity on Static Web App
        echo -e "${YELLOW}Enabling managed identity...${NC}"
        PRINCIPAL_ID=$(az staticwebapp identity assign \
            --name "$STATIC_WEB_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --query principalId -o tsv)

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Managed identity enabled: $PRINCIPAL_ID${NC}"

            # Grant Key Vault access to managed identity
            echo -e "${YELLOW}Granting Key Vault access to Static Web App...${NC}"
            az keyvault set-policy \
                --name "$KEYVAULT_NAME" \
                --object-id "$PRINCIPAL_ID" \
                --secret-permissions get list \
                > /dev/null

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Access granted to Static Web App${NC}"
            fi
        fi
    fi
    echo ""
fi

# Update local appsettings.json
echo -e "${YELLOW}Updating local appsettings.json...${NC}"
APPSETTINGS_PATH="$(dirname "$0")/../backend/src/AleutStaffing.Api/appsettings.json"

if [ -f "$APPSETTINGS_PATH" ]; then
    # Use jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
        TMP_FILE=$(mktemp)
        jq --arg uri "$KEYVAULT_URI" '.KeyVaultUri = $uri' "$APPSETTINGS_PATH" > "$TMP_FILE"
        mv "$TMP_FILE" "$APPSETTINGS_PATH"
        echo -e "${GREEN}✓ Updated appsettings.json with Key Vault URI${NC}"
    else
        sed -i.bak "s|\"KeyVaultUri\": \".*\"|\"KeyVaultUri\": \"$KEYVAULT_URI\"|" "$APPSETTINGS_PATH"
        rm -f "$APPSETTINGS_PATH.bak"
        echo -e "${GREEN}✓ Updated appsettings.json with Key Vault URI${NC}"
    fi
else
    echo -e "${YELLOW}⚠ appsettings.json not found at: $APPSETTINGS_PATH${NC}"
fi
echo ""

# Summary
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo -e "Resources Created/Updated:"
echo -e "  • Key Vault: $KEYVAULT_NAME"
echo -e "  • Key Vault URI: $KEYVAULT_URI"
echo -e "  • Secrets: DbUsername, DbPassword"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Run database migrations:"
echo -e "     ${CYAN}cd backend/src/AleutStaffing.Api${NC}"
echo -e "     ${CYAN}dotnet ef database update --project ../AleutStaffing.Infrastructure${NC}"
echo ""
echo -e "  2. Start the backend API:"
echo -e "     ${CYAN}dotnet run${NC}"
echo ""
echo -e "  3. Start the frontend:"
echo -e "     ${CYAN}cd ../../../frontend${NC}"
echo -e "     ${CYAN}npm run dev${NC}"
echo ""
echo -e "${YELLOW}Configuration Details:${NC}"
echo -e "  • Database: myscheduling.postgres.database.azure.com"
echo -e "  • Frontend: http://localhost:5173"
echo -e "  • Backend API: http://localhost:5000"
echo -e "  • Swagger: http://localhost:5000/swagger"
echo ""

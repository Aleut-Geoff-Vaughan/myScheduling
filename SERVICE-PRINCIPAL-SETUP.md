# Service Principal Setup for Cloud Development

Since you're working in a cloud development environment (VS Code/Codespaces), we need to use a Service Principal for authentication.

## Step 1: Create Service Principal (Run on Your Local Machine)

Open a terminal on your local machine where Azure CLI is installed and run:

```bash
# Login to Azure
az login

# Get your subscription ID
az account show --query id -o tsv

# Create service principal with access to your resource group
az ad sp create-for-rbac \
  --name "myscheduling-dev-sp" \
  --role Contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/myScheduling_group

# This will output something like:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "myscheduling-dev-sp",
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }
```

**Save these values!** You'll need them in the next step.

## Step 2: Grant Database Access

The service principal needs access to your PostgreSQL database:

```bash
# Get the service principal's Object ID
SP_OBJECT_ID=$(az ad sp show --id YOUR_APP_ID --query id -o tsv)

# Grant PostgreSQL access (if your user has admin rights)
# This step may need to be done by a database administrator
az postgres flexible-server ad-admin create \
  --resource-group myScheduling_group \
  --server-name myscheduling \
  --object-id $SP_OBJECT_ID \
  --display-name "myscheduling-dev-sp" \
  --type ServicePrincipal
```

## Step 3: Copy the Credentials

You'll get output like this:
```json
{
  "appId": "12345678-1234-1234-1234-123456789abc",
  "displayName": "myscheduling-dev-sp",
  "password": "super-secret-password-here",
  "tenant": "87654321-4321-4321-4321-cba987654321"
}
```

## Step 4: Provide These to Me

Once you have the service principal created, provide me with:
- **appId** (Client ID)
- **password** (Client Secret)
- **tenant** (Tenant ID)

I'll set them up as environment variables in your development environment.

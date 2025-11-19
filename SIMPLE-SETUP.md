# Simple Setup Guide - No Technical Knowledge Required

Follow these steps exactly as written. Don't worry about understanding everything - just follow along!

## What You'll Need

Before starting, have these ready:
1. Your PostgreSQL database username
2. Your PostgreSQL database password

## Step 1: Open a Terminal/Command Prompt

### On Windows:
- Press the Windows key
- Type "PowerShell"
- Click "Windows PowerShell"

### On Mac:
- Press Command + Space
- Type "Terminal"
- Press Enter

### On Linux:
- Press Ctrl + Alt + T

## Step 2: Log Into Azure

In the terminal, type this and press Enter:

```bash
az login
```

**What happens:**
- A web browser will open
- Log in with your Azure account
- Once logged in, you can close the browser
- The terminal will show "You have logged in"

**If you see an error "az: command not found":**
- You need to install Azure CLI first
- Go to: https://aka.ms/installazurecliwindows (Windows)
- Or: https://aka.ms/installazurecli (Mac/Linux)
- Install it, then come back and try `az login` again

## Step 3: Navigate to the Scripts Folder

Copy and paste this command into your terminal and press Enter:

```bash
cd /workspaces/myScheduling/scripts
```

## Step 4: Run the Setup Script

### On Windows (PowerShell):

Replace `YOUR_USERNAME_HERE` and `YOUR_PASSWORD_HERE` with your actual database username and password, then copy and paste:

```powershell
./setup-azure-resources.ps1 -DbUsername "YOUR_USERNAME_HERE" -DbPassword "YOUR_PASSWORD_HERE"
```

**Example:**
```powershell
./setup-azure-resources.ps1 -DbUsername "admin" -DbPassword "MySecurePass123!"
```

### On Mac/Linux:

Replace `YOUR_USERNAME_HERE` and `YOUR_PASSWORD_HERE` with your actual database username and password, then copy and paste:

```bash
DB_USERNAME="YOUR_USERNAME_HERE" DB_PASSWORD="YOUR_PASSWORD_HERE" ./setup-azure-resources.sh
```

**Example:**
```bash
DB_USERNAME="admin" DB_PASSWORD="MySecurePass123!" ./setup-azure-resources.sh
```

## Step 5: Wait for the Script to Finish

You'll see a lot of text scroll by with green checkmarks (✓). This is normal! The script is:
- Creating a secure vault in Azure
- Storing your database password safely
- Setting up permissions

**This takes about 30-60 seconds.**

When it's done, you'll see:
```
================================
Setup Complete!
================================
```

## Step 6: Create the Database Tables

The script will tell you what to do next. Copy and paste these commands **one at a time**:

**First command:**
```bash
cd /workspaces/myScheduling/backend/src/AleutStaffing.Api
```

**Second command:**
```bash
dotnet ef database update --project ../AleutStaffing.Infrastructure
```

This creates all the tables in your database. **This might take 1-2 minutes.**

You'll know it worked when you see: `Done.`

## Step 7: Start the Application

### Start the Backend (API):

While still in the same terminal, type:

```bash
dotnet run
```

**What you should see:**
- A bunch of text
- At the end: `Now listening on: http://localhost:5000`

**Keep this terminal window open!** Don't close it. The application is running.

### Start the Frontend (Website):

Open a **NEW** terminal window (follow Step 1 again to open another terminal), then type:

```bash
cd /workspaces/myScheduling/frontend
npm run dev
```

**What you should see:**
- `VITE v5.x.x ready in xxx ms`
- `Local: http://localhost:5173/`

## Step 8: Open the Application

Open your web browser and go to:

```
http://localhost:5173
```

**You should see the login page!**

To log in (in development mode):
- Enter any email address (like `test@example.com`)
- Enter any password
- Click "Sign In"

You should see the dashboard!

## Troubleshooting

### "az: command not found"
**Problem:** Azure CLI is not installed.
**Solution:** Install it from https://aka.ms/installazurecliwindows

### "Resource group 'myScheduling_group' not found"
**Problem:** The script is looking for a resource group that doesn't exist yet.
**Solution:** Tell me the actual name of your resource group in Azure, and I'll update the script for you.

### "Key Vault name already exists"
**Problem:** You've run the script before, or someone else is using that name.
**Solution:** This is usually fine! The script will use the existing vault. If you see errors, let me know.

### "dotnet: command not found"
**Problem:** .NET SDK is not installed.
**Solution:**
1. Go to https://dotnet.microsoft.com/download
2. Download ".NET 8.0 SDK"
3. Install it
4. Close and reopen your terminal
5. Try again

### "npm: command not found"
**Problem:** Node.js is not installed.
**Solution:**
1. Go to https://nodejs.org/
2. Download the LTS version
3. Install it
4. Close and reopen your terminal
5. Try again

### The website shows an error
**Problem:** The backend might not be running, or there's a database connection issue.
**Solution:**
1. Check that the terminal with `dotnet run` is still open and running
2. Look for any red error messages in that terminal
3. Take a screenshot and show it to me

## What If Something Goes Wrong?

Don't worry! Just:
1. Take a screenshot of the error message
2. Tell me what step you were on
3. I'll help you fix it

## All Done!

Once you see the dashboard in your browser at http://localhost:5173, you're all set!

The application is now:
- ✅ Running locally on your computer
- ✅ Connected to your Azure PostgreSQL database
- ✅ Using Azure Key Vault to securely store passwords
- ✅ Ready for you to start using

---

**Next:** We can start building out the actual features (employee management, project scheduling, etc.)

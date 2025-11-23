#!/bin/bash

# Set Passwords for Users via API
# This script uses the API to set passwords for users instead of direct database access
# Default password: TempPass123!

API_URL="http://localhost:5107"

echo "=========================================="
echo "Setting Passwords for Users via API"
echo "=========================================="
echo ""

# Default password (BCrypt hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgdRrvYyu)
DEFAULT_PASSWORD="TempPass123!"

echo "Note: This script requires the API to be running on $API_URL"
echo "Start the API with: cd backend/src/MyScheduling.Api && dotnet run"
echo ""

# First, we need to get a list of users
# Since we don't have authentication yet, we'll create a simple curl command template
# that users can run manually for each user

echo "MANUAL STEPS REQUIRED:"
echo "====================="
echo ""
echo "1. Start the API server:"
echo "   cd backend/src/MyScheduling.Api"
echo "   dotnet run"
echo ""
echo "2. Use the following curl command for EACH user ID:"
echo ""
echo "   curl -X POST $API_URL/api/auth/set-password \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"userId\": \"USER_ID_HERE\","
echo "       \"password\": \"$DEFAULT_PASSWORD\""
echo "     }'"
echo ""
echo "3. To get all user IDs, first run the SQL query or start the API and check logs during seeding"
echo ""
echo "=========================================="
echo "ALTERNATIVE: Direct Database Update"
echo "=========================================="
echo ""
echo "If you have direct database access, run:"
echo "  psql connection_string -f SetDefaultPasswords.sql"
echo ""
echo "Or manually execute this SQL:"
echo ""
echo "UPDATE users"
echo "SET password_hash = '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgdRrvYyu',"
echo "    password_changed_at = NOW(),"
echo "    failed_login_attempts = 0,"
echo "    locked_out_until = NULL"
echo "WHERE password_hash IS NULL;"
echo ""
echo "This sets password '$DEFAULT_PASSWORD' for all users without passwords."
echo ""

#!/bin/bash

# Authorization Framework End-to-End Tests
# This script tests the authorization implementation across all completed controllers

BASE_URL="http://localhost:5107/api"

# Test user IDs (replace with actual IDs from your database)
ADMIN_USER_ID="ce885d15-d5ca-4792-bd71-bb3217b495bf"
REGULAR_USER_ID="ce885d15-d5ca-4792-bd71-bb3217b495bf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracking
echo "================================================"
echo "  AUTHORIZATION FRAMEWORK - END-TO-END TESTS"
echo "================================================"
echo ""

# Function to print test result
print_result() {
    local test_name=$1
    local status_code=$2
    local expected_code=$3
    local controller=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} PASS: ${controller} - ${test_name} (HTTP ${status_code})"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} FAIL: ${controller} - ${test_name} (Expected: ${expected_code}, Got: ${status_code})"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_code=$3
    local user_id=$4
    local test_name=$5
    local controller=$6
    local data=$7

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -H "X-User-Id: $user_id" \
            -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000000" \
            -d "$data" \
            "$BASE_URL/$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "X-User-Id: $user_id" \
            -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000000" \
            "$BASE_URL/$endpoint" 2>/dev/null)
    fi

    status_code=$(echo "$response" | tail -n1)
    print_result "$test_name" "$status_code" "$expected_code" "$controller"
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: PeopleController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "people" "200" "$ADMIN_USER_ID" "GET /people (with auth)" "PeopleController"
test_endpoint "GET" "people" "401" "" "GET /people (without auth)" "PeopleController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: ProjectsController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "projects" "200" "$ADMIN_USER_ID" "GET /projects (with auth)" "ProjectsController"
test_endpoint "GET" "projects" "401" "" "GET /projects (without auth)" "ProjectsController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: AssignmentsController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "assignments" "200" "$ADMIN_USER_ID" "GET /assignments (with auth)" "AssignmentsController"
test_endpoint "GET" "assignments" "401" "" "GET /assignments (without auth)" "AssignmentsController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: BookingsController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "bookings" "200" "$ADMIN_USER_ID" "GET /bookings (with auth)" "BookingsController"
test_endpoint "GET" "bookings" "401" "" "GET /bookings (without auth)" "BookingsController"
test_endpoint "GET" "bookings/offices" "200" "$ADMIN_USER_ID" "GET /bookings/offices (with auth)" "BookingsController"
test_endpoint "GET" "bookings/spaces" "200" "$ADMIN_USER_ID" "GET /bookings/spaces (with auth)" "BookingsController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: UsersController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "users" "200" "$ADMIN_USER_ID" "GET /users (with auth)" "UsersController"
test_endpoint "GET" "users" "401" "" "GET /users (without auth)" "UsersController"
test_endpoint "GET" "users/me" "200" "$ADMIN_USER_ID" "GET /users/me (with auth)" "UsersController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: TenantsController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "tenants" "200" "$ADMIN_USER_ID" "GET /tenants (with auth)" "TenantsController"
test_endpoint "GET" "tenants" "401" "" "GET /tenants (without auth)" "TenantsController"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Testing: ResumesController${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "GET" "resumes" "200" "$ADMIN_USER_ID" "GET /resumes (with auth)" "ResumesController"
test_endpoint "GET" "resumes" "401" "" "GET /resumes (without auth)" "ResumesController"

echo ""
echo "================================================"
echo "  TEST SUMMARY"
echo "================================================"
echo -e "Total Tests:  ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi

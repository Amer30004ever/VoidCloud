#!/bin/bash

# ============================================================
# Void Cloud — API Testing Script
# Tests all microservice endpoints for manual verification
# ============================================================

set -e

# Configuration
API_BASE="${API_BASE:-https://api.voidcloud.cc.cd}"
FRONTEND_URL="${FRONTEND_URL:-https://voidcloud.cc.cd}"
TOKEN=""
USER_EMAIL="test@voidcloud.com"
USER_PASSWORD="Test123456"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    local auth_required="${4:-false}"
    
    local url="${API_BASE}${endpoint}"
    local headers=(-H "Content-Type: application/json")
    
    if [ "$auth_required" = "true" ] && [ -n "$TOKEN" ]; then
        headers+=(-H "Authorization: Bearer ${TOKEN}")
    fi
    
    print_info "Testing: $name"
    print_info "URL: $url"
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${url}" "${headers[@]}" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$name returned HTTP $http_code"
        echo "Response: $body" | head -c 200
        echo "..."
    else
        print_error "$name returned HTTP $http_code (expected $expected_status)"
        echo "Response: $body"
    fi
    echo ""
}

# ============================================================
# Main Test Execution
# ============================================================

print_header "Void Cloud API Testing Script"
print_info "API Base: $API_BASE"
print_info "Frontend URL: $FRONTEND_URL"

# Test 1: Health Endpoints (No Auth Required)
print_header "1. Health Endpoints"

test_endpoint "Auth Health" "/api/v1/auth/health" 200 false
test_endpoint "User Health" "/api/v1/users/health" 200 false
test_endpoint "Tenant Health" "/api/v1/tenants/health" 200 false
test_endpoint "VPS Health" "/api/v1/vps/health" 200 false
test_endpoint "Billing Health" "/api/v1/billing/health" 200 false
test_endpoint "CRM Health" "/api/v1/crm/health" 200 false
test_endpoint "WhatsApp Health" "/api/v1/whatsapp/health" 200 false
test_endpoint "Email Health" "/api/v1/email/health" 200 false
test_endpoint "Notification Health" "/api/v1/notifications/health" 200 false
test_endpoint "Monitoring Health" "/api/v1/monitoring/health" 200 false
test_endpoint "Audit Health" "/api/v1/audit/health" 200 false
test_endpoint "Analytics Health" "/api/v1/analytics/health" 200 false
test_endpoint "Sub2API Health" "/api/v1/sub2api/sub2api/health" 200 false

# Test 2: Frontend Accessibility
print_header "2. Frontend Accessibility"

print_info "Testing: Frontend Homepage"
frontend_response=$(curl -s -w "\n%{http_code}" -X GET "${FRONTEND_URL}" 2>&1)
frontend_code=$(echo "$frontend_response" | tail -n1)

if [ "$frontend_code" = "200" ]; then
    print_success "Frontend returned HTTP $frontend_code"
else
    print_error "Frontend returned HTTP $frontend_code"
fi

# Test 3: Authentication Flow
print_header "3. Authentication Flow"

print_info "Testing: User Registration"
register_response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASSWORD}\",\"name\":\"Test User\"}" 2>&1)
register_code=$(echo "$register_response" | tail -n1)
register_body=$(echo "$register_response" | sed '$d')

if [ "$register_code" = "201" ] || [ "$register_code" = "200" ]; then
    print_success "Registration returned HTTP $register_code"
else
    print_info "Registration returned HTTP $register_code (user may already exist)"
fi

print_info "Testing: User Login"
login_response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASSWORD}\"}" 2>&1)
login_code=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | sed '$d')

if [ "$login_code" = "200" ] || [ "$login_code" = "201" ]; then
    print_success "Login returned HTTP $login_code"
    # Extract token from response
    TOKEN=$(echo "$login_body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        print_success "Token extracted successfully"
    else
        print_error "Could not extract token from response"
    fi
else
    print_error "Login returned HTTP $login_code"
    print_info "Response: $login_body"
fi

# Test 4: Authenticated Endpoints (if token available)
if [ -n "$TOKEN" ]; then
    print_header "4. Authenticated Endpoints"
    
    test_endpoint "Get Current User" "/api/v1/auth/me" 200 true
    test_endpoint "List Users" "/api/v1/users" 200 true
    test_endpoint "List Tenants" "/api/v1/tenants" 200 true
    test_endpoint "List VPS" "/api/v1/vps" 200 true
    test_endpoint "List Invoices" "/api/v1/billing/invoices" 200 true
    test_endpoint "List Leads" "/api/v1/crm/leads" 200 true
    test_endpoint "List Notifications" "/api/v1/notifications" 200 true
    test_endpoint "Get Audit Logs" "/api/v1/audit/logs" 200 true
    test_endpoint "Get Monitoring Data" "/api/v1/monitoring/metrics" 200 true
    test_endpoint "Get Analytics" "/api/v1/analytics/dashboard" 200 true
else
    print_header "4. Authenticated Endpoints"
    print_error "Skipping authenticated tests - no token available"
fi

# Test 5: Service-Specific Endpoints
print_header "5. Service-Specific Endpoints"

print_info "Testing: Proxmox Cluster Status"
if [ -n "$TOKEN" ]; then
    test_endpoint "List Clusters" "/api/v1/vps/clusters" 200 true
else
    print_error "Skipping - requires authentication"
fi

print_info "Testing: WhatsApp Connection Status"
if [ -n "$TOKEN" ]; then
    test_endpoint "WhatsApp Status" "/api/v1/whatsapp/status" 200 true
else
    print_error "Skipping - requires authentication"
fi

print_info "Testing: Email Service"
if [ -n "$TOKEN" ]; then
    test_endpoint "Email Templates" "/api/v1/email/templates" 200 true
else
    print_error "Skipping - requires authentication"
fi

# Test 6: Admin/Super Admin Endpoints
print_header "6. Admin/Super Admin Endpoints"

if [ -n "$TOKEN" ]; then
    print_info "Testing: Admin Dashboard"
    test_endpoint "Admin Dashboard" "/api/v1/admin/dashboard" 200 true || print_info "May require SUPER_ADMIN role"
    
    print_info "Testing: Service Health"
    test_endpoint "Service Health" "/api/v1/monitoring/health" 200 true || print_info "May require SUPER_ADMIN role"
else
    print_error "Skipping - requires authentication"
fi

# ============================================================
# Summary
# ============================================================

print_header "Test Summary"
print_info "API Base: $API_BASE"
print_info "Frontend URL: $FRONTEND_URL"
print_info "Token Status: ${TOKEN:+Set}${TOKEN:-Not Set}"

print_success "API testing script completed"
print_info "Review the output above for any failures"

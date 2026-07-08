# ============================================================
# Void Cloud — API Testing Script (PowerShell)
# Tests all microservice endpoints for manual verification
# ============================================================

# Configuration
$API_BASE = if ($env:API_BASE) { $env:API_BASE } else { "https://api.voidcloud.cc.cd" }
$FRONTEND_URL = if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { "https://voidcloud.cc.cd" }
$TOKEN = ""
$USER_EMAIL = "amer30004ever@hotmail.com"
$USER_PASSWORD = "VoidCloud2026!"

# Helper functions
function Print-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Endpoint,
        [int]$ExpectedStatus = 200,
        [bool]$AuthRequired = $false
    )
    
    $url = "$API_BASE$Endpoint"
    $headers = @{"Content-Type" = "application/json"}
    
    if ($AuthRequired -and $TOKEN) {
        $headers["Authorization"] = "Bearer $TOKEN"
    }
    
    Print-Info "Testing: $Name"
    Print-Info "URL: $url"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -ErrorAction Stop
        Print-Success "$Name returned HTTP 200"
        $response | ConvertTo-Json -Depth 2 | Out-String | Select-Object -First 10
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Print-Success "$Name returned HTTP $statusCode"
        }
        else {
            Print-Error "$Name returned HTTP $statusCode (expected $ExpectedStatus)"
        }
    }
    Write-Host ""
}

# ============================================================
# Main Test Execution
# ============================================================

Print-Header "Void Cloud API Testing Script"
Print-Info "API Base: $API_BASE"
Print-Info "Frontend URL: $FRONTEND_URL"

# Test 1: Health Endpoints (No Auth Required)
Print-Header "1. Health Endpoints"

Test-Endpoint -Name "Auth Health" -Endpoint "/api/v1/auth/health"
Test-Endpoint -Name "User Health" -Endpoint "/api/v1/users/health"
Test-Endpoint -Name "Tenant Health" -Endpoint "/api/v1/tenants/health"
Test-Endpoint -Name "VPS Health" -Endpoint "/api/v1/vps/health"
Test-Endpoint -Name "Billing Health" -Endpoint "/api/v1/billing/health"
Test-Endpoint -Name "CRM Health" -Endpoint "/api/v1/crm/health"
Test-Endpoint -Name "WhatsApp Health" -Endpoint "/api/v1/whatsapp/health"
Test-Endpoint -Name "Email Health" -Endpoint "/api/v1/email/health"
Test-Endpoint -Name "Notification Health" -Endpoint "/api/v1/notifications/health"
Test-Endpoint -Name "Monitoring Health" -Endpoint "/api/v1/monitoring/health"
Test-Endpoint -Name "Audit Health" -Endpoint "/api/v1/audit/health"
Test-Endpoint -Name "Analytics Health" -Endpoint "/api/v1/analytics/health"
Test-Endpoint -Name "Sub2API Health" -Endpoint "/api/v1/health"

# Test 2: Frontend Accessibility
Print-Header "2. Frontend Accessibility"

Print-Info "Testing: Frontend Homepage"
try {
    $frontendResponse = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -ErrorAction Stop
    Print-Success "Frontend returned HTTP $($frontendResponse.StatusCode)"
}
catch {
    Print-Error "Frontend returned HTTP $($_.Exception.Response.StatusCode.value__)"
}

# Test 3: Authentication Flow
Print-Header "3. Authentication Flow"

Print-Info "Testing: User Registration"
$registerBody = @{
    email = $USER_EMAIL
    password = $USER_PASSWORD
    name = "Test User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_BASE/api/v1/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -ErrorAction Stop
    Print-Success "Registration returned HTTP 201"
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 201 -or $statusCode -eq 200) {
        Print-Success "Registration returned HTTP $statusCode"
    }
    else {
        Print-Info "Registration returned HTTP $statusCode (user may already exist)"
    }
}

Print-Info "Testing: User Login"
$loginBody = @{
    email = $USER_EMAIL
    password = $USER_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    Print-Success "Login returned HTTP 200"
    $TOKEN = $loginResponse.access_token
    if ($TOKEN) {
        Print-Success "Token extracted successfully"
    }
    else {
        Print-Error "Could not extract token from response"
    }
}
catch {
    Print-Error "Login failed: $($_.Exception.Message)"
}

# Test 4: Authenticated Endpoints (if token available)
if ($TOKEN) {
    Print-Header "4. Authenticated Endpoints"
    
    Test-Endpoint -Name "Get Current User" -Endpoint "/api/v1/auth/me" -AuthRequired $true
    Test-Endpoint -Name "List Users" -Endpoint "/api/v1/users" -AuthRequired $true
    Test-Endpoint -Name "List Tenants" -Endpoint "/api/v1/tenants" -AuthRequired $true
    Test-Endpoint -Name "List VPS" -Endpoint "/api/v1/vps" -AuthRequired $true
    Test-Endpoint -Name "List Invoices" -Endpoint "/api/v1/billing/invoices" -AuthRequired $true
    Test-Endpoint -Name "List Leads" -Endpoint "/api/v1/crm/leads" -AuthRequired $true
    Test-Endpoint -Name "List Notifications" -Endpoint "/api/v1/notifications" -AuthRequired $true
    Test-Endpoint -Name "Get Audit Logs" -Endpoint "/api/v1/audit/logs" -AuthRequired $true
    Test-Endpoint -Name "Get Monitoring Data" -Endpoint "/api/v1/monitoring/metrics" -AuthRequired $true
    Test-Endpoint -Name "Get Analytics" -Endpoint "/api/v1/analytics/dashboard" -AuthRequired $true
}
else {
    Print-Header "4. Authenticated Endpoints"
    Print-Error "Skipping authenticated tests - no token available"
}

# Test 5: Service-Specific Endpoints
Print-Header "5. Service-Specific Endpoints"

if ($TOKEN) {
    Print-Info "Testing: Proxmox Cluster Status"
    Test-Endpoint -Name "List Clusters" -Endpoint "/api/v1/vps/clusters" -AuthRequired $true
    
    Print-Info "Testing: WhatsApp Connection Status"
    Test-Endpoint -Name "WhatsApp Status" -Endpoint "/api/v1/whatsapp/status" -AuthRequired $true
    
    Print-Info "Testing: Email Service"
    Test-Endpoint -Name "Email Templates" -Endpoint "/api/v1/email/templates" -AuthRequired $true
}
else {
    Print-Error "Skipping - requires authentication"
}

# Test 6: Admin/Super Admin Endpoints
Print-Header "6. Admin/Super Admin Endpoints"

if ($TOKEN) {
    Print-Info "Testing: Admin Dashboard"
    Test-Endpoint -Name "Admin Dashboard" -Endpoint "/api/v1/admin/dashboard" -AuthRequired $true
    
    Print-Info "Testing: Service Health"
    Test-Endpoint -Name "Service Health" -Endpoint "/api/v1/monitoring/health" -AuthRequired $true
}
else {
    Print-Error "Skipping - requires authentication"
}

# ============================================================
# Summary
# ============================================================

Print-Header "Test Summary"
Print-Info "API Base: $API_BASE"
Print-Info "Frontend URL: $FRONTEND_URL"
if ($TOKEN) {
    Print-Info "Token Status: Set"
}
else {
    Print-Info "Token Status: Not Set"
}

Print-Success "API testing script completed"
Print-Info "Review the output above for any failures"

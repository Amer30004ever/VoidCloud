# ============================================================
# Void Cloud — Run All Tests
# Executes the complete test suite across the repo
# ============================================================

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptsDir = $PSScriptRoot

$passCount = 0
$failCount = 0
$skipCount = 0
$errors = @()

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

function Invoke-TestStep {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    Print-Info "Running: $Name"
    try {
        & $Command
        Print-Success "$Name passed"
        $script:passCount++
    }
    catch {
        Print-Error "$Name failed: $($_.Exception.Message)"
        $script:failCount++
        $script:errors += $Name
    }
}

function Ensure-Dependencies {
    param(
        [string]$Dir,
        [string]$Label
    )
    if (-not (Test-Path (Join-Path $Dir "node_modules"))) {
        Print-Info "Installing dependencies for $Label..."
        Set-Location $Dir
        if (Test-Path "package-lock.json") {
            npm ci --silent 2>&1 | Select-Object -Last 3
        }
        else {
            npm install --silent 2>&1 | Select-Object -Last 3
        }
    }
    else {
        Print-Info "Dependencies already present for $Label"
    }
}

# ============================================================
# 1. Jest Unit / Integration Tests
# ============================================================
Print-Header "1. Jest Tests (services/ + tests/ *.spec.ts)"

$testsDir = Join-Path $repoRoot "tests"
if (Test-Path $testsDir) {
    Ensure-Dependencies -Dir $testsDir -Label "Jest"
    Invoke-TestStep -Name "jest --config jest.config.cjs --rootDir .." -Command {
        Set-Location $testsDir
        npx jest --config jest.config.cjs --rootDir ..
    }
}
else {
    Print-Info "tests/ directory not found"
    $script:skipCount++
}

# ============================================================
# 2. Node Test Runner (scripts/__tests__/*.test.mjs)
# ============================================================
Print-Header "2. Node Test Runner (scripts/__tests__)"

$nodeTestPattern = Join-Path $scriptsDir "__tests__\*.test.mjs"
if (Get-ChildItem -Path $nodeTestPattern -ErrorAction SilentlyContinue) {
    Invoke-TestStep -Name "node --test scripts/__tests__/*.test.mjs" -Command {
        Set-Location $scriptsDir
        node --test "__tests__/*.test.mjs"
    }
}
else {
    Print-Info "No Node test files found in scripts/__tests__/"
    $script:skipCount++
}

# ============================================================
# 3. E2E Playwright Tests
# ============================================================
Print-Header "3. E2E Playwright Tests"

$e2eDir = Join-Path $testsDir "e2e"
if (Test-Path $e2eDir) {
    Ensure-Dependencies -Dir $e2eDir -Label "E2E Playwright"
    Invoke-TestStep -Name "playwright test (tests/e2e)" -Command {
        Set-Location $e2eDir
        npx playwright test
    }
}
else {
    Print-Info "tests/e2e/ directory not found"
    $script:skipCount++
}

# ============================================================
# 4. API Test (PowerShell)
# ============================================================
Print-Header "4. API Test (PowerShell)"

$apiTestPs1 = Join-Path $scriptsDir "api-test.ps1"
if (Test-Path $apiTestPs1) {
    Invoke-TestStep -Name "api-test.ps1" -Command {
        Set-Location $scriptsDir
        & .\api-test.ps1
    }
}
else {
    Print-Info "api-test.ps1 not found"
    $script:skipCount++
}

# ============================================================
# 5. Backend Build Verification
# ============================================================
Print-Header "5. Backend Build Verification"

$services = @("auth", "user", "tenant", "vps", "billing", "crm", "email", "notification", "monitoring", "audit", "analytics", "whatsapp")

foreach ($service in $services) {
    $serviceDir = Join-Path $repoRoot "services\$service"
    if (-not (Test-Path $serviceDir)) {
        Print-Info "[SKIP] Directory services/$service not found"
        $script:skipCount++
        continue
    }

    Print-Info "Testing service: $service"
    
    Invoke-TestStep -Name "$service - npm install" -Command {
        Set-Location $serviceDir
        if (Test-Path "package-lock.json") {
            npm ci --silent 2>&1 | Select-Object -Last 3
        }
        else {
            npm install --silent 2>&1 | Select-Object -Last 3
        }
    }

    Invoke-TestStep -Name "$service - npm run build" -Command {
        Set-Location $serviceDir
        npm run build 2>&1
    }
}

# ============================================================
# 6. Bash Scripts (run if bash is available)
# ============================================================
Print-Header "6. Bash Scripts (if available)"

$bashScripts = @("api-test.sh", "test-backend.sh")
$bashAvailable = Get-Command bash -ErrorAction SilentlyContinue

if ($bashAvailable) {
    foreach ($script in $bashScripts) {
        $scriptPath = Join-Path $scriptsDir $script
        if (Test-Path $scriptPath) {
            Invoke-TestStep -Name "bash $script" -Command {
                Set-Location $scriptsDir
                bash $script
            }
        }
    }
}
else {
    Print-Info "Bash not available in PATH. Skipping: $($bashScripts -join ', ')"
    $script:skipCount++
}

# ============================================================
# Summary
# ============================================================
Print-Header "Test Summary"
Write-Host "  Passed: $passCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $skipCount" -ForegroundColor Yellow

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "  Failed steps:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "    - $err" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Print-Success "All tests completed successfully!"
exit 0

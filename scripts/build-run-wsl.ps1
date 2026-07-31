<#
.SYNOPSIS
  Build, run, and manage the VoidCloud portal stack via Docker Compose in WSL2.

.DESCRIPTION
  This script wraps `docker compose` commands for the VoidCloud portal.
  It fixes WSL2 DNS, ensures a .env file exists, runs database migrations,
  and provides options for building, starting, stopping, cleaning, and
  viewing logs.

.PARAMETER BuildOnly
  Only build Docker images; do not start containers.

.PARAMETER StartOnly
  Only start containers; do not rebuild images (uses cached builds).

.PARAMETER Stop
  Stop and remove all running containers.

.PARAMETER Clean
  Stop containers, remove containers, networks, and named volumes
  (fresh start — deletes postgres data).

.PARAMETER Logs
  Show container logs after starting (tail -f).

.PARAMETER SkipDeps
  Do not wait for infrastructure (postgres, redis, rabbitmq) to be healthy
  before starting app services. Useful for debugging startup order.

.PARAMETER Help
  Show this help message.

.EXAMPLE
  .\build-run-wsl.ps1
  # Full flow: fix DNS, ensure .env, build all, migrate DB, start all, wait for health

.EXAMPLE
  .\build-run-wsl.ps1 -BuildOnly
  # Build all Docker images without starting containers

.EXAMPLE
  .\build-run-wsl.ps1 -StartOnly -SkipDeps
  # Start containers from cached images without rebuilding or waiting for deps

.EXAMPLE
  .\build-run-wsl.ps1 -Clean
  # Full reset: stop, remove containers, networks, and volumes
#>

param(
    [switch]$BuildOnly,
    [switch]$StartOnly,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Logs,
    [switch]$SkipDeps,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ── Help ──────────────────────────────────────────────────────────────
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# ── Configuration ─────────────────────────────────────────────────────
$Root = "E:\Master_Mind\Amer_Brain\Repossitories\GitHub\Amer30004ever\Amer-Devops-Portal"
$EnvFile = Join-Path $Root ".env"

Set-Location $Root

# ── Step 0: Fix WSL2 DNS ──────────────────────────────────────────────
function Fix-Wsl2Dns {
    Write-Host "[DNS] Fixing WSL2 DNS (8.8.8.8 / 1.1.1.1) ..." -ForegroundColor Yellow
    wsl -u root bash -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf && echo 'nameserver 1.1.1.1' >> /etc/resolv.conf" 2>&1 | Out-Null
    Write-Host "[DNS] Done." -ForegroundColor DarkGray
}

# ── Step 1: Ensure .env exists ────────────────────────────────────────
function Ensure-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        Write-Host "[ENV] Creating .env from .env.example (SMTP_PASS override) ..." -ForegroundColor Yellow
        $lines = Get-Content "$Root\.env.example" | Where-Object { $_ -match '^[A-Z_]+\s+' }
        $envContent = @()
        foreach ($line in $lines) {
            $parts = $line -split '\t', 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                $envContent += "$key=$val"
            }
        }
        $envContent | Set-Content $EnvFile
        Write-Host "[ENV] Created .env with $($envContent.Count) variables." -ForegroundColor DarkGray
    } else {
        Write-Host "[ENV] .env already exists." -ForegroundColor DarkGray
    }
}

# ── Step 2: Docker context check ──────────────────────────────────────
function Test-DockerWsl {
    Write-Host "[DOCKER] Checking WSL2 Docker daemon ..." -ForegroundColor Yellow
    $info = wsl -e docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[DOCKER] ERROR: Docker daemon not reachable in WSL2." -ForegroundColor Red
        Write-Host "         Try:  wsl -u root dockerd" -ForegroundColor Gray
        exit 1
    }
    Write-Host "[DOCKER] WSL2 Docker is running." -ForegroundColor DarkGray
}

# ── Step 3: Build images ──────────────────────────────────────────────
function Build-Images {
    Write-Host "[BUILD] Building all service images ..." -ForegroundColor Yellow
    wsl -e bash -c "cd '$Root' && docker compose build" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[BUILD] ERROR: Docker build failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "[BUILD] All images built successfully." -ForegroundColor DarkGray
}

# ── Step 4: Start infrastructure containers first ─────────────────────────
function Start-Infra {
    Write-Host "[START] Starting infrastructure (postgres, redis, rabbitmq) ..." -ForegroundColor Yellow
    wsl -e bash -c "cd '$Root' && docker compose up -d postgres redis rabbitmq" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[START] ERROR: docker compose up failed." -ForegroundColor Red
        exit 1
    }

    # Wait for postgres to be ready so we can run migrations
    if (-not $SkipDeps) {
        Write-Host "[START] Waiting for postgres ..." -ForegroundColor Yellow
        $maxRetries = 30
        for ($i = 0; $i -lt $maxRetries; $i++) {
            wsl -e docker exec amer-devops-portal-postgres-1 pg_isready -U postgres 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[START] Postgres is ready." -ForegroundColor DarkGray
                Start-Sleep -Seconds 5
                break
            }
            Start-Sleep -Seconds 5
        }
    }

    Write-Host "[START] Infrastructure started." -ForegroundColor DarkGray
}

# ── Step 5: Start application containers ─────────────────────────────────
function Start-Apps {
    Write-Host "[START] Starting all application containers ..." -ForegroundColor Yellow
    wsl -e bash -c "cd '$Root' && docker compose up -d --skip-deps auth user tenant vps billing crm whatsapp email notification monitoring audit analytics sub2api agent frontend" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[START] ERROR: docker compose up failed." -ForegroundColor Red
        exit 1
    }

    if (-not $SkipDeps) {
        Write-Host "[START] Waiting for services to settle ..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    }

    Write-Host "[START] Application containers started." -ForegroundColor DarkGray
}

# ── Step 5: Run database migrations ───────────────────────────────────
function Run-Migrations {
    Write-Host "[DB] Running Prisma schema sync (db push) ..." -ForegroundColor Yellow
    wsl -e docker exec amer-devops-portal-auth-1 npx prisma db push --schema=./prisma/schema.prisma 2>&1
    Write-Host "[DB] Schema synced." -ForegroundColor DarkGray
}

# ── Step 6: Wait for auth service ─────────────────────────────────────
function Wait-ForAuth {
    Write-Host "[HEALTH] Waiting for auth service ..." -ForegroundColor Yellow
    $maxRetries = 30
    for ($i = 0; $i -lt $maxRetries; $i++) {
        $resp = curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>$null
        if ($resp -eq "200") {
            Write-Host "[HEALTH] Auth service is healthy (HTTP 200)." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "[HEALTH] WARNING: Auth service did not become healthy in $maxRetries attempts." -ForegroundColor Red
}

# ── Step 7: Wait for frontend ─────────────────────────────────────────
function Wait-ForFrontend {
    Write-Host "[HEALTH] Waiting for frontend ..." -ForegroundColor Yellow
    $maxRetries = 30
    for ($i = 0; $i -lt $maxRetries; $i++) {
        $resp = curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:3000/voidcloud 2>$null
        if ($resp -eq "200") {
            Write-Host "[HEALTH] Frontend is healthy (HTTP 200)." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "[HEALTH] WARNING: Frontend did not become healthy in $maxRetries attempts." -ForegroundColor Red
}

# ── Step 8: Show status ───────────────────────────────────────────────
function Show-Status {
    Write-Host ""
    Write-Host "=== SERVICE STATUS ===" -ForegroundColor Cyan
    wsl -e bash -c "cd '$Root' && docker compose ps --format 'table {{.Name}}`t{{.Status}}`t{{.Ports}}'" 2>&1
    Write-Host ""
    Write-Host "=== QUICK TESTS ===" -ForegroundColor Cyan
    $authStatus = curl.exe -s http://localhost:3001/api/v1/health 2>$null
    Write-Host "  Auth  (localhost:3001): $authStatus" -ForegroundColor DarkGray
    $frontendStatus = curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:3000/voidcloud 2>$null
    Write-Host "  Frontend (localhost:3000): HTTP $frontendStatus" -ForegroundColor DarkGray
}

# ── Step 9: Show logs ─────────────────────────────────────────────────
function Show-Logs {
    if ($Logs) {
        Write-Host ""
        Write-Host "=== CONTAINER LOGS (Ctrl+C to exit) ===" -ForegroundColor Cyan
        wsl -e bash -c "cd '$Root' && docker compose logs --follow --tail=50" 2>&1
    }
}

# ── Step 10: Stop ─────────────────────────────────────────────────────
function Stop-Containers {
    Write-Host "[STOP] Stopping all containers ..." -ForegroundColor Yellow
    wsl -e bash -c "cd '$Root' && docker compose stop" 2>&1
    Write-Host "[STOP] Done." -ForegroundColor DarkGray
}

# ── Step 11: Clean ────────────────────────────────────────────────────
function Clean-Stack {
    Write-Host "[CLEAN] Stopping and removing all containers, networks, and volumes ..." -ForegroundColor Yellow
    wsl -e bash -c "cd '$Root' && docker compose down -v --rmi local --remove-orphans" 2>&1
    Write-Host "[CLEAN] Reset complete." -ForegroundColor DarkGray
}

# ── Main ──────────────────────────────────────────────────────────────
if ($Stop)        { Stop-Containers; exit 0 }
if ($Clean)       { Clean-Stack;     exit 0 }

Fix-Wsl2Dns
Ensure-EnvFile
Test-DockerWsl

if ($BuildOnly) {
    Build-Images
    exit 0
}

if ($StartOnly) {
    Start-Infra
    Run-Migrations
    Start-Apps
    Wait-ForAuth
    Wait-ForFrontend
    Show-Status
    Show-Logs
    exit 0
}

# Full flow: build + start infra + migrate + start apps + verify
Build-Images
Start-Infra
Run-Migrations
Start-Apps
Wait-ForAuth
Wait-ForFrontend
Show-Status
Show-Logs

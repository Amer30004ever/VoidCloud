#!/usr/bin/env pwsh
# Build-Only.ps1 - Build Docker images only

Write-Host "========================================" -ForegroundColor Blue
Write-Host "📦 Amer Portal - Build Images Only" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Load dockerhub.env if exists
$envFile = "dockerhub.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    Write-Host "✅ Loaded Docker Hub configuration" -ForegroundColor Green
} else {
    Write-Host "⚠️  dockerhub.env not found. Using local tags only." -ForegroundColor Yellow
    $env:DOCKER_HUB_USERNAME = ""
}

# Set defaults
if (-not $env:DOCKER_HUB_REPO) { $env:DOCKER_HUB_REPO = "amer-portal" }
if (-not $env:BACKEND_IMAGE_TAG) { $env:BACKEND_IMAGE_TAG = "latest" }
if (-not $env:FRONTEND_IMAGE_TAG) { $env:FRONTEND_IMAGE_TAG = "latest" }

# Check if backend directory exists
if (-not (Test-Path "../backend")) {
    Write-Host "❌ Error: backend directory not found at ../backend" -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (-not (Test-Path "../frontend")) {
    Write-Host "❌ Error: frontend directory not found at ../frontend" -ForegroundColor Red
    exit 1
}

# Build Backend
Write-Host "📦 Building Backend image..." -ForegroundColor Blue
Push-Location ../backend
if ($env:DOCKER_HUB_USERNAME) {
    $backendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-backend:$($env:BACKEND_IMAGE_TAG)"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $timestampTag = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-backend:$timestamp"
    docker build -t $backendImage -t $timestampTag .
} else {
    $backendImage = "amer-portal-backend:$($env:BACKEND_IMAGE_TAG)"
    docker build -t $backendImage .
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend image built: $backendImage" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build backend image" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Build Frontend
Write-Host "📦 Building Frontend image..." -ForegroundColor Blue
Push-Location ../frontend
if ($env:DOCKER_HUB_USERNAME) {
    $frontendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-frontend:$($env:FRONTEND_IMAGE_TAG)"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $timestampTag = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-frontend:$timestamp"
    docker build -t $frontendImage -t $timestampTag .
} else {
    $frontendImage = "amer-portal-frontend:$($env:FRONTEND_IMAGE_TAG)"
    docker build -t $frontendImage .
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend image built: $frontendImage" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build frontend image" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Built images:" -ForegroundColor Yellow
Write-Host "   Backend:  $backendImage" -ForegroundColor Green
Write-Host "   Frontend: $frontendImage" -ForegroundColor Green
Write-Host ""
if ($env:DOCKER_HUB_USERNAME) {
    Write-Host "To push to Docker Hub, run: ./Push-Only.ps1" -ForegroundColor Yellow
    Write-Host "To build and deploy, run: ./Build-AndDeploy.ps1" -ForegroundColor Yellow
} else {
    Write-Host "To deploy locally, run: ./Deploy-Only.ps1" -ForegroundColor Yellow
}
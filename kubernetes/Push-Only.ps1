#!/usr/bin/env pwsh
# Push-Only.ps1 - Push images to Docker Hub

Write-Host "========================================" -ForegroundColor Blue
Write-Host "☁️  Amer Portal - Push to Docker Hub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Load dockerhub.env
$envFile = "dockerhub.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
} else {
    Write-Host "❌ Error: dockerhub.env not found!" -ForegroundColor Red
    Write-Host "Please create dockerhub.env from .env.example" -ForegroundColor Yellow
    exit 1
}

if (-not $env:DOCKER_HUB_USERNAME -or -not $env:DOCKER_HUB_TOKEN) {
    Write-Host "❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set" -ForegroundColor Red
    exit 1
}

if (-not $env:DOCKER_HUB_REPO) { $env:DOCKER_HUB_REPO = "amer-portal" }
if (-not $env:BACKEND_IMAGE_TAG) { $env:BACKEND_IMAGE_TAG = "latest" }
if (-not $env:FRONTEND_IMAGE_TAG) { $env:FRONTEND_IMAGE_TAG = "latest" }

$backendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-backend:$($env:BACKEND_IMAGE_TAG)"
$frontendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-frontend:$($env:FRONTEND_IMAGE_TAG)"

# Login to Docker Hub
Write-Host "🔐 Logging into Docker Hub..." -ForegroundColor Blue
.\Docker-Login.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

# Push Backend
Write-Host "☁️  Pushing Backend image..." -ForegroundColor Blue
docker push $backendImage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend image pushed: $backendImage" -ForegroundColor Green
    
    # Also push timestamped tag if it exists
    $timestampTag = docker images --format "{{.Tag}}" | Select-String -Pattern "^\d{8}-\d{6}$" | Select-Object -First 1
    if ($timestampTag) {
        docker push "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-backend:$timestampTag"
        Write-Host "✅ Also pushed timestamp tag: $timestampTag" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to push backend image" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Push Frontend
Write-Host "☁️  Pushing Frontend image..." -ForegroundColor Blue
docker push $frontendImage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend image pushed: $frontendImage" -ForegroundColor Green
    
    $timestampTag = docker images --format "{{.Tag}}" | Select-String -Pattern "^\d{8}-\d{6}$" | Select-Object -First 1
    if ($timestampTag) {
        docker push "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-frontend:$timestampTag"
        Write-Host "✅ Also pushed timestamp tag: $timestampTag" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to push frontend image" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Push Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images available at:" -ForegroundColor Yellow
Write-Host "   https://hub.docker.com/r/$backendImage" -ForegroundColor Green
Write-Host "   https://hub.docker.com/r/$frontendImage" -ForegroundColor Green
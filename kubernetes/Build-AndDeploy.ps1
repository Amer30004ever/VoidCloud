#!/usr/bin/env pwsh
# Build-AndDeploy.ps1 - Complete build, push, and deploy

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🚀 Amer Portal - Complete Build & Deploy" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Load configuration
$envFile = "dockerhub.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    Write-Host "✅ Loaded configuration from dockerhub.env" -ForegroundColor Green
} else {
    Write-Host "❌ Error: dockerhub.env not found!" -ForegroundColor Red
    Write-Host "Please create dockerhub.env from .env.example" -ForegroundColor Yellow
    exit 1
}

# Validate required variables
if (-not $env:DOCKER_HUB_USERNAME -or -not $env:DOCKER_HUB_TOKEN) {
    Write-Host "❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set in dockerhub.env" -ForegroundColor Red
    exit 1
}

# Set defaults
if (-not $env:NAMESPACE) { $env:NAMESPACE = "voidcloud" }
if (-not $env:DOMAIN) { $env:DOMAIN = "amer.homelab.com" }
if (-not $env:DOCKER_HUB_REPO) { $env:DOCKER_HUB_REPO = "voidcloud" }
if (-not $env:BACKEND_IMAGE_TAG) { $env:BACKEND_IMAGE_TAG = "latest" }
if (-not $env:FRONTEND_IMAGE_TAG) { $env:FRONTEND_IMAGE_TAG = "latest" }

$backendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-backend:$($env:BACKEND_IMAGE_TAG)"
$frontendImage = "$($env:DOCKER_HUB_USERNAME)/$($env:DOCKER_HUB_REPO)-frontend:$($env:FRONTEND_IMAGE_TAG)"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Docker Hub User: $($env:DOCKER_HUB_USERNAME)" -ForegroundColor Green
Write-Host "   Backend Image: $backendImage" -ForegroundColor Green
Write-Host "   Frontend Image: $frontendImage" -ForegroundColor Green
Write-Host "   Namespace: $($env:NAMESPACE)" -ForegroundColor Green
Write-Host "   Domain: $($env:DOMAIN)" -ForegroundColor Green
Write-Host ""

# Step 1: Build images
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📦 Step 1/4: Building Docker Images" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
.\Build-Only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

# Step 2: Push to Docker Hub
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "☁️  Step 2/4: Pushing to Docker Hub" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
.\Push-Only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

# Step 3: Update Kubernetes deployments
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🔄 Step 3/4: Updating Kubernetes Manifests" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Update backend deployment
if (Test-Path "backend/deployment.yaml") {
    # Backup original if not exists
    if (-not (Test-Path "backend/deployment.yaml.bak")) {
        Copy-Item "backend/deployment.yaml" "backend/deployment.yaml.bak"
        Write-Host "✅ Created backup: backend/deployment.yaml.bak" -ForegroundColor Green
    }
    
    # Update image
    (Get-Content "backend/deployment.yaml") -replace 'image:.*voidcloud-backend.*', "image: $backendImage" | Set-Content "backend/deployment.yaml"
    (Get-Content "backend/deployment.yaml") -replace 'image:.*/voidcloud-backend:.*', "image: $backendImage" | Set-Content "backend/deployment.yaml"
    
    # Ensure imagePullPolicy is Always
    $content = Get-Content "backend/deployment.yaml"
    if ($content -match 'imagePullPolicy:') {
        $content = $content -replace 'imagePullPolicy:.*', 'imagePullPolicy: Always'
    } else {
        # Add imagePullPolicy after image line
        $content = $content -replace "(image: $backendImage)", "`$1`n          imagePullPolicy: Always"
    }
    $content | Set-Content "backend/deployment.yaml"
    
    Write-Host "✅ Updated backend/deployment.yaml with: $backendImage" -ForegroundColor Green
}

# Update frontend deployment
if (Test-Path "frontend/deployment.yaml") {
    if (-not (Test-Path "frontend/deployment.yaml.bak")) {
        Copy-Item "frontend/deployment.yaml" "frontend/deployment.yaml.bak"
        Write-Host "✅ Created backup: frontend/deployment.yaml.bak" -ForegroundColor Green
    }
    
    (Get-Content "frontend/deployment.yaml") -replace 'image:.*voidcloud-frontend.*', "image: $frontendImage" | Set-Content "frontend/deployment.yaml"
    (Get-Content "frontend/deployment.yaml") -replace 'image:.*/voidcloud-frontend:.*', "image: $frontendImage" | Set-Content "frontend/deployment.yaml"
    
    $content = Get-Content "frontend/deployment.yaml"
    if ($content -match 'imagePullPolicy:') {
        $content = $content -replace 'imagePullPolicy:.*', 'imagePullPolicy: Always'
    } else {
        $content = $content -replace "(image: $frontendImage)", "`$1`n          imagePullPolicy: Always"
    }
    $content | Set-Content "frontend/deployment.yaml"
    
    Write-Host "✅ Updated frontend/deployment.yaml with: $frontendImage" -ForegroundColor Green
}
Write-Host ""

# Step 4: Deploy to Kubernetes
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🚀 Step 4/4: Deploying to Kubernetes" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
.\Deploy-Only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Complete! Application Deployed 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Useful Commands:" -ForegroundColor Yellow
Write-Host "   # Check status: ./Status.ps1" -ForegroundColor White
Write-Host "   # View logs: kubectl logs -n $($env:NAMESPACE) -l app=backend -f" -ForegroundColor White
Write-Host "   # Restart backend: kubectl rollout restart -n $($env:NAMESPACE) deployment/backend" -ForegroundColor White
Write-Host "   # Clean up: ./Cleanup.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: https://$($env:DOMAIN)" -ForegroundColor Green
Write-Host "   API: https://$($env:API_DOMAIN)/api/v1" -ForegroundColor Green
Write-Host "   Health: https://$($env:API_DOMAIN)/api/v1/health" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Admin Login:" -ForegroundColor Yellow
Write-Host "   Email: admin@amer.dev" -ForegroundColor Green
Write-Host "   Password: AmerDevOps2026!" -ForegroundColor Green
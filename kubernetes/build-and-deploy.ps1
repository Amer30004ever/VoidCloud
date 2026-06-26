#!/usr/bin/env pwsh
# build-and-deploy.ps1

$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$RED = "`e[31m"
$NC = "`e[0m"

Write-Host "${BLUE}========================================${NC}"
Write-Host "${GREEN}🚀 Amer Portal - Complete Build & Deploy${NC}"
Write-Host "${BLUE}========================================${NC}"
Write-Host ""

# Load configuration
if (Test-Path "dockerhub.env") {
    Get-Content "dockerhub.env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            Set-Variable -Name $matches[1] -Value $matches[2] -Scope Global
        }
    }
    Write-Host "${GREEN}✅ Loaded configuration from dockerhub.env${NC}"
} else {
    Write-Host "${RED}❌ Error: dockerhub.env not found!${NC}"
    Write-Host "${YELLOW}Please create dockerhub.env from .env.example${NC}"
    exit 1
}

# Validate credentials
if (-not $env:DOCKER_HUB_USERNAME -or -not $env:DOCKER_HUB_TOKEN) {
    Write-Host "${RED}❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set${NC}"
    exit 1
}

# Set defaults
$NAMESPACE = if ($env:NAMESPACE) { $env:NAMESPACE } else { "voidcloud" }
$DOMAIN = if ($env:DOMAIN) { $env:DOMAIN } else { "amer.homelab.com" }
$DOCKER_HUB_REPO = if ($env:DOCKER_HUB_REPO) { $env:DOCKER_HUB_REPO } else { "voidcloud" }
$BACKEND_IMAGE_TAG = if ($env:BACKEND_IMAGE_TAG) { $env:BACKEND_IMAGE_TAG } else { "latest" }
$FRONTEND_IMAGE_TAG = if ($env:FRONTEND_IMAGE_TAG) { $env:FRONTEND_IMAGE_TAG } else { "latest" }

$BACKEND_IMAGE = "$($env:DOCKER_HUB_USERNAME)/$DOCKER_HUB_REPO-backend`:$BACKEND_IMAGE_TAG"
$FRONTEND_IMAGE = "$($env:DOCKER_HUB_USERNAME)/$DOCKER_HUB_REPO-frontend`:$FRONTEND_IMAGE_TAG"

Write-Host "${YELLOW}Configuration:${NC}"
Write-Host "   Docker Hub User: ${GREEN}$($env:DOCKER_HUB_USERNAME)${NC}"
Write-Host "   Backend Image: ${GREEN}$BACKEND_IMAGE${NC}"
Write-Host "   Frontend Image: ${GREEN}$FRONTEND_IMAGE${NC}"
Write-Host "   Namespace: ${GREEN}$NAMESPACE${NC}"
Write-Host "   Domain: ${GREEN}$DOMAIN${NC}"
Write-Host ""

# Step 1: Build images
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
Write-Host "${BLUE}📦 Step 1/4: Building Docker Images${NC}"
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
& .\build-only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

# Step 2: Push to Docker Hub
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
Write-Host "${BLUE}☁️  Step 2/4: Pushing to Docker Hub${NC}"
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
& .\push-only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

# Step 3: Update Kubernetes deployments
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
Write-Host "${BLUE}🔄 Step 3/4: Updating Kubernetes Manifests${NC}"
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Update backend deployment
if (Test-Path "backend\deployment.yaml") {
    if (-not (Test-Path "backend\deployment.yaml.bak")) {
        Copy-Item "backend\deployment.yaml" "backend\deployment.yaml.bak"
        Write-Host "${GREEN}✅ Created backup: backend\deployment.yaml.bak${NC}"
    }
    # Update image using PowerShell
    $content = Get-Content "backend\deployment.yaml" -Raw
    $content = $content -replace "image:.*voidcloud-backend.*", "image: $BACKEND_IMAGE"
    $content = $content -replace "image:.*/voidcloud-backend:.*", "image: $BACKEND_IMAGE"
    $content = $content -replace "imagePullPolicy:.*", "imagePullPolicy: Always"
    Set-Content "backend\deployment.yaml" $content -NoNewline
    Write-Host "${GREEN}✅ Updated backend\deployment.yaml with: $BACKEND_IMAGE${NC}"
}

# Update frontend deployment
if (Test-Path "frontend\deployment.yaml") {
    if (-not (Test-Path "frontend\deployment.yaml.bak")) {
        Copy-Item "frontend\deployment.yaml" "frontend\deployment.yaml.bak"
        Write-Host "${GREEN}✅ Created backup: frontend\deployment.yaml.bak${NC}"
    }
    $content = Get-Content "frontend\deployment.yaml" -Raw
    $content = $content -replace "image:.*voidcloud-frontend.*", "image: $FRONTEND_IMAGE"
    $content = $content -replace "image:.*/voidcloud-frontend:.*", "image: $FRONTEND_IMAGE"
    $content = $content -replace "imagePullPolicy:.*", "imagePullPolicy: Always"
    Set-Content "frontend\deployment.yaml" $content -NoNewline
    Write-Host "${GREEN}✅ Updated frontend\deployment.yaml with: $FRONTEND_IMAGE${NC}"
}
Write-Host ""

# Step 4: Deploy to Kubernetes
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
Write-Host "${BLUE}🚀 Step 4/4: Deploying to Kubernetes${NC}"
Write-Host "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
& .\deploy-only.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""

Write-Host "${GREEN}========================================${NC}"
Write-Host "${GREEN}✅ Complete! Application Deployed 🎉${NC}"
Write-Host "${GREEN}========================================${NC}"
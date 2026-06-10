#!/usr/bin/env pwsh
# Deploy-Only.ps1 - Deploy to Kubernetes only

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🚀 Amer Portal - Kubernetes Deploy Only" -ForegroundColor Green
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
    Write-Host "✅ Loaded configuration" -ForegroundColor Green
} else {
    Write-Host "⚠️  dockerhub.env not found. Using defaults." -ForegroundColor Yellow
}

if (-not $env:NAMESPACE) { $env:NAMESPACE = "amer-portal" }
if (-not $env:DOMAIN) { $env:DOMAIN = "amer.homelab.com" }
if (-not $env:API_DOMAIN) { $env:API_DOMAIN = "api.$($env:DOMAIN)" }

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Namespace: $($env:NAMESPACE)" -ForegroundColor Green
Write-Host "   Domain: $($env:DOMAIN)" -ForegroundColor Green
Write-Host "   API Domain: $($env:API_DOMAIN)" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend") -or -not (Test-Path "postgres")) {
    Write-Host "❌ Error: Must run from kubernetes directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Update configmaps with domain
Write-Host "📝 Updating configuration with domain..." -ForegroundColor Blue
if (Test-Path "configmaps.yaml") {
    (Get-Content "configmaps.yaml") -replace 'amer\.yourdomain\.com', $env:DOMAIN | Set-Content "configmaps.yaml"
    (Get-Content "configmaps.yaml") -replace 'api\.amer\.yourdomain\.com', $env:API_DOMAIN | Set-Content "configmaps.yaml"
    Write-Host "✅ Updated configmaps.yaml" -ForegroundColor Green
}

if (Test-Path "ingress.yaml") {
    (Get-Content "ingress.yaml") -replace 'amer\.yourdomain\.com', $env:DOMAIN | Set-Content "ingress.yaml"
    (Get-Content "ingress.yaml") -replace 'api\.amer\.yourdomain\.com', $env:API_DOMAIN | Set-Content "ingress.yaml"
    Write-Host "✅ Updated ingress.yaml" -ForegroundColor Green
}
Write-Host ""

# Create namespace
Write-Host "📁 Creating namespace..." -ForegroundColor Blue
kubectl create namespace $env:NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
Write-Host "✅ Namespace ready" -ForegroundColor Green
Write-Host ""

# Create Docker registry secret if Docker Hub credentials exist
if ($env:DOCKER_HUB_USERNAME -and $env:DOCKER_HUB_TOKEN) {
    Write-Host "🔐 Creating Docker registry secret..." -ForegroundColor Blue
    kubectl create secret docker-registry dockerhub-secret `
        --namespace $env:NAMESPACE `
        --docker-server=https://index.docker.io/v1/ `
        --docker-username="$($env:DOCKER_HUB_USERNAME)" `
        --docker-password="$($env:DOCKER_HUB_TOKEN)" `
        --dry-run=client -o yaml | kubectl apply -f -
    Write-Host "✅ Registry secret created" -ForegroundColor Green
    Write-Host ""
}

# Apply ConfigMaps and Secrets
Write-Host "📝 Applying ConfigMaps and Secrets..." -ForegroundColor Blue
kubectl apply -f configmaps.yaml
kubectl apply -f secrets.yaml
Write-Host "✅ Configs applied" -ForegroundColor Green
Write-Host ""

# Deploy PostgreSQL
Write-Host "🗄️ Deploying PostgreSQL..." -ForegroundColor Blue
kubectl apply -f postgres/pv.yaml
kubectl apply -f postgres/pvc.yaml
kubectl apply -f postgres/deployment.yaml
kubectl apply -f postgres/service.yaml

Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=postgres -n $env:NAMESPACE --timeout=180s
Write-Host "✅ PostgreSQL ready" -ForegroundColor Green
Write-Host ""

# Deploy Backend
Write-Host "⚙️ Deploying Backend..." -ForegroundColor Blue
kubectl apply -f backend/deployment.yaml
kubectl apply -f backend/service.yaml

Write-Host "⏳ Waiting for Backend to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=backend -n $env:NAMESPACE --timeout=180s
Write-Host "✅ Backend ready" -ForegroundColor Green
Write-Host ""

# Deploy Frontend
Write-Host "🎨 Deploying Frontend..." -ForegroundColor Blue
kubectl apply -f frontend/deployment.yaml
kubectl apply -f frontend/service.yaml

Write-Host "⏳ Waiting for Frontend to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=frontend -n $env:NAMESPACE --timeout=180s
Write-Host "✅ Frontend ready" -ForegroundColor Green
Write-Host ""

# Deploy Ingress
Write-Host "🌐 Deploying Ingress..." -ForegroundColor Blue
kubectl apply -f ingress.yaml
Write-Host "✅ Ingress deployed" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Check status: ./Status.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Access your app:" -ForegroundColor Yellow
Write-Host "   https://$($env:DOMAIN)" -ForegroundColor Green
Write-Host "   https://$($env:API_DOMAIN)/api/v1/health" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email: admin@amer.dev" -ForegroundColor Green
Write-Host "   Password: AmerDevOps2026!" -ForegroundColor Green
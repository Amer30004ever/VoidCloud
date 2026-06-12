# deploy.ps1 - Amer Devops Portal
# Portable version that works from any location

param(
    [string]$Namespace = "amer-portal",
    [string]$Domain = "amer.homelab.com",
    [string]$ApiDomain = "",
    [string]$DockerHubUsername = "amer30004ever",
    [string]$DockerHubToken = ""
)

$ErrorActionPreference = "Stop"

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set API domain if not provided
if ([string]::IsNullOrEmpty($ApiDomain)) {
    $ApiDomain = "api.$Domain"
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Amer Devops Portal - Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Script Path: $scriptPath" -ForegroundColor Gray
Write-Host "  Namespace: $Namespace" -ForegroundColor Green
Write-Host "  Domain: $Domain" -ForegroundColor Green
Write-Host "  API Domain: $ApiDomain" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path (Join-Path $scriptPath "backend")) -or 
    -not (Test-Path (Join-Path $scriptPath "frontend")) -or 
    -not (Test-Path (Join-Path $scriptPath "postgres"))) {
    Write-Host "Error: Must run from kubernetes directory with subdirectories: backend, frontend, postgres" -ForegroundColor Red
    Write-Host "Current directory: $scriptPath" -ForegroundColor Yellow
    exit 1
}

# Function to create or update secret
function Create-Secret {
    param(
        [string]$Name,
        [hashtable]$Data
    )
    
    Write-Host "  Creating secret: $Name" -ForegroundColor Gray
    
    # Check if secret exists
    $existingSecret = kubectl get secret $Name -n $Namespace --ignore-not-found 2>$null
    
    if ($existingSecret) {
        Write-Host "    Secret already exists, updating..." -ForegroundColor Yellow
        # Delete and recreate to update
        kubectl delete secret $Name -n $Namespace --ignore-not-found 2>$null
        Start-Sleep -Seconds 1
    }
    
    # Build kubectl command
    $cmd = "kubectl create secret generic $Name -n $Namespace"
    foreach ($key in $Data.Keys) {
        $value = $Data[$key]
        if ($value) {
            $cmd += " --from-literal=$key=$value"
        }
    }
    
    # Execute
    Invoke-Expression $cmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Secret created: $Name" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Failed to create secret: $Name" -ForegroundColor Yellow
    }
}

# Create secrets.yaml file (as backup)
Write-Host "Creating secrets.yaml file..." -ForegroundColor Blue
$secretsFile = Join-Path $scriptPath "secrets.yaml"

# Generate JWT secret if not provided
$jwtSecret = if ($env:JWT_SECRET) { $env:JWT_SECET } else { [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) }

$secretsYamlContent = @"
apiVersion: v1
kind: Secret
metadata:
  name: amer-portal-secrets
  namespace: $Namespace
type: Opaque
stringData:
  # Database credentials
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  POSTGRES_DB: amer_portal
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/amer_portal
  
  # JWT Secret
  JWT_SECRET: $jwtSecret
  
  # WhatsApp API credentials (configure if needed)
  WHATSAPP_ACCESS_TOKEN: ""
  WHATSAPP_PHONE_NUMBER_ID: ""
  WHATSAPP_WABA_ID: ""
  WHATSAPP_VERIFY_TOKEN: ""
  WEBHOOK_SECRET: ""
"@

$secretsYamlContent | Out-File -FilePath $secretsFile -Encoding utf8
Write-Host "  Created: secrets.yaml" -ForegroundColor Green
Write-Host ""

# Create dockerhub-secret.yaml if credentials provided
if ($DockerHubToken) {
    Write-Host "Creating dockerhub-secret.yaml..." -ForegroundColor Blue
    $dockerhubSecretFile = Join-Path $scriptPath "dockerhub-secret.yaml"
    
    $dockerconfigjson = @"
{
  "auths": {
    "https://index.docker.io/v1/": {
      "username": "$DockerHubUsername",
      "password": "$DockerHubToken"
    }
  }
}
"@
    # Convert to base64 for the secret
    $dockerconfigjsonBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($dockerconfigjson))
    
    $dockerhubSecretYaml = @"
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-secret
  namespace: $Namespace
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $dockerconfigjsonBase64
"@
    $dockerhubSecretYaml | Out-File -FilePath $dockerhubSecretFile -Encoding utf8
    Write-Host "  Created: dockerhub-secret.yaml" -ForegroundColor Green
    Write-Host ""
}

# Update configmaps with domain
Write-Host "Updating configuration with domain..." -ForegroundColor Blue
$configmapsFile = Join-Path $scriptPath "configmaps.yaml"
if (Test-Path $configmapsFile) {
    (Get-Content $configmapsFile) -replace 'amer\.yourdomain\.com', $Domain | Set-Content $configmapsFile
    (Get-Content $configmapsFile) -replace 'api\.amer\.yourdomain\.com', $ApiDomain | Set-Content $configmapsFile
    Write-Host "  Updated configmaps.yaml" -ForegroundColor Green
} else {
    # Create default configmaps.yaml if not exists
    $configmapsContent = @"
apiVersion: v1
kind: ConfigMap
metadata:
  name: amer-portal-config
  namespace: $Namespace
data:
  NODE_ENV: production
  BACKEND_PORT: "3001"
  FRONTEND_PORT: "3000"
  API_URL: http://backend:3001/api/v1
  NEXT_PUBLIC_API_URL: https://$ApiDomain/api/v1
"@
    $configmapsContent | Out-File -FilePath $configmapsFile -Encoding utf8
    Write-Host "  Created configmaps.yaml" -ForegroundColor Green
}

$ingressFile = Join-Path $scriptPath "ingress.yaml"
if (Test-Path $ingressFile) {
    (Get-Content $ingressFile) -replace 'amer\.yourdomain\.com', $Domain | Set-Content $ingressFile
    (Get-Content $ingressFile) -replace 'api\.amer\.yourdomain\.com', $ApiDomain | Set-Content $ingressFile
    Write-Host "  Updated ingress.yaml" -ForegroundColor Green
}
Write-Host ""

# Create namespace
Write-Host "Creating namespace..." -ForegroundColor Blue
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
Write-Host "  Namespace: $Namespace" -ForegroundColor Green
Write-Host ""

# Apply Secrets (using kubectl apply)
Write-Host "Applying Secrets..." -ForegroundColor Blue
if (Test-Path $secretsFile) {
    kubectl apply -f $secretsFile
    Write-Host "  Secrets applied from secrets.yaml" -ForegroundColor Green
}

# Apply Docker Hub secret if exists
$dockerhubSecretFile = Join-Path $scriptPath "dockerhub-secret.yaml"
if (Test-Path $dockerhubSecretFile) {
    kubectl apply -f $dockerhubSecretFile
    Write-Host "  Docker Hub secret applied" -ForegroundColor Green
}
Write-Host ""

# Apply ConfigMaps
Write-Host "Applying ConfigMaps..." -ForegroundColor Blue
if (Test-Path $configmapsFile) {
    kubectl apply -f $configmapsFile
    Write-Host "  ConfigMaps applied" -ForegroundColor Green
}
Write-Host ""

# Deploy PostgreSQL
Write-Host "Deploying PostgreSQL..." -ForegroundColor Blue
$postgresPath = Join-Path $scriptPath "postgres"

$pvFile = Join-Path $postgresPath "pv.yaml"
if (Test-Path $pvFile) { 
    kubectl apply -f $pvFile
    Write-Host "  PV applied" -ForegroundColor Green
}

$pvcFile = Join-Path $postgresPath "pvc.yaml"
if (Test-Path $pvcFile) { 
    kubectl apply -f $pvcFile -n $Namespace
    Write-Host "  PVC applied" -ForegroundColor Green
}

$deploymentFile = Join-Path $postgresPath "deployment.yaml"
if (Test-Path $deploymentFile) { 
    kubectl apply -f $deploymentFile -n $Namespace
    Write-Host "  Deployment applied" -ForegroundColor Green
}

$serviceFile = Join-Path $postgresPath "service.yaml"
if (Test-Path $serviceFile) { 
    kubectl apply -f $serviceFile -n $Namespace
    Write-Host "  Service applied" -ForegroundColor Green
}

Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 12) {
    $ready = kubectl get pods -n $Namespace -l app=postgres -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>$null
    if ($ready -eq "true") {
        Write-Host "  PostgreSQL is ready" -ForegroundColor Green
        break
    }
    $retries++
    Start-Sleep -Seconds 5
    Write-Host "    Waiting... ($($retries*5)/60 seconds)" -ForegroundColor Gray
}
if ($retries -ge 12) {
    Write-Host "  WARNING: PostgreSQL may still be starting" -ForegroundColor Yellow
    kubectl get pods -n $Namespace -l app=postgres
}
Write-Host ""

# Deploy Backend
Write-Host "Deploying Backend..." -ForegroundColor Blue
$backendPath = Join-Path $scriptPath "backend"

$deploymentFile = Join-Path $backendPath "deployment.yaml"
if (Test-Path $deploymentFile) { 
    kubectl apply -f $deploymentFile -n $Namespace
    Write-Host "  Deployment applied" -ForegroundColor Green
}

$serviceFile = Join-Path $backendPath "service.yaml"
if (Test-Path $serviceFile) { 
    kubectl apply -f $serviceFile -n $Namespace
    Write-Host "  Service applied" -ForegroundColor Green
}

$rbacFile = Join-Path $backendPath "rbac.yaml"
if (Test-Path $rbacFile) { 
    kubectl apply -f $rbacFile -n $Namespace
    Write-Host "  RBAC applied" -ForegroundColor Green
}

Write-Host "Waiting for Backend to be ready..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 12) {
    $ready = kubectl get pods -n $Namespace -l app=backend -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>$null
    if ($ready -eq "true") {
        Write-Host "  Backend is ready" -ForegroundColor Green
        break
    }
    $retries++
    Start-Sleep -Seconds 5
    Write-Host "    Waiting... ($($retries*5)/60 seconds)" -ForegroundColor Gray
}
if ($retries -ge 12) {
    Write-Host "  WARNING: Backend may still be starting" -ForegroundColor Yellow
    kubectl get pods -n $Namespace -l app=backend
}
Write-Host ""

# Deploy Frontend
Write-Host "Deploying Frontend..." -ForegroundColor Blue
$frontendPath = Join-Path $scriptPath "frontend"

$deploymentFile = Join-Path $frontendPath "deployment.yaml"
if (Test-Path $deploymentFile) { 
    kubectl apply -f $deploymentFile -n $Namespace
    Write-Host "  Deployment applied" -ForegroundColor Green
}

$serviceFile = Join-Path $frontendPath "service.yaml"
if (Test-Path $serviceFile) { 
    kubectl apply -f $serviceFile -n $Namespace
    Write-Host "  Service applied" -ForegroundColor Green
}

Write-Host "Waiting for Frontend to be ready..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 12) {
    $ready = kubectl get pods -n $Namespace -l app=frontend -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>$null
    if ($ready -eq "true") {
        Write-Host "  Frontend is ready" -ForegroundColor Green
        break
    }
    $retries++
    Start-Sleep -Seconds 5
    Write-Host "    Waiting... ($($retries*5)/60 seconds)" -ForegroundColor Gray
}
if ($retries -ge 12) {
    Write-Host "  WARNING: Frontend may still be starting" -ForegroundColor Yellow
    kubectl get pods -n $Namespace -l app=frontend
}
Write-Host ""

# Deploy Ingress
Write-Host "Deploying Ingress..." -ForegroundColor Blue
$ingressFile = Join-Path $scriptPath "ingress.yaml"
if (Test-Path $ingressFile) { 
    kubectl apply -f $ingressFile -n $Namespace
    Write-Host "  Ingress applied" -ForegroundColor Green
}

$traefikMiddlewaresFile = Join-Path $scriptPath "traefik-middlewares.yaml"
if (Test-Path $traefikMiddlewaresFile) { 
    kubectl apply -f $traefikMiddlewaresFile -n $Namespace
    Write-Host "  Traefik middlewares applied" -ForegroundColor Green
}
Write-Host ""

# Show status
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "=== Pods in namespace: $Namespace ===" -ForegroundColor Cyan
kubectl get pods -n $Namespace 2>$null
Write-Host ""

Write-Host "=== Services in namespace: $Namespace ===" -ForegroundColor Cyan
kubectl get svc -n $Namespace 2>$null
Write-Host ""

Write-Host "=== Ingress in namespace: $Namespace ===" -ForegroundColor Cyan
kubectl get ingress -n $Namespace 2>$null
Write-Host ""

Write-Host "Access your app:" -ForegroundColor Yellow
Write-Host "  https://$Domain" -ForegroundColor Green
Write-Host "  https://$ApiDomain/api/v1/health" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@amer.dev" -ForegroundColor Green
Write-Host "  Password: AmerDevOps2026!" -ForegroundColor Green
Write-Host ""
Write-Host "Check status: .\Status.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Secrets created:" -ForegroundColor Cyan
Write-Host "  - amer-portal-secrets" -ForegroundColor Green
if (Test-Path $dockerhubSecretFile) {
    Write-Host "  - dockerhub-secret" -ForegroundColor Green
}
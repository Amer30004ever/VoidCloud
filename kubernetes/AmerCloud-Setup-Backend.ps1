# AmerCloud backend setup — PowerShell equivalent of amercloud-setup-backend.sh
# Usage:
#   Copy-Item proxmox.env.example proxmox.env
#   Edit proxmox.env (set PROXMOX_TOKEN_SECRET)
#   .\AmerCloud-Setup-Backend.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Namespace = if ($env:NAMESPACE) { $env:NAMESPACE } else { "voidcloud" }

$EnvFile = Join-Path $ScriptDir "proxmox.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            Set-Item -Path "env:$($parts[0].Trim())" -Value $parts[1].Trim()
        }
    }
}

$Defaults = @{
    DATABASE_URL         = "postgresql://postgres:postgres@postgres:5432/voidcloud"
    POSTGRES_USER        = "postgres"
    POSTGRES_PASSWORD    = "postgres"
    POSTGRES_DB          = "voidcloud"
    JWT_SECRET           = "YzI2ODVjYzktMWJlOC00MWJlLWI5YTItNDAxOWMwMjgzMGRi"
    PROXMOX_HOST         = "https://10.51.100.10:8006"
    PROXMOX_TOKEN_ID     = "root@pam!Amer-Cloud"
    PROXMOX_NODE         = "proxmox"
    PROXMOX_STORAGE      = "local-lvm"
    PROXMOX_BRIDGE       = "vmbr0"
    PROXMOX_GATEWAY      = "10.51.100.1"
    PROXMOX_IP_POOL_CIDR = "10.51.100.0/24"
    PROXMOX_TEMPLATE     = "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
    ADMIN_PASSWORD       = "Admin123"
}
foreach ($k in $Defaults.Keys) {
    if (-not (Get-Item "env:$k" -ErrorAction SilentlyContinue)) {
        Set-Item "env:$k" $Defaults[$k]
    }
}
if (-not $env:PROXMOX_TOKEN_SECRET) {
    throw "Set PROXMOX_TOKEN_SECRET in proxmox.env before running."
}

Write-Host "`n==> Ensuring namespace $Namespace" -ForegroundColor Cyan
kubectl get namespace $Namespace 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { kubectl create namespace $Namespace }

Write-Host "`n==> Creating/updating voidcloud-secrets" -ForegroundColor Cyan
kubectl create secret generic voidcloud-secrets -n $Namespace `
    --from-literal=DATABASE_URL=$env:DATABASE_URL `
    --from-literal=JWT_SECRET=$env:JWT_SECRET `
    --from-literal=POSTGRES_USER=$env:POSTGRES_USER `
    --from-literal=POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD `
    --from-literal=POSTGRES_DB=$env:POSTGRES_DB `
    --from-literal=PROXMOX_HOST=$env:PROXMOX_HOST `
    --from-literal=PROXMOX_TOKEN_ID=$env:PROXMOX_TOKEN_ID `
    --from-literal=PROXMOX_TOKEN_SECRET=$env:PROXMOX_TOKEN_SECRET `
    --from-literal=PROXMOX_NODE=$env:PROXMOX_NODE `
    --from-literal=PROXMOX_STORAGE=$env:PROXMOX_STORAGE `
    --from-literal=PROXMOX_BRIDGE=$env:PROXMOX_BRIDGE `
    --from-literal=PROXMOX_GATEWAY=$env:PROXMOX_GATEWAY `
    --from-literal=PROXMOX_IP_POOL_CIDR=$env:PROXMOX_IP_POOL_CIDR `
    --from-literal=PROXMOX_TEMPLATE=$env:PROXMOX_TEMPLATE `
    --dry-run=client -o yaml | kubectl apply -f -

Write-Host "`n==> Applying backend manifests (replace to avoid duplicate containers)" -ForegroundColor Cyan
kubectl replace --force -f (Join-Path $ScriptDir "backend\deployment.yaml") | Out-Null
kubectl apply -f (Join-Path $ScriptDir "backend\service.yaml") 2>$null
kubectl apply -f (Join-Path $ScriptDir "backend\rbac.yaml") 2>$null

Write-Host "`n==> Waiting for rollout" -ForegroundColor Cyan
kubectl rollout status deployment/backend -n $Namespace --timeout=180s

$BackendPod = kubectl get pods -n $Namespace -l app=backend -o jsonpath='{.items[0].metadata.name}'
Write-Host "Backend pod: $BackendPod"

Write-Host "`n==> Seeding cloud plans" -ForegroundColor Cyan
kubectl exec -n $Namespace $BackendPod -- sh -c "cd /app && node dist/cloud/seed.js"

Write-Host "`n==> Prisma seed (admin password)" -ForegroundColor Cyan
kubectl exec -n $Namespace $BackendPod -- sh -c "cd /app && ADMIN_PASSWORD='$($env:ADMIN_PASSWORD)' npx prisma db seed"

Write-Host "`nBackend setup complete." -ForegroundColor Green
Write-Host "Next: .\AmerCloud-Test.ps1"

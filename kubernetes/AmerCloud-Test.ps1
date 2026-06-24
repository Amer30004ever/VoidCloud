# AmerCloud health check - pods, API, DB, Proxmox connectivity.
param(
    [string]$Namespace = 'amer-portal'
)

$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir 'AmerCloud-Lib.ps1')
$env:NAMESPACE = $Namespace
Import-AmerCloudEnv | Out-Null

$BackendPod = Get-AmerCloudBackendPod -Namespace $Namespace
$PostgresPod = Get-AmerCloudPostgresPod -Namespace $Namespace

Write-Host "AmerCloud test - namespace: $Namespace"
Write-Host "Backend pod:  $BackendPod"
Write-Host "Postgres pod: $PostgresPod"

Write-AmerCloudSection '1. Pod status'
kubectl get pods -n $Namespace -o wide

if (-not $BackendPod) {
    Write-Host 'ERROR: No running backend pod. Run .\AmerCloud.ps1 -Action Setup' -ForegroundColor Red
    exit 1
}

Write-AmerCloudSection '2. PROXMOX environment'
kubectl exec -n $Namespace $BackendPod -- sh -c 'env | grep PROXMOX | sed "s/PROXMOX_TOKEN_SECRET=.*/PROXMOX_TOKEN_SECRET=***redacted***/"'

Write-AmerCloudSection '3. Recent backend logs'
kubectl logs -n $Namespace $BackendPod --tail=25

Write-AmerCloudSection '4. Public API'
foreach ($path in @('/api/v1/cloud/plans', '/api/v1/status', '/api/v1/health/live')) {
    Write-Host ('GET ' + $path)
    $wgetCmd = 'wget -q -O- http://localhost:3001' + $path + ' 2>/dev/null | head -c 400'
    kubectl exec -n $Namespace $BackendPod -- sh -c $wgetCmd
    Write-Host ''
}

Write-AmerCloudSection '5. CloudPlan count'
Invoke-AmerCloudPostgresQueryFile -RelativeSqlPath 'scripts\query-cloud-plans.sql' -Namespace $Namespace

Write-AmerCloudSection '6. CloudDeployment status'
Invoke-AmerCloudPostgresQueryFile -RelativeSqlPath 'scripts\query-cloud-deployments.sql' -Namespace $Namespace

Write-AmerCloudSection '7. Proxmox API from backend pod'
Get-Content (Join-Path $ScriptDir 'scripts\proxmox-ping.js') -Raw |
    kubectl exec -i -n $Namespace $BackendPod -- sh -c 'cat > /tmp/proxmox-ping.js'
kubectl exec -n $Namespace $BackendPod -- node /tmp/proxmox-ping.js

Write-AmerCloudSection '8. Frontend + postgres readiness'
kubectl get deploy -n $Namespace frontend,postgres,backend 2>$null

Write-AmerCloudSection 'Summary'
Write-Host 'Use .\AmerCloud.ps1 -Action CreateVps to provision without the UI'

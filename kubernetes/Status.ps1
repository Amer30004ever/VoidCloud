# status.ps1 - Amer Devops Portal
# Portable version

param(
    [string]$Namespace = "voidcloud",
    [switch]$Watch,
    [switch]$Logs,
    [string]$Pod = "backend"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Amer Devops Portal - Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if namespace exists
$nsExists = kubectl get namespace $Namespace --ignore-not-found 2>$null

if (-not $nsExists) {
    Write-Host "WARNING: Namespace '$Namespace' does not exist!" -ForegroundColor Red
    Write-Host "Portal may not be deployed or has been cleaned up." -ForegroundColor Yellow
    exit 1
}

Write-Host "Namespace: $Namespace ✓" -ForegroundColor Green
Write-Host ""

if ($Watch) {
    Write-Host "Watching pods (Ctrl+C to exit)..." -ForegroundColor Yellow
    kubectl get pods -n $Namespace --watch
    exit 0
}

if ($Logs) {
    $podName = kubectl get pods -n $Namespace -l app=$Pod -o name 2>$null | Select-Object -First 1
    if (-not $podName) {
        $podName = kubectl get pods -n $Namespace --no-headers 2>$null | Select-Object -First 1 | ForEach-Object { ($_ -split "\s+")[0] }
    }
    if ($podName) {
        Write-Host "Showing logs for $podName (Ctrl+C to exit)..." -ForegroundColor Yellow
        kubectl logs -n $Namespace $podName --follow
    } else {
        Write-Host "No pods found in namespace $Namespace" -ForegroundColor Red
    }
    exit 0
}

# Pods
Write-Host "=== Pods ===" -ForegroundColor Cyan
$pods = kubectl get pods -n $Namespace 2>$null
if ($pods) {
    $pods
} else {
    Write-Host "  No pods found" -ForegroundColor Yellow
}
Write-Host ""

# Deployments
Write-Host "=== Deployments ===" -ForegroundColor Cyan
$deployments = kubectl get deployments -n $Namespace 2>$null
if ($deployments) {
    $deployments
} else {
    Write-Host "  No deployments found" -ForegroundColor Yellow
}
Write-Host ""

# Services
Write-Host "=== Services ===" -ForegroundColor Cyan
$services = kubectl get services -n $Namespace 2>$null
if ($services) {
    $services
} else {
    Write-Host "  No services found" -ForegroundColor Yellow
}
Write-Host ""

# Ingress
Write-Host "=== Ingress ===" -ForegroundColor Cyan
$ingresses = kubectl get ingress -n $Namespace 2>$null
if ($ingresses) {
    $ingresses
} else {
    Write-Host "  No ingress found" -ForegroundColor Yellow
}
Write-Host ""

# PVCs
Write-Host "=== Persistent Volume Claims ===" -ForegroundColor Cyan
$pvcs = kubectl get pvc -n $Namespace 2>$null
if ($pvcs) {
    $pvcs
} else {
    Write-Host "  No PVCs found" -ForegroundColor Yellow
}
Write-Host ""

# Health Summary
Write-Host "=== Health Summary ===" -ForegroundColor Cyan
$podList = kubectl get pods -n $Namespace --no-headers 2>$null
if ($podList) {
    $running = ($podList | Select-String "Running" | Measure-Object).Count
    $pending = ($podList | Select-String "Pending" | Measure-Object).Count
    $failed = ($podList | Select-String "Error|CrashLoopBackOff|ImagePullBackOff|ErrImagePull" | Measure-Object).Count
    $total = ($podList | Measure-Object).Count

    Write-Host "  Total Pods: $total" -ForegroundColor White
    Write-Host "  Running: $running" -ForegroundColor Green
    if ($pending -gt 0) { Write-Host "  Pending: $pending" -ForegroundColor Yellow }
    if ($failed -gt 0) { Write-Host "  Failed: $failed" -ForegroundColor Red }

    if ($failed -eq 0 -and $pending -eq 0 -and $total -gt 0) {
        Write-Host ""
        Write-Host "ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    } elseif ($total -eq 0) {
        Write-Host ""
        Write-Host "No pods found - deployment may be in progress" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Some pods are not ready - check logs for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "  No pods found in namespace" -ForegroundColor Yellow
}

# Portal specific info
Write-Host ""
Write-Host "=== Portal Access Information ===" -ForegroundColor Cyan

# Get domain from ingress
$ingress = kubectl get ingress -n $Namespace --no-headers 2>$null
if ($ingress) {
    $hostname = ($ingress -split "\s+")[2]
    Write-Host "  Portal URL: http://$hostname" -ForegroundColor Green
    Write-Host "  API URL: http://api.$hostname" -ForegroundColor Green
}

# Useful commands
Write-Host ""
Write-Host "=== Useful Commands ===" -ForegroundColor Cyan
Write-Host "  Watch pods:     .\Status.ps1 -Watch" -ForegroundColor Gray
Write-Host "  View logs:      .\Status.ps1 -Logs" -ForegroundColor Gray
Write-Host "  View backend logs: .\Status.ps1 -Logs -Pod backend" -ForegroundColor Gray
Write-Host "  Port forward:   kubectl port-forward -n $Namespace svc/backend 8080:80" -ForegroundColor Gray
Write-Host "  Get all resources: kubectl get all -n $Namespace" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
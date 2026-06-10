#!/usr/bin/env pwsh
# Status.ps1 - Check deployment status

if (-not $env:NAMESPACE) { $env:NAMESPACE = "amer-portal" }

Write-Host "========================================" -ForegroundColor Blue
Write-Host "📊 Amer Portal - Status Dashboard" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Pods
Write-Host "🔵 Pods:" -ForegroundColor Yellow
kubectl get pods -n $env:NAMESPACE 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "No pods found or namespace doesn't exist" -ForegroundColor Red }
Write-Host ""

# Services
Write-Host "🔵 Services:" -ForegroundColor Yellow
kubectl get svc -n $env:NAMESPACE 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "No services found" -ForegroundColor Red }
Write-Host ""

# Ingress
Write-Host "🔵 Ingress:" -ForegroundColor Yellow
kubectl get ingress -n $env:NAMESPACE 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "No ingress found" -ForegroundColor Red }
Write-Host ""

# Persistent Volumes
Write-Host "🔵 Persistent Volumes:" -ForegroundColor Yellow
kubectl get pv | Select-String -Pattern "(amer|postgres)"
Write-Host ""

# Recent Events
Write-Host "📝 Recent Events:" -ForegroundColor Yellow
kubectl get events -n $env:NAMESPACE --sort-by='.lastTimestamp' | Select-Object -Last 10
Write-Host ""

# Health Check
Write-Host "🏥 Health Check:" -ForegroundColor Yellow
$backendPod = kubectl get pods -n $env:NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>$null
if ($backendPod) {
    $health = kubectl exec -n $env:NAMESPACE $backendPod -- curl -s http://localhost:3001/api/v1/health 2>$null
    if ($health -match "ok") {
        Write-Host "   Backend: Healthy ✓" -ForegroundColor Green
    } else {
        Write-Host "   Backend: Unhealthy ✗" -ForegroundColor Red
    }
} else {
    Write-Host "   Backend: Not running" -ForegroundColor Red
}

$frontendPod = kubectl get pods -n $env:NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>$null
if ($frontendPod) {
    Write-Host "   Frontend: Running ✓" -ForegroundColor Green
} else {
    Write-Host "   Frontend: Not running" -ForegroundColor Red
}
Write-Host ""

Write-Host "💡 Quick Commands:" -ForegroundColor Blue
Write-Host "   View logs:     kubectl logs -n $($env:NAMESPACE) -l app=backend -f" -ForegroundColor White
Write-Host "   Port forward:  kubectl port-forward -n $($env:NAMESPACE) svc/frontend 3000:3000" -ForegroundColor White
Write-Host "   Restart all:   kubectl rollout restart -n $($env:NAMESPACE) deployment" -ForegroundColor White
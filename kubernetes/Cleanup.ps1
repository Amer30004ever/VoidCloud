#!/usr/bin/env pwsh
# Cleanup.ps1 - Remove everything

$env:NAMESPACE = "amer-portal"

Write-Host "🧹 Cleaning up Amer Portal..." -ForegroundColor Yellow

# Delete namespace (will delete all resources in it)
kubectl delete namespace $env:NAMESPACE

# Delete PVs (they persist after namespace deletion)
kubectl delete pv postgres-pv

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
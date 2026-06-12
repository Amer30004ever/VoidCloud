#!/usr/bin/env pwsh
# Reset-Postgres.ps1
# Wipes the postgres PVC + on-disk data so the next deploy initialises
# the DB with the CURRENT secret's POSTGRES_PASSWORD.
#
# Use this when backend pods log:
#   FATAL: password authentication failed for user "postgres"
# That means secrets.yaml was regenerated with a new random password, but
# the existing PVC still holds the database initialised with the OLD password.

$ErrorActionPreference = "Stop"
$ns = $env:NAMESPACE; if (-not $ns) { $ns = "amer-portal" }

Write-Host "Scaling postgres + backend to 0..." -ForegroundColor Yellow
kubectl -n $ns scale deploy/postgres --replicas=0 2>$null
kubectl -n $ns scale deploy/backend  --replicas=0 2>$null
Start-Sleep -Seconds 5

Write-Host "Deleting PVC + PV..." -ForegroundColor Yellow
kubectl -n $ns delete pvc postgres-pvc --ignore-not-found
kubectl delete pv  postgres-pv  --ignore-not-found

Write-Host "Wiping host data dir on each node (requires SSH)..." -ForegroundColor Yellow
Write-Host "  Run on the node hosting postgres:" -ForegroundColor Cyan
Write-Host "    sudo rm -rf /mnt/homelab/volumes/amer-portal/postgres/*" -ForegroundColor Cyan
Read-Host "Press Enter once the data directory has been cleared"

Write-Host "Recreating PV + PVC + postgres..." -ForegroundColor Yellow
kubectl apply -f postgres/pv.yaml
kubectl apply -f postgres/pvc.yaml
kubectl -n $ns scale deploy/postgres --replicas=1
kubectl -n $ns rollout status deploy/postgres --timeout=120s

Write-Host "Restarting backend..." -ForegroundColor Yellow
kubectl -n $ns scale deploy/backend --replicas=1
kubectl -n $ns rollout status deploy/backend --timeout=180s

Write-Host "Done." -ForegroundColor Green

#!/usr/bin/env pwsh
# 02-Verify-SMTP.ps1
# Runs scripts/verify-smtp.ts inside the backend pod. It uses the SMTP_*
# env vars already injected from the smtp-secret, so this also confirms the
# secret is mounted correctly and the pod can reach smtp.office365.com.
#
# Usage:
#   ./02-Verify-SMTP.ps1                       # auth check only, sends to SMTP_USER
#   ./02-Verify-SMTP.ps1 -To you@example.com   # also send a test email

[CmdletBinding()]
param(
    [string]$Namespace  = "voidcloud",
    [string]$Deployment = "backend",
    [string]$To         = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " AmerCloud — SMTP verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Namespace  : $Namespace"
Write-Host "Deployment : $Deployment"
if ($To) { Write-Host "Recipient  : $To" } else { Write-Host "Recipient  : (defaults to SMTP_USER inside the pod)" }
Write-Host ""

$pod = kubectl get pod -n $Namespace -l app=$Deployment -o jsonpath='{.items[0].metadata.name}'
if (-not $pod) {
    Write-Host "Could not find a running pod for app=$Deployment in $Namespace." -ForegroundColor Red
    exit 1
}
Write-Host "Using pod: $pod" -ForegroundColor DarkGray

$cmd = "npx --yes ts-node --transpile-only scripts/verify-smtp.ts $To"
kubectl exec -it $pod -n $Namespace -- sh -c $cmd
exit $LASTEXITCODE

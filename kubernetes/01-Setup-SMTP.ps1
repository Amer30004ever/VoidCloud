#!/usr/bin/env pwsh
# 01-Setup-SMTP.ps1
# Creates the smtp-secret in the amer-portal namespace, applies pending Prisma
# migrations, and restarts the backend so it picks up the new SMTP credentials.
#
# Prompts for the Microsoft App Password (NOT your account password). Generate
# one at: https://account.microsoft.com/security -> "App passwords".

[CmdletBinding()]
param(
    [string]$Namespace   = "amer-portal",
    [string]$SmtpHost    = "smtp.office365.com",
    [int]   $SmtpPort    = 587,
    [string]$SmtpUser    = "nova-cloud-2026@outlook.com",
    [string]$EmailFrom   = "nova-cloud-2026@outlook.com",
    [string]$FrontendUrl = "https://amer-portal.cc.cd",
    [string]$Deployment  = "backend"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " AmerCloud — Outlook SMTP secret setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Namespace : $Namespace"
Write-Host "SMTP host : $SmtpHost`:$SmtpPort"
Write-Host "SMTP user : $SmtpUser"
Write-Host "From addr : $EmailFrom"
Write-Host "Frontend  : $FrontendUrl"
Write-Host ""
Write-Host "Enter the Microsoft App Password for $SmtpUser." -ForegroundColor Yellow
Write-Host "  (Create one at https://account.microsoft.com/security -> App passwords)" -ForegroundColor DarkGray

$secure = Read-Host -AsSecureString "App Password"
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$smtpPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null

if ([string]::IsNullOrWhiteSpace($smtpPass)) {
    Write-Host "App Password cannot be empty. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[1/3] Creating/replacing smtp-secret in $Namespace ..." -ForegroundColor Blue
kubectl create secret generic smtp-secret -n $Namespace `
    --from-literal=SMTP_HOST=$SmtpHost `
    --from-literal=SMTP_PORT=$SmtpPort `
    --from-literal=SMTP_USER=$SmtpUser `
    --from-literal=SMTP_PASS=$smtpPass `
    --from-literal=EMAIL_FROM=$EmailFrom `
    --from-literal=FRONTEND_URL=$FrontendUrl `
    --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "[2/3] Applying Prisma migrations inside $Deployment pod ..." -ForegroundColor Blue
kubectl exec -it "deployment/$Deployment" -n $Namespace -- npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma migrate failed — check the backend pod logs." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/3] Restarting $Deployment to pick up smtp-secret ..." -ForegroundColor Blue
kubectl rollout restart "deployment/$Deployment" -n $Namespace
kubectl rollout status  "deployment/$Deployment" -n $Namespace --timeout=120s

Write-Host ""
Write-Host "Done. SMTP is wired up. Verify with:" -ForegroundColor Green
Write-Host "  kubectl logs -n $Namespace deployment/$Deployment | Select-String -Pattern 'SMTP'"

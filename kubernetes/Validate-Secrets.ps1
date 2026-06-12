#!/usr/bin/env pwsh
# Validate-Secrets.ps1
# Verifies postgres-secret and amer-portal-secrets agree, and can optionally
# patch deployment pod-template annotations so secret changes trigger restarts.

[CmdletBinding()]
param(
  [string]$Namespace = "amer-portal",
  [string]$AppSecret = "amer-portal-secrets",
  [string]$PostgresSecret = "postgres-secret",
  [switch]$Annotate
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red; exit 1 }
function Warn($msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }

function Get-SecretValue([string]$name, [string]$key, [switch]$Required) {
  $encoded = kubectl -n $Namespace get secret $name -o jsonpath="{.data.$key}" 2>$null
  if (-not $encoded) {
    if ($Required) { Fail "$name.$key is missing" }
    return $null
  }
  return [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))
}

function Get-DatabaseUrlParts([string]$databaseUrl) {
  try {
    $uri = [System.Uri]$databaseUrl
    $userInfo = $uri.UserInfo.Split(':', 2)
    return @{
      User = [System.Uri]::UnescapeDataString($userInfo[0])
      Password = [System.Uri]::UnescapeDataString($userInfo[1])
      Database = $uri.AbsolutePath.TrimStart('/')
    }
  } catch {
    Fail "DATABASE_URL is not a valid PostgreSQL URL"
  }
}

Step "Validating $AppSecret..."
$appUser = Get-SecretValue $AppSecret "POSTGRES_USER" -Required
$appPassword = Get-SecretValue $AppSecret "POSTGRES_PASSWORD" -Required
$appDb = Get-SecretValue $AppSecret "POSTGRES_DB" -Required
$databaseUrl = Get-SecretValue $AppSecret "DATABASE_URL" -Required
$urlParts = Get-DatabaseUrlParts $databaseUrl

if ($urlParts.User -ne $appUser) { Fail "DATABASE_URL user does not match POSTGRES_USER" }
if ($urlParts.Password -ne $appPassword) { Fail "DATABASE_URL password does not match POSTGRES_PASSWORD" }
if ($urlParts.Database -ne $appDb) { Fail "DATABASE_URL database does not match POSTGRES_DB" }
Ok "$AppSecret is internally consistent."

Step "Validating $PostgresSecret..."
$pgExists = kubectl -n $Namespace get secret $PostgresSecret --ignore-not-found 2>$null
if ($pgExists) {
  $pgUser = Get-SecretValue $PostgresSecret "POSTGRES_USER" -Required
  $pgPassword = Get-SecretValue $PostgresSecret "POSTGRES_PASSWORD" -Required
  $pgDb = Get-SecretValue $PostgresSecret "POSTGRES_DB" -Required
  if ($pgUser -ne $appUser) { Fail "$PostgresSecret.POSTGRES_USER does not match $AppSecret" }
  if ($pgPassword -ne $appPassword) { Fail "$PostgresSecret.POSTGRES_PASSWORD does not match $AppSecret" }
  if ($pgDb -ne $appDb) { Fail "$PostgresSecret.POSTGRES_DB does not match $AppSecret" }
  Ok "$PostgresSecret matches $AppSecret."
} else {
  Warn "$PostgresSecret not found; postgres currently reads credentials from $AppSecret."
}

$hashInput = "$appUser`n$appPassword`n$appDb`n$databaseUrl"
$sha = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($hashInput))
$hash = -join ($hashBytes | ForEach-Object { $_.ToString('x2') })
Ok "Secret checksum: $($hash.Substring(0, 12))"

if ($Annotate) {
  Step "Patching deployment annotations with secret checksum..."
  $patch = @{ spec = @{ template = @{ metadata = @{ annotations = @{ "secret-checksum" = $hash } } } } } | ConvertTo-Json -Depth 10 -Compress
  foreach ($deployment in @("postgres", "backend")) {
    $exists = kubectl -n $Namespace get deployment $deployment --ignore-not-found 2>$null
    if ($exists) {
      kubectl -n $Namespace patch deployment $deployment --type merge -p $patch | Out-Null
      Ok "Annotated deployment/$deployment"
    } else {
      Warn "deployment/$deployment does not exist yet; skipping annotation"
    }
  }
}

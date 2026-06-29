#!/usr/bin/env pwsh
param(
    [string]$Cmd = 'run-all'
)
$RootDir = Split-Path -Parent $PSScriptRoot
$OpsDir = Join-Path $RootDir 'scripts\ops'
switch ($Cmd) {
    'check-endpoints' { & "$OpsDir\check-endpoints.ps1"; break }
    'kubectl-troubleshoot' { & "$OpsDir\kubectl-troubleshoot.ps1"; break }
    'reset-admin' { & "$OpsDir\reset-admin-password.ps1"; break }
    'run-all' { & "$OpsDir\run-all-checks.ps1"; break }
    default { Write-Host "Usage: launch-ops.ps1 {check-endpoints|kubectl-troubleshoot|reset-admin|run-all}"; exit 2 }
}

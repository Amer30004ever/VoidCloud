#!/usr/bin/env pwsh
# AmerCloud homelab operations — run VPS and platform actions from PowerShell (no UI required).
#
# Usage:
#   cd kubernetes
#   Copy-Item proxmox.env.example proxmox.env   # first time only
#   .\AmerCloud.ps1 -Action Setup
#   .\AmerCloud.ps1 -Action Test
#   .\AmerCloud.ps1 -Action CreateVps
#   .\AmerCloud.ps1 -Action ListVps
#   .\AmerCloud.ps1 -Action DeleteVps -Id <deployment-id>
#   .\AmerCloud.ps1 -Action CleanStuck
#   .\AmerCloud.ps1 -Action ProxmoxPctList
#   .\AmerCloud.ps1 -Action FixProxmoxToken
#   .\AmerCloud.ps1 -Action All    # setup + test + create VPS + pct list

[CmdletBinding()]
param(
    [ValidateSet('Setup', 'Test', 'CreateVps', 'ListVps', 'DeleteVps', 'CleanStuck', 'ProxmoxPctList', 'FixProxmoxToken', 'All')]
    [string]$Action = 'Test',
    [string]$Namespace = 'amer-portal',
    [string]$Id,
    [string]$VpsName,
    [int]$VpsStorage = 1024,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir 'AmerCloud-Lib.ps1')
$env:NAMESPACE = $Namespace
Import-AmerCloudEnv | Out-Null
Test-AmerCloudPrerequisites

function Invoke-Setup {
    Write-AmerCloudSection 'Setup backend + secrets + seed'
    & (Join-Path $ScriptDir 'AmerCloud-Setup-Backend.ps1') -Namespace $Namespace
}

function Invoke-Test {
    Write-AmerCloudSection 'Platform health check'
    & (Join-Path $ScriptDir 'AmerCloud-Test.ps1') -Namespace $Namespace
}

function Invoke-CreateVps {
    Write-AmerCloudSection 'Create VPS via API'
    if ($DryRun) {
        Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('login') -Namespace $Namespace
        return
    }
    if ($VpsName) { $env:VPS_NAME = $VpsName }
    $env:VPS_STORAGE = "$VpsStorage"
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-create-test.js' -Namespace $Namespace
    Write-Host ''
    Write-AmerCloudSection 'Proxmox pct list'
    Invoke-AmerCloudProxmoxSsh 'pct list'
}

function Invoke-ListVps {
    Write-AmerCloudSection 'Cloud deployments (API)'
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('list') -Namespace $Namespace
}

function Invoke-DeleteVps {
    if (-not $Id) { throw 'DeleteVps requires -Id <deployment-id>' }
    Write-AmerCloudSection "Delete VPS $Id"
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('delete', $Id) -Namespace $Namespace
}

function Invoke-CleanStuck {
    Write-AmerCloudSection 'Mark stuck PROVISIONING/FAILED as DELETED'
    $pod = Get-AmerCloudBackendPod -Namespace $Namespace
    Get-Content (Join-Path $ScriptDir 'scripts\vps-api.js') -Raw |
        kubectl exec -i -n $Namespace $pod -- sh -c 'cat > /tmp/vps-api.js' | Out-Null
    $listJson = kubectl exec -n $Namespace $pod -- node /tmp/vps-api.js list 2>$null
    $items = $listJson | ConvertFrom-Json
    $stuck = $items | Where-Object { $_.status -in @('PROVISIONING', 'FAILED', 'PENDING') }
    if (-not $stuck) {
        Write-Host 'No stuck deployments found.' -ForegroundColor Green
        return
    }
    foreach ($d in $stuck) {
        Write-Host "Deleting stuck: $($d.name) ($($d.id)) status=$($d.status)"
        kubectl exec -n $Namespace $pod -- node /tmp/vps-api.js delete $d.id | Out-Host
    }
}

function Invoke-ProxmoxPctList {
    Write-AmerCloudSection 'Proxmox containers'
    Invoke-AmerCloudProxmoxSsh 'pct list'
}

function Invoke-FixProxmoxToken {
    Write-AmerCloudSection 'Grant Proxmox API token Administrator ACL'
    Invoke-AmerCloudProxmoxSsh "pveum acl modify / --token 'root@pam!Amer-Cloud' --roles Administrator"
    Invoke-AmerCloudProxmoxSsh 'pveum user token permissions root@pam Amer-Cloud'
}

switch ($Action) {
    'Setup'           { Invoke-Setup }
    'Test'            { Invoke-Test }
    'CreateVps'       { Invoke-CreateVps }
    'ListVps'         { Invoke-ListVps }
    'DeleteVps'       { Invoke-DeleteVps }
    'CleanStuck'      { Invoke-CleanStuck }
    'ProxmoxPctList'  { Invoke-ProxmoxPctList }
    'FixProxmoxToken' { Invoke-FixProxmoxToken }
    'All' {
        Invoke-Setup
        Invoke-Test
        Invoke-CleanStuck
        Invoke-CreateVps
    }
}

Write-Host ''
Write-Host "AmerCloud action '$Action' finished." -ForegroundColor Green

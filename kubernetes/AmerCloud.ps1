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
#   .\AmerCloud.ps1 -Action VpsAction -VpsAction start|stop|restart|reset-password|clone -Id <id>
#   .\AmerCloud.ps1 -Action VerifyAll -Id <id>   # create test + lifecycle + images + admin stats
#   .\AmerCloud.ps1 -Action ImagesTest
#   .\AmerCloud.ps1 -Action AdminStats
#   .\AmerCloud.ps1 -Action DeployCrm
#   .\AmerCloud.ps1 -Action CleanStuck
#   .\AmerCloud.ps1 -Action ProxmoxPctList
#   .\AmerCloud.ps1 -Action FixProxmoxToken
#   .\AmerCloud.ps1 -Action All    # setup + test + create VPS + pct list

[CmdletBinding()]
param(
    [ValidateSet('Setup', 'Test', 'CreateVps', 'ListVps', 'DeleteVps', 'CleanStuck', 'ProxmoxPctList', 'FixProxmoxToken', 'VpsAction', 'VerifyAll', 'ImagesTest', 'AdminStats', 'DeployCrm', 'All')]
    [string]$Action = 'Test',
    [string]$Namespace = 'amer-portal',
    [string]$Id,
    [ValidateSet('start', 'stop', 'restart', 'reset-password', 'clone', 'delete')]
    [string]$VpsAction = 'start',
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

function Invoke-VpsLifecycle {
    if (-not $Id) { throw 'VpsAction requires -Id <deployment-id>' }
    Write-AmerCloudSection "VPS $VpsAction $Id"
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @($VpsAction, $Id) -Namespace $Namespace
    if ($VpsAction -eq 'delete') {
        Write-AmerCloudSection 'Proxmox pct list (after delete)'
        Invoke-AmerCloudProxmoxSsh 'pct list'
    }
}

function Invoke-ImagesTest {
    Write-AmerCloudSection 'Images API'
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('images') -Namespace $Namespace
}

function Invoke-AdminStats {
    Write-AmerCloudSection 'Admin stats API'
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('admin-stats') -Namespace $Namespace
}

function Invoke-VerifyAll {
    Write-AmerCloudSection 'Full VPS verify (create + lifecycle + images + stats)'
    Invoke-CreateVps
    $pod = Get-AmerCloudBackendPod -Namespace $Namespace
    Get-Content (Join-Path $ScriptDir 'scripts\vps-api.js') -Raw |
        kubectl exec -i -n $Namespace $pod -- sh -c 'cat > /tmp/vps-api.js' | Out-Null
    $listJson = kubectl exec -n $Namespace $pod -- node /tmp/vps-api.js list 2>$null
    $items = $listJson | ConvertFrom-Json
    $vps = $items | Where-Object { $_.status -eq 'RUNNING' } | Select-Object -First 1
    if (-not $vps) { $vps = $items | Select-Object -First 1 }
    if (-not $vps) { throw 'No VPS returned from list' }
    $vid = $vps.id
    Write-Host "Using VPS id=$vid name=$($vps.name) status=$($vps.status)"
    foreach ($act in @('stop', 'start', 'restart', 'reset-password')) {
        $script:VpsAction = $act
        Invoke-VpsLifecycle -Id $vid
        Start-Sleep -Seconds 2
    }
    Invoke-ImagesTest
    Invoke-AdminStats
    Write-AmerCloudSection 'Optional: clone then delete clone'
    $script:VpsAction = 'clone'
    Invoke-VpsLifecycle -Id $vid
}

function Invoke-DeployCrm {
    Write-AmerCloudSection 'Deploy MIP-WA-CRM to cluster'
    & (Join-Path $ScriptDir 'AmerCloud-Deploy-Crm.ps1') -Namespace $Namespace
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
    'VpsAction'       { Invoke-VpsLifecycle }
    'VerifyAll'       { Invoke-VerifyAll }
    'ImagesTest'      { Invoke-ImagesTest }
    'AdminStats'      { Invoke-AdminStats }
    'DeployCrm'       { Invoke-DeployCrm }
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

# Wrapper for VPS API test — use .\AmerCloud.ps1 -Action CreateVps instead.
param(
    [string]$Namespace = 'voidcloud',
    [switch]$DryRun
)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($DryRun) {
    & (Join-Path $ScriptDir 'AmerCloud.ps1') -Action Test -Namespace $Namespace
    . (Join-Path $ScriptDir 'AmerCloud-Lib.ps1')
    Invoke-AmerCloudBackendScript -ScriptFileName 'vps-api.js' -NodeArgs @('login') -Namespace $Namespace
} else {
    & (Join-Path $ScriptDir 'AmerCloud.ps1') -Action CreateVps -Namespace $Namespace
}

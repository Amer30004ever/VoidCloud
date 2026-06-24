# Shared helpers for AmerCloud Kubernetes ops scripts.
param()

$Script:AmerCloudScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:AmerCloudNamespace = if ($env:NAMESPACE) { $env:NAMESPACE } else { 'amer-portal' }

function Import-AmerCloudEnv {
    param([string]$EnvFile = (Join-Path $Script:AmerCloudScriptDir 'proxmox.env'))
    if (-not (Test-Path $EnvFile)) { return $false }
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            Set-Item -Path "env:$($parts[0].Trim())" -Value $parts[1].Trim()
        }
    }
    return $true
}

function Get-AmerCloudBackendPod {
    param([string]$Namespace = $Script:AmerCloudNamespace)
    $json = kubectl get pods -n $Namespace -l app=backend -o json 2>$null
    if (-not $json) { return $null }
    $pods = ($json | ConvertFrom-Json).items
    $ready = $pods | Where-Object {
        $_.status.phase -eq 'Running' -and
        ($_.status.containerStatuses | Where-Object { $_.name -eq 'backend' -and $_.ready }).Count -gt 0
    } | Sort-Object { $_.metadata.creationTimestamp } -Descending
    if ($ready) { return $ready[0].metadata.name }
    if ($pods) { return $pods[0].metadata.name }
    return $null
}

function Get-AmerCloudPostgresPod {
    param([string]$Namespace = $Script:AmerCloudNamespace)
    kubectl get pods -n $Namespace -l app=postgres -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' 2>$null
}

function Invoke-AmerCloudBackendScript {
    param(
        [Parameter(Mandatory)][string]$ScriptFileName,
        [string[]]$NodeArgs = @(),
        [string]$Namespace = $Script:AmerCloudNamespace
    )
    $pod = Get-AmerCloudBackendPod -Namespace $Namespace
    if (-not $pod) { throw "No running backend pod in namespace $Namespace" }
    $localPath = Join-Path $Script:AmerCloudScriptDir "scripts\$ScriptFileName"
    if (-not (Test-Path $localPath)) { throw "Missing script: $localPath" }
    Get-Content $localPath -Raw | kubectl exec -i -n $Namespace $pod -- sh -c "cat > /tmp/$ScriptFileName" | Out-Null
    if ($NodeArgs.Count -gt 0) {
        kubectl exec -n $Namespace $pod -- node "/tmp/$ScriptFileName" @NodeArgs
    } else {
        kubectl exec -n $Namespace $pod -- node "/tmp/$ScriptFileName"
    }
    return $pod
}

function Invoke-AmerCloudProxmoxSsh {
    param([Parameter(Mandatory)][string]$Command)
    $sshHost = if ($env:PROXMOX_SSH_HOST) { $env:PROXMOX_SSH_HOST } else { '10.51.100.10' }
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "root@$sshHost" $Command
}

function Write-AmerCloudSection {
    param([string]$Title)
    Write-Host ''
    Write-Host ('=' * 42) -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ('=' * 42) -ForegroundColor Cyan
}

function Invoke-AmerCloudPostgresQuery {
    param(
        [Parameter(Mandatory)][string]$Sql,
        [string]$Namespace = $Script:AmerCloudNamespace
    )
    $pod = Get-AmerCloudPostgresPod -Namespace $Namespace
    if (-not $pod) { Write-Host 'Postgres pod not found'; return }
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Sql))
    kubectl exec -n $Namespace $pod -- sh -c "echo $b64 | base64 -d | psql postgresql://postgres:postgres@localhost:5432/amer_portal"
}

function Invoke-AmerCloudPostgresQueryFile {
    param(
        [Parameter(Mandatory)][string]$RelativeSqlPath,
        [string]$Namespace = $Script:AmerCloudNamespace
    )
    $sql = Get-Content (Join-Path $Script:AmerCloudScriptDir $RelativeSqlPath) -Raw
    Invoke-AmerCloudPostgresQuery -Sql $sql -Namespace $Namespace
}

function Test-AmerCloudPrerequisites {
    foreach ($cmd in @('kubectl', 'ssh')) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            throw "Required command not found: $cmd"
        }
    }
}

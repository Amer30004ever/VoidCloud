<# Kubectl troubleshoot helpers (PowerShell)
Usage: .\kubectl-troubleshoot.ps1 [-Namespace voidcloud]
#>
<# Kubectl troubleshoot helpers for the AmerCloud namespace
Usage:
  .\kubectl-troubleshoot.ps1
  .\kubectl-troubleshoot.ps1 -Namespace voidcloud
  .\kubectl-troubleshoot.ps1 -Help
#>
[CmdletBinding()]
param(
    [string]$Namespace = 'voidcloud',
    [switch]$Help
)

function Show-Help {
    Write-Host "Usage: .\kubectl-troubleshoot.ps1 [-Namespace <namespace>] [-Help]"
    Write-Host "Collects pod, service, ingress, and event debug output for a Kubernetes namespace."
}
. "$PSScriptRoot\_ps_ops_helpers.ps1"
Parse-HelpSwitch -Usage "Usage: .\kubectl-troubleshoot.ps1 [-Namespace <namespace>] [-Help]"

if ($Help) { Show-Help; return }

Write-Host "Namespace: $Namespace"

Write-Host "`nPods (wide):"
& kubectl get pods -n $Namespace -o wide

Write-Host "`nDescribe and logs for non-running pods:"
$pods = & kubectl get pod -n $Namespace --no-headers 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } | ForEach-Object { ($_ -split '\s+')[0, 2] -join '|' } | Where-Object { $_ -match '\|(?!(Running))' }

if ($pods) {
    foreach ($p in $pods) {
        $name = ($p -split '\|')[0]
        Write-Host "--- Describe $name ---"
        try {
            & kubectl describe pod $name -n $Namespace
        }
        catch {
            Write-Host 'Describe failed' -ForegroundColor Red
        }
        Write-Host "--- Logs $name ---"
        try {
            & kubectl logs $name -n $Namespace --all-containers --tail=200
        }
        catch {
            Write-Host 'Logs failed' -ForegroundColor Red
        }
    }
}
else { Write-Host "No non-running pods found." }

Write-Host "`nService endpoints:"
& kubectl get svc -n $Namespace

Write-Host "`nIngress (if present):"
try {
    & kubectl get ingress -n $Namespace
}
catch {
    Write-Host 'No ingress'
}

Write-Host "`nRecent events:"
& kubectl get events -n $Namespace --sort-by='.metadata.creationTimestamp' | Select-Object -Last 50

<# Kubectl troubleshoot helpers (PowerShell)
Usage: .\kubectl-troubleshoot.ps1 [-Namespace voidcloud]
#>
[CmdletBinding()]
param(
    [string]$Namespace = 'voidcloud'
)

Write-Host "Namespace: $Namespace"

Write-Host "`nPods (wide):"
& kubectl get pods -n $Namespace -o wide

Write-Host "`nDescribe and logs for non-running pods:"
$pods = & kubectl get pod -n $Namespace --no-headers 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } | ForEach-Object { ($_ -split '\s+')[0,2] -join '|' } | Where-Object { $_ -match '\|(?!(Running))' }

if ($pods) {
    foreach ($p in $pods) {
        $name = ($p -split '\|')[0]
        Write-Host "--- Describe $name ---"
        & kubectl describe pod $name -n $Namespace || Write-Host 'Describe failed' -ForegroundColor Red
        Write-Host "--- Logs $name ---"
        & kubectl logs $name -n $Namespace --all-containers --tail=200 || Write-Host 'Logs failed' -ForegroundColor Red
    }
} else { Write-Host "No non-running pods found." }

Write-Host "`nService endpoints:"
& kubectl get svc -n $Namespace

Write-Host "`nIngress (if present):"
& kubectl get ingress -n $Namespace 2>$null || Write-Host 'No ingress'

Write-Host "`nRecent events:"
& kubectl get events -n $Namespace --sort-by='.metadata.creationTimestamp' | Select-Object -Last 50

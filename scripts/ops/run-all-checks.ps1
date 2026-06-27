<# Run all ops checks (PowerShell)
Usage: .\run-all-checks.ps1
#>
[CmdletBinding()]
param()

Write-Host "Running endpoint checks..."
& "$PSScriptRoot\check-endpoints.ps1"

Write-Host "`nRunning kubectl troubleshoot..."
& "$PSScriptRoot\kubectl-troubleshoot.ps1"

Write-Host "Ops checks complete"

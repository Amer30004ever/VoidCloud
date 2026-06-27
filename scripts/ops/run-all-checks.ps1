<# Run all ops checks (PowerShell)
Usage: .\run-all-checks.ps1
#>
<# Run all ops check scripts
Usage:
	.\run-all-checks.ps1
	.\run-all-checks.ps1 -Help
#>
[CmdletBinding()]
param(
		[switch]$Help
)

function Show-Help {
		Write-Host "Usage: .\run-all-checks.ps1 [-Help]"
		Write-Host "Runs a set of built-in operational checks for the repository."
}
. "$PSScriptRoot\_ps_ops_helpers.ps1"
Parse-HelpSwitch -Usage "Usage: .\run-all-checks.ps1 [-Help]"

if ($Help) { Show-Help; return }

Write-Host "Running endpoint checks..."
& "$PSScriptRoot\check-endpoints.ps1"

Write-Host "`nRunning kubectl troubleshoot..."
& "$PSScriptRoot\kubectl-troubleshoot.ps1"

Write-Host "Ops checks complete"

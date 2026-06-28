<#
Shared helpers for scripts/ops PowerShell scripts.
Provides lightweight option parsing helpers and a consistent help display.
#>

function Show-OpsHelp {
    param(
        [string]$Usage,
        [string]$Details = ''
    )
    Write-Host $Usage
    if ($Details -ne '') { Write-Host "`n$Details" }
}

function Parse-HelpSwitch {
    param(
        [string]$Usage
    )
    # Check positional $args for common help flags
    if ($args -contains '-h' -or $args -contains '--help') {
        Show-OpsHelp -Usage $Usage
        exit 0
    }

    # Also respect a bound Help variable (scripts that declare [switch]$Help)
    try {
        $helpVar = Get-Variable -Name 'Help' -Scope 0 -ErrorAction SilentlyContinue
        if ($helpVar -and $helpVar.Value) {
            Show-OpsHelp -Usage $Usage
            exit 0
        }
    } catch { }
}

function Get-ArgValue {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [string[]]$Aliases = @(),
        $Default = $null
    )
    # If a variable with this name is already bound in the script, prefer it
    try {
        $var = Get-Variable -Name $Name -Scope 0 -ErrorAction SilentlyContinue
        if ($var -and $null -ne $var.Value -and $var.Value -ne '') { return $var.Value }
    } catch { }

    # Scan $args for -Name or aliases and return the following token
    for ($i = 0; $i -lt $args.Count; $i++) {
        $token = $args[$i]
        $expected = ('-' + $Name)
        if ($token -eq $expected -or $Aliases -contains $token) {
            if ($i + 1 -lt $args.Count) { return $args[$i + 1] }
            return $Default
        }
    }

    return $Default
}

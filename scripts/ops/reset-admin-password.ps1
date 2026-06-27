<# Reset admin password helper (PowerShell)
Usage:
  # In-cluster: just run the script (requires kubectl and access)
  .\reset-admin-password.ps1 -AdminEmail 'newadmin@mavoid.com' -AdminPassword 'NewP@ss'

  # Locally: set env var DATABASE_URL before running
  $env:DATABASE_URL='postgresql://user:pass@host:5432/db'
  .\reset-admin-password.ps1 -AdminEmail 'newadmin@mavoid.com' -AdminPassword 'NewP@ss'
#>
[CmdletBinding()]
param(
    [string]$AdminEmail = 'newadmin@mavoid.com',
    [string]$AdminPassword = 'password123'
)

function Run-InCluster {
    Write-Host "Running reset inside cluster (voidcloud namespace)"
    $cmd = "ADMIN_EMAIL='$AdminEmail' ADMIN_PASSWORD='$AdminPassword' npx ts-node scripts/reset-admin-password.ts"
    & kubectl -n voidcloud exec deploy/backend -- /bin/sh -c $cmd
}

function Run-Local {
    if (-not $env:DATABASE_URL) { Write-Error 'DATABASE_URL is required to run locally.'; exit 1 }
    Write-Host "Running reset locally"
    $env:ADMIN_EMAIL = $AdminEmail
    $env:ADMIN_PASSWORD = $AdminPassword
    & npx ts-node scripts/reset-admin-password.ts
}

# Detect kubectl + backend deployment
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    try {
        $exists = & kubectl get deploy -n voidcloud backend -o name 2>$null
        if ($exists) { Run-InCluster; exit 0 }
    } catch { }
}

Run-Local

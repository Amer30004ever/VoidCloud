<# Reset admin password helper (PowerShell)
Usage:
  # Run interactively with defaults or prompt for values
  .\reset-admin-password.ps1

  # Provide explicit admin credentials
  .\reset-admin-password.ps1 -AdminEmail 'newadmin@mavoid.com' -AdminPassword 'NewP@ss'

  # Use env vars to avoid passing secrets on the command line
  $env:ADMIN_EMAIL='newadmin@mavoid.com'
  $env:ADMIN_PASSWORD='NewP@ss'
  .\reset-admin-password.ps1
#>
[CmdletBinding()]
param(
  [string]$AdminEmail,
  [string]$AdminPassword,
  [switch]$Help
)

. "$PSScriptRoot\_ps_ops_helpers.ps1"
Parse-HelpSwitch -Usage "Usage: .\reset-admin-password.ps1 [-AdminEmail <email>] [-AdminPassword <password>] [-Help]"

function Show-Help {
  Write-Host "Usage: .\reset-admin-password.ps1 [-AdminEmail <email>] [-AdminPassword <password>] [-Help]"
  Write-Host ""
  Write-Host "Options:"
  Write-Host "  -AdminEmail    Admin user email. Defaults to environment variable ADMIN_EMAIL or amer30004ever@hotmail.com."
  Write-Host "  -AdminPassword New admin password. Defaults to environment variable ADMIN_PASSWORD or prompts interactively."
  Write-Host "  -Help          Show this help message."
}

function Prompt-For-Credential {
  param(
    [string]$PromptText,
    [switch]$AsSecureString
  )
  if ($AsSecureString) {
    $secure = Read-Host $PromptText -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  }
  return Read-Host $PromptText
}

if ($Help) { Show-Help; return }

if (-not $AdminEmail) { $AdminEmail = $env:ADMIN_EMAIL }
if (-not $AdminPassword) { $AdminPassword = $env:ADMIN_PASSWORD }

if (-not $AdminEmail) {
  $AdminEmail = Prompt-For-Credential -PromptText 'Admin email [amer30004ever@hotmail.com]'
  if (-not $AdminEmail) { $AdminEmail = 'amer30004ever@hotmail.com' }
}

if (-not $AdminPassword) {
  $AdminPassword = Prompt-For-Credential -PromptText 'Admin password' -AsSecureString
  if (-not $AdminPassword) {
    Write-Error 'Admin password is required.'
    exit 1
  }
}

function Run-InCluster {
  Write-Host "Running reset inside cluster (voidcloud namespace)"

  $scriptBody = @'
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });

(async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'amer30004ever@hotmail.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'AmerAdmin2026!';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      'UPDATE "User" SET password = $1, "mustChangePassword" = false WHERE email = $2 RETURNING email',
      [passwordHash, email],
    );

    if (result.rowCount === 0) {
      throw new Error(`User with email ${email} was not found`);
    }

    console.log(`✅ Admin password reset for ${email}`);
    console.log(`📝 New password: ${newPassword}`);
  } catch (e) {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
'@

  $scriptBody | & kubectl -n voidcloud exec -i deploy/backend -- /bin/sh -c "cd /app && export NODE_OPTIONS=''; ADMIN_EMAIL='$AdminEmail' ADMIN_PASSWORD='$AdminPassword' node -"
}

function Run-Local {
  if (-not $env:DATABASE_URL) { Write-Error 'DATABASE_URL is required to run locally.'; exit 1 }
  Write-Host "Running reset locally"
  $env:ADMIN_EMAIL = $AdminEmail
  $env:ADMIN_PASSWORD = $AdminPassword
  $ResetScript = Join-Path $RootDir '..\..\backend\scripts\reset-admin-password.ts'
  & npx ts-node --transpile-only $ResetScript
}

# Detect kubectl + backend deployment
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
  try {
    $exists = & kubectl get deploy -n voidcloud backend -o name 2>$null
    if ($exists) { Run-InCluster; exit 0 }
  }
  catch { }
}

Run-Local

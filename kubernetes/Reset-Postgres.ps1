#!/usr/bin/env pwsh
# Reset-Postgres.ps1
# FULL reset: wipes PVC, PV, on-disk data, and re-applies secrets so
# postgres re-initialises with the password currently in amer-portal-secrets.
#
# Symptom this fixes:
#   FATAL: password authentication failed for user "postgres"
#   DETAIL: Connection matched pg_hba.conf line ... "host all all all scram-sha-256"
#
# Root cause: when PGDATA already contains a cluster, the postgres image
# IGNORES POSTGRES_PASSWORD on startup and keeps the password baked in on
# first init. So changing the secret never takes effect until the data
# directory is truly empty.

[CmdletBinding()]
param(
  [string]$Namespace  = "amer-portal",
  [string]$DataNode   = "workernode01",
  [string]$DataPath   = "/mnt/homelab/volumes/amer-portal/postgres",
  [switch]$SkipNodeWipe   # set if you've already cleared the host dir
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }

# Apply the checked-in hardened postgres manifest first. If the cluster is still
# running the old manifest, pg_hba.conf will keep using scram-sha-256 and this
# reset can look successful while backend auth still fails.
Step "Applying hardened postgres manifest..."
$postgresDeployment = Join-Path $scriptPath "postgres/deployment.yaml"
$manifest = Get-Content $postgresDeployment -Raw
foreach ($required in @("PGDATA", "init-pgdata", "secret-revision", "POSTGRES_INITDB_ARGS")) {
  if ($manifest -notmatch [Regex]::Escape($required)) {
    Warn "postgres/deployment.yaml is stale; missing '$required'. Pull the latest repo changes before resetting."
    exit 1
  }
}
kubectl apply -f $postgresDeployment -n $Namespace | Out-Null
Ok "Postgres deployment manifest applied."

# --- 0. sanity: secret must exist and have a password -----------------------
Step "Validating amer-portal-secrets..."
$pwB64 = kubectl -n $Namespace get secret amer-portal-secrets -o jsonpath='{.data.POSTGRES_PASSWORD}' 2>$null
if (-not $pwB64) {
  Warn "amer-portal-secrets.POSTGRES_PASSWORD is missing. Re-apply secrets.yaml first."
  exit 1
}
$pw = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pwB64))
$dbUrl = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(
  (kubectl -n $Namespace get secret amer-portal-secrets -o jsonpath='{.data.DATABASE_URL}')))
if ($dbUrl -notmatch [Regex]::Escape(":$pw@")) {
  Warn "DATABASE_URL password does NOT match POSTGRES_PASSWORD in the secret."
  Warn "Fix kubernetes/secrets.yaml so both use the same password, re-apply, then re-run."
  exit 1
}
Ok "Secret values are internally consistent."

# --- 1. scale workloads down ------------------------------------------------
Step "Scaling backend + postgres to 0..."
kubectl -n $Namespace scale deploy/backend  --replicas=0 2>$null | Out-Null
kubectl -n $Namespace scale deploy/postgres --replicas=0 2>$null | Out-Null
kubectl -n $Namespace wait --for=delete pod -l app=postgres --timeout=60s 2>$null | Out-Null
Ok "Workloads stopped."

# --- 2. delete PVC + PV -----------------------------------------------------
Step "Deleting PVC + PV..."
kubectl -n $Namespace delete pvc postgres-pvc --ignore-not-found --wait=true | Out-Null
kubectl delete pv postgres-pv --ignore-not-found --wait=true | Out-Null
Ok "PVC/PV gone."

# --- 3. wipe the host directory --------------------------------------------
if ($SkipNodeWipe) {
  Warn "Skipping host data wipe (--SkipNodeWipe)."
} else {
  Step "Wiping data directory on node '$DataNode'..."
  Write-Host ""
  Write-Host "  SSH to the node and run:" -ForegroundColor Yellow
  Write-Host "    ssh $DataNode 'sudo find $DataPath -mindepth 1 -maxdepth 1 -exec rm -rf {} +; sudo install -d -m 700 -o 999 -g 999 $DataPath; ls -la $DataPath'" -ForegroundColor Gray
  Write-Host ""
  Read-Host "Press Enter once the directory is EMPTY (no pgdata, no lost+found)"
}

# --- 4. recreate PV + PVC ---------------------------------------------------
Step "Recreating PV + PVC..."
kubectl apply -f (Join-Path $scriptPath "postgres/pv.yaml")  | Out-Null
kubectl apply -f (Join-Path $scriptPath "postgres/pvc.yaml") -n $Namespace | Out-Null
Ok "Storage recreated."

# --- 5. start postgres ------------------------------------------------------
Step "Starting postgres (will run initdb with the secret's password)..."
kubectl -n $Namespace scale deploy/postgres --replicas=1 | Out-Null
kubectl -n $Namespace rollout status deploy/postgres --timeout=180s

$livePgData = kubectl -n $Namespace get deploy/postgres -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="PGDATA")].value}'
if ($livePgData -ne "/var/lib/postgresql/data/pgdata") {
  Warn "Live postgres deployment is still stale; PGDATA is '$livePgData'. Re-apply postgres/deployment.yaml and rerun."
  exit 1
}
Ok "Live postgres deployment uses PGDATA subdirectory."

# --- 6. verify authentication actually works --------------------------------
Step "Verifying password auth from inside the pod..."
$pgPod = kubectl -n $Namespace get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}'
$check = kubectl -n $Namespace exec $pgPod -- sh -c "PGPASSWORD='$pw' psql -h 127.0.0.1 -U postgres -d amer_portal -c 'SELECT 1' 2>&1"
if ($LASTEXITCODE -ne 0) {
  Warn "Auth check FAILED. Output:"
  Write-Host $check -ForegroundColor Red
  exit 1
}
Ok "Postgres accepts the secret's password."

# --- 7. bring backend back up ----------------------------------------------
Step "Restarting backend..."
kubectl -n $Namespace scale deploy/backend --replicas=1 | Out-Null
kubectl -n $Namespace rollout restart deploy/backend | Out-Null
kubectl -n $Namespace rollout status deploy/backend --timeout=300s

Write-Host ""
Write-Host "Done. Postgres + backend are reset and authenticated." -ForegroundColor Green

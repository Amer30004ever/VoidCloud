# cleanup.ps1 - Amer Devops Portal
# Portable version with automatic force delete after timeout

param(
    [switch]$Force,
    [switch]$ForceDeleteNS,
    [switch]$CleanupPVsOnly
)

$ErrorActionPreference = "Continue"

# Get the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$namespace = "voidcloud"
$appName = "voidcloud"

Write-Host "========================================" -ForegroundColor Red
Write-Host "Cleaning up Amer Devops Portal" -ForegroundColor Red
Write-Host "YAML Files Path: $scriptPath" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Function to cleanup PV claimRefs
function Cleanup-PVClaimRefs {
    Write-Host ""
    Write-Host "=== CLEANING UP PORTAL PV CLAIMREFS ===" -ForegroundColor Cyan

    $allPVs = kubectl get pv --no-headers 2>$null
    if (-not $allPVs) {
        Write-Host "  No PVs found in cluster" -ForegroundColor Yellow
        return
    }

    $appPVs = $allPVs | Where-Object { $_ -match "postgres" -or $_ -match "portal" }

    if (-not $appPVs) {
        Write-Host "  No Portal-related PVs found" -ForegroundColor Yellow
        return
    }

    foreach ($pv in $appPVs) {
        $pvName = ($pv -split "\s+")[0]
        Write-Host "  Checking PV: $pvName" -ForegroundColor Gray
        
        $pvStatus = kubectl get pv $pvName -o jsonpath='{.status.phase}' 2>$null
        Write-Host "    PV Status: $pvStatus" -ForegroundColor Gray

        $claimRef = kubectl get pv $pvName -o jsonpath='{.spec.claimRef}' 2>$null

        if ($claimRef -and $claimRef -ne "<nil>") {
            $claimNamespace = kubectl get pv $pvName -o jsonpath='{.spec.claimRef.namespace}' 2>$null
            $claimName = kubectl get pv $pvName -o jsonpath='{.spec.claimRef.name}' 2>$null

            Write-Host "    Found claimRef: namespace=$claimNamespace, name=$claimName" -ForegroundColor Yellow

            if ($pvStatus -eq "Released") {
                Write-Host "    PV is in Released state - removing claimRef..." -ForegroundColor Yellow
                kubectl patch pv $pvName --type json -p='[{"op": "remove", "path": "/spec/claimRef"}]' 2>$null
                if ($LASTEXITCODE -ne 0) {
                    kubectl patch pv $pvName -p '{"spec":{"claimRef": null}}' 2>$null
                }
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    [OK] Removed claimRef from $pvName" -ForegroundColor Green
                }
            } else {
                $pvcExists = kubectl get pvc $claimName -n $claimNamespace --ignore-not-found 2>$null
                if (-not $pvcExists) {
                    Write-Host "    PVC no longer exists, removing claimRef from PV..." -ForegroundColor Yellow
                    kubectl patch pv $pvName -p '{"spec":{"claimRef": null}}' 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    [OK] Removed claimRef from $pvName" -ForegroundColor Green
                    }
                }
            }
        } else {
            Write-Host "    No claimRef found" -ForegroundColor Gray
            if ($pvStatus -eq "Released") {
                Write-Host "    PV is in 'Released' state, cleaning up..." -ForegroundColor Yellow
                kubectl patch pv $pvName -p '{"spec":{"claimRef": null}}' 2>$null
                Write-Host "    [OK] Cleaned up $pvName" -ForegroundColor Green
            }
        }
    }
}

# Function to cleanup all PVs
function Cleanup-PVs {
    Write-Host ""
    Write-Host "=== CLEANING UP PORTAL PERSISTENTVOLUMES ===" -ForegroundColor Cyan

    $allPVs = kubectl get pv --no-headers 2>$null
    if (-not $allPVs) {
        Write-Host "  No PVs found in cluster" -ForegroundColor Yellow
        return
    }

    $appPVs = $allPVs | Where-Object { $_ -match "postgres" -or $_ -match "portal" }
    if (-not $appPVs) {
        Write-Host "  No Portal-related PVs found" -ForegroundColor Yellow
        return
    }

    foreach ($pv in $appPVs) {
        $pvName = ($pv -split "\s+")[0]
        $pvStatus = ($pv -split "\s+")[4]
        $pvCapacity = ($pv -split "\s+")[1]

        Write-Host "  Processing PV: $pvName (Status: $pvStatus, Capacity: $pvCapacity)" -ForegroundColor Gray

        if ($pvStatus -eq "Released") {
            Write-Host "    PV is in 'Released' state - cleaning up..." -ForegroundColor Yellow
            kubectl patch pv $pvName --type json -p='[{"op": "remove", "path": "/spec/claimRef"}]' 2>$null
            if ($LASTEXITCODE -ne 0) {
                kubectl patch pv $pvName -p '{"spec":{"claimRef": null}}' 2>$null
            }
            Write-Host "    [OK] Removed claimRef from $pvName" -ForegroundColor Green
        }

        if ($ForceDeleteNS -or $Force) {
            Write-Host "    Force deleting PV: $pvName" -ForegroundColor Yellow
            kubectl delete pv $pvName --ignore-not-found --force --grace-period=0 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    [OK] Deleted PV: $pvName" -ForegroundColor Green
            }
        }
    }
}

# Function to force delete namespace
function Force-Delete-Namespace {
    Write-Host ""
    Write-Host "=== FORCE DELETING NAMESPACE: $namespace ===" -ForegroundColor Red

    Write-Host "  Deleting all resources in namespace..." -ForegroundColor Yellow
    kubectl delete all --all -n $namespace --force --grace-period=0 2>$null
    kubectl delete configmaps --all -n $namespace --force --grace-period=0 2>$null
    kubectl delete secrets --all -n $namespace --force --grace-period=0 2>$null
    kubectl delete pvc --all -n $namespace --force --grace-period=0 2>$null
    kubectl delete ingress --all -n $namespace --force --grace-period=0 2>$null

    Write-Host "  Creating finalization patch..." -ForegroundColor Yellow
    $finalizationJson = @"
{
  "apiVersion": "v1",
  "kind": "Namespace",
  "metadata": {
    "name": "$namespace",
    "finalizers": []
  }
}
"@

    $jsonFile = Join-Path $env:TEMP "portal-ns-clean.json"
    $finalizationJson | Out-File -FilePath $jsonFile -Encoding ASCII

    Write-Host "  Removing finalizers..." -ForegroundColor Yellow
    kubectl replace --raw "/api/v1/namespaces/$namespace/finalize" -f $jsonFile 2>$null

    Write-Host "  Force deleting namespace..." -ForegroundColor Yellow
    kubectl delete namespace $namespace --force --grace-period=0 2>$null

    Remove-Item -Path $jsonFile -Force 2>$null

    Write-Host "  Waiting for namespace to be deleted..." -ForegroundColor Gray
    $timeout = 30
    $waited = 0
    while ($waited -lt $timeout) {
        $exists = kubectl get namespace $namespace --ignore-not-found 2>$null
        if (-not $exists) {
            Write-Host "  Namespace $namespace force deleted successfully!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        $waited += 2
        Write-Host "    Still terminating... ($waited/$timeout seconds)" -ForegroundColor Gray
    }

    Write-Host "  WARNING: Namespace may still exist. Manual intervention may be needed." -ForegroundColor Red
    return $false
}

# If only cleaning up PVs
if ($CleanupPVsOnly) {
    Cleanup-PVClaimRefs
    Cleanup-PVs
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Portal PV cleanup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
}

if (-not $Force) {
    Write-Host "WARNING: This will delete all Amer Portal resources!" -ForegroundColor Yellow
    $confirm = Read-Host "Are you sure? Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# First, cleanup PV claimRefs before deleting namespace
Cleanup-PVClaimRefs
Cleanup-PVs

# Check if namespace exists
$nsExists = kubectl get namespace $namespace --ignore-not-found 2>$null
if (-not $nsExists) {
    Write-Host "Namespace '$namespace' does not exist. Nothing to clean up." -ForegroundColor Yellow
    Cleanup-PVs
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Portal cleanup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
}

# Check namespace status
$nsStatus = kubectl get namespace $namespace -o jsonpath='{.status.phase}' 2>$null
if ($nsStatus -eq "Terminating") {
    Write-Host "Namespace '$namespace' is already stuck in Terminating state!" -ForegroundColor Red
    Write-Host "Proceeding with force deletion..." -ForegroundColor Yellow
    Force-Delete-Namespace
    Cleanup-PVs
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Portal force cleanup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
}

# Normal cleanup - delete namespace
Write-Host ""
Write-Host "Deleting namespace: $namespace" -ForegroundColor Yellow
kubectl delete namespace $namespace --ignore-not-found --wait=false

Write-Host "  Waiting for namespace to be deleted (max 60 seconds)..." -ForegroundColor Gray
$timeout = 60
$waited = 0
$autoForceDelete = $false

while ($waited -lt $timeout) {
    $exists = kubectl get namespace $namespace --ignore-not-found 2>$null
    if (-not $exists) {
        Write-Host "  Namespace $namespace deleted successfully!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "    Still terminating... ($waited/$timeout seconds)" -ForegroundColor Gray

    if ($waited -ge 60 -and (-not $ForceDeleteNS)) {
        Write-Host ""
        Write-Host "WARNING: Namespace did not terminate within 60 seconds!" -ForegroundColor Red
        Write-Host "Automatically triggering force deletion..." -ForegroundColor Yellow
        $autoForceDelete = $true
        break
    }
}

if ($autoForceDelete -or $ForceDeleteNS) {
    Force-Delete-Namespace
}

# Final PV cleanup
Cleanup-PVs

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Portal cleanup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
# VoidCloud — Build, Push, and Deploy Script
# Usage: .\scripts\build-push-deploy.ps1
# Requires: docker logged in to Docker Hub (amer30004ever), kubectl configured

$ErrorActionPreference = "Continue"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptPath
Set-Location $repoRoot

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $repoRoot "build-push-deploy-$ts.log"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $Message"
    Write-Output $entry
    $entry | Out-File -FilePath $logFile -Append
}

function Write-Success { param([string]$Message) Write-Log $Message "Green" }
function Write-Warning { param([string]$Message) Write-Log $Message "Yellow" }
function Write-ErrorMsg { param([string]$Message) Write-Log $Message "Red" }
function Write-Info { param([string]$Message) Write-Log $Message "Cyan" }

function Show-Menu {
    Clear-Host
    Write-Log "==========================================" "Cyan"
    Write-Log "  VoidCloud Build, Push & Deploy" "Cyan"
    Write-Log "==========================================" "Cyan"
    Write-Output ""
    Write-Log "  What would you like to do?" "White"
    Write-Output ""
    Write-Log "  BUILD TARGETS:" "Yellow"
    Write-Log "  1. Frontend only" "White"
    Write-Log "  2. Specific backend service" "White"
    Write-Log "  3. Multiple backend services" "White"
    Write-Log "  4. All backend services" "White"
    Write-Log "  5. Frontend + All backend services" "White"
    Write-Output ""
    Write-Log "  ACTIONS:" "Yellow"
    Write-Log "  A. Build only" "White"
    Write-Log "  B. Push only" "White"
    Write-Log "  C. Deploy only (rollout restart + verify)" "White"
    Write-Log "  D. Build + Push" "White"
    Write-Log "  E. Build + Push + Deploy (full pipeline)" "White"
    Write-Output ""
    Write-Log "  0. Exit" "White"
    Write-Output ""
}

function Get-Choice {
    param([string]$Prompt, [string[]]$ValidChoices)

    while ($true) {
        $choice = Read-Host $Prompt
        if ($ValidChoices -contains $choice) {
            return $choice
        }
        Write-ErrorMsg "Invalid choice. Please enter one of: $($ValidChoices -join ', ')"
    }
}

function Get-ServiceChoice {
    param([string]$Prompt, [hashtable[]]$Services)

    Write-Output ""
    foreach ($svc in $Services) {
        Write-Log "  $($svc.Key). $($svc.Value.Name)" "White"
    }
    Write-Output ""

    while ($true) {
        $choice = Read-Host $Prompt
        if ($Services.ContainsKey($choice)) {
            return $choice
        }
        Write-ErrorMsg "Invalid selection. Please enter a valid number."
    }
}

function Get-MultiChoice {
    param([string]$Prompt, [hashtable[]]$Services)

    $selected = @()
    Write-Output ""
    foreach ($svc in $Services) {
        Write-Log "  $($svc.Key). $($svc.Value.Name)" "White"
    }
    Write-Output ""
    Write-Log "Enter service numbers one by one (type 'done' when finished):" "Cyan"

    while ($true) {
        $input = Read-Host "Service number"
        if ($input -eq "done") {
            break
        }
        if ($Services.ContainsKey($input)) {
            if ($selected -contains $input) {
                Write-Warning "Already selected: $($Services[$input].Name)"
            } else {
                $selected += $input
                Write-Success "Added: $($Services[$input].Name)"
            }
        } else {
            Write-ErrorMsg "Invalid selection"
        }
    }
    return $selected
}

function Build-Image {
    param(
        [hashtable]$Service,
        [string]$Tag
    )

    $dockerfile = $Service.Dockerfile
    $imageName = $Service.ImageName
    $imageRef = "${Registry}/${imageName}:${Tag}"

    $cmd = "docker build"
    foreach ($flag in $dockerFlags) { $cmd += " $flag" }
    $cmd += " -f $dockerfile -t $imageRef"

    if ($Service.BuildArgs) {
        foreach ($arg in $Service.BuildArgs) {
            $cmd += " --build-arg $arg"
        }
    }

    $cmd += " ."

    Write-Info "Building $($Service.Name): $imageRef"

    Invoke-Expression $cmd 2>&1 | Out-File -FilePath $logFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-ErrorMsg "Build failed for $($Service.Name) (exit code: $exitCode)"
        return $false
    }

    Write-Success "Build succeeded for $($Service.Name)"
    return $true
}

function Push-Image {
    param(
        [hashtable]$Service,
        [string]$Tag
    )

    $imageName = $Service.ImageName
    $imageRef = "${Registry}/${imageName}:${Tag}"

    Write-Info "Pushing $($Service.Name): $imageRef"

    docker push $imageRef 2>&1 | Out-File -FilePath $logFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-ErrorMsg "Push failed for $($Service.Name) (exit code: $exitCode)"
        return $false
    }

    Write-Success "Push succeeded for $($Service.Name)"
    return $true
}

function Deploy-Service {
    param(
        [hashtable]$Service
    )

    Write-Info "Deploying $($Service.Name) to $Namespace"

    kubectl rollout restart deployment/$($Service.K8sDeployment) -n $Namespace 2>&1 | Out-File -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Rollout restart failed for $($Service.Name)"
        return $false
    }

    Write-Info "Waiting for rollout to complete..."
    kubectl rollout status deployment/$($Service.K8sDeployment) -n $Namespace --timeout=300s 2>&1 | Out-File -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Rollout failed or timed out for $($Service.Name)"
        return $false
    }

    Write-Success "Deployment complete for $($Service.Name)"
    return $true
}

function Verify-Pods {
    param(
        [hashtable]$Service
    )

    Write-Info "Verifying pods for $($Service.Name)..."

    kubectl get pods -n $Namespace -l app=$($Service.K8sDeployment) -o wide 2>&1 | Out-File -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not retrieve pod status for $($Service.Name)"
        return $false
    }

    kubectl get pods -n $Namespace -l app=$($Service.K8sDeployment) -o wide

    $ready = kubectl get pods -n $Namespace -l app=$($Service.K8sDeployment) -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{" "}{end}' 2>$null
    if ($ready -match "True") {
        Write-Success "All pods ready for $($Service.Name)"
        return $true
    }

    Write-Warning "Some pods not ready for $($Service.Name)"
    return $false
}

# --- Service definitions ---
$frontendService = @{
    Name = "frontend"
    Dockerfile = "frontend/Dockerfile"
    ImageName = "voidcloud-frontend"
    K8sDeployment = "frontend"
    BuildArgs = @("NEXT_PUBLIC_API_URL=https://api.voidcloud.cc.cd/api/v1", "NEXT_TELEMETRY_DISABLED=1")
}

$backendServices = @(
    @{ Name = "auth";          Dockerfile = "services/auth/Dockerfile";          ImageName = "voidcloud-auth-service";          K8sDeployment = "auth" },
    @{ Name = "user";          Dockerfile = "services/user/Dockerfile";          ImageName = "voidcloud-user-service";          K8sDeployment = "user" },
    @{ Name = "tenant";        Dockerfile = "services/tenant/Dockerfile";        ImageName = "voidcloud-tenant-service";        K8sDeployment = "tenant" },
    @{ Name = "vps";           Dockerfile = "services/vps/Dockerfile";           ImageName = "voidcloud-vps-service";           K8sDeployment = "vps" },
    @{ Name = "billing";       Dockerfile = "services/billing/Dockerfile";       ImageName = "voidcloud-billing-service";       K8sDeployment = "billing" },
    @{ Name = "crm";           Dockerfile = "services/crm/Dockerfile";           ImageName = "voidcloud-crm-service";           K8sDeployment = "crm" },
    @{ Name = "whatsapp";      Dockerfile = "services/whatsapp/Dockerfile";      ImageName = "voidcloud-whatsapp-service";      K8sDeployment = "whatsapp" },
    @{ Name = "email";         Dockerfile = "services/email/Dockerfile";         ImageName = "voidcloud-email-service";         K8sDeployment = "email" },
    @{ Name = "notification";  Dockerfile = "services/notification/Dockerfile";  ImageName = "voidcloud-notification-service";  K8sDeployment = "notification" },
    @{ Name = "monitoring";    Dockerfile = "services/monitoring/Dockerfile";    ImageName = "voidcloud-monitoring-service";    K8sDeployment = "monitoring" },
    @{ Name = "audit";         Dockerfile = "services/audit/Dockerfile";         ImageName = "voidcloud-audit-service";         K8sDeployment = "audit" },
    @{ Name = "analytics";     Dockerfile = "services/analytics/Dockerfile";     ImageName = "voidcloud-analytics-service";     K8sDeployment = "analytics" },
    @{ Name = "sub2api";       Dockerfile = "services/sub2api/Dockerfile";       ImageName = "voidcloud-sub2api-service";       K8sDeployment = "sub2api" },
    @{ Name = "agent";         Dockerfile = "services/agent/Dockerfile";         ImageName = "voidcloud-agent-service";         K8sDeployment = "agent" }
)

$backendMap = @{}
$idx = 1
foreach ($svc in $backendServices) {
    $backendMap[$idx.ToString()] = $svc
    $idx++
}

# --- Options ---
$dockerFlags = @()
$Registry = "amer30004ever"
$Namespace = "voidcloud"

Write-Log "==========================================" "Cyan"
Write-Log "  VoidCloud Build, Push & Deploy" "Cyan"
Write-Log "==========================================" "Cyan"
Write-Log "Registry: $Registry" "White"
Write-Log "Namespace: $Namespace" "White"
Write-Log "Log file: $logFile" "White"
Write-Log "==========================================" "Cyan"

# --- Target selection ---
Show-Menu
$targetChoice = Get-Choice "Enter target number" @("1","2","3","4","5","0")

if ($targetChoice -eq "0") {
    Write-Info "Exiting..."
    exit 0
}

# --- Action selection ---
Write-Output ""
Write-Log "Select action:" "Yellow"
Write-Log "  A. Build only" "White"
Write-Log "  B. Push only" "White"
Write-Log "  C. Deploy only" "White"
Write-Log "  D. Build + Push" "White"
Write-Log "  E. Build + Push + Deploy (full pipeline)" "White"
Write-Output ""
$actionChoice = Get-Choice "Enter action" @("A","B","C","D","E")

# --- Options ---
Write-Output ""
$noCache = Read-Host "No cache? (y/n)"
if ($noCache -eq "y" -or $noCache -eq "Y") {
    $dockerFlags += "--no-cache"
}

$platform = Read-Host "Platform [linux/amd64] (press Enter to default)"
if ($platform -ne "") {
    $dockerFlags += "--platform", $platform
}

Write-Output ""

# --- Determine services ---
$services = @()

switch ($targetChoice) {
    "1" {
        $services += $frontendService
    }
    "2" {
        $key = Get-ServiceChoice "Enter service number" $backendMap
        $services += $backendMap[$key]
    }
    "3" {
        $selected = Get-MultiChoice "Select services" $backendMap
        foreach ($k in $selected) {
            $services += $backendMap[$k]
        }
    }
    "4" {
        $services += $backendServices
    }
    "5" {
        $services += $frontendService
        $services += $backendServices
    }
}

if ($services.Count -eq 0) {
    Write-ErrorMsg "No services selected. Exiting."
    exit 1
}

# --- Execute ---
$doBuild = $actionChoice -in @("A", "D", "E")
$doPush = $actionChoice -in @("B", "D", "E")
$doDeploy = $actionChoice -in @("C", "E")

Write-Log "" "White"
Write-Log "==========================================" "Cyan"
Write-Log "Starting pipeline..." "Cyan"
Write-Log "  Targets: $($services | ForEach-Object { $_.Name }) -join ', '" "White"
Write-Log "  Build: $doBuild, Push: $doPush, Deploy: $doDeploy" "White"
Write-Log "==========================================" "Cyan"
Write-Log "" "White"

$successCount = 0
$failCount = 0

foreach ($svc in $services) {
    Write-Log "" "White"
    Write-Info "=== Processing: $($svc.Name) ===" "Cyan"
    Write-Log "----------------------------------------" "White"

    if ($doBuild) {
        if (-not (Build-Image $svc "latest")) {
            $failCount++
            Write-Log "Skipping push/deploy for $($svc.Name) due to build failure" "Yellow"
            continue
        }
        if (-not (Build-Image $svc $ts)) {
            $failCount++
            Write-Log "Skipping push/deploy for $($svc.Name) due to build failure" "Yellow"
            continue
        }
    }

    if ($doPush) {
        if (-not (Push-Image $svc "latest")) {
            $failCount++
            Write-Log "Skipping deploy for $($svc.Name) due to push failure" "Yellow"
            continue
        }
        if (-not (Push-Image $svc $ts)) {
            $failCount++
            Write-Log "Skipping deploy for $($svc.Name) due to push failure" "Yellow"
            continue
        }
    }

    if ($doDeploy) {
        if (-not (Deploy-Service $svc)) {
            $failCount++
            continue
        }
        Start-Sleep -Seconds 5
        if (-not (Verify-Pods $svc)) {
            Write-Warning "Pod verification inconclusive for $($svc.Name)"
        }
    }

    $successCount++
}

Write-Log "" "White"
Write-Log "==========================================" "Cyan"
Write-Log "Pipeline complete: $successCount succeeded, $failCount failed" "White"
Write-Log "Log file: $logFile" "White"
Write-Log "==========================================" "Cyan"

if ($failCount -gt 0) {
    exit 1
}
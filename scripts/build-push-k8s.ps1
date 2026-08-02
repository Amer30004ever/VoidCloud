<#
.SYNOPSIS
  Build, push, and deploy VoidCloud images using native Docker context (no WSL).

.DESCRIPTION
  This script builds Docker images from service Dockerfiles using the local
  Docker context (DOCKER_HOST=ssh://docker@10.51.100.70), pushes them to
  Docker Hub under the `amer30004ever` namespace, and deploys them to Kubernetes
  via `kubectl rollout restart deployment`.

  When no switches are provided, an interactive menu lets you pick build
  targets and actions (build only, push only, deploy only, full pipeline).

  When switches are provided, the script runs in automated mode:
    -BuildOnly   → Build all images locally only (tag :latest and :<timestamp>)
    -StartOnly   → Push cached images to Docker Hub + deploy via K8s rollout restart
    -Stop        → Scale down all deployments to 0 replicas
    -Clean       → Remove local Docker images for all services
    -Logs        → Show live K8s pod logs (after deploy or for existing pods)
    -SkipDeps    → Skip health-check waits after deploy
    -Help        → Show this help message

.PARAMETER BuildOnly
    Only build Docker images; do not push or deploy.

.PARAMETER StartOnly
    Only push and deploy (uses cached/local images); do not rebuild.

.PARAMETER Stop
    Scale down all deployments to 0 replicas.

.PARAMETER Clean
    Remove local Docker images for all services.

.PARAMETER Logs
    Show live Kubernetes pod logs.

.PARAMETER SkipDeps
    Skip health-check waits after deploy.

.PARAMETER Help
    Show this help message.

.EXAMPLE
    .\build-push-k8s.ps1
    # Interactive menu: choose targets and actions

.EXAMPLE
    .\build-push-k8s.ps1 -BuildOnly -Logs
    # Build all images, then show logs after

.EXAMPLE
    .\build-push-k8s.ps1 -StartOnly -SkipDeps
    # Push existing images and deploy without waiting for pod readiness

.EXAMPLE
    .\build-push-k8s.ps1 -Clean
    # Remove local Docker images for selected services

.EXAMPLE
    .\build-push-k8s.ps1 -Help
    # Show help
#>

param(
    [switch]$BuildOnly,
    [switch]$StartOnly,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Logs,
    [switch]$SkipDeps,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

# ── Configuration ─────────────────────────────────────────────────────
$Root = "E:\Master_Mind\Amer_Brain\Repossitories\GitHub\Amer30004ever\Amer-Devops-Portal"
$Registry = "amer30004ever"
$Namespace = "voidcloud"
$DockerContext = "docker-vm"

Set-Location $Root

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $Root "build-push-k8s-$ts.log"

# ── Logging helpers ───────────────────────────────────────────────────
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $Message"
    Write-Host $entry
    $entry | Out-File -FilePath $logFile -Append
}

function Write-Success { param([string]$Message) Write-Log $Message "Green" }
function Write-Warn   { param([string]$Message) Write-Log $Message "Yellow" }
function Write-Err    { param([string]$Message) Write-Log $Message "Red" }
function Write-Info   { param([string]$Message) Write-Log $Message "Cyan" }

# ── Help ──────────────────────────────────────────────────────────────
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# ── Docker context check ──────────────────────────────────────────────
function Test-DockerContext {
    Write-Info "[DOCKER] Checking Docker context ($DockerContext) ..."
    $exitCode = Invoke-NativeStreaming "docker" "context ls"
    if ($exitCode -ne 0) {
        Write-Err "Docker context ls failed. Check context."
        exit 1
    }
    $exitCode = Invoke-NativeStreaming "docker" "-c $DockerContext info"   # <-- FIXED
    if ($exitCode -ne 0) {
        Write-Err "Docker daemon not reachable for context '$DockerContext'. Check context."
        exit 1
    }
    Write-Success "[DOCKER] Docker context '$DockerContext' is reachable."
}

# ── kubectl context check ─────────────────────────────────────────────
function Test-KubectlContext {
    Write-Info "[K8S] Checking kubectl context ..."
    $exitCode = Invoke-NativeStreaming "kubectl" "cluster-info"
    if ($exitCode -ne 0) {
        Write-Warn "kubectl context not reachable. Deploy step may fail."
    } else {
        Write-Success "[K8S] kubectl context is reachable."
    }
}

# ── Service definitions ───────────────────────────────────────────────
# Frontend
$frontendService = @{
    Name         = "frontend"
    Dockerfile   = "frontend/Dockerfile"
    ImageName    = "voidcloud-frontend"
    K8sDeployment = "frontend"
    BuildArgs    = @("NEXT_PUBLIC_API_URL=https://api.voidcloud.cc.cd/api/v1", "NEXT_TELEMETRY_DISABLED=1")
}

# Backend microservices
$backendServices = @(
    @{ Name = "auth";          Dockerfile = "services/auth/Dockerfile";          ImageName = "voidcloud-auth-service";          K8sDeployment = "auth-service" },
    @{ Name = "user";          Dockerfile = "services/user/Dockerfile";          ImageName = "voidcloud-user-service";          K8sDeployment = "user-service" },
    @{ Name = "tenant";        Dockerfile = "services/tenant/Dockerfile";        ImageName = "voidcloud-tenant-service";        K8sDeployment = "tenant-service" },
    @{ Name = "vps";           Dockerfile = "services/vps/Dockerfile";           ImageName = "voidcloud-vps-service";           K8sDeployment = "vps-service" },
    @{ Name = "billing";       Dockerfile = "services/billing/Dockerfile";       ImageName = "voidcloud-billing-service";       K8sDeployment = "billing-service" },
    @{ Name = "crm";           Dockerfile = "services/crm/Dockerfile";           ImageName = "voidcloud-crm-service";           K8sDeployment = "crm-service" },
    @{ Name = "whatsapp";      Dockerfile = "services/whatsapp/Dockerfile";      ImageName = "voidcloud-whatsapp-service";      K8sDeployment = "whatsapp-service" },
    @{ Name = "email";         Dockerfile = "services/email/Dockerfile";         ImageName = "voidcloud-email-service";         K8sDeployment = "email-service" },
    @{ Name = "notification";  Dockerfile = "services/notification/Dockerfile";  ImageName = "voidcloud-notification-service";  K8sDeployment = "notification-service" },
    @{ Name = "monitoring";    Dockerfile = "services/monitoring/Dockerfile";    ImageName = "voidcloud-monitoring-service";    K8sDeployment = "monitoring-service" },
    @{ Name = "audit";         Dockerfile = "services/audit/Dockerfile";         ImageName = "voidcloud-audit-service";         K8sDeployment = "audit-service" },
    @{ Name = "analytics";     Dockerfile = "services/analytics/Dockerfile";     ImageName = "voidcloud-analytics-service";     K8sDeployment = "analytics-service" },
    @{ Name = "sub2api";       Dockerfile = "services/sub2api/Dockerfile";       ImageName = "voidcloud-sub2api-service";       K8sDeployment = "sub2api-service" },
    @{ Name = "agent";         Dockerfile = "services/agent/Dockerfile";         ImageName = "voidcloud-agent-service";         K8sDeployment = "agent-service" }
)

$backendMap = @{}
$idx = 1
foreach ($svc in $backendServices) {
    $backendMap[$idx.ToString()] = $svc
    $idx++
}

# ── Docker build flags ────────────────────────────────────────────────
$dockerBuildFlags = @()

# ── Native command runner (real-time output + correct exit code) ──────────
# PowerShell 5.1 buffers native command output when piped through Tee-Object,
# causing build/deploy output to appear all at once after the command finishes.
# This function uses .NET Process class for line-by-line streaming output
# while correctly capturing the exit code.
function Invoke-NativeStreaming {
    param(
        [Parameter(Mandatory=$true)]
        [string]$FileName,
        [Parameter(Mandatory=$true)]
        [string]$Arguments,
        [string]$WorkingDirectory = $Root
    )
    
    Write-Host "> $FileName $Arguments" -ForegroundColor Gray
    
    $process = Start-Process -FilePath $FileName -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru
    
    return $process.ExitCode
}

# ── Build image ───────────────────────────────────────────────────────
function Build-Image {
    param(
        [hashtable]$Service,
        [string[]]$Tags
    )

    $dockerfile = $Service.Dockerfile
    $imageName = $Service.ImageName

    $buildArgs = @("-c", $DockerContext, "build")
    foreach ($flag in $dockerBuildFlags) { $buildArgs += $flag }

    foreach ($t in $Tags) {
        $fullRef = "${Registry}/${imageName}:${t}"
        $buildArgs += "-t", $fullRef
    }

    if ($service.BuildArgs) {
        foreach ($arg in $service.BuildArgs) {
            $buildArgs += "--build-arg", $arg
        }
    }

    $buildArgs += "-f", $dockerfile, "."

    $cmdDisplay = "docker " + ($buildArgs -join " ")
    Write-Info "Building $($Service.Name): $cmdDisplay"

    $exitCode = Invoke-NativeStreaming "docker" ($buildArgs -join " ")
    if ($exitCode -ne 0) { 
        Write-Err "Build failed for $($Service.Name) (exit code: $exitCode)"
        return $false
    }

    Write-Success "Build succeeded for $($Service.Name)"
    return $true
}

# ── Push image ────────────────────────────────────────────────────────
function Push-Image {
    param(
        [hashtable]$Service,
        [string[]]$Tags
    )

    $imageName = $Service.ImageName

    foreach ($t in $Tags) {
        $fullRef = "${Registry}/${imageName}:${t}"
        Write-Info "Pushing $($Service.Name): $fullRef"
        $exitCode = Invoke-NativeStreaming "docker" "-c $DockerContext push $fullRef"
        if ($exitCode -ne 0) {
            Write-Err "Push failed for $($Service.Name):$t (exit code: $exitCode)"
            return $false
        }

        Write-Success "Push succeeded for $($Service.Name):$t"
    }
    return $true
}

# ── Deploy (kubectl rollout restart) ──────────────────────────────────
function Deploy-Service {
    param(
        [hashtable]$Service
    )

    $deployName = $Service.K8sDeployment
    $imageName = $Service.ImageName
    Write-Info "Deploying $($Service.Name) to K8s namespace '$Namespace' (deployment: $deployName)"

    # Update image reference to ensure K8s pulls from correct registry
    $imageRef = "${Registry}/${imageName}:latest"
    Write-Info "Setting image: $deployName=$imageRef"
    $exitCode = Invoke-NativeStreaming "kubectl" "set image deployment/$deployName $deployName=$imageRef -n $Namespace"
    if ($exitCode -ne 0) {
        Write-Err "kubectl set image failed for $($Service.Name)"
        return $false
    }

    $exitCode = Invoke-NativeStreaming "kubectl" "rollout restart deployment $deployName -n $Namespace"
    if ($exitCode -ne 0) {
        Write-Err "Rollout restart failed for $($Service.Name)"
        return $false
    }

    if (-not $SkipDeps) {
        Write-Info "Waiting for rollout of $deployName ..."
        $exitCode = Invoke-NativeStreaming "kubectl" "rollout status deployment $deployName -n $Namespace --timeout=300s"
        if ($exitCode -ne 0) {
            Write-Err "Rollout timed out or failed for $($Service.Name)"
            return $false
        }
    }

    Write-Success "Deployment complete for $($Service.Name)"
    return $true
}

# ── Verify pods ───────────────────────────────────────────────────────
function Verify-Pods {
    param(
        [hashtable]$Service
    )

    $deployName = $Service.K8sDeployment
    Write-Info "Verifying pods for $($Service.Name) ..."

    Invoke-NativeStreaming "kubectl" "get pods -n $Namespace -l app=$deployName -o wide"
    Write-Host ""

    if ($SkipDeps) {
        Write-Warn "Skipping pod readiness check (-SkipDeps)"
        return $true
    }

    $ready = & kubectl get pods -n $Namespace -l app=$deployName -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{" "}{end}' 2>$null
    if ($ready -match "True") {
        Write-Success "All pods ready for $($Service.Name)"
        return $true
    }

    Write-Warn "Some pods not ready for $($Service.Name): $ready"
    return $false
}

# ── Show logs ─────────────────────────────────────────────────────────
function Show-Logs {
    param(
        [hashtable]$Service
    )

    $deployName = $Service.K8sDeployment
    Write-Info "=== Pod logs for $($Service.Name) (Ctrl+C to exit) ==="
    Write-Host ""
    kubectl get pods -n $Namespace -l app=$deployName -o jsonpath='{.items[0].metadata.name}' 2>$null | ForEach-Object {
        $podName = $_
        if ($podName) {
            Invoke-NativeStreaming "kubectl" "logs -f $podName -n $Namespace"
        }
    }
}

# ── Scale down (stop) ─────────────────────────────────────────────────
function Stop-Service {
    param(
        [hashtable]$Service
    )

    $deployName = $Service.K8sDeployment
    Write-Warn "Scaling down $($Service.Name) (deployment: $deployName) to 0 replicas ..."
    $exitCode = Invoke-NativeStreaming "kubectl" "scale deployment $deployName -n $Namespace --replicas=0"
    if ($exitCode -ne 0) {
        Write-Err "Scale down failed for $($Service.Name)"
        return $false
    }
    Write-Success "Stopped $($Service.Name)"
    return $true
}

# ── Clean local images ────────────────────────────────────────────────
function Clean-Image {
    param(
        [hashtable]$Service
    )

    $imageName = $Service.ImageName
    $localRefs = @(
        "${Registry}/${imageName}:latest",
        "${Registry}/${imageName}:$ts"
    )

    foreach ($ref in $localRefs) {
        Write-Info "Removing local image: $ref"
        Invoke-NativeStreaming "docker" "-c $DockerContext rmi $ref"
    }
    Write-Success "Cleaned images for $($Service.Name)"
}

# ── Interactive menu ────────────────────────────────────────────────────
function Show-Menu {
    Clear-Host
    Write-Log "==========================================" "Cyan"
    Write-Log "  VoidCloud Build, Push & K8s Deploy" "Cyan"
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
        if ($ValidChoices -contains $choice) { return $choice }
        Write-Err "Invalid choice. Please enter one of: $($ValidChoices -join ', ')"
    }
}

function Get-ServiceChoice {
    param([string]$Prompt)
    Write-Output ""
    foreach ($svc in $backendMap.GetEnumerator() | Sort-Object { [int]$_.Key }) {
        Write-Log "  $($svc.Key). $($svc.Value.Name)" "White"
    }
    Write-Output ""
    return Get-Choice $Prompt ($backendMap.Keys + @("done"))
}

function Get-MultiChoice {
    param([string]$Prompt)
    $selected = @()
    Write-Output ""
    foreach ($svc in $backendMap.GetEnumerator() | Sort-Object { [int]$_.Key }) {
        Write-Log "  $($svc.Key). $($svc.Value.Name)" "White"
    }
    Write-Output ""
    Write-Log "Enter service numbers one by one (type 'done' when finished):" "Cyan"

    while ($true) {
        $input = Read-Host "Service number"
        if ($input -eq "done") { break }
        if ($backendMap.ContainsKey($input)) {
            if ($selected -contains $input) {
                Write-Warn "Already selected: $($backendMap[$input].Name)"
            } else {
                $selected += $input
                Write-Success "Added: $($backendMap[$input].Name)"
            }
        } else {
            Write-Err "Invalid selection"
        }
    }
    return $selected
}

# ── Pre-flight checks ─────────────────────────────────────────────────
Write-Log "==========================================" "Cyan"
Write-Log "  VoidCloud Build, Push & K8s Deploy" "Cyan"
Write-Log "==========================================" "Cyan"
Write-Log "Registry: $Registry" "White"
Write-Log "Namespace: $Namespace" "White"
Write-Log "Docker Context: $DockerContext" "White"
Write-Log "Log file: $logFile" "White"
Write-Log "Timestamp tag: $ts" "White"
Write-Log "==========================================" "Cyan"
Write-Output ""

# ── Automated mode (switch parameters) ────────────────────────────────
if ($Stop -or $Clean) {
    # These modes need service selection — fall through to interactive if no other mode
    if (-not ($BuildOnly -or $StartOnly -or $Logs)) {
        # Stop or Clean without other flags — use interactive or apply to all
        if ($Stop) {
            Write-Warn "Stop mode selected. Scaling down all VoidCloud app deployments to 0 replicas."
            Write-Info "Services being scaled down: frontend + all backend services"
            Test-KubectlContext

            $allServices = @($frontendService) + $backendServices
            $success = 0
            $fail = 0
            foreach ($svc in $allServices) {
                if (Stop-Service $svc) { $success++ } else { $fail++ }
            }
            Write-Log "==========================================" "Cyan"
            Write-Log "Stop complete: $success succeeded, $fail failed" "Cyan"
            Write-Log "==========================================" "Cyan"
            if ($fail -gt 0) { exit 1 } else { exit 0 }
        }
        if ($Clean) {
            Write-Warn "Clean mode selected. Removing local Docker images for all VoidCloud services."
            Test-DockerContext

            $allServices = @($frontendService) + $backendServices
            foreach ($svc in $allServices) {
                Clean-Image $svc
            }
            Write-Log "==========================================" "Cyan"
            Write-Log "Clean complete." "Cyan"
            Write-Log "==========================================" "Cyan"
            exit 0
        }
    }
}

# ── Interactive mode (no switches = menu) ─────────────────────────────
if (-not ($BuildOnly -or $StartOnly -or $Stop -or $Clean -or $Logs)) {
    # Interactive menu
    Show-Menu
    $targetChoice = Get-Choice "Enter target number" @("1","2","3","4","5","0")

    if ($targetChoice -eq "0") {
        Write-Info "Exiting..."
        exit 0
    }

    Write-Output ""
    Write-Log "Select action:" "Yellow"
    Write-Log "  A. Build only" "White"
    Write-Log "  B. Push only" "White"
    Write-Log "  C. Deploy only" "White"
    Write-Log "  D. Build + Push" "White"
    Write-Log "  E. Build + Push + Deploy (full pipeline)" "White"
    Write-Output ""
    $actionChoice = Get-Choice "Enter action" @("A","B","C","D","E")

    # Options
    Write-Output ""
    $noCache = Read-Host "No cache? (y/n)"
    if ($noCache -eq "y" -or $noCache -eq "Y") {
        $dockerBuildFlags += "--no-cache"
    }

    $platform = Read-Host "Platform [linux/amd64] (press Enter to default)"
    if ($platform -ne "") {
        $dockerBuildFlags += "--platform", $platform
    } else {
        $dockerBuildFlags += "--platform", "linux/amd64"
    }

    Write-Output ""

    $services = @()
    switch ($targetChoice) {
        "1" { $services += $frontendService }
        "2" {
            $key = Get-ServiceChoice "Enter service number"
            $services += $backendMap[$key]
        }
        "3" {
            $selected = Get-MultiChoice "Select services"
            foreach ($k in $selected) { $services += $backendMap[$k] }
        }
        "4" { $services += $backendServices }
        "5" {
            $services += $frontendService
            $services += $backendServices
        }
    }

    if ($services.Count -eq 0) {
        Write-Err "No services selected. Exiting."
        exit 1
    }

    $doBuild  = $actionChoice -in @("A", "D", "E")
    $doPush   = $actionChoice -in @("B", "D", "E")
    $doDeploy = $actionChoice -in @("C", "E")

    if ($doBuild)  { Test-DockerContext }
    if ($doPush)   { Test-DockerContext }
    if ($doDeploy) { Write-Info "[K8S] Checking kubectl context ..."; Invoke-NativeStreaming "kubectl" "cluster-info" | Out-Null; Write-Host "" }

    Write-Log "" "White"
    Write-Log "==========================================" "Cyan"
    Write-Log "Starting pipeline..." "Cyan"
    Write-Log "  Targets: $(($services | ForEach-Object { $_.Name }) -join ', ')" "White"
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
            if (-not (Build-Image $svc @("latest", $ts))) {
                $failCount++
                Write-Warn "Skipping push/deploy for $($svc.Name) due to build failure"
                continue
            }
        }

        if ($doPush) {
            if (-not (Push-Image $svc @("latest", $ts))) {
                $failCount++
                Write-Warn "Skipping deploy for $($svc.Name) due to push failure"
                continue
            }
        }

        if ($doDeploy) {
            if (-not (Deploy-Service $svc)) {
                $failCount++
                continue
            }
            Start-Sleep -Seconds 5
            if ($Logs) { Show-Logs $svc }
            if (-not $SkipDeps) { Verify-Pods $svc }
        }

        $successCount++
    }

    Write-Log "" "White"
    Write-Log "==========================================" "Cyan"
    Write-Log "Pipeline complete: $successCount succeeded, $failCount failed" "Cyan"
    Write-Log "Log file: $logFile" "White"
    Write-Log "==========================================" "Cyan"

    if ($failCount -gt 0) { exit 1 }
    exit 0
}

# ── Switch-based automated mode ───────────────────────────────────────
# Determine which services to operate on
$services = @()
Write-Info "[MODE] Automated mode (switches)"

if ($BuildOnly -or $StartOnly) {
    # Build-only or start-only mode operates on ALL services by default
    # (build/run all like build-run-wsl.ps1 — full flow)
    $services = @($frontendService) + $backendServices
}

Write-Log "" "White"
Write-Log "==========================================" "Cyan"
Write-Log "Automated pipeline" "Cyan"
Write-Log "  BuildOnly: $BuildOnly" "White"
Write-Log "  StartOnly: $StartOnly" "White"
Write-Log "  Stop: $Stop" "White"
Write-Log "  Clean: $Clean" "White"
Write-Log "  Logs: $Logs" "White"
Write-Log "  SkipDeps: $SkipDeps" "White"
Write-Log "  DockerContext: $DockerContext" "White"
Write-Log "  Registry: $Registry / Namespace: $Namespace" "White"
Write-Log "  Timestamp: $ts" "White"
Write-Log "==========================================" "Cyan"
Write-Log "" "White"

if ($BuildOnly -or $StartOnly) {
    Test-DockerContext
}
if ($StartOnly -or $Logs) {
    Test-KubectlContext
}

# Build flags for automated mode — only needed for -BuildOnly (no rebuild for -StartOnly)
if ($BuildOnly) {
    $dockerBuildFlags += "--platform", "linux/amd64"
}

if ($BuildOnly -or $StartOnly) {
    # -BuildOnly  → build all images locally (no push/deploy)
    # -StartOnly  → push + deploy from cached images (no rebuild)
    $successCount = 0
    $failCount = 0

    foreach ($svc in $services) {
        Write-Log "" "White"
        Write-Info "=== Processing: $($svc.Name) ===" "Cyan"
        Write-Log "----------------------------------------" "White"

        if ($BuildOnly) {
            if (-not (Build-Image $svc @("latest", $ts))) {
                $failCount++
                continue
            }
        }

        if ($StartOnly) {
            if (-not (Push-Image $svc @("latest", $ts))) {
                $failCount++
                continue
            }
            if (-not (Deploy-Service $svc)) {
                $failCount++
                continue
            }
            Start-Sleep -Seconds 5
            if ($Logs) { Show-Logs $svc }
            if (-not $SkipDeps) { Verify-Pods $svc }
        }

        $successCount++
    }

    Write-Log "" "White"
    Write-Log "==========================================" "Cyan"
    if ($BuildOnly) {
        Write-Log "Build complete: $successCount succeeded, $failCount failed" "Cyan"
    } else {
        Write-Log "Start complete: $successCount succeeded, $failCount failed" "Cyan"
    }
    Write-Log "Log file: $logFile" "White"
    Write-Log "==========================================" "Cyan"
}

if ($failCount -gt 0) { exit 1 }
exit 0



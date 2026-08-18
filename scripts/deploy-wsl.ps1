<#
.SYNOPSIS
  Delete -> Build (WSL) -> Push (WSL) -> Deploy (native kubectl) for VoidCloud images.

.DESCRIPTION
  Run from PowerShell in the repository root.
  Docker runs inside WSL2 (where the daemon lives); kubectl runs natively in Windows.

  For each selected component the script:
    1. Removes the existing local image in WSL (docker rmi -f)
    2. Builds the image in WSL from the repo root context
    3. Pushes it to Docker Hub from WSL
    4. Applies the Kubernetes manifests with native kubectl
    5. Restarts the deployment and waits for the rollout

.PARAMETER Only
  Comma-separated list of components to process (e.g. -Only frontend,auth).
  Default: all components.

.PARAMETER Tag
  Image tag. Default: latest

.PARAMETER SkipPush
  Build locally without pushing to Docker Hub.

.PARAMETER SkipDeploy
  Build (and push) only; do not touch Kubernetes.

.PARAMETER NoCache
  Pass --no-cache to docker build.

.PARAMETER List
  Print the available component names and exit.

.EXAMPLE
  .\scripts\deploy-wsl.ps1 -Only frontend

.EXAMPLE
  .\scripts\deploy-wsl.ps1 -Only auth,billing,vps -NoCache

.EXAMPLE
  .\scripts\deploy-wsl.ps1
  # everything: delete, build, push, deploy
#>

param(
    [string[]]$Only,
    [string]$Tag = "latest",
    [switch]$SkipPush,
    [switch]$SkipDeploy,
    [switch]$NoCache,
    [switch]$List,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) { Get-Help $MyInvocation.MyCommand.Path -Detailed; exit 0 }

# ---- Configuration ------------------------------------------------------
$DOCKER_USER = "amer30004ever"
$NAMESPACE   = "voidcloud"

# name = logical component | image = Docker Hub repo | dockerfile | k8s dir | deployment name
$Components = @(
    @{ name = "frontend";     image = "voidcloud-frontend";             dockerfile = "frontend/Dockerfile";             k8s = "kubernetes/frontend";     deploy = "frontend" }
    @{ name = "auth";         image = "voidcloud-auth-service";         dockerfile = "services/auth/Dockerfile";        k8s = "kubernetes/auth";         deploy = "auth-service" }
    @{ name = "user";         image = "voidcloud-user-service";         dockerfile = "services/user/Dockerfile";        k8s = "kubernetes/user";         deploy = "user-service" }
    @{ name = "tenant";       image = "voidcloud-tenant-service";       dockerfile = "services/tenant/Dockerfile";      k8s = "kubernetes/tenant";       deploy = "tenant-service" }
    @{ name = "vps";          image = "voidcloud-vps-service";          dockerfile = "services/vps/Dockerfile";         k8s = "kubernetes/vps";          deploy = "vps-service" }
    @{ name = "billing";      image = "voidcloud-billing-service";      dockerfile = "services/billing/Dockerfile";     k8s = "kubernetes/billing";      deploy = "billing-service" }
    @{ name = "crm";          image = "voidcloud-crm-service";          dockerfile = "services/crm/Dockerfile";         k8s = "kubernetes/crm";          deploy = "crm-service" }
    @{ name = "whatsapp";     image = "voidcloud-whatsapp-service";     dockerfile = "services/whatsapp/Dockerfile";    k8s = "kubernetes/whatsapp";     deploy = "whatsapp-service" }
    @{ name = "email";        image = "voidcloud-email-service";        dockerfile = "services/email/Dockerfile";       k8s = "kubernetes/email";        deploy = "email-service" }
    @{ name = "notification"; image = "voidcloud-notification-service"; dockerfile = "services/notification/Dockerfile";k8s = "kubernetes/notification"; deploy = "notification-service" }
    @{ name = "monitoring";   image = "voidcloud-monitoring-service";   dockerfile = "services/monitoring/Dockerfile";  k8s = "kubernetes/monitoring";   deploy = "monitoring-service" }
    @{ name = "audit";        image = "voidcloud-audit-service";        dockerfile = "services/audit/Dockerfile";       k8s = "kubernetes/audit";        deploy = "audit-service" }
    @{ name = "analytics";    image = "voidcloud-analytics-service";    dockerfile = "services/analytics/Dockerfile";   k8s = "kubernetes/analytics";    deploy = "analytics-service" }
    @{ name = "sub2api";      image = "voidcloud-sub2api-service";      dockerfile = "services/sub2api/Dockerfile";     k8s = "kubernetes/sub2api";      deploy = "sub2api-service" }
    @{ name = "agent";        image = "voidcloud-agent-service";        dockerfile = "services/agent/Dockerfile";       k8s = "kubernetes/agent";        deploy = "agent-service" }
)

if ($List) {
    Write-Host "Available components:" -ForegroundColor Cyan
    $Components | ForEach-Object { "  {0,-13} {1}/{2}" -f $_.name, $DOCKER_USER, $_.image } | Write-Host
    exit 0
}

# ---- Helpers ------------------------------------------------------------
function ConvertTo-WslPath {
    param([string]$Path)
    $Path  = $Path.TrimEnd('\')
    $drive = $Path.Substring(0, 2).ToLower() -replace ':', ''
    $rest  = $Path.Substring(2) -replace '\\', '/'
    return "/mnt/${drive}${rest}"
}

function Invoke-Wsl {
    param([string]$Command, [string]$WslCwd, [switch]$AllowFailure)
    Write-Host "  wsl> $Command" -ForegroundColor DarkGray
    wsl --cd $WslCwd bash -lc "$Command"
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) {
        throw "WSL command failed (exit $LASTEXITCODE): $Command"
    }
    return $LASTEXITCODE
}

function Invoke-Kubectl {
    param([string[]]$KubectlArgs, [switch]$AllowFailure)
    Write-Host "  kubectl $($KubectlArgs -join ' ')" -ForegroundColor DarkGray
    & kubectl @KubectlArgs
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) {
        throw "kubectl failed (exit $LASTEXITCODE): kubectl $($KubectlArgs -join ' ')"
    }
}

# ---- Resolve repo root / WSL path --------------------------------------
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot
$WslCwd = ConvertTo-WslPath -Path $RepoRoot

Write-Host "Repo root (Windows): $RepoRoot" -ForegroundColor Cyan
Write-Host "Repo root (WSL):     $WslCwd"   -ForegroundColor Cyan

# ---- Preflight ----------------------------------------------------------
Write-Host "[CHECK] WSL Docker daemon ..." -ForegroundColor Yellow
Invoke-Wsl -Command "docker info >/dev/null" -WslCwd $WslCwd
Write-Host "[CHECK] Docker is reachable in WSL." -ForegroundColor DarkGray

if (-not $SkipDeploy) {
    Write-Host "[CHECK] kubectl context ..." -ForegroundColor Yellow
    Invoke-Kubectl -KubectlArgs @("config", "current-context")
}

# ---- Select components --------------------------------------------------
$selected = if ($Only -and $Only.Count -gt 0) {
    $wanted = $Only | ForEach-Object { $_.Split(',') } | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $unknown = $wanted | Where-Object { $n = $_; -not ($Components | Where-Object { $_.name -eq $n }) }
    if ($unknown) { throw "Unknown component(s): $($unknown -join ', '). Use -List to see valid names." }
    $Components | Where-Object { $wanted -contains $_.name }
} else { $Components }

Write-Host ""
Write-Host "Components: $((($selected | ForEach-Object { $_.name }) -join ', '))" -ForegroundColor Cyan
Write-Host "Tag:        $Tag" -ForegroundColor Cyan
Write-Host ""

$results = @()

foreach ($c in $selected) {
    $fullImage = "$DOCKER_USER/$($c.image):$Tag"
    Write-Host "==== $($c.name) -> $fullImage ====" -ForegroundColor Magenta

    try {
        # 1. Delete existing local image in WSL (ignore "no such image")
        Write-Host "[1/5] Removing local image in WSL ..." -ForegroundColor Yellow
        Invoke-Wsl -Command "docker rmi -f $fullImage 2>/dev/null || true" -WslCwd $WslCwd -AllowFailure | Out-Null

        # 2. Build in WSL from the repo root context
        Write-Host "[2/5] Building in WSL ..." -ForegroundColor Yellow
        $cacheFlag = if ($NoCache) { " --no-cache" } else { "" }
        Invoke-Wsl -Command "DOCKER_BUILDKIT=1 docker build$cacheFlag -f $($c.dockerfile) -t $fullImage ." -WslCwd $WslCwd

        # 3. Push from WSL
        if ($SkipPush) {
            Write-Host "[3/5] Push skipped (-SkipPush)." -ForegroundColor DarkGray
        } else {
            Write-Host "[3/5] Pushing to Docker Hub ..." -ForegroundColor Yellow
            Invoke-Wsl -Command "docker push $fullImage" -WslCwd $WslCwd
        }

        # 4/5. Deploy with native kubectl
        if ($SkipDeploy) {
            Write-Host "[4/5] Deploy skipped (-SkipDeploy)." -ForegroundColor DarkGray
        } else {
            Write-Host "[4/5] Applying manifests ..." -ForegroundColor Yellow
            Invoke-Kubectl -KubectlArgs @("apply", "-f", "kubernetes/namespace.yaml")
            if (Test-Path $c.k8s) {
                Invoke-Kubectl -KubectlArgs @("apply", "-f", $c.k8s)
            } else {
                Write-Host "  (no manifest dir $($c.k8s) — skipped)" -ForegroundColor DarkGray
            }

            Write-Host "[5/5] Restarting deployment/$($c.deploy) ..." -ForegroundColor Yellow
            Invoke-Kubectl -KubectlArgs @("rollout", "restart", "deployment/$($c.deploy)", "-n", $NAMESPACE)
            Invoke-Kubectl -KubectlArgs @("rollout", "status", "deployment/$($c.deploy)", "-n", $NAMESPACE, "--timeout=300s")
        }

        Write-Host "OK: $($c.name)" -ForegroundColor Green
        $results += [pscustomobject]@{ Component = $c.name; Image = $fullImage; Status = "OK" }
    }
    catch {
        Write-Host "FAILED: $($c.name) — $($_.Exception.Message)" -ForegroundColor Red
        $results += [pscustomobject]@{ Component = $c.name; Image = $fullImage; Status = "FAILED" }
        if ($selected.Count -eq 1) { throw }
    }

    Write-Host ""
}

# ---- Summary ------------------------------------------------------------
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host

if (-not $SkipDeploy) {
    Write-Host "Pods:" -ForegroundColor Cyan
    Invoke-Kubectl -KubectlArgs @("get", "pods", "-n", $NAMESPACE) -AllowFailure
}

if ($results | Where-Object { $_.Status -eq "FAILED" }) {
    Write-Host "One or more components failed." -ForegroundColor Red
    exit 1
}

Write-Host "Done." -ForegroundColor Green

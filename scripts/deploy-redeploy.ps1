# VoidCloud — build, push, and redeploy all microservices
# Usage: .\scripts\deploy-redeploy.ps1
# Requires: docker logged in to Docker Hub (amer30004ever), kubectl configured

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $root "deploy-$ts.log"
"=== START $(Get-Date -Format o) ===" | Out-File $log

$services = @(
  "auth", "user", "tenant", "vps", "billing", "crm", "whatsapp",
  "email", "notification", "monitoring", "audit", "analytics", "sub2api", "agent"
)

foreach ($svc in $services) {
  $img = "amer30004ever/voidcloud-$svc-service"
  "[$svc] build..." | Tee-Object -FilePath $log -Append
  docker build --no-cache --platform linux/amd64 `
    -f "services/$svc/Dockerfile" `
    -t "${img}:latest" `
    -t "${img}:$ts" `
    . 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    "[$svc] BUILD FAILED exit=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
    continue
  }
  "[$svc] push..." | Tee-Object -FilePath $log -Append
  docker push "${img}:latest" 2>&1 | Tee-Object -FilePath $log -Append
  docker push "${img}:$ts" 2>&1 | Tee-Object -FilePath $log -Append
  "[$svc] OK" | Tee-Object -FilePath $log -Append
}

"frontend build..." | Tee-Object -FilePath $log -Append
docker build --no-cache --platform linux/amd64 `
  --build-arg NEXT_PUBLIC_API_URL=https://api.voidcloud.cc.cd/api/v1 `
  -f frontend/Dockerfile `
  -t "amer30004ever/voidcloud-frontend:latest" `
  -t "amer30004ever/voidcloud-frontend:$ts" `
  . 2>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -eq 0) {
  docker push "amer30004ever/voidcloud-frontend:latest" 2>&1 | Tee-Object -FilePath $log -Append
  docker push "amer30004ever/voidcloud-frontend:$ts" 2>&1 | Tee-Object -FilePath $log -Append
}

"=== BUILD/PUSH DONE ===" | Tee-Object -FilePath $log -Append

# --- Kubernetes redeploy ---
$ns = "voidcloud"
$keep = @("postgres", "redis", "rabbitmq", "openwa")

"Deleting app deployments..." | Tee-Object -FilePath $log -Append
$deploys = kubectl get deploy -n $ns -o name 2>&1
foreach ($d in $deploys) {
  $name = ($d -replace "deployment.apps/", "")
  if ($keep -contains $name) { continue }
  kubectl delete $d -n $ns --wait=true 2>&1 | Tee-Object -FilePath $log -Append
}

"Applying manifests..." | Tee-Object -FilePath $log -Append
$manifestDirs = @(
  "kubernetes/auth", "kubernetes/user", "kubernetes/tenant", "kubernetes/vps",
  "kubernetes/billing", "kubernetes/crm", "kubernetes/whatsapp", "kubernetes/email",
  "kubernetes/notification", "kubernetes/monitoring", "kubernetes/audit",
  "kubernetes/analytics", "kubernetes/sub2api", "kubernetes/agent", "kubernetes/frontend"
)
foreach ($dir in $manifestDirs) {
  if (Test-Path $dir) {
    kubectl apply -f $dir -n $ns 2>&1 | Tee-Object -FilePath $log -Append
  }
}
kubectl apply -f kubernetes/ingress.yaml -n $ns 2>&1 | Tee-Object -FilePath $log -Append

"Running migrations..." | Tee-Object -FilePath $log -Append
kubectl delete job voidcloud-db-migrate voidcloud-db-seed -n $ns --ignore-not-found 2>&1 | Tee-Object -FilePath $log -Append
kubectl apply -f kubernetes/migrate-job.yaml -n $ns 2>&1 | Tee-Object -FilePath $log -Append
kubectl wait --for=condition=complete job/voidcloud-db-migrate -n $ns --timeout=300s 2>&1 | Tee-Object -FilePath $log -Append

"Waiting for pods..." | Tee-Object -FilePath $log -Append
Start-Sleep -Seconds 30
kubectl get pods -n $ns 2>&1 | Tee-Object -FilePath $log -Append

"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $log -Append
Write-Host "Complete. Log: $log"

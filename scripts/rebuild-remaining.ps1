$ErrorActionPreference = "Continue"
$env:DOCKER_HOST = "ssh://docker@10.51.100.70"
$root = "E:\Master_Mind\Amer_Brain\Repossitories\GitHub\Amer30004ever\Amer-Devops-Portal"
Set-Location $root

$log = Join-Path $root "rebuild-remaining.log"
"=== START $(Get-Date -Format o) ===" | Out-File $log

$services = @("billing","auth","email","monitoring","notification","vps","sub2api","frontend")
foreach ($svc in $services) {
  $img = "amer30004ever/voidcloud-$svc-service"
  "[$svc] build..." | Tee-Object -FilePath $log -Append
  docker build -f "services/$svc/Dockerfile" -t "${img}:latest" . 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    "[$svc] BUILD FAILED exit=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
    continue
  }
  "[$svc] push..." | Tee-Object -FilePath $log -Append
  docker push "${img}:latest" 2>&1 | Tee-Object -FilePath $log -Append
  "[$svc] OK" | Tee-Object -FilePath $log -Append
}

"=== DONE $(Get-Date -Format o) ===" | Tee-Object -FilePath $log -Append

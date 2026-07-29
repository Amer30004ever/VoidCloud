$ErrorActionPreference = "Continue"
$env:DOCKER_HOST = "ssh://docker@10.51.100.70"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $root "rebuild-$ts.log"
"=== START $(Get-Date -Format o) ===" | Out-File $log

$services = @("agent","analytics","audit","auth","billing","crm","whatsapp","email","notification","monitoring","sub2api","tenant","user","vps")

foreach ($svc in $services) {
  $img = "amer30004ever/voidcloud-$svc-service"
  "[$svc] build..." | Tee-Object -FilePath $log -Append
  docker build -f "services/$svc/Dockerfile" -t "${img}:latest" -t "${img}:$ts" . 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    "[$svc] BUILD FAILED exit=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
    continue
  }
  "[$svc] push latest..." | Tee-Object -FilePath $log -Append
  docker push "${img}:latest" 2>&1 | Tee-Object -FilePath $log -Append
  "[$svc] push $ts..." | Tee-Object -FilePath $log -Append
  docker push "${img}:$ts" 2>&1 | Tee-Object -FilePath $log -Append
  "[$svc] OK" | Tee-Object -FilePath $log -Append
}

"frontend build..." | Tee-Object -FilePath $log -Append
docker build -f frontend/Dockerfile -t "amer30004ever/voidcloud-frontend:latest" -t "amer30004ever/voidcloud-frontend:$ts" --build-arg NEXT_PUBLIC_API_URL=https://api.voidcloud.cc.cd/api/v1 . 2>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -eq 0) {
  docker push "amer30004ever/voidcloud-frontend:latest" 2>&1 | Tee-Object -FilePath $log -Append
  docker push "amer30004ever/voidcloud-frontend:$ts" 2>&1 | Tee-Object -FilePath $log -Append
}

"=== BUILD/PUSH DONE ===" | Tee-Object -FilePath $log -Append
Write-Host "Complete. Log: $log"

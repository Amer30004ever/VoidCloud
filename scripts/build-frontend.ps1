$ErrorActionPreference = "Continue"
$env:DOCKER_HOST = "ssh://docker@10.51.100.70"
$root = "E:\Master_Mind\Amer_Brain\Repossitories\GitHub\Amer30004ever\Amer-Devops-Portal"
Set-Location $root

$log = Join-Path $root "frontend-build.log"
"=== START $(Get-Date -Format o) ===" | Out-File $log

docker build -f "frontend/Dockerfile" -t "amer30004ever/voidcloud-frontend:latest" . 2>&1 | Tee-Object -FilePath $log -Append

"=== BUILD DONE ===" | Tee-Object -FilePath $log -Append

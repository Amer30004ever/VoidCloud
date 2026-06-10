#!/usr/bin/env pwsh
# Docker-Login.ps1 - Login to Docker Hub

$envFile = "dockerhub.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
} elseif (Test-Path "../dockerhub.env") {
    Get-Content "../dockerhub.env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
} else {
    Write-Host "❌ Error: dockerhub.env not found!" -ForegroundColor Red
    Write-Host "Please create dockerhub.env from .env.example" -ForegroundColor Yellow
    exit 1
}

if (-not $env:DOCKER_HUB_USERNAME -or -not $env:DOCKER_HUB_TOKEN) {
    Write-Host "❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set in dockerhub.env" -ForegroundColor Red
    exit 1
}

Write-Host "🔐 Logging into Docker Hub as: $($env:DOCKER_HUB_USERNAME)" -ForegroundColor Blue

$token = $env:DOCKER_HUB_TOKEN
$token | docker login -u $env:DOCKER_HUB_USERNAME --password-stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully logged into Docker Hub" -ForegroundColor Green
} else {
    Write-Host "❌ Login failed! Please check your credentials." -ForegroundColor Red
    exit 1
}
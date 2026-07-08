# VoidCloud Deployment Script
# Interactive menu for building, pushing, and deploying Docker images

# Check execution policy
$currentPolicy = Get-ExecutionPolicy
if ($currentPolicy -eq "Restricted") {
    Write-ColorOutput Red "=========================================="
    Write-ColorOutput Red "  Execution Policy is Restricted"
    Write-ColorOutput Red "=========================================="
    Write-Output ""
    Write-Output "PowerShell execution policy is set to 'Restricted'."
    Write-Output ""
    Write-ColorOutput Cyan "Would you like to enable script execution for this session only? (y/n)"
    $enableChoice = Read-Host
    
    if ($enableChoice -eq "y" -or $enableChoice -eq "Y") {
        try {
            Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
            Write-ColorOutput Green "✓ Execution policy set to Bypass for current session"
            Write-Output ""
        } catch {
            Write-ColorOutput Red "✗ Failed to set execution policy"
            Write-Output ""
            Write-Output "To run this script manually, use one of the following methods:"
            Write-Output ""
            Write-ColorOutput Cyan "Method 1: Run with bypass flag (recommended)"
            Write-Output "  PowerShell -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`""
            Write-Output ""
            Write-ColorOutput Cyan "Method 2: Set execution policy for current user"
            Write-Output "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
            Write-Output "  Then run: .\scripts\deploy.ps1"
            Write-Output ""
            exit 1
        }
    } else {
        Write-Output ""
        Write-Output "To run this script manually, use one of the following methods:"
        Write-Output ""
        Write-ColorOutput Cyan "Method 1: Run with bypass flag (recommended)"
        Write-Output "  PowerShell -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`""
        Write-Output ""
        Write-ColorOutput Cyan "Method 2: Set execution policy for current user"
        Write-Output "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
        Write-Output "  Then run: .\scripts\deploy.ps1"
        Write-Output ""
        exit 1
    }
}

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptPath

# Service definitions
$services = @{
    "1" = @{ Name = "frontend"; Dockerfile = "frontend/Dockerfile"; ImageName = "voidcloud/frontend"; K8sDeployment = "frontend" }
    "2" = @{ Name = "auth"; Dockerfile = "services/auth/Dockerfile"; ImageName = "voidcloud/auth-service"; K8sDeployment = "auth" }
    "3" = @{ Name = "user"; Dockerfile = "services/user/Dockerfile"; ImageName = "voidcloud/user-service"; K8sDeployment = "user" }
    "4" = @{ Name = "tenant"; Dockerfile = "services/tenant/Dockerfile"; ImageName = "voidcloud/tenant-service"; K8sDeployment = "tenant" }
    "5" = @{ Name = "vps"; Dockerfile = "services/vps/Dockerfile"; ImageName = "voidcloud/vps-service"; K8sDeployment = "vps" }
    "6" = @{ Name = "billing"; Dockerfile = "services/billing/Dockerfile"; ImageName = "voidcloud/billing-service"; K8sDeployment = "billing" }
    "7" = @{ Name = "crm"; Dockerfile = "services/crm/Dockerfile"; ImageName = "voidcloud/crm-service"; K8sDeployment = "crm" }
    "8" = @{ Name = "whatsapp"; Dockerfile = "services/whatsapp/Dockerfile"; ImageName = "voidcloud/whatsapp-service"; K8sDeployment = "whatsapp" }
    "9" = @{ Name = "email"; Dockerfile = "services/email/Dockerfile"; ImageName = "voidcloud/email-service"; K8sDeployment = "email" }
    "10" = @{ Name = "notification"; Dockerfile = "services/notification/Dockerfile"; ImageName = "voidcloud/notification-service"; K8sDeployment = "notification" }
    "11" = @{ Name = "monitoring"; Dockerfile = "services/monitoring/Dockerfile"; ImageName = "voidcloud/monitoring-service"; K8sDeployment = "monitoring" }
    "12" = @{ Name = "audit"; Dockerfile = "services/audit/Dockerfile"; ImageName = "voidcloud/audit-service"; K8sDeployment = "audit" }
    "13" = @{ Name = "analytics"; Dockerfile = "services/analytics/Dockerfile"; ImageName = "voidcloud/analytics-service"; K8sDeployment = "analytics" }
}

$backendServices = @("2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13")

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Menu {
    Clear-Host
    Write-ColorOutput Green "=========================================="
    Write-ColorOutput Green "   VoidCloud Deployment Script"
    Write-ColorOutput Green "=========================================="
    Write-Output ""
    Write-ColorOutput Cyan "Select deployment option:"
    Write-Output "  1. Frontend only"
    Write-Output "  2. Specific backend service"
    Write-Output "  3. Multiple backend services"
    Write-Output "  4. All backend services"
    Write-Output "  5. Frontend + All backend services"
    Write-Output "  0. Exit"
    Write-Output ""
}

function Show-BackendServices {
    Write-ColorOutput Cyan "Available backend services:"
    foreach ($key in $backendServices) {
        $service = $services[$key]
        Write-Output "  $key. $($service.Name)"
    }
    Write-Output ""
}

function Show-AllServices {
    Write-ColorOutput Cyan "Available services:"
    foreach ($key in ($services.Keys | Sort-Object { [int]$_ })) {
        $service = $services[$key]
        Write-Output "  $key. $($service.Name)"
    }
    Write-Output ""
}

function Build-Service($serviceKey) {
    $service = $services[$serviceKey]
    Write-ColorOutput Yellow "Building $($service.Name)..."
    
    $buildCmd = "docker build -f $($service.Dockerfile) -t $($service.ImageName):latest $repoRoot"
    Write-Output "Running: $buildCmd"
    
    $result = Invoke-Expression $buildCmd
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Build successful for $($service.Name)"
        return $true
    } else {
        Write-ColorOutput Red "✗ Build failed for $($service.Name)"
        return $false
    }
}

function Push-Service($serviceKey) {
    $service = $services[$serviceKey]
    Write-ColorOutput Yellow "Pushing $($service.Name)..."
    
    # Tag with Docker Hub username
    $dockerHubImage = "amer30004ever/$($service.ImageName):latest"
    $tagCmd = "docker tag $($service.ImageName):latest $dockerHubImage"
    Write-Output "Running: $tagCmd"
    Invoke-Expression $tagCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "✗ Tag failed for $($service.Name)"
        return $false
    }
    
    $pushCmd = "docker push $dockerHubImage"
    Write-Output "Running: $pushCmd"
    $result = Invoke-Expression $pushCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Push successful for $($service.Name)"
        return $true
    } else {
        Write-ColorOutput Red "✗ Push failed for $($service.Name)"
        return $false
    }
}

function Rollout-Service($serviceKey) {
    $service = $services[$serviceKey]
    Write-ColorOutput Yellow "Rolling out $($service.Name)..."
    
    $rolloutCmd = "kubectl rollout restart deployment $($service.K8sDeployment) -n voidcloud"
    Write-Output "Running: $rolloutCmd"
    $result = Invoke-Expression $rolloutCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Rollout successful for $($service.Name)"
        return $true
    } else {
        Write-ColorOutput Red "✗ Rollout failed for $($service.Name)"
        return $false
    }
}

function Deploy-Service($serviceKey) {
    Write-ColorOutput Cyan "----------------------------------------"
    Write-ColorOutput Cyan "Deploying service: $($services[$serviceKey].Name)"
    Write-ColorOutput Cyan "----------------------------------------"
    
    $buildSuccess = Build-Service $serviceKey
    if (-not $buildSuccess) {
        Write-ColorOutput Red "Deployment aborted due to build failure"
        return $false
    }
    
    $pushSuccess = Push-Service $serviceKey
    if (-not $pushSuccess) {
        Write-ColorOutput Red "Deployment aborted due to push failure"
        return $false
    }
    
    $rolloutSuccess = Rollout-Service $serviceKey
    if (-not $rolloutSuccess) {
        Write-ColorOutput Red "Deployment completed but rollout failed"
        return $false
    }
    
    Write-ColorOutput Green "✓ Deployment completed successfully for $($services[$serviceKey].Name)"
    return $true
}

function Get-MultipleChoices($availableKeys) {
    $choices = @()
    while ($true) {
        Write-Output "Enter service number (or 'done' to finish):"
        $input = Read-Host
        
        if ($input -eq "done") {
            break
        }
        
        if ($availableKeys -contains $input -and $choices -notcontains $input) {
            $choices += $input
            Write-ColorOutput Green "Added: $($services[$input].Name)"
        } elseif ($choices -contains $input) {
            Write-ColorOutput Yellow "Already selected: $($services[$input].Name)"
        } else {
            Write-ColorOutput Red "Invalid selection"
        }
    }
    return $choices
}

# Main script
while ($true) {
    Show-Menu
    $choice = Read-Host "Enter your choice"
    
    switch ($choice) {
        "1" {
            # Frontend only
            Write-Output ""
            Deploy-Service "1"
            Write-Output ""
            Read-Host "Press Enter to continue"
        }
        "2" {
            # Specific backend service
            Write-Output ""
            Show-BackendServices
            $backendChoice = Read-Host "Enter backend service number"
            if ($backendServices -contains $backendChoice) {
                Deploy-Service $backendChoice
            } else {
                Write-ColorOutput Red "Invalid selection"
            }
            Write-Output ""
            Read-Host "Press Enter to continue"
        }
        "3" {
            # Multiple backend services
            Write-Output ""
            Show-BackendServices
            Write-Output "Select multiple services (enter numbers one by one, type 'done' when finished)"
            $selected = Get-MultipleChoices $backendServices
            
            if ($selected.Count -gt 0) {
                Write-Output ""
                Write-ColorOutput Cyan "Selected services: $($selected | ForEach-Object { $services[$_].Name }) -join ', '"
                $confirm = Read-Host "Proceed? (y/n)"
                if ($confirm -eq "y" -or $confirm -eq "Y") {
                    $successCount = 0
                    foreach ($key in $selected) {
                        if (Deploy-Service $key) {
                            $successCount++
                        }
                        Write-Output ""
                    }
                    Write-ColorOutput Cyan "Deployed $successCount/$($selected.Count) services successfully"
                }
            } else {
                Write-ColorOutput Yellow "No services selected"
            }
            Write-Output ""
            Read-Host "Press Enter to continue"
        }
        "4" {
            # All backend services
            Write-Output ""
            Show-BackendServices
            $confirm = Read-Host "Deploy all backend services? (y/n)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                $successCount = 0
                foreach ($key in $backendServices) {
                    if (Deploy-Service $key) {
                        $successCount++
                    }
                    Write-Output ""
                }
                Write-ColorOutput Cyan "Deployed $successCount/$($backendServices.Count) backend services successfully"
            }
            Write-Output ""
            Read-Host "Press Enter to continue"
        }
        "5" {
            # Frontend + All backend services
            Write-Output ""
            Show-AllServices
            $confirm = Read-Host "Deploy all services (frontend + all backend)? (y/n)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                $successCount = 0
                $totalCount = $services.Count
                foreach ($key in ($services.Keys | Sort-Object { [int]$_ })) {
                    if (Deploy-Service $key) {
                        $successCount++
                    }
                    Write-Output ""
                }
                Write-ColorOutput Cyan "Deployed $successCount/$totalCount services successfully"
            }
            Write-Output ""
            Read-Host "Press Enter to continue"
        }
        "0" {
            Write-ColorOutput Green "Exiting..."
            exit
        }
        default {
            Write-ColorOutput Red "Invalid choice. Please try again."
            Start-Sleep -Seconds 1
        }
    }
}

#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Cloudflare Tunnel - Smart Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Configuration
$namespace = "amer-portal"
$defaultDomain = "amer-portal.cc.cd"
$defaultApiDomain = "api.amer-portal.cc.cd"

# Function to check if cloudflared is installed
function Test-CloudflaredInstalled {
    try {
        $result = cloudflared --version 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# Function to list existing tunnels
function Get-ExistingTunnels {
    Write-Host "Fetching existing tunnels..." -ForegroundColor Gray
    $tunnelList = cloudflared tunnel list 2>&1
    $tunnels = @()
    
    $tunnelList | ForEach-Object {
        if ($_ -match "([a-f0-9-]+)\s+([^\s]+)\s+") {
            $tunnels += [PSCustomObject]@{
                ID = $matches[1]
                Name = $matches[2]
            }
        }
    }
    
    return $tunnels
}

# Function to get DNS routes for a tunnel
function Get-TunnelDNSRoutes {
    param($tunnelName)
    
    $routes = cloudflared tunnel route dns list $tunnelName 2>&1
    $dnsRoutes = @()
    
    $routes | ForEach-Object {
        if ($_ -match "([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})") {
            $dnsRoutes += $matches[1]
        }
    }
    
    return $dnsRoutes
}

# Function to check if DNS route exists
function Test-DNSRouteExists {
    param($tunnelName, $domain)
    
    $existingRoutes = Get-TunnelDNSRoutes -tunnelName $tunnelName
    return $domain -in $existingRoutes
}

# Function to add DNS route
function Add-DNSRoute {
    param($tunnelName, $domain)
    
    Write-Host "Adding DNS route for $domain..." -ForegroundColor Yellow
    $result = cloudflared tunnel route dns $tunnelName $domain 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DNS route created for $domain" -ForegroundColor Green
        return $true
    }
    elseif ($result -match "already exists") {
        Write-Host "DNS route for $domain already exists" -ForegroundColor Yellow
        return $true
    }
    else {
        Write-Host "Failed to create DNS route: $result" -ForegroundColor Red
        return $false
    }
}

# Function to get tunnel credentials
function Get-TunnelCredentials {
    param($tunnelId)
    
    $credsPath = "$env:USERPROFILE\.cloudflared\$tunnelId.json"
    if (Test-Path $credsPath) {
        return Get-Content $credsPath -Raw | ConvertFrom-Json
    }
    return $null
}

# Step 1: Check cloudflared installation
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow
if (-not (Test-CloudflaredInstalled)) {
    Write-Host "cloudflared is not installed. Please install it first:" -ForegroundColor Red
    exit 1
}
Write-Host "cloudflared is installed" -ForegroundColor Green
Write-Host ""

# Step 2: Check and handle certificate
Write-Host "Step 2: Checking Cloudflare authentication..." -ForegroundColor Yellow
$certPath = "$env:USERPROFILE\.cloudflared\cert.pem"
if (-not (Test-Path $certPath)) {
    Write-Host "No Cloudflare certificate found. Starting login process..." -ForegroundColor Yellow
    Start-Process -FilePath "cloudflared" -ArgumentList "tunnel login" -NoNewWindow -Wait
    Write-Host "Login completed" -ForegroundColor Green
}
else {
    Write-Host "Cloudflare certificate found" -ForegroundColor Green
}
Write-Host ""

# Step 3: Handle tunnel selection/creation
Write-Host "Step 3: Tunnel setup..." -ForegroundColor Yellow
$existingTunnels = Get-ExistingTunnels
$tunnelName = $null
$tunnelId = $null
$useExistingTunnel = $false

if ($existingTunnels.Count -gt 0) {
    Write-Host "Found existing tunnels:" -ForegroundColor Cyan
    Write-Host ""
    for ($i = 0; $i -lt $existingTunnels.Count; $i++) {
        Write-Host "  [$($i+1)] $($existingTunnels[$i].Name) (ID: $($existingTunnels[$i].ID))" -ForegroundColor White
    }
    Write-Host "  [$($existingTunnels.Count+1)] Create a new tunnel" -ForegroundColor Green
    Write-Host "  [$($existingTunnels.Count+2)] Exit without changes" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Select an option (1-$($existingTunnels.Count+2))"
    $choiceNum = [int]$choice
    
    if ($choiceNum -le $existingTunnels.Count) {
        $selectedTunnel = $existingTunnels[$choiceNum - 1]
        $tunnelName = $selectedTunnel.Name
        $tunnelId = $selectedTunnel.ID
        $useExistingTunnel = $true
        Write-Host "Using existing tunnel: $tunnelName" -ForegroundColor Green
    }
    elseif ($choiceNum -eq ($existingTunnels.Count + 1)) {
        $useExistingTunnel = $false
    }
    else {
        Write-Host "Exiting setup." -ForegroundColor Red
        exit 0
    }
}
else {
    Write-Host "No existing tunnels found." -ForegroundColor Yellow
    $useExistingTunnel = $false
}

# Create new tunnel if needed
if (-not $useExistingTunnel) {
    $defaultTunnelName = "cluster"
    Write-Host ""
    $newTunnelName = Read-Host "Enter tunnel name (default: $defaultTunnelName)"
    if ([string]::IsNullOrWhiteSpace($newTunnelName)) {
        $newTunnelName = $defaultTunnelName
    }
    
    $existingTunnel = $existingTunnels | Where-Object { $_.Name -eq $newTunnelName }
    if ($existingTunnel) {
        Write-Host "Tunnel '$newTunnelName' already exists!" -ForegroundColor Yellow
        $overwrite = Read-Host "Do you want to delete it and create a new one? (y/n)"
        if ($overwrite -eq 'y') {
            Write-Host "Deleting existing tunnel..." -ForegroundColor Yellow
            cloudflared tunnel delete $newTunnelName -f
        }
        else {
            Write-Host "Using existing tunnel..." -ForegroundColor Green
            $tunnelName = $newTunnelName
            $tunnelId = $existingTunnel.ID
            $useExistingTunnel = $true
        }
    }
    
    if (-not $useExistingTunnel) {
        Write-Host "Creating new tunnel '$newTunnelName'..." -ForegroundColor Yellow
        $createOutput = cloudflared tunnel create $newTunnelName 2>&1
        Write-Host $createOutput
        
        if ($createOutput -match "Created tunnel (?:.+?) with id ([a-f0-9-]+)") {
            $tunnelId = $matches[1]
        }
        elseif ($createOutput -match "id[:\s]+([a-f0-9-]+)") {
            $tunnelId = $matches[1]
        }
        
        if ($tunnelId) {
            $tunnelName = $newTunnelName
            Write-Host "Tunnel created with ID: $tunnelId" -ForegroundColor Green
        }
        else {
            Write-Host "Failed to create tunnel." -ForegroundColor Red
            exit 1
        }
    }
}

# Step 4: Load credentials
Write-Host ""
Write-Host "Step 4: Loading tunnel credentials..." -ForegroundColor Yellow
$creds = Get-TunnelCredentials -tunnelId $tunnelId

if (-not $creds) {
    Write-Host "Could not load credentials for tunnel '$tunnelName'." -ForegroundColor Red
    exit 1
}
Write-Host "Credentials loaded successfully" -ForegroundColor Green

# Step 5: Configure DNS routes
Write-Host ""
Write-Host "Step 5: DNS route configuration..." -ForegroundColor Yellow
Write-Host "Current DNS routes for tunnel '$tunnelName':" -ForegroundColor Cyan
$existingRoutes = Get-TunnelDNSRoutes -tunnelName $tunnelName

if ($existingRoutes.Count -gt 0) {
    $existingRoutes | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
}
else {
    Write-Host "  - No DNS routes configured" -ForegroundColor Gray
}
Write-Host ""

$domain = Read-Host "Enter main domain (default: $defaultDomain)"
if ([string]::IsNullOrWhiteSpace($domain)) {
    $domain = $defaultDomain
}

$apiDomain = Read-Host "Enter API domain (default: $defaultApiDomain)"
if ([string]::IsNullOrWhiteSpace($apiDomain)) {
    $apiDomain = $defaultApiDomain
}

Write-Host ""
Write-Host "Configuring DNS routes..." -ForegroundColor Yellow

$mainRouteExists = Test-DNSRouteExists -tunnelName $tunnelName -domain $domain
if (-not $mainRouteExists) {
    Write-Host "DNS route for $domain does not exist." -ForegroundColor Yellow
    $addMainRoute = Read-Host "Do you want to add it? (y/n)"
    if ($addMainRoute -eq 'y') {
        Add-DNSRoute -tunnelName $tunnelName -domain $domain
        Start-Sleep -Seconds 2
    }
}
else {
    Write-Host "DNS route for $domain already exists" -ForegroundColor Green
}

$apiRouteExists = Test-DNSRouteExists -tunnelName $tunnelName -domain $apiDomain
if (-not $apiRouteExists) {
    Write-Host "DNS route for $apiDomain does not exist." -ForegroundColor Yellow
    $addApiRoute = Read-Host "Do you want to add it? (y/n)"
    if ($addApiRoute -eq 'y') {
        Add-DNSRoute -tunnelName $tunnelName -domain $apiDomain
        Start-Sleep -Seconds 2
    }
}
else {
    Write-Host "DNS route for $apiDomain already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Tunnel Configuration Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Tunnel Name: $tunnelName" -ForegroundColor Yellow
Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Yellow
Write-Host "AccountTag: $($creds.AccountTag)" -ForegroundColor Yellow
Write-Host ""

# Step 6: Create Kubernetes YAML (WORKING VERSION)
Write-Host "Step 6: Creating Kubernetes YAML..." -ForegroundColor Yellow

$yamlContent = @"
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-tunnel-secret
  namespace: $namespace
type: Opaque
stringData:
  credentials.json: |
    {
      "AccountTag": "$($creds.AccountTag)",
      "TunnelID": "$tunnelId",
      "TunnelSecret": "$($creds.TunnelSecret)"
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudflare-tunnel-config
  namespace: $namespace
data:
  config.yaml: |
    tunnel: $tunnelId
    credentials-file: /etc/cloudflared/credentials.json
    metrics: 0.0.0.0:2000
    ingress:
      - hostname: $domain
        service: http://frontend.$namespace.svc.cluster.local:3000
      - hostname: $apiDomain
        service: http://backend.$namespace.svc.cluster.local:3001
      - service: http_status:404
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflare-tunnel
  namespace: $namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflare-tunnel
  template:
    metadata:
      labels:
        app: cloudflare-tunnel
    spec:
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          args:
            - tunnel
            - --config
            - /etc/cloudflared/config.yaml
            - run
          ports:
            - containerPort: 2000
              name: metrics
          volumeMounts:
            - name: config
              mountPath: /etc/cloudflared/config.yaml
              subPath: config.yaml
            - name: secret
              mountPath: /etc/cloudflared/credentials.json
              subPath: credentials.json
          livenessProbe:
            httpGet:
              path: /ready
              port: 2000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 2000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
      volumes:
        - name: config
          configMap:
            name: cloudflare-tunnel-config
        - name: secret
          secret:
            secretName: cloudflare-tunnel-secret
"@

$yamlFile = "cloudflare-tunnel-config.yaml"
$yamlContent | Out-File -FilePath $yamlFile -Encoding utf8
Write-Host "Created $yamlFile with working configuration!" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy to Kubernetes
Write-Host "Step 7: Deploying to Kubernetes..." -ForegroundColor Yellow
$deployToK8s = Read-Host "Do you want to deploy this configuration to Kubernetes? (y/n)"

if ($deployToK8s -eq 'y') {
    Write-Host "Cleaning up existing resources..." -ForegroundColor Gray
    kubectl delete deployment cloudflare-tunnel -n $namespace --ignore-not-found 2>&1 | Out-Null
    kubectl delete secret cloudflare-tunnel-secret -n $namespace --ignore-not-found 2>&1 | Out-Null
    kubectl delete configmap cloudflare-tunnel-config -n $namespace --ignore-not-found 2>&1 | Out-Null
    
    Write-Host "Applying new configuration..." -ForegroundColor Gray
    kubectl apply -f $yamlFile
    
    Write-Host "Waiting for tunnel pod to be ready..." -ForegroundColor Yellow
    kubectl wait --for=condition=ready pod -l app=cloudflare-tunnel -n $namespace --timeout=120s 2>&1
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Tunnel Status:" -ForegroundColor Yellow
    kubectl get pods -n $namespace -l app=cloudflare-tunnel
    Write-Host ""
    
    Write-Host "Tunnel Logs (last 10 lines):" -ForegroundColor Yellow
    kubectl logs -n $namespace -l app=cloudflare-tunnel --tail=10
}
else {
    Write-Host "Skipping Kubernetes deployment. YAML file saved as: $yamlFile" -ForegroundColor Yellow
    Write-Host "You can deploy later with: kubectl apply -f $yamlFile" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs (once DNS propagates):" -ForegroundColor Yellow
Write-Host "   https://$domain" -ForegroundColor Green
Write-Host "   https://$apiDomain/api/v1/health" -ForegroundColor Green
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "   kubectl -n $namespace logs -l app=cloudflare-tunnel -f" -ForegroundColor White
Write-Host "   kubectl -n $namespace port-forward pod/cloudflare-tunnel-xxxxx 2000:2000" -ForegroundColor White
Write-Host "   cloudflared tunnel route dns list $tunnelName" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: DNS may take 1-2 minutes to propagate." -ForegroundColor Cyan
Write-Host ""
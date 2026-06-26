# 📚 Complete Documentation: Cloudflare Tunnel Setup on Linux for Kubernetes Cluster

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Part 1: Cloudflare Tunnel Setup on Linux Worker Node](#part-1-cloudflare-tunnel-setup-on-linux-worker-node)
3. [Part 2: Firewall Configuration](#part-2-firewall-configuration)
4. [Part 3: Kubernetes Deployment Configuration](#part-3-kubernetes-deployment-configuration)
5. [Part 4: Verification & Testing](#part-4-verification--testing)
6. [Part 5: Troubleshooting Guide](#part-5-troubleshooting-guide)
7. [Final Working Script](#final-working-script)

---

## Prerequisites

### Required Information

| Item | Value |
|------|-------|
| **Domain** | `voidcloud.cc.cd` |
| **API Subdomain** | `api.voidcloud.cc.cd` |
| **Tunnel ID** | `b87510bf-f586-42aa-ab0c-b1a24206768a` |
| **Account Tag** | `5974977c768416623e5ec8bf7ba6a070` |
| **Worker Node IP** | `10.51.100.31` |
| **Frontend NodePort** | `30088` |
| **Backend Port** | `3001` |

### Environment
- **OS**: Ubuntu 22.04 / Debian 11+
- **Kubernetes**: v1.28+
- **Architecture**: amd64

---

## Part 1: Cloudflare Tunnel Setup on Linux Worker Node

### Step 1: Install cloudflared

```bash
# Download the latest cloudflared binary
wget -q -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make it executable
chmod +x cloudflared

# Move to system path
sudo mv cloudflared /usr/local/bin/

# Verify installation
cloudflared --version
```

**Expected Output:**
```
cloudflared version 2026.5.0 (Checksum 0dc407bb...)
```

### Step 2: Create Configuration Directory

```bash
# Create cloudflared configuration directory
sudo mkdir -p /etc/cloudflared

# Set proper permissions
sudo chmod 755 /etc/cloudflared
```

### Step 3: Create Tunnel Credentials File

```bash
# Create credentials.json with your tunnel credentials
sudo tee /etc/cloudflared/credentials.json > /dev/null << 'EOF'
{
  "AccountTag": "5974977c768416623e5ec8bf7ba6a070",
  "TunnelID": "b87510bf-f586-42aa-ab0c-b1a24206768a",
  "TunnelSecret": "eyJhIjoiNTk3NDk3N2M3Njg0MTY2MjNlNWVjOGJmN2JhNmEwNzAiLCJ0IjoiYjg3NTEwYmYtZjU4Ni00MmFhLWFiMGMtYjFhMjQyMDY3NjhhIiwiaWF0IjoiMjAyNi0wNS0yMVQxOToyMDoyM1oifQ=="
}
EOF

# Secure the credentials file
sudo chmod 600 /etc/cloudflared/credentials.json
```

### Step 4: Create Tunnel Configuration File

```bash
# Create config.yaml with ingress rules
sudo tee /etc/cloudflared/config.yaml > /dev/null << 'EOF'
tunnel: b87510bf-f586-42aa-ab0c-b1a24206768a
credentials-file: /etc/cloudflared/credentials.json
metrics: 0.0.0.0:2000
ingress:
  - hostname: voidcloud.cc.cd
    service: http://localhost:30088
  - hostname: api.voidcloud.cc.cd
    service: http://localhost:3001
  - service: http_status:404
EOF

# Verify configuration
cat /etc/cloudflared/config.yaml
```

### Step 5: Stop Kubernetes Tunnel Pod (if running)

```bash
# Scale down the Kubernetes tunnel deployment to 0 replicas
kubectl scale deployment cloudflare-tunnel -n voidcloud --replicas=0 2>/dev/null

# Verify tunnel pod is removed
kubectl get pods -n voidcloud -l app=cloudflare-tunnel
```

### Step 6: Create Systemd Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yaml run
Restart=always
RestartSec=5
User=root
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable cloudflared

# Start the service
sudo systemctl start cloudflared

# Check service status
sudo systemctl status cloudflared
```

**Expected Output:**
```
● cloudflared.service - Cloudflare Tunnel
     Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
     Active: active (running)
   Main PID: 25559 (cloudflared)
      Tasks: 13
     Memory: 16.7M
```

---

## Part 2: Firewall Configuration

### Step 1: Allow Cloudflare IP Ranges

```bash
# Add Cloudflare IP ranges to iptables OUTPUT chain
sudo iptables -A OUTPUT -d 198.41.192.0/24 -j ACCEPT
sudo iptables -A OUTPUT -d 198.41.200.0/24 -j ACCEPT
sudo iptables -A OUTPUT -d 173.245.48.0/20 -j ACCEPT
sudo iptables -A OUTPUT -d 103.21.244.0/22 -j ACCEPT
sudo iptables -A OUTPUT -d 103.22.200.0/22 -j ACCEPT
sudo iptables -A OUTPUT -d 103.31.4.0/22 -j ACCEPT
sudo iptables -A OUTPUT -d 141.101.64.0/18 -j ACCEPT
sudo iitables -A OUTPUT -d 108.162.192.0/18 -j ACCEPT
sudo iptables -A OUTPUT -d 190.93.240.0/20 -j ACCEPT
sudo iptables -A OUTPUT -d 188.114.96.0/20 -j ACCEPT
sudo iptables -A OUTPUT -d 197.234.240.0/22 -j ACCEPT
sudo iptables -A OUTPUT -d 162.158.0.0/15 -j ACCEPT
```

### Step 2: Verify Firewall Rules

```bash
# View iptables OUTPUT chain rules
sudo iptables -L OUTPUT -n -v | grep -E "198|173|103|141|108|190|188|197|162"

# Save rules for persistence (Ubuntu/Debian)
sudo apt-get install iptables-persistent -y
sudo netfilter-persistent save
```

### Step 3: Test Connectivity to Cloudflare Edge

```bash
# Test connection to Cloudflare API
curl -I https://api.cloudflare.com

# Ping Cloudflare edge
ping -c 4 198.41.200.193

# Test port connectivity
nc -zv 198.41.200.193 443
```

---

## Part 3: Kubernetes Deployment Configuration

### Step 1: Verify Kubernetes Services are Running

```bash
# Check all pods in voidcloud namespace
kubectl get pods -n voidcloud

# Expected output:
# NAME                         READY   STATUS    RESTARTS   AGE
# backend-6958f7bcd5-6hllw    1/1     Running   0          1h
# frontend-76c5f6c787-km95x   1/1     Running   0          1h
# postgres-dfc9bdff4-kwk7l    1/1     Running   0          1h

# Check services
kubectl get svc -n voidcloud

# Expected output:
# NAME         TYPE        CLUSTER-IP      PORT(S)
# backend      ClusterIP   10.100.139.5    3001/TCP
# frontend     ClusterIP   10.97.179.210   3000/TCP
# frontend-nodeport NodePort 10.99.195.118 3000:30088/TCP
```

### Step 2: Verify NodePort Accessibility

```bash
# Test frontend NodePort locally
curl -I http://localhost:30088

# Expected output: HTTP/1.1 200 OK

# Test backend API directly
curl http://localhost:3001/api/v1/health

# Expected output: {"status":"ok","uptime":...}
```

### Step 3: Optional - Remove Kubernetes Tunnel Resources

```bash
# Delete tunnel deployment (if exists)
kubectl delete deployment cloudflare-tunnel -n voidcloud --ignore-not-found

# Delete tunnel configmap
kubectl delete configmap cloudflare-tunnel-config -n voidcloud --ignore-not-found

# Delete tunnel secret
kubectl delete secret cloudflare-tunnel-secret -n voidcloud --ignore-not-found
```

---

## Part 4: Verification & Testing

### Step 1: Check Tunnel Status

```bash
# Check systemd service status
sudo systemctl status cloudflared --no-pager

# View tunnel logs
sudo journalctl -u cloudflared -f --tail=20

# Expected log entries:
# INF Registered tunnel connection connIndex=0
# INF Tunnel connection established
```

### Step 2: Verify Cloudflare Dashboard

Open your browser and navigate to:
```
https://dash.cloudflare.com/ → Zero Trust → Networks → Tunnels
```

Expected status:
- **Tunnel Name**: cluster
- **Active replicas**: 1
- **Status**: Healthy
- **Routes**: 2 (voidcloud.cc.cd, api.voidcloud.cc.cd)

### Step 3: Test Frontend Access

```bash
# Test frontend via Cloudflare
curl -I https://voidcloud.cc.cd

# Expected output: HTTP/2 200 OK

# Or open in browser
# https://voidcloud.cc.cd
```

### Step 4: Test API Login

```bash
# Test login endpoint
curl -X POST https://api.voidcloud.cc.cd/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amer.dev","password":"AmerDevOps2026!"}'

# Expected output:
# {"access_token":"eyJhbGciOiJIUzI1NiIs...","user":{"id":"...","email":"admin@amer.dev","role":"ADMIN"}}
```

### Step 5: Test API Health Endpoint

```bash
# Test health check
curl https://api.voidcloud.cc.cd/api/v1/health

# Expected output:
# {"status":"ok","uptime":1234.56,"timestamp":"2026-05-22T00:00:00.000Z"}
```

---

## Part 5: Troubleshooting Guide

### Issue 1: Tunnel Shows "Down" in Dashboard

```bash
# Check if service is running
sudo systemctl status cloudflared

# Check logs for errors
sudo journalctl -u cloudflared -f --since="5 minutes ago"

# Restart the service
sudo systemctl restart cloudflared
```

### Issue 2: Connection Refused Errors

```bash
# Check if backend service is running
kubectl get pods -n voidcloud -l app=backend

# Check if NodePort is accessible
curl http://localhost:3001/api/v1/health

# Verify firewall rules
sudo iptables -L OUTPUT -n -v | grep -i "198.41"
```

### Issue 3: DNS Resolution Issues

```bash
# Check DNS resolution
nslookup voidcloud.cc.cd
dig voidcloud.cc.cd

# Clear DNS cache
sudo systemd-resolve --flush-caches
```

### Issue 4: Tunnel Authentication Failed

```bash
# Verify credentials file exists and is valid
cat /etc/cloudflared/credentials.json

# Reinstall tunnel with new token
sudo cloudflared service uninstall
sudo cloudflared service install <NEW-TOKEN>
```

### Issue 5: High Memory/CPU Usage

```bash
# Check resource usage
sudo systemctl status cloudflared
top -p $(pgrep cloudflared)

# Adjust systemd limits
sudo systemctl edit cloudflared
# Add:
# [Service]
# MemoryMax=256M
# CPUQuota=50%
```

---

## Final Working Script

### Complete Setup Script: `setup-cloudflare-tunnel.sh`

```bash
#!/bin/bash
# ============================================================
# Cloudflare Tunnel Setup Script for Linux Worker Node
# ============================================================
# This script installs and configures cloudflared as a systemd
# service to route traffic from Cloudflare to Kubernetes services.
# ============================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚀 Cloudflare Tunnel Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================
# Configuration Variables - CHANGE THESE AS NEEDED
# ============================================================

TUNNEL_ID="b87510bf-f586-42aa-ab0c-b1a24206768a"
ACCOUNT_TAG="5974977c768416623e5ec8bf7ba6a070"
TUNNEL_SECRET="eyJhIjoiNTk3NDk3N2M3Njg0MTY2MjNlNWVjOGJmN2JhNmEwNzAiLCJ0IjoiYjg3NTEwYmYtZjU4Ni00MmFhLWFiMGMtYjFhMjQyMDY3NjhhIiwiaWF0IjoiMjAyNi0wNS0yMVQxOToyMDoyM1oifQ=="
DOMAIN="voidcloud.cc.cd"
API_DOMAIN="api.voidcloud.cc.cd"
FRONTEND_NODEPORT="30088"
BACKEND_PORT="3001"
NAMESPACE="voidcloud"

# ============================================================
# Step 1: Install cloudflared
# ============================================================

echo -e "${YELLOW}[1/8] Installing cloudflared...${NC}"

if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}✅ cloudflared already installed: $(cloudflared --version)${NC}"
else
    wget -q -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x cloudflared
    sudo mv cloudflared /usr/local/bin/
    echo -e "${GREEN}✅ cloudflared installed: $(cloudflared --version)${NC}"
fi

# ============================================================
# Step 2: Create configuration directory
# ============================================================

echo -e "${YELLOW}[2/8] Creating configuration directory...${NC}"
sudo mkdir -p /etc/cloudflared
sudo chmod 755 /etc/cloudflared
echo -e "${GREEN}✅ Directory created at /etc/cloudflared${NC}"

# ============================================================
# Step 3: Create credentials file
# ============================================================

echo -e "${YELLOW}[3/8] Creating credentials file...${NC}"
sudo tee /etc/cloudflared/credentials.json > /dev/null << EOF
{
  "AccountTag": "${ACCOUNT_TAG}",
  "TunnelID": "${TUNNEL_ID}",
  "TunnelSecret": "${TUNNEL_SECRET}"
}
EOF
sudo chmod 600 /etc/cloudflared/credentials.json
echo -e "${GREEN}✅ Credentials file created${NC}"

# ============================================================
# Step 4: Create configuration file
# ============================================================

echo -e "${YELLOW}[4/8] Creating tunnel configuration...${NC}"
sudo tee /etc/cloudflared/config.yaml > /dev/null << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/credentials.json
metrics: 0.0.0.0:2000
ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:${FRONTEND_NODEPORT}
  - hostname: ${API_DOMAIN}
    service: http://localhost:${BACKEND_PORT}
  - service: http_status:404
EOF
echo -e "${GREEN}✅ Configuration file created${NC}"

# ============================================================
# Step 5: Verify Kubernetes services
# ============================================================

echo -e "${YELLOW}[5/8] Verifying Kubernetes services...${NC}"
if kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✅ Namespace ${NAMESPACE} exists${NC}"
    
    # Scale down any existing tunnel pod
    kubectl scale deployment cloudflare-tunnel -n ${NAMESPACE} --replicas=0 2>/dev/null && \
        echo -e "${GREEN}✅ Scaled down existing tunnel pod${NC}"
    
    # Verify frontend NodePort
    if kubectl get svc frontend-nodeport -n ${NAMESPACE} &> /dev/null; then
        echo -e "${GREEN}✅ frontend-nodeport service found${NC}"
    else
        echo -e "${YELLOW}⚠️ frontend-nodeport service not found${NC}"
    fi
    
    # Verify backend service
    if kubectl get svc backend -n ${NAMESPACE} &> /dev/null; then
        echo -e "${GREEN}✅ backend service found${NC}"
    else
        echo -e "${YELLOW}⚠️ backend service not found${NC}"
    fi
else
    echo -e "${RED}❌ Namespace ${NAMESPACE} not found${NC}"
fi

# ============================================================
# Step 6: Configure firewall rules
# ============================================================

echo -e "${YELLOW}[6/8] Configuring firewall rules...${NC}"

# Cloudflare IPv4 ranges
CLOUDFLARE_RANGES=(
    "198.41.192.0/24"
    "198.41.200.0/24"
    "173.245.48.0/20"
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "141.101.64.0/18"
    "108.162.192.0/18"
    "190.93.240.0/20"
    "188.114.96.0/20"
    "197.234.240.0/22"
    "162.158.0.0/15"
)

for range in "${CLOUDFLARE_RANGES[@]}"; do
    sudo iptables -A OUTPUT -d ${range} -j ACCEPT 2>/dev/null && \
        echo -e "  Added ${range}"
done

echo -e "${GREEN}✅ Firewall rules configured${NC}"

# ============================================================
# Step 7: Create and start systemd service
# ============================================================

echo -e "${YELLOW}[7/8] Creating systemd service...${NC}"

sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yaml run
Restart=always
RestartSec=5
User=root
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

echo -e "${GREEN}✅ Systemd service created and started${NC}"

# ============================================================
# Step 8: Verify and test
# ============================================================

echo -e "${YELLOW}[8/8] Verifying tunnel status...${NC}"
sleep 3

# Check service status
if sudo systemctl is-active --quiet cloudflared; then
    echo -e "${GREEN}✅ Tunnel service is running${NC}"
else
    echo -e "${RED}❌ Tunnel service failed to start${NC}"
    sudo journalctl -u cloudflared --tail=20
    exit 1
fi

# Show recent logs
echo ""
echo -e "${BLUE}Recent tunnel logs:${NC}"
sudo journalctl -u cloudflared --tail=10 --no-pager

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📊 Useful Commands:${NC}"
echo -e "  sudo systemctl status cloudflared     # Check service status"
echo -e "  sudo journalctl -u cloudflared -f     # View live logs"
echo -e "  sudo systemctl restart cloudflared    # Restart tunnel"
echo ""
echo -e "${YELLOW}🌐 Access URLs:${NC}"
echo -e "  Frontend: https://${DOMAIN}"
echo -e "  API: https://${API_DOMAIN}/api/v1"
echo -e "  Health: https://${API_DOMAIN}/api/v1/health"
echo ""
echo -e "${YELLOW}🔐 Admin Credentials:${NC}"
echo -e "  Email: admin@amer.dev"
echo -e "  Password: AmerDevOps2026!"
echo ""
echo -e "${BLUE}Test with:${NC}"
echo -e "  curl https://${API_DOMAIN}/api/v1/health"
echo -e "  curl -X POST https://${API_DOMAIN}/api/v1/auth/login \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"email\":\"admin@amer.dev\",\"password\":\"AmerDevOps2026!\"}'"
```

### How to Use the Script

```bash
# 1. Copy the script to your worker node
scp setup-cloudflare-tunnel.sh workernode01:~/

# 2. Make it executable
chmod +x setup-cloudflare-tunnel.sh

# 3. Run the script as root or with sudo
sudo ./setup-cloudflare-tunnel.sh

# 4. Verify the tunnel is working
sudo systemctl status cloudflared
curl https://api.voidcloud.cc.cd/api/v1/health
```

---

## Appendix: Quick Reference Commands

### Service Management
```bash
sudo systemctl start cloudflared      # Start tunnel
sudo systemctl stop cloudflared       # Stop tunnel
sudo systemctl restart cloudflared    # Restart tunnel
sudo systemctl status cloudflared     # Check status
sudo journalctl -u cloudflared -f     # View logs
```

### Testing Commands
```bash
# Test frontend
curl -I https://voidcloud.cc.cd

# Test API health
curl https://api.voidcloud.cc.cd/api/v1/health

# Test login
curl -X POST https://api.voidcloud.cc.cd/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amer.dev","password":"AmerDevOps2026!"}'
```

### Firewall Commands
```bash
# View rules
sudo iptables -L OUTPUT -n -v

# Save rules
sudo netfilter-persistent save

# Flush rules (if needed)
sudo iptables -F OUTPUT
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-22  
**Status:** ✅ PRODUCTION READY
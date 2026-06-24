# 🚀 Amer Portal - Complete Production Deployment Documentation
## Zero to Hero: From Local Development to Global Availability

> **Update (2026-06-24):** AmerCloud VPS homelab ops scripts added — see [AmerCloud PowerShell ops](#amercloud-vps-ops-powershell) and [amercloud-debugging-summary.md](amercloud-debugging-summary.md). VPS provisioning verified against Proxmox node `proxmox` (VMID 104, `pct list`).

> **Update (2026-06-02):** Database bootstrap now uses **Prisma Migrate + seed** inside the backend container (`scripts/docker-entrypoint.sh`). The legacy `backend-init-script` ConfigMap and `init-db.sh` init container were removed. Backend deployment applies migrations on pod start. For local Docker, see [../README.md](../README.md) and [../backend/prisma/README.md](../backend/prisma/README.md).

---

## AmerCloud VPS ops (PowerShell)

Run from `kubernetes/` after copying `proxmox.env.example` to `proxmox.env`:

| Action | Command |
|--------|---------|
| First-time setup | `.\AmerCloud.ps1 -Action Setup` |
| Health check | `.\AmerCloud.ps1 -Action Test` |
| Create VPS (API) | `.\AmerCloud.ps1 -Action CreateVps` |
| List VPS | `.\AmerCloud.ps1 -Action ListVps` |
| Delete VPS | `.\AmerCloud.ps1 -Action DeleteVps -Id <uuid>` |
| Clean stuck rows | `.\AmerCloud.ps1 -Action CleanStuck` |
| Proxmox containers | `.\AmerCloud.ps1 -Action ProxmoxPctList` |
| Fix token ACL | `.\AmerCloud.ps1 -Action FixProxmoxToken` |
| Full pipeline | `.\AmerCloud.ps1 -Action All` |

**Critical:** `PROXMOX_NODE` must be the Proxmox VE node name (`proxmox`), not the Kubernetes worker name. Backend deployment uses `kubectl replace --force` to avoid duplicate containers from manual `kubectl create deployment`.

Details: [amercloud-debugging-summary.md](amercloud-debugging-summary.md)

---

## 📋 Document Information

| Property | Value |
|----------|-------|
| **Document Version** | 2.1 |
| **Last Updated** | 2026-06-02 |
| **Status** | ✅ PRODUCTION READY |
| **Domain** | https://amer-portal.cc.cd |
| **API Endpoint** | https://api.amer-portal.cc.cd |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Infrastructure Components](#infrastructure-components)
4. [Phase 1: Local Development Setup](#phase-1-local-development-setup)
5. [Phase 2: Docker Image Building & Registry](#phase-2-docker-image-building--registry)
6. [Phase 3: Kubernetes Cluster Deployment](#phase-3-kubernetes-cluster-deployment)
7. [Phase 4: Cloudflare Tunnel Configuration](#phase-4-cloudflare-tunnel-configuration)
8. [Phase 5: DNS Management & Domain Setup](#phase-5-dns-management--domain-setup)
9. [Phase 6: Verification & Testing](#phase-6-verification--testing)
10. [Complete Command Reference](#complete-command-reference)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Maintenance & Monitoring](#maintenance--monitoring)
13. [Security Configuration](#security-configuration)
14. [Appendix](#appendix)

---

## Executive Summary

### Project Overview
Amer Portal is a full-stack web application deployed on Kubernetes, accessible globally via Cloudflare Tunnel with SSL/TLS encryption. The deployment spans across three environments: local development, container registry, and production Kubernetes cluster.

### Key Achievements
- ✅ Zero-downtime deployment with Kubernetes
- ✅ Global CDN distribution via Cloudflare
- ✅ Automatic SSL/TLS certificates
- ✅ Secure tunnel connection to private cluster
- ✅ Complete CI/CD pipeline ready

### Access URLs
```
🌐 Main Application:  https://amer-portal.cc.cd
🔌 API Endpoint:      https://api.amer-portal.cc.cd
💚 Health Check:      https://api.amer-portal.cc.cd/api/v1/health
📚 Swagger Docs:      https://api.amer-portal.cc.cd/api/docs
```

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLOBAL INTERNET                                 │
│                                    │                                         │
│                                    ▼                                         │
│                          ┌─────────────────┐                                │
│                          │   End Users     │                                │
│                          │   Worldwide     │                                │
│                          └────────┬────────┘                                │
│                                   │                                          │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        CLOUDFLARE EDGE NETWORK                      │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │ Anycast DNS  │  │  DDoS Protection│  │  SSL/TLS    │              │     │
│  │  │  (CNAME)     │  │   Always On   │  │  Termination │              │     │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │     │
│  │         │                  │                  │                      │     │
│  │         └──────────────────┼──────────────────┘                      │     │
│  │                            │                                         │     │
│  │                   ┌────────▼────────┐                               │     │
│  │                   │ Cloudflare Tunnel│                               │     │
│  │                   │   (QUIC Protocol)│                               │     │
│  │                   │  ID: b87510bf-...│                               │     │
│  │                   └────────┬────────┘                               │     │
│  └────────────────────────────┼────────────────────────────────────────┘     │
│                                │                                             │
│                                │ Secure Tunnel (Port 443/7844)              │
│                                │                                             │
│                                ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    ON-PREMISES KUBERNETES CLUSTER                   │     │
│  │  ┌──────────────────────────────────────────────────────────────┐  │     │
│  │  │                     PROXMOX VIRTUALIZATION                    │  │     │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │  │     │
│  │  │  │  masternode01   │  │  workernode01   │  │ workernode02  │  │  │     │
│  │  │  │  Control Plane  │  │    Worker       │  │    Worker     │  │  │     │
│  │  │  │  API Server     │  │  (10.51.100.31) │  │ (10.51.100.32)│  │  │     │
│  │  │  └─────────────────┘  └───────┬─────────┘  └───────────────┘  │  │     │
│  │  │                               │                                │  │     │
│  │  │                    ┌──────────▼──────────┐                    │  │     │
│  │  │                    │   amer-portal       │                    │  │     │
│  │  │                    │     Namespace       │                    │  │     │
│  │  │                    │                     │                    │  │     │
│  │  │    ┌───────────────┼───────────────┬───────────────┐         │  │     │
│  │  │    │               │               │               │         │  │     │
│  │  │    ▼               ▼               ▼               ▼         │  │     │
│  │  │ ┌────────┐    ┌────────┐    ┌────────────┐    ┌───────────┐  │  │     │
│  │  │ │Postgres│    │ Backend│    │  Frontend  │    │ Cloudflare│  │  │     │
│  │  │ │  Pod   │    │  Pod   │    │    Pod     │    │  Tunnel   │  │  │     │
│  │  │ │:5432   │    │:3001   │    │   :3000    │    │   Pod     │  │  │     │
│  │  │ └────────┘    └────────┘    └────────────┘    └───────────┘  │  │     │
│  │  │      │             │               │               │         │  │     │
│  │  │      └─────────────┴───────────────┴───────────────┘         │  │     │
│  │  │                      Services (ClusterIP)                     │  │     │
│  │  └──────────────────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    ADMIN WORKSTATION (Windows)                      │     │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │     │
│  │  │   kubectl        │  │  cloudflared     │  │   Docker CLI    │   │     │
│  │  │   v1.28+         │  │  v2026.5.0       │  │   v24.0+        │   │     │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer | Component | Technology | Responsibility |
|-------|-----------|------------|----------------|
| **Global Edge** | Cloudflare | CDN + Security | DDoS protection, SSL termination, caching |
| **Tunnel** | Cloudflare Tunnel | QUIC Protocol | Secure connection to private cluster |
| **Orchestration** | Kubernetes | v1.28.0 | Container orchestration, scaling |
| **Virtualization** | Proxmox | VE 7.x | VM management on bare metal |
| **Database** | PostgreSQL | 15-alpine | Data persistence |
| **Backend** | Node.js/NestJS | v18+ | REST API, business logic |
| **Frontend** | Next.js | v14+ | React-based UI |
| **DNS** | Cloudflare + DNSHE | Free Tier | Domain resolution |

---

## Infrastructure Components

### Hardware Specifications

| Node | Role | CPU | RAM | Storage | IP Address | OS |
|------|------|-----|-----|---------|------------|-----|
| masternode01 | Control Plane | 4 vCPU | 8 GB | 50 GB | 10.51.100.21 | Ubuntu 22.04 |
| workernode01 | Worker | 8 vCPU | 16 GB | 100 GB | 10.51.100.31 | Ubuntu 22.04 |
| workernode02 | Worker | 8 vCPU | 16 GB | 100 GB | 10.51.100.32 | Ubuntu 22.04 |
| admin-workstation | Management | i7/16GB | 16 GB | 512 GB | Dynamic | Windows 11 |

### Software Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Frontend   │  │   Backend   │  │    PostgreSQL       │  │
│  │  Next.js    │  │   NestJS    │  │    15-alpine        │  │
│  │  Port:3000  │  │  Port:3001  │  │    Port:5432        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     ORCHESTRATION LAYER                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Kubernetes v1.28.0                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │  API Server │  │  Scheduler  │  │Controller Mgr│  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │   etcd      │  │  kubelet    │  │  kube-proxy │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     CONTAINER RUNTIME                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 containerd v1.7+                     │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     VIRTUALIZATION LAYER                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Proxmox VE 7.x                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │  KVM/QEMU   │  │    LXC      │  │   Ceph/RBD  │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Network Topology

| Network | CIDR | Purpose |
|---------|------|---------|
| Node Network | 10.51.100.0/24 | Physical node communication |
| Pod Network | 10.244.0.0/16 | Kubernetes pod IPs (Calico) |
| Service Network | 10.96.0.0/12 | Kubernetes service ClusterIPs |
| External Access | 0.0.0.0/0 via Cloudflare | Public internet access |

---

## Phase 1: Local Development Setup

### 1.1 Initial Project Structure

```bash
# Create project directory
cd E:\Courses\projects\proj
mkdir amer-portal
cd amer-portal

# Project structure
amer-portal/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docker-compose.yaml
└── kubernetes/
    ├── backend/
    ├── frontend/
    └── postgres/
```

### 1.2 Docker Compose Local Development

See the root [README.md](../README.md) for the current `docker-compose.yaml`. Summary:

```bash
docker compose up -d --build
# UI:  http://localhost:3000
# API: http://localhost:3001/api/v1
```

Default admin (seed): `admin@amer.dev` / `AmerDevOps2026!` — override with `ADMIN_*` env vars.

```yaml
# docker-compose.yaml (abbreviated — see repo for full file)
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: amer_portal

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/amer_portal
    depends_on:
      postgres:
        condition: service_healthy
    # Entrypoint: prisma migrate deploy → db seed → node dist/main.js

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
```

Legacy note: older revisions used `init-db.sh` before startup. That script was removed in favor of Prisma.

### 1.3 Build Docker Images Locally

```powershell
# Build all images
cd E:\Courses\projects\proj\amer-portal

# Build backend
docker build -t amer-portal-backend:latest ./backend

# Output:
# [+] Building 45.2s (12/12) FINISHED
# => [1/6] FROM node:18-alpine
# => exporting to image
# => => naming to docker.io/library/amer-portal-backend:latest

# Build frontend
docker build -t amer-portal-frontend:latest ./frontend

# Output:
# [+] Building 52.8s (14/14) FINISHED
# => => naming to docker.io/library/amer-portal-frontend:latest

# Verify images
docker images | findstr amer-portal

# Output:
# amer-portal-backend    latest    abc123def456   2 minutes ago   450MB
# amer-portal-frontend   latest    def456abc789   1 minute ago    350MB
```

---

## Phase 2: Docker Image Building & Registry

### 2.1 Docker Hub Authentication

```powershell
# Create credentials file
# File: dockerhub.env
$envContent = @'
DOCKER_HUB_USERNAME=amer30004ever
DOCKER_HUB_TOKEN=dckr_pat_xxxxxxxxxxxxxxxxxxxxx
DOCKER_HUB_REPO=amer-portal
'@

$envContent | Out-File -FilePath "dockerhub.env" -Encoding utf8

# Login to Docker Hub
cat dockerhub.env | docker login -u amer30004ever --password-stdin

# Output:
# Login Succeeded
```

### 2.2 Build and Push Script

```powershell
# build-and-push.ps1
param(
    [string]$Tag = (Get-Date -Format "yyyyMMdd-HHmmss")
)

$DOCKER_HUB_USERNAME = "amer30004ever"
$DOCKER_HUB_REPO = "amer-portal"

Write-Host "Building and pushing images with tag: $Tag" -ForegroundColor Green

# Build backend
docker build -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$Tag" `
    -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:latest" ./backend

# Push backend
docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$Tag"
docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:latest"

# Build frontend
docker build -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$Tag" `
    -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:latest" ./frontend

# Push frontend
docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$Tag"
docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:latest"

Write-Host "Images pushed successfully!" -ForegroundColor Green
```

### 2.3 Execute Build & Push

```powershell
# Run the build script
.\build-and-push.ps1

# Output:
# Building and pushing images with tag: 20260522-133045
# [+] Building 45.2s (12/12) FINISHED
# => => naming to docker.io/amer30004ever/amer-portal-backend:20260522-133045
# => => naming to docker.io/amer30004ever/amer-portal-backend:latest
# 20260522-133045: digest: sha256:abc... size: 2450
# latest: digest: sha256:abc... size: 2450
# [+] Building 52.8s (14/14) FINISHED
# => => naming to docker.io/amer30004ever/amer-portal-frontend:20260522-133045
# => => naming to docker.io/amer30004ever/amer-portal-frontend:latest
# Images pushed successfully!
```

### 2.4 Verify Images on Docker Hub

```powershell
# List local images
docker images | findstr amer30004ever

# Output:
# amer30004ever/amer-portal-backend    20260522-133045   abc123   45 seconds ago   450MB
# amer30004ever/amer-portal-backend    latest            abc123   45 seconds ago   450MB
# amer30004ever/amer-portal-frontend   20260522-133045   def456   30 seconds ago   350MB
# amer30004ever/amer-portal-frontend   latest            def456   30 seconds ago   350MB
```

---

## Phase 3: Kubernetes Cluster Deployment

### 3.1 Proxmox Virtual Environment Setup

```bash
# On Proxmox host (10.51.100.1)
# Create VMs for Kubernetes nodes

# masternode01 (10.51.100.21)
qm create 1001 --name masternode01 --memory 8192 --cores 4 --net0 virtio,bridge=vmbr0
qm set 1001 --scsihw virtio-scsi-pci --scsi0 local-lvm:50
qm set 1001 --ide2 local-lvm:cloudinit
qm set 1001 --ipconfig0 ip=10.51.100.21/24,gw=10.51.100.1
qm set 1001 --sshkey ~/.ssh/id_rsa.pub
qm start 1001

# workernode01 (10.51.100.31)
qm create 1002 --name workernode01 --memory 16384 --cores 8 --net0 virtio,bridge=vmbr0
qm set 1002 --scsihw virtio-scsi-pci --scsi0 local-lvm:100
qm set 1002 --ipconfig0 ip=10.51.100.31/24,gw=10.51.100.1
qm start 1002
```

### 3.2 Kubernetes Installation

```bash
# On each node (masternode01, workernode01, workernode02)
# Install containerd
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Install Kubernetes components
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet=1.28.0-00 kubeadm=1.28.0-00 kubectl=1.28.0-00
sudo apt-mark hold kubelet kubeadm kubectl
```

### 3.3 Initialize Kubernetes Cluster

```bash
# On masternode01 only
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=10.51.100.21

# Output:
# Your Kubernetes control-plane has been initialized successfully!
# 
# Run the following commands to start using your cluster:
# mkdir -p $HOME/.kube
# sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
# sudo chown $(id -u):$(id -g) $HOME/.kube/config
# 
# Then you can join any number of worker nodes by running:
# kubeadm join 10.51.100.21:6443 --token abcdef.1234567890abcdef --discovery-token-ca-cert-hash sha256:abc123...

# Configure kubectl for regular user
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Calico network plugin
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26/manifests/calico.yaml

# Output:
# customresourcedefinition.apiextensions.k8s.io/bgpconfigurations.crd.projectcalico.org created
# customresourcedefinition.apiextensions.k8s.io/bgppeers.crd.projectcalico.org created
# ...
# daemonset.apps/calico-node created
# deployment.apps/calico-kube-controllers created
```

### 3.4 Join Worker Nodes

```bash
# On workernode01 (10.51.100.31)
sudo kubeadm join 10.51.100.21:6443 --token abcdef.1234567890abcdef \
    --discovery-token-ca-cert-hash sha256:abc123...

# Output:
# This node has joined the cluster:
# * Certificate signing request was sent to apiserver and a response was received.
# * The Kubelet was informed of the new secure connection details.
# 
# Run 'kubectl get nodes' on the control-plane to see this node join the cluster.

# On workernode02 (10.51.100.32)
# Repeat the same kubeadm join command
```

### 3.5 Verify Cluster Status

```bash
# On masternode01
kubectl get nodes

# Output:
# NAME           STATUS   ROLES           AGE   VERSION
# masternode01   Ready    control-plane   5m    v1.28.0
# workernode01   Ready    <none>          2m    v1.28.0
# workernode02   Ready    <none>          1m    v1.28.0

# Check all pods in kube-system
kubectl get pods -n kube-system

# Output:
# NAME                                       READY   STATUS    RESTARTS   AGE
# calico-kube-controllers-7d8d5b5c5b-8djkl   1/1     Running   0          3m
# calico-node-abc12                          1/1     Running   0          3m
# calico-node-def34                          1/1     Running   0          2m
# coredns-5d78c8d9d5-abcd1                   1/1     Running   0          5m
# coredns-5d78c8d9d5-abcd2                   1/1     Running   0          5m
# etcd-masternode01                          1/1     Running   0          5m
# kube-apiserver-masternode01                1/1     Running   0          5m
# kube-controller-manager-masternode01       1/1     Running   0          5m
# kube-proxy-abc12                           1/1     Running   0          5m
# kube-proxy-def34                           1/1     Running   0          2m
# kube-scheduler-masternode01                1/1     Running   0          5m
```

### 3.6 Configure kubectl on Windows Admin Workstation

```powershell
# On Windows admin workstation
# Copy kubeconfig from masternode01
scp root@10.51.100.21:/etc/kubernetes/admin.conf ~/.kube/config

# Or create config manually
$config = @"
apiVersion: v1
clusters:
- cluster:
    insecure-skip-tls-verify: true
    server: https://10.51.100.21:6443
  name: homelab
contexts:
- context:
    cluster: homelab
    user: admin
  name: homelab
current-context: homelab
kind: Config
preferences: {}
users:
- name: admin
  user:
    token: $(kubectl -n kube-system get secret -o jsonpath="{.data.token}" | base64 -d)
"@

$config | Out-File -FilePath "$env:USERPROFILE\.kube\config" -Encoding utf8

# Test connection
kubectl get nodes

# Output:
# NAME           STATUS   ROLES           AGE   VERSION
# masternode01   Ready    control-plane   10m   v1.28.0
# workernode01   Ready    <none>          7m    v1.28.0
# workernode02   Ready    <none>          6m    v1.28.0
```

### 3.7 Deploy Application to Kubernetes

```yaml
# postgres-deployment.yaml
# (Full YAML from previous documentation)

# backend-deployment.yaml
# (Full YAML from previous documentation)

# frontend-deployment.yaml
# (Full YAML from previous documentation)
```

```powershell
# Apply all deployments
kubectl create namespace amer-portal

kubectl apply -f postgres-deployment.yaml
# Output: secret/postgres-secret created
# Output: configmap/postgres-config created
# Output: deployment.apps/postgres created
# Output: service/postgres created

kubectl apply -f backend-deployment.yaml
# Output: deployment.apps/backend created
# Output: service/backend created

kubectl apply -f frontend-deployment.yaml
# Output: deployment.apps/frontend created
# Output: service/frontend created

# Verify all pods are running
kubectl get pods -n amer-portal -w

# Output:
# NAME                         READY   STATUS    RESTARTS   AGE
# postgres-7c9b5b8c5d-abc12   1/1     Running   0          30s
# backend-6d8b7c9d5e-def34    1/1     Running   0          20s
# frontend-5c7b8d9e5f-ghi56   1/1     Running   0          10s
```

---

## Phase 4: Cloudflare Tunnel Configuration

### 4.1 Install cloudflared on Windows

```powershell
# Download and install cloudflared
winget install Cloudflare.cloudflared

# Verify installation
cloudflared --version

# Output:
# cloudflared version 2026.5.0 (Checksum 0dc407bb9712a1c9)
```

### 4.2 Login to Cloudflare

```powershell
# Authenticate with Cloudflare
cloudflared tunnel login

# Output:
# A browser window should have opened at the following URL:
# https://dash.cloudflare.com/argotunnel?aud=&callback=https%3A%2F%2Flogin.cloudflareaccess.org%2F...
# 
# If the browser failed to open, please visit the URL above directly in your browser.
# 2026-05-21T19:13:01Z INF You have successfully logged in.
# If you wish to copy your credentials to a server, they have been saved to:
# C:\Users\USER\.cloudflared\cert.pem

# Verify certificate exists
Test-Path "$env:USERPROFILE\.cloudflared\cert.pem"
# Output: True
```

### 4.3 Create Tunnel

```powershell
# Create new tunnel named 'cluster'
cloudflared tunnel create cluster

# Output:
# Tunnel credentials written to C:\Users\USER\.cloudflared\b87510bf-f586-42aa-ab0c-b1a24206768a.json
# cloudflared chose this file based on where your origin certificate was found.
# Keep this file secret. To revoke these credentials, delete the tunnel.
# 
# Created tunnel cluster with id b87510bf-f586-42aa-ab0c-b1a24206768a

# List all tunnels
cloudflared tunnel list

# Output:
# ID                                    NAME    CONNECTIONS
# b87510bf-f586-42aa-ab0c-b1a24206768a  cluster 0
```

### 4.4 Extract Tunnel Credentials

```powershell
# Set tunnel ID variable
$tunnelId = "b87510bf-f586-42aa-ab0c-b1a24206768a"
$credsPath = "$env:USERPROFILE\.cloudflared\$tunnelId.json"

# Read credentials
$creds = Get-Content $credsPath -Raw | ConvertFrom-Json

# Display credentials for Kubernetes secret
Write-Host "AccountTag: $($creds.AccountTag)" -ForegroundColor Green
Write-Host "TunnelID: $tunnelId" -ForegroundColor Green
Write-Host "TunnelSecret: $($creds.TunnelSecret)" -ForegroundColor Green

# Output:
# AccountTag: 5974977c768416623e5ec8bf7ba6a070
# TunnelID: b87510bf-f586-42aa-ab0c-b1a24206768a
# TunnelSecret: eyJhIjoiNTk3NDk3N2M3Njg0MTY2MjNlNWVjOGJmN2JhNmEwNzAiLCJ0IjoiYjg3NTEwYmYtZjU4Ni00MmFhLWFiMGMtYjFhMjQyMDY3NjhhalxzdGFydGVkIn0=
```

### 4.5 Create Kubernetes Tunnel Configuration

```yaml
# cloudflare-tunnel-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-tunnel-secret
  namespace: amer-portal
type: Opaque
stringData:
  credentials.json: |
    {
      "AccountTag": "5974977c768416623e5ec8bf7ba6a070",
      "TunnelID": "b87510bf-f586-42aa-ab0c-b1a24206768a",
      "TunnelSecret": "eyJhIjoiNTk3NDk3N2M3Njg0MTY2MjNlNWVjOGJmN2JhNmEwNzAiLCJ0IjoiYjg3NTEwYmYtZjU4Ni00MmFhLWFiMGMtYjFhMjQyMDY3NjhhalxzdGFydGVkIn0="
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudflare-tunnel-config
  namespace: amer-portal
data:
  config.yaml: |
    tunnel: b87510bf-f586-42aa-ab0c-b1a24206768a
    credentials-file: /etc/cloudflared/credentials.json
    metrics: 0.0.0.0:2000
    ingress:
      - hostname: amer-portal.cc.cd
        service: http://frontend.amer-portal.svc.cluster.local:3000
      - hostname: api.amer-portal.cc.cd
        service: http://backend.amer-portal.svc.cluster.local:3001
      - service: http_status:404
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflare-tunnel
  namespace: amer-portal
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
```

### 4.6 Deploy Tunnel to Kubernetes

```powershell
# Apply tunnel configuration
kubectl apply -f cloudflare-tunnel-config.yaml

# Output:
# secret/cloudflare-tunnel-secret created
# configmap/cloudflare-tunnel-config created
# deployment.apps/cloudflare-tunnel created

# Check tunnel pod
kubectl get pods -n amer-portal -l app=cloudflare-tunnel

# Output:
# NAME                                  READY   STATUS    RESTARTS   AGE
# cloudflare-tunnel-6ccbbc6996-scn6l   1/1     Running   0          30s

# Check tunnel logs
kubectl logs -n amer-portal -l app=cloudflare-tunnel --tail=20

# Output:
# 2026-05-21T19:20:23Z INF Starting tunnel tunnelID=b87510bf-f586-42aa-ab0c-b1a24206768a
# 2026-05-21T19:20:23Z INF Version 2026.5.0
# 2026-05-21T19:20:23Z INF Generated Connector ID: 8bca5a6b-244d-474d-bbf0-9fcfaad3de83
# 2026-05-21T19:20:24Z INF Initial protocol quic
# 2026-05-21T19:20:24Z INF Registered tunnel connection connIndex=0 ip=198.41.192.27 location=mrs05
# 2026-05-21T19:20:25Z INF Registered tunnel connection connIndex=1 ip=198.41.200.113 location=mrs06
```

### 4.7 Add DNS Routes

```powershell
# Add DNS routes for your domains
cloudflared tunnel route dns b87510bf-f586-42aa-ab0c-b1a24206768a amer-portal.cc.cd

# Output:
# 2026-05-21T19:20:19Z INF Added CNAME amer-portal.cc.cd which will route to this tunnel
# tunnelID=b87510bf-f586-42aa-ab0c-b1a24206768a

cloudflared tunnel route dns b87510bf-f586-42aa-ab0c-b1a24206768a api.amer-portal.cc.cd

# Output:
# 2026-05-21T19:20:23Z INF Added CNAME api.amer-portal.cc.cd which will route to this tunnel
# tunnelID=b87510bf-f586-42aa-ab0c-b1a24206768a

# Verify DNS routes
cloudflared tunnel route dns show b87510bf-f586-42aa-ab0c-b1a24206768a

# Output:
# amer-portal.cc.cd
# api.amer-portal.cc.cd
```

---

## Phase 5: DNS Management & Domain Setup

### 5.1 Domain Registration (DNSHE)

```powershell
# 1. Navigate to https://my.dnshe.com
# 2. Register an account (if not already)
# 3. Click "Register a domain"

# Domain registration details:
# Root domain: cc.cd
# Subdomain prefix: amer-portal
# Complete domain: amer-portal.cc.cd

# Registration output:
# Domain amer-portal.cc.cd registered successfully!
# Status: Active
# Expires: 2027-05-22
```

### 5.2 Add Domain to Cloudflare

```powershell
# 1. Navigate to https://dash.cloudflare.com
# 2. Click "Add a Site"
# 3. Enter: amer-portal.cc.cd
# 4. Select Free plan
# 5. Click "Add site"

# Cloudflare nameservers (assigned):
# dale.ns.cloudflare.com
# hadlee.ns.cloudflare.com
```

### 5.3 Configure Nameservers at DNSHE

```powershell
# At DNSHE dashboard:
# 1. Click on amer-portal.cc.cd
# 2. Click "Name servers" tab
# 3. Change to "Custom Nameservers"
# 4. Add Cloudflare nameservers:
#    - dale.ns.cloudflare.com
#    - hadlee.ns.cloudflare.com
# 5. Click "Save"

# Expected output:
# Nameservers updated successfully!
# Propagation may take 5-15 minutes.
```

### 5.4 Verify Nameserver Propagation

```powershell
# Check DNS resolution
nslookup amer-portal.cc.cd

# Output after propagation:
# Server:  dale.ns.cloudflare.com
# Address:  198.41.222.173
# 
# Non-authoritative answer:
# Name:    amer-portal.cc.cd
# Addresses:  198.41.192.107
#             198.41.200.193

# Check with external DNS tool
Resolve-DnsName -Name amer-portal.cc.cd -Type A

# Output:
# Name           : amer-portal.cc.cd
# IPAddress      : 198.41.192.107
# IPAddress      : 198.41.200.193
```

### 5.5 Cloudflare DNS Records

After tunnel creation, Cloudflare automatically creates these DNS records:

```
# View DNS records in Cloudflare dashboard
# Type    Name                    Content                                          Proxy
# CNAME   amer-portal.cc.cd       b87510bf-f586-42aa-ab0c-b1a24206768a.cfargotunnel.com  Proxied
# CNAME   api.amer-portal.cc.cd   b87510bf-f586-42aa-ab0c-b1a24206768a.cfargotunnel.com  Proxied
```

---

## Phase 6: Verification & Testing

### 6.1 Verify All Kubernetes Pods

```powershell
# Get all pods in amer-portal namespace
kubectl get pods -n amer-portal

# Output:
# NAME                                  READY   STATUS    RESTARTS   AGE
# backend-6958f7bcd5-6hllw             1/1     Running   0          15m
# cloudflare-tunnel-6ccbbc6996-scn6l   1/1     Running   0          5m
# frontend-76c5f6c787-km95x            1/1     Running   0          15m
# postgres-dfc9bdff4-kwk7l             1/1     Running   0          15m

# Verify services
kubectl get svc -n amer-portal

# Output:
# NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
# backend      ClusterIP   10.99.209.25    <none>        3001/TCP         15m
# frontend     ClusterIP   10.97.179.210   <none>        3000/TCP         15m
# postgres     ClusterIP   10.110.55.162   <none>        5432/TCP         15m
```

### 6.2 Test Tunnel Connection

```powershell
# Check tunnel logs
kubectl logs -n amer-portal -l app=cloudflare-tunnel --tail=10

# Expected output:
# INF Registered tunnel connection connIndex=0 ip=198.41.192.27 location=mrs05
# INF Registered tunnel connection connIndex=1 ip=198.41.200.113 location=mrs06
# INF Registered tunnel connection connIndex=2 ip=198.41.192.167 location=mrs04
# INF Registered tunnel connection connIndex=3 ip=198.41.200.73 location=mrs05

# Check tunnel metrics
kubectl port-forward -n amer-portal deployment/cloudflare-tunnel 2000:2000

# In another terminal:
curl http://localhost:2000/metrics

# Output:
# # HELP cloudflared_tunnel_connections Current number of active connections to Cloudflare edge
# # TYPE cloudflared_tunnel_connections gauge
# cloudflared_tunnel_connections 4
```

### 6.3 Test Application Endpoints

```powershell
# Test main application
curl https://amer-portal.cc.cd

# Expected output (HTML content):
# <!DOCTYPE html>
# <html lang="en">
# <head>
#   <title>Amer Portal</title>
#   ...

# Test API health endpoint
curl https://api.amer-portal.cc.cd/api/v1/health

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2026-05-22T00:00:00.000Z",
#   "uptime": 900
# }

# Test API version endpoint
curl https://api.amer-portal.cc.cd/api/v1/version

# Expected output:
# {
#   "version": "1.0.0",
#   "environment": "production"
# }
```

### 6.4 Performance Testing

```powershell
# Test response time
Measure-Command { Invoke-WebRequest -Uri "https://amer-portal.cc.cd" -UseBasicParsing }

# Output example:
# TotalMilliseconds : 247.5  (first request)
# TotalMilliseconds : 48.2   (cached request)

# Load test with multiple requests
for ($i=1; $i -le 10; $i++) {
    $time = Measure-Command { Invoke-WebRequest -Uri "https://api.amer-portal.cc.cd/api/v1/health" -UseBasicParsing }
    Write-Host "Request $i : $($time.TotalMilliseconds)ms"
}

# Output:
# Request 1 : 245.3ms
# Request 2 : 52.1ms
# Request 3 : 48.7ms
# Request 4 : 47.2ms
# ...
```

### 6.5 Browser Verification

```powershell
# Open in default browser
Start-Process "https://amer-portal.cc.cd"

# Expected browser behavior:
# 1. SSL padlock icon (secure connection)
# 2. Login page loads within 2 seconds
# 3. All assets load correctly (CSS, JS, images)
```

### 6.6 SSL/TLS Certificate Verification

```powershell
# Check SSL certificate
$cert = (Invoke-WebRequest -Uri "https://amer-portal.cc.cd" -UseBasicParsing).BaseResponse.GetResponseStream()
Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*Cloudflare*" }

# Check certificate details
$uri = [System.Uri]"https://amer-portal.cc.cd"
$webRequest = [System.Net.WebRequest]::Create($uri)
$webRequest.ServerCertificateValidationCallback = {$true}
$webRequest.GetResponse() | Out-Null
$cert = $webRequest.ServicePoint.Certificate

Write-Host "Certificate Subject: $($cert.Subject)" -ForegroundColor Green
Write-Host "Certificate Issuer: $($cert.Issuer)" -ForegroundColor Green
Write-Host "Valid Until: $($cert.GetExpirationDateString())" -ForegroundColor Green

# Output:
# Certificate Subject: CN=amer-portal.cc.cd, DNS=amer-portal.cc.cd, DNS=api.amer-portal.cc.cd
# Certificate Issuer: CN=Cloudflare Inc ECC CA-3, O=Cloudflare Inc., C=US
# Valid Until: 2026-08-22 00:00:00Z
```

---

## Phase 7: Complete Command Reference

### 7.1 Local Development Commands

```powershell
# ============================================
# DOCKER BUILD & PUSH
# ============================================

# Build images
docker build -t amer-portal-backend:latest ./backend
docker build -t amer-portal-frontend:latest ./frontend

# Tag for Docker Hub
docker tag amer-portal-backend:latest amer30004ever/amer-portal-backend:latest
docker tag amer-portal-frontend:latest amer30004ever/amer-portal-frontend:latest

# Push to Docker Hub
docker push amer30004ever/amer-portal-backend:latest
docker push amer30004ever/amer-portal-frontend:latest

# ============================================
# DOCKER COMPOSE (Local Development)
# ============================================

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v
```

### 7.2 Kubernetes Commands

```powershell
# ============================================
# NAMESPACE & POD MANAGEMENT
# ============================================

# Create namespace
kubectl create namespace amer-portal

# List all pods in namespace
kubectl get pods -n amer-portal

# List all services
kubectl get svc -n amer-portal

# Describe pod (for troubleshooting)
kubectl describe pod -n amer-portal <pod-name>

# View pod logs
kubectl logs -n amer-portal <pod-name>
kubectl logs -n amer-portal -l app=backend -f

# ============================================
# DEPLOYMENT MANAGEMENT
# ============================================

# Apply deployment
kubectl apply -f deployment.yaml

# Delete deployment
kubectl delete -f deployment.yaml

# Restart deployment
kubectl rollout restart -n amer-portal deployment/backend
kubectl rollout restart -n amer-portal deployment/frontend

# Check rollout status
kubectl rollout status -n amer-portal deployment/backend

# Scale deployment
kubectl scale -n amer-portal deployment/backend --replicas=3
kubectl scale -n amer-portal deployment/frontend --replicas=3

# ============================================
# SERVICE MANAGEMENT
# ============================================

# Expose deployment as service
kubectl expose deployment backend -n amer-portal --port=3001 --target-port=3001

# Port forward for local testing
kubectl port-forward -n amer-portal svc/frontend 3000:3000
kubectl port-forward -n amer-portal svc/backend 3001:3001

# ============================================
# SECRETS & CONFIGMAPS
# ============================================

# Create secret from literal
kubectl create secret generic my-secret -n amer-portal --from-literal=key=value

# Create secret from file
kubectl create secret generic cloudflare-tunnel-secret -n amer-portal --from-file=credentials.json

# View secret (base64 decoded)
kubectl get secret cloudflare-tunnel-secret -n amer-portal -o jsonpath='{.data.credentials\.json}' | base64 -d

# Edit configmap
kubectl edit configmap cloudflare-tunnel-config -n amer-portal
```

### 7.3 Cloudflare Tunnel Commands

```powershell
# ============================================
# TUNNEL MANAGEMENT
# ============================================

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create <tunnel-name>

# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete <tunnel-name> -f

# ============================================
# DNS ROUTES
# ============================================

# Add DNS route
cloudflared tunnel route dns <tunnel-id> <domain>

# List DNS routes
cloudflared tunnel route dns list <tunnel-id>

# Delete DNS route
cloudflared tunnel route dns delete <tunnel-id> <domain>

# ============================================
# RUN TUNNEL
# ============================================

# Run with config file
cloudflared tunnel run --config ~/.cloudflared/config.yml

# Run with token
cloudflared tunnel run --token <tunnel-token>

# Quick tunnel (trycloudflare)
cloudflared tunnel --url http://localhost:3000
```

### 7.4 DNS & Network Commands

```powershell
# ============================================
# DNS VERIFICATION
# ============================================

# Check A records
nslookup amer-portal.cc.cd
Resolve-DnsName -Name amer-portal.cc.cd -Type A

# Check CNAME records
Resolve-DnsName -Name amer-portal.cc.cd -Type CNAME

# Check nameservers
Resolve-DnsName -Name amer-portal.cc.cd -Type NS

# Flush DNS cache
ipconfig /flushdns

# Use specific DNS server
nslookup amer-portal.cc.cd 8.8.8.8
nslookup amer-portal.cc.cd 1.1.1.1

# ============================================
# CONNECTIVITY TESTS
# ============================================

# Test HTTP/HTTPS connectivity
Test-NetConnection amer-portal.cc.cd -Port 443
curl https://amer-portal.cc.cd -Method Head

# Trace route
tracert amer-portal.cc.cd

# Check SSL certificate
openssl s_client -connect amer-portal.cc.cd:443 -servername amer-portal.cc.cd
```

---

## Phase 8: Troubleshooting Guide

### 8.1 Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Error 1033** | "Cloudflare Tunnel error - cannot resolve host" | Verify DNS records, check tunnel is running |
| **CrashLoopBackOff** | Pod repeatedly restarting | Check logs, verify credentials.json format |
| **Connection Refused** | Tunnel can't reach origin | Verify service endpoints, check port forwarding |
| **DNS Not Resolving** | Domain doesn't resolve | Check nameserver propagation (wait 5-15 min) |
| **Certificate Error** | Browser shows invalid certificate | Verify domain is proxied (orange cloud) |

### 8.2 Troubleshooting Commands

```powershell
# ============================================
# DIAGNOSTIC SCRIPTS
# ============================================

# Complete health check script
$healthScript = @'
Write-Host "=== Amer Portal Health Check ===" -ForegroundColor Blue
Write-Host ""

Write-Host "1. Kubernetes Pods:" -ForegroundColor Yellow
kubectl get pods -n amer-portal

Write-Host "`n2. Kubernetes Services:" -ForegroundColor Yellow
kubectl get svc -n amer-portal

Write-Host "`n3. Tunnel Pod Logs (last 5 lines):" -ForegroundColor Yellow
kubectl logs -n amer-portal -l app=cloudflare-tunnel --tail=5

Write-Host "`n4. DNS Resolution:" -ForegroundColor Yellow
Resolve-DnsName amer-portal.cc.cd -ErrorAction SilentlyContinue

Write-Host "`n5. HTTP Endpoint Test:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://amer-portal.cc.cd/api/v1/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ API is healthy (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ API is unreachable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n6. SSL Certificate:" -ForegroundColor Yellow
$uri = "https://amer-portal.cc.cd"
$webRequest = [System.Net.WebRequest]::Create($uri)
$webRequest.ServerCertificateValidationCallback = {$true}
try {
    $webRequest.GetResponse() | Out-Null
    $cert = $webRequest.ServicePoint.Certificate
    Write-Host "✅ Certificate valid until: $($cert.GetExpirationDateString())" -ForegroundColor Green
} catch {
    Write-Host "❌ SSL certificate error" -ForegroundColor Red
}
'@

# Save and run health check
$healthScript | Out-File -FilePath "health-check.ps1" -Encoding utf8
.\health-check.ps1
```

### 8.3 Recovery Procedures

```powershell
# ============================================
# FULL RECOVERY SCRIPT
# ============================================

# Complete reset script
$resetScript = @'
Write-Host "=== Amer Portal Full Reset ===" -ForegroundColor Red
Write-Host "This will delete all resources and recreate them." -ForegroundColor Yellow
$confirm = Read-Host "Are you sure? (y/n)"
if ($confirm -ne 'y') { exit }

Write-Host "1. Deleting Kubernetes resources..." -ForegroundColor Yellow
kubectl delete namespace amer-portal

Write-Host "2. Deleting Cloudflare tunnel..." -ForegroundColor Yellow
cloudflared tunnel delete cluster -f

Write-Host "3. Deleting local credentials..." -ForegroundColor Yellow
Remove-Item "$env:USERPROFILE\.cloudflared\*.json" -Force

Write-Host "4. Recreating namespace..." -ForegroundColor Yellow
kubectl create namespace amer-portal

Write-Host "5. Re-deploying applications..." -ForegroundColor Yellow
kubectl apply -f postgres-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

Write-Host "6. Recreating tunnel..." -ForegroundColor Yellow
cloudflared tunnel login
cloudflared tunnel create cluster
$tunnelId = (cloudflared tunnel list | Select-String "cluster").ToString().Split()[0]
cloudflared tunnel route dns $tunnelId amer-portal.cc.cd
cloudflared tunnel route dns $tunnelId api.amer-portal.cc.cd

Write-Host "7. Deploying tunnel..." -ForegroundColor Yellow
kubectl apply -f cloudflare-tunnel-config.yaml

Write-Host "✅ Reset complete!" -ForegroundColor Green
'@

$resetScript | Out-File -FilePath "full-reset.ps1" -Encoding utf8
```

---

## Phase 9: Maintenance & Monitoring

### 9.1 Monitoring Dashboard

```powershell
# Kubernetes dashboard
kubectl port-forward -n kubernetes-dashboard service/kubernetes-dashboard 8443:443

# Access: https://localhost:8443

# Metrics server
kubectl top nodes
kubectl top pods -n amer-portal

# Output example:
# NAME           CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# masternode01   250m         12%    2GB             25%
# workernode01   500m         25%    4GB             50%
```

### 9.2 Log Management

```powershell
# ============================================
# LOG COLLECTION SCRIPT
# ============================================

$logDir = "C:\logs\amer-portal\$(Get-Date -Format 'yyyyMMdd')"
New-Item -Path $logDir -ItemType Directory -Force

# Collect all logs
Write-Host "Collecting logs to: $logDir" -ForegroundColor Green

kubectl logs -n amer-portal deployment/backend > "$logDir\backend.log"
kubectl logs -n amer-portal deployment/frontend > "$logDir\frontend.log"
kubectl logs -n amer-portal deployment/postgres > "$logDir\postgres.log"
kubectl logs -n amer-portal deployment/cloudflare-tunnel > "$logDir\tunnel.log"

# Get pod status
kubectl get pods -n amer-portal > "$logDir\pods.txt"

# Get service status
kubectl get svc -n amer-portal > "$logDir\services.txt"

# Get events
kubectl get events -n amer-portal > "$logDir\events.txt"

Compress-Archive -Path "$logDir\*" -DestinationPath "$logDir\logs.zip"
Write-Host "Logs collected and compressed to $logDir\logs.zip" -ForegroundColor Green
```

### 9.3 Auto-Restart Configuration

```yaml
# Add to deployment.yaml for auto-restart on failure
spec:
  template:
    spec:
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          # ... existing config ...
          livenessProbe:
            httpGet:
              path: /ready
              port: 2000
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 2000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
```

### 9.4 Backup Strategy

```powershell
# ============================================
# BACKUP SCRIPT
# ============================================

$backupDir = "C:\backups\amer-portal\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -Path $backupDir -ItemType Directory -Force

# Backup Kubernetes resources
Write-Host "Backing up Kubernetes resources..." -ForegroundColor Yellow
kubectl get all -n amer-portal -o yaml > "$backupDir\all-resources.yaml"
kubectl get configmap -n amer-portal -o yaml > "$backupDir\configmaps.yaml"
kubectl get secret -n amer-portal -o yaml > "$backupDir\secrets.yaml"

# Backup tunnel credentials
Copy-Item "$env:USERPROFILE\.cloudflared\*.json" $backupDir

# Backup Docker images
docker save amer30004ever/amer-portal-backend:latest | Out-File "$backupDir\backend-image.tar"
docker save amer30004ever/amer-portal-frontend:latest | Out-File "$backupDir\frontend-image.tar"

Write-Host "Backup completed to: $backupDir" -ForegroundColor Green
```

---

## Appendix

### A. Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `DOCKER_HUB_USERNAME` | amer30004ever | Docker Hub registry username |
| `CLOUDFLARE_ACCOUNT_TAG` | 5974977c768416623e5ec8bf7ba6a070 | Cloudflare account identifier |
| `TUNNEL_ID` | b87510bf-f586-42aa-ab0c-b1a24206768a | Cloudflare tunnel identifier |
| `DOMAIN` | amer-portal.cc.cd | Primary application domain |
| `API_DOMAIN` | api.amer-portal.cc.cd | API endpoint domain |

### B. File Structure Complete

```
amer-portal/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── auth/
│       ├── users/
│       └── health/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── pages/
│       ├── components/
│       └── styles/
├── kubernetes/
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── postgres-deployment.yaml
│   └── cloudflare-tunnel-config.yaml
├── scripts/
│   ├── build-and-push.ps1
│   ├── health-check.ps1
│   ├── backup.ps1
│   └── reset.ps1
└── docker-compose.yaml
```

### C. Success Metrics Dashboard

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Uptime** | 99.9% | 100% | ✅ |
| **Response Time** | <200ms | 48ms | ✅ |
| **Tunnel Connections** | 2+ | 4 | ✅ |
| **SSL Validity** | 90+ days | 90 days | ✅ |
| **Pod Health** | All Running | 4/4 | ✅ |
| **DNS Propagation** | Global | Complete | ✅ |

---

## Document Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **DevOps Engineer** | Amer Magdi | ✅ | 2026-05-22 |
| **System Administrator** | Amer Magdi | ✅ | 2026-05-22 |
| **Security Lead** | Amer Magdi | ✅ | 2026-05-22 |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-21 | Amer Magdi | Initial draft |
| 1.5 | 2026-05-21 | Amer Magdi | Added troubleshooting |
| 2.0 | 2026-05-22 | Amer Magdi | Complete production documentation |
| 2.1 | 2026-06-02 | Amer Magdi | Prisma migrate/seed replaces init-db.sh; doc index links |

---

## Contact Information

| Purpose | Contact |
|---------|---------|
| **Technical Support** | infrastructure@amer-portal.com |
| **Security Issues** | security@amer-portal.com |
| **Emergency** | +20 1210252836 |

---

**Document Status:** ✅ FINAL - PRODUCTION READY  
**System Health:** 🟢 OPERATIONAL  
**Next Review:** 2026-06-22  

---

*This document represents the complete production deployment of Amer Portal. All systems are operational and verified.* 🚀
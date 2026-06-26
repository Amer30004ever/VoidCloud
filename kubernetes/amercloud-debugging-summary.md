# AmerCloud VPS Hosting — Debugging Summary

Last updated: 2026-06-24 (verified on homelab cluster)

## Verification results (2026-06-24)

| Check | Result |
|-------|--------|
| Backend pod | Running (single container, no duplicate) |
| Proxmox API | HTTP 200 from backend pod |
| VPS create via API | **Success** — VMID **104**, IP **10.51.100.51** |
| `pct list` on Proxmox | **104 running** — `ps-verify-1782331661333` |
| Cloud plans API | 5 plans returned |
| Postgres | Running |

## PowerShell ops (preferred — no UI)

From `kubernetes/`:

```powershell
Copy-Item proxmox.env.example proxmox.env   # first time; set PROXMOX_TOKEN_SECRET
.\AmerCloud.ps1 -Action Setup              # secrets + deployment + seed
.\AmerCloud.ps1 -Action Test               # full health check
.\AmerCloud.ps1 -Action FixProxmoxToken    # one-time ACL fix if 403 on LXC create
.\AmerCloud.ps1 -Action CleanStuck         # remove stuck PROVISIONING rows
.\AmerCloud.ps1 -Action CreateVps          # login + create VPS + pct list
.\AmerCloud.ps1 -Action ListVps
.\AmerCloud.ps1 -Action DeleteVps -Id <uuid>
.\AmerCloud.ps1 -Action ProxmoxPctList
.\AmerCloud.ps1 -Action All                # setup + test + clean + create
```

Legacy wrappers still work: `AmerCloud-Setup-Backend.ps1`, `AmerCloud-Test.ps1`, `AmerCloud-Vps-Api-Test.ps1`.

## Admin credentials (homelab)

| Field | Value |
|-------|-------|
| Email | amer30004ever@hotmail.com |
| Password | Admin123 |

## Proxmox configuration (verified)

| Variable | Value | Notes |
|----------|-------|-------|
| PROXMOX_HOST | https://10.51.100.10:8006 | |
| PROXMOX_TOKEN_ID | root@pam!Amer-Cloud | Use single quotes in bash |
| PROXMOX_NODE | **proxmox** | Proxmox node name — **not** K8s worker `workernode01` |
| PROXMOX_STORAGE | local-lvm | |
| PROXMOX_TEMPLATE | local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst | |
| PROXMOX_VERIFY_TLS | false | |
| NODE_TLS_REJECT_UNAUTHORIZED | 0 | Workaround until new backend image with native https client |

## Issues found and fixed

1. **Duplicate backend container** — `kubectl create deployment` + `kubectl apply` merged two containers → EADDRINUSE. Fix: `kubectl replace --force` (now in setup scripts).
2. **Missing PROXMOX_TOKEN_ID in pod** — inline env from manual deploy omitted token → stub mode. Fix: use `voidcloud-secrets` via manifest.
3. **Wrong PROXMOX_NODE** — was `workernode01` (K8s node); must be `proxmox` (PVE node).
4. **Proxmox token 403** — token had zero ACLs. Fix: `.\AmerCloud.ps1 -Action FixProxmoxToken`.
5. **TLS cert error on Proxmox API** — deployed image uses `fetch` without agent. Fix: `NODE_TLS_REJECT_UNAUTHORIZED=0` in deployment (or rebuild backend with `proxmox.service.ts` https fix).
6. **Stuck PROVISIONING** — failed creates block plan limit. Fix: `.\AmerCloud.ps1 -Action CleanStuck` or `-Action DeleteVps`.

## Known follow-up

- DB may show `FAILED` after successful Proxmox create if legacy K8s provision fails in background — container still runs on Proxmox; rebuild backend image to ship native Proxmox https client and consider decoupling legacy k8s provision.
- Assign admin user to `free` plan if storage limit errors occur (use 1024 MB storage in API tests).
- UI tasks still open: notifications z-index, webhooks page, custom plan form.

## File map

| File | Purpose |
|------|---------|
| `AmerCloud.ps1` | Main CLI for all ops actions |
| `AmerCloud-Lib.ps1` | Shared helpers |
| `scripts/vps-create-test.js` | Login + create VPS inside backend pod |
| `scripts/vps-api.js` | List/delete deployments via API |
| `scripts/proxmox-ping.js` | Proxmox connectivity test |
| `backend/deployment.yaml` | Canonical backend manifest |

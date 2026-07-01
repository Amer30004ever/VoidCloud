---
name: Proxmox multi-cluster
description: Super Admin can add/manage multiple Proxmox clusters from the settings page; multi-cluster proxy at /api/proxmox-cluster
---

Proxmox cluster configs stored in `localStorage["proxmox_clusters"]`. Managed from `/amercloud/admin/clusters`.

**Multi-cluster proxy** at `frontend/src/app/api/proxmox-cluster/route.ts`:
- POST: accepts X-Proxmox-Host, X-Proxmox-Token-Id, X-Proxmox-Token-Secret, X-Proxmox-Path, X-Proxmox-Method headers
- GET: test connectivity — accepts ?host=, ?tokenId=, ?secret= query params; returns { ok, version, release }
- Falls back to PROXMOX_HOST / PROXMOX_TOKEN_ID / PROXMOX_TOKEN_SECRET env vars if headers absent

**Smart scheduler** in clusters page: fetches node status + qemu list from each cluster; picks the cluster with most headroom (CPU 40% + RAM 40% + disk 20% weighting) that satisfies requested VM specs.

Default cluster: `{ id: "primary", host: "10.51.100.10", node: "proxmox", storage: "raid-vms", bridge: "vmbr1" }`.

**Why:** User requested multi-cluster management + auto-failover scheduling without backend changes.
**How to apply:** The original /api/proxmox proxy still works for single-cluster use; new /api/proxmox-cluster is used by clusters page and any future VPS provisioning with cluster selection.

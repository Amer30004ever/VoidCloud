---
name: Proxmox multi-cluster
description: Super Admin can add/manage multiple Proxmox clusters from the settings page
---

Proxmox cluster configs are stored in `localStorage` under key `proxmox_clusters` (array of `ProxmoxCluster` objects). Managed from `/amercloud/admin/settings` tab "Proxmox Clusters".

Default cluster: `{ id: "primary", host: "10.51.100.10", node: "proxmox", storage: "raid-vms", bridge: "vmbr1", gateway: "10.51.100.1" }`.

The VPS page (`/amercloud/admin/vps`) reads the same key to populate the cluster selector dropdown.

**Why:** User requested ability to add multiple Proxmox clusters for scalability without backend changes.

**How to apply:** Any Proxmox API call should check `localStorage.proxmox_clusters` for the selected cluster's host/node. The frontend proxmox proxy (`/api/proxmox/`) currently uses a single hardcoded cluster — extend the proxy to accept a cluster ID param if full multi-cluster support is needed backend-side.

# Tenant VM Network Isolation — Audit & Remediation (Prompt 0.15)

**Status:** Implemented (code-side isolation controls). Live two-VM verification
must be run against the real Proxmox cluster (see "Verification" below).

## 1. Current topology (as found in the repo)

The VPS provisioner (`services/vps/src/proxmox/proxmox.service.ts`) attaches every
tenant VM to a **single shared Proxmox bridge** (`PROXMOX_BRIDGE`, default `vmbr0`)
in a **single flat IP pool** (`PROXMOX_IP_POOL_CIDR`, e.g. `10.51.100.0/24`):

```
net0: name=eth0,bridge=vmbr0,ip=<ip>/24,gw=10.51.100.1
```

- No VLAN tag is set on any VM.
- No per-VM firewall is configured.
- There is no Proxmox-level policy separating tenants.

### Finding 1 — all tenant VMs share one L2 broadcast domain
Because every VM is on the same bridge with no VLAN and no firewall, tenants are
on the same Layer-2 segment. A compromised or malicious tenant VM can, on this
segment:
- ARP-spoof neighbouring tenant VMs,
- sniff/capture east-west traffic,
- port-scan the rest of the pool.

**Severity: High.**

### Finding 2 — potential reachability to the Kubernetes-internal network
The bridge upstream (`vmbr0`/`vmbr1`) is wired by the operator. If that bridge
provides a path (via the gateway or L2 adjacency) into the Kubernetes-internal
CIDRs (Pod/Service CIDRs such as `10.42.0.0/16`, `10.96.0.0/12`, `172.16.0.0/12`
— the networks hosting Postgres, Redis, RabbitMQ and the 13 microservices), a
compromised tenant VM could attack the platform's own control plane.

This was **not provable from the repo alone** (it depends on the physical/upstream
switch wiring), so we treat it as the worst-case and block it by default.

**Severity: Critical (if reachable).**

## 2. Remediation implemented

A per-VM isolation layer in `services/vps/src/proxmox/vm-network-isolation.ts`,
applied automatically on every `createContainer` and `reinstallContainer`:

1. **Per-VM Proxmox firewall (always on).** Generates a `raw` iptables ruleset
   that, for each tenant VM:
   - **DROPs all egress to the VM IP pool** (`10.51.100.0/24`) → blocks VM↔VM.
   - **DROPs all ingress from the VM IP pool** → blocks neighbour spoofing/scans.
   - **DROPs all traffic to every Kubernetes-internal CIDR** (configurable via
     `PROXMOX_K8S_INTERNAL_CIDRS`) → protects the control plane.
   - Allows `lo`, `ESTABLISHED,RELATED`, the gateway, and general outbound to the
     internet so the customer's VM still works.
   - Default policies `INPUT DROP` / `OUTPUT DROP` with an explicit allow for
     legitimate egress.

2. **Optional per-tenant VLAN (defence-in-depth, env-gated).** When
   `PROXMOX_VLAN_PER_TENANT=true`, each VM is tagged with a deterministic 802.1Q
   VLAN derived from its tenant id (`vlanForTenant`). This requires the bridge and
   upstream switch to carry VLANs; the firewall above holds regardless.

### Configuration added
| Env var | Default | Purpose |
|---|---|---|
| `PROXMOX_K8S_INTERNAL_CIDRS` | common K8s pod/service CIDRs | CIDRs tenant VMs must never reach |
| `PROXMOX_VLAN_PER_TENANT` | `false` | enable per-tenant 802.1Q VLAN tagging |

Wired into `kubernetes/vps/deployment.yaml` and `kubernetes/configmaps.yaml`;
documented in `kubernetes/proxmox.env.example`.

## 3. Verification

### In-repo (automated) — `services/vps/src/proxmox/vm-network-isolation.spec.ts`
Proves the generated ruleset blocks east-west and K8s-internal destinations while
allowing the gateway and public internet:

```
cd tests && npx jest --config jest.config.cjs --rootDir .. \
  services/vps/src/proxmox/vm-network-isolation.spec.ts
```

Covers: tenant VM pool blocked, every K8s-internal CIDR blocked, gateway/internet
allowed, VLAN determinism, and CIDR math.

### Live (operator-run, requires the real cluster)
1. Provision two test VMs (tenant A, tenant B) on the shared bridge.
2. From VM A: `ping 10.51.100.<VM-B>` and `nc -vz 10.51.100.<VM-B> 22` →
   **must fail** (VM-to-VM blocked).
3. From VM A: `ping 10.42.0.1` / `nc -vz 10.96.0.1 443` (K8s-internal) →
   **must fail** (control-plane blocked).
4. From VM A: `curl https://example.com` → **must succeed** (internet allowed).
5. Confirm each VM's Proxmox firewall shows `enable=1` with the generated ruleset.

If step 2 or 3 succeeds, the upstream bridge is exposing tenant/K8s traffic and
must be re-segmented (move tenant bridge off any path to the K8s network, or enable
`PROXMOX_VLAN_PER_TENANT=true` with VLAN-aware switching) before go-live.

## 4. Residual risk / follow-ups
- The firewall is applied at VM creation; **pre-existing VMs provisioned before
  this change are NOT isolated** — re-run `reinstallContainer` (or apply the
  firewall ruleset manually) for them, or enforce isolation at the bridge/switch.
- If the upstream bridge currently bridges tenant traffic into the K8s network,
  the VM firewall mitigates L3 but the operator should still remove that L2 path.
- Centralised firewall management + alerting on rule drift is a future hardening
  step (Prompt 6.x).

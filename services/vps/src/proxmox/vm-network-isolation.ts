/**
 * Tenant VM network isolation.
 *
 * The VPS provisioner puts every tenant VM onto a single shared Proxmox bridge
 * (e.g. vmbr0/vmbr1) in one IP pool (e.g. 10.51.100.0/24) with no VLAN tag and
 * no per-VM firewall. That means all tenants share one L2 broadcast domain
 * (ARP spoofing / sniffing between tenants is possible) and, depending on how
 * the bridge is wired upstream, tenant VMs may be able to reach the Kubernetes
 * internal network that hosts Postgres/Redis/RabbitMQ and the 13 microservices.
 *
 * This module implements the always-on mitigation the audit (Prompt 0.15)
 * requires: a per-VM Proxmox firewall that, by default, BLOCKS
 *   1. all east-west traffic to other tenant VMs in the same IP pool, and
 *   2. all traffic to the Kubernetes-internal CIDR range(s),
 * while still allowing the VM to reach the internet (and the gateway/DNS).
 *
 * It additionally supports optional per-tenant VLAN tagging (env-gated) for
 * defence-in-depth when the bridge/switch supports 802.1Q. VLANs are NOT
 * required for the firewall-based isolation to hold.
 */

export interface IsolationConfig {
  /** Bridge the VM is attached to (e.g. vmbr0). */
  bridge: string;
  /** VM IP pool CIDR, e.g. "10.51.100.0/24". Used to block east-west. */
  poolCidr: string;
  /** Kubernetes-internal CIDRs that tenant VMs must never reach. */
  k8sInternalCidrs: string[];
  /** Gateway the VM uses (allowed for egress/NAT). */
  gateway: string;
  /** When true, derive a deterministic VLAN tag per tenant. */
  vlanPerTenant: boolean;
}

export const DEFAULT_K8S_INTERNAL_CIDRS = [
  '10.42.0.0/16', // default Flannel/Calico pod CIDR
  '10.43.0.0/16', // default Calico/service CIDR variant
  '10.244.0.0/16', // default Flannel pod CIDR variant
  '10.96.0.0/12', // default K8s service CIDR
  '172.16.0.0/12', // private range often used for cluster-internal nets
];

export function loadIsolationConfig(env: NodeJS.ProcessEnv = process.env): IsolationConfig {
  const poolCidr = (env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24').split('/')[0].endsWith('.0')
    ? env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24'
    : `${env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24'.split('/')[0]}.0/24`;

  const k8sInternalCidrs = env.PROXMOX_K8S_INTERNAL_CIDRS
    ? env.PROXMOX_K8S_INTERNAL_CIDRS.split(',').map((c) => c.trim()).filter(Boolean)
    : DEFAULT_K8S_INTERNAL_CIDRS;

  return {
    bridge: env.PROXMOX_BRIDGE ?? 'vmbr0',
    poolCidr: normalizePoolCidr(env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24'),
    k8sInternalCidrs,
    gateway: env.PROXMOX_GATEWAY ?? '',
    vlanPerTenant: env.PROXMOX_VLAN_PER_TENANT === 'true',
  };
}

function normalizePoolCidr(cidr: string): string {
  const [base, mask] = cidr.split('/');
  const parts = base.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/${mask ?? '24'}`;
  }
  return cidr;
}

/** Deterministic VLAN tag (2-4094) from a tenant id. Stable across reboots. */
export function vlanForTenant(tenantId: string | number): number {
  const n = typeof tenantId === 'number' ? tenantId : hashString(String(tenantId));
  // Keep within usable VLAN range and avoid reserved 1.
  return 2 + (n % 4093);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Build the Proxmox `net0` device string, optionally tagging a per-tenant VLAN.
 */
export function buildNet0(
  cfg: IsolationConfig,
  ip: string,
  opts?: { vlanTag?: number; gateway?: string },
): string {
  const vlan = opts?.vlanTag && opts.vlanTag > 0 ? `,tag=${opts.vlanTag}` : '';
  const gw = opts?.gateway ?? cfg.gateway;
  return `name=eth0,bridge=${cfg.bridge}${vlan},ip=${ip}/24${gw ? `,gw=${gw}` : ''}`;
}

/**
 * Build the Proxmox VM firewall `raw` ruleset that enforces isolation.
 *
 * Direction model (Proxmox VM firewall, `raw` prerouting/postrouting style):
 *  - We block OUTBOUND traffic from the VM destined to the VM IP pool
 *    (other tenants) or to any K8s-internal CIDR.
 *  - We block INBOUND traffic from the VM IP pool (spoofed/scanning邻居).
 *  - Established/related and loopback are allowed; egress to "the world"
 *    (anything not in the blocked sets) is allowed so the VM can serve the
 *    customer. DNS to the gateway and the gateway itself are allowed.
 *
 * Returns the full `raw` ruleset string (no leading "security" prefix).
 */
export function buildFirewallRaw(cfg: IsolationConfig): string {
  const lines: string[] = [];

  // --- Base policy ---
  lines.push('# VoidCloud tenant VM isolation firewall (generated)');
  lines.push('*filter');
  lines.push(':INPUT DROP [0:0]');
  lines.push(':FORWARD DROP [0:0]');
  lines.push(':OUTPUT DROP [0:0]');

  // Allow loopback and established/related in both directions.
  lines.push('-A INPUT -i lo -j ACCEPT');
  lines.push('-A OUTPUT -o lo -j ACCEPT');
  lines.push('-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT');
  lines.push('-A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT');

  // --- Block K8s-internal egress (critical: protect control plane) ---
  for (const cidr of cfg.k8sInternalCidrs) {
    lines.push(`# block tenant VM -> k8s-internal ${cidr}`);
    lines.push(`-A OUTPUT -d ${cidr} -j DROP`);
    lines.push(`-A INPUT -s ${cidr} -j DROP`);
  }

  // --- Block east-west between tenant VMs in the same pool ---
  lines.push(`# block tenant VM <-> tenant VM (pool ${cfg.poolCidr})`);
  lines.push(`-A OUTPUT -d ${cfg.poolCidr} -j DROP`);
  lines.push(`-A INPUT -s ${cfg.poolCidr} -j DROP`);

  // --- Allow the gateway (NAT egress / DNS) so the VM can reach the internet ---
  if (cfg.gateway) {
    lines.push(`# allow gateway ${cfg.gateway} (NAT + DNS upstream)`);
    lines.push(`-A OUTPUT -d ${cfg.gateway} -j ACCEPT`);
    lines.push(`-A INPUT -s ${cfg.gateway} -j ACCEPT`);
  }

  // --- Allow outbound internet (everything not explicitly dropped above) ---
  lines.push('# allow general outbound to the internet');
  lines.push('-A OUTPUT -j ACCEPT');

  // --- Allow inbound only for established/related (already above); drop all else ---
  lines.push('COMMIT');
  return lines.join('\n');
}

/** True if `destIp` is in a range this firewall blocks (for tests/verification). */
export function isBlockedDestination(
  cfg: IsolationConfig,
  destIp: string,
): boolean {
  if (cfg.k8sInternalCidrs.some((c) => ipInCidr(destIp, c))) return true;
  if (ipInCidr(destIp, cfg.poolCidr)) return true;
  return false;
}

// ---------- CIDR helpers (kept dependency-free, unit-tested) ----------

export function ipToLong(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const slash = cidr.split('/');
  const maskBits = Number(slash[1] ?? '32');
  const netLong = ipToLong(slash[0]);
  const ipLong = ipToLong(ip);
  if (netLong === null || ipLong === null) return false;
  if (maskBits === 0) return true;
  const mask = (0xffffffff << (32 - maskBits)) >>> 0;
  return (netLong & mask) === (ipLong & mask);
}

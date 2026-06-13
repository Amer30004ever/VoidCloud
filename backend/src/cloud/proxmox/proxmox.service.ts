import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as https from 'https';
import { getTemplateForPlan, TEMPLATE_MANIFEST, type TemplateId } from './template-manifest';

export interface ProvisionSpec {
  hostname: string;
  cpuCores: number;
  ramMB: number;
  storageGB: number;
  planSlug?: string;
  templateId?: TemplateId;
}

export interface ProvisionResult {
  vmid: number;
  ipv4Address: string;
  node: string;
  rootPassword: string;
}

export interface ContainerStatus {
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  cpuPercent: number;       // 0-100
  memUsedMB: number;
  memTotalMB: number;
  diskUsedGB: number;
  diskTotalGB: number;
  uptimeSec: number;
  netIn: number;
  netOut: number;
}

/**
 * Proxmox VE REST API client.
 *
 * Auth: API token (https://pve.proxmox.com/wiki/Proxmox_VE_API#API_Tokens).
 * Required env:
 *   PROXMOX_HOST            e.g. 10.0.0.10:8006
 *   PROXMOX_TOKEN_ID        e.g. amercloud@pve!api
 *   PROXMOX_TOKEN_SECRET    UUID secret
 *   PROXMOX_NODE            target node (default: workernode01)
 *   PROXMOX_STORAGE         e.g. local-lvm
 *   PROXMOX_BRIDGE          e.g. vmbr0
 *   PROXMOX_TEMPLATE        e.g. local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst
 *   PROXMOX_IP_POOL_CIDR    e.g. 10.51.100.0/24
 *   PROXMOX_IP_POOL_START   first usable host octet (default 50)
 *   PROXMOX_GATEWAY         e.g. 10.51.100.1
 *   PROXMOX_VERIFY_TLS      "false" to skip self-signed cert verification
 *
 * When env is incomplete, falls back to a deterministic STUB so dev preview
 * keeps working without a Proxmox cluster.
 */
@Injectable()
export class ProxmoxService {
  private readonly logger = new Logger(ProxmoxService.name);
  /** Comma-separated list, e.g. "pve-eg-1,pve-eg-2". Falls back to PROXMOX_NODE. */
  private readonly nodes: string[] = (process.env.PROXMOX_NODES || process.env.PROXMOX_NODE || 'workernode01')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  private readonly node = this.nodes[0];
  private readonly storage = process.env.PROXMOX_STORAGE ?? 'local-lvm';
  private readonly bridge = process.env.PROXMOX_BRIDGE ?? 'vmbr0';
  private readonly template = process.env.PROXMOX_TEMPLATE ?? 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst';
  private readonly gateway = process.env.PROXMOX_GATEWAY ?? '';
  private readonly ipBase = (process.env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24').split('/')[0].split('.').slice(0, 3).join('.');
  private nextHostOctet = Number(process.env.PROXMOX_IP_POOL_START || 50);
  /** Tracks IPs handed out this process to avoid double-allocation under concurrent provisions. */
  private readonly inFlightIps = new Set<string>();
  private readonly agent = new https.Agent({
    rejectUnauthorized: process.env.PROXMOX_VERIFY_TLS !== 'false',
  });

  isLive(): boolean {
    return Boolean(
      process.env.PROXMOX_HOST &&
        process.env.PROXMOX_TOKEN_ID &&
        process.env.PROXMOX_TOKEN_SECRET,
    );
  }

  /** Per-node / per-template overrides via env: PROXMOX_STORAGE_<NODE>, PROXMOX_BRIDGE_<NODE>, PROXMOX_TEMPLATE_<ID>. */
  private nodeTemplateConfig(node: string, templateId: number): { storage: string; bridge: string; ostemplate: string } {
    const upper = node.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return {
      storage: process.env[`PROXMOX_STORAGE_${upper}`] ?? this.storage,
      bridge: process.env[`PROXMOX_BRIDGE_${upper}`] ?? this.bridge,
      ostemplate: process.env[`PROXMOX_TEMPLATE_${templateId}`] ?? this.template,
    };
  }

  /** Pick the least-loaded online node (by cpu + mem%). Falls back to first node on error. */
  private async pickNode(): Promise<string> {
    if (this.nodes.length === 1) return this.nodes[0];
    try {
      const stats = await this.pveRequest<any[]>('GET', `/nodes`);
      const online = (stats ?? []).filter((n) => this.nodes.includes(n.node) && n.status === 'online');
      if (!online.length) return this.nodes[0];
      online.sort((a, b) => {
        const aLoad = (a.cpu ?? 0) + (a.mem ?? 0) / (a.maxmem || 1);
        const bLoad = (b.cpu ?? 0) + (b.mem ?? 0) / (b.maxmem || 1);
        return aLoad - bLoad;
      });
      this.logger.log(`Selected least-loaded node: ${online[0].node}`);
      return online[0].node;
    } catch (e: any) {
      this.logger.warn(`Node selection fallback (${e.message}); using ${this.nodes[0]}`);
      return this.nodes[0];
    }
  }

  // ---------------- HTTP ----------------

  private get baseUrl(): string {
    const host = process.env.PROXMOX_HOST!;
    return host.startsWith('http') ? host : `https://${host}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async pveRequest<T = any>(method: string, path: string, params?: Record<string, any>): Promise<T> {
    const url = `${this.baseUrl}/api2/json${path}`;
    const body = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : undefined;
    // Node fetch supports `dispatcher`/`agent` via undici in Node 22; pass through `--cap-add` style.
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body,
      // @ts-expect-error: undici accepts dispatcher; node 22 fetch picks up our https.Agent via global symbol
      agent: this.agent,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ServiceUnavailableException(`Proxmox ${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json?.data as T;
  }

  // ---------------- IP pool ----------------

  /** Take the next free IP from the configured pool. Concurrency-safe within process. */
  private async allocateIp(): Promise<string> {
    const used = new Set<number>(Array.from(this.inFlightIps).map((ip) => Number(ip.split('.')[3])));
    try {
      // Scan every configured node — IPs are pool-wide, not per-node.
      for (const node of this.nodes) {
        const list = await this.pveRequest<any[]>('GET', `/nodes/${node}/lxc`).catch(() => []);
        for (const ct of list ?? []) {
          try {
            const cfg = await this.pveRequest<any>('GET', `/nodes/${node}/lxc/${ct.vmid}/config`);
            const ip = String(cfg.net0 ?? '').match(/ip=([\d.]+)/)?.[1];
            if (ip?.startsWith(this.ipBase + '.')) used.add(Number(ip.split('.')[3]));
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`IP allocation fallback (could not list CTs): ${e.message}`);
    }
    while (used.has(this.nextHostOctet)) this.nextHostOctet++;
    if (this.nextHostOctet > 254) throw new ServiceUnavailableException('IP pool exhausted');
    const ip = `${this.ipBase}.${this.nextHostOctet++}`;
    this.inFlightIps.add(ip);
    return ip;
  }


  // ---------------- Public API ----------------

  async createContainer(spec: ProvisionSpec): Promise<ProvisionResult> {
    const rootPassword = randomBytes(12).toString('base64url');
    const templateId = spec.templateId ?? getTemplateForPlan(spec.planSlug);
    const template = TEMPLATE_MANIFEST[templateId];
    this.logger.log(
      `Provisioning request: plan=${spec.planSlug ?? 'n/a'} template=${templateId} (${template.displayName}) ` +
      `hostname=${spec.hostname} cpu=${spec.cpuCores} ram=${spec.ramMB}MB disk=${spec.storageGB}GB`,
    );

    if (!this.isLive()) {
      const vmid = 1000 + Math.floor(Math.random() * 9000);
      const ipv4Address = `${this.ipBase}.${this.nextHostOctet++}`;
      this.logger.log(`[STUB] proxmox clone template=${templateId} → vmid=${vmid} ip=${ipv4Address}`);
      return { vmid, ipv4Address, node: this.node, rootPassword };
    }



    const targetNode = await this.pickNode();
    const cfg = this.nodeTemplateConfig(targetNode, templateId);
    const nextId = await this.pveRequest<string>('GET', `/cluster/nextid`);
    const vmid = Number(nextId);
    const ipv4Address = await this.allocateIp();
    const cores = Math.max(1, Math.ceil(spec.cpuCores));
    const params = {
      vmid,
      hostname: spec.hostname.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60),
      ostemplate: cfg.ostemplate,
      storage: cfg.storage,
      cores,
      memory: spec.ramMB,
      swap: Math.max(256, Math.floor(spec.ramMB / 2)),
      rootfs: `${cfg.storage}:${spec.storageGB}`,
      net0: `name=eth0,bridge=${cfg.bridge},ip=${ipv4Address}/24${this.gateway ? `,gw=${this.gateway}` : ''}`,
      password: rootPassword,
      unprivileged: 1,
      onboot: 1,
      start: 1,
      features: 'nesting=1',
    };
    try {
      await this.pveRequest('POST', `/nodes/${targetNode}/lxc`, params);
    } catch (e) {
      // Release the IP back on failure so the next provision can reuse it.
      this.inFlightIps.delete(ipv4Address);
      throw e;
    }
    this.logger.log(`Proxmox created LXC vmid=${vmid} ip=${ipv4Address} node=${targetNode} template=${templateId}`);
    return { vmid, ipv4Address, node: targetNode, rootPassword };
  }


  async startContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) { this.logger.log(`[STUB] start vmid=${vmid}`); return; }
    await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/start`);
  }

  async stopContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) { this.logger.log(`[STUB] stop vmid=${vmid}`); return; }
    await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`);
  }

  async rebootContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) { this.logger.log(`[STUB] reboot vmid=${vmid}`); return; }
    await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/reboot`);
  }

  async destroyContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) { this.logger.log(`[STUB] destroy vmid=${vmid}`); return; }
    try { await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/stop`); } catch { /* may already be stopped */ }
    await this.pveRequest('DELETE', `/nodes/${node}/lxc/${vmid}`, { purge: 1, 'destroy-unreferenced-disks': 1 });
  }

  async resizeContainer(vmid: number, spec: { cpuCores?: number; ramMB?: number; storageGB?: number }, node = this.node): Promise<void> {
    if (!this.isLive()) { this.logger.log(`[STUB] resize vmid=${vmid} ${JSON.stringify(spec)}`); return; }
    const cfg: Record<string, any> = {};
    if (spec.cpuCores) cfg.cores = Math.max(1, Math.ceil(spec.cpuCores));
    if (spec.ramMB) { cfg.memory = spec.ramMB; cfg.swap = Math.max(256, Math.floor(spec.ramMB / 2)); }
    if (Object.keys(cfg).length) await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, cfg);
    if (spec.storageGB) {
      await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/resize`, { disk: 'rootfs', size: `${spec.storageGB}G` });
    }
  }

  /** Reinstall = destroy + recreate with same VMID + same IP (best effort). */
  async reinstallContainer(vmid: number, spec: ProvisionSpec, ipv4: string, node = this.node): Promise<{ rootPassword: string }> {
    const rootPassword = randomBytes(12).toString('base64url');
    if (!this.isLive()) { this.logger.log(`[STUB] reinstall vmid=${vmid}`); return { rootPassword }; }
    const templateId = spec.templateId ?? getTemplateForPlan(spec.planSlug);
    const cfg = this.nodeTemplateConfig(node, templateId);
    await this.destroyContainer(vmid, node);
    await this.pveRequest('POST', `/nodes/${node}/lxc`, {
      vmid,
      hostname: spec.hostname,
      ostemplate: cfg.ostemplate,
      storage: cfg.storage,
      cores: Math.max(1, Math.ceil(spec.cpuCores)),
      memory: spec.ramMB,
      swap: Math.max(256, Math.floor(spec.ramMB / 2)),
      rootfs: `${cfg.storage}:${spec.storageGB}`,
      net0: `name=eth0,bridge=${cfg.bridge},ip=${ipv4}/24${this.gateway ? `,gw=${this.gateway}` : ''}`,
      password: rootPassword,
      unprivileged: 1, onboot: 1, start: 1, features: 'nesting=1',
    });
    return { rootPassword };
  }

  async setRootPassword(vmid: number, node = this.node): Promise<{ rootPassword: string }> {
    const rootPassword = randomBytes(12).toString('base64url');
    if (!this.isLive()) { this.logger.log(`[STUB] set-root-pw vmid=${vmid}`); return { rootPassword }; }
    // PVE LXC accepts password reset via the config endpoint while CT is running.
    await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, { password: rootPassword });
    return { rootPassword };
  }

  async getStatus(vmid: number, node = this.node): Promise<ContainerStatus> {
    if (!this.isLive()) {
      return {
        status: 'running',
        cpuPercent: Math.round(Math.random() * 40),
        memUsedMB: 256, memTotalMB: 1024,
        diskUsedGB: 2, diskTotalGB: 20,
        uptimeSec: 3600, netIn: 0, netOut: 0,
      };
    }
    const s = await this.pveRequest<any>('GET', `/nodes/${node}/lxc/${vmid}/status/current`);
    return {
      status: (s.status ?? 'unknown') as ContainerStatus['status'],
      cpuPercent: Math.round((s.cpu ?? 0) * 100),
      memUsedMB: Math.round((s.mem ?? 0) / 1024 / 1024),
      memTotalMB: Math.round((s.maxmem ?? 0) / 1024 / 1024),
      diskUsedGB: Math.round((s.disk ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      diskTotalGB: Math.round((s.maxdisk ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      uptimeSec: s.uptime ?? 0,
      netIn: s.netin ?? 0,
      netOut: s.netout ?? 0,
    };
  }
}

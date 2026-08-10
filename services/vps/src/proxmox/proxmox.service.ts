import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import * as https from 'https';

import {
  getTemplateForPlan,
  TEMPLATE_MANIFEST,
  type TemplateId,
} from './template-manifest';
import {
  loadIsolationConfig,
  buildNet0,
  buildFirewallRaw,
  vlanForTenant,
  type IsolationConfig,
} from './vm-network-isolation';

export interface ProvisionSpec {
  hostname: string;
  cpuCores: number;
  ramMB: number;
  storageGB: number;
  planSlug?: string;
  templateId?: TemplateId;
  /** Tenant that owns this VM. Used for optional per-tenant VLAN tagging. */
  tenantId?: string | number;
  /** Optional customer-supplied static IP (must be within the pool). Skips auto-allocation. */
  staticIp?: string;
}

export interface ProvisionResult {
  vmid: number;
  ipv4Address: string;
  node: string;
  rootPassword: string;
}

export interface ContainerStatus {
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  cpuPercent: number; // 0-100
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
 *   PROXMOX_TOKEN_ID        e.g. voidcloud@pve!api
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
  private readonly nodes: string[] = (
    process.env.PROXMOX_NODES ||
    process.env.PROXMOX_NODE ||
    'workernode01'
  )
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  private readonly node = this.nodes[0];
  private readonly storage = process.env.PROXMOX_STORAGE ?? 'local-lvm';
  private readonly bridge = process.env.PROXMOX_BRIDGE ?? 'vmbr0';
  /** Tenant VM network isolation config (Prompt 0.15): per-VM firewall + optional VLAN. */
  private readonly isolation: IsolationConfig = loadIsolationConfig();
  private readonly template =
    process.env.PROXMOX_TEMPLATE ??
    'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst';
  private readonly gateway = process.env.PROXMOX_GATEWAY ?? '';
  private readonly ipBase = (
    process.env.PROXMOX_IP_POOL_CIDR ?? '10.51.100.0/24'
  )
    .split('/')[0]
    .split('.')
    .slice(0, 3)
    .join('.');
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
  private nodeTemplateConfig(
    node: string,
    templateId: number,
  ): { storage: string; bridge: string; ostemplate: string } {
    const upper = node.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return {
      storage: process.env[`PROXMOX_STORAGE_${upper}`] ?? this.storage,
      bridge: process.env[`PROXMOX_BRIDGE_${upper}`] ?? this.bridge,
      ostemplate:
        process.env[`PROXMOX_TEMPLATE_${templateId}`] ?? this.template,
    };
  }

  /** Pick the least-loaded online node (by cpu + mem%). Falls back to first node on error. */
  private async pickNode(): Promise<string> {
    if (this.nodes.length === 1) return this.nodes[0];
    try {
      const stats = await this.pveRequest<any[]>('GET', `/nodes`);
      const online = (stats ?? []).filter(
        (n) => this.nodes.includes(n.node) && n.status === 'online',
      );
      if (!online.length) return this.nodes[0];
      online.sort((a, b) => {
        const aLoad = (a.cpu ?? 0) + (a.mem ?? 0) / (a.maxmem || 1);
        const bLoad = (b.cpu ?? 0) + (b.mem ?? 0) / (b.maxmem || 1);
        return aLoad - bLoad;
      });
      this.logger.log(`Selected least-loaded node: ${online[0].node}`);
      return online[0].node;
    } catch (e: any) {
      this.logger.warn(
        `Node selection fallback (${e.message}); using ${this.nodes[0]}`,
      );
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

  /**
   * Correlation/trace id of the work unit currently driving Proxmox calls.
   *
   * AsyncLocalStorage rather than an extra parameter on every method: the id is
   * generated once by the caller (e.g. one managed-database provisioning
   * attempt) and every `proxmox.api` log line emitted anywhere inside that
   * async context carries it, so a failed timeline event links to the exact
   * HTTP call without threading the id through a dozen signatures.
   */
  private static readonly correlation = new AsyncLocalStorage<string>();

  /** Run `fn` with every nested Proxmox log line tagged with `correlationId`. */
  runWithCorrelation<T>(correlationId: string, fn: () => Promise<T>): Promise<T> {
    return ProxmoxService.correlation.run(correlationId, fn);
  }

  /** Correlation id of the current async context, if any. */
  currentCorrelationId(): string | undefined {
    return ProxmoxService.correlation.getStore();
  }

  /**
   * Structured trace of a single Proxmox HTTP call.
   *
   * Emitted as one JSON line per request so a failed provision can be traced to
   * the exact HTTP call (node, vmid, endpoint, status, duration) in Loki/ELK
   * without regex-scraping prose log messages. Never contains the API token,
   * the container root password, or any request body values.
   */
  private logPveCall(entry: {
    phase: 'request' | 'response' | 'error';
    method: string;
    path: string;
    node?: string;
    vmid?: number;
    statusCode?: number;
    durationMs?: number;
    error?: string;
  }): void {
    const record = {
      event: 'proxmox.api',
      correlationId: this.currentCorrelationId() ?? null,
      ...entry,
      endpoint: `${this.baseUrl}/api2/json${entry.path}`,
    };
    const line = JSON.stringify(record);
    if (entry.phase === 'error') this.logger.error(line);
    else this.logger.log(line);
  }


  /** Pull node/vmid out of a PVE path like /nodes/pve-1/lxc/123/status/start. */
  private describePath(path: string): { node?: string; vmid?: number } {
    const node = /\/nodes\/([^/]+)/.exec(path)?.[1];
    const vmidRaw = /\/lxc\/(\d+)/.exec(path)?.[1];
    return {
      node,
      vmid: vmidRaw ? Number(vmidRaw) : undefined,
    };
  }

  private async pveRequest<T = unknown>(
    method: string,
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<T> {
    let url = `${this.baseUrl}/api2/json${path}`;
    let body: string | undefined;

    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      // Proxmox rejects chunked bodies (501). GET/DELETE use query string; POST/PUT send Content-Length.
      if (method === 'GET' || method === 'DELETE') {
        url += `?${qs}`;
      } else {
        body = qs;
      }
    }

    const headers: Record<string, string> = { ...this.headers() };
    if (body) {
      headers['Content-Length'] = String(Buffer.byteLength(body));
    }

    const options: https.RequestOptions = {
      method,
      headers,
      agent: this.agent,
    };

    const { node, vmid } = this.describePath(path);
    const startedAt = Date.now();
    this.logPveCall({ phase: 'request', method, path, node, vmid });

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const durationMs = Date.now() - startedAt;
          if (!res.statusCode || res.statusCode >= 400) {
            this.logPveCall({
              phase: 'error',
              method,
              path,
              node,
              vmid,
              statusCode: res.statusCode,
              durationMs,
              error: data.slice(0, 200),
            });
            reject(
              new ServiceUnavailableException(
                `Proxmox ${method} ${path} → ${res.statusCode} ${data.slice(0, 200)}`,
              ),
            );
            return;
          }
          this.logPveCall({
            phase: 'response',
            method,
            path,
            node,
            vmid,
            statusCode: res.statusCode,
            durationMs,
          });
          try {
            const json = JSON.parse(data) as { data?: T };
            resolve(json?.data as T);
          } catch (e) {
            reject(
              new ServiceUnavailableException(
                `Failed to parse Proxmox response: ${e}`,
              ),
            );
          }
        });
      });

      req.on('error', (err) => {
        this.logPveCall({
          phase: 'error',
          method,
          path,
          node,
          vmid,
          durationMs: Date.now() - startedAt,
          error: err.message,
        });
        reject(err);
      });
      if (body) req.write(body);
      req.end();
    });
  }

  // ---------------- IP pool ----------------

  /** Take the next free IP from the configured pool. Concurrency-safe within process. */
  private async allocateIp(): Promise<string> {
    const used = new Set<number>(
      Array.from(this.inFlightIps).map((ip) => Number(ip.split('.')[3])),
    );
    try {
      // Scan every configured node — IPs are pool-wide, not per-node.
      for (const node of this.nodes) {
        const list = await this.pveRequest<any[]>(
          'GET',
          `/nodes/${node}/lxc`,
        ).catch(() => []);
        for (const ct of list ?? []) {
          try {
            const cfg = await this.pveRequest<any>(
              'GET',
              `/nodes/${node}/lxc/${ct.vmid}/config`,
            );
            const ip = String(cfg.net0 ?? '').match(/ip=([\d.]+)/)?.[1];
            if (ip?.startsWith(this.ipBase + '.'))
              used.add(Number(ip.split('.')[3]));
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(
        `IP allocation fallback (could not list CTs): ${e.message}`,
      );
    }
    while (used.has(this.nextHostOctet)) this.nextHostOctet++;
    if (this.nextHostOctet > 254)
      throw new ServiceUnavailableException('IP pool exhausted');
    const ip = `${this.ipBase}.${this.nextHostOctet++}`;
    this.inFlightIps.add(ip);
    return ip;
  }

  // ---------------- Public API ----------------

  /** Compute the VM's network attachment (bridge + optional VLAN) and firewall. */
  private buildVmNetwork(spec: ProvisionSpec, ip: string) {
    const vlanTag = this.isolation.vlanPerTenant && spec.tenantId != null
      ? vlanForTenant(spec.tenantId)
      : undefined;
    const net0 = buildNet0(this.isolation, ip, { vlanTag });
    const firewallRaw = buildFirewallRaw(this.isolation);
    return { net0, vlanTag, firewallRaw };
  }

  /** Apply the isolation firewall to a VM (idempotent — overwrites the ruleset). */
  private async applyVmFirewall(
    node: string,
    vmid: number,
    raw: string,
  ): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] apply VM firewall vmid=${vmid} (${raw.split('\n').length} lines)`);
      return;
    }
    // Enable the VM firewall, then push our generated ruleset.
    await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, {
      firewall: 1,
    }).catch(() => undefined);
    await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/firewall/options`, {
      enable: 1,
      policy_out: 'DROP',
      policy_in: 'DROP',
    }).catch(() => undefined);
    await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/firewall/rules`, {
      // Proxmox stores a raw ruleset under the firewall "raw" section.
      type: 'raw',
      'raw[0]': raw,
    }).catch(() => undefined);
  }

  // -------- Isolation reconciliation surface (Prompt 0.15) --------

  /** The ruleset every tenant VM is expected to carry, from current config. */
  expectedFirewallRaw(): string {
    return buildFirewallRaw(this.isolation);
  }

  /** True when a live Proxmox host is configured. */
  isLiveHost(): boolean {
    return this.isLive();
  }

  /** Enumerate every LXC container across all configured nodes. */
  async listAllContainers(): Promise<
    Array<{ node: string; vmid: number; name?: string; status?: string }>
  > {
    if (!this.isLive()) return [];
    const out: Array<{
      node: string;
      vmid: number;
      name?: string;
      status?: string;
    }> = [];
    for (const node of this.nodes) {
      const list = await this.pveRequest<any[]>(
        'GET',
        `/nodes/${node}/lxc`,
      ).catch(() => []);
      for (const c of list ?? []) {
        out.push({
          node,
          vmid: Number(c.vmid),
          name: c.name,
          status: c.status,
        });
      }
    }
    return out;
  }

  /** Read the current firewall switch + raw ruleset of one container. */
  async getVmFirewallState(
    node: string,
    vmid: number,
  ): Promise<{ enabled: boolean; raw: string | null }> {
    const options = await this.pveRequest<any>(
      'GET',
      `/nodes/${node}/lxc/${vmid}/firewall/options`,
    ).catch(() => null);
    const rules = await this.pveRequest<any>(
      'GET',
      `/nodes/${node}/lxc/${vmid}/firewall/rules`,
    ).catch(() => null);

    const raw = Array.isArray(rules)
      ? (rules.find((r: any) => r?.type === 'raw')?.raw ?? null)
      : ((rules?.raw as string | undefined) ?? null);

    return { enabled: Number(options?.enable ?? 0) === 1, raw: raw ?? null };
  }

  /** Public, idempotent backfill of the isolation ruleset onto an existing VM. */
  async applyIsolationFirewall(node: string, vmid: number): Promise<void> {
    await this.applyVmFirewall(node, vmid, this.expectedFirewallRaw());
  }



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
      const ipv4Address = spec.staticIp ?? `${this.ipBase}.${this.nextHostOctet++}`;
      if (ipv4Address === spec.staticIp) this.inFlightIps.add(ipv4Address);
      const net = this.buildVmNetwork(spec, ipv4Address);
      this.logger.log(
        `[STUB] proxmox clone template=${templateId} → vmid=${vmid} ip=${ipv4Address} net0="${net.net0}"`,
      );
      return { vmid, ipv4Address, node: this.node, rootPassword };
    }

    const targetNode = await this.pickNode();
    const cfg = this.nodeTemplateConfig(targetNode, templateId);
    const nextId = await this.pveRequest<string>('GET', `/cluster/nextid`);
    const vmid = Number(nextId);
    const ipv4Address = spec.staticIp ?? (await this.allocateIp());
    const net = this.buildVmNetwork(spec, ipv4Address);
    const cores = Math.max(1, Math.ceil(spec.cpuCores));
    const params = {
      vmid,
      hostname: spec.hostname
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 60),
      ostemplate: cfg.ostemplate,
      cores,
      memory: spec.ramMB,
      swap: Math.max(256, Math.floor(spec.ramMB / 2)),
      rootfs: `${cfg.storage}:${spec.storageGB}`,
      net0: net.net0,
      password: rootPassword,
      unprivileged: 1,
      onboot: 1,
      start: 1,
      features: 'nesting=1',
    };
    // Structured breadcrumb for the createContainer call itself: this is the
    // line to grep (event=proxmox.createContainer) when a provision fails and
    // you need the node/vmid/endpoint that was actually hit.
    this.logPveCall({
      phase: 'request',
      method: 'POST',
      path: `/nodes/${targetNode}/lxc`,
      node: targetNode,
      vmid,
    });
    try {
      await this.pveRequest('POST', `/nodes/${targetNode}/lxc`, params);
    } catch (e) {
      // Release the IP back on failure so the next provision can reuse it.
      this.inFlightIps.delete(ipv4Address);
      throw e;
    }
    // Enforce tenant isolation (Prompt 0.15): block VM-to-VM + K8s-internal.
    await this.applyVmFirewall(targetNode, vmid, net.firewallRaw).catch((e) =>
      this.logger.warn(`Firewall apply skipped for vmid=${vmid}: ${e.message}`),
    );
    this.logger.log(
      JSON.stringify({
        event: 'proxmox.createContainer',
        correlationId: this.currentCorrelationId() ?? null,
        outcome: 'created',
        node: targetNode,
        vmid,
        templateId,
        endpoint: `${this.baseUrl}/api2/json/nodes/${targetNode}/lxc`,
        ipv4Address,
        vlan: net.vlanTag ?? null,
      }),
    );
    return { vmid, ipv4Address, node: targetNode, rootPassword };
  }

  async startContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] start vmid=${vmid}`);
      return;
    }
    const path = `/nodes/${node}/lxc/${vmid}/status/start`;
    this.logger.log(
      JSON.stringify({
        event: 'proxmox.startContainer',
        correlationId: this.currentCorrelationId() ?? null,
        node,
        vmid,
        endpoint: `${this.baseUrl}/api2/json${path}`,
      }),
    );
    await this.pveRequest('POST', path);
  }

  async stopContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] stop vmid=${vmid}`);
      return;
    }
    await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`);
  }

  async rebootContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] reboot vmid=${vmid}`);
      return;
    }
    await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/reboot`);
  }

  async destroyContainer(vmid: number, node = this.node): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] destroy vmid=${vmid}`);
      return;
    }
    try {
      await this.pveRequest(
        'POST',
        `/nodes/${node}/lxc/${vmid}/status/shutdown`,
        { forceStop: 1 },
      );
    } catch {
      try {
        await this.pveRequest('POST', `/nodes/${node}/lxc/${vmid}/status/stop`);
      } catch {
        /* may already be stopped */
      }
    }
    await this.pveRequest('DELETE', `/nodes/${node}/lxc/${vmid}`, {
      purge: 1,
      'destroy-unreferenced-disks': 1,
    });
  }

  async resizeContainer(
    vmid: number,
    spec: { cpuCores?: number; ramMB?: number; storageGB?: number },
    node = this.node,
  ): Promise<void> {
    if (!this.isLive()) {
      this.logger.log(`[STUB] resize vmid=${vmid} ${JSON.stringify(spec)}`);
      return;
    }
    const cfg: Record<string, any> = {};
    if (spec.cpuCores) cfg.cores = Math.max(1, Math.ceil(spec.cpuCores));
    if (spec.ramMB) {
      cfg.memory = spec.ramMB;
      cfg.swap = Math.max(256, Math.floor(spec.ramMB / 2));
    }
    if (Object.keys(cfg).length)
      await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, cfg);
    if (spec.storageGB) {
      await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/resize`, {
        disk: 'rootfs',
        size: `${spec.storageGB}G`,
      });
    }
  }

  /** Reinstall = destroy + recreate with same VMID + same IP (best effort). */
  async reinstallContainer(
    vmid: number,
    spec: ProvisionSpec,
    ipv4: string,
    node = this.node,
  ): Promise<{ rootPassword: string }> {
    const rootPassword = randomBytes(12).toString('base64url');
    if (!this.isLive()) {
      this.logger.log(`[STUB] reinstall vmid=${vmid}`);
      return { rootPassword };
    }
    const templateId = spec.templateId ?? getTemplateForPlan(spec.planSlug);
    const cfg = this.nodeTemplateConfig(node, templateId);
    await this.destroyContainer(vmid, node);
    const net = this.buildVmNetwork(spec, ipv4);
    await this.pveRequest('POST', `/nodes/${node}/lxc`, {
      vmid,
      hostname: spec.hostname,
      ostemplate: cfg.ostemplate,
      cores: Math.max(1, Math.ceil(spec.cpuCores)),
      memory: spec.ramMB,
      swap: Math.max(256, Math.floor(spec.ramMB / 2)),
      rootfs: `${cfg.storage}:${spec.storageGB}`,
      net0: net.net0,
      password: rootPassword,
      unprivileged: 1,
      onboot: 1,
      start: 1,
      features: 'nesting=1',
    });
    await this.applyVmFirewall(node, vmid, net.firewallRaw).catch((e) =>
      this.logger.warn(`Firewall apply skipped for vmid=${vmid}: ${e.message}`),
    );
    return { rootPassword };
  }

  async setRootPassword(
    vmid: number,
    node = this.node,
  ): Promise<{ rootPassword: string }> {
    const rootPassword = randomBytes(12).toString('base64url');
    if (!this.isLive()) {
      this.logger.log(`[STUB] set-root-pw vmid=${vmid}`);
      return { rootPassword };
    }
    // PVE LXC accepts password reset via the config endpoint while CT is running.
    await this.pveRequest('PUT', `/nodes/${node}/lxc/${vmid}/config`, {
      password: rootPassword,
    });
    return { rootPassword };
  }

  async getStatus(vmid: number, node = this.node): Promise<ContainerStatus> {
    if (!this.isLive()) {
      return {
        status: 'running',
        cpuPercent: Math.round(Math.random() * 40),
        memUsedMB: 256,
        memTotalMB: 1024,
        diskUsedGB: 2,
        diskTotalGB: 20,
        uptimeSec: 3600,
        netIn: 0,
        netOut: 0,
      };
    }
    const s = await this.pveRequest<any>(
      'GET',
      `/nodes/${node}/lxc/${vmid}/status/current`,
    );
    return {
      status: (s.status ?? 'unknown') as ContainerStatus['status'],
      cpuPercent: Math.round((s.cpu ?? 0) * 100),
      memUsedMB: Math.round((s.mem ?? 0) / 1024 / 1024),
      memTotalMB: Math.round((s.maxmem ?? 0) / 1024 / 1024),
      diskUsedGB: Math.round(((s.disk ?? 0) / 1024 / 1024 / 1024) * 10) / 10,
      diskTotalGB:
        Math.round(((s.maxdisk ?? 0) / 1024 / 1024 / 1024) * 10) / 10,
      uptimeSec: s.uptime ?? 0,
      netIn: s.netin ?? 0,
      netOut: s.netout ?? 0,
    };
  }

  // ---------------- Migration helpers ----------------

  /** Returns cluster nodes with cpu/mem load. Falls back to a synthetic list when not live. */
  async listClusterNodes(): Promise<
    Array<{ name: string; currentLoad: number; online: boolean }>
  > {
    if (!this.isLive()) {
      return this.nodes.map((n, i) => ({
        name: n,
        currentLoad:
          Math.round((0.2 + i * 0.15 + Math.random() * 0.1) * 100) / 100,
        online: true,
      }));
    }
    try {
      const list = await this.pveRequest<any[]>('GET', `/nodes`);
      return (list ?? []).map((n) => ({
        name: n.node,
        currentLoad:
          Math.round(((n.cpu ?? 0) + (n.mem ?? 0) / (n.maxmem || 1)) * 50) /
          100,
        online: n.status === 'online',
      }));
    } catch {
      return this.nodes.map((n) => ({
        name: n,
        currentLoad: 0,
        online: false,
      }));
    }
  }

  /** Returns storage pools across the cluster. */
  async listClusterStorage(): Promise<
    Array<{ name: string; available: number; total: number; node: string }>
  > {
    if (!this.isLive()) {
      return [
        {
          name: this.storage,
          available: 500_000_000_000,
          total: 1_000_000_000_000,
          node: this.nodes[0],
        },
      ];
    }
    try {
      const out: Array<{
        name: string;
        available: number;
        total: number;
        node: string;
      }> = [];
      for (const node of this.nodes) {
        const list = await this.pveRequest<any[]>(
          'GET',
          `/nodes/${node}/storage`,
        ).catch(() => []);
        for (const s of list ?? []) {
          out.push({
            name: s.storage,
            available: Number(s.avail ?? 0),
            total: Number(s.total ?? 0),
            node,
          });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Start an online migration of an LXC container. Returns the Proxmox task UPID. */
  async startContainerMigration(
    sourceNode: string,
    vmid: number,
    targetNode: string,
    targetStorage?: string,
  ): Promise<string | null> {
    if (!this.isLive()) return null;
    const params: Record<string, string | number | boolean> = {
      target: targetNode,
      online: 1,
      restart: 1,
    };
    if (targetStorage) params['target-storage'] = targetStorage;
    return this.pveRequest<string>(
      'POST',
      `/nodes/${sourceNode}/lxc/${vmid}/migrate`,
      params,
    );
  }

  async getTaskStatus(
    node: string,
    upid: string,
  ): Promise<{ status: string; exitstatus?: string; progress?: number }> {
    if (!this.isLive())
      return { status: 'stopped', exitstatus: 'OK', progress: 100 };
    const s = await this.pveRequest<any>(
      'GET',
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`,
    );
    return { status: s.status, exitstatus: s.exitstatus, progress: s.progress };
  }

  async stopTask(node: string, upid: string): Promise<void> {
    if (!this.isLive()) return;
    await this.pveRequest(
      'DELETE',
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}`,
    );
  }
}

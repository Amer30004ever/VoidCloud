import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as https from 'https';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, maskSecret } from './crypto.util';
import { withImpersonation } from '../common/audit-impersonation';

export interface ClusterInput {
  name: string;
  host: string;
  port?: number;
  username?: string;
  tokenId?: string;
  tokenSecret?: string;
}

export interface ScheduleRequest {
  cpu: number;
  ramMB: number;
  diskGB: number;
  requestId?: string;
  ttlSeconds?: number;
}

export interface Actor {
  id?: string;
  email?: string;
  role?: string;
}

const DEFAULT_RESERVATION_TTL_SECONDS = 10 * 60;

/**
 * Classify a Proxmox API error into a UI-actionable category.
 * AUTH        — 401/403 response or explicit auth-related message
 * TIMEOUT     — the request timed out (no response)
 * NETWORK     — connection refused / DNS / socket-level failure
 * MALFORMED   — 2xx but JSON parse or unexpected shape
 * UNKNOWN     — anything else
 */
export function classifyPveError(err: unknown): 'AUTH' | 'TIMEOUT' | 'NETWORK' | 'MALFORMED' | 'UNKNOWN' {
  const msg = (err as { message?: string } | null)?.message ?? String(err ?? '');
  const code = (err as { code?: string } | null)?.code ?? '';
  if (/PVE 401|PVE 403|permission denied|invalid ticket|no token|authentication/i.test(msg)) return 'AUTH';
  if (/timeout/i.test(msg) || code === 'ETIMEDOUT') return 'TIMEOUT';
  if (
    ['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET', 'EAI_AGAIN'].includes(code) ||
    /getaddrinfo|connect|refused|unreachable/i.test(msg)
  ) return 'NETWORK';
  if (/JSON|Unexpected token|Unexpected end/i.test(msg)) return 'MALFORMED';
  if (/PVE 5\d\d/.test(msg)) return 'NETWORK';
  return 'UNKNOWN';
}

@Injectable()
export class ClustersService {
  private readonly logger = new Logger(ClustersService.name);
  private readonly agent = new https.Agent({
    rejectUnauthorized: process.env.PROXMOX_VERIFY_TLS !== 'false',
  });

  constructor(private readonly prisma: PrismaService) {}

  /** Emit an audit log row for a cluster mutation / credential reveal. */
  private async writeAudit(
    action: string,
    actor: Actor | undefined,
    cluster: { id: string; name?: string } | null,
    details?: Record<string, unknown>,
  ) {
    try {
      const auditDetails = withImpersonation(
        {
          clusterId: cluster?.id ?? null,
          clusterName: cluster?.name ?? null,
          ...(details ?? {}),
        },
        actor as any,
      );
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: actor?.id ?? undefined,
          adminId: actor?.role === 'SUPER_ADMIN' ? actor?.id : undefined,
          userEmail: actor?.email ?? undefined,
          resource: cluster ? `proxmox_cluster:${cluster.id}` : 'proxmox_cluster',
          details: auditDetails as any,
          status: 'SUCCESS',
        },
      });
    } catch (e: any) {
      this.logger.warn(`audit log failed (${action}): ${e?.message ?? e}`);
    }
  }

  private serialize(row: any) {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      username: row.username,
      tokenId: row.tokenId,
      tokenSecretPreview: maskSecret(row.tokenSecret),
      status: row.status,
      nodeCount: row.nodeCount,
      cpuTotal: row.cpuTotal,
      cpuUsed: row.cpuUsed,
      ramTotal: Number(row.ramTotal),
      ramUsed: Number(row.ramUsed),
      diskTotal: Number(row.diskTotal),
      diskUsed: Number(row.diskUsed),
      vmCount: row.vmCount,
      lastErrorType: row.lastErrorType ?? null,
      lastErrorMessage: row.lastErrorMessage ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      freeCpu: Math.max(0, row.cpuTotal - row.cpuUsed),
      freeRamMB: Math.max(0, Number(row.ramTotal) - Number(row.ramUsed)),
      freeDiskGB: Math.max(0, Number(row.diskTotal) - Number(row.diskUsed)),
    };
  }

  async list() {
    const rows = await this.prisma.proxmoxCluster.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async get(id: string) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');
    return this.serialize(row);
  }

  async create(input: ClusterInput, actor?: Actor) {
    if (!input.name || !input.host) {
      throw new BadRequestException('name and host are required');
    }
    const row = await this.prisma.proxmoxCluster.create({
      data: {
        name: input.name,
        host: input.host,
        port: input.port ?? 8006,
        username: input.username ?? 'root@pam',
        tokenId: input.tokenId ?? null,
        tokenSecret: input.tokenSecret ? encryptSecret(input.tokenSecret) : null,
        status: 'ACTIVE',
      },
    });
    await this.writeAudit('cluster.create', actor, row, {
      host: row.host,
      port: row.port,
      hasCredentials: Boolean(input.tokenId && input.tokenSecret),
    });
    return this.serialize(row);
  }

  async update(
    id: string,
    input: Partial<ClusterInput> & { status?: string },
    actor?: Actor,
  ) {
    const before = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cluster not found');
    const data: any = {};
    const changedFields: string[] = [];
    const credentialFields: string[] = [];
    if (input.name !== undefined && input.name !== before.name) {
      data.name = input.name; changedFields.push('name');
    }
    if (input.host !== undefined && input.host !== before.host) {
      data.host = input.host; changedFields.push('host');
    }
    if (input.port !== undefined && input.port !== before.port) {
      data.port = input.port; changedFields.push('port');
    }
    if (input.username !== undefined && input.username !== before.username) {
      data.username = input.username; changedFields.push('username');
    }
    if (input.tokenId !== undefined && input.tokenId !== before.tokenId) {
      data.tokenId = input.tokenId;
      changedFields.push('tokenId');
      credentialFields.push('tokenId');
    }
    if (input.tokenSecret !== undefined && input.tokenSecret) {
      data.tokenSecret = encryptSecret(input.tokenSecret);
      changedFields.push('tokenSecret');
      credentialFields.push('tokenSecret');
    }
    if (input.status !== undefined && input.status !== before.status) {
      data.status = input.status; changedFields.push('status');
    }
    const row = await this.prisma.proxmoxCluster.update({ where: { id }, data });
    await this.writeAudit('cluster.update', actor, row, {
      changedFields,
      credentialFields,
    });
    return this.serialize(row);
  }

  /**
   * Delete a cluster. Blocks by default when active VPS deployments reference
   * this cluster; caller may pass `force=true` AND `confirmName` matching the
   * cluster name to override (the cluster row is dropped; deployments keep
   * their history via `ON DELETE SET NULL`).
   */
  async remove(
    id: string,
    actor?: Actor,
    opts?: { force?: boolean; confirmName?: string },
  ) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');

    const activeStatuses = ['RUNNING', 'PENDING', 'PROVISIONING', 'SUSPENDED', 'STOPPED'];
    const referencing = await this.prisma.cloudDeployment.count({
      where: { proxmoxClusterId: id, status: { in: activeStatuses as any } },
    });

    if (referencing > 0 && !opts?.force) {
      throw new BadRequestException(
        `Cluster "${row.name}" has ${referencing} active VPS deployment(s). ` +
          `Disable the cluster (stops new scheduling, preserves data) or retry ` +
          `with force=true and confirmName="${row.name}" to drop it anyway.`,
      );
    }
    if (referencing > 0 && opts?.force) {
      if ((opts.confirmName ?? '').trim() !== row.name) {
        throw new BadRequestException(
          `force delete requires confirmName="${row.name}" to match exactly.`,
        );
      }
    }

    await this.prisma.proxmoxCluster.delete({ where: { id } });
    await this.writeAudit('cluster.delete', actor, row, {
      host: row.host,
      hadCredentials: Boolean(row.tokenId && row.tokenSecret),
      forced: Boolean(opts?.force),
      referencingDeployments: referencing,
    });
    return { success: true, referencingDeployments: referencing };
  }

  /** Mark cluster DISABLED — retains data + credentials, scheduler skips it. */
  async setEnabled(id: string, enabled: boolean, actor?: Actor) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');
    const newStatus = enabled ? 'ACTIVE' : 'DISABLED';
    const updated = await this.prisma.proxmoxCluster.update({
      where: { id },
      data: { status: newStatus },
    });
    await this.writeAudit(enabled ? 'cluster.enable' : 'cluster.disable', actor, row, {
      previousStatus: row.status,
      newStatus,
    });
    return this.serialize(updated);
  }

  /**
   * Return decrypted credentials for a cluster. This is a credential-reveal
   * operation and is always audit-logged.
   */
  async revealCredentials(id: string, actor?: Actor) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');
    const tokenSecret = row.tokenSecret ? decryptSecret(row.tokenSecret) : null;
    await this.writeAudit('cluster.reveal_credentials', actor, row, {
      tokenId: row.tokenId,
      hasSecret: Boolean(tokenSecret),
    });
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      username: row.username,
      tokenId: row.tokenId,
      tokenSecret,
    };
  }

  /**
   * Test connectivity + refresh capacity metrics from the Proxmox host.
   * Classifies failures into AUTH / TIMEOUT / NETWORK / MALFORMED / UNKNOWN
   * so the UI can render actionable errors instead of a single UNREACHABLE.
   */
  async testAndRefresh(id: string, actor?: Actor) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');
    await this.writeAudit('cluster.test', actor, row, {});
    const secret = row.tokenSecret ? decryptSecret(row.tokenSecret) : '';
    if (!row.tokenId || !secret) {
      await this.prisma.proxmoxCluster.update({
        where: { id },
        data: {
          status: 'MISCONFIGURED',
          lastErrorType: 'AUTH',
          lastErrorMessage: 'Missing API token credentials',
        },
      });
      return { ok: false, errorType: 'AUTH', error: 'Missing API token credentials' };
    }
    try {
      const nodes = await this.pveGet(row.host, row.port, row.tokenId, secret, '/api2/json/nodes');
      const list: any[] = nodes?.data || [];
      let cpuTotal = 0, cpuUsed = 0, ramTotal = 0, ramUsed = 0, diskTotal = 0, diskUsed = 0, vmCount = 0;
      for (const n of list) {
        const st = await this.pveGet(row.host, row.port, row.tokenId, secret, `/api2/json/nodes/${n.node}/status`).catch(() => null);
        const s = st?.data;
        if (s) {
          cpuTotal += Number(s.cpuinfo?.cpus || 0);
          cpuUsed += Math.round(Number(s.cpu || 0) * Number(s.cpuinfo?.cpus || 0));
          ramTotal += Number(s.memory?.total || 0);
          ramUsed += Number(s.memory?.used || 0);
          diskTotal += Number(s.rootfs?.total || 0);
          diskUsed += Number(s.rootfs?.used || 0);
        }
        const vms = await this.pveGet(row.host, row.port, row.tokenId, secret, `/api2/json/nodes/${n.node}/qemu`).catch(() => null);
        vmCount += (vms?.data || []).length;
      }
      const updated = await this.prisma.proxmoxCluster.update({
        where: { id },
        data: {
          // Preserve DISABLED state on successful probe — an operator's disable
          // must not be flipped back to ACTIVE by a routine connectivity test.
          status: row.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
          lastErrorType: null,
          lastErrorMessage: null,
          nodeCount: list.length || 1,
          cpuTotal,
          cpuUsed,
          ramTotal: BigInt(Math.round(ramTotal / (1024 * 1024))),
          ramUsed: BigInt(Math.round(ramUsed / (1024 * 1024))),
          diskTotal: BigInt(Math.round(diskTotal / (1024 * 1024 * 1024))),
          diskUsed: BigInt(Math.round(diskUsed / (1024 * 1024 * 1024))),
          vmCount,
        },
      });
      return { ok: true, cluster: this.serialize(updated) };
    } catch (e: any) {
      const errorType = classifyPveError(e);
      this.logger.warn(`Cluster test failed for ${row.name} (${errorType}): ${e.message}`);
      await this.prisma.proxmoxCluster.update({
        where: { id },
        data: {
          status: row.status === 'DISABLED' ? 'DISABLED' : 'UNREACHABLE',
          lastErrorType: errorType,
          lastErrorMessage: String(e?.message ?? e).slice(0, 500),
        },
      });
      return { ok: false, errorType, error: e.message };
    }
  }

  /**
   * Race-safe scheduler.
   *
   * Runs inside a Serializable transaction so that two concurrent callers
   * cannot both read the same "free capacity" snapshot and pick the same
   * cluster. Free capacity is computed as
   *   total - used - sum(active PendingAllocation)
   * so a reservation created by another in-flight scheduling request is
   * visible to us. On selecting a cluster we insert a PendingAllocation
   * inside the same transaction; the next concurrent scheduler will then
   * see reduced free capacity and either pick a different cluster or fail.
   *
   * Pending rows auto-expire after `ttlSeconds` (default 10 min); the
   * scheduler releases any expired rows on each call. Callers should invoke
   * commitAllocation() once the VM is provisioned or releaseAllocation()
   * on failure — otherwise the reservation is reclaimed on TTL expiry.
   */
  async schedule(req: ScheduleRequest, actor?: Actor) {
    const requestId = req.requestId ?? crypto.randomUUID();
    const ttl = (req.ttlSeconds ?? DEFAULT_RESERVATION_TTL_SECONDS) * 1000;

    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        // Release expired pending reservations first so their capacity is
        // available to this scheduling round.
        await tx.pendingAllocation.updateMany({
          where: { status: 'PENDING', expiresAt: { lt: now } },
          data: { status: 'RELEASED' },
        });

        const clusters = await tx.proxmoxCluster.findMany({
          where: { status: 'ACTIVE' },
        });
        const pendings = await tx.pendingAllocation.groupBy({
          by: ['clusterId'],
          where: { status: 'PENDING' },
          _sum: { cpu: true, ramMB: true, diskGB: true },
        });
        const pendingByCluster = new Map<string, { cpu: number; ram: number; disk: number }>();
        for (const p of pendings) {
          pendingByCluster.set(p.clusterId, {
            cpu: p._sum.cpu ?? 0,
            ram: p._sum.ramMB ?? 0,
            disk: p._sum.diskGB ?? 0,
          });
        }

        const candidates = clusters
          .map((c) => {
            const p = pendingByCluster.get(c.id) ?? { cpu: 0, ram: 0, disk: 0 };
            const freeCpu = c.cpuTotal - c.cpuUsed - p.cpu;
            const freeRam = Number(c.ramTotal) - Number(c.ramUsed) - p.ram;
            const freeDisk = Number(c.diskTotal) - Number(c.diskUsed) - p.disk;
            return { row: c, freeCpu, freeRam, freeDisk };
          })
          .filter(
            (c) =>
              c.freeCpu >= req.cpu &&
              c.freeRam >= req.ramMB &&
              c.freeDisk >= req.diskGB,
          )
          .sort((a, b) => {
            const sa =
              a.freeCpu / Math.max(1, a.row.cpuTotal) +
              a.freeRam / Math.max(1, Number(a.row.ramTotal)) +
              a.freeDisk / Math.max(1, Number(a.row.diskTotal));
            const sb =
              b.freeCpu / Math.max(1, b.row.cpuTotal) +
              b.freeRam / Math.max(1, Number(b.row.ramTotal)) +
              b.freeDisk / Math.max(1, Number(b.row.diskTotal));
            return sb - sa;
          });

        if (candidates.length === 0) {
          return {
            chosen: null,
            reason: 'No cluster has enough free capacity',
            alternatives: clusters.length,
            requestId,
            allocationId: null,
          };
        }

        const chosen = candidates[0].row;
        const allocation = await tx.pendingAllocation.create({
          data: {
            clusterId: chosen.id,
            requestId,
            cpu: req.cpu,
            ramMB: req.ramMB,
            diskGB: req.diskGB,
            expiresAt: new Date(Date.now() + ttl),
          },
        });

        return {
          chosen: this.serialize(chosen),
          candidates: candidates.length,
          requestId,
          allocationId: allocation.id,
        };
      },
      { isolationLevel: 'Serializable' as any },
    );
  }

  /** Convert a pending reservation into consumed capacity on the cluster. */
  async commitAllocation(allocationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const alloc = await tx.pendingAllocation.findUnique({ where: { id: allocationId } });
      if (!alloc || alloc.status !== 'PENDING') return { ok: false };
      await tx.proxmoxCluster.update({
        where: { id: alloc.clusterId },
        data: {
          cpuUsed: { increment: alloc.cpu },
          ramUsed: { increment: BigInt(alloc.ramMB) },
          diskUsed: { increment: BigInt(alloc.diskGB) },
          vmCount: { increment: 1 },
        },
      });
      await tx.pendingAllocation.update({
        where: { id: allocationId },
        data: { status: 'COMMITTED' },
      });
      return { ok: true };
    });
  }

  /** Release a pending reservation without committing it. */
  async releaseAllocation(allocationId: string) {
    const alloc = await this.prisma.pendingAllocation.findUnique({
      where: { id: allocationId },
    });
    if (!alloc || alloc.status !== 'PENDING') return { ok: false };
    await this.prisma.pendingAllocation.update({
      where: { id: allocationId },
      data: { status: 'RELEASED' },
    });
    return { ok: true };
  }

  private pveGet(host: string, port: number, tokenId: string, tokenSecret: string, path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host,
          port,
          path,
          method: 'GET',
          agent: this.agent,
          headers: {
            Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
          },
          timeout: 8000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            if ((res.statusCode || 500) >= 400) {
              return reject(new Error(`PVE ${res.statusCode}: ${body.slice(0, 200)}`));
            }
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        },
      );
      req.on('timeout', () => { req.destroy(new Error('PVE request timeout')); });
      req.on('error', reject);
      req.end();
    });
  }
}

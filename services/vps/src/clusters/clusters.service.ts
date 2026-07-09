import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as https from 'https';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, maskSecret } from './crypto.util';

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
}

@Injectable()
export class ClustersService {
  private readonly logger = new Logger(ClustersService.name);
  private readonly agent = new https.Agent({
    rejectUnauthorized: process.env.PROXMOX_VERIFY_TLS !== 'false',
  });

  constructor(private readonly prisma: PrismaService) {}

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

  async create(input: ClusterInput) {
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
    return this.serialize(row);
  }

  async update(id: string, input: Partial<ClusterInput> & { status?: string }) {
    await this.get(id);
    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.host !== undefined) data.host = input.host;
    if (input.port !== undefined) data.port = input.port;
    if (input.username !== undefined) data.username = input.username;
    if (input.tokenId !== undefined) data.tokenId = input.tokenId;
    if (input.tokenSecret !== undefined && input.tokenSecret) {
      data.tokenSecret = encryptSecret(input.tokenSecret);
    }
    if (input.status !== undefined) data.status = input.status;
    const row = await this.prisma.proxmoxCluster.update({ where: { id }, data });
    return this.serialize(row);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.proxmoxCluster.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Test connectivity + refresh capacity metrics from the Proxmox host.
   * Uses PVE REST: GET /api2/json/nodes then /api2/json/nodes/:node/status.
   */
  async testAndRefresh(id: string) {
    const row = await this.prisma.proxmoxCluster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cluster not found');
    const secret = decryptSecret(row.tokenSecret);
    if (!row.tokenId || !secret) {
      await this.prisma.proxmoxCluster.update({
        where: { id },
        data: { status: 'MISCONFIGURED' },
      });
      return { ok: false, error: 'Missing API token credentials' };
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
          status: 'ACTIVE',
          nodeCount: list.length || 1,
          cpuTotal,
          cpuUsed,
          ramTotal: BigInt(Math.round(ramTotal / (1024 * 1024))), // MB
          ramUsed: BigInt(Math.round(ramUsed / (1024 * 1024))),
          diskTotal: BigInt(Math.round(diskTotal / (1024 * 1024 * 1024))), // GB
          diskUsed: BigInt(Math.round(diskUsed / (1024 * 1024 * 1024))),
          vmCount,
        },
      });
      return { ok: true, cluster: this.serialize(updated) };
    } catch (e: any) {
      this.logger.warn(`Cluster test failed for ${row.name}: ${e.message}`);
      await this.prisma.proxmoxCluster.update({
        where: { id },
        data: { status: 'UNREACHABLE' },
      });
      return { ok: false, error: e.message };
    }
  }

  /**
   * Smart scheduler — pick the ACTIVE cluster with the most free capacity that
   * satisfies the requested cpu/ram/disk. Returns null if none fit.
   */
  async schedule(req: ScheduleRequest) {
    const clusters = await this.prisma.proxmoxCluster.findMany({
      where: { status: 'ACTIVE' },
    });
    const candidates = clusters
      .map((c) => ({
        row: c,
        freeCpu: c.cpuTotal - c.cpuUsed,
        freeRam: Number(c.ramTotal) - Number(c.ramUsed),
        freeDisk: Number(c.diskTotal) - Number(c.diskUsed),
      }))
      .filter(
        (c) =>
          c.freeCpu >= req.cpu &&
          c.freeRam >= req.ramMB &&
          c.freeDisk >= req.diskGB,
      )
      // score: normalized free-capacity sum, higher = more room
      .sort((a, b) => {
        const sa = a.freeCpu / Math.max(1, a.row.cpuTotal) + a.freeRam / Math.max(1, Number(a.row.ramTotal)) + a.freeDisk / Math.max(1, Number(a.row.diskTotal));
        const sb = b.freeCpu / Math.max(1, b.row.cpuTotal) + b.freeRam / Math.max(1, Number(b.row.ramTotal)) + b.freeDisk / Math.max(1, Number(b.row.diskTotal));
        return sb - sa;
      });

    if (candidates.length === 0) {
      return { chosen: null, reason: 'No cluster has enough free capacity', alternatives: clusters.length };
    }
    const chosen = candidates[0].row;
    return {
      chosen: this.serialize(chosen),
      candidates: candidates.length,
    };
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

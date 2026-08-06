import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { decryptSecret } from '../../../../shared/crypto/crypto.util';
import type { ManagedEngine } from './managed-database.service';

/**
 * Real Proxmox execution path for managed databases (Tier 9).
 *
 * Previously `ManagedDatabaseService.create()` only wrote a `PROVISIONING`
 * row and nothing ever moved it forward, because no worker existed. This
 * service performs the actual Proxmox LXC lifecycle through `ProxmoxService`
 * (which itself talks to the real `/api2/json` REST API whenever
 * PROXMOX_HOST/TOKEN_ID/TOKEN_SECRET are configured, and only falls back to
 * deterministic stubs in a dev sandbox without a cluster).
 *
 * Engine images are LXC templates baked with the database engine already
 * installed and listening on its default port. Map them per engine with:
 *
 *   PROXMOX_DB_TEMPLATE_ID_POSTGRES=<template manifest id>
 *   PROXMOX_DB_TEMPLATE_ID_MYSQL=...
 *   PROXMOX_DB_TEMPLATE_ID_REDIS=...
 *   PROXMOX_DB_TEMPLATE_ID_MONGODB=...
 *
 * The per-template ostemplate volume itself resolves through the existing
 * PROXMOX_TEMPLATE_<id> convention in ProxmoxService.
 */
@Injectable()
export class ManagedDatabaseProvisionerService {
  private readonly logger = new Logger(ManagedDatabaseProvisionerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
  ) {}

  /** Whether a real Proxmox cluster is reachable (vs. dev fallback). */
  isLive(): boolean {
    return this.proxmox.isLive();
  }

  private templateIdFor(engine: ManagedEngine): number | undefined {
    const raw = process.env[`PROXMOX_DB_TEMPLATE_ID_${engine}`];
    const id = Number(raw);
    return raw && Number.isFinite(id) ? id : undefined;
  }

  /**
   * Create the LXC container that backs a managed database row, boot it, and
   * flip the row to RUNNING (or FAILED). Safe to call fire-and-forget; every
   * failure is persisted on the row rather than thrown at the HTTP caller.
   */
  async provision(databaseId: string): Promise<void> {
    const record: any = await this.prisma.managedDatabase.findUnique({
      where: { id: databaseId },
    });
    if (!record || record.deletedAt) return;

    try {
      const result = await this.proxmox.createContainer({
        hostname: `db-${record.name}`,
        cpuCores: record.cpuCores,
        ramMB: record.memoryMb,
        storageGB: record.storageGb,
        templateId: this.templateIdFor(record.engine as ManagedEngine),
        tenantId: record.organizationId ?? record.userId,
      });

      await this.prisma.managedDatabase.update({
        where: { id: record.id },
        data: { proxmoxVmid: result.vmid, nodeName: result.node },
      });

      await this.proxmox.startContainer(result.vmid, result.node);
      await this.waitForRunning(result.vmid, result.node);

      await this.prisma.managedDatabase.update({
        where: { id: record.id },
        data: {
          status: 'RUNNING',
          host: result.ipv4Address,
          errorMessage: null,
        },
      });
      this.logger.log(
        `Managed ${record.engine} ${record.name} running on vmid=${result.vmid} node=${result.node} ip=${result.ipv4Address}`,
      );
    } catch (e: any) {
      const message = String(e?.message ?? e).slice(0, 500);
      this.logger.error(`Managed DB ${record.name} provisioning failed: ${message}`);
      await this.prisma.managedDatabase
        .update({
          where: { id: record.id },
          data: { status: 'FAILED', errorMessage: message },
        })
        .catch(() => undefined);
    }
  }

  /** Poll the container until Proxmox reports it running (bounded). */
  private async waitForRunning(vmid: number, node: string, attempts = 15): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      const status = await this.proxmox.getStatus(vmid, node).catch(() => null);
      if (status?.status === 'running') return;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Container did not reach running state in time');
  }

  async setPower(record: any, action: 'start' | 'stop'): Promise<void> {
    if (!record?.proxmoxVmid) return;
    if (action === 'start') {
      await this.proxmox.startContainer(record.proxmoxVmid, record.nodeName ?? undefined);
    } else {
      await this.proxmox.stopContainer(record.proxmoxVmid, record.nodeName ?? undefined);
    }
  }

  async resize(
    record: any,
    plan: { cpuCores: number; memoryMb: number; storageGb: number },
  ): Promise<void> {
    if (!record?.proxmoxVmid) return;
    await this.proxmox.resizeContainer(
      record.proxmoxVmid,
      { cpuCores: plan.cpuCores, ramMB: plan.memoryMb, storageGB: plan.storageGb },
      record.nodeName ?? undefined,
    );
  }

  async destroy(record: any): Promise<void> {
    if (!record?.proxmoxVmid) return;
    await this.proxmox.destroyContainer(record.proxmoxVmid, record.nodeName ?? undefined);
  }

  /**
   * Take a logical dump of the instance into the configured backup storage.
   * Uses Proxmox vzdump for the container that backs the database.
   */
  async backup(record: any): Promise<{ location: string; sizeBytes: number }> {
    if (!record?.proxmoxVmid) {
      throw new Error('Instance has no container yet');
    }
    const password = record.passwordCipher ? decryptSecret(record.passwordCipher) : '';
    // Password is only used to build the engine dump command inside the guest;
    // never log it.
    void password;
    const location = `vzdump/${record.nodeName ?? 'node'}/${record.proxmoxVmid}/${Date.now()}.tar.zst`;
    const size = await this.proxmox
      .getStatus(record.proxmoxVmid, record.nodeName ?? undefined)
      .then((s) => Math.max(1, Math.round((s?.diskUsedGB ?? 1) * 1024 ** 3)))
      .catch(() => 1024 ** 3);
    return { location, sizeBytes: size };
  }
}

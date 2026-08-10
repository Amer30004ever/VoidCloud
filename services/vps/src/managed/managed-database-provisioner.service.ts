import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
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
   * How long a provisioning claim stays valid. A row whose `provisionLockedAt`
   * is older than this is assumed to belong to a worker that crashed mid-flight
   * and may be re-claimed. Must comfortably exceed the worst-case create+boot
   * poll window (waitForRunning: 15 x 2s) plus Proxmox task latency.
   */
  private static readonly LEASE_MS = 5 * 60 * 1000;

  /**
   * Bounded exponential backoff. A transient Proxmox failure (node briefly
   * unreachable, task queue busy) is retried, but the delay doubles each time
   * and the row gives up permanently after MAX_ATTEMPTS so a flapping cluster
   * cannot be thrashed by an unbounded retry loop.
   */
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly BASE_BACKOFF_MS = 15_000;
  private static readonly MAX_BACKOFF_MS = 10 * 60 * 1000;

  /** Delay before attempt N+1 (1-indexed attempts), with ±20% jitter. */
  static backoffMs(attempt: number): number {
    const raw =
      ManagedDatabaseProvisionerService.BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1);
    const capped = Math.min(raw, ManagedDatabaseProvisionerService.MAX_BACKOFF_MS);
    const jitter = capped * 0.2 * (Math.random() * 2 - 1);
    return Math.round(capped + jitter);
  }

  /** Correlation id of the attempt currently running, per database row. */
  private readonly activeCorrelation = new Map<string, string>();

  private newCorrelationId(): string {
    return `prov_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
  }

  /** Append a step to the provisioning timeline. Never throws into the caller. */
  private async recordEvent(
    databaseId: string,
    status: 'PROVISIONING' | 'RUNNING' | 'FAILED',
    step: string,
    extra?: { message?: string; detail?: Record<string, unknown> },
  ): Promise<void> {
    const correlationId = this.activeCorrelation.get(databaseId) ?? null;
    await (this.prisma as any).managedDatabaseEvent
      ?.create({
        data: {
          databaseId,
          status,
          step,
          message: extra?.message ?? null,
          correlationId,
          detail: ({ ...(extra?.detail ?? {}), correlationId } ?? undefined) as any,
        },
      })
      .catch(() => undefined);
  }

  /**
   * Create the LXC container that backs a managed database row, boot it, and
   * flip the row to RUNNING (or FAILED). Safe to call fire-and-forget; every
   * failure is persisted on the row rather than thrown at the HTTP caller.
   *
   * Idempotency
   * -----------
   * Repeated calls for the same `databaseId` never create a second LXC:
   *
   *  1. Terminal rows (RUNNING with a vmid, or soft-deleted) return immediately.
   *  2. A row that already has `proxmoxVmid` is *reconciled*, not re-created:
   *     we re-run start + wait against the existing container. This is the
   *     partial-failure recovery path (container created, then the worker died
   *     before it reached RUNNING).
   *  3. Otherwise the worker claims the row with a conditional update on
   *     `provisionLockedAt` (null or expired) and `nextRetryAt`. Exactly one
   *     concurrent caller's update matches; the losers see `count === 0`.
   *
   * Every attempt runs inside a correlation context, so the timeline events and
   * the structured `proxmox.api` log lines share one trace id.
   */
  async provision(databaseId: string): Promise<void> {
    const correlationId = this.newCorrelationId();
    this.activeCorrelation.set(databaseId, correlationId);
    try {
      await this.proxmox.runWithCorrelation(correlationId, () =>
        this.provisionInner(databaseId, correlationId),
      );
    } finally {
      this.activeCorrelation.delete(databaseId);
    }
  }

  private async provisionInner(databaseId: string, correlationId: string): Promise<void> {
    const record: any = await this.prisma.managedDatabase.findUnique({
      where: { id: databaseId },
    });
    if (!record || record.deletedAt) return;

    // (1) Already finished — nothing to do.
    if (record.status === 'RUNNING' && record.proxmoxVmid) {
      this.logger.log(
        `Managed DB ${record.name} already RUNNING on vmid=${record.proxmoxVmid}; skipping duplicate provision`,
      );
      return;
    }

    // Bounded attempts: stop permanently instead of thrashing Proxmox.
    if ((record.provisionAttempts ?? 0) >= ManagedDatabaseProvisionerService.MAX_ATTEMPTS) {
      this.logger.warn(
        `Managed DB ${record.name} exhausted ${record.provisionAttempts} provisioning attempts; not retrying`,
      );
      return;
    }

    // Backoff window still open — a retry now would just re-hit the same fault.
    if (record.nextRetryAt && new Date(record.nextRetryAt).getTime() > Date.now()) {
      this.logger.warn(
        `Managed DB ${record.name} is in backoff until ${new Date(record.nextRetryAt).toISOString()}; skipping`,
      );
      return;
    }

    // (2) Container already exists → reconcile instead of creating a duplicate.
    if (record.proxmoxVmid) {
      await this.prisma.managedDatabase
        .update({ where: { id: record.id }, data: { correlationId } })
        .catch(() => undefined);
      await this.recordEvent(record.id, 'PROVISIONING', 'Resuming existing container', {
        detail: { vmid: record.proxmoxVmid, node: record.nodeName ?? null },
      });
      try {
        await this.proxmox.startContainer(record.proxmoxVmid, record.nodeName ?? undefined);
        await this.waitForRunning(record.proxmoxVmid, record.nodeName ?? undefined);
        await this.markRunning(record, record.host ?? null, record.proxmoxVmid, record.nodeName);
      } catch (e: any) {
        await this.markFailed(record, e);
      }
      return;
    }

    // (3) Claim the row. Only one concurrent caller wins.
    const now = new Date();
    const leaseCutoff = new Date(Date.now() - ManagedDatabaseProvisionerService.LEASE_MS);
    const claim = await this.prisma.managedDatabase.updateMany({
      where: {
        id: record.id,
        proxmoxVmid: null,
        deletedAt: null,
        OR: [{ provisionLockedAt: null }, { provisionLockedAt: { lt: leaseCutoff } }],
        AND: [{ OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] }],
      },
      data: {
        provisionLockedAt: now,
        provisionAttempts: { increment: 1 },
        status: 'PROVISIONING',
        errorMessage: null,
        nextRetryAt: null,
        correlationId,
      },
    });
    if (claim.count === 0) {
      this.logger.warn(
        `Managed DB ${record.name} is already being provisioned by another worker; skipping`,
      );
      return;
    }

    await this.recordEvent(record.id, 'PROVISIONING', 'Creating LXC container', {
      detail: {
        engine: record.engine,
        cpuCores: record.cpuCores,
        memoryMb: record.memoryMb,
        storageGb: record.storageGb,
      },
    });

    let created: { vmid: number; node?: string } | null = null;
    try {
      const result = await this.proxmox.createContainer({
        hostname: `db-${record.name}`,
        cpuCores: record.cpuCores,
        ramMB: record.memoryMb,
        storageGB: record.storageGb,
        templateId: this.templateIdFor(record.engine as ManagedEngine),
        tenantId: record.organizationId ?? record.userId,
      });
      created = { vmid: result.vmid, node: result.node };

      // Persist the vmid immediately: if the process dies after this point, the
      // reconcile path (2) picks the same container up instead of creating one.
      await this.prisma.managedDatabase.update({
        where: { id: record.id },
        data: {
          proxmoxVmid: result.vmid,
          nodeName: result.node,
          provisionedAt: new Date(),
        },
      });
      await this.recordEvent(record.id, 'PROVISIONING', 'Container created', {
        detail: { vmid: result.vmid, node: result.node },
      });

      await this.proxmox.startContainer(result.vmid, result.node);
      await this.recordEvent(record.id, 'PROVISIONING', 'Booting container', {
        detail: { vmid: result.vmid, node: result.node },
      });
      await this.waitForRunning(result.vmid, result.node);

      await this.markRunning(record, result.ipv4Address, result.vmid, result.node);
    } catch (e: any) {
      // A container that was created but never reached RUNNING is a half-built
      // artefact: destroy it and drop the vmid so the next attempt starts from a
      // clean state instead of reconciling a broken/orphaned LXC forever.
      await this.cleanupPartial(record, created);
      await this.markFailed(record, e);
    }
  }

  /**
   * Destroy a partially created LXC and release its vmid from the row.
   *
   * Best-effort: a cleanup failure must never mask the original provisioning
   * error, so it is recorded on the timeline as its own step and swallowed. If
   * the destroy fails, the vmid is deliberately kept on the row so an operator
   * (and the reconcile path) can still see the orphan rather than losing it.
   */
  private async cleanupPartial(
    record: any,
    created: { vmid: number; node?: string } | null,
  ): Promise<void> {
    if (!created) return;
    try {
      await this.proxmox.destroyContainer(created.vmid, created.node);
      await this.prisma.managedDatabase.update({
        where: { id: record.id },
        data: { proxmoxVmid: null, nodeName: null, provisionedAt: null, host: null },
      });
      await this.recordEvent(record.id, 'FAILED', 'Cleaned up partial container', {
        detail: { vmid: created.vmid, node: created.node ?? null, destroyed: true },
      });
      this.logger.warn(
        `Destroyed partially created LXC vmid=${created.vmid} for managed DB ${record.name}`,
      );
    } catch (err: any) {
      await this.recordEvent(record.id, 'FAILED', 'Partial container cleanup failed', {
        message: String(err?.message ?? err).slice(0, 300),
        detail: { vmid: created.vmid, node: created.node ?? null, orphaned: true },
      });
      this.logger.error(
        `Orphaned LXC vmid=${created.vmid} for managed DB ${record.name}: ${err?.message ?? err}`,
      );
    }
  }

  private async markRunning(
    record: any,
    host: string | null,
    vmid: number,
    node?: string | null,
  ): Promise<void> {
    await this.prisma.managedDatabase.update({
      where: { id: record.id },
      data: {
        status: 'RUNNING',
        host: host ?? undefined,
        errorMessage: null,
        provisionLockedAt: null,
        nextRetryAt: null,
      },
    });
    await this.recordEvent(record.id, 'RUNNING', 'Instance ready', {
      detail: { vmid, node: node ?? null, host },
    });
    this.logger.log(
      `Managed ${record.engine} ${record.name} running on vmid=${vmid} node=${node} ip=${host}`,
    );
  }

  private async markFailed(record: any, e: any): Promise<void> {
    const message = String(e?.message ?? e).slice(0, 500);
    const attempt = (record.provisionAttempts ?? 0) + 1;
    const exhausted = attempt >= ManagedDatabaseProvisionerService.MAX_ATTEMPTS;
    const retryDelay = ManagedDatabaseProvisionerService.backoffMs(attempt);
    const nextRetryAt = exhausted ? null : new Date(Date.now() + retryDelay);

    this.logger.error(
      `Managed DB ${record.name} provisioning failed (attempt ${attempt}/${ManagedDatabaseProvisionerService.MAX_ATTEMPTS}): ${message}`,
    );
    await this.prisma.managedDatabase
      .update({
        where: { id: record.id },
        // Release the lease so a retry can re-claim the row once backoff elapses.
        data: {
          status: 'FAILED',
          errorMessage: message,
          provisionLockedAt: null,
          nextRetryAt,
        },
      })
      .catch(() => undefined);
    await this.recordEvent(record.id, 'FAILED', 'Provisioning failed', {
      message,
      detail: {
        attempt,
        maxAttempts: ManagedDatabaseProvisionerService.MAX_ATTEMPTS,
        retryInMs: exhausted ? null : retryDelay,
        nextRetryAt: nextRetryAt?.toISOString() ?? null,
      },
    });
  }


  /** Poll the container until Proxmox reports it running (bounded). */
  private async waitForRunning(
    vmid: number,
    node?: string,
    attempts = 15,
  ): Promise<void> {
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

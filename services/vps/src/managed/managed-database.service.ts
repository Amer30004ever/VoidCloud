import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Observable } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '../../../../shared/crypto/crypto.util';
import { ManagedDatabaseProvisionerService } from './managed-database-provisioner.service';

export type ManagedEngine = 'POSTGRES' | 'MYSQL' | 'REDIS' | 'MONGODB';

export interface ManagedDbPlan {
  code: string;
  label: string;
  cpuCores: number;
  memoryMb: number;
  storageGb: number;
  monthlyUsd: number;
}

/** Catalogue of managed database plans (Tier 9). */
export const MANAGED_DB_PLANS: ManagedDbPlan[] = [
  { code: 'db-s1', label: 'Starter', cpuCores: 1, memoryMb: 1024, storageGb: 10, monthlyUsd: 12 },
  { code: 'db-m1', label: 'Standard', cpuCores: 2, memoryMb: 4096, storageGb: 50, monthlyUsd: 34 },
  { code: 'db-l1', label: 'Performance', cpuCores: 4, memoryMb: 8192, storageGb: 200, monthlyUsd: 89 },
];

const DEFAULT_PORTS: Record<ManagedEngine, number> = {
  POSTGRES: 5432,
  MYSQL: 3306,
  REDIS: 6379,
  MONGODB: 27017,
};

const DEFAULT_VERSIONS: Record<ManagedEngine, string> = {
  POSTGRES: '16',
  MYSQL: '8.4',
  REDIS: '7.4',
  MONGODB: '7.0',
};

const NAME_RE = /^[a-z][a-z0-9-]{2,30}$/;

@Injectable()
export class ManagedDatabaseService {
  private readonly logger = new Logger(ManagedDatabaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioner?: ManagedDatabaseProvisionerService,
  ) {}

  plans() {
    return MANAGED_DB_PLANS;
  }

  private plan(code: string): ManagedDbPlan {
    const found = MANAGED_DB_PLANS.find((p) => p.code === code);
    if (!found) throw new BadRequestException(`Unknown plan "${code}"`);
    return found;
  }

  /**
   * Select the least-loaded online Proxmox cluster node for the new instance.
   * Falls back to null (scheduler will retry) when no cluster has capacity.
   */
  private async selectPlacement(plan: ManagedDbPlan) {
    const clusters = await this.prisma.proxmoxCluster.findMany({
      where: { status: 'ACTIVE' },
    });
    const candidates = clusters
      .map((c: any) => ({
        cluster: c,
        freeMemMb: Math.max(0, Number(c.ramTotal ?? 0) - Number(c.ramUsed ?? 0)) / 1024 ** 2,
        freeCpu: Math.max(0, (c.cpuTotal ?? 0) - (c.cpuUsed ?? 0)),
        freeDiskGb: Math.max(0, Number(c.diskTotal ?? 0) - Number(c.diskUsed ?? 0)) / 1024 ** 3,
      }))
      .filter(
        (c) =>
          c.freeMemMb >= plan.memoryMb &&
          c.freeCpu >= plan.cpuCores &&
          c.freeDiskGb >= plan.storageGb,
      )
      .sort((a, b) => b.freeMemMb - a.freeMemMb);

    return candidates[0]?.cluster ?? null;
  }

  async create(
    userId: string,
    input: {
      name: string;
      engine: ManagedEngine;
      planCode: string;
      version?: string;
      organizationId?: string;
      backupsEnabled?: boolean;
    },
  ) {
    const name = (input.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name)) {
      throw new BadRequestException(
        'Name must be 3-31 chars, lowercase letters, digits or hyphens, starting with a letter',
      );
    }
    if (!DEFAULT_PORTS[input.engine]) {
      throw new BadRequestException('Unsupported engine');
    }

    const existing = await this.prisma.managedDatabase.findFirst({
      where: { userId, name, deletedAt: null },
    });
    if (existing) throw new ConflictException('A database with that name already exists');

    const plan = this.plan(input.planCode);
    const cluster = await this.selectPlacement(plan);

    const username = input.engine === 'REDIS' ? 'default' : `vc_${randomBytes(4).toString('hex')}`;
    const password = randomBytes(24).toString('base64url');

    const record = await this.prisma.managedDatabase.create({
      data: {
        userId,
        organizationId: input.organizationId ?? null,
        name,
        engine: input.engine as any,
        version: input.version || DEFAULT_VERSIONS[input.engine],
        planCode: plan.code,
        cpuCores: plan.cpuCores,
        memoryMb: plan.memoryMb,
        storageGb: plan.storageGb,
        backupsEnabled: input.backupsEnabled ?? true,
        status: cluster ? 'PROVISIONING' : 'PROVISIONING',
        clusterId: cluster?.id ?? null,
        nodeName: cluster?.name ?? null,
        databaseName: input.engine === 'REDIS' ? null : name.replace(/-/g, '_'),
        username,
        passwordCipher: encryptSecret(password),
        port: DEFAULT_PORTS[input.engine],
      },
    });

    this.logger.log(`Managed ${input.engine} "${name}" queued for user ${userId}`);

    // Kick off the real Proxmox LXC provisioning. Fire-and-forget: the row
    // carries the status/errorMessage so the HTTP caller is never blocked on
    // a cold Proxmox call.
    if (this.provisioner) {
      void this.provisioner.provision(record.id).catch((e) => {
        this.logger.error(`provision dispatch failed: ${e?.message ?? e}`);
      });
    }

    return this.toPublic(record);
  }

  /**
   * Mark an instance as reachable once the provisioner reports the endpoint.
   * Called by the provisioning worker / Proxmox callback.
   */
  async markRunning(id: string, host: string, port?: number) {
    const record = await this.prisma.managedDatabase.update({
      where: { id },
      data: { status: 'RUNNING', host, port: port ?? undefined, errorMessage: null },
    });
    return this.toPublic(record);
  }

  async markFailed(id: string, message: string) {
    const record = await this.prisma.managedDatabase.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: message.slice(0, 500) },
    });
    return this.toPublic(record);
  }

  async list(userId: string) {
    const rows = await this.prisma.managedDatabase.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { backups: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    return rows.map((row: any) => this.toPublic(row));
  }

  private async owned(userId: string, id: string) {
    const record = await this.prisma.managedDatabase.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Database not found');
    return record;
  }

  /**
   * Audit trail for timeline reads.
   *
   * The timeline exposes `errorMessage` and infrastructure detail (vmid, node),
   * so both the authorized read and the refused cross-tenant attempt are
   * recorded. Best-effort: auditing must never block or fail the read.
   */
  private async auditEventRead(
    userId: string,
    databaseId: string,
    status: 'SUCCESS' | 'FAILED',
  ): Promise<void> {
    await (this.prisma as any).auditLog
      ?.create({
        data: {
          userId,
          action: 'MANAGED_DB_EVENTS_READ',
          resource: 'managed_database',
          resourceId: databaseId,
          status,
        },
      })
      .catch(() => undefined);
  }

  async get(userId: string, id: string) {
    return this.toPublic(await this.owned(userId, id));
  }

  /**
   * Provisioning timeline for one instance, oldest step first.
   *
   * Goes through `owned()` first so a tenant can never read another tenant's
   * timeline (the events themselves carry vmid/node detail). Returns the
   * parent row's current status and errorMessage alongside the steps so the UI
   * can render a live progress view from a single request. The correlationId
   * links a failed step to the exact structured `proxmox.api` log line.
   */
  async events(userId: string, id: string) {
    const record = await this.ownedForTimeline(userId, id);
    await this.auditEventRead(userId, record.id, 'SUCCESS');
    return this.timelineFor(record);
  }

  /** Ownership check for timeline access; a refusal is audited as FAILED. */
  private async ownedForTimeline(userId: string, id: string): Promise<any> {
    try {
      return await this.owned(userId, id);
    } catch (e) {
      await this.auditEventRead(userId, id, 'FAILED');
      throw e;
    }
  }

  /** Timeline payload for an already-authorized row (no audit side effect). */
  private async timelineFor(record: any) {
    const events = await ((this.prisma as any).managedDatabaseEvent
      ?.findMany({
        where: { databaseId: record.id },
        orderBy: { createdAt: 'asc' },
        take: 200,
      })
      .catch(() => []) ?? Promise.resolve([]));
    return {
      status: record.status as string,
      errorMessage: record.errorMessage ?? null,
      provisionAttempts: record.provisionAttempts ?? 0,
      correlationId: record.correlationId ?? null,
      nextRetryAt: record.nextRetryAt ?? null,
      events: (events as any[]).map((e) => ({
        id: e.id,
        status: e.status,
        step: e.step,
        message: e.message ?? null,
        detail: e.detail ?? null,
        correlationId: e.correlationId ?? null,
        createdAt: e.createdAt,
      })),
    };
  }


  /**
   * Server-Sent Events stream of the same timeline.
   *
   * The producer is a short server-side poll (1s) rather than a DB LISTEN: the
   * provisioning writer is a plain Prisma insert, and a 1s server-side tick is
   * invisible to the user while keeping the browser at exactly one open
   * connection instead of a request every 3s. The stream completes on its own
   * once the instance reaches a terminal state, so idle dashboards hold nothing.
   */
  eventStream(userId: string, id: string): Observable<{ data: any }> {
    const TERMINAL = new Set(['RUNNING', 'FAILED', 'STOPPED', 'DELETED']);
    let lastCount = -1;
    let lastStatus = '';

    return new Observable<{ data: any }>((subscriber) => {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let audited = false;

      const tick = async () => {
        if (stopped) return;
        try {
          // Ownership is re-checked on every tick (access can be revoked
          // mid-stream) but only the first read is audited, so a long-lived
          // stream cannot flood the audit log.
          const record = await this.ownedForTimeline(userId, id);
          if (!audited) {
            audited = true;
            await this.auditEventRead(userId, record.id, 'SUCCESS');
          }
          const payload = await this.timelineFor(record);
          // Only push when something actually changed.
          if (payload.events.length !== lastCount || payload.status !== lastStatus) {
            lastCount = payload.events.length;
            lastStatus = payload.status;
            subscriber.next({ data: payload });
          }
          if (TERMINAL.has(payload.status)) {
            subscriber.complete();
            return;
          }
        } catch (e) {
          subscriber.error(e);
          return;
        }
        timer = setTimeout(tick, 1000);
      };


      void tick();
      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
      };
    });
  }




  /** Reveal the connection string; only the owner may call this. */
  async connectionString(userId: string, id: string) {
    const record: any = await this.owned(userId, id);
    const password = decryptSecret(record.passwordCipher);
    if (!record.host) {
      throw new BadRequestException('Instance is still provisioning');
    }
    const scheme: Record<string, string> = {
      POSTGRES: 'postgresql',
      MYSQL: 'mysql',
      REDIS: 'redis',
      MONGODB: 'mongodb',
    };
    const path = record.databaseName ? `/${record.databaseName}` : '';
    const uri = `${scheme[record.engine]}://${record.username}:${encodeURIComponent(password)}@${record.host}:${record.port}${path}`;
    return { uri, host: record.host, port: record.port, username: record.username, password };
  }

  async setPower(userId: string, id: string, action: 'start' | 'stop') {
    const record = await this.owned(userId, id);
    if (record.status === 'FAILED') {
      throw new BadRequestException('Instance is in a failed state');
    }
    if (this.provisioner) {
      await this.provisioner.setPower(record, action);
    }
    const updated = await this.prisma.managedDatabase.update({
      where: { id: record.id },
      data: { status: action === 'start' ? 'RUNNING' : 'STOPPED' },
    });
    return this.toPublic(updated);
  }

  async resize(userId: string, id: string, planCode: string) {
    const record = await this.owned(userId, id);
    const plan = this.plan(planCode);
    if (plan.storageGb < record.storageGb) {
      throw new BadRequestException('Storage cannot be reduced');
    }
    if (this.provisioner) {
      await this.provisioner.resize(record, plan);
    }
    const updated = await this.prisma.managedDatabase.update({
      where: { id: record.id },
      data: {
        planCode: plan.code,
        cpuCores: plan.cpuCores,
        memoryMb: plan.memoryMb,
        storageGb: plan.storageGb,
      },
    });
    return this.toPublic(updated);
  }

  async createBackup(userId: string, id: string) {
    const record = await this.owned(userId, id);
    const backup = await this.prisma.managedDatabaseBackup.create({
      data: { databaseId: record.id, status: 'PENDING' },
    });
    if (this.provisioner) {
      void this.provisioner
        .backup(record)
        .then((r) => this.completeBackup(backup.id, r.sizeBytes, r.location))
        .catch((e) =>
          this.prisma.managedDatabaseBackup
            .update({
              where: { id: backup.id },
              data: { status: 'FAILED', location: String(e?.message ?? e).slice(0, 200) },
            })
            .catch(() => undefined),
        );
    }
    return backup;
  }

  async completeBackup(backupId: string, sizeBytes: number, location: string) {
    return this.prisma.managedDatabaseBackup.update({
      where: { id: backupId },
      data: {
        status: 'COMPLETED',
        sizeBytes: BigInt(Math.max(0, Math.floor(sizeBytes))),
        location,
        completedAt: new Date(),
      },
    });
  }

  async destroy(userId: string, id: string) {
    const record = await this.owned(userId, id);
    if (this.provisioner) {
      await this.provisioner.destroy(record).catch((e) => {
        this.logger.warn(`Proxmox destroy failed for ${record.id}: ${e?.message ?? e}`);
      });
    }
    await this.prisma.managedDatabase.update({
      where: { id: record.id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    return { deleted: true, id: record.id };
  }

  private toPublic(record: any) {
    const { passwordCipher, ...rest } = record;
    return {
      ...rest,
      hasCredentials: Boolean(passwordCipher),
      backups: record.backups?.map((b: any) => ({ ...b, sizeBytes: Number(b.sizeBytes ?? 0) })),
    };
  }
}

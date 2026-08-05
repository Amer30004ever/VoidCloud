import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '../../../../shared/crypto/crypto.util';

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

  constructor(private readonly prisma: PrismaService) {}

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
      where: { status: 'ONLINE', enabled: true },
    });
    const candidates = clusters
      .map((c: any) => ({
        cluster: c,
        freeMemMb: Math.max(0, (c.totalMemoryMb ?? 0) - (c.usedMemoryMb ?? 0)),
        freeCpu: Math.max(0, (c.totalCpuCores ?? 0) - (c.usedCpuCores ?? 0)),
        freeDiskGb: Math.max(0, (c.totalStorageGb ?? 0) - (c.usedStorageGb ?? 0)),
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
        nodeName: cluster?.nodeName ?? null,
        databaseName: input.engine === 'REDIS' ? null : name.replace(/-/g, '_'),
        username,
        passwordCipher: encryptSecret(password),
        port: DEFAULT_PORTS[input.engine],
      },
    });

    this.logger.log(`Managed ${input.engine} "${name}" queued for user ${userId}`);
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

  async get(userId: string, id: string) {
    return this.toPublic(await this.owned(userId, id));
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
    return this.prisma.managedDatabaseBackup.create({
      data: { databaseId: record.id, status: 'PENDING' },
    });
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

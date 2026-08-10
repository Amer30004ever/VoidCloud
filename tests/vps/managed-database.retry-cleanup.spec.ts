/**
 * Retry backoff, bounded attempts, and orphan cleanup for managed DB provisioning.
 *
 * Complements managed-database.idempotency.spec.ts (which proves no duplicate
 * LXC is ever created). Here the concern is what happens *after* a failure:
 * a half-built container must be destroyed, retries must be spaced out and
 * capped, and the timeline must say exactly when the next attempt is due.
 */
import { ManagedDatabaseProvisionerService } from '../../services/vps/src/managed/managed-database-provisioner.service';

type Row = Record<string, any>;

function buildPrisma(row: Row) {
  const events: Row[] = [];
  const prisma: any = {
    __row: row,
    __events: events,
    managedDatabase: {
      findUnique: jest.fn(async () => ({ ...prisma.__row })),
      update: jest.fn(async ({ data }: any) => {
        for (const [k, v] of Object.entries<any>(data)) {
          prisma.__row[k] = v && typeof v === 'object' && 'increment' in v
            ? (prisma.__row[k] ?? 0) + v.increment
            : v;
        }
        return { ...prisma.__row };
      }),
      updateMany: jest.fn(async ({ data }: any) => {
        for (const [k, v] of Object.entries<any>(data)) {
          prisma.__row[k] = v && typeof v === 'object' && 'increment' in v
            ? (prisma.__row[k] ?? 0) + v.increment
            : v;
        }
        return { count: 1 };
      }),
    },
    managedDatabaseEvent: {
      create: jest.fn(async ({ data }: any) => {
        events.push(data);
        return data;
      }),
    },
  };
  return prisma;
}

function baseRow(): Row {
  return {
    id: 'db-1',
    name: 'orders',
    engine: 'POSTGRES',
    userId: 'user-A',
    organizationId: null,
    cpuCores: 2,
    memoryMb: 2048,
    storageGb: 20,
    status: 'PROVISIONING',
    proxmoxVmid: null,
    nodeName: null,
    provisionAttempts: 0,
    provisionLockedAt: null,
    nextRetryAt: null,
    deletedAt: null,
  };
}

function buildService(prisma: any, proxmox: any) {
  return new ManagedDatabaseProvisionerService(prisma as any, proxmox as any);
}

describe('ManagedDatabaseProvisioner — backoff, bounded attempts, orphan cleanup', () => {
  it('destroys a partially created LXC when boot fails, so a retry starts clean', async () => {
    const prisma = buildPrisma(baseRow());
    const proxmox = {
      createContainer: jest.fn(async () => ({ vmid: 601, node: 'pve-1', ipv4Address: '10.0.0.7' })),
      startContainer: jest.fn(async () => {
        throw new Error('CT 601 failed to start');
      }),
      destroyContainer: jest.fn(async () => undefined),
      getContainerStatus: jest.fn(async () => ({ status: 'stopped' })),
    };

    await buildService(prisma, proxmox).provision('db-1');

    // The half-built container is gone...
    expect(proxmox.destroyContainer).toHaveBeenCalledWith(601, 'pve-1');
    // ...and the row no longer points at an orphaned vmid.
    expect(prisma.__row.proxmoxVmid).toBeNull();
    expect(prisma.__row.status).toBe('FAILED');
    expect(
      prisma.__events.some((e) => e.step === 'Cleaned up partial container'),
    ).toBe(true);
  });

  it('keeps the vmid visible and flags an orphan when the cleanup destroy itself fails', async () => {
    const prisma = buildPrisma(baseRow());
    const proxmox = {
      createContainer: jest.fn(async () => ({ vmid: 602, node: 'pve-2', ipv4Address: null })),
      startContainer: jest.fn(async () => {
        throw new Error('boot timeout');
      }),
      destroyContainer: jest.fn(async () => {
        throw new Error('node unreachable');
      }),
      getContainerStatus: jest.fn(async () => ({ status: 'stopped' })),
    };

    await buildService(prisma, proxmox).provision('db-1');

    // vmid deliberately retained so an operator can still find the orphan.
    expect(prisma.__row.proxmoxVmid).toBe(602);
    const orphanEvent = prisma.__events.find(
      (e) => e.step === 'Partial container cleanup failed',
    );
    expect(orphanEvent).toBeTruthy();
    expect((orphanEvent as any).detail.orphaned).toBe(true);
    // The original provisioning error, not the cleanup error, is what the row shows.
    expect(prisma.__row.errorMessage).toContain('boot timeout');
  });

  it('schedules an exponentially larger retry window on each failed attempt', () => {
    const d1 = ManagedDatabaseProvisionerService.backoffMs(1);
    const d2 = ManagedDatabaseProvisionerService.backoffMs(2);
    const d4 = ManagedDatabaseProvisionerService.backoffMs(4);
    // Jitter is ±20%, so compare with margin rather than exact doubling.
    expect(d1).toBeGreaterThan(0);
    expect(d2).toBeGreaterThan(d1);
    expect(d4).toBeGreaterThan(d2);
    // Bounded: never runs away.
    expect(ManagedDatabaseProvisionerService.backoffMs(50)).toBeLessThanOrEqual(
      10 * 60 * 1000 * 1.2 + 1,
    );
  });

  it('sets nextRetryAt on failure and refuses to retry while the window is open', async () => {
    const prisma = buildPrisma(baseRow());
    const proxmox = {
      createContainer: jest.fn(async () => {
        throw new Error('no free vmid on cluster');
      }),
      startContainer: jest.fn(),
      destroyContainer: jest.fn(),
      getContainerStatus: jest.fn(),
    };
    const svc = buildService(prisma, proxmox);

    await svc.provision('db-1');
    expect(prisma.__row.status).toBe('FAILED');
    expect(prisma.__row.nextRetryAt).toBeInstanceOf(Date);
    expect(prisma.__row.nextRetryAt.getTime()).toBeGreaterThan(Date.now());

    // A retry inside the backoff window must not touch Proxmox again.
    proxmox.createContainer.mockClear();
    await svc.provision('db-1');
    expect(proxmox.createContainer).not.toHaveBeenCalled();
  });

  it('gives up permanently after the bounded attempt count', async () => {
    const row = baseRow();
    row.provisionAttempts = 5;
    row.status = 'FAILED';
    const prisma = buildPrisma(row);
    const proxmox = {
      createContainer: jest.fn(),
      startContainer: jest.fn(),
      destroyContainer: jest.fn(),
      getContainerStatus: jest.fn(),
    };

    await buildService(prisma, proxmox).provision('db-1');
    expect(proxmox.createContainer).not.toHaveBeenCalled();
  });

  it('stamps one correlation id on every event of a single attempt', async () => {
    const prisma = buildPrisma(baseRow());
    const proxmox = {
      createContainer: jest.fn(async () => ({ vmid: 700, node: 'pve-1', ipv4Address: '10.0.0.9' })),
      startContainer: jest.fn(async () => undefined),
      destroyContainer: jest.fn(),
      getStatus: jest.fn(async () => ({ status: 'running' })),
      runWithCorrelation: <T,>(_id: string, fn: () => Promise<T>) => fn(),
    };

    await buildService(prisma, proxmox).provision('db-1');

    const ids = new Set(prisma.__events.map((e) => e.correlationId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^prov_/);
    // The row carries the same id so the UI can link event -> proxmox.api logs.
    expect(prisma.__row.correlationId).toBe([...ids][0]);
  });
});

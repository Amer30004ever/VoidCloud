/**
 * Idempotency of ManagedDatabaseProvisionerService.provision().
 *
 * Regression guard for the original defect: repeated provisioning calls (retry
 * button, queue redelivery, two pods handling the same event) each created a
 * fresh LXC, leaking billable containers and orphaning the earlier vmid.
 *
 * These cases run everywhere — Proxmox is stubbed, so no cluster is required.
 */
import { ManagedDatabaseProvisionerService } from '../../services/vps/src/managed/managed-database-provisioner.service';

function makePrisma(row: Record<string, any>) {
  const events: any[] = [];
  const record: Record<string, any> = { ...row };
  const applyData = (data: Record<string, any>) => {
    for (const [k, v] of Object.entries(data)) {
      record[k] = (v as any)?.increment
        ? (record[k] ?? 0) + (v as any).increment
        : v;
    }
  };
  // Mirrors the conditional-claim semantics of the real updateMany: the write
  // only lands when the row still matches the lock predicate.
  const matchesClaim = (where: any) => {
    if (where.proxmoxVmid === null && record.proxmoxVmid !== null) return false;
    if (where.deletedAt === null && record.deletedAt !== null) return false;
    if (Array.isArray(where.OR)) {
      const lockFree = record.provisionLockedAt == null;
      const cutoff = where.OR.find((c: any) => c.provisionLockedAt?.lt)?.provisionLockedAt?.lt;
      const expired =
        record.provisionLockedAt != null && cutoff && record.provisionLockedAt < cutoff;
      if (!lockFree && !expired) return false;
    }
    return true;
  };
  return {
    events,
    record,
    managedDatabase: {
      findUnique: jest.fn(async () => ({ ...record })),
      update: jest.fn(async ({ data }: any) => {
        applyData(data);
        return { ...record };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (!matchesClaim(where)) return { count: 0 };
        applyData(data);
        return { count: 1 };
      }),
    },
    managedDatabaseEvent: {
      create: jest.fn(async ({ data }: any) => {
        const ev = { id: `ev-${events.length + 1}`, createdAt: new Date(), ...data };
        events.push(ev);
        return ev;
      }),
    },
  };
}

function makeProxmox(overrides: Partial<Record<string, any>> = {}) {
  let nextVmid = 500;
  return {
    isLive: () => false,
    createContainer: jest.fn(async () => ({
      vmid: nextVmid++,
      ipv4Address: '10.0.0.5',
      node: 'pve-1',
      rootPassword: 'secret',
    })),
    startContainer: jest.fn(async () => undefined),
    stopContainer: jest.fn(async () => undefined),
    getStatus: jest.fn(async () => ({ status: 'running' })),
    ...overrides,
  } as any;
}

const baseRow = {
  id: 'db-1',
  name: 'orders',
  engine: 'POSTGRES',
  status: 'PROVISIONING',
  cpuCores: 1,
  memoryMb: 1024,
  storageGb: 10,
  userId: 'user-1',
  organizationId: null,
  proxmoxVmid: null,
  nodeName: null,
  host: null,
  provisionLockedAt: null,
  provisionAttempts: 0,
  deletedAt: null,
};

describe('ManagedDatabaseProvisionerService idempotency', () => {
  it('creates exactly one container across sequential provision() calls', async () => {
    const prisma = makePrisma(baseRow);
    const proxmox = makeProxmox();
    const svc = new ManagedDatabaseProvisionerService(prisma as any, proxmox);

    await svc.provision('db-1');
    await svc.provision('db-1');
    await svc.provision('db-1');

    expect(proxmox.createContainer).toHaveBeenCalledTimes(1);
    expect(prisma.record.status).toBe('RUNNING');
  });

  it('creates exactly one container when two workers race', async () => {
    const prisma = makePrisma(baseRow);
    const proxmox = makeProxmox();
    const svc = new ManagedDatabaseProvisionerService(prisma as any, proxmox);

    await Promise.all([svc.provision('db-1'), svc.provision('db-1')]);

    // The loser of the claim must not have issued a create.
    expect(proxmox.createContainer).toHaveBeenCalledTimes(1);
  });

  it('recovers from a partial failure by reconciling the existing container', async () => {
    // Container was created, then the worker died before it reached RUNNING.
    const prisma = makePrisma({
      ...baseRow,
      proxmoxVmid: 777,
      nodeName: 'pve-2',
      host: '10.0.0.9',
      status: 'PROVISIONING',
      provisionLockedAt: new Date(),
    });
    const proxmox = makeProxmox();
    const svc = new ManagedDatabaseProvisionerService(prisma as any, proxmox);

    await svc.provision('db-1');

    expect(proxmox.createContainer).not.toHaveBeenCalled();
    expect(proxmox.startContainer).toHaveBeenCalledWith(777, 'pve-2');
    expect(prisma.record.status).toBe('RUNNING');
    expect(prisma.record.proxmoxVmid).toBe(777);
  });

  it('records a FAILED step and releases the lease so a retry can re-claim', async () => {
    const prisma = makePrisma(baseRow);
    const proxmox = makeProxmox({
      createContainer: jest.fn(async () => {
        throw new Error('no free vmid on cluster');
      }),
    });
    const svc = new ManagedDatabaseProvisionerService(prisma as any, proxmox);

    await svc.provision('db-1');

    expect(prisma.record.status).toBe('FAILED');
    expect(prisma.record.errorMessage).toContain('no free vmid');
    // Lease released → operator retry is possible.
    expect(prisma.record.provisionLockedAt).toBeNull();
    const failed = prisma.events.find((e: any) => e.status === 'FAILED');
    expect(failed?.message).toContain('no free vmid');
  });

  it('never re-provisions an instance that is already RUNNING', async () => {
    const prisma = makePrisma({
      ...baseRow,
      status: 'RUNNING',
      proxmoxVmid: 42,
      nodeName: 'pve-1',
    });
    const proxmox = makeProxmox();
    const svc = new ManagedDatabaseProvisionerService(prisma as any, proxmox);

    await svc.provision('db-1');

    expect(proxmox.createContainer).not.toHaveBeenCalled();
    expect(proxmox.startContainer).not.toHaveBeenCalled();
  });

  it('writes a timeline the UI can render, ending in RUNNING', async () => {
    const prisma = makePrisma(baseRow);
    const svc = new ManagedDatabaseProvisionerService(prisma as any, makeProxmox());

    await svc.provision('db-1');

    const steps = prisma.events.map((e: any) => e.step);
    expect(steps).toEqual([
      'Creating LXC container',
      'Container created',
      'Booting container',
      'Instance ready',
    ]);
    expect(prisma.events[prisma.events.length - 1].status).toBe('RUNNING');
  });
});

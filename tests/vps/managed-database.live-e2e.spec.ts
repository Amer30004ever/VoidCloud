/**
 * End-to-end managed-database provisioning against a REAL Proxmox cluster.
 *
 * This spec is opt-in. It only runs when a live cluster is configured:
 *
 *   PROXMOX_HOST, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET   (real credentials)
 *   PROXMOX_E2E=1                                          (explicit opt-in)
 *
 * Without all of the above every case is skipped, so CI and local runs stay
 * green on a machine with no cluster. That is deliberate: the previous
 * "proxmox-live-lifecycle" coverage proves the HTTP wire format against a local
 * HTTPS mock, but only a real cluster can prove that `POST /nodes/<node>/lxc`
 * is accepted and that the row actually transitions PROVISIONING -> RUNNING.
 *
 * The test creates a real container and ALWAYS destroys it in afterAll, even on
 * failure, so a run cannot leak billable resources on the cluster.
 *
 *   PROXMOX_E2E=1 pnpm jest tests/vps/managed-database.live-e2e.spec.ts
 */
import { ManagedDatabaseProvisionerService } from '../../services/vps/src/managed/managed-database-provisioner.service';
import { ProxmoxService } from '../../services/vps/src/proxmox/proxmox.service';

const LIVE =
  process.env.PROXMOX_E2E === '1' &&
  Boolean(process.env.PROXMOX_HOST) &&
  Boolean(process.env.PROXMOX_TOKEN_ID) &&
  Boolean(process.env.PROXMOX_TOKEN_SECRET);

// `describe.skip` when not configured — the suite reports as skipped, not passed.
const describeLive = LIVE ? describe : describe.skip;

/**
 * Minimal in-memory Prisma double for the single row under test.
 *
 * The point of this spec is the Proxmox side of the transaction, so the DB is
 * simulated: it records exactly the writes the provisioner performs, which is
 * what we assert the status transition against.
 */
function makePrismaDouble(row: Record<string, any>) {
  const events: any[] = [];
  const record = { ...row };
  return {
    events,
    record,
    managedDatabase: {
      findUnique: jest.fn(async () => ({ ...record })),
      update: jest.fn(async ({ data }: any) => {
        for (const [k, v] of Object.entries(data)) {
          record[k] = (v as any)?.increment
            ? (record[k] ?? 0) + (v as any).increment
            : v;
        }
        return { ...record };
      }),
      updateMany: jest.fn(async ({ data }: any) => {
        for (const [k, v] of Object.entries(data)) {
          record[k] = (v as any)?.increment
            ? (record[k] ?? 0) + (v as any).increment
            : v;
        }
        return { count: 1 };
      }),
    },
    managedDatabaseEvent: {
      create: jest.fn(async ({ data }: any) => {
        const ev = { id: `ev-${events.length + 1}`, createdAt: new Date(), ...data };
        events.push(ev);
        return ev;
      }),
      findMany: jest.fn(async () => events),
    },
  };
}

describeLive('Managed database provisioning against a live Proxmox cluster', () => {
  jest.setTimeout(5 * 60 * 1000); // container create + boot + poll

  let proxmox: ProxmoxService;
  let provisioner: ManagedDatabaseProvisionerService;
  let prisma: ReturnType<typeof makePrismaDouble>;
  let createSpy: jest.SpyInstance;

  const dbName = `e2e-${Date.now().toString(36)}`;

  beforeAll(() => {
    proxmox = new ProxmoxService();
    prisma = makePrismaDouble({
      id: 'live-db-1',
      name: dbName,
      engine: 'POSTGRES',
      status: 'PROVISIONING',
      cpuCores: 1,
      memoryMb: 1024,
      storageGb: 8,
      userId: 'user-live',
      organizationId: null,
      proxmoxVmid: null,
      provisionLockedAt: null,
      provisionAttempts: 0,
      deletedAt: null,
    });
    provisioner = new ManagedDatabaseProvisionerService(prisma as any, proxmox);
    createSpy = jest.spyOn(proxmox, 'createContainer');
  });

  afterAll(async () => {
    // Always clean up the container we created, even if assertions failed.
    const vmid = prisma?.record?.proxmoxVmid;
    if (vmid) {
      await proxmox
        .destroyContainer(vmid, prisma.record.nodeName ?? undefined)
        .catch(() => undefined);
    }
  });

  it('reports the cluster as live', () => {
    expect(proxmox.isLive()).toBe(true);
  });

  it('issues a real LXC creation call and transitions PROVISIONING -> RUNNING', async () => {
    expect(prisma.record.status).toBe('PROVISIONING');

    await provisioner.provision('live-db-1');

    // The real Proxmox create call was made with the row's plan spec.
    expect(createSpy).toHaveBeenCalledTimes(1);
    const spec = createSpy.mock.calls[0][0];
    expect(spec).toMatchObject({
      hostname: `db-${dbName}`,
      cpuCores: 1,
      ramMB: 1024,
      storageGB: 8,
    });

    // The cluster handed back a real vmid on a real node.
    expect(typeof prisma.record.proxmoxVmid).toBe('number');
    expect(prisma.record.proxmoxVmid).toBeGreaterThan(0);
    expect(typeof prisma.record.nodeName).toBe('string');

    // The status transition actually completed.
    expect(prisma.record.status).toBe('RUNNING');
    expect(prisma.record.errorMessage).toBeNull();
    expect(prisma.record.host).toBeTruthy();

    // And Proxmox itself agrees the container is running.
    const status = await proxmox.getStatus(
      prisma.record.proxmoxVmid,
      prisma.record.nodeName,
    );
    expect(status?.status).toBe('running');

    // The timeline captured the transition for the UI.
    const steps = prisma.events.map((e: any) => e.status);
    expect(steps[0]).toBe('PROVISIONING');
    expect(steps[steps.length - 1]).toBe('RUNNING');
  });

  it('is idempotent: a second provision() call creates no second container', async () => {
    const vmidBefore = prisma.record.proxmoxVmid;
    createSpy.mockClear();

    await provisioner.provision('live-db-1');

    expect(createSpy).not.toHaveBeenCalled();
    expect(prisma.record.proxmoxVmid).toBe(vmidBefore);
    expect(prisma.record.status).toBe('RUNNING');
  });
});

// Guard so the file itself is never an empty suite when skipped.
describe('live Proxmox e2e harness', () => {
  it('documents how to enable the live run', () => {
    expect(LIVE || !LIVE).toBe(true);
    if (!LIVE) {
      // eslint-disable-next-line no-console
      console.log(
        '[managed-database.live-e2e] skipped — set PROXMOX_E2E=1 plus PROXMOX_HOST/TOKEN_ID/TOKEN_SECRET to run against a real cluster.',
      );
    }
  });
});

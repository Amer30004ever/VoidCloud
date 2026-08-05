import { ObjectStorageService } from '../../services/vps/src/managed/object-storage.service';
import { ManagedK8sService } from '../../services/vps/src/managed/managed-k8s.service';
import { VmImportService } from '../../services/vps/src/managed/vm-import.service';
import {
  ManagedDatabaseService,
  MANAGED_DB_PLANS,
} from '../../services/vps/src/managed/managed-database.service';

function prismaMock(overrides: any = {}) {
  return {
    proxmoxCluster: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    managedDatabase: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'db1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'db1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    managedDatabaseBackup: { create: jest.fn().mockResolvedValue({ id: 'b1' }) },
    objectStorageBucket: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'bk1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'bk1', quotaGb: 1, ...data })),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    objectStorageKey: {
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'k1', ...data })),
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    managedK8sCluster: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'c1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'c1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    managedK8sNodePool: {
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'p2', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'p1', ...data })),
      updateMany: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
    vmImportJob: {
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'j1', ...data })),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'j1', sizeBytes: 0n, ...data })),
    },
    ...overrides,
  } as any;
}

describe('Tier 9 — managed databases', () => {
  it('rejects invalid instance names', async () => {
    const svc = new ManagedDatabaseService(prismaMock());
    await expect(
      svc.create('u1', { name: 'X', engine: 'POSTGRES', planCode: 'db-s1' }),
    ).rejects.toThrow(/Name must be/);
  });

  it('rejects unknown plans', async () => {
    const svc = new ManagedDatabaseService(prismaMock());
    await expect(
      svc.create('u1', { name: 'orders', engine: 'POSTGRES', planCode: 'nope' }),
    ).rejects.toThrow(/Unknown plan/);
  });

  it('stores encrypted credentials and never returns the cipher', async () => {
    const prisma = prismaMock();
    const svc = new ManagedDatabaseService(prisma);
    const created: any = await svc.create('u1', {
      name: 'orders',
      engine: 'POSTGRES',
      planCode: 'db-m1',
    });
    const data = prisma.managedDatabase.create.mock.calls[0][0].data;
    expect(data.passwordCipher).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(data.port).toBe(5432);
    expect(data.cpuCores).toBe(MANAGED_DB_PLANS[1].cpuCores);
    expect(created.passwordCipher).toBeUndefined();
    expect(created.hasCredentials).toBe(true);
  });

  it('places the instance on the cluster with the most free memory', async () => {
    const prisma = prismaMock();
    prisma.proxmoxCluster.findMany.mockResolvedValue([
      { id: 'small', name: 'pve-1', ramTotal: 8n * 1024n ** 3n, ramUsed: 7n * 1024n ** 3n, cpuTotal: 8, cpuUsed: 1, diskTotal: 500n * 1024n ** 3n, diskUsed: 0n },
      { id: 'big', name: 'pve-2', ramTotal: 64n * 1024n ** 3n, ramUsed: 0n, cpuTotal: 32, cpuUsed: 0, diskTotal: 2000n * 1024n ** 3n, diskUsed: 0n },
    ]);
    const svc = new ManagedDatabaseService(prisma);
    await svc.create('u1', { name: 'orders', engine: 'MYSQL', planCode: 'db-m1' });
    const data = prisma.managedDatabase.create.mock.calls[0][0].data;
    expect(data.clusterId).toBe('big');
    expect(data.nodeName).toBe('pve-2');
  });

  it('refuses a name that is already taken by the same user', async () => {
    const prisma = prismaMock();
    prisma.managedDatabase.findFirst.mockResolvedValue({ id: 'existing' });
    const svc = new ManagedDatabaseService(prisma);
    await expect(
      svc.create('u1', { name: 'orders', engine: 'POSTGRES', planCode: 'db-s1' }),
    ).rejects.toThrow(/already exists/);
  });

  it('refuses to shrink storage on resize', async () => {
    const prisma = prismaMock();
    prisma.managedDatabase.findFirst.mockResolvedValue({ id: 'db1', userId: 'u1', storageGb: 200 });
    const svc = new ManagedDatabaseService(prisma);
    await expect(svc.resize('u1', 'db1', 'db-s1')).rejects.toThrow(/cannot be reduced/);
  });

  it('does not leak another user instance', async () => {
    const prisma = prismaMock();
    prisma.managedDatabase.findFirst.mockResolvedValue(null);
    const svc = new ManagedDatabaseService(prisma);
    await expect(svc.get('intruder', 'db1')).rejects.toThrow(/not found/i);
  });

  it('builds a connection URI only once the host is known', async () => {
    const prisma = prismaMock();
    const svc = new ManagedDatabaseService(prisma);
    await svc.create('u1', { name: 'orders', engine: 'POSTGRES', planCode: 'db-s1' });
    const cipher = prisma.managedDatabase.create.mock.calls[0][0].data.passwordCipher;

    prisma.managedDatabase.findFirst.mockResolvedValue({
      id: 'db1',
      userId: 'u1',
      engine: 'POSTGRES',
      host: null,
      port: 5432,
      username: 'vc_abc',
      databaseName: 'orders',
      passwordCipher: cipher,
    });
    await expect(svc.connectionString('u1', 'db1')).rejects.toThrow(/provisioning/);

    prisma.managedDatabase.findFirst.mockResolvedValue({
      id: 'db1',
      userId: 'u1',
      engine: 'POSTGRES',
      host: 'db1.voidcloud.internal',
      port: 5432,
      username: 'vc_abc',
      databaseName: 'orders',
      passwordCipher: cipher,
    });
    const conn = await svc.connectionString('u1', 'db1');
    expect(conn.uri).toContain('postgresql://vc_abc:');
    expect(conn.uri).toContain('@db1.voidcloud.internal:5432/orders');
    expect(conn.password.length).toBeGreaterThan(10);
  });
});

describe('Tier 9 — object storage', () => {
  it('validates bucket names', async () => {
    const svc = new ObjectStorageService(prismaMock());
    await expect(svc.createBucket('u1', { name: 'A_B' })).rejects.toThrow(/Bucket name/);
  });

  it('clamps the quota into a sane range', async () => {
    const prisma = prismaMock();
    const svc = new ObjectStorageService(prisma);
    await svc.createBucket('u1', { name: 'backups', quotaGb: 999999 });
    expect(prisma.objectStorageBucket.create.mock.calls[0][0].data.quotaGb).toBe(10_000);
  });

  it('returns the secret exactly once and stores it encrypted', async () => {
    const prisma = prismaMock();
    prisma.objectStorageBucket.findUnique.mockResolvedValue({
      id: 'bk1',
      userId: 'u1',
      name: 'backups',
      endpoint: 'https://s3.voidcloud.cc.cd',
    });
    const svc = new ObjectStorageService(prisma);
    const key = await svc.createKey('u1', 'bk1', 'ci', true);
    expect(key.secretKey).toBeTruthy();
    const stored = prisma.objectStorageKey.create.mock.calls[0][0].data.secretCipher;
    expect(stored).not.toContain(key.secretKey);
  });

  it('blocks key creation on someone else bucket', async () => {
    const prisma = prismaMock();
    prisma.objectStorageBucket.findUnique.mockResolvedValue({ id: 'bk1', userId: 'owner' });
    const svc = new ObjectStorageService(prisma);
    await expect(svc.createKey('intruder', 'bk1', 'ci')).rejects.toThrow(/Not your bucket/);
  });

  it('refuses to delete a non-empty bucket', async () => {
    const prisma = prismaMock();
    prisma.objectStorageBucket.findUnique.mockResolvedValue({ id: 'bk1', userId: 'u1', objectCount: 3 });
    const svc = new ObjectStorageService(prisma);
    await expect(svc.deleteBucket('u1', 'bk1')).rejects.toThrow(/not empty/);
  });

  it('presigns a URL carrying key, expiry and signature', async () => {
    const prisma = prismaMock();
    prisma.objectStorageBucket.findUnique.mockResolvedValue({
      id: 'bk1',
      userId: 'u1',
      name: 'backups',
      endpoint: 'https://s3.voidcloud.cc.cd',
    });
    prisma.objectStorageKey.findFirst.mockResolvedValue({
      accessKey: 'VCABC',
      secretCipher: '',
    });
    const svc = new ObjectStorageService(prisma);
    const { url, expiresAt } = await svc.presignGet('u1', 'bk1', 'dump.sql', 60);
    expect(url).toContain('/backups/dump.sql?X-VC-Key=VCABC');
    expect(url).toMatch(/X-VC-Signature=[0-9a-f]{64}/);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('flags usage above the quota', async () => {
    const prisma = prismaMock();
    prisma.objectStorageBucket.update.mockResolvedValue({ quotaGb: 1, usedBytes: 2n * 1024n ** 3n });
    const svc = new ObjectStorageService(prisma);
    const result = await svc.reportUsage('bk1', 2 * 1024 ** 3, 10);
    expect(result.overQuota).toBe(true);
  });
});

describe('Tier 9 — managed Kubernetes', () => {
  it('rejects unsupported versions', async () => {
    const svc = new ManagedK8sService(prismaMock());
    await expect(svc.createCluster('u1', { name: 'prod', k8sVersion: '1.10' })).rejects.toThrow(
      /Unsupported version/,
    );
  });

  it('creates a default node pool with clamped sizing', async () => {
    const prisma = prismaMock();
    const svc = new ManagedK8sService(prisma);
    await svc.createCluster('u1', { name: 'prod', nodePool: { nodeCount: 500, cpuCores: 999 } });
    const pool = prisma.managedK8sCluster.create.mock.calls[0][0].data.nodePools.create[0];
    expect(pool.nodeCount).toBe(50);
    expect(pool.cpuCores).toBe(32);
  });

  it('blocks kubeconfig access for non-owners', async () => {
    const prisma = prismaMock();
    prisma.managedK8sCluster.findFirst.mockResolvedValue({ id: 'c1', userId: 'owner', nodePools: [] });
    const svc = new ManagedK8sService(prisma);
    await expect(svc.kubeconfig('intruder', 'c1')).rejects.toThrow(/Not your cluster/);
  });

  it('round-trips the kubeconfig through encryption', async () => {
    const prisma = prismaMock();
    const svc = new ManagedK8sService(prisma);
    await svc.markReady('c1', 'https://c1.k8s.voidcloud.cc.cd:6443', 'apiVersion: v1');
    const cipher = prisma.managedK8sCluster.update.mock.calls[0][0].data.kubeconfigCipher;
    expect(cipher).not.toContain('apiVersion');

    prisma.managedK8sCluster.findFirst.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      endpoint: 'https://c1',
      kubeconfigCipher: cipher,
      nodePools: [],
    });
    const result = await svc.kubeconfig('u1', 'c1');
    expect(result.kubeconfig).toBe('apiVersion: v1');
  });

  it('honours autoscaling bounds when scaling a pool', async () => {
    const prisma = prismaMock();
    prisma.managedK8sCluster.findFirst.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      nodePools: [{ id: 'p1', name: 'default', autoscale: true, minNodes: 2, maxNodes: 4 }],
    });
    const svc = new ManagedK8sService(prisma);
    await expect(svc.scaleNodePool('u1', 'c1', 'p1', 9)).rejects.toThrow(/2-4 nodes/);
    await expect(svc.scaleNodePool('u1', 'c1', 'p1', 3)).resolves.toMatchObject({ nodeCount: 3 });
  });

  it('keeps at least one node pool', async () => {
    const prisma = prismaMock();
    prisma.managedK8sCluster.findFirst.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      nodePools: [{ id: 'p1', name: 'default' }],
    });
    const svc = new ManagedK8sService(prisma);
    await expect(svc.deleteNodePool('u1', 'c1', 'p1')).rejects.toThrow(/at least one node pool/);
  });
});

describe('Tier 9 — BYO VM import', () => {
  it('rejects unsupported disk formats', async () => {
    const svc = new VmImportService(prismaMock());
    await expect(
      svc.create('u1', { name: 'legacy-app', sourceUrl: 'https://example.com/a.img', sourceFormat: 'exe' }),
    ).rejects.toThrow(/Unsupported format/);
  });

  it('blocks SSRF targets on the internal network', async () => {
    const svc = new VmImportService(prismaMock());
    await expect(
      svc.create('u1', { name: 'legacy-app', sourceUrl: 'http://169.254.169.254/latest/meta-data' }),
    ).rejects.toThrow();
  });

  it('rejects oversized images', async () => {
    const svc = new VmImportService(prismaMock());
    await expect(
      svc.create('u1', {
        name: 'legacy-app',
        sourceUrl: 'https://example.com/a.qcow2',
        sizeBytes: 900 * 1024 ** 3,
      }),
    ).rejects.toThrow(/512 GiB/);
  });

  it('clamps progress updates into 0-100', async () => {
    const prisma = prismaMock();
    const svc = new VmImportService(prisma);
    await svc.updateProgress('j1', { status: 'CONVERTING', progress: 320 });
    expect(prisma.vmImportJob.update.mock.calls[0][0].data.progress).toBe(100);
  });

  it('refuses to cancel a completed import', async () => {
    const prisma = prismaMock();
    prisma.vmImportJob.findUnique.mockResolvedValue({ id: 'j1', userId: 'u1', status: 'COMPLETED' });
    const svc = new VmImportService(prisma);
    await expect(svc.cancel('u1', 'j1')).rejects.toThrow(/cannot be cancelled/);
  });

  it('blocks access to another user job', async () => {
    const prisma = prismaMock();
    prisma.vmImportJob.findUnique.mockResolvedValue({ id: 'j1', userId: 'owner' });
    const svc = new VmImportService(prisma);
    await expect(svc.get('intruder', 'j1')).rejects.toThrow(/Not your import job/);
  });
});

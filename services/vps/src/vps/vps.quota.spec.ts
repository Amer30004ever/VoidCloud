import { BadRequestException, Role } from '@prisma/client';
import { VpsService } from './vps.service';
import { CloudDeploymentStatus } from '@prisma/client';

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromDefault: jest.fn(),
    makeApiClient: jest.fn().mockReturnValue({
      createNamespacedDeployment: jest.fn(),
      patchNamespacedDeployment: jest.fn(),
      deleteNamespacedDeployment: jest.fn(),
      readNamespacedDeployment: jest.fn(),
      createNamespacedService: jest.fn(),
      patchNamespacedService: jest.fn(),
      deleteNamespacedService: jest.fn(),
    }),
  })),
  CoreV1Api: jest.fn(),
  AppsV1Api: jest.fn(),
}));

describe('VpsService — tenant resource quotas (Prompt 2.2)', () => {
  const mkPrisma = (overrides = {}) => ({
    cloudDeployment: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1', cpu: 1, memory: 1024, storage: 10240, status: CloudDeploymentStatus.RUNNING }),
      update: jest.fn().mockResolvedValue({ id: 'vps-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'vps-1' }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
    },
    cloudBackup: { findMany: jest.fn().mockResolvedValue([]) },
    userTenant: { findFirst: jest.fn() },
    tenantQuota: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
      upsert: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
      update: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
    },
    ...overrides,
  });
  const mkProxmox = () => ({
    createContainer: jest.fn().mockResolvedValue({ vmid: 100, node: 'pve-01', ipv4Address: '10.51.100.42' }),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    destroyContainer: jest.fn(),
    getStatus: jest.fn().mockResolvedValue({ status: 'running' }),
  });
  const clusters = { schedule: jest.fn().mockResolvedValue({ chosen: null, allocationId: null }), releaseAllocation: jest.fn(), commitAllocation: jest.fn() };

  const mkService = (prisma = mkPrisma()) => {
    const creditService = { canProvisionVps: jest.fn().mockResolvedValue({ allowed: true }), canStartPaygVps: jest.fn().mockResolvedValue(true) };
    const k8sApp = { deploy: jest.fn(), remove: jest.fn(), getStatus: jest.fn().mockResolvedValue('not_installed') };
    const backupScheduler = { getBackups: jest.fn(), getSchedule: jest.fn(), createSchedule: jest.fn(), restoreBackup: jest.fn() };
    const svc = new VpsService(prisma as any, mkProxmox() as any, clusters as any, creditService as any, backupScheduler as any, k8sApp as any);
    return { svc, prisma };
  };

  it('auto-creates a default TenantQuota when none exists', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
    });
    const { svc } = mkService(prisma);
    await svc.create({ name: 'test', cpu: 1, memory: 1024, storage: 10240 }, { id: 'user-1', role: Role.USER });
    expect(prisma.tenantQuota.create).toHaveBeenCalledWith({ data: { tenantId: 'tenant-1' } });
  });

  it('rejects provisioning when VPS count quota is exceeded', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 1 }),
        create: jest.fn(),
        update: jest.fn(),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 1 }),
      },
    });
    const { svc } = mkService(prisma);
    await expect(svc.create({ name: 'test' }, { id: 'user-1', role: Role.USER })).rejects.toThrow(BadRequestException);
  });

  it('rejects provisioning when CPU quota is exceeded', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1', maxCpu: 1, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn(),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 1, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    await expect(svc.create({ name: 'test', cpu: 1 }, { id: 'user-1', role: Role.USER })).rejects.toThrow(BadRequestException);
  });

  it('allows provisioning when within quota', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'vps-new', userId: 'user-1', tenantId: 'tenant-1', cpu: 1, memory: 1024, storage: 10240, status: CloudDeploymentStatus.RUNNING }),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    const result = await svc.create({ name: 'test', cpu: 1, memory: 1024, storage: 10240 }, { id: 'user-1', role: Role.USER });
    expect(result.id).toBe('vps-new');
  });

  it('recomputes quota usage after provisioning', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'vps-new', userId: 'user-1', tenantId: 'tenant-1', cpu: 1, memory: 1024, storage: 10240, status: CloudDeploymentStatus.RUNNING }),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    await svc.create({ name: 'test', cpu: 1, memory: 1024, storage: 10240 }, { id: 'user-1', role: Role.USER });
    expect(prisma.tenantQuota.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: { currentCpu: 0, currentRamMb: 0, currentDiskGb: 0, currentVpsCount: 0 },
    });
  });

  it('recomputes quota usage after removal', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'q-1', tenantId: 'tenant-1' }),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-1', proxmoxVMID: 100, proxmoxNode: 'pve-01' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'vps-1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    await svc.remove('vps-1', { id: 'user-1', role: Role.USER });
    expect(prisma.tenantQuota.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: { currentCpu: 0, currentRamMb: 0, currentDiskGb: 0, currentVpsCount: 0 },
    });
  });

  it('resolves tenantId from UserTenant when available, falls back to userId', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant-abc' }) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-2', tenantId: 'tenant-abc', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'q-2', tenantId: 'tenant-abc' }),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'tenant-abc' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'vps-new', userId: 'user-1', tenantId: 'tenant-abc', cpu: 1, memory: 1024, storage: 10240, status: CloudDeploymentStatus.RUNNING }),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    await svc.create({ name: 'test' }, { id: 'user-1', role: Role.USER });
    expect(prisma.tenantQuota.findUnique).toHaveBeenCalledWith({ where: { tenantId: 'tenant-abc' } });
  });

  it('uses userId as tenantId when user has no UserTenant', async () => {
    const prisma = mkPrisma({
      userTenant: { findFirst: jest.fn().mockResolvedValue(null) },
      tenantQuota: {
        findUnique: jest.fn().mockResolvedValue({ id: 'q-3', tenantId: 'user-1', maxCpu: 4, maxRamMb: 8192, maxDiskGb: 80, maxVpsCount: 5 }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'q-3', tenantId: 'user-1' }),
      },
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vps-1', userId: 'user-1', tenantId: 'user-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'vps-new', userId: 'user-1', tenantId: 'user-1', cpu: 1, memory: 1024, storage: 10240, status: CloudDeploymentStatus.RUNNING }),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { cpu: 0, memory: 0, storage: 0 }, _count: 0 }),
      },
    });
    const { svc } = mkService(prisma);
    await svc.create({ name: 'test' }, { id: 'user-1', role: Role.USER });
    expect(prisma.tenantQuota.findUnique).toHaveBeenCalledWith({ where: { tenantId: 'user-1' } });
  });
});

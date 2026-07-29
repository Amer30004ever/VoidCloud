import { BadRequestException, NotFoundException, Role } from '@prisma/client';
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

describe('VpsService — marketplace apps (Prompt 5.13 follow-up)', () => {
  const mkPrisma = (overrides = {}) => ({
    cloudDeployment: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'vps-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        apps: [],
        installedApps: [],
        status: CloudDeploymentStatus.RUNNING,
      }),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'vps-1', ...data })),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    ...overrides,
  });

  const mkK8s = () => ({
    deploy: jest.fn().mockResolvedValue({ deploymentName: 'vps-1-code-server', serviceName: 'vps-1-code-server', namespace: 'voidcloud' }),
    remove: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockResolvedValue('running'),
  });

  const mkService = (prisma = mkPrisma(), k8sApp = mkK8s()) => {
    const creditService = { canProvisionVps: jest.fn().mockResolvedValue({ allowed: true }), canStartPaygVps: jest.fn().mockResolvedValue(true) };
    const proxmox = { startContainer: jest.fn(), stopContainer: jest.fn(), destroyContainer: jest.fn(), getStatus: jest.fn() };
    const clusters = { schedule: jest.fn(), releaseAllocation: jest.fn(), commitAllocation: jest.fn() };
    const backupScheduler = { getBackups: jest.fn(), getSchedule: jest.fn(), createSchedule: jest.fn(), restoreBackup: jest.fn() };
    return { svc: new VpsService(prisma as any, proxmox as any, clusters as any, creditService as any, backupScheduler as any, k8sApp as any), prisma, k8sApp };
  };

  it('appCatalog returns all marketplace tools', () => {
    const { svc } = mkService();
    const catalog = svc.appCatalog();
    expect(catalog.map((a: any) => a.id)).toEqual([
      'wordpress', 'docker', 'lemp', 'lamp', 'code-server', 'gitea', 'portainer', 'umami',
    ]);
  });

  it('installApp deploys to K8s, updates DB, and writes audit log', async () => {
    const prisma = mkPrisma();
    const k8sApp = mkK8s();
    const { svc } = mkService(prisma, k8sApp);

    const result = await svc.installApp('vps-1', { id: 'user-1', role: Role.USER }, 'code-server');

    expect(k8sApp.deploy).toHaveBeenCalledWith('vps-1', 'tenant-1', 'code-server');
    expect(prisma.cloudDeployment.update).toHaveBeenCalledWith({
      where: { id: 'vps-1' },
      data: expect.objectContaining({
        apps: expect.arrayContaining(['code-server']),
        installedApps: expect.arrayContaining([
          expect.objectContaining({ id: 'code-server', status: 'installing', k8sDeployment: 'vps-1-code-server' }),
        ]),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'app.install', userId: 'user-1' }) }),
    );
    expect(result.id).toBe('code-server');
    expect(result.status).toBe('installing');
  });

  it('installApp rejects duplicate install', async () => {
    const prisma = mkPrisma({
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vps-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          apps: ['code-server'],
          installedApps: [{ id: 'code-server', name: 'code-server', status: 'running', installedAt: new Date().toISOString() }],
          status: CloudDeploymentStatus.RUNNING,
        }),
        update: jest.fn(),
      },
    });
    const { svc } = mkService(prisma);
    await expect(svc.installApp('vps-1', { id: 'user-1', role: Role.USER }, 'code-server')).rejects.toThrow(BadRequestException);
  });

  it('installApp rejects unknown app', async () => {
    const { svc } = mkService();
    await expect(svc.installApp('vps-1', { id: 'user-1', role: Role.USER }, 'unknown-app')).rejects.toThrow(BadRequestException);
  });

  it('installApp writes failed audit log when K8s deploy errors', async () => {
    const prisma = mkPrisma();
    const k8sApp = mkK8s();
    k8sApp.deploy.mockRejectedValue(new Error('K8s unavailable'));
    const { svc } = mkService(prisma, k8sApp);

    await expect(svc.installApp('vps-1', { id: 'user-1', role: Role.USER }, 'code-server')).rejects.toThrow(BadRequestException);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'app.install', status: 'failed' }) }),
    );
  });

  it('uninstallApp removes from K8s, updates DB, and writes audit log', async () => {
    const prisma = mkPrisma({
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vps-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          apps: ['code-server'],
          installedApps: [{ id: 'code-server', name: 'code-server', status: 'running', installedAt: new Date().toISOString(), k8sDeployment: 'vps-1-code-server', k8sService: 'vps-1-code-server', namespace: 'voidcloud' }],
          status: CloudDeploymentStatus.RUNNING,
        }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'vps-1', ...data })),
      },
    });
    const k8sApp = mkK8s();
    const { svc } = mkService(prisma, k8sApp);

    const result = await svc.uninstallApp('vps-1', { id: 'user-1', role: Role.USER }, 'code-server');

    expect(k8sApp.remove).toHaveBeenCalledWith('vps-1', 'code-server');
    expect(prisma.cloudDeployment.update).toHaveBeenCalledWith({
      where: { id: 'vps-1' },
      data: expect.objectContaining({
        apps: [],
        installedApps: [],
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'app.uninstall', userId: 'user-1' }) }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('uninstallApp continues even if K8s remove fails', async () => {
    const prisma = mkPrisma({
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vps-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          apps: ['code-server'],
          installedApps: [{ id: 'code-server', name: 'code-server', status: 'running', installedAt: new Date().toISOString() }],
          status: CloudDeploymentStatus.RUNNING,
        }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'vps-1', ...data })),
      },
    });
    const k8sApp = mkK8s();
    k8sApp.remove.mockRejectedValue(new Error('K8s unavailable'));
    const { svc } = mkService(prisma, k8sApp);

    const result = await svc.uninstallApp('vps-1', { id: 'user-1', role: Role.USER }, 'code-server');
    expect(result).toEqual({ ok: true });
  });

  it('getAppStatus returns live K8s status', async () => {
    const prisma = mkPrisma({
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vps-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          apps: ['code-server'],
          installedApps: [{ id: 'code-server', name: 'code-server', installedAt: new Date().toISOString(), k8sDeployment: 'vps-1-code-server' }],
          status: CloudDeploymentStatus.RUNNING,
        }),
      },
    });
    const k8sApp = mkK8s();
    k8sApp.getStatus.mockResolvedValue('running');
    const { svc } = mkService(prisma, k8sApp);

    const result = await svc.getAppStatus('vps-1', { id: 'user-1', role: Role.USER }, 'code-server');

    expect(k8sApp.getStatus).toHaveBeenCalledWith('vps-1', 'code-server');
    expect(result.status).toBe('running');
  });

  it('getAppStatus throws when app is not installed', async () => {
    const prisma = mkPrisma({
      cloudDeployment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vps-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          apps: [],
          installedApps: [],
          status: CloudDeploymentStatus.RUNNING,
        }),
      },
    });
    const { svc } = mkService(prisma);
    await expect(svc.getAppStatus('vps-1', { id: 'user-1', role: Role.USER }, 'code-server')).rejects.toThrow(NotFoundException);
  });
});

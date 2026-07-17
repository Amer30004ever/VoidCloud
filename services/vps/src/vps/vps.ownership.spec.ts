import { NotFoundException } from '@nestjs/common';
import { Role, CloudDeploymentStatus } from '@prisma/client';
import { VpsService } from './vps.service';

/**
 * Ownership isolation — negative tests.
 *
 * Role-based @Roles() decorators allow USER/ADMIN to invoke every read/lifecycle
 * route, but that alone is NOT sufficient: a USER must NEVER be able to touch
 * another USER's VPS by ID. Enforcement lives in VpsService.findOwned():
 *
 *   if (user.role !== SUPER_ADMIN && vps.userId !== user.id)
 *     throw new NotFoundException('VPS not found');
 *
 * (NotFound, not Forbidden, to avoid leaking existence of another tenant's row.)
 *
 * This spec locks that behaviour in for every USER-facing route:
 *   get, update, start, stop, restart, remove, status
 *
 * plus a positive control (SUPER_ADMIN passes cross-tenant, per platform policy).
 */
describe('VpsService — cross-user ownership isolation', () => {
  const OTHER_USERS_VPS = {
    id: 'vps-owned-by-B',
    userId: 'user-B',
    proxmoxVMID: 100,
    proxmoxNode: 'pve-01',
    status: CloudDeploymentStatus.RUNNING,
    cpu: 1,
    memory: 1024,
    storage: 10240,
  };

  const userA = { id: 'user-A', role: Role.USER };
  const superAdmin = { id: 'user-root', role: Role.SUPER_ADMIN };

  const mkPrisma = () => ({
    cloudDeployment: {
      findUnique: jest.fn().mockResolvedValue(OTHER_USERS_VPS),
      update: jest.fn().mockResolvedValue({ ...OTHER_USERS_VPS }),
      delete: jest.fn().mockResolvedValue({ ...OTHER_USERS_VPS }),
    },
    cloudBackup: { findMany: jest.fn().mockResolvedValue([]) },
  });
  const mkProxmox = () => ({
    startContainer: jest.fn().mockResolvedValue(undefined),
    stopContainer: jest.fn().mockResolvedValue(undefined),
    destroyContainer: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockResolvedValue({ status: 'running' }),
  });
  const clusters = { schedule: jest.fn(), releaseAllocation: jest.fn(), commitAllocation: jest.fn() };

  const mkService = () => {
    const prisma = mkPrisma();
    const proxmox = mkProxmox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new VpsService(prisma as any, proxmox as any, clusters as any);
    return { svc, prisma, proxmox };
  };

  const ROUTES: Array<{
    name: string;
    call: (svc: VpsService, user: { id: string; role: Role }) => Promise<unknown>;
  }> = [
    { name: 'get',     call: (s, u) => s.get(OTHER_USERS_VPS.id, u) },
    { name: 'update',  call: (s, u) => s.update(OTHER_USERS_VPS.id, { name: 'hacked' } as never, u) },
    { name: 'start',   call: (s, u) => s.start(OTHER_USERS_VPS.id, u) },
    { name: 'stop',    call: (s, u) => s.stop(OTHER_USERS_VPS.id, u) },
    { name: 'restart', call: (s, u) => s.restart(OTHER_USERS_VPS.id, u) },
    { name: 'remove',  call: (s, u) => s.remove(OTHER_USERS_VPS.id, u) },
    { name: 'status',  call: (s, u) => s.status(OTHER_USERS_VPS.id, u) },
  ];

  for (const { name, call } of ROUTES) {
    it(`${name}: User A cannot reach User B's VPS — NotFound, no side effects`, async () => {
      const { svc, prisma, proxmox } = mkService();
      await expect(call(svc, userA)).rejects.toBeInstanceOf(NotFoundException);
      // Critical: no mutation, no proxmox call ever fired.
      expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
      expect(prisma.cloudDeployment.delete).not.toHaveBeenCalled();
      expect(proxmox.startContainer).not.toHaveBeenCalled();
      expect(proxmox.stopContainer).not.toHaveBeenCalled();
      expect(proxmox.destroyContainer).not.toHaveBeenCalled();
    });
  }

  it('SUPER_ADMIN can reach any tenant (control — proves the branch, not the leak)', async () => {
    const { svc } = mkService();
    await expect(svc.get(OTHER_USERS_VPS.id, superAdmin)).resolves.toMatchObject({ id: OTHER_USERS_VPS.id });
  });

  it('list() for USER filters by userId (Prisma where clause), never returns cross-tenant rows', async () => {
    const { svc, prisma } = mkService();
    prisma.cloudDeployment.findMany = jest.fn().mockResolvedValue([]);
    await svc.list(userA);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: userA.id } }),
    );
  });

  it('list() for SUPER_ADMIN passes an unscoped where {}', async () => {
    const { svc, prisma } = mkService();
    prisma.cloudDeployment.findMany = jest.fn().mockResolvedValue([]);
    await svc.list(superAdmin);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

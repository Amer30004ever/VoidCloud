/**
 * Tenant isolation, proven against the REAL VpsService (not a mocked service).
 *
 * The existing controller IDOR spec mocks vpsService entirely, so it only proves
 * delegation. This exercises findOwned's actual filtering and asserts that no
 * Proxmox side-effect or DB mutation happens on a cross-tenant attempt.
 */
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { VpsService } from '../../services/vps/src/vps/vps.service';

const OWNER = { id: 'user-A', role: Role.USER };
const INTRUDER = { id: 'user-B', role: Role.USER };
const SUPER = { id: 'root', role: Role.SUPER_ADMIN };

const VPS_A = {
  id: 'vps-A',
  userId: OWNER.id,
  tenantId: 'tenant-A',
  name: 'a',
  status: 'RUNNING',
  billingMode: 'SUBSCRIPTION',
  proxmoxVMID: 101,
  proxmoxNode: 'pve-01',
};

function build() {
  const prisma: any = {
    cloudDeployment: {
      findUnique: jest.fn().mockResolvedValue(VPS_A),
      findMany: jest.fn().mockResolvedValue([VPS_A]),
      update: jest.fn().mockResolvedValue(VPS_A),
      delete: jest.fn().mockResolvedValue(VPS_A),
      aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0 }),
      count: jest.fn().mockResolvedValue(1),
    },
    vpsQuota: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  const proxmox: any = {
    startContainer: jest.fn().mockResolvedValue({}),
    stopContainer: jest.fn().mockResolvedValue({}),
    destroyContainer: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue('running'),
  };
  const clusters: any = { schedule: jest.fn() };
  const credit: any = {
    canProvisionVps: jest.fn().mockResolvedValue({ allowed: true }),
    canStartPaygVps: jest.fn().mockResolvedValue(true),
  };
  const backups: any = { getBackups: jest.fn().mockResolvedValue([]), getSchedule: jest.fn() };
  const k8sApp: any = { deploy: jest.fn(), remove: jest.fn(), getStatus: jest.fn() };

  const service = new VpsService(prisma, proxmox, clusters, credit, backups, k8sApp);
  return { service, prisma, proxmox };
}

describe('VpsService — real tenant isolation (findOwned)', () => {
  it('list() scopes the Prisma query to the caller for a normal user', async () => {
    const { service, prisma } = build();
    await service.list(OWNER);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: OWNER.id } }),
    );
  });

  it('list() is unscoped only for SUPER_ADMIN', async () => {
    const { service, prisma } = build();
    await service.list(SUPER);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('get() hides another tenant\'s VPS behind a 404 (no leak of existence)', async () => {
    const { service } = build();
    await expect(service.get(VPS_A.id, INTRUDER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get(VPS_A.id, INTRUDER)).rejects.toThrow('VPS not found');
  });

  it('get() returns the record to its owner and to SUPER_ADMIN', async () => {
    const { service } = build();
    await expect(service.get(VPS_A.id, OWNER)).resolves.toMatchObject({ id: VPS_A.id });
    await expect(service.get(VPS_A.id, SUPER)).resolves.toMatchObject({ id: VPS_A.id });
  });

  it.each([
    ['start', (s: VpsService) => s.start(VPS_A.id, INTRUDER)],
    ['stop', (s: VpsService) => s.stop(VPS_A.id, INTRUDER)],
    ['restart', (s: VpsService) => s.restart(VPS_A.id, INTRUDER)],
    ['status', (s: VpsService) => s.status(VPS_A.id, INTRUDER)],
    ['snapshot', (s: VpsService) => s.snapshot(VPS_A.id, INTRUDER)],
    ['update', (s: VpsService) => s.update(VPS_A.id, { name: 'pwned' } as never, INTRUDER)],
    ['remove', (s: VpsService) => s.remove(VPS_A.id, INTRUDER)],
    ['backups', (s: VpsService) => s.backups(VPS_A.id, INTRUDER)],
  ])('%s() rejects a cross-tenant id with no side effects', async (_name, call) => {
    const { service, prisma, proxmox } = build();
    await expect(call(service)).rejects.toThrow('VPS not found');

    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
    expect(prisma.cloudDeployment.delete).not.toHaveBeenCalled();
    expect(proxmox.startContainer).not.toHaveBeenCalled();
    expect(proxmox.stopContainer).not.toHaveBeenCalled();
    expect(proxmox.destroyContainer).not.toHaveBeenCalled();
  });

  it('a missing VPS and a foreign VPS are indistinguishable to the caller', async () => {
    const { service, prisma } = build();
    prisma.cloudDeployment.findUnique.mockResolvedValueOnce(null);
    const missing = await service.get('nope', INTRUDER).catch((e) => e);
    const foreign = await service.get(VPS_A.id, INTRUDER).catch((e) => e);
    expect(missing.message).toBe(foreign.message);
    expect(missing.getStatus()).toBe(foreign.getStatus());
  });

  it('the owner can stop their own VPS and the Proxmox call is made', async () => {
    const { service, proxmox, prisma } = build();
    await service.stop(VPS_A.id, OWNER);
    expect(proxmox.stopContainer).toHaveBeenCalledWith(VPS_A.proxmoxVMID, VPS_A.proxmoxNode);
    expect(prisma.cloudDeployment.update).toHaveBeenCalled();
  });
});

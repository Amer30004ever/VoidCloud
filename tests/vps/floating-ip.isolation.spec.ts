/**
 * Tier 9 — Floating IPs: adversarial cross-tenant isolation.
 *
 * Tenant B attempts to attach, detach, release and read Tenant A's reserved
 * address (and to pin its own address onto Tenant A's VPS). Every attempt must
 * be refused AND must not mutate anything.
 */
import { FloatingIpService } from '../../services/vps/src/network/floating-ip.service';

const A = 'user-A';
const B = 'user-B';

const IP_A = { id: 'ip-A', address: '192.0.2.10', ipVersion: 4, userId: A, vpsId: null, status: 'RESERVED', poolName: 'default' };
const IP_B = { id: 'ip-B', address: '192.0.2.11', ipVersion: 4, userId: B, vpsId: null, status: 'RESERVED', poolName: 'default' };
const VPS_A = { id: 'vps-A', userId: A };
const VPS_B = { id: 'vps-B', userId: B };

function build() {
  const ips = [IP_A, IP_B];
  const vps = [VPS_A, VPS_B];
  const prisma: any = {
    floatingIp: {
      findUnique: jest.fn(async ({ where }: any) => ips.find((i) => i.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) => ips.filter((i) => i.userId === where.userId)),
      update: jest.fn(async ({ data }: any) => ({ ...IP_A, ...data })),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    cloudDeployment: {
      findUnique: jest.fn(async ({ where }: any) => vps.find((v) => v.id === where.id) ?? null),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  return { service: new FloatingIpService(prisma), prisma };
}

function assertNoMutation(prisma: any) {
  expect(prisma.floatingIp.update).not.toHaveBeenCalled();
  expect(prisma.floatingIp.updateMany).not.toHaveBeenCalled();
  expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
  expect(prisma.cloudDeployment.updateMany).not.toHaveBeenCalled();
}

describe('FloatingIpService — cross-tenant isolation', () => {
  it('Tenant B cannot list Tenant A addresses', async () => {
    const { service } = build();
    const rows = await service.listForUser(B);
    expect(rows.map((r: any) => r.id)).toEqual(['ip-B']);
  });

  it('Tenant B cannot attach Tenant A reserved IP to its own VPS', async () => {
    const { service, prisma } = build();
    await expect(service.assign(B, 'ip-A', 'vps-B')).rejects.toThrow(/not reserved by caller/i);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot attach its own IP to Tenant A VPS', async () => {
    const { service, prisma } = build();
    await expect(service.assign(B, 'ip-B', 'vps-A')).rejects.toThrow(/does not belong to caller/i);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot detach Tenant A address', async () => {
    const { service, prisma } = build();
    await expect(service.unassign(B, 'ip-A')).rejects.toThrow(/not reserved by caller/i);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot release Tenant A address back into the pool', async () => {
    const { service, prisma } = build();
    await expect(service.release(B, 'ip-A')).rejects.toThrow(/not reserved by caller/i);
    assertNoMutation(prisma);
  });

  it('the owner is still allowed to attach its own address to its own VPS', async () => {
    const { service, prisma } = build();
    await service.assign(A, 'ip-A', 'vps-A');
    expect(prisma.floatingIp.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ip-A' } }),
    );
  });
});

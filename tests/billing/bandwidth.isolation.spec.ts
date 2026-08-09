/**
 * Tier 9 — Bandwidth metering: adversarial cross-tenant isolation.
 *
 * The Prisma double applies the `where` clause for real, so a missing tenant
 * filter leaks Tenant A's samples/overages into Tenant B's response instead of
 * silently passing.
 */
import { BandwidthService } from '../../services/billing/src/billing/bandwidth.service';

const A = 'user-A';
const B = 'user-B';
const GB = 1024 ** 3;

const DEPLOYMENTS = [
  { id: 'vps-A', userId: A, name: 'a', memory: 2048, terminatedAt: null },
  { id: 'vps-B', userId: B, name: 'b', memory: 2048, terminatedAt: null },
];

const SAMPLES = [
  { vpsId: 'vps-A', userId: A, rxBytes: 0, txBytes: 0, sampledAt: new Date(Date.UTC(2026, 6, 1)) },
  { vpsId: 'vps-A', userId: A, rxBytes: 900 * GB, txBytes: 900 * GB, sampledAt: new Date(Date.UTC(2026, 6, 2)) },
  { vpsId: 'vps-B', userId: B, rxBytes: 0, txBytes: 0, sampledAt: new Date(Date.UTC(2026, 6, 1)) },
  { vpsId: 'vps-B', userId: B, rxBytes: 1 * GB, txBytes: 1 * GB, sampledAt: new Date(Date.UTC(2026, 6, 2)) },
];

const OVERAGES = [
  { id: 'ov-A', userId: A, vpsId: 'vps-A', amount: 40, periodStart: new Date('2026-06-01') },
  { id: 'ov-B', userId: B, vpsId: 'vps-B', amount: 1, periodStart: new Date('2026-06-01') },
];

function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    const cell = row[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const cond = v as any;
      if ('gte' in cond && !(cell >= cond.gte)) return false;
      if ('lt' in cond && !(cell < cond.lt)) return false;
      if ('not' in cond && cell === cond.not) return false;
      return true;
    }
    return cell === v;
  });
}

function build() {
  const prisma: any = {
    cloudDeployment: {
      findMany: jest.fn(async ({ where }: any) => DEPLOYMENTS.filter((d) => matches(d, where))),
      findUnique: jest.fn(async ({ where }: any) => DEPLOYMENTS.find((d) => d.id === where.id) ?? null),
    },
    bandwidthSample: {
      findMany: jest.fn(async ({ where }: any) => SAMPLES.filter((s) => matches(s, where))),
      create: jest.fn(async ({ data }: any) => data),
    },
    bandwidthOverage: {
      findMany: jest.fn(async ({ where }: any) => OVERAGES.filter((o) => matches(o, where))),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }: any) => data),
    },
  };
  const credits: any = { charge: jest.fn(), consume: jest.fn(), deduct: jest.fn() };
  return { service: new BandwidthService(prisma, credits), prisma };
}

describe('BandwidthService — cross-tenant isolation', () => {
  it('Tenant B current usage never includes Tenant A instances', async () => {
    const { service, prisma } = build();

    const rows = await service.currentUsageForUser(B);

    expect(rows.map((r: any) => r.vpsId)).toEqual(['vps-B']);
    expect(rows.some((r: any) => r.vpsId === 'vps-A')).toBe(false);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: B }) }),
    );
  });

  it('Tenant B cannot read Tenant A overage charges', async () => {
    const { service } = build();
    const rows = await service.listOveragesForUser(B);
    expect(rows.map((r: any) => r.id)).toEqual(['ov-B']);
  });

  it('an empty identity does not become a cross-tenant wildcard', async () => {
    const { service } = build();
    expect(await service.listOveragesForUser(undefined as unknown as string)).toHaveLength(0);
    expect(await service.currentUsageForUser(undefined as unknown as string)).toHaveLength(0);
  });

  it('usageFor is scoped to the requested VPS only', async () => {
    const { service } = build();
    const usage = await service.usageFor(
      'vps-B',
      new Date(Date.UTC(2026, 6, 1)),
      new Date(Date.UTC(2026, 7, 1)),
    );
    // vps-A moved 1800 GB in the same window; leaking it would blow this up.
    expect(usage.totalGb).toBe(2);
  });

  it('an ingested sample is attributed to the VPS owner, not the submitting admin', async () => {
    const { service, prisma } = build();
    await service.recordSample('vps-A', { rxBytes: 1, txBytes: 1 });
    expect(prisma.bandwidthSample.create.mock.calls[0][0].data.userId).toBe(A);
  });

  it('ingesting for an unknown VPS is rejected rather than silently created', async () => {
    const { service } = build();
    await expect(service.recordSample('vps-nope', { rxBytes: 1, txBytes: 1 })).rejects.toThrow(
      /not found/i,
    );
  });
});

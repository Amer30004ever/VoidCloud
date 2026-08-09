/**
 * Tier 9 — SLA credits: adversarial cross-tenant isolation.
 *
 * Same pattern as vps.service.isolation.spec.ts: the REAL service runs against
 * an in-memory Prisma double that actually applies the `where` clause, so a
 * missing tenant filter shows up as leaked rows rather than passing silently.
 * Tenant B attempts to read / be credited for Tenant A's resources.
 */
import { SlaCreditService } from '../../services/billing/src/billing/sla-credit.service';

const A = 'user-A';
const B = 'user-B';

const CREDIT_ROWS = [
  { id: 'sla-1', userId: A, vpsId: 'vps-A', amount: 12, periodStart: new Date('2026-07-01') },
  { id: 'sla-2', userId: B, vpsId: 'vps-B', amount: 3, periodStart: new Date('2026-07-01') },
];

function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    const cell = row[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const cond = v as any;
      if ('not' in cond && cell === cond.not) return false;
      if ('gte' in cond && !(cell >= cond.gte)) return false;
      if ('lt' in cond && !(cell < cond.lt)) return false;
      return true;
    }
    return cell === v;
  });
}

function build() {
  const prisma: any = {
    slaCredit: {
      findMany: jest.fn(async ({ where }: any) => CREDIT_ROWS.filter((r) => matches(r, where))),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
    },
    cloudDeployment: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'vps-A', userId: A, name: 'a' },
      ]),
    },
    vpsHealthLog: {
      findMany: jest.fn().mockResolvedValue(
        // 10% of samples unreachable -> definitely creditable
        Array.from({ length: 100 }, (_, i) => ({
          status: i < 10 ? 'UNREACHABLE' : 'REACHABLE',
          checkedAt: new Date(Date.UTC(2026, 6, 1, 0, i)),
        })),
      ),
    },
    creditTransaction: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: -100 } }),
    },
  };
  const credits: any = {
    refund: jest.fn().mockResolvedValue({ transactionId: 'tx-1' }),
  };
  return { service: new SlaCreditService(prisma, credits), prisma, credits };
}

describe('SlaCreditService — cross-tenant isolation', () => {
  it('Tenant B cannot read Tenant A SLA credits', async () => {
    const { service, prisma } = build();

    const mine = await service.listForUser(B);
    expect(mine.map((r: any) => r.id)).toEqual(['sla-2']);
    expect(mine.some((r: any) => r.userId === A)).toBe(false);
    expect(prisma.slaCredit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: B } }),
    );
  });

  it('Tenant B cannot widen the query by passing an empty/undefined identity', async () => {
    const { service } = build();
    const rows = await service.listForUser(undefined as unknown as string);
    // No identity must never mean "every tenant".
    expect(rows).toHaveLength(0);
  });

  it('credits are always paid to the VPS owner, never to the sweep caller', async () => {
    const { service, credits, prisma } = build();

    await service.runForPeriod({
      periodStart: new Date('2026-07-01T00:00:00Z'),
      periodEnd: new Date('2026-08-01T00:00:00Z'),
    });

    expect(credits.refund).toHaveBeenCalledTimes(1);
    expect(credits.refund.mock.calls[0][0]).toBe(A);
    expect(credits.refund.mock.calls[0][0]).not.toBe(B);
    expect(prisma.slaCredit.create.mock.calls[0][0].data.userId).toBe(A);
  });

  it('the health probes read for a credit are scoped to that exact VPS', async () => {
    const { service, prisma } = build();
    await service.runForPeriod({
      periodStart: new Date('2026-07-01T00:00:00Z'),
      periodEnd: new Date('2026-08-01T00:00:00Z'),
    });
    expect(prisma.vpsHealthLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ vpsId: 'vps-A' }) }),
    );
  });
});

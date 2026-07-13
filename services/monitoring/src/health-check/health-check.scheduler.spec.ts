/**
 * Retention rollup verification for ServiceHealthLog / ServiceHealthHourlyRollup.
 *
 * Simulates one full day of health checks (13 services × every 30s × 1440min =
 * 37 440 raw rows), runs rollup(), and asserts:
 *
 *   1. Rows older than 48h are deleted (bounded growth).
 *   2. Rollup buckets contain the correct sample counts and aggregates.
 *   3. Uptime% and avgResponseMs are numerically correct for a spot-checked
 *      service — not just "no exception thrown".
 *
 * Uses an in-memory fake Prisma so the test runs without a live DB.
 */
import { HealthCheckScheduler } from './health-check.scheduler';

type LogRow = {
  serviceName: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  responseTimeMs: number | null;
  checkedAt: Date;
};
type RollupRow = {
  serviceName: string;
  hourStart: Date;
  sampleCount: number;
  upCount: number;
  degradedCount: number;
  downCount: number;
  avgResponseMs: number | null;
  uptimePercent: number;
};

function makeFakePrisma(logs: LogRow[]) {
  const rollups: RollupRow[] = [];
  return {
    serviceHealthLog: {
      findMany: jest.fn(async ({ where, orderBy }: any) => {
        const cutoff: Date = where.checkedAt.lt;
        let out = logs.filter((r) => r.checkedAt < cutoff);
        if (orderBy?.checkedAt === 'asc') out = out.sort((a, b) => +a.checkedAt - +b.checkedAt);
        return out;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        const cutoff: Date = where.checkedAt.lt;
        const before = logs.length;
        for (let i = logs.length - 1; i >= 0; i--) if (logs[i].checkedAt < cutoff) logs.splice(i, 1);
        return { count: before - logs.length };
      }),
    },
    serviceHealthHourlyRollup: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = where.serviceName_hourStart;
        const existing = rollups.find(
          (r) => r.serviceName === key.serviceName && +r.hourStart === +key.hourStart,
        );
        if (!existing) {
          rollups.push({ ...create });
        } else {
          existing.sampleCount += update.sampleCount.increment;
          existing.upCount += update.upCount.increment;
          existing.degradedCount += update.degradedCount.increment;
          existing.downCount += update.downCount.increment;
          if (typeof update.avgResponseMs === 'number') existing.avgResponseMs = update.avgResponseMs;
          existing.uptimePercent = update.uptimePercent;
        }
      }),
    },
    __rollups: rollups,
  } as any;
}

// A deterministic pattern: for service 'auth', every 10th check is DOWN,
// every 20th is DEGRADED, rest UP. RT is 100ms baseline + serviceIndex*10.
function seedDay(): LogRow[] {
  const services = [
    'auth', 'user', 'tenant', 'vps', 'billing', 'crm',
    'whatsapp', 'email', 'notification', 'monitoring',
    'audit', 'analytics', 'frontend',
  ];
  const start = new Date('2026-07-01T00:00:00Z').getTime();
  const intervalMs = 30_000;
  const totalTicks = (24 * 60 * 60_000) / intervalMs; // 2880
  const rows: LogRow[] = [];
  for (let tick = 0; tick < totalTicks; tick++) {
    const t = new Date(start + tick * intervalMs);
    services.forEach((s, i) => {
      let status: LogRow['status'] = 'UP';
      if (tick % 10 === 0) status = 'DOWN';
      else if (tick % 20 === 0) status = 'DEGRADED';
      rows.push({
        serviceName: s,
        status,
        responseTimeMs: status === 'DOWN' ? null : 100 + i * 10,
        checkedAt: t,
      });
    });
  }
  return rows;
}

describe('HealthCheckScheduler.rollup — retention & aggregate correctness', () => {
  it('bounds raw table size to ~48h and produces numerically correct hourly aggregates', async () => {
    // Pin "now" to 24h AFTER the last synthetic row, so ALL synthetic rows are
    // older than 48h and eligible for rollup. Total: 24h × 120 ticks/h × 13 = 37 440.
    const logs = seedDay();
    const rawBefore = logs.length;
    expect(rawBefore).toBe(24 * 120 * 13);

    // Freeze Date.now to a moment 72h after the seed start (so cutoff = 24h
    // after seed start → every seeded row is older than cutoff and gets rolled up).
    const fixedNow = new Date('2026-07-04T00:00:00Z').getTime();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const prisma = makeFakePrisma(logs);
    const scheduler = new HealthCheckScheduler({} as any, prisma);

    const result = await scheduler.rollup();

    // Every seeded row was older than 48h → all should be deleted.
    expect(result.rolledUp).toBe(rawBefore);
    expect(logs.length).toBe(0);

    // 13 services × 24 hourly buckets = 312.
    expect(result.buckets).toBe(13 * 24);
    expect(prisma.__rollups.length).toBe(13 * 24);

    // Spot-check math for one bucket of 'auth' (first hour, 120 ticks).
    const authFirstHour = prisma.__rollups.find(
      (r: RollupRow) =>
        r.serviceName === 'auth' && r.hourStart.toISOString() === '2026-07-01T00:00:00.000Z',
    );
    expect(authFirstHour).toBeDefined();
    expect(authFirstHour!.sampleCount).toBe(120);
    // tick%10===0 → DOWN: ticks 0,10,20,...,110 → 12 down
    // tick%20===0 & !%10 → impossible (20%10===0). So DEGRADED = 0.
    // Everything else UP = 108.
    expect(authFirstHour!.downCount).toBe(12);
    expect(authFirstHour!.degradedCount).toBe(0);
    expect(authFirstHour!.upCount).toBe(108);
    // uptime = (up + 0.5*deg) / count * 100 = 108/120*100 = 90
    expect(authFirstHour!.uptimePercent).toBeCloseTo(90, 5);
    // avgRT: 108 UP samples all at 100ms → 100
    expect(authFirstHour!.avgResponseMs).toBe(100);

    dateSpy.mockRestore();
  });

  it('leaves rows younger than 48h in place (bounded growth, not full purge)', async () => {
    const logs = seedDay();
    const now = new Date('2026-07-01T24:00:00Z').getTime(); // 24h after seed start
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const prisma = makeFakePrisma(logs);
    const scheduler = new HealthCheckScheduler({} as any, prisma);

    await scheduler.rollup();

    // cutoff = now - 48h = seed start - 24h → no rows older than cutoff.
    expect(logs.length).toBe(24 * 120 * 13);
    expect(prisma.__rollups.length).toBe(0);

    dateSpy.mockRestore();
  });
});

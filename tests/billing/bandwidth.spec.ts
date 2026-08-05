import {
  computeUsage,
  computeOverage,
  includedGbForPlan,
  previousMonthPeriod,
  currentMonthPeriod,
  BYTES_PER_GB,
  DEFAULT_RATE_PER_GB,
} from '../../services/billing/src/billing/bandwidth';

const GB = BYTES_PER_GB;

function sample(rx: number, tx: number, minutes: number) {
  return {
    rxBytes: rx,
    txBytes: tx,
    sampledAt: new Date(Date.UTC(2026, 6, 1, 0, minutes)),
  };
}

describe('Tier 9 — bandwidth metering (pure logic)', () => {
  it('returns zero usage with no samples', () => {
    const usage = computeUsage([]);
    expect(usage.samples).toBe(0);
    expect(usage.totalBytes).toBe(0);
    expect(usage.totalGb).toBe(0);
  });

  it('never bills the first reading (cumulative counters are not usage)', () => {
    const usage = computeUsage([sample(500 * GB, 500 * GB, 0)]);
    expect(usage.totalBytes).toBe(0);
  });

  it('sums positive counter deltas', () => {
    const usage = computeUsage([
      sample(0, 0, 0),
      sample(1 * GB, 2 * GB, 10),
      sample(3 * GB, 5 * GB, 20),
    ]);
    expect(usage.rxBytes).toBe(3 * GB);
    expect(usage.txBytes).toBe(5 * GB);
    expect(usage.totalGb).toBe(8);
    expect(usage.resets).toBe(0);
  });

  it('handles a counter reset (reboot) without going negative or losing traffic', () => {
    const usage = computeUsage([
      sample(0, 0, 0),
      sample(10 * GB, 10 * GB, 10),
      // reboot: counters restart, 2 GB seen since the reset
      sample(2 * GB, 1 * GB, 20),
      sample(4 * GB, 3 * GB, 30),
    ]);
    expect(usage.resets).toBe(1);
    // 10 (pre-reset) + 2 (at reset) + 2 (post-reset delta) = 14 GB rx
    expect(usage.rxBytes).toBe(14 * GB);
    // 10 + 1 + 2 = 13 GB tx
    expect(usage.txBytes).toBe(13 * GB);
    expect(usage.totalBytes).toBeGreaterThan(0);
  });

  it('orders unsorted samples before differencing', () => {
    const shuffled = [sample(3 * GB, 0, 20), sample(0, 0, 0), sample(1 * GB, 0, 10)];
    expect(computeUsage(shuffled).rxBytes).toBe(3 * GB);
  });

  it('charges nothing within the allowance', () => {
    const result = computeOverage(500, 1024, DEFAULT_RATE_PER_GB);
    expect(result.overageGb).toBe(0);
    expect(result.amount).toBe(0);
  });

  it('charges only the excess above the allowance', () => {
    const result = computeOverage(1524, 1024, 0.01);
    expect(result.overageGb).toBe(500);
    expect(result.amount).toBe(5);
  });

  it('never produces a negative charge', () => {
    expect(computeOverage(0, 1024).amount).toBe(0);
    expect(computeOverage(-5, 1024).overageGb).toBe(0);
  });

  it('scales the allowance with provisioned memory', () => {
    expect(includedGbForPlan(1024)).toBe(1024);
    expect(includedGbForPlan(4096)).toBe(4096);
    // sub-GB plans still get one full allowance unit
    expect(includedGbForPlan(512)).toBe(1024);
  });

  it('computes UTC period boundaries', () => {
    const now = new Date(Date.UTC(2026, 7, 5));
    const prev = previousMonthPeriod(now);
    expect(prev.periodStart.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(prev.periodEnd.toISOString()).toBe('2026-08-01T00:00:00.000Z');

    const cur = currentMonthPeriod(now);
    expect(cur.periodStart.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(cur.periodEnd.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });
});

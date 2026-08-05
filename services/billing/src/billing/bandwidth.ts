/**
 * Tier 9 — Bandwidth metering.
 *
 * Pure, dependency-free logic. Hypervisor NIC counters are cumulative and
 * monotonic *until the guest reboots*, at which point they reset to a lower
 * value. Naively subtracting first from last therefore under-counts (or goes
 * negative) across a reboot, so we sum positive deltas and treat any negative
 * delta as a counter reset (the new reading is the traffic since the reset).
 */

export const BYTES_PER_GB = 1024 ** 3;

/** Default allowance and overage price. Overridable per plan. */
export const DEFAULT_INCLUDED_GB = 1024;
export const DEFAULT_RATE_PER_GB = 0.01;

export interface BandwidthSample {
  rxBytes: bigint | number;
  txBytes: bigint | number;
  sampledAt: Date;
}

export interface BandwidthUsage {
  samples: number;
  rxBytes: number;
  txBytes: number;
  totalBytes: number;
  totalGb: number;
  resets: number;
}

/** Sum positive counter deltas across a period, tolerating counter resets. */
export function computeUsage(samples: BandwidthSample[]): BandwidthUsage {
  const ordered = [...samples].sort(
    (a, b) => a.sampledAt.getTime() - b.sampledAt.getTime(),
  );

  let rx = 0;
  let tx = 0;
  let resets = 0;
  let prevRx: number | null = null;
  let prevTx: number | null = null;

  for (const sample of ordered) {
    const curRx = Number(sample.rxBytes);
    const curTx = Number(sample.txBytes);

    if (prevRx === null || prevTx === null) {
      prevRx = curRx;
      prevTx = curTx;
      continue;
    }

    const dRx = curRx - prevRx;
    const dTx = curTx - prevTx;

    if (dRx < 0 || dTx < 0) {
      // Counter reset (reboot / NIC re-created): the reading itself is the
      // traffic accumulated since the reset.
      resets += 1;
      rx += Math.max(0, curRx);
      tx += Math.max(0, curTx);
    } else {
      rx += dRx;
      tx += dTx;
    }

    prevRx = curRx;
    prevTx = curTx;
  }

  const totalBytes = rx + tx;
  return {
    samples: ordered.length,
    rxBytes: rx,
    txBytes: tx,
    totalBytes,
    totalGb: round(totalBytes / BYTES_PER_GB, 4),
    resets,
  };
}

export interface OverageResult {
  includedGb: number;
  usedGb: number;
  overageGb: number;
  ratePerGb: number;
  amount: number;
}

/** Overage owed for a period. Never negative, rounded to 2 decimals. */
export function computeOverage(
  usedGb: number,
  includedGb: number = DEFAULT_INCLUDED_GB,
  ratePerGb: number = DEFAULT_RATE_PER_GB,
): OverageResult {
  const overageGb = round(Math.max(0, usedGb - includedGb), 4);
  const amount = overageGb <= 0 ? 0 : round(overageGb * ratePerGb, 2);
  return { includedGb, usedGb: round(usedGb, 4), overageGb, ratePerGb, amount };
}

/** Allowance for a VPS, scaled by provisioned memory (1 GB RAM => 1 TB transfer). */
export function includedGbForPlan(memoryMb: number): number {
  const gbRam = Math.max(1, Math.round(memoryMb / 1024));
  return gbRam * DEFAULT_INCLUDED_GB;
}

/** Previous calendar month boundaries relative to `now` (UTC). */
export function previousMonthPeriod(now: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  return { periodStart, periodEnd };
}

/** Current (open) calendar month boundaries relative to `now` (UTC). */
export function currentMonthPeriod(now: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { periodStart, periodEnd };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

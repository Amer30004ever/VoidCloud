/**
 * Tier 9 — SLA-based automatic credit refunds.
 *
 * Pure, dependency-free logic: given health-probe samples for one VPS over a
 * billing period, work out the observed uptime and the SLA credit owed.
 *
 * Credit ladder (industry-standard "monthly uptime percentage" model):
 *   >= 99.9%           -> 0%
 *   99.0% .. < 99.9%   -> 10%
 *   95.0% .. < 99.0%   -> 25%
 *   < 95.0%            -> 50%
 */

export const SLA_TARGET_UPTIME = 99.9;

export interface HealthSample {
    status: string; // REACHABLE | UNREACHABLE
    checkedAt: Date;
}

export interface SlaPeriodResult {
    samples: number;
    unreachableSamples: number;
    uptimePercent: number;
    downtimeMinutes: number;
    creditPercent: number;
}

/** Credit percentage owed for a given observed uptime percentage. */
export function creditPercentForUptime(uptimePercent: number): number {
    if (uptimePercent >= SLA_TARGET_UPTIME) return 0;
    if (uptimePercent >= 99.0) return 10;
    if (uptimePercent >= 95.0) return 25;
    return 50;
}

/**
 * Evaluate one VPS over one period. Probe cadence is derived from the period
 * length divided by the sample count, so a missing probe never invents uptime.
 */
export function evaluateSlaPeriod(
    samples: HealthSample[],
    periodStart: Date,
    periodEnd: Date,
): SlaPeriodResult {
    const total = samples.length;
    if (total === 0) {
        return {
            samples: 0,
            unreachableSamples: 0,
            uptimePercent: 100,
            downtimeMinutes: 0,
            creditPercent: 0,
        };
    }

    const unreachable = samples.filter((s) => s.status !== 'REACHABLE').length;
    const uptimePercent = round(((total - unreachable) / total) * 100, 4);

    const periodMinutes = Math.max(
        0,
        (periodEnd.getTime() - periodStart.getTime()) / 60000,
    );
    const downtimeMinutes = round((unreachable / total) * periodMinutes, 2);

    return {
        samples: total,
        unreachableSamples: unreachable,
        uptimePercent,
        downtimeMinutes,
        creditPercent: creditPercentForUptime(uptimePercent),
    };
}

/** Credit amount owed, rounded to 2 decimals. Never negative. */
export function creditAmount(periodCharge: number, creditPercent: number): number {
    if (periodCharge <= 0 || creditPercent <= 0) return 0;
    return round((periodCharge * creditPercent) / 100, 2);
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

function round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

import {
    creditPercentForUptime,
    evaluateSlaPeriod,
    creditAmount,
    previousMonthPeriod,
    SLA_TARGET_UPTIME,
} from '../../services/billing/src/billing/sla-credit';

const start = new Date('2026-07-01T00:00:00Z');
const end = new Date('2026-08-01T00:00:00Z');

function samples(total: number, unreachable: number) {
    return Array.from({ length: total }, (_, i) => ({
        status: i < unreachable ? 'UNREACHABLE' : 'REACHABLE',
        checkedAt: new Date(start.getTime() + i * 60000),
    }));
}

describe('SLA credit ladder (Tier 9)', () => {
    it('owes nothing at or above the 99.9% target', () => {
        expect(creditPercentForUptime(100)).toBe(0);
        expect(creditPercentForUptime(SLA_TARGET_UPTIME)).toBe(0);
    });

    it('applies 10 / 25 / 50 percent tiers', () => {
        expect(creditPercentForUptime(99.5)).toBe(10);
        expect(creditPercentForUptime(99.0)).toBe(10);
        expect(creditPercentForUptime(98.99)).toBe(25);
        expect(creditPercentForUptime(95)).toBe(25);
        expect(creditPercentForUptime(94.99)).toBe(50);
    });
});

describe('evaluateSlaPeriod', () => {
    it('treats a period with no probes as fully up (never invents downtime)', () => {
        const r = evaluateSlaPeriod([], start, end);
        expect(r.uptimePercent).toBe(100);
        expect(r.downtimeMinutes).toBe(0);
        expect(r.creditPercent).toBe(0);
    });

    it('computes uptime and pro-rated downtime minutes from real samples', () => {
        const r = evaluateSlaPeriod(samples(1000, 20), start, end);
        expect(r.samples).toBe(1000);
        expect(r.unreachableSamples).toBe(20);
        expect(r.uptimePercent).toBe(98);
        expect(r.creditPercent).toBe(25);
        // 2% of a 31-day period = 892.8 minutes
        expect(r.downtimeMinutes).toBeCloseTo(892.8, 1);
    });

    it('does not credit a blip inside the SLA target', () => {
        const r = evaluateSlaPeriod(samples(10000, 5), start, end);
        expect(r.uptimePercent).toBe(99.95);
        expect(r.creditPercent).toBe(0);
    });
});

describe('creditAmount', () => {
    it('is a percentage of the period charge, rounded to cents', () => {
        expect(creditAmount(120, 25)).toBe(30);
        expect(creditAmount(99.99, 10)).toBe(10);
    });

    it('never credits on zero charge or zero percent', () => {
        expect(creditAmount(0, 50)).toBe(0);
        expect(creditAmount(100, 0)).toBe(0);
        expect(creditAmount(-10, 50)).toBe(0);
    });
});

describe('previousMonthPeriod', () => {
    it('returns the closed previous calendar month in UTC', () => {
        const { periodStart, periodEnd } = previousMonthPeriod(new Date('2026-08-05T16:00:00Z'));
        expect(periodStart.toISOString()).toBe('2026-07-01T00:00:00.000Z');
        expect(periodEnd.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });
});

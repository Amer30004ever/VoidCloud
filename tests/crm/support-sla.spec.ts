/**
 * Tier 9.9 gap — SLA timers + escalation.
 * Exercises the real, pure SLA policy module (no DB, no clock flake).
 */
import {
  SLA_TARGETS,
  computeDeadlines,
  escalatedPriority,
  evaluateSla,
  normalizePriority,
  targetFor,
} from '../../services/crm/src/support/sla';

const MIN = 60_000;
const CREATED = new Date('2026-08-01T00:00:00.000Z');
const at = (mins: number) => new Date(CREATED.getTime() + mins * MIN);

describe('support SLA — priority normalization', () => {
  it('normalizes casing and unknown values to NORMAL', () => {
    expect(normalizePriority('urgent')).toBe('URGENT');
    expect(normalizePriority('HIGH')).toBe('HIGH');
    expect(normalizePriority('nonsense')).toBe('NORMAL');
    expect(normalizePriority(null)).toBe('NORMAL');
    expect(normalizePriority(undefined)).toBe('NORMAL');
  });

  it('resolves targets per priority', () => {
    expect(targetFor('URGENT')).toEqual(SLA_TARGETS.URGENT);
    expect(targetFor('bogus')).toEqual(SLA_TARGETS.NORMAL);
  });
});

describe('support SLA — deadlines', () => {
  it('computes first response and resolution deadlines from creation', () => {
    const { firstResponseDueAt, resolutionDueAt } = computeDeadlines('URGENT', CREATED);
    expect(firstResponseDueAt.toISOString()).toBe(at(30).toISOString());
    expect(resolutionDueAt.toISOString()).toBe(at(4 * 60).toISOString());
  });

  it('gives LOW tickets a far larger budget than URGENT', () => {
    const low = computeDeadlines('LOW', CREATED);
    const urgent = computeDeadlines('URGENT', CREATED);
    expect(low.resolutionDueAt.getTime()).toBeGreaterThan(urgent.resolutionDueAt.getTime());
  });
});

describe('support SLA — evaluation', () => {
  const open = (overrides: Partial<Parameters<typeof evaluateSla>[0]> = {}) => ({
    priority: 'URGENT',
    status: 'OPEN',
    createdAt: CREATED,
    ...overrides,
  });

  it('is ON_TRACK well inside the budget and does not escalate', () => {
    const r = evaluateSla(open(), at(5));
    expect(r.firstResponse).toBe('ON_TRACK');
    expect(r.breached).toBe(false);
    expect(r.shouldEscalate).toBe(false);
    expect(r.minutesRemaining).toBe(25);
  });

  it('flags AT_RISK inside the escalation window and asks for escalation', () => {
    const r = evaluateSla(open(), at(25));
    expect(r.firstResponse).toBe('AT_RISK');
    expect(r.shouldEscalate).toBe(true);
    expect(r.reason).toBe('first_response');
  });

  it('flags BREACHED once the first-response deadline passes', () => {
    const r = evaluateSla(open(), at(45));
    expect(r.firstResponse).toBe('BREACHED');
    expect(r.breached).toBe(true);
    expect(r.minutesRemaining).toBe(-15);
  });

  it('marks first response MET when answered before the deadline', () => {
    const r = evaluateSla(open({ firstRespondedAt: at(10) }), at(45));
    expect(r.firstResponse).toBe('MET');
    expect(r.resolution).toBe('ON_TRACK');
  });

  it('marks first response BREACHED when answered after the deadline', () => {
    const r = evaluateSla(open({ firstRespondedAt: at(40) }), at(45));
    expect(r.firstResponse).toBe('BREACHED');
    expect(r.breached).toBe(true);
  });

  it('treats a resolved ticket as terminal and stops the clock', () => {
    const r = evaluateSla(
      open({ status: 'RESOLVED', firstRespondedAt: at(10), closedAt: at(120) }),
      at(10_000),
    );
    expect(r.resolution).toBe('MET');
    expect(r.minutesRemaining).toBeNull();
    expect(r.shouldEscalate).toBe(false);
  });

  it('does not re-escalate a ticket already escalated', () => {
    const r = evaluateSla(open({ escalatedAt: at(20) }), at(45));
    expect(r.breached).toBe(true);
    expect(r.shouldEscalate).toBe(false);
  });

  it('escalates on the resolution clock once first response is done', () => {
    const r = evaluateSla(open({ firstRespondedAt: at(5) }), at(4 * 60 - 5));
    expect(r.resolution).toBe('AT_RISK');
    expect(r.shouldEscalate).toBe(true);
    expect(r.reason).toBe('resolution');
  });
});

describe('support SLA — escalation priority ladder', () => {
  it('bumps one step and caps at URGENT', () => {
    expect(escalatedPriority('LOW')).toBe('NORMAL');
    expect(escalatedPriority('NORMAL')).toBe('HIGH');
    expect(escalatedPriority('HIGH')).toBe('URGENT');
    expect(escalatedPriority('URGENT')).toBe('URGENT');
  });
});

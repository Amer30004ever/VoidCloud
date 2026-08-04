/**
 * Support SLA policy (Tier 9.9 gap — SLA timers + escalation).
 *
 * Pure, dependency-free so the whole clock/escalation decision path is unit
 * testable without a database. Targets are per-priority and measured from
 * ticket creation for first response, and from creation for resolution.
 */

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface SlaTarget {
  /** Minutes allowed before the first staff reply. */
  firstResponseMins: number;
  /** Minutes allowed before the ticket is resolved. */
  resolutionMins: number;
  /** Minutes of remaining budget at which the ticket is escalated early. */
  escalateAtRemainingMins: number;
}

export const SLA_TARGETS: Record<TicketPriority, SlaTarget> = {
  URGENT: { firstResponseMins: 30, resolutionMins: 4 * 60, escalateAtRemainingMins: 10 },
  HIGH: { firstResponseMins: 2 * 60, resolutionMins: 12 * 60, escalateAtRemainingMins: 30 },
  NORMAL: { firstResponseMins: 8 * 60, resolutionMins: 48 * 60, escalateAtRemainingMins: 60 },
  LOW: { firstResponseMins: 24 * 60, resolutionMins: 5 * 24 * 60, escalateAtRemainingMins: 120 },
};

export function normalizePriority(value: string | null | undefined): TicketPriority {
  const p = String(value ?? '').toUpperCase();
  return (p in SLA_TARGETS ? p : 'NORMAL') as TicketPriority;
}

export function targetFor(priority: string | null | undefined): SlaTarget {
  return SLA_TARGETS[normalizePriority(priority)];
}

const MIN = 60_000;

/** Absolute SLA deadlines for a ticket created at `createdAt`. */
export function computeDeadlines(
  priority: string | null | undefined,
  createdAt: Date,
): { firstResponseDueAt: Date; resolutionDueAt: Date } {
  const t = targetFor(priority);
  return {
    firstResponseDueAt: new Date(createdAt.getTime() + t.firstResponseMins * MIN),
    resolutionDueAt: new Date(createdAt.getTime() + t.resolutionMins * MIN),
  };
}

export interface SlaTicketState {
  priority: string;
  status: string;
  createdAt: Date;
  firstResponseDueAt?: Date | null;
  resolutionDueAt?: Date | null;
  firstRespondedAt?: Date | null;
  closedAt?: Date | null;
  escalatedAt?: Date | null;
}

export type SlaState =
  | 'MET' // finished within target
  | 'ON_TRACK'
  | 'AT_RISK' // inside the escalation window
  | 'BREACHED';

export interface SlaEvaluation {
  firstResponse: SlaState;
  resolution: SlaState;
  /** Minutes remaining against the nearest active deadline (negative = late). */
  minutesRemaining: number | null;
  breached: boolean;
  /** True when the ticket should be escalated now and hasn't been already. */
  shouldEscalate: boolean;
  reason?: string;
}

/** Evaluate a ticket's SLA position at time `now`. Pure. */
export function evaluateSla(
  ticket: SlaTicketState,
  now: Date = new Date(),
): SlaEvaluation {
  const t = targetFor(ticket.priority);
  const deadlines = computeDeadlines(ticket.priority, ticket.createdAt);
  const frDue = ticket.firstResponseDueAt ?? deadlines.firstResponseDueAt;
  const resDue = ticket.resolutionDueAt ?? deadlines.resolutionDueAt;
  const terminal = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  const classify = (due: Date, completedAt: Date | null | undefined): SlaState => {
    if (completedAt) return completedAt.getTime() <= due.getTime() ? 'MET' : 'BREACHED';
    const remaining = (due.getTime() - now.getTime()) / MIN;
    if (remaining < 0) return 'BREACHED';
    if (remaining <= t.escalateAtRemainingMins) return 'AT_RISK';
    return 'ON_TRACK';
  };

  const firstResponse = classify(frDue, ticket.firstRespondedAt ?? null);
  const resolution = classify(resDue, terminal ? (ticket.closedAt ?? now) : null);

  const activeDue = !ticket.firstRespondedAt ? frDue : terminal ? null : resDue;
  const minutesRemaining = activeDue
    ? Math.round((activeDue.getTime() - now.getTime()) / MIN)
    : null;

  const breached = firstResponse === 'BREACHED' || resolution === 'BREACHED';
  const atRisk = firstResponse === 'AT_RISK' || resolution === 'AT_RISK';
  const shouldEscalate = !terminal && !ticket.escalatedAt && (breached || atRisk);

  return {
    firstResponse,
    resolution,
    minutesRemaining,
    breached,
    shouldEscalate,
    ...(shouldEscalate
      ? {
          reason:
            firstResponse === 'BREACHED' || firstResponse === 'AT_RISK'
              ? 'first_response'
              : 'resolution',
        }
      : {}),
  };
}

/** Priority bump applied when a ticket is escalated. */
export function escalatedPriority(priority: string | null | undefined): TicketPriority {
  switch (normalizePriority(priority)) {
    case 'LOW':
      return 'NORMAL';
    case 'NORMAL':
      return 'HIGH';
    default:
      return 'URGENT';
  }
}

/**
 * Prompt 0.15 — pre-existing VM migration to the isolation ruleset.
 *
 * The per-VM isolation firewall (`vm-network-isolation.ts`) is applied at
 * provisioning time. Any tenant VM that existed BEFORE that code landed never
 * got the ruleset, and a VM whose ruleset was hand-edited on the host has
 * drifted away from it. Neither case is visible anywhere today.
 *
 * This module closes that gap:
 *   - it enumerates every container on every configured Proxmox node,
 *   - classifies each one against the currently-generated ruleset, and
 *   - can backfill the missing/drifted ones (idempotently).
 *
 * The classification is pure and unit-tested; the service around it only
 * supplies I/O, so the whole decision path is verifiable without a live host.
 */

export type IsolationState =
  | 'COMPLIANT' // firewall enabled and raw ruleset matches the expected one
  | 'MISSING' // no ruleset at all — a pre-existing VM predating the fix
  | 'DRIFTED' // has a ruleset, but not the expected one
  | 'DISABLED'; // ruleset present but the VM firewall switch is off

export interface VmFirewallState {
  node: string;
  vmid: number;
  name?: string;
  /** Whether Proxmox's per-VM firewall switch is on. */
  enabled: boolean;
  /** The raw ruleset currently stored on the VM, if any. */
  raw: string | null;
}

export interface IsolationFinding extends VmFirewallState {
  state: IsolationState;
  /** True when `reconcile()` would push the expected ruleset to this VM. */
  needsMigration: boolean;
}

/** Whitespace/comment-insensitive comparison of two Proxmox raw rulesets. */
export function normalizeRuleset(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .join('\n');
}

/** Classify one VM against the expected ruleset. Pure. */
export function classifyVm(
  vm: VmFirewallState,
  expectedRaw: string,
): IsolationFinding {
  const current = normalizeRuleset(vm.raw);
  const expected = normalizeRuleset(expectedRaw);

  let state: IsolationState;
  if (current.length === 0) state = 'MISSING';
  else if (current !== expected) state = 'DRIFTED';
  else if (!vm.enabled) state = 'DISABLED';
  else state = 'COMPLIANT';

  return { ...vm, state, needsMigration: state !== 'COMPLIANT' };
}

export interface IsolationReport {
  live: boolean;
  scannedAt: string;
  total: number;
  compliant: number;
  missing: number;
  drifted: number;
  disabled: number;
  /** True when at least one pre-existing VM never received the ruleset. */
  preExistingVmsFound: boolean;
  findings: IsolationFinding[];
}

/** Build the aggregate report from per-VM findings. Pure. */
export function summarize(
  findings: IsolationFinding[],
  live: boolean,
  scannedAt = new Date(),
): IsolationReport {
  const count = (s: IsolationState) =>
    findings.filter((f) => f.state === s).length;
  const missing = count('MISSING');
  return {
    live,
    scannedAt: scannedAt.toISOString(),
    total: findings.length,
    compliant: count('COMPLIANT'),
    missing,
    drifted: count('DRIFTED'),
    disabled: count('DISABLED'),
    preExistingVmsFound: missing > 0,
    findings,
  };
}

export interface ReconcileOutcome {
  vmid: number;
  node: string;
  from: IsolationState;
  applied: boolean;
  error?: string;
}

export interface ReconcileResult extends IsolationReport {
  dryRun: boolean;
  outcomes: ReconcileOutcome[];
  migrated: number;
  failed: number;
}

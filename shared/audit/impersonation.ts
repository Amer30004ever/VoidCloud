/**
 * Canonical helper for propagating the `impersonatedBy` claim into audit log
 * details. Every service that writes an `auditLog` row for an action taken by
 * an authenticated actor MUST run its details object through this helper so a
 * Super Admin acting through "Login as user X" is always attributable.
 *
 * Services copy this file into `src/common/audit-impersonation.ts` (same
 * pattern as `shared/auth/token-revocation.ts`) because each NestJS service is
 * an independently built pod with its own tsconfig rootDir.
 */

export type AuditActor = {
  id?: string;
  role?: string;
  email?: string;
  /** Present only when the caller holds an impersonation-scoped token. */
  impersonatedBy?: string;
};

/**
 * Merge `impersonatedBy` into an audit details payload.
 * Returns a new object; never mutates the input.
 */
export function withImpersonation(
  details: Record<string, unknown> | undefined,
  actor: AuditActor | undefined | null,
): Record<string, unknown> {
  const impersonatedBy = actor?.impersonatedBy;
  return {
    ...(details ?? {}),
    ...(impersonatedBy ? { impersonatedBy } : {}),
  };
}

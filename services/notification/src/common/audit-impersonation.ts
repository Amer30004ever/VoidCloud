// Mirror of shared/audit/impersonation.ts — keep both in sync.
export type AuditActor = {
  id?: string;
  role?: string;
  email?: string;
  impersonatedBy?: string;
};

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

"use client";

import { auditApiClient } from "@/features/admin/audit";
import { trackEvent } from "@/lib/analytics";

export type LearningAuditAction =
  | "learning.checklist.started"
  | "learning.checklist.step_completed"
  | "learning.checklist.step_uncompleted"
  | "learning.checklist.reset"
  | "learning.checklist.published"
  | "learning.checklist.rolled_back"
  | "learning.quiz.started"
  | "learning.quiz.submitted";

export interface LearningAuditEntry {
  id: string;
  action: LearningAuditAction;
  resource: string;
  userId?: string;
  userEmail?: string;
  details: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

const STORAGE_KEY = "voidcloud_learning_audit";
const MAX_ENTRIES = 200;

function read(): LearningAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LearningAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: LearningAuditEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* storage unavailable — audit must never break the UI */
  }
}

/** Local mirror of learning activity, newest first. */
export function getLearningAuditTrail(): LearningAuditEntry[] {
  return read().slice().reverse();
}

/**
 * Records a learning activity with a timestamp and the acting user.
 * Writes locally first (so the trail survives an offline backend) and
 * best-effort forwards the entry to the audit service.
 */
export function logLearningActivity(
  action: LearningAuditAction,
  opts: {
    resource: string;
    user?: { id?: string; email?: string } | null;
    details?: Record<string, unknown>;
  }
): void {
  const entry: LearningAuditEntry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    action,
    resource: opts.resource,
    userId: opts.user?.id,
    userEmail: opts.user?.email,
    details: opts.details ?? {},
    createdAt: new Date().toISOString(),
    synced: false,
  };

  write([...read(), entry]);
  trackEvent(action, { resource: opts.resource });

  void auditApiClient
    .create({
      action,
      resource: opts.resource,
      userId: entry.userId,
      userEmail: entry.userEmail,
      details: { ...entry.details, occurredAt: entry.createdAt },
    })
    .then(() => {
      write(read().map((e) => (e.id === entry.id ? { ...e, synced: true } : e)));
    })
    .catch(() => {
      /* backend offline — entry stays in the local trail */
    });
}

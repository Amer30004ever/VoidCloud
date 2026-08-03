"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { CHECKLIST_TEMPLATES, ChecklistTemplate, ChecklistStep } from "./content";
import { logLearningActivity } from "./audit";

export interface ChecklistVersion {
  version: number;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  steps: ChecklistStep[];
  published: boolean;
  savedAt: string;
  /** Short human note describing what changed. */
  note: string;
}

export interface CustomChecklist extends ChecklistTemplate {
  custom: true;
  published: boolean;
  updatedAt: string;
  version: number;
  history: ChecklistVersion[];
}

type ProgressMap = Record<string, string[]>; // checklistId -> completed step ids

function keyFor(kind: "progress" | "custom", userId: string) {
  return `voidcloud_learning_${kind}_${userId}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function snapshot(c: CustomChecklist, note: string): ChecklistVersion {
  return {
    version: c.version,
    title: c.title,
    summary: c.summary,
    category: c.category,
    tags: [...c.tags],
    steps: c.steps.map((s) => ({ ...s })),
    published: c.published,
    savedAt: c.updatedAt,
    note,
  };
}

/** Older saved checklists predate versioning — normalise them on read. */
function normalise(c: CustomChecklist): CustomChecklist {
  return { ...c, version: c.version ?? 1, history: c.history ?? [] };
}

function summariseChange(prev: CustomChecklist, next: CustomChecklist): string {
  const bits: string[] = [];
  if (prev.title !== next.title) bits.push("title");
  if (prev.summary !== next.summary) bits.push("summary");
  if (prev.category !== next.category) bits.push("category");
  if (prev.tags.join(",") !== next.tags.join(",")) bits.push("tags");
  if (prev.steps.length !== next.steps.length) {
    bits.push(`steps ${prev.steps.length} → ${next.steps.length}`);
  } else if (prev.steps.some((s, i) => s.title !== next.steps[i]?.title)) {
    bits.push("step wording");
  }
  if (prev.published !== next.published) bits.push(next.published ? "published" : "unpublished");
  return bits.length ? `Edited ${bits.join(", ")}` : "Saved with no visible changes";
}

export function useLearningChecklists() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const [progress, setProgress] = useState<ProgressMap>({});
  const [custom, setCustom] = useState<CustomChecklist[]>([]);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProgress(readJson<ProgressMap>(keyFor("progress", userId), {}));
    setCustom(readJson<CustomChecklist[]>(keyFor("custom", userId), []).map(normalise));
    setReady(true);
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const all: (ChecklistTemplate | CustomChecklist)[] = useMemo(
    () => [...custom, ...CHECKLIST_TEMPLATES],
    [custom]
  );

  const getChecklist = useCallback(
    (id: string) => all.find((c) => c.id === id) ?? null,
    [all]
  );

  const completedFor = useCallback((id: string) => progress[id] ?? [], [progress]);

  const toggleStep = useCallback(
    (checklistId: string, stepId: string) => {
      const checklist = all.find((c) => c.id === checklistId);
      setProgress((prev) => {
        const done = prev[checklistId] ?? [];
        const completing = !done.includes(stepId);
        const nextDone = completing ? [...done, stepId] : done.filter((s) => s !== stepId);
        const next = { ...prev, [checklistId]: nextDone };
        writeJson(keyFor("progress", userId), next);

        if (completing && done.length === 0) {
          logLearningActivity("learning.checklist.started", {
            resource: `checklist:${checklistId}`,
            user,
            details: { title: checklist?.title, totalSteps: checklist?.steps.length },
          });
        }
        logLearningActivity(
          completing ? "learning.checklist.step_completed" : "learning.checklist.step_uncompleted",
          {
            resource: `checklist:${checklistId}`,
            user,
            details: {
              title: checklist?.title,
              stepId,
              stepTitle: checklist?.steps.find((s) => s.id === stepId)?.title,
              completedSteps: nextDone.length,
              totalSteps: checklist?.steps.length,
            },
          }
        );
        return next;
      });
    },
    [userId, all, user]
  );

  const resetChecklist = useCallback(
    (checklistId: string) => {
      setProgress((prev) => {
        const next = { ...prev, [checklistId]: [] };
        writeJson(keyFor("progress", userId), next);
        return next;
      });
      logLearningActivity("learning.checklist.reset", {
        resource: `checklist:${checklistId}`,
        user,
      });
    },
    [userId, user]
  );

  const saveCustom = useCallback(
    (checklist: CustomChecklist) => {
      setCustom((prev) => {
        const existing = prev.find((c) => c.id === checklist.id);
        const incoming: CustomChecklist = normalise({
          ...checklist,
          updatedAt: new Date().toISOString(),
        });

        let saved: CustomChecklist;
        if (existing) {
          const note = summariseChange(existing, incoming);
          saved = {
            ...incoming,
            version: existing.version + 1,
            history: [...existing.history, snapshot(existing, note)].slice(-25),
          };
        } else {
          saved = { ...incoming, version: 1, history: [] };
        }

        const next = existing
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [saved, ...prev];
        writeJson(keyFor("custom", userId), next);

        logLearningActivity("learning.checklist.published", {
          resource: `checklist:${saved.id}`,
          user,
          details: { title: saved.title, version: saved.version, published: saved.published },
        });
        return next;
      });
    },
    [userId, user]
  );

  /** Restore a prior version as a new version (history is never rewritten). */
  const rollbackCustom = useCallback(
    (id: string, version: number) => {
      setCustom((prev) => {
        const existing = prev.find((c) => c.id === id);
        const target = existing?.history.find((h) => h.version === version);
        if (!existing || !target) return prev;

        const restored: CustomChecklist = {
          ...existing,
          title: target.title,
          summary: target.summary,
          category: target.category,
          tags: [...target.tags],
          steps: target.steps.map((s) => ({ ...s })),
          published: target.published,
          updatedAt: new Date().toISOString(),
          version: existing.version + 1,
          history: [
            ...existing.history,
            snapshot(existing, `Rolled back to v${version}`),
          ].slice(-25),
        };
        const next = prev.map((c) => (c.id === id ? restored : c));
        writeJson(keyFor("custom", userId), next);

        logLearningActivity("learning.checklist.rolled_back", {
          resource: `checklist:${id}`,
          user,
          details: { title: restored.title, fromVersion: existing.version, toVersion: version, newVersion: restored.version },
        });
        return next;
      });
    },
    [userId, user]
  );

  const deleteCustom = useCallback(
    (id: string) => {
      setCustom((prev) => {
        const next = prev.filter((c) => c.id !== id);
        writeJson(keyFor("custom", userId), next);
        return next;
      });
    },
    [userId]
  );

  const stats = useMemo(() => {
    const perChecklist = all.map((c) => {
      const done = (progress[c.id] ?? []).filter((s) => c.steps.some((st) => st.id === s));
      return {
        checklist: c,
        completed: done.length,
        total: c.steps.length,
        percent: c.steps.length ? Math.round((done.length / c.steps.length) * 100) : 0,
      };
    });
    const totalSteps = perChecklist.reduce((a, b) => a + b.total, 0);
    const totalDone = perChecklist.reduce((a, b) => a + b.completed, 0);
    return {
      perChecklist,
      totalSteps,
      totalDone,
      percent: totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0,
      started: perChecklist.filter((p) => p.completed > 0 && p.percent < 100),
      finished: perChecklist.filter((p) => p.percent === 100 && p.total > 0),
    };
  }, [all, progress]);

  const recommended = useMemo(() => {
    const inProgress = stats.started
      .sort((a, b) => b.percent - a.percent)
      .flatMap((p) => {
        const done = progress[p.checklist.id] ?? [];
        const next = p.checklist.steps.find((s) => !done.includes(s.id));
        return next ? [{ checklist: p.checklist, step: next }] : [];
      });
    const notStarted = stats.perChecklist
      .filter((p) => p.completed === 0 && p.total > 0)
      .slice(0, 3)
      .map((p) => ({ checklist: p.checklist, step: p.checklist.steps[0]! }));
    return [...inProgress, ...notStarted].slice(0, 5);
  }, [stats, progress]);

  return {
    ready,
    userId,
    all,
    custom,
    getChecklist,
    completedFor,
    toggleStep,
    resetChecklist,
    saveCustom,
    rollbackCustom,
    deleteCustom,
    stats,
    recommended,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { CHECKLIST_TEMPLATES, ChecklistTemplate } from "./content";

export interface CustomChecklist extends ChecklistTemplate {
  custom: true;
  published: boolean;
  updatedAt: string;
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

export function useLearningChecklists() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const [progress, setProgress] = useState<ProgressMap>({});
  const [custom, setCustom] = useState<CustomChecklist[]>([]);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProgress(readJson<ProgressMap>(keyFor("progress", userId), {}));
    setCustom(readJson<CustomChecklist[]>(keyFor("custom", userId), []));
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
      setProgress((prev) => {
        const done = prev[checklistId] ?? [];
        const next = {
          ...prev,
          [checklistId]: done.includes(stepId)
            ? done.filter((s) => s !== stepId)
            : [...done, stepId],
        };
        writeJson(keyFor("progress", userId), next);
        return next;
      });
    },
    [userId]
  );

  const resetChecklist = useCallback(
    (checklistId: string) => {
      setProgress((prev) => {
        const next = { ...prev, [checklistId]: [] };
        writeJson(keyFor("progress", userId), next);
        return next;
      });
    },
    [userId]
  );

  const saveCustom = useCallback(
    (checklist: CustomChecklist) => {
      setCustom((prev) => {
        const next = prev.some((c) => c.id === checklist.id)
          ? prev.map((c) => (c.id === checklist.id ? checklist : c))
          : [checklist, ...prev];
        writeJson(keyFor("custom", userId), next);
        return next;
      });
    },
    [userId]
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
    deleteCustom,
    stats,
    recommended,
  };
}

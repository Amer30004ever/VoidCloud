"use client";

import { use } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useLearningChecklists } from "@/features/learning/useLearningChecklists";

export default function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, getChecklist, completedFor, toggleStep, resetChecklist } = useLearningChecklists();
  const checklist = getChecklist(id);
  const done = completedFor(id);

  if (!ready) {
    return (
      <AppLayout>
        <div className="text-sm text-muted-foreground">Loading checklist…</div>
      </AppLayout>
    );
  }

  if (!checklist) {
    return (
      <AppLayout>
        <PageHeader title="Checklist not found" description="This checklist may have been deleted." />
        <Link href="/learning/checklists" className="text-sm text-primary hover:underline">
          Back to checklists
        </Link>
      </AppLayout>
    );
  }

  const percent = checklist.steps.length
    ? Math.round((done.filter((d) => checklist.steps.some((s) => s.id === d)).length / checklist.steps.length) * 100)
    : 0;
  const nextStep = checklist.steps.find((s) => !done.includes(s.id));

  return (
    <AppLayout>
      <Link href="/learning/checklists" className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All checklists
      </Link>

      <PageHeader title={checklist.title} description={checklist.summary} />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done.filter((d) => checklist.steps.some((s) => s.id === d)).length} of {checklist.steps.length} complete
          </span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        {nextStep ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Next up: <span className="text-foreground">{nextStep.title}</span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-emerald-400">All steps complete. Nice work.</p>
        )}
      </div>

      <ol className="space-y-2">
        {checklist.steps.map((step, idx) => {
          const isDone = done.includes(step.id);
          const isNext = nextStep?.id === step.id;
          return (
            <li key={step.id}>
              <button
                onClick={() => toggleStep(checklist.id, step.id)}
                aria-pressed={isDone}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : isNext
                      ? "border-primary/50 bg-card"
                      : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${
                    isDone ? "border-emerald-500 bg-emerald-500 text-black" : "border-border text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {step.title}
                  </span>
                  {step.hint && <span className="mt-1 block text-xs text-muted-foreground">{step.hint}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        onClick={() => resetChecklist(checklist.id)}
        className="mt-6 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset progress
      </button>
    </AppLayout>
  );
}

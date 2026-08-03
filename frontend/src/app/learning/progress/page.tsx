"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { CheckCircle2, ListChecks, Target, ArrowRight } from "lucide-react";
import { useLearningChecklists } from "@/features/learning/useLearningChecklists";

export default function LearningProgressPage() {
  const { ready, stats, recommended } = useLearningChecklists();

  const kpis = [
    { label: "Steps completed", value: `${stats.totalDone}/${stats.totalSteps}`, icon: CheckCircle2 },
    { label: "Overall progress", value: `${stats.percent}%`, icon: Target },
    { label: "Checklists finished", value: String(stats.finished.length), icon: ListChecks },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="My learning progress"
        description="Completed checklist items and what to tackle next"
      />

      {!ready ? (
        <div className="text-sm text-muted-foreground">Loading progress…</div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <k.icon className="h-4 w-4 text-primary" />
                  {k.label}
                </div>
                <p className="text-2xl font-semibold text-foreground">{k.value}</p>
              </div>
            ))}
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Next recommended tasks</h2>
            {recommended.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Everything is complete — nice. Create a new checklist to keep going.
              </div>
            ) : (
              <div className="space-y-2">
                {recommended.map(({ checklist, step }) => (
                  <Link
                    key={`${checklist.id}-${step.id}`}
                    href={`/learning/checklists/${checklist.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{checklist.title}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">All checklists</h2>
            <div className="space-y-2">
              {stats.perChecklist.map((p) => (
                <Link
                  key={p.checklist.id}
                  href={`/learning/checklists/${p.checklist.id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{p.checklist.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.completed}/{p.total} · {p.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.percent}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}

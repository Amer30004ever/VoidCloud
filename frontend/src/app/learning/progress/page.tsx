"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { CheckCircle2, ListChecks, Target, ArrowRight, Award, Clock } from "lucide-react";
import { useLearningChecklists } from "@/features/learning/useLearningChecklists";
import { useQuizAttempts } from "@/features/learning/useQuizAttempts";
import { getLearningAuditTrail } from "@/features/learning/audit";

export default function LearningProgressPage() {
  const { ready, stats, recommended } = useLearningChecklists();
  const { stats: quizStats, attempts } = useQuizAttempts();
  const activity = ready ? getLearningAuditTrail().slice(0, 10) : [];

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
            <h2 className="mb-3 text-sm font-semibold text-foreground">Certification prep</h2>
            <div className="space-y-2">
              {quizStats.perQuiz.map(({ quiz, attempts: count, best, passed }) => (
                <Link
                  key={quiz.id}
                  href={`/learning/quiz/${quiz.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Award className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {count ? `${count} attempt${count === 1 ? "" : "s"} · best ${best}%` : "No attempts yet"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      passed ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {passed ? "Passed" : `Pass ${quiz.passMark}%`}
                  </span>
                </Link>
              ))}
            </div>
            {attempts.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Average score across {attempts.length} attempt{attempts.length === 1 ? "" : "s"}: {quizStats.averageScore}%
              </p>
            )}
          </section>

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
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Recent activity</h2>
            {activity.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No learning activity recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 p-4">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground">
                        {a.action.replace("learning.", "").replace(/[._]/g, " ")}
                        {typeof a.details.title === "string" ? ` — ${a.details.title}` : ""}
                        {typeof a.details.stepTitle === "string" ? `: ${a.details.stepTitle}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()} · {a.userEmail ?? a.userId ?? "you"} ·{" "}
                        {a.synced ? "synced to audit log" : "queued"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}

"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { Award, History, Trash2, Trophy, Target } from "lucide-react";
import { useQuizAttempts } from "@/features/learning/useQuizAttempts";

export default function QuizIndexPage() {
  const { ready, attempts, stats, clearHistory } = useQuizAttempts();

  return (
    <AppLayout>
      <PageHeader
        title="Certification practice exams"
        description="Timed-style question banks with scoring and a saved attempt history per user"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Attempts", value: stats.totalAttempts, icon: History },
          { label: "Average score", value: `${stats.averageScore}%`, icon: Target },
          { label: "Exams passed", value: stats.passedQuizzes, icon: Trophy },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <kpi.icon className="h-3.5 w-3.5" /> {kpi.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {!ready ? (
        <div className="text-sm text-muted-foreground">Loading practice exams…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.perQuiz.map(({ quiz, attempts: count, best, last, passed }) => (
            <div key={quiz.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{quiz.level}</span>
                </div>
                {passed && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">Passed</span>
                )}
              </div>
              <h3 className="text-sm font-medium text-foreground">{quiz.title}</h3>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{quiz.summary}</p>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <dt>Questions</dt>
                  <dd className="text-foreground">{quiz.questions.length}</dd>
                </div>
                <div>
                  <dt>Pass mark</dt>
                  <dd className="text-foreground">{quiz.passMark}%</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd className="text-foreground">{count ? `${best}%` : "—"}</dd>
                </div>
              </dl>

              {last && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Last attempt {new Date(last.finishedAt).toLocaleString()} — {last.score}%
                </p>
              )}

              <div className="mt-4">
                <Link
                  href={`/learning/quiz/${quiz.id}`}
                  className="inline-block rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
                >
                  {count ? "Retake exam" : "Start exam"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Attempt history</h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Finished</th>
                </tr>
              </thead>
              <tbody>
                {attempts
                  .slice()
                  .reverse()
                  .map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-foreground">{a.quizTitle}</td>
                      <td className="px-4 py-3">{a.score}%</td>
                      <td className="px-4 py-3">
                        {a.correct}/{a.total}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            a.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {a.passed ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{Math.round(a.durationMs / 1000)}s</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(a.finishedAt).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppLayout>
  );
}

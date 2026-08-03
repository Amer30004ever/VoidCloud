"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { ArrowLeft, Check, X, RotateCcw } from "lucide-react";
import { getQuizBank } from "@/features/learning/quizzes";
import { useQuizAttempts, type QuizAttempt } from "@/features/learning/useQuizAttempts";

export default function QuizRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const quiz = getQuizBank(id);
  const { ready, byQuiz, startAttempt, recordAttempt } = useQuizAttempts();

  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);

  const history = useMemo(() => (quiz ? byQuiz(quiz.id) : []), [quiz, byQuiz]);

  if (!quiz) {
    return (
      <AppLayout>
        <PageHeader title="Practice exam not found" description="This question bank is no longer available." />
        <Link href="/learning/quiz" className="text-sm text-primary hover:underline">
          Back to practice exams
        </Link>
      </AppLayout>
    );
  }

  const begin = () => {
    setAnswers({});
    setResult(null);
    setStartedAt(new Date().toISOString());
    startAttempt(quiz);
  };

  const submit = () => {
    if (!startedAt) return;
    setResult(recordAttempt(quiz, answers, startedAt));
    setStartedAt(null);
  };

  const answered = Object.keys(answers).length;
  const inProgress = Boolean(startedAt) && !result;

  return (
    <AppLayout>
      <Link
        href="/learning/quiz"
        className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All practice exams
      </Link>

      <PageHeader title={quiz.title} description={quiz.summary} />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>{quiz.questions.length} questions</span>
          <span>Pass mark {quiz.passMark}%</span>
          <span>~{quiz.minutes} min</span>
          <span className="capitalize">Level: {quiz.level}</span>
        </div>
        {inProgress ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>
                {answered}/{quiz.questions.length} answered
              </span>
              <span>{Math.round((answered / quiz.questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(answered / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={begin}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            {result ? <RotateCcw className="h-4 w-4" /> : null}
            {result ? "Retake exam" : "Start exam"}
          </button>
        )}
      </div>

      {result && (
        <div
          className={`mb-6 rounded-xl border p-5 ${
            result.passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"
          }`}
        >
          <p className="text-sm font-medium text-foreground">
            {result.passed ? "Passed" : "Not passed"} — {result.score}% ({result.correct}/{result.total} correct)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Completed in {Math.round(result.durationMs / 1000)}s. Review the explanations below, then retake to improve.
          </p>
        </div>
      )}

      {(inProgress || result) && (
        <ol className="space-y-4">
          {quiz.questions.map((q, idx) => {
            const picked = answers[q.id];
            return (
              <li key={q.id} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-foreground">
                  <span className="mr-2 text-muted-foreground">{idx + 1}.</span>
                  {q.prompt}
                </p>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => {
                    const isPicked = picked === oi;
                    const isCorrect = q.answer === oi;
                    const reveal = Boolean(result);
                    return (
                      <button
                        key={oi}
                        disabled={!inProgress}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-xs transition-colors ${
                          reveal && isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : reveal && isPicked
                              ? "border-rose-500/50 bg-rose-500/5"
                              : isPicked
                                ? "border-primary/60 bg-primary/5"
                                : "border-border hover:border-primary/40"
                        } ${inProgress ? "" : "cursor-default"}`}
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                          {reveal && isCorrect ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : reveal && isPicked ? (
                            <X className="h-3 w-3 text-rose-400" />
                          ) : (
                            String.fromCharCode(65 + oi)
                          )}
                        </span>
                        <span className="text-foreground">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {result && (
                  <p className="mt-3 rounded-lg bg-white/5 p-3 text-[11px] text-muted-foreground">{q.explanation}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {inProgress && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={answered === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Submit and score
          </button>
          <span className="text-xs text-muted-foreground">
            {quiz.questions.length - answered} unanswered question
            {quiz.questions.length - answered === 1 ? "" : "s"} will be marked incorrect.
          </span>
        </div>
      )}

      {ready && history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-foreground">Your attempts for this exam</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Finished</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.finishedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground">{a.score}%</td>
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { logLearningActivity } from "./audit";
import { QUIZ_BANKS, type QuizBank } from "./quizzes";

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  /** questionId -> selected option index */
  answers: Record<string, number>;
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

function keyFor(userId: string) {
  return `voidcloud_learning_attempts_${userId}`;
}

function readAttempts(key: string): QuizAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as QuizAttempt[]) : [];
  } catch {
    return [];
  }
}

export function useQuizAttempts() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAttempts(readAttempts(keyFor(userId)));
    setReady(true);
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = useCallback(
    (next: QuizAttempt[]) => {
      setAttempts(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(keyFor(userId), JSON.stringify(next.slice(-100)));
      } catch {
        /* noop */
      }
    },
    [userId]
  );

  const startAttempt = useCallback(
    (quiz: QuizBank) => {
      logLearningActivity("learning.quiz.started", {
        resource: `quiz:${quiz.id}`,
        user,
        details: { quizTitle: quiz.title, questions: quiz.questions.length },
      });
    },
    [user]
  );

  const recordAttempt = useCallback(
    (quiz: QuizBank, answers: Record<string, number>, startedAt: string): QuizAttempt => {
      const correct = quiz.questions.filter((q) => answers[q.id] === q.answer).length;
      const total = quiz.questions.length;
      const score = total ? Math.round((correct / total) * 100) : 0;
      const finishedAt = new Date().toISOString();
      const attempt: QuizAttempt = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        quizId: quiz.id,
        quizTitle: quiz.title,
        answers,
        correct,
        total,
        score,
        passed: score >= quiz.passMark,
        startedAt,
        finishedAt,
        durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
      };
      persist([...attempts, attempt]);
      logLearningActivity("learning.quiz.submitted", {
        resource: `quiz:${quiz.id}`,
        user,
        details: { score, correct, total, passed: attempt.passed, durationMs: attempt.durationMs },
      });
      return attempt;
    },
    [attempts, persist, user]
  );

  const clearHistory = useCallback(() => persist([]), [persist]);

  const byQuiz = useCallback(
    (quizId: string) => attempts.filter((a) => a.quizId === quizId).slice().reverse(),
    [attempts]
  );

  const stats = useMemo(() => {
    const perQuiz = QUIZ_BANKS.map((quiz) => {
      const mine = attempts.filter((a) => a.quizId === quiz.id);
      const best = mine.reduce((max, a) => Math.max(max, a.score), 0);
      return {
        quiz,
        attempts: mine.length,
        best,
        last: mine.length ? mine[mine.length - 1]! : null,
        passed: mine.some((a) => a.passed),
      };
    });
    return {
      perQuiz,
      totalAttempts: attempts.length,
      passedQuizzes: perQuiz.filter((p) => p.passed).length,
      averageScore: attempts.length
        ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length)
        : 0,
    };
  }, [attempts]);

  return { ready, attempts, byQuiz, startAttempt, recordAttempt, clearHistory, stats };
}

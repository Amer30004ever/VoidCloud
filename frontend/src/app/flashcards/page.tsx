"use client";
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLocalStore } from "@/hooks/useLocalStore";

interface Card { id: string; front: string; back: string; ease: number; due: string; createdAt: string; updatedAt: string }

export default function FlashcardsPage() {
  const { items, create, update, remove, ready } = useLocalStore<Card>("amer.flashcards", []);
  const [front, setFront] = useState(""); const [back, setBack] = useState("");
  const [idx, setIdx] = useState(0); const [revealed, setRevealed] = useState(false);
  const due = items.filter((c) => new Date(c.due) <= new Date());
  const card = due[idx];

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRevealed(false); }, [idx, card?.id]);

  const grade = (g: "again" | "good" | "easy") => {
    if (!card) return;
    const mult = g === "again" ? 0.5 : g === "good" ? 2 : 4;
    const ease = Math.max(1, (card.ease ?? 1) * mult);
    const nextDue = new Date(Date.now() + ease * 24 * 3600 * 1000).toISOString();
    update(card.id, { ease, due: nextDue } as Partial<Card>);
    setIdx(0);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Layers className="h-6 w-6 text-primary" /> Flashcards</h1>
        {ready && card ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <div className="mb-2 text-xs text-muted-foreground">Card {idx + 1} of {due.length} due</div>
            <div className="text-xl font-semibold text-foreground">{card.front}</div>
            {revealed ? (
              <>
                <hr className="my-6 border-border" />
                <div className="text-lg text-muted-foreground">{card.back}</div>
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => grade("again")} className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-500">Again</button>
                  <button onClick={() => grade("good")} className="rounded bg-blue-500/20 px-4 py-2 text-sm text-blue-500">Good</button>
                  <button onClick={() => grade("easy")} className="rounded bg-green-500/20 px-4 py-2 text-sm text-green-500">Easy</button>
                </div>
              </>
            ) : (
              <button onClick={() => setRevealed(true)} className="mt-8 rounded-lg bg-primary px-6 py-2 text-primary-foreground">Show answer</button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">All caught up — add a card below.</div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); if (!front) return; create({ front, back, ease: 1, due: new Date().toISOString() } as Partial<Card>); setFront(""); setBack(""); }} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium">Add card</div>
          <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Add</button>
        </form>

        <div className="text-xs text-muted-foreground">{items.length} total · {due.length} due</div>
        {items.length > 0 && (
          <button onClick={() => items.forEach((i) => remove(i.id))} className="text-xs text-destructive">Clear all</button>
        )}
      </div>
    </AppLayout>
  );
}

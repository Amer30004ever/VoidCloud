"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "⌘ K", label: "Open command palette" },
  { keys: "?", label: "Show this shortcuts panel" },
  { keys: "G then D", label: "Go to Dashboard" },
  { keys: "G then N", label: "Go to Notes" },
  { keys: "G then I", label: "Go to Incidents" },
  { keys: "G then B", label: "Go to Bookmarks" },
  { keys: "G then S", label: "Go to Snippets" },
  { keys: "G then R", label: "Go to Runbooks" },
  { keys: "/", label: "Focus topbar search" },
  { keys: "ESC", label: "Close any panel" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let gPressed = false;
    let gTimer: NodeJS.Timeout | null = null;
    const jumps: Record<string, string> = {
      d: "/dashboard", n: "/notes", i: "/incidents", b: "/bookmarks",
      s: "/snippets", r: "/runbooks",
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") { e.preventDefault(); setOpen(true); return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key.toLowerCase() === "g") {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => (gPressed = false), 1200);
        return;
      }
      if (gPressed && jumps[e.key.toLowerCase()]) {
        gPressed = false;
        window.location.href = jumps[e.key.toLowerCase()];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-foreground/80">{s.label}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

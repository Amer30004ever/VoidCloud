"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ALL_ROUTES } from "@/lib/routes";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const list = !needle
      ? ALL_ROUTES
      : ALL_ROUTES.filter(
          (r) =>
            r.label.toLowerCase().includes(needle) ||
            r.href.toLowerCase().includes(needle) ||
            r.section.toLowerCase().includes(needle)
        );
    return list.slice(0, 30);
  }, [q]);

  useEffect(() => setIdx(0), [q, open]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[idx]) go(filtered[idx].href);
              }
            }}
            placeholder="Jump to page or run command…"
            className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <ul className="max-h-96 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((r, i) => (
              <li key={r.href}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(r.href)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    i === idx ? "bg-primary/10 text-foreground" : "text-foreground/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{r.section}</span>
                    <span className="text-muted-foreground">›</span>
                    <span className="font-medium">{r.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{r.href}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · ⌘K toggle</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}

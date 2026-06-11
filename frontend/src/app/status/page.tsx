"use client";

import { useEffect, useState } from "react";

interface Check {
  id: string;
  name: string;
  url?: string;
  status?: "Up" | "Down" | "Degraded" | "Unknown";
}

export default function StatusPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("amer.uptime");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setChecks(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const up = checks.filter((c) => c.status === "Up").length;
  const overall = checks.length === 0 ? "Unknown" : up === checks.length ? "All systems operational" : "Some systems degraded";

  const color = (s?: string) => s === "Up" ? "bg-green-500" : s === "Down" ? "bg-red-500" : s === "Degraded" ? "bg-yellow-500" : "bg-gray-400";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground">System Status</h1>
          <p className="mt-2 text-lg text-muted-foreground">{overall}</p>
        </header>
        {checks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No monitored services yet. Add checks at <code>/uptime</code>.
          </div>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  {c.url && <div className="text-xs text-muted-foreground">{c.url}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${color(c.status)}`} />
                  <span className="text-sm font-medium">{c.status ?? "Unknown"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Auto-generated from <code>/uptime</code> data · Last refresh {new Date().toLocaleTimeString()}
        </footer>
      </div>
    </div>
  );
}

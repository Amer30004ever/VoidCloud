"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

interface Event { id: string; ts: string; kind: string; text: string }

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("amer.timeline");
      const existing: Event[] = raw ? JSON.parse(raw) : [];
      if (existing.length === 0) {
        const seed: Event[] = [
          { id: "1", ts: new Date().toISOString(), kind: "deploy", text: "Promoted api-gateway v1.4.2 to production" },
          { id: "2", ts: new Date(Date.now() - 3.6e6).toISOString(), kind: "alert", text: "Resolved HighMemory on node-3" },
          { id: "3", ts: new Date(Date.now() - 7.2e6).toISOString(), kind: "commit", text: "Pushed 4 commits to portal/main" },
        ];
        localStorage.setItem("amer.timeline", JSON.stringify(seed));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEvents(seed);
        // eslint-disable-next-line react-hooks/set-state-in-effect
      } else setEvents(existing);
    } catch { /* noop */ }
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Activity className="h-6 w-6 text-primary" /> Timeline</h1>
        <p className="text-sm text-muted-foreground">Your activity stream — commits, deploys, alerts handled.</p>
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary h-fit">{e.kind}</span>
              <div className="flex-1">
                <div className="text-sm text-foreground">{e.text}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

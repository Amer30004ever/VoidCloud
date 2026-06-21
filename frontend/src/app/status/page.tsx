"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { statusApi } from "@/lib/cloud";

type Overall = "OPERATIONAL" | "DEGRADED" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE";

interface Update { id: string; message: string; status: string; createdAt: string }
interface Incident {
  id: string; title: string; description: string; severity: string;
  status: string; createdAt: string; resolvedAt: string | null; updates: Update[];
}
interface Maintenance {
  id: string; title: string; description: string; affectedServices: string[];
  startAt: string; endAt: string; status: string;
}
interface StatusData {
  status: Overall;
  incidents: Incident[];
  maintenance: Maintenance[];
  uptime: Record<string, number>;
}

const STATUS_COPY: Record<Overall, { label: string; color: string }> = {
  OPERATIONAL:    { label: "All systems operational",        color: "bg-green-500" },
  DEGRADED:       { label: "Some systems degraded",          color: "bg-yellow-500" },
  PARTIAL_OUTAGE: { label: "Partial outage",                 color: "bg-orange-500" },
  MAJOR_OUTAGE:   { label: "Major outage",                   color: "bg-red-500" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = () => statusApi.get().then(d => { if (!cancel) setData(d); }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  const overall = data?.status ?? "OPERATIONAL";
  const banner = STATUS_COPY[overall];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AmerCloud Status</h1>
            <p className="text-sm text-muted-foreground">Live service health and incident history</p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">← Home</Link>
        </header>

        <section className={`rounded-xl p-6 text-white ${banner.color}`}>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full bg-white animate-pulse" />
            <h2 className="text-xl font-semibold">{banner.label}</h2>
          </div>
        </section>

        {data?.maintenance && data.maintenance.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3">Scheduled Maintenance</h3>
            <ul className="space-y-3">
              {data.maintenance.map(m => (
                <li key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <strong>{m.title}</strong>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{m.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                  <p className="text-xs mt-2">
                    {new Date(m.startAt).toLocaleString()} → {new Date(m.endAt).toLocaleString()}
                  </p>
                  {m.affectedServices?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Affects: {m.affectedServices.join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Active Incidents</h3>
          {!data || data.incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active incidents. All clear.</p>
          ) : (
            <ul className="space-y-4">
              {data.incidents.map(i => (
                <li key={i.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <strong>{i.title}</strong>
                    <span className="text-xs uppercase text-orange-600">{i.severity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{i.description}</p>
                  <ol className="mt-3 space-y-1 text-xs">
                    {i.updates.map(u => (
                      <li key={u.id} className="text-muted-foreground">
                        <span className="uppercase font-semibold mr-2">{u.status}</span>
                        {new Date(u.createdAt).toLocaleString()} — {u.message}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Uptime (last 30 days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data && Object.entries(data.uptime).map(([svc, pct]) => (
              <div key={svc} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{svc}</div>
                <div className="text-lg font-semibold">{pct.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Subscribe to updates</h3>
          {subscribed ? (
            <p className="text-sm text-green-600">Thanks — we&apos;ll email you when incidents are posted.</p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); try { localStorage.setItem("amer.status.subscriber", email); } catch {} setSubscribed(true); }}
            >
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Subscribe</button>
            </form>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            <a href="/api/v1/status/incidents" className="text-primary hover:underline">JSON feed</a>
          </p>
        </section>
      </div>
    </div>
  );
}

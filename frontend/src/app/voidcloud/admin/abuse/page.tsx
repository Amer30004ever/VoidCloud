/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, Globe } from "lucide-react";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { ListSkeleton } from "@workspace/ui-kit/skeleton";
import { cloudAbuse, AbuseReport, PtrRequest } from "@/features/vps/cloud";

export default function AdminAbusePage() {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [ptrs, setPtrs] = useState<PtrRequest[]>([]);
  const [tab, setTab] = useState<"reports" | "ptr">("reports");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([cloudAbuse.reports(), cloudAbuse.ptrRequests()]);
      setReports(r); setPtrs(p);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
    } finally {
      setLoading(false);
    }
  };
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function runDetect() {
    setBusy("detect");
    try { await cloudAbuse.detect(); await load(); } catch (e: any) { setError(e?.message); } finally { setBusy(null); }
  }
  async function resolve(id: string, status: string) {
    setBusy(id);
    try { await cloudAbuse.resolve(id, status); await load(); } finally { setBusy(null); }
  }
  async function suspend(id: string) {
    const reason = window.prompt("Reason for network suspension?", "abuse investigation");
    if (!reason) return;
    setBusy("suspend:" + id);
    try { await cloudAbuse.suspendNetwork(id, reason); await load(); } finally { setBusy(null); }
  }
  async function reviewPtr(id: string, status: string) {
    const note = window.prompt(`Admin note for ${status}?`, "");
    setBusy(id);
    try { await cloudAbuse.reviewPtr(id, status, note ?? undefined); await load(); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="vc-h1">Abuse &amp; AUP</h1>
        <div className="flex gap-2">
          <button onClick={runDetect} disabled={busy === "detect"}
            className="vc-btn vc-btn-secondary hover:border-white/20 disabled:opacity-50">
            {busy === "detect" ? "Scanning…" : "Run outbound scan"}
          </button>
          <a href="/aup" className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-cyan-300 hover:underline">View AUP</a>
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex gap-2">
        {(["reports", "ptr"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg border px-4 py-2 text-sm ${tab === t ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
            {t === "reports" ? `Reports (${reports.length})` : `PTR requests (${ptrs.length})`}
          </button>
        ))}
      </div>

      {tab === "reports" && (
        <div className="space-y-3">
          {loading && <ListSkeleton rows={3} />}
          {!loading && reports.length === 0 && (
            <EmptyState
              icon={<ShieldAlert className="size-6" />}
              title="No abuse reports"
              description="Nothing flagged right now. Run detection to scan current traffic for abuse signatures."
            />
          )}
          {reports.map((r) => (
            <div key={r.id} className="vc-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{r.category}</span>
                  <span className="ml-2 text-xs text-white/50">{r.source} · {new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(r.status)}`}>{r.status}</span>
              </div>
              <div className="mt-2 text-sm text-white/70">
                Target: {r.targetIp ?? r.targetDomain ?? r.targetVpsId ?? "—"}
                {r.detectedSignature && <span className="ml-2 text-fuchsia-300">sig: {r.detectedSignature}</span>}
              </div>
              <p className="mt-1 text-sm">{r.reason}</p>
              {r.evidence && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-950/60 p-2 text-xs text-white/60">{r.evidence}</pre>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.targetVpsId && (
                  <button onClick={() => suspend(r.targetVpsId!)} disabled={busy === "suspend:" + r.targetVpsId}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50">
                    Suspend networking
                  </button>
                )}
                <button onClick={() => resolve(r.id, "INVESTIGATING")} disabled={busy === r.id}
                  className="vc-btn vc-btn-sm vc-btn-secondary hover:border-white/20 disabled:opacity-50">Investigating</button>
                <button onClick={() => resolve(r.id, "ACTION_TAKEN")} disabled={busy === r.id}
                  className="vc-btn vc-btn-sm vc-btn-secondary hover:border-white/20 disabled:opacity-50">Action taken</button>
                <button onClick={() => resolve(r.id, "RESOLVED")} disabled={busy === r.id}
                  className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-200 disabled:opacity-50">Resolve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "ptr" && (
        <div className="space-y-3">
          {loading && <ListSkeleton rows={3} />}
          {!loading && ptrs.length === 0 && (
            <EmptyState
              icon={<Globe className="size-6" />}
              title="No PTR requests"
              description="Reverse-DNS requests submitted by tenants will appear here for review."
            />
          )}
          {ptrs.map((p) => (
            <div key={p.id} className="vc-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{p.hostname}</span>
                  <span className="ml-2 text-xs text-white/50">{p.ipAddress ?? "—"} · vps {p.vpsId}</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(p.status)}`}>{p.status}</span>
              </div>
              {p.adminNote && <p className="mt-1 text-xs text-white/60">Note: {p.adminNote}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => reviewPtr(p.id, "FULFILLED")} disabled={busy === p.id}
                  className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-200 disabled:opacity-50">Fulfill</button>
                <button onClick={() => reviewPtr(p.id, "REJECTED")} disabled={busy === p.id}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "RECEIVED": return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "INVESTIGATING": return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "ACTION_TAKEN":
    case "FULFILLED": return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";
    case "RESOLVED": return "border-green-500/30 bg-green-500/10 text-green-300";
    case "DISMISSED":
    case "REJECTED": return "border-gray-500/30 bg-gray-500/10 text-gray-300";
    default: return "border-white/10 bg-white/5 text-white/60";
  }
}

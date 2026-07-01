"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  status: "SUCCESS" | "FAILURE" | "WARNING";
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-300 border-red-500/20",
  LOGIN: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  LOGOUT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  SUSPEND: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  ACTIVATE: "bg-teal-500/10 text-teal-300 border-teal-500/20",
  IMPERSONATE: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  DEPLOY: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  PAYMENT: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  FAILURE: "text-red-400",
  WARNING: "text-amber-400",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ action: "", resource: "", status: "", userId: "" });
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filter.action) params.append("action", filter.action);
      if (filter.resource) params.append("resource", filter.resource);
      if (filter.status) params.append("status", filter.status);
      if (filter.userId) params.append("userId", filter.userId);
      const r = await api.get(`/admin/audit?${params}`);
      const data = r.data?.logs ?? r.data ?? [];
      setLogs(Array.isArray(data) ? data : []);
      setTotal(r.data?.total ?? data.length);
    } catch {
      setLogs([]);
    } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  function getActionKey(action: string) {
    return Object.keys(ACTION_COLORS).find((k) => action.toUpperCase().startsWith(k)) ?? "CREATE";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-white/40">All user actions, admin operations, and system events</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{total.toLocaleString()} total events</span>
          <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10">↻ Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "action", placeholder: "Action (LOGIN, CREATE…)", options: ["", "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE", "IMPERSONATE", "DEPLOY", "PAYMENT"] },
          { key: "resource", placeholder: "Resource (user, tenant…)", options: ["", "user", "tenant", "vps", "billing", "plan", "auth", "system"] },
          { key: "status", placeholder: "Status", options: ["", "SUCCESS", "FAILURE", "WARNING"] },
        ].map(({ key, options }) => (
          <select
            key={key}
            value={filter[key as keyof typeof filter]}
            onChange={(e) => { setFilter({ ...filter, [key]: e.target.value }); setPage(1); }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {options.map((o) => <option key={o} value={o}>{o || `All ${key}s`}</option>)}
          </select>
        ))}
        <button onClick={() => { setFilter({ action: "", resource: "", status: "", userId: "" }); setPage(1); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40 hover:text-white">Clear filters</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/50">No audit events found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Timestamp</th>
                <th className="py-3 text-left">Actor</th>
                <th className="py-3">Action</th>
                <th className="hidden py-3 md:table-cell">Resource</th>
                <th className="hidden py-3 lg:table-cell">IP</th>
                <th className="py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} onClick={() => setSelected(log)} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-3 text-xs text-white/40 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-3">
                    <div className="font-medium text-white">{log.userName ?? "System"}</div>
                    <div className="text-xs text-white/30">{log.userEmail ?? "—"}</div>
                  </td>
                  <td className="py-3">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[getActionKey(log.action)] ?? ACTION_COLORS.CREATE}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="hidden py-3 text-xs text-white/50 md:table-cell">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}</td>
                  <td className="hidden py-3 text-xs font-mono text-white/30 lg:table-cell">{log.ipAddress ?? "—"}</td>
                  <td className={`py-3 text-xs font-medium ${STATUS_COLORS[log.status] ?? "text-white/50"}`}>{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Page {page} · {logs.length} of {total}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-white/5">← Prev</button>
          <button disabled={logs.length < LIMIT} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-white/5">Next →</button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold">Event Details</h2>
            <div className="space-y-2 text-sm">
              <Row label="ID" value={selected.id} mono />
              <Row label="Time" value={new Date(selected.createdAt).toLocaleString()} />
              <Row label="Actor" value={`${selected.userName ?? "System"} (${selected.userEmail ?? "—"})`} />
              <Row label="Action" value={selected.action} />
              <Row label="Resource" value={`${selected.resource}${selected.resourceId ? ` #${selected.resourceId}` : ""}`} />
              <Row label="IP Address" value={selected.ipAddress ?? "—"} mono />
              <Row label="Result" value={selected.status} />
            </div>
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <p className="mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Metadata</p>
                <pre className="overflow-x-auto text-xs text-white/60">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm hover:bg-white/5">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <span className="text-white/50">{label}</span>
      <span className={mono ? "font-mono text-xs text-cyan-300" : "text-white"}>{value}</span>
    </div>
  );
}

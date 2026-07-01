"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Pod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  containers: string[];
  node: string;
}

const STATUS_COLOR: Record<string, string> = {
  Running: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  Completed: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  Pending: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  CrashLoopBackOff: "text-red-400 border-red-500/20 bg-red-500/5",
  Error: "text-red-400 border-red-500/20 bg-red-500/5",
  Terminating: "text-orange-400 border-orange-500/20 bg-orange-500/5",
};

export default function PodsPage() {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNs, setSelectedNs] = useState("voidcloud");
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{ pod: string; op: "restart" | "delete" } | null>(null);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [logsModal, setLogsModal] = useState<{ pod: Pod } | null>(null);
  const [logs, setLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNamespaces = useCallback(async () => {
    try {
      const r = await fetch("/api/k8s?op=namespaces");
      const d = await r.json();
      const list: string[] = (d.data?.namespaces ?? []).map((n: { namespace: string }) => n.namespace);
      if (list.length) setNamespaces(list);
    } catch { /**/ }
  }, []);

  const fetchPods = useCallback(async (ns = selectedNs) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/k8s?op=pods&ns=${ns}`);
      const d = await r.json();
      setPods(d.data?.pods ?? []);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [selectedNs]);

  useEffect(() => { fetchNamespaces(); fetchPods(); }, [fetchNamespaces, fetchPods]);

  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(() => fetchPods(), 15_000);
    } else {
      if (refreshRef.current) clearInterval(refreshRef.current);
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [autoRefresh, fetchPods]);

  async function doAction(pod: string, op: "restart" | "delete") {
    setActionMsg((m) => ({ ...m, [pod]: "…" }));
    try {
      const r = await fetch("/api/k8s", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ns: selectedNs, pod }) });
      const d = await r.json();
      setActionMsg((m) => ({ ...m, [pod]: d.ok ? (op === "restart" ? "Restarted ✓" : "Deleted ✓") : `Error: ${d.error ?? "unknown"}` }));
      setTimeout(() => { setActionMsg((m) => { const n = { ...m }; delete n[pod]; return n; }); fetchPods(); }, 2500);
    } catch {
      setActionMsg((m) => ({ ...m, [pod]: "Network error" }));
    }
    setAction(null);
  }

  async function fetchLogs(pod: Pod) {
    setLogsModal({ pod });
    setLogsLoading(true);
    setLogs("");
    try {
      const r = await fetch(`/api/k8s?op=logs&ns=${pod.namespace}&pod=${pod.name}&container=${pod.containers[0] ?? ""}&lines=200`);
      const d = await r.json();
      setLogs(typeof d.data === "string" ? d.data : JSON.stringify(d.data, null, 2));
    } catch { setLogs("Failed to fetch logs"); }
    finally { setLogsLoading(false); }
    setTimeout(() => logsRef.current?.scrollIntoView(), 100);
  }

  const filtered = pods.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.status.toLowerCase().includes(search.toLowerCase())
  );

  const runningCount = pods.filter((p) => p.status === "Running").length;
  const badCount = pods.filter((p) => ["CrashLoopBackOff", "Error", "Terminating"].includes(p.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">K8s Pod Manager</h1>
          <p className="mt-1 text-sm text-white/40">List · restart · delete pods · view live logs</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh (15s)
          </label>
          <button onClick={() => fetchPods()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40">
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
          <span className="text-2xl font-bold text-emerald-400">{runningCount}</span>
          <span className="ml-2 text-sm text-white/40">Running</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
          <span className="text-2xl font-bold text-red-400">{badCount}</span>
          <span className="ml-2 text-sm text-white/40">Unhealthy</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
          <span className="text-2xl font-bold text-white">{pods.length}</span>
          <span className="ml-2 text-sm text-white/40">Total pods</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={selectedNs} onChange={(e) => { setSelectedNs(e.target.value); fetchPods(e.target.value); }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          {(namespaces.length ? namespaces : ["voidcloud", "monitoring", "kube-system", "ingress"]).map((ns) => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter pods…"
          className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/40" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02]">
            <tr className="text-[11px] uppercase tracking-wider text-white/30">
              <th className="px-4 py-3 text-left">Pod</th>
              <th className="py-3 text-center">Status</th>
              <th className="py-3 text-center">Ready</th>
              <th className="py-3 text-center hidden md:table-cell">Restarts</th>
              <th className="py-3 text-center hidden lg:table-cell">Age</th>
              <th className="py-3 text-center hidden xl:table-cell">Node</th>
              <th className="py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-white/30">{loading ? "Loading pods…" : "No pods found"}</td></tr>
            )}
            {filtered.map((pod) => {
              const sc = STATUS_COLOR[pod.status] ?? "text-white/60 border-white/10 bg-white/5";
              const msg = actionMsg[pod.name];
              return (
                <tr key={pod.name} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-white font-medium truncate max-w-[220px]" title={pod.name}>{pod.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{pod.containers.join(", ")}</p>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${sc}`}>{pod.status}</span>
                  </td>
                  <td className="py-3 text-center text-xs text-white/60">{pod.ready}</td>
                  <td className="hidden py-3 text-center md:table-cell">
                    <span className={`text-xs font-medium ${pod.restarts > 3 ? "text-red-400" : pod.restarts > 0 ? "text-amber-400" : "text-white/40"}`}>{pod.restarts}</span>
                  </td>
                  <td className="hidden py-3 text-center text-xs text-white/40 lg:table-cell">{pod.age}</td>
                  <td className="hidden py-3 text-center text-xs text-white/40 xl:table-cell font-mono">{pod.node}</td>
                  <td className="py-3 text-center">
                    {msg ? (
                      <span className="text-xs text-amber-300">{msg}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => fetchLogs(pod)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:text-cyan-300">Logs</button>
                        <button onClick={() => setAction({ pod: pod.name, op: "restart" })} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20">Restart</button>
                        <button onClick={() => setAction({ pod: pod.name, op: "delete" })} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <p className="text-lg font-semibold text-white mb-2 capitalize">{action.op} Pod?</p>
            <p className="text-sm text-white/50 mb-1 font-mono break-all">{action.pod}</p>
            <p className="text-xs text-white/30 mb-5">
              {action.op === "restart" ? "The pod will be terminated and recreated by its deployment." : "The pod will be permanently deleted. If managed by a deployment, it will be rescheduled."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => doAction(action.pod, action.op)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${action.op === "delete" ? "bg-red-500/20 border border-red-500/30 text-red-300" : "bg-amber-500/20 border border-amber-500/30 text-amber-300"}`}>
                {action.op === "restart" ? "↻ Restart" : "🗑 Delete"}
              </button>
              <button onClick={() => setAction(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white/60">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs modal */}
      {logsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden" style={{ maxHeight: "85vh" }}>
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <div>
                <p className="font-mono text-sm font-semibold text-white">{logsModal.pod.name}</p>
                <p className="text-[10px] text-white/30">Last 200 lines · {logsModal.pod.containers[0]}</p>
              </div>
              <button onClick={() => { setLogsModal(null); setLogs(""); }} className="text-white/30 hover:text-white">✕</button>
            </div>
            <div className="h-[60vh] overflow-y-auto bg-slate-950/80 p-4 font-mono text-xs leading-5">
              {logsLoading ? <p className="animate-pulse text-white/30">Fetching logs…</p>
                : logs ? logs.split("\n").map((line, i) => (
                  <div key={i} className={line.toLowerCase().includes("error") ? "text-red-300" : line.toLowerCase().includes("warn") ? "text-amber-300" : "text-white/60"}>{line}</div>
                )) : <p className="text-white/30">No logs returned.</p>
              }
              <div ref={logsRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

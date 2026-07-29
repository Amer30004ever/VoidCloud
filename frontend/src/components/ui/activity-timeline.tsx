"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, Terminal, User, Globe, Shield, AlertTriangle, Clock } from "lucide-react";
import type { AuditLogEntry } from "@/features/admin/audit";

const PAGE_SIZE = 20;

function actionIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("impersonat")) return <Shield className="h-4 w-4 text-fuchsia-300" />;
  if (a.includes("pod") || a.includes("restart") || a.includes("delete") || a.includes("k8s")) return <Terminal className="h-4 w-4 text-amber-300" />;
  if (a.includes("login") || a.includes("auth")) return <User className="h-4 w-4 text-cyan-300" />;
  if (a.includes("abuse") || a.includes("suspend") || a.includes("block")) return <AlertTriangle className="h-4 w-4 text-red-300" />;
  if (a.includes("broadcast") || a.includes("notif")) return <Globe className="h-4 w-4 text-emerald-300" />;
  return <Activity className="h-4 w-4 text-white/60" />;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function prettyAction(action: string): string {
  return action
    .replace(/([A-Z])/g, " $1")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function statusBadge(status?: string) {
  const s = (status || "SUCCESS").toUpperCase();
  const color = s === "SUCCESS" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
    : s === "FAILED" ? "text-red-300 border-red-500/30 bg-red-500/10"
    : "text-amber-300 border-amber-500/30 bg-amber-500/10";
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${color}`}>{s}</span>;
}

export default function ActivityTimeline({
  logs,
  loading,
  error,
  emptyMessage = "No activity yet.",
}: {
  logs: AuditLogEntry[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [logs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visible = useMemo(() => logs.slice(0, visibleCount), [logs, visibleCount]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/5" />
    ))}</div>;
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (!logs.length) {
    return <p className="text-sm text-white/50">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-sm"
        >
          <div className="mt-0.5 rounded-full bg-white/5 p-2">
            {actionIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-white/90">{prettyAction(log.action)}</span>
              {statusBadge(log.status)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
              {log.userEmail && <span>By {log.userEmail}</span>}
              {log.userId && !log.userEmail && <span>User {log.userId.slice(0, 8)}</span>}
              {log.resource && <span>on {log.resource}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(log.createdAt)}</span>
              {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
            </div>
            {log.details && typeof log.details === "object" && Object.keys(log.details).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-cyan-300/80 hover:text-cyan-200">Details</summary>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-2 text-xs text-white/70">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}

      {visibleCount < logs.length && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Load more ({logs.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

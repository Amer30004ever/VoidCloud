"use client";

/**
 * Live provisioning timeline for a managed database.
 *
 * Streams the append-only `ManagedDatabaseEvent` rows written by
 * ManagedDatabaseProvisionerService (GET /managed/databases/:id/events) so a
 * tenant can watch PROVISIONING -> RUNNING/FAILED with the exact per-step
 * detail (vmid, node) and, on failure, the errorMessage persisted on the row.
 *
 * Polling rather than SSE: the backend is a plain REST controller, and a 3s
 * poll is well inside the provisioning window (create + boot is tens of
 * seconds). Polling stops as soon as the instance reaches a terminal state so
 * an idle dashboard makes no ongoing requests.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";
import {
  managedApi,
  type ManagedDatabaseTimeline,
} from "@/features/vps/managed";

const TERMINAL = new Set(["RUNNING", "FAILED", "STOPPED", "DELETED"]);
const POLL_MS = 3000;

export function ProvisioningTimeline({
  databaseId,
  currentStatus,
}: {
  databaseId: string;
  currentStatus: string;
}) {
  const [data, setData] = useState<ManagedDatabaseTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await managedApi.databases.events(databaseId);
      setData(next);
      setError(null);
      return next.status;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? "Could not load timeline");
      return "UNKNOWN";
    }
  }, [databaseId]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const status = await load();
      if (cancelled) return;
      // Keep polling only while the instance is still moving.
      if (!TERMINAL.has(status)) {
        timer.current = setTimeout(tick, POLL_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const events = data?.events ?? [];
  const status = data?.status ?? currentStatus;
  const inFlight = !TERMINAL.has(status);

  if (error) {
    return <p className="mt-3 text-xs text-red-300">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {inFlight ? "Waiting for the first provisioning step…" : "No provisioning history recorded."}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Provisioning timeline
        </h4>
        {(data?.provisionAttempts ?? 0) > 1 && (
          <span className="text-[11px] text-white/40">
            attempt {data?.provisionAttempts}
          </span>
        )}
      </div>

      <ol className="space-y-2">
        {events.map((ev) => {
          const detail = (ev.detail ?? {}) as Record<string, unknown>;
          const vmid = detail.vmid == null ? "" : String(detail.vmid);
          const node = detail.node == null ? "" : String(detail.node);
          return (
            <li key={ev.id} className="flex items-start gap-2 text-xs">
              <StepIcon status={ev.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-white/85">{ev.step}</span>
                  <time className="text-[11px] text-white/35" dateTime={ev.createdAt}>
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </time>
                </div>
                {(vmid || node) && (
                  <div className="font-mono text-[11px] text-white/40">
                    {vmid ? `vmid=${vmid}` : ""} {node ? `node=${node}` : ""}
                  </div>
                )}
                {ev.message && (
                  <p className="mt-0.5 break-words text-[11px] text-red-300">{ev.message}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {status === "FAILED" && data?.errorMessage && (
        <p className="mt-3 break-words rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-200">
          {data.errorMessage}
        </p>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "FAILED") {
    return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden="true" />;
  }
  if (status === "RUNNING") {
    return <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />;
  }
  return <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400" aria-hidden="true" />;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Play, Square, Trash2, HardDriveDownload, KeyRound } from "lucide-react";
import {
  managedApi,
  type ManagedDatabase,
  type ManagedDbPlan,
  type ManagedEngine,
} from "@/features/vps/managed";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

const ENGINES: ManagedEngine[] = ["POSTGRES", "MYSQL", "REDIS", "MONGODB"];

export default function ManagedDatabasesPage() {
  const [rows, setRows] = useState<ManagedDatabase[]>([]);
  const [plans, setPlans] = useState<ManagedDbPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ id: string; uri: string } | null>(null);

  const [name, setName] = useState("");
  const [engine, setEngine] = useState<ManagedEngine>("POSTGRES");
  const [planCode, setPlanCode] = useState("db-s1");
  const [backups, setBackups] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, planList] = await Promise.all([
        managedApi.databases.list(),
        managedApi.databases.plans(),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setPlans(Array.isArray(planList) ? planList : []);
      if (planList?.[0] && !planList.some((p) => p.code === planCode)) setPlanCode(planList[0].code);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message ?? "Failed to load databases");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy("new");
    try {
      await managedApi.databases.create({ name, engine, planCode, backupsEnabled: backups });
      setName("");
      await load();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? ex.message ?? "Create failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="vc-page space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h1 className="vc-h1">Managed Databases</h1>
          <p className="vc-muted">Provision Postgres, MySQL, Redis or MongoDB with automated backups.</p>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}

      <WidgetBoundary title="New database">
        <form onSubmit={create} className="vc-card grid gap-3 p-5 md:grid-cols-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-database"
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as ManagedEngine)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {ENGINES.map((e) => (
              <option key={e} value={e} className="bg-slate-900">
                {e}
              </option>
            ))}
          </select>
          <select
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {plans.map((p) => (
              <option key={p.code} value={p.code} className="bg-slate-900">
                {p.label} · {p.cpuCores}vCPU / {p.memoryMb}MB / {p.storageGb}GB · ${p.monthlyUsd}/mo
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={backups} onChange={(e) => setBackups(e.target.checked)} />
            Daily backups
          </label>
          <button
            type="submit"
            disabled={busy === "new"}
            className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {busy === "new" ? "Creating…" : "Create"}
          </button>
        </form>
      </WidgetBoundary>

      <section className="vc-card p-5">
        {loading ? (
          <p className="vc-muted py-8 text-center">Loading databases…</p>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <Database className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-3 text-white/70">No managed databases yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((d) => {
              const plan = plans.find((p) => p.code === d.planCode);
              return (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-xs text-white/50">
                        {d.engine} {d.version} · {plan?.label ?? d.planCode}
                      </div>
                      {d.host && (
                        <div className="mt-1 font-mono text-xs text-cyan-300">
                          {d.host}:{d.port}
                        </div>
                      )}
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                      {d.status}
                    </span>
                  </div>
                  {d.errorMessage && (
                    <p className="mt-2 text-xs text-red-300">{d.errorMessage}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Action
                      disabled={busy === d.id}
                      onClick={() => run(d.id, () => managedApi.databases.start(d.id))}
                      icon={<Play className="h-3.5 w-3.5" />}
                      label="Start"
                    />
                    <Action
                      disabled={busy === d.id}
                      onClick={() => run(d.id, () => managedApi.databases.stop(d.id))}
                      icon={<Square className="h-3.5 w-3.5" />}
                      label="Stop"
                    />
                    <Action
                      disabled={busy === d.id}
                      onClick={() => run(d.id, () => managedApi.databases.backup(d.id))}
                      icon={<HardDriveDownload className="h-3.5 w-3.5" />}
                      label="Backup"
                    />
                    <Action
                      disabled={busy === d.id}
                      onClick={async () => {
                        setBusy(d.id);
                        try {
                          const c = await managedApi.databases.connection(d.id);
                          setCreds({ id: d.id, uri: c.uri });
                        } catch (e: any) {
                          setErr(e?.response?.data?.message ?? "Could not reveal credentials");
                        } finally {
                          setBusy(null);
                        }
                      }}
                      icon={<KeyRound className="h-3.5 w-3.5" />}
                      label="Connection"
                    />
                    <Action
                      danger
                      disabled={busy === d.id}
                      onClick={() => run(d.id, () => managedApi.databases.destroy(d.id))}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      label="Destroy"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={d.planCode}
                      onChange={(e) => run(d.id, () => managedApi.databases.resize(d.id, e.target.value))}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                    >
                      {plans.map((p) => (
                        <option key={p.code} value={p.code} className="bg-slate-900">
                          Resize → {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {creds?.id === d.id && (
                    <p className="mt-3 break-all rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 font-mono text-[11px] text-amber-200">
                      {creds.uri}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Action({
  onClick,
  icon,
  label,
  danger,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 transition disabled:opacity-40 ${
        danger
          ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

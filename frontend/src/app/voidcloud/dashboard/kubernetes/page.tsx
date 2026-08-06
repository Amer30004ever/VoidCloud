/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Server, Download, Trash2, Plus } from "lucide-react";
import { managedApi, type ManagedK8sCluster } from "@/features/vps/managed";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

export default function ManagedKubernetesPage() {
  const [clusters, setClusters] = useState<ManagedK8sCluster[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [kubeconfig, setKubeconfig] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.31");
  const [nodeCount, setNodeCount] = useState(2);

  const load = useCallback(async () => {
    try {
      const [list, vers] = await Promise.all([
        managedApi.kubernetes.list(),
        managedApi.kubernetes.versions(),
      ]);
      setClusters(Array.isArray(list) ? list : []);
      setVersions(Array.isArray(vers) ? vers : []);
      if (vers?.length && !vers.includes(version)) setVersion(vers[vers.length - 1]);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message ?? "Failed to load clusters");
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
    setBusy("new");
    setErr(null);
    try {
      await managedApi.kubernetes.create({ name, k8sVersion: version, nodePool: { nodeCount } });
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
        <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-300">
          <Server className="h-6 w-6" />
        </div>
        <div>
          <h1 className="vc-h1">Managed Kubernetes</h1>
          <p className="vc-muted">Create clusters, scale node pools and download kubeconfig.</p>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}
      {kubeconfig && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-cyan-100">
            {kubeconfig}
          </pre>
          <button onClick={() => setKubeconfig(null)} className="mt-2 text-xs text-cyan-200 underline">
            Dismiss
          </button>
        </div>
      )}

      <WidgetBoundary title="New cluster">
        <form onSubmit={create} className="vc-card grid gap-3 p-5 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-cluster"
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {versions.map((v) => (
              <option key={v} value={v} className="bg-slate-900">
                Kubernetes {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={50}
            value={nodeCount}
            onChange={(e) => setNodeCount(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={busy === "new"}
            className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-50"
          >
            {busy === "new" ? "Creating…" : "Create cluster"}
          </button>
        </form>
      </WidgetBoundary>

      <section className="vc-card p-5">
        {loading ? (
          <p className="vc-muted py-8 text-center">Loading clusters…</p>
        ) : clusters.length === 0 ? (
          <div className="py-12 text-center">
            <Server className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-3 text-white/70">No Kubernetes clusters yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clusters.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-xs text-white/50">
                      v{c.k8sVersion} · {c.region}
                    </div>
                    {c.endpoint && (
                      <div className="mt-1 font-mono text-[11px] text-cyan-300">{c.endpoint}</div>
                    )}
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {(c.nodePools ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                    >
                      <span>
                        {p.name} · {p.nodeCount} nodes · {p.cpuCores} vCPU / {p.memoryMb} MB / {p.storageGb} GB
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          disabled={busy === c.id}
                          onClick={() =>
                            run(c.id, () =>
                              managedApi.kubernetes.scalePool(c.id, p.id, Math.max(1, p.nodeCount - 1)),
                            )
                          }
                          className="rounded border border-white/10 px-2 py-0.5 hover:bg-white/10 disabled:opacity-40"
                        >
                          −
                        </button>
                        <button
                          disabled={busy === c.id}
                          onClick={() =>
                            run(c.id, () => managedApi.kubernetes.scalePool(c.id, p.id, p.nodeCount + 1))
                          }
                          className="rounded border border-white/10 px-2 py-0.5 hover:bg-white/10 disabled:opacity-40"
                        >
                          +
                        </button>
                        <button
                          disabled={busy === c.id}
                          onClick={() => run(c.id, () => managedApi.kubernetes.deletePool(c.id, p.id))}
                          className="text-red-300 hover:underline disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    disabled={busy === c.id}
                    onClick={() =>
                      run(c.id, () =>
                        managedApi.kubernetes.addPool(c.id, {
                          name: `pool-${(c.nodePools?.length ?? 0) + 1}`,
                          nodeCount: 2,
                        }),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add node pool
                  </button>
                  <button
                    disabled={busy === c.id}
                    onClick={async () => {
                      setBusy(c.id);
                      try {
                        const res = await managedApi.kubernetes.kubeconfig(c.id);
                        setKubeconfig(res.kubeconfig);
                      } catch (e: any) {
                        setErr(e?.response?.data?.message ?? "Kubeconfig not ready");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Kubeconfig
                  </button>
                  <button
                    disabled={busy === c.id}
                    onClick={() => run(c.id, () => managedApi.kubernetes.destroy(c.id))}
                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Destroy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

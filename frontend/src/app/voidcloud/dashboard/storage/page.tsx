/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, KeyRound, Link2, Trash2 } from "lucide-react";
import {
  managedApi,
  formatBytes,
  type ObjectStorageBucket,
} from "@/features/vps/managed";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

export default function ObjectStoragePage() {
  const [buckets, setBuckets] = useState<ObjectStorageBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ accessKey: string; secretKey: string } | null>(null);
  const [presigned, setPresigned] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [quotaGb, setQuotaGb] = useState(50);
  const [publicRead, setPublicRead] = useState(false);
  const [versioning, setVersioning] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await managedApi.storage.list();
      setBuckets(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message ?? "Failed to load buckets");
    } finally {
      setLoading(false);
    }
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
      await managedApi.storage.create({ name, quotaGb, publicRead, versioning });
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
        <div className="rounded-lg bg-fuchsia-500/10 p-2 text-fuchsia-300">
          <Boxes className="h-6 w-6" />
        </div>
        <div>
          <h1 className="vc-h1">Object Storage</h1>
          <p className="vc-muted">S3-compatible buckets, scoped access keys and presigned links.</p>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}
      {secret && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Save this secret — it is shown only once.</div>
          <div className="mt-2 font-mono text-xs break-all">Access key: {secret.accessKey}</div>
          <div className="font-mono text-xs break-all">Secret key: {secret.secretKey}</div>
          <button onClick={() => setSecret(null)} className="mt-2 text-xs underline">
            Dismiss
          </button>
        </div>
      )}
      {presigned && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-xs text-cyan-100 break-all">
          {presigned}
          <button onClick={() => setPresigned(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <WidgetBoundary title="New bucket">
        <form onSubmit={create} className="vc-card grid gap-3 p-5 md:grid-cols-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-bucket"
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <input
            type="number"
            min={1}
            value={quotaGb}
            onChange={(e) => setQuotaGb(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={publicRead} onChange={(e) => setPublicRead(e.target.checked)} />
            Public read
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={versioning} onChange={(e) => setVersioning(e.target.checked)} />
            Versioning
          </label>
          <button
            type="submit"
            disabled={busy === "new"}
            className="rounded-lg bg-fuchsia-500/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/30 disabled:opacity-50"
          >
            {busy === "new" ? "Creating…" : "Create bucket"}
          </button>
        </form>
      </WidgetBoundary>

      <section className="vc-card p-5">
        {loading ? (
          <p className="vc-muted py-8 text-center">Loading buckets…</p>
        ) : buckets.length === 0 ? (
          <div className="py-12 text-center">
            <Boxes className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-3 text-white/70">No buckets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buckets.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{b.name}</div>
                    <div className="text-xs text-white/50">
                      {b.region} · {b.publicRead ? "public" : "private"}
                      {b.versioning ? " · versioned" : ""}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-cyan-300">{b.endpoint}</div>
                  </div>
                  <div className="text-right text-xs text-white/60">
                    {formatBytes(b.usedBytes)} of {b.quotaGb} GB
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                    style={{ width: `${Math.min(100, b.usedPercent ?? 0)}%` }}
                  />
                </div>

                {b.keys && b.keys.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-white/60">
                    {b.keys.map((k) => (
                      <li key={k.id} className="flex items-center justify-between gap-2">
                        <span className="font-mono">
                          {k.accessKey} · {k.label}
                          {k.readOnly ? " (read-only)" : ""}
                        </span>
                        <button
                          onClick={() => run(b.id, () => managedApi.storage.revokeKey(k.id))}
                          className="text-red-300 hover:underline"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    disabled={busy === b.id}
                    onClick={async () => {
                      setBusy(b.id);
                      try {
                        const k = await managedApi.storage.createKey(b.id, { label: "dashboard" });
                        setSecret({ accessKey: k.accessKey, secretKey: k.secretKey });
                        await load();
                      } catch (e: any) {
                        setErr(e?.response?.data?.message ?? "Key creation failed");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> New access key
                  </button>
                  <button
                    disabled={busy === b.id}
                    onClick={async () => {
                      const objectKey = window.prompt("Object key to presign:");
                      if (!objectKey) return;
                      setBusy(b.id);
                      try {
                        const res = await managedApi.storage.presign(b.id, objectKey);
                        setPresigned(res.url);
                      } catch (e: any) {
                        setErr(e?.response?.data?.message ?? "Presign failed");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Presign URL
                  </button>
                  <button
                    disabled={busy === b.id}
                    onClick={() =>
                      run(b.id, () => managedApi.storage.update(b.id, { publicRead: !b.publicRead }))
                    }
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    Make {b.publicRead ? "private" : "public"}
                  </button>
                  <button
                    disabled={busy === b.id}
                    onClick={() => run(b.id, () => managedApi.storage.remove(b.id))}
                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
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

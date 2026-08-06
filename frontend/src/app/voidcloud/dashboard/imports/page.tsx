/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, XCircle } from "lucide-react";
import { managedApi, type VmImportJob } from "@/features/vps/managed";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

export default function VmImportsPage() {
  const [jobs, setJobs] = useState<VmImportJob[]>([]);
  const [formats, setFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState("qcow2");

  const load = useCallback(async () => {
    try {
      const [list, fmts] = await Promise.all([
        managedApi.vmImports.list(),
        managedApi.vmImports.formats(),
      ]);
      setJobs(Array.isArray(list) ? list : []);
      setFormats(Array.isArray(fmts) ? fmts : []);
      if (fmts?.length && !fmts.includes(format)) setFormat(fmts[0]);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message ?? "Failed to load import jobs");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      managedApi.vmImports
        .list()
        .then((l) => setJobs(Array.isArray(l) ? l : []))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("new");
    setErr(null);
    try {
      await managedApi.vmImports.create({ name, sourceUrl, sourceFormat: format });
      setName("");
      setSourceUrl("");
      await load();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? ex.message ?? "Import failed to queue");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="vc-page space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h1 className="vc-h1">VM Imports</h1>
          <p className="vc-muted">Bring your own disk image and convert it into a Void Cloud VPS.</p>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}

      <WidgetBoundary title="New import">
        <form onSubmit={create} className="vc-card grid gap-3 p-5 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="imported-vm"
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://example.com/disk.qcow2"
            required
            type="url"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 md:col-span-2"
          />
          <div className="flex gap-2">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {formats.map((f) => (
                <option key={f} value={f} className="bg-slate-900">
                  {f}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy === "new"}
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {busy === "new" ? "Queuing…" : "Import"}
            </button>
          </div>
        </form>
      </WidgetBoundary>

      <section className="vc-card p-5">
        {loading ? (
          <p className="vc-muted py-8 text-center">Loading import jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <Upload className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-3 text-white/70">No import jobs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white">{j.name}</div>
                    <div className="truncate text-xs text-white/50">{j.sourceUrl}</div>
                    <div className="text-xs text-white/40">
                      {j.sourceFormat} · {j.stage ?? "queued"}
                    </div>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                    {j.status}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all"
                    style={{ width: `${Math.min(100, j.progress ?? 0)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-white/40">{Math.round(j.progress ?? 0)}%</div>
                {j.errorMessage && <p className="mt-2 text-xs text-red-300">{j.errorMessage}</p>}
                {["PENDING", "DOWNLOADING", "CONVERTING", "IMPORTING"].includes(j.status) && (
                  <button
                    disabled={busy === j.id}
                    onClick={async () => {
                      setBusy(j.id);
                      try {
                        await managedApi.vmImports.cancel(j.id);
                        await load();
                      } catch (e: any) {
                        setErr(e?.response?.data?.message ?? "Cancel failed");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

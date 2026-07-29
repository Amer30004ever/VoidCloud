/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { cloudApi, type CloudDeployment } from "@/features/vps/cloud";
import DomainManager from "@/features/vps/DomainManager";
import { Globe } from "lucide-react";

export default function DashboardDomainsPage() {
  const [vpsList, setVpsList] = useState<CloudDeployment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cloudApi.deployments
      .list()
      .then((list) => {
        if (cancelled) return;
        setVpsList(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch((e: any) => setErr(e?.response?.data?.message ?? e.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
          <Globe className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Domains</h1>
          <p className="text-sm text-white/60">
            Attach domains and manage DNS records for your VPS instances.
          </p>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-white/60">Loading VPS instances…</div>
      ) : vpsList.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <Globe className="mx-auto h-10 w-10 text-white/30" />
          <p className="mt-3 text-white/70">No VPS instances yet.</p>
          <p className="text-sm text-white/40">Provision a VPS first, then attach a domain.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {vpsList.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  selectedId === v.id
                    ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>

          {selectedId && (
            <section className="rounded-lg border border-white/10 bg-white/5 p-4">
              <DomainManager vpsId={selectedId} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

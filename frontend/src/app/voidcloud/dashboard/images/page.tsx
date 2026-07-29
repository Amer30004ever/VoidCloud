"use client";

import { useEffect, useState } from "react";
import { cloudImages, type CustomImage } from "@/features/vps/cloud";

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
      {message}
    </div>
  );
}

export default function ImagesPage() {
  const [mine, setMine] = useState<CustomImage[]>([]);
  const [shared, setShared] = useState<CustomImage[]>([]);
  const [market, setMarket] = useState<CustomImage[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [snapVpsId, setSnapVpsId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, mk] = await Promise.all([cloudImages.list(), cloudImages.marketplace()]);
        if (!cancelled) {
          setMine(m);
          setMarket(mk);
          setShared(m.filter((i) => i._shared));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveSnapshot() {
    if (!snapVpsId) return;
    setToast("Snapshot saved as custom image (mock).");
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Images</h1>
          <p className="text-sm text-white/60">Snapshots, custom images, and public marketplace.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <h2 className="font-semibold mb-3">Save as Custom Image</h2>
        <div className="flex flex-wrap gap-2">
          <select value={snapVpsId} onChange={(e) => setSnapVpsId(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select VPS…</option>
          </select>
          <button
            onClick={saveSnapshot}
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Save as Custom Image
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <h2 className="font-semibold mb-3">My Images</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-white/50">No custom images yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mine.map((img) => (
              <div key={img.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                <div className="font-medium">{img.name}</div>
                <div className="text-xs text-white/50 mt-1">{img.description ?? "—"}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                  <span>{(img.sizeMB / 1024).toFixed(1)} GB</span>
                  <span>•</span>
                  <span>{img.sourceVps?.name ?? "—"}</span>
                  <span>•</span>
                  <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shared.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <h2 className="font-semibold mb-3">Shared With Me</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shared.map((img) => (
              <div key={img.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                <div className="font-medium">{img.name}</div>
                <div className="text-xs text-white/50 mt-1">{img.description ?? "—"}</div>
                <span className="text-xs text-cyan-300">shared</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <h2 className="font-semibold mb-3">Marketplace</h2>
        {market.length === 0 ? (
          <p className="text-sm text-white/50">No public images yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {market.map((img) => (
              <div key={img.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                <div className="font-medium">{img.name}</div>
                <div className="text-xs text-white/50 mt-1">{img.description ?? "—"}</div>
                <div className="mt-2 text-xs text-white/60">{(img.sizeMB / 1024).toFixed(1)} GB</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

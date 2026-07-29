"use client";

import { useEffect, useState, useCallback } from "react";
import { cloudImages, type CustomImage, cloudApi, type CloudDeployment } from "@/features/vps/cloud";

type Tab = "mine" | "marketplace";

export default function ImageManager() {
  const [tab, setTab] = useState<Tab>("mine");
  const [mine, setMine] = useState<CustomImage[]>([]);
  const [market, setMarket] = useState<CustomImage[]>([]);
  const [vpsList, setVpsList] = useState<CloudDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // snapshot form
  const [snapVpsId, setSnapVpsId] = useState("");
  const [snapName, setSnapName] = useState("");

  // deploy form
  const [deployImageId, setDeployImageId] = useState<string | null>(null);
  const [deployName, setDeployName] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [m, mk, v] = await Promise.all([
        cloudImages.list(),
        cloudImages.marketplace(),
        cloudApi.deployments.list().catch(() => []),
      ]);
      setMine(m);
      setMarket(mk);
      setVpsList(v as CloudDeployment[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function createSnapshot() {
    if (!snapVpsId || !snapName.trim()) return;
    try {
      await cloudImages.snapshot(snapVpsId, snapName.trim());
      setSnapName("");
      setSnapVpsId("");
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Snapshot failed");
    }
  }

  async function deployImage() {
    if (!deployImageId || !deployName.trim()) return;
    try {
      const fromMarket = market.some((i) => i.id === deployImageId);
      if (fromMarket) {
        await cloudImages.deployMarketplace(deployImageId, deployName.trim());
      } else {
        await cloudImages.deploy(deployImageId, deployName.trim());
      }
      setDeployImageId(null);
      setDeployName("");
      alert("VPS deployment started from image");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Deploy failed");
    }
  }

  async function togglePublic(img: CustomImage) {
    try {
      await cloudImages.publish(img.id, !img.isPublic);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    }
  }

  async function shareImage(img: CustomImage) {
    const email = prompt("Email of user to share with:");
    if (!email) return;
    try {
      await cloudImages.share(img.id, email);
      alert("Shared");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Share failed");
    }
  }

  async function removeImage(img: CustomImage) {
    if (!confirm(`Delete image "${img.name}"?`)) return;
    try {
      await cloudImages.remove(img.id);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const list = tab === "mine" ? mine : market;

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="flex gap-2 border-b border-white/10">
        {(["mine", "marketplace"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t
                ? "border-cyan-400 text-white"
                : "border-transparent text-white/50 hover:text-white"
              }`}
          >
            {t === "mine" ? "My Images" : "Marketplace"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold">Create Snapshot</h3>
          <div className="space-y-2">
            <select
              value={snapVpsId}
              onChange={(e) => setSnapVpsId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Select VPS...</option>
              {vpsList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input
              value={snapName}
              onChange={(e) => setSnapName(e.target.value)}
              placeholder="Snapshot name"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              onClick={createSnapshot}
              disabled={!snapVpsId || !snapName.trim()}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Create Snapshot
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold">Deploy from Image</h3>
          <div className="space-y-2">
            <select
              value={deployImageId ?? ""}
              onChange={(e) => setDeployImageId(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Select image...</option>
              <optgroup label="My Images">
                {mine.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Marketplace">
                {market.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <input
              value={deployName}
              onChange={(e) => setDeployName(e.target.value)}
              placeholder="New VPS name"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              onClick={deployImage}
              disabled={!deployImageId || !deployName.trim()}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Deploy
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs text-white/60">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Source</th>
              <th className="p-3">Size</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">
                  No images found.
                </td>
              </tr>
            )}
            {list.map((img) => (
              <tr key={img.id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="font-medium">{img.name}</div>
                  {img._shared && (
                    <span className="text-xs text-cyan-300">shared with you</span>
                  )}
                  {img.description && (
                    <div className="text-xs text-white/50">{img.description}</div>
                  )}
                </td>
                <td className="p-3">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs">
                    {img.type}
                  </span>
                </td>
                <td className="p-3 text-white/70">
                  {img.sourceVps?.name ?? "—"}
                </td>
                <td className="p-3 text-white/70">
                  {(img.sizeMB / 1024).toFixed(1)} GB
                </td>
                <td className="p-3 text-white/50">
                  {new Date(img.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  {tab === "mine" && !img._shared && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setDeployImageId(img.id);
                          setDeployName(`${img.name}-vps`);
                        }}
                        className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >
                        Deploy
                      </button>
                      <button
                        onClick={() => shareImage(img)}
                        className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => togglePublic(img)}
                        className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >
                        {img.isPublic ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => removeImage(img)}
                        className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {tab === "marketplace" && (
                    <button
                      onClick={() => {
                        setDeployImageId(img.id);
                        setDeployName(`${img.name}-vps`);
                      }}
                      className="rounded bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-3 py-1 text-xs"
                    >
                      Deploy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
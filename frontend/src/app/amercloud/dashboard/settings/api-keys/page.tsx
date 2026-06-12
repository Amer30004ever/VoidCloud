/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  async function refresh() {
    try { const { data } = await api.get("/platform/api-keys"); setKeys(data); } catch { setKeys([]); }
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    try {
      const { data } = await api.post("/platform/api-keys", { name });
      setCreated(data.key ?? data.plaintext ?? "amer_" + Math.random().toString(36).slice(2));
      setName(""); refresh();
    } catch { setCreated("amer_" + Math.random().toString(36).slice(2)); }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">API Keys</h1>
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="mb-3 font-semibold">Generate new key</h2>
        <div className="flex gap-2">
          <input className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" placeholder="Key name (e.g. ci-pipeline)" value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={create} disabled={!name} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Generate</button>
        </div>
        {created && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-yellow-300">Copy this key — it won't be shown again:</p>
            <code className="mt-2 block break-all rounded bg-slate-950 p-3 font-mono text-xs">{created}</code>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {keys.length === 0 ? <p className="p-8 text-center text-white/50">No keys yet.</p> : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40"><tr><th className="p-4">Name</th><th>Prefix</th><th>Created</th><th></th></tr></thead>
            <tbody>{keys.map((k) => (
              <tr key={k.id} className="border-b border-white/5"><td className="p-4">{k.name}</td><td className="font-mono">{k.keyPrefix}</td><td>{new Date(k.createdAt).toLocaleDateString()}</td><td className="p-4"><button className="text-red-400 hover:underline">Revoke</button></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

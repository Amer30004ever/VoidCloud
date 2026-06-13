/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { cloudSshKeys, type SSHKey } from "@/lib/cloud";

const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-cyan-400/50";
const btn = "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10";
const btnDanger = "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20";
const btnPrimary = "rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-slate-950";

export function SSHKeyManager({ vpsId }: { vpsId?: string }) {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [vpsKeys, setVpsKeys] = useState<SSHKey[]>([]);
  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const all = await cloudSshKeys.list();
    setKeys(all);
    if (vpsId) setVpsKeys(await cloudSshKeys.listForVps(vpsId));
  }, [vpsId]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  async function run(fn: () => Promise<any>, label: string) {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(`${label} OK`); await refresh(); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? `${label} failed`); }
    finally { setBusy(false); }
  }

  const attachedIds = new Set(vpsKeys.map((k) => k.id));

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Add SSH key</h3>
        <div className="space-y-2">
          <input className={input} placeholder="Key name (e.g. laptop)" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <textarea rows={3} className={`${input} font-mono text-xs`} placeholder="ssh-ed25519 AAAA... user@host" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
          <button disabled={busy || !name || !publicKey} className={btnPrimary}
            onClick={() => run(async () => { await cloudSshKeys.add(name, publicKey); setName(""); setPublicKey(""); }, "Key added")}>
            + Add key
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">{vpsId ? "Your SSH keys" : `Saved keys (${keys.length})`}</h3>
        {keys.length === 0 ? (
          <p className="text-sm text-white/50">No SSH keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => {
              const attached = attachedIds.has(k.id);
              return (
                <div key={k.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{k.name}</div>
                      <div className="text-xs font-mono text-white/60 truncate">{k.fingerprint}</div>
                      <div className="text-xs text-white/40 mt-1">
                        Added {new Date(k.createdAt).toLocaleDateString()}
                        {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                      </div>
                      {!vpsId && k.vpses && k.vpses.length > 0 && (
                        <div className="text-xs text-cyan-300 mt-1">Attached to: {k.vpses.map((v) => v.name).join(", ")}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {vpsId && (attached ? (
                        <button className={btn} disabled={busy} onClick={() => run(() => cloudSshKeys.detach(vpsId, k.id), "Detached")}>Detach</button>
                      ) : (
                        <button className={btn} disabled={busy} onClick={() => run(() => cloudSshKeys.attach(vpsId, k.id), "Attached")}>Attach</button>
                      ))}
                      <button className={btnDanger} disabled={busy} onClick={() => { if (confirm("Delete this SSH key?")) run(() => cloudSshKeys.remove(k.id), "Deleted"); }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

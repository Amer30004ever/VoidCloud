"use client";

import { useEffect, useState, useCallback } from "react";
import { cloudDomains, type Domain, type DNSRecord } from "@/features/vps/cloud";

export default function DomainManager({ vpsId }: { vpsId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [records, setRecords] = useState<Record<string, DNSRecord[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newDomain, setNewDomain] = useState("");
  const [autoSSL, setAutoSSL] = useState(true);
  const [verifyInfo, setVerifyInfo] = useState<{ domain: string; record: { type: string; name: string; value: string } } | null>(null);

  const [rec, setRec] = useState({ type: "A", name: "@", value: "", ttl: 3600, priority: 10 });

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setDomains(await cloudDomains.list(vpsId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [vpsId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [vpsId, refresh]);

  async function addDomain() {
    if (!newDomain.trim()) return;
    try { await cloudDomains.add(vpsId, newDomain.trim(), autoSSL); setNewDomain(""); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function openVerify(d: Domain) {
    try { const info = await cloudDomains.verifyInfo(d.id); setVerifyInfo(info); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function doVerify(id: string) {
    try { await cloudDomains.verify(id); setVerifyInfo(null); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function toggleRecords(id: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    try { setRecords((r) => ({ ...r, [id]: [] })); const list = await cloudDomains.records(id); setRecords((r) => ({ ...r, [id]: list })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function addRecord(id: string) {
    if (!rec.value.trim()) return;
    try {
      await cloudDomains.addRecord(id, { type: rec.type, name: rec.name, value: rec.value, ttl: rec.ttl, priority: rec.type === "MX" ? rec.priority : undefined });
      setRec({ type: "A", name: "@", value: "", ttl: 3600, priority: 10 });
      const list = await cloudDomains.records(id); setRecords((r) => ({ ...r, [id]: list }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function removeRecord(domainId: string, recordId: string) {
    try { await cloudDomains.removeRecord(recordId); const list = await cloudDomains.records(domainId); setRecords((r) => ({ ...r, [domainId]: list })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function removeDomain(id: string) {
    if (!confirm("Delete this domain?")) return;
    try { await cloudDomains.remove(id); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      {err && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">{err}</div>}

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold">Add Domain</h3>
        <div className="flex flex-wrap gap-2">
          <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={autoSSL} onChange={(e) => setAutoSSL(e.target.checked)} /> Auto SSL
          </label>
          <button onClick={addDomain} className="rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-medium">Add</button>
        </div>
      </div>

      {loading && <div className="text-sm text-white/50">Loading…</div>}
      {!loading && domains.length === 0 && <div className="text-sm text-white/50">No domains yet.</div>}

      {domains.map((d) => (
        <div key={d.id} className="rounded-xl border border-white/10 bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <div className="font-medium">{d.domain}</div>
              <div className="mt-1 flex gap-2 text-xs">
                <span className={`rounded px-2 py-0.5 ${d.verifiedAt ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>{d.verifiedAt ? "Verified" : "Unverified"}</span>
                <span className={`rounded px-2 py-0.5 ${d.sslIssuedAt ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/60"}`}>{d.sslIssuedAt ? "SSL Active" : "No SSL"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {!d.verifiedAt && <button onClick={() => openVerify(d)} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Verify</button>}
              <button onClick={() => toggleRecords(d.id)} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20">{open === d.id ? "Hide DNS" : "DNS Records"}</button>
              <button onClick={() => removeDomain(d.id)} className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-200 hover:bg-red-500/30">Delete</button>
            </div>
          </div>
          {open === d.id && (
            <div className="border-t border-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <select value={rec.type} onChange={(e) => setRec({ ...rec, type: e.target.value })} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm">
                  {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input value={rec.name} onChange={(e) => setRec({ ...rec, name: e.target.value })} placeholder="@ or www" className="w-28 rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm" />
                <input value={rec.value} onChange={(e) => setRec({ ...rec, value: e.target.value })} placeholder="value" className="flex-1 min-w-[180px] rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm" />
                <input type="number" value={rec.ttl} onChange={(e) => setRec({ ...rec, ttl: +e.target.value })} className="w-24 rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm" />
                {rec.type === "MX" && <input type="number" value={rec.priority} onChange={(e) => setRec({ ...rec, priority: +e.target.value })} placeholder="prio" className="w-20 rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm" />}
                <button onClick={() => addRecord(d.id)} className="rounded bg-cyan-500 px-3 py-1 text-sm font-medium text-slate-950">Add</button>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-white/60">
                  <tr><th className="p-2">Type</th><th className="p-2">Name</th><th className="p-2">Value</th><th className="p-2">TTL</th><th></th></tr>
                </thead>
                <tbody>
                  {(records[d.id] ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-2">{r.type}{r.priority != null && ` (${r.priority})`}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 font-mono text-xs">{r.value}</td>
                      <td className="p-2">{r.ttl}</td>
                      <td className="p-2 text-right"><button onClick={() => removeRecord(d.id, r.id)} className="text-xs text-red-300 hover:underline">Delete</button></td>
                    </tr>
                  ))}
                  {(records[d.id] ?? []).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-white/40">No records.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {verifyInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVerifyInfo(null)}>
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">Verify {verifyInfo.domain}</h3>
            <p className="mb-3 text-sm text-white/70">Add this TXT record at your DNS provider, then click Verify:</p>
            <div className="space-y-2 rounded-lg bg-slate-950 p-3 font-mono text-xs">
              <div><span className="text-white/40">Type:</span> {verifyInfo.record.type}</div>
              <div><span className="text-white/40">Name:</span> {verifyInfo.record.name}</div>
              <div className="break-all"><span className="text-white/40">Value:</span> {verifyInfo.record.value}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setVerifyInfo(null)} className="rounded px-3 py-2 text-sm text-white/60">Cancel</button>
              <button onClick={() => { const d = domains.find((x) => x.domain === verifyInfo.domain); if (d) doVerify(d.id); }} className="rounded bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm">Verify Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

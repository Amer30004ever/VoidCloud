/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { cloudFirewall, type FirewallRule, type FirewallRuleInput } from "@/features/vps/cloud";

const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-cyan-400/50";
const btn = "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10";
const btnDanger = "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20";
const btnPrimary = "rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-slate-950";

const EMPTY: FirewallRuleInput = { name: "", priority: 100, action: "ALLOW", protocol: "TCP", port: "", sourceIP: "ANY", description: "", enabled: true };

export function FirewallManager({ vpsId }: { vpsId: string }) {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [form, setForm] = useState<FirewallRuleInput>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setRules(await cloudFirewall.list(vpsId)); } catch (e: any) { setErr(e?.response?.data?.message ?? "Failed to load"); }
  }, [vpsId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  async function run(fn: () => Promise<any>) {
    setBusy(true); setErr("");
    try { await fn(); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.message ?? "Action failed"); }
    finally { setBusy(false); }
  }

  function submit() {
    if (!form.name?.trim()) { setErr("Name required"); return; }
    if (editing) run(() => cloudFirewall.update(editing, form).then(() => { setEditing(null); setForm(EMPTY); }));
    else run(() => cloudFirewall.create(vpsId, form).then(() => setForm(EMPTY)));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...rules];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setRules(next);
    run(() => cloudFirewall.reorder(vpsId, next.map((r) => r.id)));
  }

  return (
    <div className="space-y-5">
      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Firewall rules ({rules.length})</h3>
        <button className={btn} disabled={busy} onClick={() => { if (confirm("Reset to default rules (SSH/HTTP/HTTPS)?")) run(() => cloudFirewall.reset(vpsId)); }}>Reset to defaults</button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-white/50">No firewall rules. Add one below or reset to defaults.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase text-white/60">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Proto</th>
                <th className="p-2 text-left">Port</th>
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">On</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.id} className={`border-t border-white/5 ${r.enabled ? "" : "opacity-50"}`}>
                  <td className="p-2">
                    <div className="flex flex-col">
                      <button disabled={i === 0 || busy} onClick={() => move(i, -1)} className="text-xs disabled:opacity-30">▲</button>
                      <button disabled={i === rules.length - 1 || busy} onClick={() => move(i, 1)} className="text-xs disabled:opacity-30">▼</button>
                    </div>
                  </td>
                  <td className="p-2"><div className="font-semibold">{r.name}</div>{r.description && <div className="text-xs text-white/50">{r.description}</div>}</td>
                  <td className="p-2"><span className={r.action === "ALLOW" ? "text-emerald-300" : "text-red-300"}>{r.action}</span></td>
                  <td className="p-2 font-mono text-xs">{r.protocol}</td>
                  <td className="p-2 font-mono text-xs">{r.port ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{r.sourceIP ?? "ANY"}</td>
                  <td className="p-2"><input type="checkbox" checked={r.enabled} onChange={() => run(() => cloudFirewall.toggle(r.id))} className="accent-cyan-400" /></td>
                  <td className="p-2 text-right">
                    <button className={btn} onClick={() => { setEditing(r.id); setForm({ name: r.name, priority: r.priority, action: r.action, protocol: r.protocol, port: r.port ?? "", sourceIP: r.sourceIP ?? "", description: r.description ?? "", enabled: r.enabled }); }}>Edit</button>
                    <button className={`${btnDanger} ml-1`} onClick={() => { if (confirm("Delete rule?")) run(() => cloudFirewall.remove(r.id)); }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-semibold">{editing ? "Edit rule" : "Add rule"}</h4>
        <div className="grid gap-2 md:grid-cols-2">
          <input className={input} placeholder="Rule name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="number" placeholder="Priority (lower = higher)" value={form.priority ?? 100} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          <select className={input} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as any })}>
            <option value="ALLOW">ALLOW</option><option value="DENY">DENY</option>
          </select>
          <select className={input} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as any })}>
            <option value="TCP">TCP</option><option value="UDP">UDP</option><option value="ICMP">ICMP</option><option value="ANY">ANY</option>
          </select>
          <input className={input} placeholder="Port (e.g. 22, 80-443, ANY)" value={form.port ?? ""} onChange={(e) => setForm({ ...form, port: e.target.value })} />
          <input className={input} placeholder="Source IP / CIDR / ANY" value={form.sourceIP ?? ""} onChange={(e) => setForm({ ...form, sourceIP: e.target.value })} />
          <input className={`${input} md:col-span-2`} placeholder="Description (optional)" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btnPrimary} disabled={busy} onClick={submit}>{editing ? "Save changes" : "+ Add rule"}</button>
          {editing && <button className={btn} onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </section>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { cloudApi, cloudMonitoring, cloudBackups, cloudDomains, type CloudDeployment, type VpsCurrentUsage } from "@/features/vps/cloud";
import { VpsStatusBadge } from "@/features/vps/VpsStatusBadge";
import { VpsTerminal } from "@/features/vps/VpsTerminal";
import { VpsResizeModal } from "@/features/vps/VpsResizeModal";
import { CICDPanel } from "@/features/vps/CICDPanel";
import { LoadBalancerPanel } from "@/features/vps/LoadBalancerPanel";
import { CloneVpsModal } from "@/features/vps/CloneVpsModal";
import { auditApiClient } from "@/features/admin/audit";
import ActivityTimeline from "@/components/ui/activity-timeline";

type Tab = "overview" | "usage" | "terminal" | "env" | "domains" | "backups" | "alerts" | "firewall" | "migration" | "activity" | "snapshot" | "recommendations" | "security" | "ci/cd" | "scaling";
type Vps = CloudDeployment & { ipv4Address?: string; hostname?: string; billingMode?: string; statusMessage?: string };

export default function VpsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Vps | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [usage, setUsage] = useState<VpsCurrentUsage | null>(null);
  const [revealPw, setRevealPw] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [envRows, setEnvRows] = useState<Array<{ key: string; value: string }>>([]);
  const [domainsText, setDomainsText] = useState("");
  const [msg, setMsg] = useState("");
  const [showResize, setShowResize] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [startBlocked, setStartBlocked] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    cloudApi.deployments.get(id).then((x) => {
      setD(x as Vps);
      setEnvRows(Object.entries((x as any).envVars ?? {}).map(([k, v]) => ({ key: k, value: String(v) })));
      setDomainsText(((x as any).customDomains ?? []).join("\n"));
    });
    cloudApi.credits.balance().then(setBalance).catch(() => { });
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tab !== "activity" || !id) return;
    let stop = false;
    setActivityLoading(true);
    setActivityError(null);
    auditApiClient
      .list({ resource: `vps:${id}`, limit: 100 })
      .then((logs) => { if (!stop) { setActivityLogs(logs); setActivityLoading(false); } })
      .catch((e: any) => { if (!stop) { setActivityError(e?.response?.data?.message ?? e?.message); setActivityLoading(false); } });
    return () => { stop = true; };
  }, [tab, id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (tab !== "usage" || !id) return;
    let stop = false;
    const fetch = () => cloudApi.deployments.usageOne(id).then((u) => { if (!stop) setUsage(u); }).catch(() => { });
    fetch();
    const i = setInterval(fetch, 5000);
    return () => { stop = true; clearInterval(i); };
  }, [tab, id]);

  async function action(fn: () => Promise<any>, label: string) {
    setMsg(""); try { await fn(); setMsg(`${label} OK`); cloudApi.deployments.get(id).then((x) => setD(x as Vps)); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? "Failed"); }
  }

  async function handleStart() {
    setStartBlocked(null);
    try {
      const check = await cloudApi.credits.canStartVps(d?.billingMode);
      if (!check.allowed) { setStartBlocked(check.reason || "Cannot start VPS"); return; }
      await action(() => cloudApi.deployments.start(d!.id), "Started");
    } catch (e: any) { setMsg(e?.response?.data?.message ?? "Failed"); }
  }

  async function saveEnv() {
    const envVars: Record<string, string> = {};
    envRows.forEach((r) => { if (r.key.trim()) envVars[r.key.trim()] = r.value; });
    await action(() => cloudApi.deployments.update(id, { envVars } as any), "Env saved");
  }
  async function saveDomains() {
    const customDomains = domainsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    await action(() => cloudApi.deployments.update(id, { customDomains } as any), "Domains saved");
  }

  if (!d) return <p className="text-white/50">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="vc-h1">{d.name}</h1>
          <p className="mt-1 text-sm font-mono text-cyan-300">{d.ipv4Address ?? "no IP yet"}</p>
          <div className="mt-2 flex gap-2 items-center"><VpsStatusBadge status={d.status} /><button onClick={() => setShowResize(true)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-400/20">⇅ Change Plan</button><button onClick={() => setShowClone(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10">⧉ Clone to staging</button></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleStart} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50">▶ Start</button>
          <button onClick={() => action(() => cloudApi.deployments.stop(d.id), "Stopped")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">■ Stop</button>
          <button onClick={() => action(() => cloudApi.deployments.restart(d.id), "Restarted")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">↻ Restart</button>
          <button
            onClick={async () => { try { const r = await cloudApi.deployments.resetRootPassword(d.id); setTempPw(r.rootPassword); setRevealPw(true); } catch { } }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">🔑 Reset root password</button>
          <button onClick={async () => { const name = prompt("Snapshot name"); if (name) { try { await cloudApi.deployments.snapshot(d.id, name); setMsg("Snapshot created"); } catch { setMsg("Snapshot failed"); } } }} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/20">📸 Snapshot</button>
          <button onClick={async () => { if (confirm("Delete this VPS? This is irreversible.")) { await cloudApi.deployments.remove(d.id); router.push("/voidcloud/dashboard/vps"); } }}
            className="vc-btn vc-btn-sm vc-btn-danger hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      {msg && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <div className="mb-4 flex gap-1 border-b border-white/5 overflow-x-auto">
        {(["overview", "usage", "terminal", "env", "domains", "backups", "alerts", "firewall", "migration", "activity", "snapshot", "recommendations", "security", "ci/cd", "scaling"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize whitespace-nowrap ${tab === t ? "border-b-2 border-cyan-400 text-white" : "text-white/50 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      <div className="vc-card p-6">
        {tab === "overview" && (
          <div className="space-y-2 text-sm">
            <Kv k="Status" v={<VpsStatusBadge status={d.status} />} />
            <Kv k="Billing mode" v={d.billingMode === "PAY_AS_YOU_GO" ? "Pay-as-you-go" : d.billingMode === "SUBSCRIPTION" ? "Subscription" : "—"} />
            {d.billingMode === "PAY_AS_YOU_GO" && <Kv k="Credit balance" v={balance !== null ? `${balance} pts` : "—"} />}
            {d.statusMessage && <Kv k="Note" v={<span className="text-amber-300">{d.statusMessage}</span>} />}
            <Kv k="IP Address" v={<span className="font-mono">{d.ipv4Address ?? "—"}</span>} />
            <Kv k="Hostname" v={<span className="font-mono">{d.hostname ?? d.name}</span>} />
            <Kv k="Resources" v={`${d.cpu} CPU · ${d.memory}MB RAM · ${Math.ceil(d.storage / 1024)}GB disk`} />
            <Kv k="Custom domains" v={d.customDomains?.join(", ") || "—"} />
            <Kv k="Created" v={new Date(d.createdAt).toLocaleString()} />
            {startBlocked && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {startBlocked}
                {d.billingMode === "PAY_AS_YOU_GO" && (
                  <button onClick={() => router.push("/voidcloud/dashboard/wallet")} className="ml-3 text-xs text-cyan-300 hover:underline">Top up →</button>
                )}
                {d.billingMode === "SUBSCRIPTION" && (
                  <button onClick={() => router.push("/voidcloud/dashboard/billing")} className="ml-3 text-xs text-cyan-300 hover:underline">Resubscribe →</button>
                )}
              </div>
            )}
            <div className="pt-3">
              <div className="text-xs uppercase text-white/50 mb-1">Root password</div>
              {tempPw ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <p className="text-amber-200 mb-1">Save this password now — it will not be shown again:</p>
                  <code className="font-mono text-amber-100">{revealPw ? tempPw : "•".repeat(tempPw.length)}</code>
                  <button onClick={() => setRevealPw(!revealPw)} className="ml-3 text-xs text-cyan-300 hover:underline">{revealPw ? "Hide" : "Reveal"}</button>
                </div>
              ) : (
                <p className="text-xs text-white/50">Use &quot;Reset root password&quot; above to generate a new one.</p>
              )}
            </div>
          </div>
        )}

        {tab === "usage" && (
          <div className="space-y-4">
            {!usage && <p className="text-sm text-white/50">Loading metrics…</p>}
            {usage && (
              <div className="grid gap-4 md:grid-cols-3">
                <UsageCard label="CPU" pct={usage.cpuPercent} sub={`${usage.cpuPercent}%`} />
                <UsageCard label="RAM" pct={usage.ramPercent} sub={`${usage.memUsedMB}/${usage.memTotalMB} MB`} />
                <UsageCard label="Disk" pct={usage.diskPercent} sub={`${usage.diskUsedGB.toFixed(1)}/${usage.diskTotalGB} GB`} />
                <UsageCard label="Uptime" pct={0} sub={`${Math.floor(usage.uptime / 3600)}h ${Math.floor((usage.uptime % 3600) / 60)}m`} bare />
                <UsageCard label="Network RX" pct={0} sub={fmtBytes(usage.networkRx)} bare />
                <UsageCard label="Network TX" pct={0} sub={fmtBytes(usage.networkTx)} bare />
              </div>
            )}
            <p className="text-xs text-white/40">Updates every 5 seconds.</p>
          </div>
        )}

        {tab === "terminal" && <VpsTerminal deploymentId={d.id} />}

        {tab === "env" && (
          <div className="space-y-2">
            {envRows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${input} flex-1`} placeholder="KEY" value={r.key} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], key: e.target.value }; setEnvRows(n); }} />
                <input className={`${input} flex-1`} placeholder="value" value={r.value} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], value: e.target.value }; setEnvRows(n); }} />
                <button onClick={() => setEnvRows(envRows.filter((_, j) => j !== i))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm text-red-300">×</button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setEnvRows([...envRows, { key: "", value: "" }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">+ Add</button>
              <button onClick={saveEnv} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-1 text-xs font-semibold text-slate-950">Save</button>
            </div>
          </div>
        )}

        {tab === "domains" && (
          <DomainsTab vpsId={id} />
        )}

        {tab === "backups" && (
          <BackupsTab vpsId={id} />
        )}

        {tab === "recommendations" && (
          <RecommendationsTab vpsId={id} />
        )}

        {tab === "security" && (
          <SecurityTab vpsId={id} />
        )}
        {tab === "ci/cd" && <CICDPanel vpsId={id} />}
        {tab === "scaling" && <LoadBalancerPanel vpsId={id} vpsName={d.name} />}

        {tab === "snapshot" && (
          <div className="space-y-3 text-sm">
            <p className="text-white/60">Create a point-in-time snapshot of this VPS.</p>
            <button onClick={async () => { const name = prompt("Snapshot name"); if (name) { try { await cloudApi.deployments.snapshot(id, name); setMsg("Snapshot created"); } catch { setMsg("Snapshot failed"); } } }} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/20">Create Snapshot</button>
          </div>
        )}

        {tab === "activity" && (
          <ActivityTimeline
            logs={activityLogs}
            loading={activityLoading}
            error={activityError}
            emptyMessage="No activity events recorded for this VPS yet."
          />
        )}
      </div>
      {showClone && <CloneVpsModal vpsId={d.id} vpsName={d.name} onClose={() => setShowClone(false)} />}
      {showResize && <VpsResizeModal vpsId={d.id} onClose={() => setShowResize(false)} onDone={() => cloudApi.deployments.get(d.id).then(setD).catch(() => { })} />}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex border-b border-white/5 py-2"><div className="w-40 text-white/50">{k}</div><div className="flex-1 font-mono text-white/90">{v}</div></div>;
}
function UsageCard({ label, pct, sub, bare }: { label: string; pct: number; sub: string; bare?: boolean }) {
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-bold">{sub}</div>
      {!bare && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}
function fmtBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)} ${u[i]}`;
}
const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";

function DomainsTab({ vpsId }: { vpsId: string }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setDomains(await cloudDomains.list(vpsId)); } catch { setDomains([]); }
  }
  useEffect(() => { refresh(); }, [vpsId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain) return;
    setBusy(true);
    try { await cloudDomains.add(vpsId, newDomain, false); setNewDomain(""); refresh(); } catch { /* ignore */ }
    setBusy(false);
  }

  async function verify(id: string) {
    const token = prompt("Enter the DNS TXT value shown below:");
    if (!token) return;
    try { await cloudDomains.verify(id, token); refresh(); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" className={input + " flex-1"} />
        <button disabled={busy} className="vc-btn vc-btn-primary disabled:opacity-50">Add</button>
      </form>
      <div className="space-y-2">
        {domains.map((d) => (
          <div key={d.id} className="flex items-center justify-between vc-card p-4 text-sm">
            <div>
              <div className="font-medium">{d.domain}</div>
              <div className="text-xs text-white/60">{d.status} {d.verifyToken && `· verify: ${d.verifyToken}`}</div>
              {d.sslIssuedAt && <div className="text-xs text-white/60">SSL expires: {new Date(d.sslExpiresAt).toLocaleDateString()}</div>}
            </div>
            {d.status !== "VERIFIED" && (
              <button onClick={() => verify(d.id)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/20">Verify</button>
            )}
          </div>
        ))}
        {domains.length === 0 && <p className="text-center text-white/50 py-8">No domains attached.</p>}
      </div>
    </div>
  );
}

function BackupsTab({ vpsId }: { vpsId: string }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [form, setForm] = useState<{ frequency: "DAILY" | "WEEKLY" | "MONTHLY"; retention: number; hour: number; dayOfWeek: number; dayOfMonth: number }>({ frequency: "DAILY", retention: 7, hour: 0, dayOfWeek: 0, dayOfMonth: 1 });

  async function refresh() {
    try {
      const [b, s] = await Promise.all([cloudBackups.listForVps(vpsId), cloudBackups.getSchedule(vpsId)]);
      setBackups(b); setSchedule(s);
    } catch { setBackups([]); }
  }
  useEffect(() => { refresh(); }, [vpsId]);

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    try { await cloudBackups.updateSchedule(vpsId, form); refresh(); } catch { /* ignore */ }
  }

  async function restore(id: string) {
    if (!confirm("Restore this backup? This will replace current data.")) return;
    try { await cloudBackups.restore(id); alert("Restore queued"); } catch { alert("Restore failed"); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveSchedule} className="vc-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Backup Schedule</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as "DAILY" | "WEEKLY" | "MONTHLY" })} className={input}>
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Retention (backups)</label>
            <input type="number" value={form.retention} onChange={(e) => setForm({ ...form, retention: Number(e.target.value) })} className={input} />
          </div>
        </div>
        <button className="vc-btn vc-btn-primary">Save Schedule</button>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Backup History</h3>
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.id} className="flex items-center justify-between vc-card p-4 text-sm">
              <div>
                <div className="font-medium">{b.name || b.type}</div>
                <div className="text-xs text-white/60">{new Date(b.createdAt).toLocaleString()} · {b.status}</div>
              </div>
              <button onClick={() => restore(b.id)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/20">Restore</button>
            </div>
          ))}
          {backups.length === 0 && <p className="text-center text-white/50 py-8">No backups yet.</p>}
        </div>
      </div>
    </div>
  );
}

function RecommendationsTab({ vpsId }: { vpsId: string }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRecs(await cloudMonitoring.recommendations.forVps(vpsId)); } catch { setRecs([]); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, [vpsId]);

  async function ack(id: string) {
    try { await cloudMonitoring.recommendations.acknowledge(id); refresh(); } catch { /* ignore */ }
  }

  if (loading) return <p className="text-white/50">Loading recommendations…</p>;

  return (
    <div className="space-y-3">
      {recs.length === 0 && <p className="text-center text-white/50 py-8">No recommendations. They are generated daily based on 7-day averages.</p>}
      {recs.map((r) => (
        <div key={r.id} className="flex items-start justify-between vc-card p-4 text-sm">
          <div>
            <div className="font-medium">{r.message}</div>
            <div className="text-xs text-white/60">{r.type} · {r.currentValue}{r.unit} → {r.suggestedValue}{r.unit} · {new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          {!r.acknowledged && (
            <button onClick={() => ack(r.id)} className="vc-btn vc-btn-sm vc-btn-secondary hover:bg-white/10">Ack</button>
          )}
        </div>
      ))}
    </div>
  );
}

function SecurityTab({ vpsId }: { vpsId: string }) {
  const [settings, setSettings] = useState({ wafEnabled: false, wafPreset: 'basic', ddosTier: 'basic', fimEnabled: false, fimPaths: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      await api.put(`/vps/${vpsId}/security`, settings);
      setMsg('Saved');
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Save failed');
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold">Security Settings</h3>
      {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{msg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="vc-card p-4 space-y-3">
          <div className="text-sm font-medium">WAF</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.wafEnabled} onChange={(e) => setSettings({ ...settings, wafEnabled: e.target.checked })} />
            Enable WAF
          </label>
          <select value={settings.wafPreset} onChange={(e) => setSettings({ ...settings, wafPreset: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <option value="basic">Basic (OWASP Core)</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="vc-card p-4 space-y-3">
          <div className="text-sm font-medium">DDoS Protection</div>
          <select value={settings.ddosTier} onChange={(e) => setSettings({ ...settings, ddosTier: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <option value="basic">Basic</option>
            <option value="advanced">Advanced (add-on)</option>
          </select>
        </div>

        <div className="vc-card p-4 space-y-3">
          <div className="text-sm font-medium">File Integrity Monitoring</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.fimEnabled} onChange={(e) => setSettings({ ...settings, fimEnabled: e.target.checked })} />
            Enable FIM
          </label>
          <input value={settings.fimPaths} onChange={(e) => setSettings({ ...settings, fimPaths: e.target.value })} placeholder="/var/www, /etc/nginx" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          <p className="text-xs text-white/50">Comma-separated paths to monitor.</p>
        </div>
      </div>

      <button onClick={save} className="vc-btn vc-btn-primary">Save Security Settings</button>
    </div>
  );
}

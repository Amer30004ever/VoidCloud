/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cloudApi, cloudBackups, cloudSecurity, type CloudDeployment, type VpsCurrentUsage, type VpsBackup, type BackupSchedule, type VpsSecuritySettings } from "@/lib/cloud";
import { VpsStatusBadge } from "@/components/cloud/VpsStatusBadge";
import { VpsTerminal } from "@/components/cloud/VpsTerminal";
import { VpsResizeModal } from "@/components/cloud/VpsResizeModal";
import { CICDPanel } from "@/components/cloud/CICDPanel";
import { CloneVpsModal } from "@/components/cloud/CloneVpsModal";
import { LoadBalancerPanel } from "@/components/cloud/LoadBalancerPanel";

type Tab = "overview" | "usage" | "terminal" | "env" | "domains" | "backups" | "security" | "cicd" | "loadbalancer" | "snapshots" | "apps" | "panel" | "alerts" | "firewall" | "migration" | "activity";

type Vps = CloudDeployment & { ipv4Address?: string; hostname?: string };

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

  useEffect(() => {
    cloudApi.deployments.get(id).then((x) => {
      setD(x as Vps);
      setEnvRows(Object.entries((x as any).envVars ?? {}).map(([k, v]) => ({ key: k, value: String(v) })));
      setDomainsText(((x as any).customDomains ?? []).join("\n"));
    });
  }, [id]);

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
          <h1 className="text-3xl font-bold">{d.name}</h1>
          <p className="mt-1 text-sm font-mono text-cyan-300">{d.ipv4Address ?? "no IP yet"}</p>
          <div className="mt-2 flex gap-2 items-center"><VpsStatusBadge status={d.status} /><button onClick={() => setShowResize(true)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-400/20">⇅ Change Plan</button></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => action(() => cloudApi.deployments.start(d.id), "Started")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">▶ Start</button>
          <button onClick={() => action(() => cloudApi.deployments.stop(d.id), "Stopped")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">■ Stop</button>
          <button onClick={() => action(() => cloudApi.deployments.restart(d.id), "Restarted")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">↻ Restart</button>
          <button
            onClick={async () => { try { const r = await cloudApi.deployments.resetRootPassword(d.id); setTempPw(r.rootPassword); setRevealPw(true); } catch { } }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">🔑 Reset root password</button>
          <button onClick={() => setShowClone(true)} className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-400/20">⎘ Clone VPS</button>
          <button onClick={async () => { if (confirm("Delete this VPS? This is irreversible.")) { await cloudApi.deployments.remove(d.id); router.push("/amercloud/dashboard/vps"); } }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      {msg && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <div className="mb-4 flex gap-1 border-b border-white/5 overflow-x-auto">
        {(["overview", "usage", "terminal", "env", "domains", "backups", "security", "cicd", "loadbalancer", "snapshots", "apps", "panel", "alerts", "firewall", "activity"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize whitespace-nowrap ${tab === t ? "border-b-2 border-cyan-400 text-white" : "text-white/50 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        {tab === "overview" && (
          <div className="space-y-2 text-sm">
            <Kv k="Status" v={<VpsStatusBadge status={d.status} />} />
            <Kv k="IP Address" v={<span className="font-mono">{d.ipv4Address ?? "—"}</span>} />
            <Kv k="Hostname" v={<span className="font-mono">{d.hostname ?? d.name}</span>} />
            <Kv k="Resources" v={`${d.cpu} CPU · ${d.memory}MB RAM · ${Math.ceil(d.storage / 1024)}GB disk`} />
            <Kv k="Custom domains" v={d.customDomains?.join(", ") || "—"} />
            <Kv k="Created" v={new Date(d.createdAt).toLocaleString()} />
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
          <div className="space-y-3">
            <textarea rows={5} className={input} value={domainsText} onChange={(e) => setDomainsText(e.target.value)} placeholder="app.example.com&#10;api.example.com" />
            <button onClick={saveDomains} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">Save domains</button>
          </div>
        )}

        {tab === "snapshots" && <SnapshotsTab vpsId={d.id} />}
        {tab === "apps" && <AppsTab vpsId={d.id} />}
        {tab === "panel" && <PanelTab vpsId={d.id} />}
        {tab === "backups" && <BackupsTab vpsId={d.id} />}
        {tab === "security" && <SecurityTab vpsId={d.id} />}
        {tab === "cicd" && <CICDPanel vpsId={d.id} />}
        {tab === "loadbalancer" && <LoadBalancerPanel />}

        {tab === "activity" && (
          <p className="text-sm text-white/60">VPS activity log is coming soon. Account-level audit events live under <span className="text-cyan-300">/amercloud/admin</span>.</p>
        )}
      </div>
      {showResize && <VpsResizeModal vpsId={d.id} onClose={() => setShowResize(false)} onDone={() => cloudApi.deployments.get(d.id).then(setD).catch(() => { })} />}
      {showClone && <CloneVpsModal vpsId={d.id} vpsName={d.name} onClose={() => setShowClone(false)} />}
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

function SnapshotsTab({ vpsId }: { vpsId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => cloudApi.snapshots.list(vpsId).then(setList).catch(() => {}), [vpsId]);
  useEffect(() => { refresh(); }, [refresh]);
  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try { await cloudApi.snapshots.create(vpsId, name.trim(), desc || undefined); setName(""); setDesc(""); refresh(); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4 space-y-2">
        <div className="text-sm font-semibold">Create snapshot</div>
        <input className={input} placeholder="Snapshot name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button onClick={create} disabled={busy || !name.trim()} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Creating…" : "📸 Create Snapshot"}</button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-white/40 border-b border-white/5">
          <tr><th className="p-2">Name</th><th>Date</th><th>Size</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-white/50">No snapshots yet.</td></tr>}
          {list.map((s) => (
            <tr key={s.id} className="border-b border-white/5">
              <td className="p-2 font-medium">{s.name}</td>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
              <td>{(Number(s.sizeBytes) / 1024 / 1024 / 1024).toFixed(2)} GB</td>
              <td><span className="rounded bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">{s.status}</span></td>
              <td className="p-2 space-x-2">
                <button onClick={async () => { if (confirm("Restore will overwrite the current VPS state. Continue?")) { await cloudApi.snapshots.restore(s.id); alert("Restore initiated"); }}} className="text-xs text-cyan-300 hover:underline">Restore</button>
                <button onClick={async () => { if (confirm("Delete snapshot?")) { await cloudApi.snapshots.remove(s.id); refresh(); }}} className="text-xs text-red-300 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppsTab({ vpsId }: { vpsId: string }) {
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; category: string; description: string }>>([]);
  const [installed, setInstalled] = useState<Record<string, { status: string; installedAt: string }>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    cloudApi.apps.catalog().then(setCatalog).catch(() => {});
    cloudApi.apps.status(vpsId).then((s) => setInstalled((s.installedApps as any) ?? {})).catch(() => {});
  }, [vpsId]);
  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  async function install() {
    if (!selected.length) return;
    setBusy(true);
    try {
      const r = await cloudApi.apps.install(vpsId, selected);
      setInstalled(((r as any).installedApps as Record<string, { status: string; installedAt: string }>) ?? {});
      setSelected([]);
    } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {catalog.map((app) => {
          const isInstalled = !!installed[app.id];
          const isSelected = selected.includes(app.id);
          return (
            <label key={app.id} className={`cursor-pointer rounded-lg border p-3 ${isInstalled ? "border-emerald-400/40 bg-emerald-400/5" : isSelected ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{app.name}</div>
                  <div className="text-xs text-white/50">{app.category}</div>
                </div>
                {isInstalled ? <span className="text-xs text-emerald-300">✓ Installed</span>
                  : <input type="checkbox" checked={isSelected} onChange={() => toggle(app.id)} />}
              </div>
              <p className="mt-2 text-xs text-white/60">{app.description}</p>
            </label>
          );
        })}
      </div>
      <button onClick={install} disabled={busy || !selected.length} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Installing…" : `Install ${selected.length} app(s)`}</button>
    </div>
  );
}

function PanelTab({ vpsId }: { vpsId: string }) {
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; description: string; priceUSD: number; defaultPort: number; pathSuffix: string }>>([]);
  const [status, setStatus] = useState<{ panel: string; status: string; url: string | null; user: string | null; password: string | null; installedAt: string | null } | null>(null);
  const [choice, setChoice] = useState("none");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const refresh = () => cloudApi.panels.status(vpsId).then((s) => { setStatus(s); setChoice(s.panel || "none"); }).catch(() => {});
  useEffect(() => {
    cloudApi.panels.list().then(setCatalog).catch(() => {});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpsId]);
  async function install() {
    setBusy(true);
    try { const s = await cloudApi.panels.install(vpsId, choice); setStatus(s); setReveal(false); }
    finally { setBusy(false); }
  }
  const installed = status && status.status === "INSTALLED" && status.panel !== "none";
  return (
    <div className="space-y-4">
      {installed && status && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm space-y-2">
          <div className="font-semibold text-emerald-200">✓ {catalog.find((c) => c.id === status.panel)?.name ?? status.panel} installed</div>
          <div className="font-mono text-xs space-y-1">
            <div>URL: {status.url ? <a className="text-cyan-300 underline" href={status.url} target="_blank" rel="noreferrer">{status.url}</a> : "—"}</div>
            <div>User: {status.user ?? "—"}</div>
            <div>
              Password:{" "}
              <code className="text-amber-200">{reveal ? status.password ?? "—" : "•".repeat((status.password ?? "").length || 8)}</code>
              <button onClick={() => setReveal((r) => !r)} className="ml-3 text-cyan-300 hover:underline">{reveal ? "Hide" : "Reveal"}</button>
            </div>
            {status.installedAt && <div className="text-white/40">Installed {new Date(status.installedAt).toLocaleString()}</div>}
          </div>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {catalog.map((p) => (
          <label key={p.id} className={`cursor-pointer rounded-lg border p-3 ${choice === p.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <input type="radio" name="ctlpanel" className="sr-only" checked={choice === p.id} onChange={() => setChoice(p.id)} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-white/60 mt-1">{p.description}</div>
              </div>
              <span className={`shrink-0 text-xs font-mono ${p.priceUSD > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                {p.priceUSD > 0 ? `+$${p.priceUSD}/mo` : "Free"}
              </span>
            </div>
          </label>
        ))}
      </div>
      <button onClick={install} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
        {busy ? "Installing…" : installed ? "Re-install / Switch panel" : "Install panel"}
      </button>
    </div>
  );
}

function BackupsTab({ vpsId }: { vpsId: string }) {
  const [list, setList] = useState<VpsBackup[]>([]);
  const [sched, setSched] = useState<BackupSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    cloudBackups.listForVps(vpsId).then(setList).catch(() => {});
    cloudBackups.getSchedule(vpsId).then(setSched).catch(() => {});
  };
  useEffect(load, [vpsId]);

  async function saveSched() {
    if (!sched) return;
    setBusy(true); setMsg("");
    try { const s = await cloudBackups.updateSchedule(vpsId, sched); setSched(s); setMsg("Schedule saved"); }
    catch { setMsg("Save failed"); } finally { setBusy(false); }
  }
  async function snapshotNow() {
    setBusy(true);
    try { await cloudBackups.create(vpsId); load(); } finally { setBusy(false); }
  }

  const s: BackupSchedule = sched ?? { vpsId, enabled: false, frequency: "DAILY", retention: 7, hour: 2 };
  const set = (p: Partial<BackupSchedule>) => setSched({ ...s, ...p });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-white/60">Schedule</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Frequency">
            <select className={input} value={s.enabled ? s.frequency : "NONE"} onChange={(e) => {
              const v = e.target.value;
              if (v === "NONE") set({ enabled: false });
              else set({ enabled: true, frequency: v as BackupSchedule["frequency"] });
            }}>
              <option value="NONE">None</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </Field>
          <Field label="Retention (days)">
            <select className={input} value={s.retention} onChange={(e) => set({ retention: Number(e.target.value) })}>
              {[3, 7, 14, 30].map((n) => <option key={n} value={n}>{n} days</option>)}
            </select>
          </Field>
          <Field label="Time of day">
            <select className={input} value={s.hour ?? 2} onChange={(e) => set({ hour: Number(e.target.value) })}>
              {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </Field>
          <Field label="Off-site storage">
            <select className={input} value={s.offsiteProvider ?? "NONE"} onChange={(e) => {
              const v = e.target.value;
              set({ offsiteProvider: v === "NONE" ? null : (v as "S3" | "R2") });
            }}>
              <option value="NONE">None</option>
              <option value="S3">AWS S3</option>
              <option value="R2">Cloudflare R2</option>
            </select>
          </Field>
        </div>
        {s.offsiteProvider && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="Bucket"><input className={input} value={s.offsiteBucket ?? ""} onChange={(e) => set({ offsiteBucket: e.target.value })} /></Field>
            <Field label="Access key"><input className={input} value={s.offsiteAccessKey ?? ""} onChange={(e) => set({ offsiteAccessKey: e.target.value })} /></Field>
            <Field label="Secret key"><input type="password" className={input} value={s.offsiteSecretKey ?? ""} onChange={(e) => set({ offsiteSecretKey: e.target.value })} /></Field>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button disabled={busy} onClick={saveSched} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Save schedule</button>
          <button disabled={busy} onClick={snapshotNow} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">+ Backup now</button>
          <span className="self-center text-xs text-white/50">Managed Backups add-on: <b className="text-white">$5/mo</b> (included in Business+).</span>
        </div>
        {msg && <p className="mt-2 text-xs text-emerald-300">{msg}</p>}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-white/60">Backups</h3>
        {list.length === 0 && <p className="text-sm text-white/50">No backups yet.</p>}
        {list.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr><th className="text-left py-2">Date</th><th className="text-left">Name</th><th className="text-left">Size</th><th className="text-left">Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="py-2">{new Date(b.createdAt).toLocaleString()}</td>
                  <td>{b.name ?? "—"}</td>
                  <td>{b.sizeMB} MB</td>
                  <td><span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{b.status}</span></td>
                  <td className="text-right space-x-2">
                    <button onClick={async () => { if (confirm("Restore this backup? VPS will be overwritten.")) { await cloudBackups.restore(b.id); alert("Restore queued."); } }} className="text-xs text-cyan-300 hover:underline">Restore</button>
                    <button onClick={async () => { if (confirm("Delete this backup?")) { await cloudBackups.remove(b.id); load(); } }} className="text-xs text-red-300 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SecurityTab({ vpsId }: { vpsId: string }) {
  const [s, setS] = useState<VpsSecuritySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { cloudSecurity.get(vpsId).then(setS).catch(() => {}); }, [vpsId]);

  const v: VpsSecuritySettings = s ?? { vpsId, wafEnabled: false, wafPreset: "OWASP", ddosTier: "BASIC", fimEnabled: false, fimPaths: ["/etc", "/var/www", "/usr/bin"] };
  const set = (p: Partial<VpsSecuritySettings>) => setS({ ...v, ...p });

  async function save() {
    setBusy(true); setMsg("");
    try { const r = await cloudSecurity.update(vpsId, v); setS(r); setMsg("Saved"); }
    catch { setMsg("Save failed"); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-white/60">Web Application Firewall</h3>
          <Toggle checked={v.wafEnabled} onChange={(c) => set({ wafEnabled: c })} label="$10/mo" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Preset rules">
            <select className={input} value={v.wafPreset} onChange={(e) => set({ wafPreset: e.target.value as VpsSecuritySettings["wafPreset"] })}>
              <option value="OWASP">OWASP Top 10</option>
              <option value="WORDPRESS">WordPress</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </Field>
        </div>
        {v.wafPreset === "CUSTOM" && (
          <div className="mt-3">
            <Field label="Custom rules (JSON)">
              <textarea rows={5} className={input} value={typeof v.wafCustomRules === "string" ? v.wafCustomRules : JSON.stringify(v.wafCustomRules ?? [], null, 2)} onChange={(e) => {
                try { set({ wafCustomRules: JSON.parse(e.target.value) }); }
                catch { set({ wafCustomRules: e.target.value }); }
              }} />
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-white/60">DDoS Protection</h3>
          <span className="text-xs text-white/50">Status: <span className="text-emerald-300">Active</span></span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => set({ ddosTier: "BASIC" })} className={`rounded-lg border px-3 py-2 text-sm ${v.ddosTier === "BASIC" ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5"}`}>Basic (free)</button>
          <button onClick={() => set({ ddosTier: "ADVANCED" })} className={`rounded-lg border px-3 py-2 text-sm ${v.ddosTier === "ADVANCED" ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5"}`}>Advanced — $15/mo</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-white/60">File Integrity Monitoring</h3>
          <Toggle checked={v.fimEnabled} onChange={(c) => set({ fimEnabled: c })} label="$5/mo" />
        </div>
        <Field label="Critical paths (one per line)">
          <textarea rows={4} className={input} value={v.fimPaths.join("\n")} onChange={(e) => set({ fimPaths: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} />
        </Field>
        <p className="mt-2 text-xs text-white/50">Alerts are sent on any change under the listed paths.</p>
      </section>

      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Save security settings</button>
        {msg && <span className="self-center text-xs text-emerald-300">{msg}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase text-white/50">{label}</span>
      {children}
    </label>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (c: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!checked)} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${checked ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60"}`}>
      <span className={`inline-block h-3 w-3 rounded-full ${checked ? "bg-emerald-400" : "bg-white/30"}`} />
      {checked ? "Enabled" : "Disabled"}{label && <span className="text-white/40">· {label}</span>}
    </button>
  );
}

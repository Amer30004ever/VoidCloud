/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cloudApi, cloudBackups, cloudSecurity, type CloudDeployment, type VpsCurrentUsage, type VpsBackup, type BackupSchedule, type VpsSecuritySettings } from "@/lib/cloud";
import { VpsStatusBadge } from "@/components/cloud/VpsStatusBadge";
import { VpsTerminal } from "@/components/cloud/VpsTerminal";
import { VpsResizeModal } from "@/components/cloud/VpsResizeModal";

type Tab = "overview" | "usage" | "terminal" | "env" | "domains" | "backups" | "security" | "snapshots" | "apps" | "panel" | "alerts" | "firewall" | "migration" | "activity";
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
          <button onClick={async () => { if (confirm("Delete this VPS? This is irreversible.")) { await cloudApi.deployments.remove(d.id); router.push("/amercloud/dashboard/vps"); } }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      {msg && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <div className="mb-4 flex gap-1 border-b border-white/5 overflow-x-auto">
        {(["overview", "usage", "terminal", "env", "domains", "backups", "snapshots", "apps", "panel", "alerts", "firewall", "activity"] as Tab[]).map((t) => (
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

        {tab === "activity" && (
          <p className="text-sm text-white/60">VPS activity log is coming soon. Account-level audit events live under <span className="text-cyan-300">/amercloud/admin</span>.</p>
        )}
      </div>
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

function SnapshotsTab({ vpsId }: { vpsId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => cloudApi.snapshots.list(vpsId).then(setList).catch(() => {});
  useEffect(() => { refresh(); }, [vpsId]);
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

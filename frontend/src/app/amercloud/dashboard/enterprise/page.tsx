"use client";

import { useEffect, useState } from "react";
import {
  cloudEnterprise,
  type EnterpriseConfig,
  type Soc2Report,
  type TeamMember,
  type ResellerConfig,
  type AutomationApiKey,
} from "@/lib/cloud";

type Tab = "features" | "team" | "reseller" | "api" | "bulk";

export default function EnterprisePage() {
  const [tab, setTab] = useState<Tab>("features");
  const [cfg, setCfg] = useState<EnterpriseConfig | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [reseller, setReseller] = useState<ResellerConfig | null>(null);
  const [keys, setKeys] = useState<AutomationApiKey[]>([]);
  const [soc2, setSoc2] = useState<Soc2Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cloudEnterprise.get(),
      cloudEnterprise.team(),
      cloudEnterprise.reseller(),
      cloudEnterprise.apiKeys(),
    ]).then(([c, t, r, k]) => {
      setCfg(c); setTeam(t); setReseller(r); setKeys(k);
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !cfg || !reseller) {
    return <div className="text-white/60">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Enterprise</h1>
        <p className="text-sm text-white/60">Compliance, team management, white-label and automation.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2 text-sm">
        {([
          ["features", "Features"],
          ["team", "Team"],
          ["reseller", "Reseller"],
          ["api", "API Keys"],
          ["bulk", "Bulk Provision"],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1.5 ${tab === k ? "bg-cyan-500/20 text-cyan-200" : "text-white/60 hover:bg-white/5"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "features" && (
        <FeaturesPanel cfg={cfg} setCfg={setCfg} soc2={soc2} setSoc2={setSoc2} />
      )}
      {tab === "team" && <TeamPanel team={team} setTeam={setTeam} limit={cfg.teamMemberLimit} />}
      {tab === "reseller" && <ResellerPanel reseller={reseller} setReseller={setReseller} />}
      {tab === "api" && <ApiKeysPanel keys={keys} setKeys={setKeys} />}
      {tab === "bulk" && <BulkPanel />}
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2">
      <span>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-white/50">{hint}</div>}
      </span>
      <button onClick={() => onChange(!value)}
        className={`mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${value ? "bg-cyan-500" : "bg-white/10"}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${value ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function FeaturesPanel({ cfg, setCfg, soc2, setSoc2 }: {
  cfg: EnterpriseConfig; setCfg: (c: EnterpriseConfig) => void;
  soc2: Soc2Report | null; setSoc2: (r: Soc2Report) => void;
}) {
  const save = async (patch: Partial<EnterpriseConfig>) => {
    const next = await cloudEnterprise.update(patch);
    setCfg(next);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Plan">
        <div className="space-y-2 text-sm">
          {(["BUSINESS", "ENTERPRISE"] as const).map((p) => (
            <button key={p} onClick={() => save({ plan: p })}
              className={`w-full rounded-lg border p-3 text-start ${cfg.plan === p ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 hover:bg-white/5"}`}>
              <div className="font-semibold">{p === "BUSINESS" ? "Business" : "Enterprise"}</div>
              <div className="text-xs text-white/60">
                {p === "BUSINESS"
                  ? "Up to 10 domains & members, 2h priority support, advanced monitoring."
                  : "Custom SLA up to 99.99%, dedicated 24/7 support, VPC, dedicated HW."}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Compliance">
        <Toggle label="SOC2 compliance reporting" value={cfg.soc2Enabled} onChange={(v) => save({ soc2Enabled: v })} />
        <Toggle label="HIPAA compliance" value={cfg.hipaaEnabled} onChange={(v) => save({ hipaaEnabled: v })}
          hint="Enables BAA, audit logging and encrypted-at-rest defaults." />
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => setSoc2(await cloudEnterprise.soc2Report())}
            disabled={!cfg.soc2Enabled}
            className="rounded-md bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100 disabled:opacity-40">
            Generate SOC2 report
          </button>
        </div>
        {soc2 && (
          <div className="mt-3 rounded-md border border-white/10 bg-slate-950/60 p-3 text-xs">
            <div className="mb-2 text-white/60">Report {soc2.reportId} — {soc2.period}</div>
            <ul className="space-y-1">
              {soc2.controls.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.id} · {c.name}</span>
                  <span className="text-emerald-300">{c.status}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[10px] text-white/40">{soc2.note}</div>
          </div>
        )}
      </Card>

      <Card title="SLA & Support">
        <label className="block text-sm">Custom uptime SLA</label>
        <select value={cfg.customSlaPercent}
          onChange={(e) => save({ customSlaPercent: parseFloat(e.target.value) })}
          className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm">
          <option value={99.9}>99.9%</option>
          <option value={99.95}>99.95%</option>
          <option value={99.99}>99.99%</option>
        </select>
        <Toggle label="Dedicated 24/7 support team" value={cfg.dedicatedSupport} onChange={(v) => save({ dedicatedSupport: v })} />
        <div className="mt-2 text-xs text-white/60">
          Priority response target: <strong>{cfg.supportResponseHours}h</strong>
        </div>
      </Card>

      <Card title="Networking & Hardware">
        <Toggle label="Private networking (VPC)" value={cfg.privateNetworking} onChange={(v) => save({ privateNetworking: v })} />
        {cfg.privateNetworking && (
          <input
            placeholder="10.10.0.0/16"
            defaultValue={cfg.vpcCidr ?? ""}
            onBlur={(e) => save({ vpcCidr: e.target.value || null })}
            className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm" />
        )}
        <Toggle label="Dedicated hardware" value={cfg.dedicatedHardware} onChange={(v) => save({ dedicatedHardware: v })}
          hint="Single-tenant compute nodes for regulated workloads." />
      </Card>

      <Card title="Branding">
        <Toggle label="Custom branding" value={cfg.customBranding} onChange={(v) => save({ customBranding: v })} />
        {cfg.customBranding && (
          <div className="mt-2 space-y-2">
            <input placeholder="Logo URL" defaultValue={cfg.brandLogoUrl ?? ""}
              onBlur={(e) => save({ brandLogoUrl: e.target.value || null })}
              className="w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm" />
            <input placeholder="#0ea5e9" defaultValue={cfg.brandPrimaryColor ?? ""}
              onBlur={(e) => save({ brandPrimaryColor: e.target.value || null })}
              className="w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm" />
          </div>
        )}
      </Card>

      <Card title="Limits">
        <div className="text-sm text-white/70">Custom domains: <strong>{cfg.customDomainLimit}</strong></div>
        <div className="text-sm text-white/70">Team members: <strong>{cfg.teamMemberLimit}</strong></div>
        <Toggle label="Advanced monitoring" value={cfg.advancedMonitoring} onChange={(v) => save({ advancedMonitoring: v })}
          hint="Per-process metrics, anomaly detection, custom dashboards." />
      </Card>
    </div>
  );
}

function TeamPanel({ team, setTeam, limit }: { team: TeamMember[]; setTeam: (m: TeamMember[]) => void; limit: number }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("DEVELOPER");
  const add = async () => {
    if (!email) return;
    const m = await cloudEnterprise.addMember(email, role);
    setTeam([...team, m]); setEmail("");
  };
  const remove = async (id: string) => {
    await cloudEnterprise.removeMember(id);
    setTeam(team.filter((m) => m.id !== id));
  };
  return (
    <Card title={`Team members (${team.length} / ${limit})`}>
      <div className="mb-4 flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
          className="flex-1 rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as TeamMember["role"])}
          className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm">
          {["ADMIN", "DEVELOPER", "BILLING", "VIEWER"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <button onClick={add} disabled={team.length >= limit}
          className="rounded-md bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100 disabled:opacity-40">Invite</button>
      </div>
      <ul className="divide-y divide-white/5">
        {team.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
            <div><div>{m.email}</div><div className="text-xs text-white/50">{m.role} · {m.status}</div></div>
            <button onClick={() => remove(m.id)} className="text-xs text-red-300 hover:underline">Remove</button>
          </li>
        ))}
        {team.length === 0 && <li className="py-3 text-sm text-white/50">No team members yet.</li>}
      </ul>
    </Card>
  );
}

function ResellerPanel({ reseller, setReseller }: { reseller: ResellerConfig; setReseller: (r: ResellerConfig) => void }) {
  const save = async (patch: Partial<ResellerConfig>) => setReseller(await cloudEnterprise.updateReseller(patch));
  return (
    <Card title="Wholesale / Reseller program">
      <Toggle label="Enable white-label hosting" value={reseller.enabled} onChange={(v) => save({ enabled: v })} />
      {reseller.enabled && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <label className="block text-xs text-white/60">Brand name</label>
            <input defaultValue={reseller.brandName ?? ""} onBlur={(e) => save({ brandName: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-white/60">White-label domain</label>
            <input placeholder="panel.yourcompany.com" defaultValue={reseller.whitelabelDomain ?? ""}
              onBlur={(e) => save({ whitelabelDomain: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs text-white/60">Default markup %</label>
            <input type="number" defaultValue={reseller.markupPercent}
              onBlur={(e) => save({ markupPercent: parseInt(e.target.value || "0", 10) })}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" />
          </div>
          <Toggle label="Bulk VPS provisioning via API" value={reseller.bulkProvisioningEnabled}
            onChange={(v) => save({ bulkProvisioningEnabled: v })} />
        </div>
      )}
    </Card>
  );
}

function ApiKeysPanel({ keys, setKeys }: { keys: AutomationApiKey[]; setKeys: (k: AutomationApiKey[]) => void }) {
  const [name, setName] = useState("");
  const create = async () => {
    if (!name) return;
    const k = await cloudEnterprise.createApiKey(name);
    setKeys([...keys, k]); setName("");
  };
  const remove = async (id: string) => {
    await cloudEnterprise.removeApiKey(id);
    setKeys(keys.filter((k) => k.id !== id));
  };
  return (
    <Card title="API keys for automation">
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ci-pipeline"
          className="flex-1 rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm" />
        <button onClick={create} className="rounded-md bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100">Create key</button>
      </div>
      <ul className="divide-y divide-white/5">
        {keys.map((k) => (
          <li key={k.id} className="py-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{k.name}</div>
              <button onClick={() => remove(k.id)} className="text-xs text-red-300 hover:underline">Revoke</button>
            </div>
            <code className="mt-1 block break-all rounded bg-slate-950/80 px-2 py-1 text-[11px] text-emerald-200">{k.token}</code>
            <div className="text-xs text-white/40">Scopes: {k.scopes.join(", ")}</div>
          </li>
        ))}
        {keys.length === 0 && <li className="py-3 text-sm text-white/50">No keys yet.</li>}
      </ul>
    </Card>
  );
}

function BulkPanel() {
  const [planId, setPlanId] = useState("vps-starter");
  const [count, setCount] = useState(5);
  const [prefix, setPrefix] = useState("bulk");
  const [result, setResult] = useState<{ jobId: string; message: string } | null>(null);
  const run = async () => {
    const r = await cloudEnterprise.bulkProvision(planId, count, prefix);
    setResult(r);
  };
  return (
    <Card title="Bulk VPS provisioning">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Plan ID
          <input value={planId} onChange={(e) => setPlanId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" /></label>
        <label className="text-sm">Count
          <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
            className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" /></label>
        <label className="text-sm">Name prefix
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5" /></label>
      </div>
      <button onClick={run} className="mt-3 rounded-md bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100">Provision</button>
      {result && (
        <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Job {result.jobId}: {result.message}
        </div>
      )}
    </Card>
  );
}

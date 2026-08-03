/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cloudApi, type CloudPlan, type OsTemplate } from "@/features/vps/cloud";

type EnvRow = { key: string; value: string };

export default function NewVpsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [templates, setTemplates] = useState<OsTemplate[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("debian-12");
  const [staticIp, setStaticIp] = useState("");
  const [billingMode, setBillingMode] = useState<"PAY_AS_YOU_GO" | "SUBSCRIPTION">("SUBSCRIPTION");

  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [domainsText, setDomainsText] = useState("");
  const [sshKeys, setSshKeys] = useState("");
  const [hostname, setHostname] = useState("");
  const [customDns, setCustomDns] = useState("");
  const [autoSsl, setAutoSsl] = useState(true);
  const [postScript, setPostScript] = useState("");

  useEffect(() => {
    cloudApi.plans.list().then((p) => { setPlans(p); if (p[0]) setPlanId(p[0].id); }).catch(() => {});
    cloudApi.templates.list().then(setTemplates).catch(() => setTemplates([
      { id: "debian-12", label: "Debian 12", proxmoxId: 9101, description: "Lightweight", hasDocker: false },
      { id: "ubuntu-22.04", label: "Ubuntu 22.04", proxmoxId: 9102, description: "With Docker", hasDocker: true },
      { id: "alpine", label: "Alpine Linux", proxmoxId: 9100, description: "Ultra-lightweight", hasDocker: false },
    ]));
  }, []);

  const plan = plans.find((p) => p.id === planId);
  const tpl = templates.find((t) => t.id === templateId);

  async function submit() {
    if (!name.trim() || !plan) { setErr("Name and plan are required"); setStep(1); return; }
    setBusy(true); setErr("");
    try {
      const idempotencyKey = crypto.randomUUID();
      const job = await cloudApi.vps.provision({
        name: name.trim(),
        planSlug: plan.slug,
        staticIp: staticIp.trim() || undefined,
        billingMode,
        idempotencyKey,
      });
      await pollJob(job.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Failed to start VPS provisioning");
    } finally { setBusy(false); }
  }

  // Poll the async provisioning job until it reaches a terminal state, then
  // route to the VPS detail page on success.
  async function pollJob(jobId: string) {
    for (let i = 0; i < 120; i++) {
      const job = await cloudApi.vps.job(jobId).catch(() => null);
      if (!job) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      if (job.status === "SUCCEEDED" && job.vpsId) {
        router.push(`/voidcloud/dashboard/vps/${job.vpsId}`);
        return;
      }
      if (job.status === "FAILED") {
        setErr(job.errorMessage ?? "Provisioning failed");
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setErr("Provisioning is taking longer than expected. Check the VPS list shortly.");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 vc-h1">New VPS</h1>
      <p className="mb-6 text-white/60">Step {step} of 4</p>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="vc-card p-6">
        {err && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic info</h2>
            <Field label="VPS name (required)">
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-vps-01" maxLength={40} />
            </Field>
            <Field label="Plan">
              <select className={input} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.cpuLimit} CPU · {p.memoryLimit}MB RAM · {Math.ceil(p.storageLimit/1024)}GB · ${p.priceUSD}/mo</option>
                ))}
              </select>
            </Field>
            <Field label="Billing mode">
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { value: "SUBSCRIPTION", label: "Subscription", desc: "Flat monthly rate, unlimited runtime while active." },
                  { value: "PAY_AS_YOU_GO", label: "Pay-as-you-go", desc: "Prepaid credits, metered by running time. Auto-stops at zero." },
                ].map((opt) => (
                  <label key={opt.value} className={`cursor-pointer rounded-lg border p-3 ${billingMode === opt.value ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <input type="radio" name="billing" className="sr-only" checked={billingMode === opt.value} onChange={() => setBillingMode(opt.value as any)} />
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-white/60 mt-1">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="OS Template">
              <div className="grid gap-2 md:grid-cols-3">
                {templates.map((t) => (
                  <label key={t.id} className={`cursor-pointer rounded-lg border p-3 ${templateId === t.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <input type="radio" name="tpl" className="sr-only" checked={templateId === t.id} onChange={() => setTemplateId(t.id)} />
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs text-white/60 mt-1">{t.description}</div>
                    {t.hasDocker && <div className="mt-2 text-[10px] uppercase text-cyan-300">Docker preinstalled</div>}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            <p className="text-xs text-white/60">Auto-filled from your selected plan ({plan?.name ?? "—"}).</p>
            <Row k="CPU cores" v={`${plan?.cpuLimit ?? "—"}`} />
            <Row k="RAM" v={`${plan?.memoryLimit ?? "—"} MB`} />
            <Row k="Storage" v={`${plan?.storageLimit ? Math.ceil(plan.storageLimit/1024) : "—"} GB`} />
            <Row k="OS Template" v={tpl?.label ?? "—"} />
          </div>
        )}

        {step === 3 && (
          <Collapsibles
            envRows={envRows} setEnvRows={setEnvRows}
            domainsText={domainsText} setDomainsText={setDomainsText}
            autoSsl={autoSsl} setAutoSsl={setAutoSsl}
            sshKeys={sshKeys} setSshKeys={setSshKeys}
            hostname={hostname} setHostname={setHostname}
            customDns={customDns} setCustomDns={setCustomDns}
            staticIp={staticIp} setStaticIp={setStaticIp}
            postScript={postScript} setPostScript={setPostScript}
          />
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Review</h2>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm space-y-1">
              <Row k="Name" v={name} />
              <Row k="Plan" v={plan?.name ?? "—"} />
              <Row k="OS Template" v={tpl?.label ?? "—"} />
              <Row k="Resources" v={`${plan?.cpuLimit} CPU · ${plan?.memoryLimit}MB · ${plan?.storageLimit ? Math.ceil(plan.storageLimit/1024) : 0}GB`} />
              <Row k="Custom domains" v={domainsText || "—"} />
              <Row k="Env vars" v={`${envRows.filter((r) => r.key).length} defined`} />
              <Row k="SSH keys" v={sshKeys ? `${sshKeys.split(/\n/).filter(Boolean).length} key(s)` : "—"} />
              <Row k="Hostname" v={hostname || name || "—"} />
              <Row k="Static IP" v={staticIp || "auto-assigned"} />
              <Row k="Post-provision script" v={postScript ? "yes" : "—"} />
            </div>
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm">
              <div className="text-xs uppercase text-cyan-300">Estimated cost</div>
              <div className="text-2xl font-bold">${plan?.priceUSD ?? 0}/mo</div>
              <div className="text-xs text-white/60">{plan?.priceEGP ?? 0} EGP/mo</div>
            </div>
            <p className="text-xs text-white/50">
              Provisioning runs asynchronously. After you submit, we&apos;ll watch the job and take you to the new VPS once it&apos;s ready — no need to keep this tab open.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="vc-btn vc-btn-secondary disabled:opacity-30">← Back</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="vc-btn vc-btn-primary">Next →</button>
          ) : (
            <button onClick={submit} disabled={busy} className="vc-btn vc-btn-primary disabled:opacity-50">{busy ? "Provisioning…" : "🚀 Create VPS"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Collapsibles(props: {
  envRows: EnvRow[]; setEnvRows: (r: EnvRow[]) => void;
  domainsText: string; setDomainsText: (s: string) => void;
  autoSsl: boolean; setAutoSsl: (b: boolean) => void;
  sshKeys: string; setSshKeys: (s: string) => void;
  hostname: string; setHostname: (s: string) => void;
  customDns: string; setCustomDns: (s: string) => void;
  staticIp: string; setStaticIp: (s: string) => void;
  postScript: string; setPostScript: (s: string) => void;
}) {
  const { envRows, setEnvRows, domainsText, setDomainsText, autoSsl, setAutoSsl,
    sshKeys, setSshKeys, hostname, setHostname, customDns, setCustomDns,
    staticIp, setStaticIp, postScript, setPostScript } = props;
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Advanced options</h2>

      <Group title="Environment variables">
        <div className="space-y-2">
          {envRows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${input} flex-1`} placeholder="KEY" value={r.key} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], key: e.target.value }; setEnvRows(n); }} />
              <input className={`${input} flex-1`} placeholder="value" value={r.value} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], value: e.target.value }; setEnvRows(n); }} />
              <button onClick={() => setEnvRows(envRows.filter((_, j) => j !== i))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm text-red-300">×</button>
            </div>
          ))}
          <button onClick={() => setEnvRows([...envRows, { key: "", value: "" }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">+ Add variable</button>
        </div>
      </Group>

      <Group title="Custom domains">
        <textarea rows={2} className={input} placeholder="app.example.com, api.example.com" value={domainsText} onChange={(e) => setDomainsText(e.target.value)} />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoSsl} onChange={(e) => setAutoSsl(e.target.checked)} className="accent-cyan-400" />
          Auto-provision SSL via Let&apos;s Encrypt
        </label>
      </Group>

      <Group title="SSH public keys">
        <textarea rows={3} className={input} placeholder="ssh-ed25519 AAAA... user@host" value={sshKeys} onChange={(e) => setSshKeys(e.target.value)} />
      </Group>

      <Group title="Network">
        <Field label="Hostname">
          <input className={input} value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="my-vps-01" />
        </Field>
        <Field label="Static IP (optional, must be within the assigned pool)">
          <input className={input} value={staticIp} onChange={(e) => setStaticIp(e.target.value)} placeholder="10.51.100.42" />
        </Field>
        <Field label="Custom DNS (comma separated)">
          <input className={input} value={customDns} onChange={(e) => setCustomDns(e.target.value)} placeholder="1.1.1.1, 8.8.8.8" />
        </Field>
      </Group>

      <Group title="Post-provision script">
        <textarea rows={4} className={`${input} font-mono`} placeholder="#!/bin/bash&#10;apt-get update -y" value={postScript} onChange={(e) => setPostScript(e.target.value)} />
      </Group>
    </div>
  );
}

const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs uppercase tracking-wide text-white/60">{label}</span>{children}</label>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex border-b border-white/5 py-1.5 text-sm"><div className="w-44 text-white/50">{k}</div><div className="flex-1 font-mono text-white/90">{v}</div></div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="rounded-lg border border-white/10 bg-white/5 p-3">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cloudApi, type CloudPlan, type OsTemplate } from "@/lib/cloud";
import { useLocale } from "@/contexts/LocaleContext";

type EnvRow = { key: string; value: string };

type ControlPanel = { id: string; name: string; description: string; priceUSD: number; defaultPort: number; pathSuffix: string };

export default function NewVpsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [templates, setTemplates] = useState<OsTemplate[]>([]);
  const [panels, setPanels] = useState<ControlPanel[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("debian-12");
  const [panelId, setPanelId] = useState<string>("none");
  const [isCustom, setIsCustom] = useState(false);

  const [customCpu, setCustomCpu] = useState(1);
  const [customRam, setCustomRam] = useState(1024);
  const [customStorage, setCustomStorage] = useState(20);

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
    cloudApi.panels.list().then(setPanels).catch(() => setPanels([
      { id: "none", name: "None", description: "SSH only.", priceUSD: 0, defaultPort: 0, pathSuffix: "" },
      { id: "1panel", name: "1Panel", description: "Modern open-source panel.", priceUSD: 0, defaultPort: 30000, pathSuffix: "/entrance" },
      { id: "cockpit", name: "Cockpit", description: "Server management.", priceUSD: 0, defaultPort: 9090, pathSuffix: "" },
      { id: "cpanel", name: "cPanel", description: "Industry standard.", priceUSD: 15, defaultPort: 2083, pathSuffix: "" },
      { id: "plesk", name: "Plesk", description: "Popular alternative.", priceUSD: 12, defaultPort: 8443, pathSuffix: "" },
      { id: "cyberpanel", name: "CyberPanel", description: "OpenLiteSpeed panel.", priceUSD: 0, defaultPort: 8090, pathSuffix: "" },
    ]));
  }, []);

  const plan = plans.find((p) => p.id === planId);
  const tpl = templates.find((t) => t.id === templateId);
  const panel = panels.find((p) => p.id === panelId);
  const panelExtra = panel?.priceUSD ?? 0;
  
  const effectiveCpu = isCustom ? customCpu : plan?.cpuLimit ?? 1;
  const effectiveRam = isCustom ? customRam : plan?.memoryLimit ?? 1024;
  const effectiveStorage = isCustom ? customStorage * 1024 : plan?.storageLimit ?? 20480;
  
  const customPriceUSD = isCustom ? (customCpu * 5) + (customRam / 1024 * 10) + (customStorage * 0.5) : 0;
  const totalUSD = (isCustom ? customPriceUSD : plan?.priceUSD ?? 0) + panelExtra;

  async function submit() {
    if (busy) return;
    if (!name.trim() || !plan) { setErr(t("vps_new.name_plan_required", "Name and plan are required")); setStep(1); return; }
    setBusy(true); setErr("");
    try {
      const envVars: Record<string, string> = {};
      envRows.forEach((r) => { if (r.key.trim()) envVars[r.key.trim()] = r.value; });
      const customDomains = domainsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const created: any = await cloudApi.deployments.create({
        name: name.trim(),
        type: "DOCKER_IMAGE",
        source: tpl?.label ?? "debian-12",
        cpu: effectiveCpu,
        memory: effectiveRam,
        storage: effectiveStorage,
        replicas: 1,
        customDomains,
        envVars,
      } as any);
      if (panelId && panelId !== "none") {
        try { await cloudApi.panels.install(created.id, panelId); } catch {}
      }
      router.push(`/amercloud/dashboard/vps/${created.id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? t("vps_new.create_failed", "Failed to create VPS"));
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">{t("vps_new.title", "New VPS")}</h1>
      <p className="mb-6 text-white/60">{t("vps_new.step", "Step {{step}} of {{total}}", { step: String(step), total: String(TOTAL_STEPS) })}</p>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        {err && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("vps_new.basic_info", "Basic info")}</h2>
            <Field label={t("vps_new.vps_name", "VPS name (required)")}>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-vps-01" maxLength={40} />
            </Field>
            <Field label={t("vps_new.plan", "Plan")}>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="accent-cyan-400" />
                  <span className="text-sm">{t("vps_new.custom_config", "Custom configuration")}</span>
                </label>
                {!isCustom ? (
                  <select className={input} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.cpuLimit} CPU · {p.memoryLimit}MB RAM · {Math.ceil(p.storageLimit/1024)}GB · ${p.priceUSD}/mo</option>
                    ))}
                  </select>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-white/60">{t("vps_new.cpu_cores", "CPU cores")}</label>
                      <input type="number" min={0.5} step={0.5} className={input} value={customCpu} onChange={(e) => setCustomCpu(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">{t("vps_new.ram_mb", "RAM (MB)")}</label>
                      <input type="number" min={512} step={512} className={input} value={customRam} onChange={(e) => setCustomRam(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">{t("vps_new.storage_gb", "Storage (GB)")}</label>
                      <input type="number" min={10} step={5} className={input} value={customStorage} onChange={(e) => setCustomStorage(Number(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            </Field>
            <Field label={t("vps_new.os_template", "OS Template")}>
              <div className="grid gap-2 md:grid-cols-3">
                {templates.map((tm) => (
                  <label key={tm.id} className={`cursor-pointer rounded-lg border p-3 ${templateId === tm.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <input type="radio" name="tpl" className="sr-only" checked={templateId === tm.id} onChange={() => setTemplateId(tm.id)} />
                    <div className="font-semibold text-sm">{tm.label}</div>
                    <div className="text-xs text-white/60 mt-1">{tm.description}</div>
                    {tm.hasDocker && <div className="mt-2 text-[10px] uppercase text-cyan-300">{t("vps_new.docker_preinstalled", "Docker preinstalled")}</div>}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("vps_new.resources", "Resources")}</h2>
            <p className="text-xs text-white/60">{isCustom ? t("vps_new.custom_resources_hint", "Custom configuration selected.") : t("vps_new.resources_hint", "Auto-filled from your selected plan ({{plan}}).", { plan: plan?.name ?? "—" })}</p>
            <Row k={t("vps_new.cpu_cores", "CPU cores")} v={String(effectiveCpu)} />
            <Row k={t("vps_new.ram", "RAM")} v={`${effectiveRam} MB`} />
            <Row k={t("vps_new.storage", "Storage")} v={`${Math.ceil(effectiveStorage/1024)} GB`} />
            <Row k={t("vps_new.os_template", "OS Template")} v={tpl?.label ?? "—"} />
            {isCustom && (
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm">
                <div className="text-xs text-cyan-300">{t("vps_new.estimated_cost", "Estimated cost")}</div>
                <div className="text-lg font-bold">${customPriceUSD.toFixed(2)}/mo</div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <Collapsibles
            t={t}
            envRows={envRows} setEnvRows={setEnvRows}
            domainsText={domainsText} setDomainsText={setDomainsText}
            autoSsl={autoSsl} setAutoSsl={setAutoSsl}
            sshKeys={sshKeys} setSshKeys={setSshKeys}
            hostname={hostname} setHostname={setHostname}
            customDns={customDns} setCustomDns={setCustomDns}
            postScript={postScript} setPostScript={setPostScript}
          />
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("vps_new.control_panel", "Control Panel")}</h2>
            <p className="text-xs text-white/60">{t("vps_new.control_panel_hint", "Optional. Install a web-based management panel after provisioning. Paid panels add to your monthly bill.")}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {panels.map((p) => (
                <label key={p.id} className={`cursor-pointer rounded-lg border p-3 ${panelId === p.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <input type="radio" name="panel" className="sr-only" checked={panelId === p.id} onChange={() => setPanelId(p.id)} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-white/60 mt-1">{p.description}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-mono ${p.priceUSD > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                      {p.priceUSD > 0 ? `+$${p.priceUSD}/mo` : t("vps_new.free", "Free")}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">{t("vps_new.review", "Review")}</h2>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm space-y-1">
              <Row k={t("common.name", "Name")} v={name} />
              <Row k={t("vps_new.plan", "Plan")} v={isCustom ? t("vps_new.custom", "Custom") : plan?.name ?? "—"} />
              <Row k={t("vps_new.os_template", "OS Template")} v={tpl?.label ?? "—"} />
              <Row k={t("vps_new.resources", "Resources")} v={`${effectiveCpu} CPU · ${effectiveRam}MB · ${Math.ceil(effectiveStorage/1024)}GB`} />
              <Row k={t("vps_new.control_panel", "Control panel")} v={panel ? `${panel.name}${panelExtra > 0 ? ` (+$${panelExtra}/mo)` : ""}` : t("vps_new.none", "None")} />
              <Row k={t("vps_new.custom_domains", "Custom domains")} v={domainsText || "—"} />
              <Row k={t("vps_new.env_vars", "Env vars")} v={t("vps_new.defined", "{{count}} defined", { count: String(envRows.filter((r) => r.key).length) })} />
              <Row k={t("vps_new.ssh_keys", "SSH keys")} v={sshKeys ? t("vps_new.keys_count", "{{count}} key(s)", { count: String(sshKeys.split(/\n/).filter(Boolean).length) }) : "—"} />
              <Row k={t("vps_new.hostname", "Hostname")} v={hostname || name || "—"} />
              <Row k={t("vps_new.post_script", "Post-provision script")} v={postScript ? t("vps_new.yes", "yes") : "—"} />
            </div>
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm">
              <div className="text-xs uppercase text-cyan-300">{t("vps_new.estimated_cost", "Estimated cost")}</div>
              <div className="text-2xl font-bold">${totalUSD.toFixed(2)}/mo</div>
              <div className="text-xs text-white/60">{isCustom ? t("vps_new.custom_pricing", "Custom pricing based on resources") : t("vps_new.egp_base", "{{amount}} EGP/mo (base)", { amount: String(plan?.priceEGP ?? 0) })}{panelExtra > 0 ? t("vps_new.panel_extra", " + ${{amount}}/mo control panel", { amount: String(panelExtra) }) : ""}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-30">← {t("common.back", "Back")}</button>
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(step + 1)} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950">{t("common.next", "Next")} →</button>
          ) : (
            <button onClick={submit} disabled={busy} aria-busy={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy ? t("vps_new.provisioning", "Provisioning…") : t("vps_new.create", "🚀 Create VPS")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Collapsibles(props: {
  t: (key: string, fallback: string, vars?: Record<string, string>) => string;
  envRows: EnvRow[]; setEnvRows: (r: EnvRow[]) => void;
  domainsText: string; setDomainsText: (s: string) => void;
  autoSsl: boolean; setAutoSsl: (b: boolean) => void;
  sshKeys: string; setSshKeys: (s: string) => void;
  hostname: string; setHostname: (s: string) => void;
  customDns: string; setCustomDns: (s: string) => void;
  postScript: string; setPostScript: (s: string) => void;
}) {
  const { t, envRows, setEnvRows, domainsText, setDomainsText, autoSsl, setAutoSsl,
    sshKeys, setSshKeys, hostname, setHostname, customDns, setCustomDns, postScript, setPostScript } = props;
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">{t("vps_new.advanced", "Advanced options")}</h2>

      <Group title={t("vps_new.env_vars", "Environment variables")}>
        <div className="space-y-2">
          {envRows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${input} flex-1`} placeholder="KEY" value={r.key} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], key: e.target.value }; setEnvRows(n); }} />
              <input className={`${input} flex-1`} placeholder="value" value={r.value} onChange={(e) => { const n = [...envRows]; n[i] = { ...n[i], value: e.target.value }; setEnvRows(n); }} />
              <button onClick={() => setEnvRows(envRows.filter((_, j) => j !== i))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm text-red-300">×</button>
            </div>
          ))}
          <button onClick={() => setEnvRows([...envRows, { key: "", value: "" }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">{t("vps_new.add_variable", "+ Add variable")}</button>
        </div>
      </Group>

      <Group title={t("vps_new.custom_domains", "Custom domains")}>
        <textarea rows={2} className={input} placeholder="app.example.com, api.example.com" value={domainsText} onChange={(e) => setDomainsText(e.target.value)} />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoSsl} onChange={(e) => setAutoSsl(e.target.checked)} className="accent-cyan-400" />
          {t("vps_new.auto_ssl", "Auto-provision SSL via Let's Encrypt")}
        </label>
      </Group>

      <Group title={t("vps_new.ssh_keys", "SSH public keys")}>
        <textarea rows={3} className={input} placeholder="ssh-ed25519 AAAA... user@host" value={sshKeys} onChange={(e) => setSshKeys(e.target.value)} />
      </Group>

      <Group title={t("vps_new.network", "Network")}>
        <Field label={t("vps_new.hostname", "Hostname")}>
          <input className={input} value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="my-vps-01" />
        </Field>
        <Field label={t("vps_new.custom_dns", "Custom DNS (comma separated)")}>
          <input className={input} value={customDns} onChange={(e) => setCustomDns(e.target.value)} placeholder="1.1.1.1, 8.8.8.8" />
        </Field>
      </Group>

      <Group title={t("vps_new.post_script", "Post-provision script")}>
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

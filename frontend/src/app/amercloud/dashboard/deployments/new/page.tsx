/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloudApi } from "@/lib/cloud";

export default function NewDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", type: "DOCKER_IMAGE" as "DOCKER_IMAGE" | "GITHUB" | "DOCKER_COMPOSE", source: "",
    cpu: 0.25, memory: 512, storage: 1024, replicas: 1,
    customDomains: [] as string[], envVars: {} as Record<string, string>, healthCheck: "/",
  });
  const [envText, setEnvText] = useState("");
  const [domainsText, setDomainsText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    setBusy(true); setErr("");
    try {
      const envVars: Record<string, string> = {};
      envText.split("\n").forEach((l) => { const [k, ...rest] = l.split("="); if (k.trim()) envVars[k.trim()] = rest.join("=").trim(); });
      const customDomains = domainsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const d = await cloudApi.deployments.create({ ...form, envVars, customDomains });
      router.push(`/amercloud/dashboard/deployments/${d.id}`);
    } catch (e: any) { setErr(e.response?.data?.message ?? "Failed to create"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">New deployment</h1>
      <p className="mb-6 text-white/60">Step {step} of 4</p>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        {err && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Source</h2>
            <Field label="Name"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="my-awesome-app" /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={input}>
                <option value="DOCKER_IMAGE">Docker image</option>
                <option value="GITHUB">GitHub repository</option>
                <option value="DOCKER_COMPOSE">Docker Compose</option>
              </select>
            </Field>
            <Field label={form.type === "GITHUB" ? "GitHub URL" : "Image / source"}>
              <input value={form.source} onChange={(e) => set("source", e.target.value)} className={input} placeholder={form.type === "GITHUB" ? "https://github.com/user/repo" : "nginx:latest"} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            <Field label="CPU (cores)"><input type="number" step="0.25" min="0.25" value={form.cpu} onChange={(e) => set("cpu", +e.target.value)} className={input} /></Field>
            <Field label="Memory (MB)"><input type="number" step="128" value={form.memory} onChange={(e) => set("memory", +e.target.value)} className={input} /></Field>
            <Field label="Storage (MB)"><input type="number" step="1024" value={form.storage} onChange={(e) => set("storage", +e.target.value)} className={input} /></Field>
            <Field label="Replicas"><input type="number" min="1" value={form.replicas} onChange={(e) => set("replicas", +e.target.value)} className={input} /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Environment</h2>
            <Field label="Environment variables (KEY=value per line)">
              <textarea rows={6} value={envText} onChange={(e) => setEnvText(e.target.value)} className={input} placeholder="DATABASE_URL=postgres://...&#10;NODE_ENV=production" />
            </Field>
            <Field label="Custom domains (comma or newline separated)">
              <textarea rows={3} value={domainsText} onChange={(e) => setDomainsText(e.target.value)} className={input} placeholder="app.example.com" />
            </Field>
            <Field label="Health check path"><input value={form.healthCheck} onChange={(e) => set("healthCheck", e.target.value)} className={input} /></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Review</h2>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm">
              <div><b>Name:</b> {form.name}</div>
              <div><b>Type:</b> {form.type}</div>
              <div><b>Source:</b> {form.source}</div>
              <div><b>Resources:</b> {form.cpu} CPU · {form.memory}MB RAM · {form.storage}MB disk · {form.replicas}x</div>
              <div><b>Domains:</b> {domainsText || "(subdomain only)"}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-30">← Back</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950">Next →</button>
          ) : (
            <button onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Deploying…" : "🚀 Deploy"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";
function Field({ label, children }: any) {
  return <label className="block"><span className="mb-1 block text-xs uppercase tracking-wide text-white/60">{label}</span>{children}</label>;
}

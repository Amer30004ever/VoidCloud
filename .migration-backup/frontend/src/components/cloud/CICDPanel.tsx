"use client";
import { useEffect, useState } from "react";
import { cloudCicd, type VpsCicdConfig } from "@/lib/cloud";

const input =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-400/50 outline-none";
const btn = "rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-slate-950";
const ghost = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10";

export function CICDPanel({ vpsId }: { vpsId: string }) {
  const [cfg, setCfg] = useState<VpsCicdConfig | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    cloudCicd.get(vpsId).then(setCfg);
  }, [vpsId]);

  if (!cfg) return <p className="text-sm text-white/50">Loading…</p>;

  const webhookUrl =
    (typeof window !== "undefined" ? window.location.origin : "https://api.voidcloud.com") +
    `/api/public/deploy/${cfg.webhookToken}`;

  const update = async (patch: Partial<VpsCicdConfig>) => {
    setMsg("");
    try {
      const next = await cloudCicd.update(vpsId, patch);
      setCfg(next);
      setMsg("Saved");
    } catch {
      setMsg("Failed to save");
    }
  };

  const regen = async () => {
    if (!confirm("Regenerate webhook URL? Existing CI scripts will stop working.")) return;
    const next = await cloudCicd.regenerate(vpsId);
    setCfg(next);
    setMsg("Webhook regenerated");
  };

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const githubYaml = `name: Deploy to AmerCloud
on:
  push:
    branches: [${cfg.githubBranch || "main"}]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger deploy
        run: |
          curl -X POST "${webhookUrl}" \\
            -H "X-Webhook-Secret: \${{ secrets.AMERCLOUD_WEBHOOK_SECRET }}" \\
            -H "Content-Type: application/json" \\
            -d '{"ref":"\${{ github.sha }}"}'`;

  const gitlabYaml = `deploy:
  stage: deploy
  image: curlimages/curl:latest
  script:
    - |
      curl -X POST "${webhookUrl}" \\
        -H "X-Webhook-Secret: $AMERCLOUD_WEBHOOK_SECRET" \\
        -H "Content-Type: application/json" \\
        -d "{\\"ref\\":\\"$CI_COMMIT_SHA\\"}"
  only:
    - ${cfg.gitlabBranch || "main"}`;

  const curlCmd = `curl -X POST "${webhookUrl}" \\
  -H "X-Webhook-Secret: ${cfg.webhookSecret}" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"main"}'`;

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      {/* GitHub Actions */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-base font-semibold text-white mb-3">GitHub Actions</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/60">Repository (owner/repo)</label>
            <input className={input} placeholder="acme/api"
              value={cfg.githubRepo ?? ""}
              onChange={(e) => setCfg({ ...cfg, githubRepo: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-white/60">Branch</label>
            <input className={input} placeholder="main" value={cfg.githubBranch}
              onChange={(e) => setCfg({ ...cfg, githubBranch: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 text-white/80">
            <input type="checkbox" checked={cfg.autoDeployOnPush}
              onChange={(e) => setCfg({ ...cfg, autoDeployOnPush: e.target.checked })} />
            Auto-deploy on push
          </label>
          <label className="flex items-center gap-2 text-white/80">
            <input type="checkbox" checked={cfg.prPreview}
              onChange={(e) => setCfg({ ...cfg, prPreview: e.target.checked })} />
            Deploy preview for PRs
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btn} onClick={() => update({
            githubRepo: cfg.githubRepo, githubBranch: cfg.githubBranch,
            autoDeployOnPush: cfg.autoDeployOnPush, prPreview: cfg.prPreview,
          })}>Save GitHub config</button>
        </div>
      </section>

      {/* GitLab CI */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-base font-semibold text-white mb-3">GitLab CI</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/60">Repository URL</label>
            <input className={input} placeholder="https://gitlab.com/acme/api"
              value={cfg.gitlabRepo ?? ""}
              onChange={(e) => setCfg({ ...cfg, gitlabRepo: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-white/60">Branch</label>
            <input className={input} placeholder="main" value={cfg.gitlabBranch}
              onChange={(e) => setCfg({ ...cfg, gitlabBranch: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-white/60">Project access token (write_repository)</label>
            <input className={input} type="password" placeholder="glpat-…"
              value={cfg.gitlabToken ?? ""}
              onChange={(e) => setCfg({ ...cfg, gitlabToken: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 text-white/80">
            <input type="checkbox" checked={cfg.gitlabAutoDeploy}
              onChange={(e) => setCfg({ ...cfg, gitlabAutoDeploy: e.target.checked })} />
            Auto-deploy on push
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btn} onClick={() => update({
            gitlabRepo: cfg.gitlabRepo, gitlabBranch: cfg.gitlabBranch,
            gitlabToken: cfg.gitlabToken, gitlabAutoDeploy: cfg.gitlabAutoDeploy,
          })}>Save GitLab config</button>
        </div>
      </section>

      {/* Webhook */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Deploy Webhook</h3>
          <button className={ghost} onClick={regen}>↻ Regenerate</button>
        </div>
        <div className="space-y-2">
          <Row label="Webhook URL" value={webhookUrl} onCopy={() => copy("url", webhookUrl)} copied={copied === "url"} />
          <Row label="Webhook Secret" value={cfg.webhookSecret} onCopy={() => copy("sec", cfg.webhookSecret)} copied={copied === "sec"} mask />
        </div>
        <div className="mt-4 grid gap-3">
          <Snippet title="curl" body={curlCmd} onCopy={() => copy("curl", curlCmd)} copied={copied === "curl"} />
          <Snippet title=".github/workflows/deploy.yml" body={githubYaml} onCopy={() => copy("gh", githubYaml)} copied={copied === "gh"} />
          <Snippet title=".gitlab-ci.yml" body={gitlabYaml} onCopy={() => copy("gl", gitlabYaml)} copied={copied === "gl"} />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, onCopy, copied, mask }: { label: string; value: string; onCopy: () => void; copied: boolean; mask?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 text-xs text-white/60">{label}</div>
      <code className="flex-1 truncate rounded-md bg-black/40 px-2 py-1 text-xs font-mono text-cyan-200">
        {mask ? "•".repeat(Math.min(value.length, 32)) : value}
      </code>
      <button onClick={onCopy} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

function Snippet({ title, body, onCopy, copied }: { title: string; body: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-xs font-mono text-white/60">{title}</span>
        <button onClick={onCopy} className="text-xs text-cyan-300 hover:underline">{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-white/80"><code>{body}</code></pre>
    </div>
  );
}

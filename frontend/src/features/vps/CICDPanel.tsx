"use client";
import { useEffect, useState } from "react";
import { cicdApi, publicApiOrigin, type CicdConfig, type CicdProvider, type DeployRun } from "./devops";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed";

export function CICDPanel({ vpsId }: { vpsId: string }) {
  const [cfg, setCfg] = useState<CicdConfig | null>(null);
  const [runs, setRuns] = useState<DeployRun[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [snippet, setSnippet] = useState<"curl" | "github" | "gitlab">("curl");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const c = await cicdApi.get(vpsId);
      setCfg(c);
      if (c.webhookSecret) setSecret(c.webhookSecret);
      setRuns(await cicdApi.runs(vpsId));
    } catch (e) { setMsg(errMsg(e)); }
  };
  useEffect(() => { void load(); }, [vpsId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cfg) return <p className="text-sm text-white/50">{msg || "Loading CI/CD settings…"}</p>;

  const url = `${publicApiOrigin()}${cfg.webhookPath}`;
  const set = <K extends keyof CicdConfig>(k: K, v: CicdConfig[K]) => setCfg({ ...cfg, [k]: v });

  async function save() {
    if (!cfg) return;
    setBusy(true); setMsg("");
    try {
      const next = await cicdApi.update(vpsId, {
        provider: cfg.provider, repository: cfg.repository || null, autoDeployBranch: cfg.autoDeployBranch,
        autoDeploy: cfg.autoDeploy, prPreview: cfg.prPreview, buildCommand: cfg.buildCommand || null,
        deployCommand: cfg.deployCommand || null, ...(token ? { accessToken: token } : {}),
      });
      setCfg(next); setToken(""); setMsg("CI/CD settings saved");
    } catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); }
  }

  async function regenerate() {
    if (!confirm("Regenerate the webhook? Existing pipelines using the old URL will stop deploying.")) return;
    try { const c = await cicdApi.regenerate(vpsId); setCfg(c); setSecret(c.webhookSecret ?? null); setMsg("Webhook regenerated"); }
    catch (e) { setMsg(errMsg(e)); }
  }

  async function deployNow() {
    try { await cicdApi.deploy(vpsId); setMsg("Deploy queued"); setRuns(await cicdApi.runs(vpsId)); }
    catch (e) { setMsg(errMsg(e)); }
  }

  const snippets = {
    curl: `BODY='{}'\nSIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$DEPLOY_SECRET" | cut -d' ' -f2)\ncurl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Voidcloud-Signature: sha256=$SIG" \\\n  -d "$BODY"`,
    github: `# .github/workflows/deploy.yml\nname: Deploy to Void Cloud\non:\n  push:\n    branches: [${cfg.autoDeployBranch}]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Trigger deploy\n        env:\n          DEPLOY_SECRET: \${{ secrets.VOIDCLOUD_DEPLOY_SECRET }}\n        run: |\n          BODY='{}'\n          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$DEPLOY_SECRET" | cut -d' ' -f2)\n          curl -fsS -X POST "${url}" -H "Content-Type: application/json" -H "X-Voidcloud-Signature: sha256=$SIG" -d "$BODY"`,
    gitlab: `# .gitlab-ci.yml\ndeploy:\n  stage: deploy\n  image: curlimages/curl:latest\n  only: [${cfg.autoDeployBranch}]\n  script:\n    - 'curl -fsS -X POST "${url}" -H "X-Gitlab-Token: $VOIDCLOUD_DEPLOY_SECRET" -H "Content-Type: application/json" -d "{}"'`,
  };

  const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 text-xs text-cyan-100">{msg}</div>}

      <section className="vc-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Source repository</h3>
          <button onClick={deployNow} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/20">Deploy now</button>
        </div>
        <div className="flex gap-2">
          {(["GITHUB", "GITLAB", "NONE"] as CicdProvider[]).map((p) => (
            <button key={p} onClick={() => set("provider", p)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${cfg.provider === p ? "border-cyan-400 bg-cyan-400/15 text-white" : "border-white/10 text-white/60"}`}>
              {p === "GITHUB" ? "GitHub Actions" : p === "GITLAB" ? "GitLab CI" : "Webhook only"}
            </button>
          ))}
        </div>
        {cfg.provider !== "NONE" && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-white/60">Repository (owner/repo)
              <input className={input} value={cfg.repository ?? ""} onChange={(e) => set("repository", e.target.value)} placeholder="acme/api" />
            </label>
            <label className="text-xs text-white/60">Access token {cfg.hasAccessToken && <span className="text-emerald-300">(saved)</span>}
              <input className={input} type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={cfg.hasAccessToken ? "Leave blank to keep" : "Personal access token"} />
            </label>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-white/60">Deploy branch
            <input className={input} value={cfg.autoDeployBranch} onChange={(e) => set("autoDeployBranch", e.target.value)} />
          </label>
          <label className="text-xs text-white/60">Build command
            <input className={input} value={cfg.buildCommand ?? ""} onChange={(e) => set("buildCommand", e.target.value)} placeholder="npm ci && npm run build" />
          </label>
          <label className="text-xs text-white/60">Deploy command
            <input className={input} value={cfg.deployCommand ?? ""} onChange={(e) => set("deployCommand", e.target.value)} placeholder="docker compose up -d" />
          </label>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.autoDeploy} onChange={(e) => set("autoDeploy", e.target.checked)} /> Auto-deploy on push to <code className="text-cyan-300">{cfg.autoDeployBranch}</code></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.prPreview} onChange={(e) => set("prPreview", e.target.checked)} /> Preview deploys for pull requests</label>
        </div>
        <button onClick={save} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
      </section>

      <section className="vc-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Deploy webhook</h3>
          <button onClick={regenerate} className="text-xs text-red-300 hover:text-red-200">Regenerate</button>
        </div>
        <div className="flex gap-2">
          <input readOnly value={url} className={`${input} font-mono text-xs`} />
          <button onClick={() => navigator.clipboard.writeText(url).then(() => setMsg("Webhook URL copied"))} className="rounded-lg border border-white/10 px-3 text-xs">Copy</button>
        </div>
        {secret ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs">
            <p className="mb-1 text-amber-200">Signing secret — shown once. Store it as <code>VOIDCLOUD_DEPLOY_SECRET</code> in your CI.</p>
            <div className="flex gap-2"><code className="flex-1 break-all font-mono">{secret}</code>
              <button onClick={() => navigator.clipboard.writeText(secret).then(() => setMsg("Secret copied"))} className="rounded border border-white/10 px-2">Copy</button></div>
          </div>
        ) : (
          <p className="text-xs text-white/50">The signing secret is hidden. Regenerate to get a new one.</p>
        )}
        <div className="flex gap-1">
          {(["curl", "github", "gitlab"] as const).map((s) => (
            <button key={s} onClick={() => setSnippet(s)} className={`rounded px-3 py-1 text-xs ${snippet === s ? "bg-white/10 text-white" : "text-white/50"}`}>
              {s === "curl" ? "curl" : s === "github" ? "GitHub Actions" : "GitLab CI"}
            </button>
          ))}
        </div>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/80">{snippets[snippet]}</pre>
      </section>

      <section className="vc-card p-4">
        <h3 className="mb-3 font-semibold">Recent deploys</h3>
        {runs.length === 0 ? <p className="text-sm text-white/50">No deploys yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-white/50"><tr><th className="py-1">Status</th><th>Ref</th><th>Commit</th><th>Trigger</th><th>Started</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-1.5">{r.status}</td><td className="font-mono text-xs">{r.ref ?? "—"}</td>
                  <td className="font-mono text-xs">{r.commitSha?.slice(0, 7) ?? "—"}</td><td>{r.trigger}</td>
                  <td className="text-xs text-white/60">{new Date(r.startedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

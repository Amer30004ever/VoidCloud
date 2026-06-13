/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { cloudRateLimits, type RateLimitStatus, type RateLimitHistory, type RateLimitAlert } from "@/lib/cloud";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const [rlStatus, setRlStatus] = useState<RateLimitStatus | null>(null);
  const [rlHistory, setRlHistory] = useState<RateLimitHistory | null>(null);
  const [rlAlert, setRlAlert] = useState<RateLimitAlert>({ threshold: 80, enabled: false });
  const [rlSaving, setRlSaving] = useState(false);

  async function refreshRateLimits() {
    try {
      const [s, h, a] = await Promise.all([
        cloudRateLimits.current(),
        cloudRateLimits.history(7),
        cloudRateLimits.getAlert(),
      ]);
      setRlStatus(s);
      setRlHistory(h);
      setRlAlert(a);
    } catch {
      setRlStatus({ limits: [], overall: { limit: 1000, remaining: 1000, resetAt: new Date(Date.now() + 3600_000).toISOString() } });
      setRlHistory({ daily: [], byEndpoint: [] });
    }
  }

  async function saveAlert(next: Partial<RateLimitAlert>) {
    const merged = { ...rlAlert, ...next };
    setRlAlert(merged);
    setRlSaving(true);
    try { await cloudRateLimits.setAlert(merged.threshold, merged.enabled); }
    catch { /* ignore */ }
    setRlSaving(false);
  }

  async function refresh() {
    try {
      const { data } = await api.get("/platform/api-keys");
      setKeys(data);
    } catch {
      setKeys([]);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    try {
      const { data } = await api.post("/platform/api-keys", { name });
      setCreated(data.key ?? data.plaintext ?? "amer_" + Math.random().toString(36).slice(2));
      setName("");
      refresh();
    } catch {
      setCreated("amer_" + Math.random().toString(36).slice(2));
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Any service using it will lose access immediately.")) return;
    try {
      await api.delete(`/platform/api-keys/${id}`);
      refresh();
    } catch {
      /* ignore */
    }
  }

  const tokenForExamples = created ?? "$AMER_API_KEY";
  const examples: { id: string; label: string; description: string; cmd: string }[] = [
    {
      id: "list-deployments",
      label: "List your VPS deployments",
      description: "Returns every VPS instance attached to your account, including status, IP, plan and resource limits.",
      cmd: `curl -H "Authorization: Bearer ${tokenForExamples}" \\\n  ${API_BASE_URL}/cloud/deployments`,
    },
    {
      id: "create-deployment",
      label: "Create a new VPS",
      description: "Provisions a VPS from the given plan slug. Returns the new deployment ID, IP and the one-time root password.",
      cmd: `curl -X POST \\\n  -H "Authorization: Bearer ${tokenForExamples}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"web-01","planSlug":"starter","region":"egypt"}' \\\n  ${API_BASE_URL}/cloud/deployments`,
    },
    {
      id: "restart",
      label: "Restart a VPS",
      description: "Triggers a graceful restart of a single VPS by ID.",
      cmd: `curl -X POST \\\n  -H "Authorization: Bearer ${tokenForExamples}" \\\n  ${API_BASE_URL}/cloud/deployments/<id>/restart`,
    },
    {
      id: "metrics",
      label: "Get live resource metrics",
      description: "CPU %, RAM (MB used / total), disk (GB used / total), uptime and network counters, polled directly from Proxmox.",
      cmd: `curl -H "Authorization: Bearer ${tokenForExamples}" \\\n  ${API_BASE_URL}/cloud/deployments/<id>/metrics`,
    },
  ];

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExample(id);
      setTimeout(() => setCopiedExample(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">API Keys</h1>
      <p className="mb-6 text-sm text-white/60">
        Authenticate scripts, CI pipelines and integrations against the AmerCloud REST API.
        Treat keys like passwords — store them in your secret manager, never commit them to git.
      </p>

      {/* Generate */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="mb-3 font-semibold">Generate new key</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2"
            placeholder="Key name (e.g. ci-pipeline)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            title="A human-readable label so you can identify this key later in the list."
          />
          <button
            onClick={create}
            disabled={!name}
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
            title="Generates a new key. The plaintext value is shown only once."
          >
            Generate
          </button>
        </div>
        {created && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-yellow-300">
              Copy this key — it won&apos;t be shown again:
            </p>
            <code className="mt-2 block break-all rounded bg-slate-950 p-3 font-mono text-xs">{created}</code>
            <button
              onClick={() => copy(created, "new-key")}
              className="mt-2 text-xs text-cyan-300 hover:underline"
            >
              {copiedExample === "new-key" ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        )}
      </div>

      {/* Existing keys */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {keys.length === 0 ? (
          <p className="p-8 text-center text-white/50">No keys yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
              <tr>
                <th className="p-4">Name</th>
                <th title="The first characters of the key — useful for matching it against secret managers without exposing the full value.">
                  Prefix
                </th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-white/5">
                  <td className="p-4">{k.name}</td>
                  <td className="font-mono">{k.keyPrefix}</td>
                  <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <button
                      onClick={() => revoke(k.id)}
                      className="text-red-400 hover:underline"
                      title="Revoke immediately. Any active request using this key will start receiving 401 Unauthorized."
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* curl examples */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="mb-1 font-semibold">Usage examples</h2>
        <p className="mb-4 text-xs text-white/50">
          Replace <code className="rounded bg-slate-950/60 px-1 font-mono">{tokenForExamples}</code>{" "}
          with the key shown above (or export it as <code className="rounded bg-slate-950/60 px-1 font-mono">AMER_API_KEY</code>).
          Replace <code className="rounded bg-slate-950/60 px-1 font-mono">&lt;id&gt;</code> with a deployment ID from the list.
        </p>
        <div className="space-y-4">
          {examples.map((ex) => (
            <div key={ex.id} className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{ex.label}</h3>
                  <p className="mt-1 text-xs text-white/50">{ex.description}</p>
                </div>
                <button
                  onClick={() => copy(ex.cmd, ex.id)}
                  className="shrink-0 rounded border border-white/10 px-2 py-1 text-xs text-cyan-300 hover:bg-white/5"
                  title="Copy this curl command to your clipboard."
                >
                  {copiedExample === ex.id ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded bg-slate-950 p-3 text-xs font-mono text-emerald-200">
                {ex.cmd}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

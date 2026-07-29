"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApiKeys, type TenantApiKeyItem, type TenantApiKeyCreated } from "@/features/vps/cloud";
import { Button } from "@workspace/ui-kit/button";

const SCOPES = [
  { id: "vps:read", label: "Read VPS", description: "List and view VPS details" },
  { id: "vps:write", label: "Manage VPS", description: "Create, start, stop, restart VPS" },
  { id: "vps:delete", label: "Delete VPS", description: "Remove VPS instances" },
];

export default function DeveloperApiPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["tenant-api-keys"],
    queryFn: () => tenantApiKeys.list(),
  });

  const createKey = useMutation({
    mutationFn: () => tenantApiKeys.create(name, selectedScopes),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setName("");
      setSelectedScopes([]);
      qc.invalidateQueries({ queryKey: ["tenant-api-keys"] });
    },
  });

  const regenerate = useMutation({
    mutationFn: (id: string) => tenantApiKeys.regenerate(id),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      qc.invalidateQueries({ queryKey: ["tenant-api-keys"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => tenantApiKeys.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-api-keys"] });
    },
  });

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AppLayout>
      <PageHeader title="Developer API" description="Manage API tokens for the public VPS REST API." />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Generate API token</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a token with the minimum scopes your use case requires.
          </p>
          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              placeholder="Token name (e.g. cicd-pipeline)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => toggleScope(scope.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    selectedScopes.includes(scope.id)
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  title={scope.description}
                >
                  {scope.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => createKey.mutate()}
              disabled={!name.trim() || selectedScopes.length === 0 || createKey.isPending}
            >
              {createKey.isPending ? "Creating..." : "Create token"}
            </Button>
          </div>
          {createdKey && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-sm font-semibold text-yellow-300">Copy this token now — it won’t be shown again.</p>
              <code className="mt-2 block break-all rounded bg-slate-950 p-3 font-mono text-xs">{createdKey}</code>
              <button
                onClick={() => copy(createdKey)}
                className="mt-2 text-xs text-cyan-300 hover:underline"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Active tokens</h3>
          <div className="mt-3 space-y-3">
            {(keys.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No tokens yet.</p>
            ) : (
              (keys.data as TenantApiKeyItem[]).map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/40 p-4">
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}••••</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(k.scopes ?? []).map((s) => (
                        <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerate.mutate(k.id)}
                      disabled={regenerate.isPending}
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Revoke this token?")) remove.mutate(k.id);
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Usage</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Send the token in the Authorization header. The public API lives under <code className="font-mono">/public/v1/vps</code>.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/80">List VPS</p>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-950 p-3 text-xs font-mono text-emerald-200">
                {`curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:3004/api/v1/public/v1/vps`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Start a VPS</p>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-950 p-3 text-xs font-mono text-emerald-200">
                {`curl -X POST \\
  -H "Authorization: Bearer $TOKEN" \\
  http://localhost:3004/api/v1/public/v1/vps/<id>/start`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

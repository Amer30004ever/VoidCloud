"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface BusinessProfile {
  name: string;
  subdomain: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
}

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-blue-400/50";

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile>({ name: "", subdomain: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"profile" | "notifications" | "api">("profile");
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key: string; createdAt: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    api.get("/business/settings").then((r) => setProfile(r.data ?? {})).catch(() => {}).finally(() => setLoading(false));
    api.get("/business/api-keys").then((r) => setApiKeys(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/business/settings", profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  async function createApiKey() {
    if (!newKeyName) { alert("Key name required"); return; }
    const r = await api.post("/business/api-keys", { name: newKeyName });
    setCreatedKey(r.data?.key ?? null);
    setNewKeyName("");
    const updated = await api.get("/business/api-keys").catch(() => null);
    if (updated) setApiKeys(Array.isArray(updated.data) ? updated.data : []);
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key?")) return;
    await api.delete(`/business/api-keys/${id}`);
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/40">Business profile, notifications, and API access</p>
      </div>

      {saved && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">✓ Settings saved</div>}

      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {(["profile", "notifications", "api"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold">Business Profile</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Business Name</label>
                  <input className={inp} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Subdomain</label>
                  <div className="relative">
                    <input className={inp} value={profile.subdomain} onChange={(e) => setProfile({ ...profile, subdomain: e.target.value })} placeholder="acme" />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs text-white/30">.voidcloud.cc.cd</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Contact Email</label>
                  <input className={inp} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Phone</label>
                  <input className={inp} value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Website</label>
                  <input className={inp} type="url" value={profile.website ?? ""} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://yourbusiness.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Address</label>
                  <input className={inp} value={profile.address ?? ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={save} disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "notifications" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          {[
            { label: "New conversation assigned", desc: "When a conversation is assigned to your team" },
            { label: "New lead created", desc: "When a new lead enters your CRM" },
            { label: "VPS status change", desc: "When a VPS starts, stops, or fails" },
            { label: "Invoice generated", desc: "When a new invoice is created" },
            { label: "Team member joined", desc: "When someone accepts an invitation" },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{n.label}</p>
                <p className="text-xs text-white/40">{n.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="h-5 w-9 rounded-full bg-white/10 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white/50 after:transition peer-checked:bg-blue-500/60 peer-checked:after:translate-x-4 peer-checked:after:bg-white" />
              </label>
            </div>
          ))}
        </div>
      )}

      {tab === "api" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold">API Keys</h2>
            <div className="mb-4 flex gap-2">
              <input className={`flex-1 ${inp}`} placeholder="Key name (e.g. Webhook integration)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
              <button onClick={createApiKey} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white">Create</button>
            </div>
            {createdKey && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
                <p className="font-semibold text-emerald-300 mb-1">⚠ Copy this key — it won&#39;t be shown again:</p>
                <code className="font-mono text-xs text-emerald-200 break-all">{createdKey}</code>
              </div>
            )}
            <div className="space-y-2">
              {apiKeys.length === 0 ? (
                <p className="text-sm text-white/40">No API keys yet</p>
              ) : apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{k.name}</p>
                    <p className="font-mono text-xs text-white/40">{k.key ? `${k.key.slice(0, 8)}…` : "••••••••"}</p>
                    <p className="text-xs text-white/30">Created {new Date(k.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => revokeKey(k.id)} className="rounded-lg border border-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10">Revoke</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

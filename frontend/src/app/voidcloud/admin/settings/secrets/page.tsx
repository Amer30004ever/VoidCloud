"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { KeyRound, Trash2, Eye, Plus } from "lucide-react";

type SecretEntry = {
  id: string;
  key: string;
  description: string | null;
  maskedValue: string;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminSecretsPage() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: SecretEntry[] }>("/monitoring/secrets");
      setSecrets(data.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reveal = async (id: string) => {
    try {
      const { data } = await api.get<{ plainValue: string }>(`/monitoring/secrets/${id}/reveal`);
      setRevealed((p) => ({ ...p, [id]: data.plainValue }));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? "Reveal failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this secret?")) return;
    try {
      await api.delete(`/monitoring/secrets/${id}`);
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? "Delete failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey || !formValue) return;
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/monitoring/secrets/${editId}`, {
          value: formValue,
          description: formDescription,
        });
      } else {
        await api.post("/monitoring/secrets", {
          key: formKey,
          value: formValue,
          description: formDescription,
        });
      }
      setFormKey("");
      setFormValue("");
      setFormDescription("");
      setEditId(null);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s: SecretEntry) => {
    setEditId(s.id);
    setFormKey(s.key);
    setFormValue("");
    setFormDescription(s.description ?? "");
    setShowForm(true);
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditId(null);
    setFormKey("");
    setFormValue("");
    setFormDescription("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vc-h1">Platform Secrets</h1>
          <p className="mt-1 text-sm text-white/60">Runtime secrets (SMTP passwords, API keys, etc.) encrypted at rest.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="vc-btn vc-btn-secondary hover:bg-white/10"
          >
            <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Secret</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="space-y-4 vc-card p-6">
          <h2 className="text-lg font-semibold">{editId ? "Edit Secret" : "New Secret"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-white/60">Key</label>
              <input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                disabled={!!editId}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                placeholder="e.g. smtp_pass"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60">Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/60">Value</label>
            <input
              type="password"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="Plaintext secret value"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="vc-btn vc-btn-secondary hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <section className="vc-card p-6">
        {loading ? (
          <p className="py-6 text-center text-sm text-white/50">Loading secrets…</p>
        ) : secrets.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">No platform secrets configured.</p>
        ) : (
          <div className="space-y-3">
            {secrets.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">{s.key}</span>
                    {s.description && (
                      <span className="text-xs text-white/50">• {s.description}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {revealed[s.id] ? (
                      <span className="font-mono text-green-300">{revealed[s.id]}</span>
                    ) : (
                      <span>{s.maskedValue || "••••"}</span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    Updated: {new Date(s.updatedAt).toLocaleString()}
                    {s.lastRotatedAt && ` • Last rotated: ${new Date(s.lastRotatedAt).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => reveal(s.id)}
                    className="rounded-md border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                    title="Reveal"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(s)}
                    className="rounded-md border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                    title="Edit"
                  >
                    <span className="text-xs">Edit</span>
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  updates: Array<{ id: string; message: string; status: string; createdAt: string }>;
};

type Severity = "DEGRADED" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE";
type Status = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [form, setForm] = useState({ title: "", description: "", severity: "DEGRADED" as Severity });
  const [selected, setSelected] = useState<Incident | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateStatus, setUpdateStatus] = useState<Status>("INVESTIGATING");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { const { data } = await api.get("/monitoring/incidents"); setIncidents(data || []); } catch { setIncidents([]); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.description) return;
    setBusy(true); setMsg(null);
    try {
      await api.post("/monitoring/incidents", form);
      setForm({ title: "", description: "", severity: "DEGRADED" });
      setMsg({ kind: "ok", text: "Incident created" });
      refresh();
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  async function postUpdate() {
    if (!selected || !updateText) return;
    setBusy(true); setMsg(null);
    try {
      await api.post(`/monitoring/incidents/${selected.id}/updates`, { message: updateText, status: updateStatus });
      setUpdateText(""); setSelected(null); setMsg({ kind: "ok", text: "Update posted" });
      refresh();
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Incident Management</h1>
      {msg && <div className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Create Incident</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Severity</label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <option value="DEGRADED">Degraded</option>
              <option value="PARTIAL_OUTAGE">Partial Outage</option>
              <option value="MAJOR_OUTAGE">Major Outage</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        </div>
        <button disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Create Incident</button>
      </form>

      <div className="space-y-3">
        {incidents.map((inc) => (
          <div key={inc.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{inc.title}</h3>
                <p className="text-sm text-white/60">{inc.description}</p>
              </div>
              <div className="flex gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs ${inc.severity === 'MAJOR_OUTAGE' ? 'border-red-500/30 bg-red-500/10 text-red-300' : inc.severity === 'PARTIAL_OUTAGE' ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>{inc.severity}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60">{inc.status}</span>
              </div>
            </div>

            {inc.updates?.length > 0 && (
              <div className="mt-4 space-y-2">
                {inc.updates.map((u) => (
                  <div key={u.id} className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{new Date(u.createdAt).toLocaleString()}</span>
                      <span className="text-xs text-cyan-300">{u.status}</span>
                    </div>
                    <p className="mt-1 text-white/80">{u.message}</p>
                  </div>
                ))}
              </div>
            )}

            {inc.status !== 'RESOLVED' && (
              <div className="mt-4 flex gap-2">
                <input value={selected?.id === inc.id ? updateText : ""} onChange={(e) => { setSelected(inc); setUpdateText(e.target.value); }} placeholder="Post an update..." className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value as Status)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm">
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="IDENTIFIED">Identified</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <button onClick={postUpdate} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Post</button>
              </div>
            )}
          </div>
        ))}
        {incidents.length === 0 && <p className="text-center text-white/50 py-8">No incidents.</p>}
      </div>
    </div>
  );
}

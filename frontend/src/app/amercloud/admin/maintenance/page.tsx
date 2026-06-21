"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud";

const SERVICES = ["VPS", "API", "Dashboard", "Billing"];
const MAINT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const INCIDENT_STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"];
const SEVERITIES = ["DEGRADED", "PARTIAL_OUTAGE", "MAJOR_OUTAGE"];

export default function MaintenanceAdminPage() {
  const [tab, setTab] = useState<"maintenance" | "incidents">("maintenance");
  const [maint, setMaint] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", affectedServices: [] as string[], startAt: "", endAt: "" });
  const [iForm, setIForm] = useState({ title: "", description: "", severity: "DEGRADED" });

  const refresh = useCallback(async () => {
    const [m, i] = await Promise.all([cloudApi.admin.maintenance.list(), cloudApi.admin.incidents.list()]);
    setMaint(m); setIncidents(i);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submitMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    await cloudApi.admin.maintenance.create({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() });
    setForm({ title: "", description: "", affectedServices: [], startAt: "", endAt: "" });
    refresh();
  };

  const submitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    await cloudApi.admin.incidents.create(iForm);
    setIForm({ title: "", description: "", severity: "DEGRADED" });
    refresh();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintenance & Incidents</h1>
        <div className="flex gap-2">
          {(["maintenance", "incidents"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "maintenance" && (
        <>
          <form onSubmit={submitMaint} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Schedule maintenance</h2>
            <input className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Title"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <textarea className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Description"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <label key={s} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.affectedServices.includes(s)}
                    onChange={(e) => setForm({ ...form, affectedServices: e.target.checked ? [...form.affectedServices, s] : form.affectedServices.filter(x => x !== s) })} />
                  {s}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="datetime-local" required value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })}
                className="rounded border border-border bg-background px-3 py-2 text-sm" />
              <input type="datetime-local" required value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })}
                className="rounded border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Schedule</button>
          </form>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Maintenance windows</h2>
            <ul className="space-y-2">
              {maint.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded border border-border p-3">
                  <div>
                    <div className="font-medium">{m.title} <span className="text-xs text-muted-foreground">({m.status})</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(m.startAt).toLocaleString()} → {new Date(m.endAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={m.status}
                      onChange={async (e) => { await cloudApi.admin.maintenance.update(m.id, { status: e.target.value }); refresh(); }}>
                      {MAINT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={async () => { await cloudApi.admin.maintenance.remove(m.id); refresh(); }}
                      className="rounded border border-border px-2 py-1 text-xs">Delete</button>
                  </div>
                </li>
              ))}
              {maint.length === 0 && <li className="text-sm text-muted-foreground">No maintenance scheduled.</li>}
            </ul>
          </div>
        </>
      )}

      {tab === "incidents" && (
        <>
          <form onSubmit={submitIncident} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Report incident</h2>
            <input className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Title"
              value={iForm.title} onChange={e => setIForm({ ...iForm, title: e.target.value })} required />
            <textarea className="w-full rounded border border-border bg-background px-3 py-2 text-sm" placeholder="Description"
              value={iForm.description} onChange={e => setIForm({ ...iForm, description: e.target.value })} required />
            <select value={iForm.severity} onChange={e => setIForm({ ...iForm, severity: e.target.value })}
              className="rounded border border-border bg-background px-3 py-2 text-sm">
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Create incident</button>
          </form>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Incidents</h2>
            <ul className="space-y-3">
              {incidents.map((i: any) => (
                <li key={i.id} className="rounded border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{i.title}</div>
                      <div className="text-xs text-muted-foreground">{i.severity} · {i.status} · {new Date(i.createdAt).toLocaleString()}</div>
                    </div>
                    {i.status !== "RESOLVED" && (
                      <button onClick={async () => { await cloudApi.admin.incidents.resolve(i.id); refresh(); }}
                        className="rounded border border-border px-2 py-1 text-xs">Resolve</button>
                    )}
                  </div>
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await cloudApi.admin.incidents.addUpdate(i.id, { message: String(fd.get("m")), status: String(fd.get("s")) });
                      (e.currentTarget as HTMLFormElement).reset();
                      refresh();
                    }} className="mt-2 flex flex-wrap gap-2">
                    <input name="m" placeholder="Update message" required
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs" />
                    <select name="s" className="rounded border border-border bg-background px-2 py-1 text-xs" defaultValue="MONITORING">
                      {INCIDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Add update</button>
                  </form>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {i.updates?.map((u: any) => (
                      <li key={u.id}><b>{u.status}</b> {new Date(u.createdAt).toLocaleString()} — {u.message}</li>
                    ))}
                  </ul>
                </li>
              ))}
              {incidents.length === 0 && <li className="text-sm text-muted-foreground">No incidents recorded.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

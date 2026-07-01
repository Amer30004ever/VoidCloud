"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud";

const SERVICES = ["VPS", "API", "Dashboard", "Billing", "WhatsApp", "Auth", "Email"];
const MAINT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const INCIDENT_STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"];
const SEVERITIES = ["DEGRADED", "PARTIAL_OUTAGE", "MAJOR_OUTAGE"];

interface MaintenanceBanner { active: boolean; message: string; startedAt: string | null; endEta: string | null; affectedServices: string[] }

export default function MaintenanceAdminPage() {
  const [tab, setTab] = useState<"banner" | "maintenance" | "incidents">("banner");

  /* ── Global banner ───────────────────────────────── */
  const [banner, setBanner] = useState<MaintenanceBanner>({ active: false, message: "", startedAt: null, endEta: null, affectedServices: [] });
  const [bannerMsg, setBannerMsg] = useState("We are performing scheduled maintenance. Services will be restored shortly.");
  const [bannerEta, setBannerEta] = useState("");
  const [bannerServices, setBannerServices] = useState<string[]>([]);
  const [toggling, setToggling] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);

  const fetchBanner = useCallback(async () => {
    try {
      const r = await fetch("/api/maintenance");
      const d = await r.json();
      setBanner(d);
      setBannerMsg(d.message || "");
      setBannerEta(d.endEta || "");
      setBannerServices(d.affectedServices || []);
    } catch { /**/ }
  }, []);

  async function toggleBanner() {
    setToggling(true);
    try {
      const r = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !banner.active, message: bannerMsg, endEta: bannerEta, affectedServices: bannerServices }),
      });
      const d = await r.json();
      setBanner(d.state);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2500);
    } catch { /**/ } finally { setToggling(false); }
  }

  async function saveBannerConfig() {
    setToggling(true);
    try {
      const r = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: banner.active, message: bannerMsg, endEta: bannerEta, affectedServices: bannerServices }),
      });
      const d = await r.json();
      setBanner(d.state);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2500);
    } catch { /**/ } finally { setToggling(false); }
  }

  /* ── Maintenance windows ─────────────────────────── */
  const [maint, setMaint] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", affectedServices: [] as string[], startAt: "", endAt: "" });
  const [iForm, setIForm] = useState({ title: "", description: "", severity: "DEGRADED" });

  const refresh = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([cloudApi.admin.maintenance.list(), cloudApi.admin.incidents.list()]);
      setMaint(Array.isArray(m) ? m : []);
      setIncidents(Array.isArray(i) ? i : []);
    } catch { /**/ }
  }, []);

  useEffect(() => { fetchBanner(); refresh(); }, [fetchBanner, refresh]);

  async function createMaint() {
    try { await cloudApi.admin.maintenance.create(form); setForm({ title: "", description: "", affectedServices: [], startAt: "", endAt: "" }); refresh(); }
    catch { /**/ }
  }
  async function updateMaint(id: string, status: string) {
    try { await cloudApi.admin.maintenance.update(id, { status }); refresh(); }
    catch { /**/ }
  }
  async function createIncident() {
    try { await cloudApi.admin.incidents.create(iForm); setIForm({ title: "", description: "", severity: "DEGRADED" }); refresh(); }
    catch { /**/ }
  }
  async function updateIncident(id: string, status: string) {
    try { await cloudApi.admin.incidents.update(id, { status }); refresh(); }
    catch { /**/ }
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/40";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-white">Maintenance & Incidents</h1>
        <p className="mt-1 text-sm text-white/40">Global banner · scheduled maintenance · incident tracking</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {(["banner", "maintenance", "incidents"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            {t === "banner" ? "🔴 Global Banner" : t === "maintenance" ? "🔧 Maintenance Windows" : "🚨 Incidents"}
          </button>
        ))}
      </div>

      {/* ── Global Banner tab ── */}
      {tab === "banner" && (
        <div className="space-y-5">
          {/* Live preview */}
          {banner.active && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-semibold text-red-200">🔴 Maintenance mode is ACTIVE</p>
                <span className="ml-auto text-xs text-red-300/60">{banner.startedAt ? `Since ${new Date(banner.startedAt).toLocaleTimeString()}` : ""}</span>
              </div>
              {banner.message && <p className="mt-2 text-sm text-red-100/70 pl-5">{banner.message}</p>}
              {banner.affectedServices?.length > 0 && (
                <div className="mt-2 pl-5 flex flex-wrap gap-1">
                  {banner.affectedServices.map((s) => <span key={s} className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">{s}</span>)}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Platform-wide Maintenance Banner</h2>
                <p className="text-xs text-white/40 mt-0.5">Shows a banner to ALL users across every portal when active</p>
              </div>
              <button onClick={toggleBanner} disabled={toggling}
                className={`relative inline-flex h-7 w-14 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${banner.active ? "bg-red-500" : "bg-white/10"} disabled:opacity-50`}>
                <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform duration-200 ${banner.active ? "translate-x-7" : "translate-x-0"}`} />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/40">Banner Message</label>
              <textarea value={bannerMsg} onChange={(e) => setBannerMsg(e.target.value)} rows={3}
                className={inputCls + " resize-none"} placeholder="We are performing scheduled maintenance. Services will be restored shortly." />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/40">ETA / Expected End Time</label>
                <input type="datetime-local" value={bannerEta} onChange={(e) => setBannerEta(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/40">Affected Services</label>
                <div className="flex flex-wrap gap-1">
                  {SERVICES.map((s) => (
                    <label key={s} className={`cursor-pointer rounded-lg border px-2 py-1 text-xs transition ${bannerServices.includes(s) ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40"}`}>
                      <input type="checkbox" className="sr-only" checked={bannerServices.includes(s)}
                        onChange={(e) => setBannerServices((ss) => e.target.checked ? [...ss, s] : ss.filter((x) => x !== s))} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={saveBannerConfig} disabled={toggling}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                {toggling ? "Saving…" : banner.active ? "Update Live Banner" : "Save & Activate Banner"}
              </button>
              {banner.active && (
                <button onClick={toggleBanner} disabled={toggling}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
                  Deactivate
                </button>
              )}
            </div>
            {bannerSaved && <p className="text-sm text-emerald-400 text-center">✅ Saved successfully</p>}
          </div>
        </div>
      )}

      {/* ── Maintenance Windows tab ── */}
      {tab === "maintenance" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="font-semibold text-white">Create Maintenance Window</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-white/40">Title</label>
                <input className={inputCls} placeholder="Database migration - v2.5" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-white/40">Description</label>
                <textarea className={inputCls + " resize-none"} rows={2} placeholder="Details…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/40">Start Time</label>
                <input type="datetime-local" className={inputCls} value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/40">End Time</label>
                <input type="datetime-local" className={inputCls} value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-white/40">Affected Services</label>
                <div className="flex flex-wrap gap-1">
                  {SERVICES.map((s) => (
                    <label key={s} className={`cursor-pointer rounded-lg border px-2 py-1 text-xs transition ${form.affectedServices.includes(s) ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40"}`}>
                      <input type="checkbox" className="sr-only" checked={form.affectedServices.includes(s)}
                        onChange={(e) => setForm((f) => ({ ...f, affectedServices: e.target.checked ? [...f.affectedServices, s] : f.affectedServices.filter((x) => x !== s) }))} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={createMaint} disabled={!form.title || !form.startAt}
              className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              Schedule
            </button>
          </div>

          <div className="space-y-2">
            {maint.length === 0 && <p className="text-sm text-white/30 text-center py-6">No scheduled maintenance windows</p>}
            {maint.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{m.title}</p>
                  <p className="text-xs text-white/40">{m.startAt ? new Date(m.startAt).toLocaleString() : "—"} → {m.endAt ? new Date(m.endAt).toLocaleString() : "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/50">{m.status ?? "SCHEDULED"}</span>
                  {MAINT_STATUSES.filter((s) => s !== m.status).map((s) => (
                    <button key={s} onClick={() => updateMaint(m.id, s)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:text-white">{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Incidents tab ── */}
      {tab === "incidents" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="font-semibold text-white">Report Incident</h2>
            <div>
              <label className="mb-1 block text-xs text-white/40">Title</label>
              <input className={inputCls} placeholder="API latency spike" value={iForm.title} onChange={(e) => setIForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">Description</label>
              <textarea className={inputCls + " resize-none"} rows={2} value={iForm.description} onChange={(e) => setIForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">Severity</label>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <button key={s} onClick={() => setIForm((f) => ({ ...f, severity: s }))}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${iForm.severity === s ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40"}`}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={createIncident} disabled={!iForm.title}
              className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              Report Incident
            </button>
          </div>

          <div className="space-y-2">
            {incidents.length === 0 && <p className="text-sm text-white/30 text-center py-6">No active incidents</p>}
            {incidents.map((inc: any) => (
              <div key={inc.id} className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{inc.title}</p>
                  <p className="text-xs text-white/40">{inc.severity} · {new Date(inc.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-red-500/20 px-2 py-0.5 text-[10px] text-red-300">{inc.status}</span>
                  {INCIDENT_STATUSES.filter((s) => s !== inc.status).map((s) => (
                    <button key={s} onClick={() => updateIncident(inc.id, s)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:text-white">{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

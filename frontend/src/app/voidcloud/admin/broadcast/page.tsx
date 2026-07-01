"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Template { id: string; name: string; body: string; language: string; status: "approved" | "pending" | "rejected" }
interface Tenant { id: string; name: string; plan: string; whatsappConnected: boolean; contactCount: number }
interface BroadcastJob { id: string; name: string; sentAt: string; total: number; delivered: number; failed: number; status: "completed" | "running" | "failed" }

const MOCK_TEMPLATES: Template[] = [
  { id: "t1", name: "welcome_message", body: "Welcome to VoidCloud, {{1}}! Your account is ready. Visit {{2}} to get started.", language: "en", status: "approved" },
  { id: "t2", name: "invoice_ready", body: "Hello {{1}}, your invoice for {{2}} is ready. Amount: {{3}}. Pay at: {{4}}", language: "en", status: "approved" },
  { id: "t3", name: "maintenance_alert", body: "🔧 Scheduled maintenance on {{1}} from {{2}} to {{3}}. Services may be temporarily unavailable.", language: "en", status: "approved" },
  { id: "t4", name: "renewal_reminder", body: "Your VoidCloud plan expires in {{1}} days. Renew now at {{2}} to avoid interruption.", language: "en", status: "approved" },
];
const MOCK_TENANTS: Tenant[] = [
  { id: "t1", name: "Acme Corp", plan: "Enterprise", whatsappConnected: true, contactCount: 128 },
  { id: "t2", name: "TechStart Ltd", plan: "Pro", whatsappConnected: true, contactCount: 45 },
  { id: "t3", name: "Digital Agency", plan: "Business", whatsappConnected: false, contactCount: 0 },
  { id: "t4", name: "ShopPlus", plan: "Starter", whatsappConnected: true, contactCount: 12 },
];
const MOCK_JOBS: BroadcastJob[] = [
  { id: "j1", name: "July Invoice Reminder", sentAt: "2026-07-01T09:00:00Z", total: 185, delivered: 181, failed: 4, status: "completed" },
  { id: "j2", name: "Maintenance Alert - Q2", sentAt: "2026-06-15T10:00:00Z", total: 185, delivered: 179, failed: 6, status: "completed" },
];

export default function BroadcastPage() {
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [jobs, setJobs] = useState<BroadcastJob[]>(MOCK_JOBS);
  const [loading, setLoading] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [segment, setSegment] = useState<"all" | "plan" | "manual">("all");
  const [segmentPlan, setSegmentPlan] = useState("Pro");
  const [params, setParams] = useState<string[]>([]);
  const [broadcastName, setBroadcastName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tmpl, ten, hist] = await Promise.allSettled([
        api.get("/whatsapp/admin/templates"),
        api.get("/admin/tenants?limit=100"),
        api.get("/whatsapp/admin/broadcasts?limit=20"),
      ]);
      if (tmpl.status === "fulfilled" && tmpl.value.data?.length) setTemplates(tmpl.value.data);
      if (ten.status === "fulfilled" && ten.value.data?.tenants?.length) setTenants(ten.value.data.tenants);
      if (hist.status === "fulfilled" && hist.value.data?.length) setJobs(hist.value.data);
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedTemplate) { setParams([]); return; }
    const count = (selectedTemplate.body.match(/\{\{\d+\}\}/g) ?? []).length;
    setParams(Array(count).fill(""));
  }, [selectedTemplate]);

  function resolveTargets(): Tenant[] {
    const connected = tenants.filter((t) => t.whatsappConnected);
    if (segment === "all") return connected;
    if (segment === "plan") return connected.filter((t) => t.plan === segmentPlan);
    return connected.filter((t) => selectedTenants.has(t.id));
  }

  const targets = resolveTargets();
  const totalContacts = targets.reduce((s, t) => s + t.contactCount, 0);

  function previewBody() {
    if (!selectedTemplate) return "";
    let body = selectedTemplate.body;
    params.forEach((p, i) => { body = body.replace(`{{${i + 1}}}`, p || `{{${i + 1}}}`); });
    return body;
  }

  async function sendBroadcast() {
    if (!selectedTemplate || targets.length === 0) return;
    setSending(true); setSendResult(null);
    try {
      const res = await api.post("/whatsapp/admin/broadcast", {
        name: broadcastName || `Broadcast ${new Date().toLocaleDateString()}`,
        templateId: selectedTemplate.id,
        params,
        tenantIds: targets.map((t) => t.id),
      });
      setSendResult(`✅ Broadcast queued: ${res.data?.jobId ?? "job created"}`);
      fetchData();
    } catch (e: unknown) {
      setSendResult(`❌ Error: ${(e as { message?: string })?.message ?? "unknown"}`);
    } finally { setSending(false); }
  }

  const connectedCount = tenants.filter((t) => t.whatsappConnected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp Broadcast Center</h1>
          <p className="mt-1 text-sm text-white/40">Send templated messages to tenants · segments · all contacts</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40">
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">📱</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{connectedCount}</div>
          <div className="text-xs text-white/40">Tenants with WhatsApp</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">👥</div>
          <div className="text-3xl font-bold text-white mt-1">{tenants.reduce((s, t) => s + t.contactCount, 0)}</div>
          <div className="text-xs text-white/40">Total contacts across tenants</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">📤</div>
          <div className="text-3xl font-bold text-cyan-400 mt-1">{jobs.length}</div>
          <div className="text-xs text-white/40">Broadcasts sent</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Compose */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h2 className="font-semibold text-white">Compose Broadcast</h2>

          <div>
            <label className="mb-1 block text-xs text-white/40">Broadcast Name</label>
            <input value={broadcastName} onChange={(e) => setBroadcastName(e.target.value)}
              placeholder="e.g. July Maintenance Alert"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/40" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/40">Template</label>
            <div className="space-y-1.5">
              {templates.filter((t) => t.status === "approved").map((t) => (
                <label key={t.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${selectedTemplate?.id === t.id ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}>
                  <input type="radio" name="template" onChange={() => setSelectedTemplate(t)} className="mt-0.5" checked={selectedTemplate?.id === t.id} />
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{t.body}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedTemplate && params.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-white/40">Template Variables</label>
              <div className="space-y-2">
                {params.map((p, i) => (
                  <input key={i} value={p} onChange={(e) => setParams((ps) => { const n = [...ps]; n[i] = e.target.value; return n; })}
                    placeholder={`Variable ${i + 1}`}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-amber-400/40" />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs text-white/40">Target Segment</label>
            <div className="flex gap-2 mb-3">
              {(["all", "plan", "manual"] as const).map((s) => (
                <button key={s} onClick={() => setSegment(s)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition ${segment === s ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}>
                  {s === "all" ? "All Tenants" : s === "plan" ? "By Plan" : "Select Tenants"}
                </button>
              ))}
            </div>
            {segment === "plan" && (
              <select value={segmentPlan} onChange={(e) => setSegmentPlan(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {["Starter", "Pro", "Business", "Enterprise"].map((p) => <option key={p}>{p}</option>)}
              </select>
            )}
            {segment === "manual" && (
              <div className="space-y-1.5">
                {tenants.filter((t) => t.whatsappConnected).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedTenants.has(t.id)}
                      onChange={(e) => setSelectedTenants((s) => { const n = new Set(s); e.target.checked ? n.add(t.id) : n.delete(t.id); return n; })} />
                    <span className="text-white/70">{t.name}</span>
                    <span className="text-white/30 text-xs">({t.contactCount} contacts)</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-white/40">
            📊 This will send to <span className="font-bold text-white">{targets.length} tenants</span> ({totalContacts.toLocaleString()} contacts)
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPreviewModal(true)} disabled={!selectedTemplate} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-white/60 disabled:opacity-40 hover:text-white">
              Preview
            </button>
            <button onClick={sendBroadcast} disabled={sending || !selectedTemplate || targets.length === 0}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              {sending ? "Sending…" : `📤 Send to ${totalContacts} contacts`}
            </button>
          </div>
          {sendResult && <p className="text-sm text-center text-white/60">{sendResult}</p>}
        </div>

        {/* History */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 font-semibold text-white">Broadcast History</h2>
            {jobs.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">No broadcasts yet</p>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => {
                  const rate = j.total > 0 ? Math.round((j.delivered / j.total) * 100) : 0;
                  return (
                    <div key={j.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">{j.name}</p>
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${j.status === "completed" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : j.status === "running" ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
                          {j.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40 mb-2">
                        <span>✓ {j.delivered} delivered</span>
                        <span>✗ {j.failed} failed</span>
                        <span>{rate}% rate</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-white/25">{new Date(j.sentAt).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Message Preview</h3>
              <button onClick={() => setPreviewModal(false)} className="text-white/30 hover:text-white">✕</button>
            </div>
            <div className="rounded-xl bg-[#1a1f2e] border border-white/5 p-4 mb-4">
              <div className="rounded-xl bg-[#005c4b] p-3 text-sm text-white max-w-[80%] ml-auto">
                {previewBody()}
              </div>
              <p className="text-[10px] text-white/25 mt-2 text-right">VoidCloud · now</p>
            </div>
            <p className="text-xs text-white/40 text-center">Template: {selectedTemplate.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

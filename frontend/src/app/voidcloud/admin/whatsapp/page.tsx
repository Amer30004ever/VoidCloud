/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudApi, WhatsappTemplate, WhatsappBroadcast, WhatsappBroadcastRecipient, CloudPlan } from "@/features/vps/cloud";

type Tab = "composer" | "templates" | "history";

export default function AdminWhatsappPage() {
  const [tab, setTab] = useState<Tab>("composer");
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<WhatsappBroadcast[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<WhatsappBroadcast | null>(null);
  const [recipients, setRecipients] = useState<WhatsappBroadcastRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templateForm, setTemplateForm] = useState({ name: "", body: "" });
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [segment, setSegment] = useState("all");
  const [planId, setPlanId] = useState("");
  const [activeWithinDays, setActiveWithinDays] = useState("");
  const [signupAfter, setSignupAfter] = useState("");
  const [signupBefore, setSignupBefore] = useState("");
  const [phones, setPhones] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (tab === "templates") loadTemplates();
    if (tab === "history") loadBroadcasts();
    if (tab === "composer") loadPlans();
  }, [tab]);

  async function loadPlans() {
    try { setPlans(await cloudApi.admin.plans()); } catch { /* ignore */ }
  }

  async function loadTemplates() {
    setLoading(true);
    try { setTemplates(await cloudApi.admin.whatsapp.templates()); } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setLoading(false); }
  }

  async function loadBroadcasts() {
    setLoading(true);
    try { setBroadcasts(await cloudApi.admin.whatsapp.broadcasts()); } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setLoading(false); }
  }

  async function saveTemplate() {
    if (!templateForm.name || !templateForm.body) return alert("Name and body are required");
    setLoading(true);
    try {
      if (editingTemplate) {
        await cloudApi.admin.whatsapp.updateTemplate(editingTemplate.id, templateForm);
      } else {
        await cloudApi.admin.whatsapp.createTemplate(templateForm);
      }
      setTemplateForm({ name: "", body: "" });
      setEditingTemplate(null);
      setShowTemplateForm(false);
      loadTemplates();
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setLoading(false); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    setLoading(true);
    try { await cloudApi.admin.whatsapp.deleteTemplate(id); loadTemplates(); } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setLoading(false); }
  }

  async function sendBroadcast() {
    if (!selectedTemplateId) return alert("Select a template");
    const phoneList = phones.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
    if (segment === "manual" && !phoneList.length) return alert("Enter at least one phone number for manual segment");
    setSending(true);
    try {
      const broadcast = await cloudApi.admin.whatsapp.send({
        templateId: selectedTemplateId,
        segment: segment === "manual" ? "all" : segment,
        recipientPhones: segment === "manual" ? phoneList : undefined,
        planId: segment === "by_plan" ? planId || undefined : undefined,
        activeWithinDays: segment === "by_activity" && activeWithinDays ? Number(activeWithinDays) : undefined,
        signupAfter: signupAfter || undefined,
        signupBefore: signupBefore || undefined,
      });
      setSelectedTemplateId("");
      setPhones("");
      setSegment("all");
      setPlanId("");
      setActiveWithinDays("");
      setSignupAfter("");
      setSignupBefore("");
      setSelectedBroadcast(broadcast);
      setTab("history");
      loadBroadcasts();
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setSending(false); }
  }

  async function viewRecipients(broadcast: WhatsappBroadcast) {
    setLoading(true);
    try {
      setSelectedBroadcast(broadcast);
      setRecipients(await cloudApi.admin.whatsapp.recipients(broadcast.id));
      setTab("history");
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
        <p className="text-sm text-amber-200">
          <strong>Beta — known risk:</strong> Broadcasts are sent through the unofficial openwa transport. Meta's anti-spam systems may flag bulk outbound WhatsApp traffic regardless of rate limiting. Number restrictions/bans are a known tradeoff of this path. For production-grade broadcast at scale, migrate to Meta's official WhatsApp Business Cloud API (requires pre-approved message templates). See <code>services/crm/src/whatsapp-broadcast/README.md</code>.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="vc-h1">WhatsApp Broadcast <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">BETA</span></h1>
        <div className="flex gap-2">
          {(["composer", "templates", "history"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`vc-btn capitalize ${tab === t ? "vc-btn-primary" : "vc-btn-secondary hover:bg-white/10"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {tab === "composer" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="vc-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Compose Broadcast</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/60">Template</label>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                  <option value="">Select a template</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/60">Audience</label>
                <select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                  <option value="all">All Users</option>
                  <option value="by_plan">By Plan Type</option>
                  <option value="by_activity">By Activity Level</option>
                  <option value="by_signup">By Signup Date Range</option>
                  <option value="manual">Manual Phone List</option>
                </select>
              </div>
              {segment === "by_plan" && (
                <div>
                  <label className="mb-1 block text-sm text-white/60">Plan</label>
                  <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                    <option value="">Select a plan</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              {segment === "by_activity" && (
                <div>
                  <label className="mb-1 block text-sm text-white/60">Active within last (days)</label>
                  <input type="number" min="1" value={activeWithinDays} onChange={(e) => setActiveWithinDays(e.target.value)} placeholder="e.g. 30" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
                </div>
              )}
              {segment === "by_signup" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-white/60">Signed up after</label>
                    <input type="date" value={signupAfter} onChange={(e) => setSignupAfter(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-white/60">Signed up before</label>
                    <input type="date" value={signupBefore} onChange={(e) => setSignupBefore(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
                  </div>
                </div>
              )}
              {segment === "manual" && (
                <div>
                  <label className="mb-1 block text-sm text-white/60">Recipient Phones (comma or newline separated)</label>
                  <textarea value={phones} onChange={(e) => setPhones(e.target.value)} rows={6} placeholder="+201234567890, +201098765432" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-sm" />
                </div>
              )}
              <button onClick={sendBroadcast} disabled={sending} className="vc-btn vc-btn-primary disabled:opacity-50">
                {sending ? "Queuing…" : "Queue Broadcast"}
              </button>
            </div>
          </div>

          <div className="vc-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Preview</h2>
            {selectedTemplateId ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                <p className="whitespace-pre-wrap text-sm">{templates.find((t) => t.id === selectedTemplateId)?.body}</p>
              </div>
            ) : (
              <p className="text-sm text-white/40">Select a template to preview</p>
            )}
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="vc-card">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <h2 className="text-xl font-semibold">Templates</h2>
            <button onClick={() => { setShowTemplateForm(true); setEditingTemplate(null); setTemplateForm({ name: "", body: "" }); }} className="vc-btn vc-btn-primary">+ New Template</button>
          </div>
          {showTemplateForm && (
            <div className="border-b border-white/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Template name" className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
                <textarea value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} rows={3} placeholder="Use {{firstName}} and {{name}} for personalization" className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 md:col-span-2" />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={saveTemplate} disabled={loading} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50">Save</button>
                <button onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); }} className="vc-btn vc-btn-secondary hover:bg-white/5">Cancel</button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                <tr><th className="p-4">Name</th><th>Body</th><th className="p-4">Actions</th></tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="p-4 font-medium">{t.name}</td>
                    <td className="max-w-md truncate text-white/70">{t.body}</td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, body: t.body }); setShowTemplateForm(true); }} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">Edit</button>
                      <button onClick={() => deleteTemplate(t.id)} className="rounded border border-red-400/30 px-3 py-1 text-xs text-red-300 hover:bg-red-400/10">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {selectedBroadcast && (
            <div className="vc-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Broadcast Details</h2>
                <button onClick={() => { setSelectedBroadcast(null); setRecipients([]); }} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">Close</button>
              </div>
              <div className="mb-4 grid grid-cols-4 gap-4 text-center">
                <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3"><div className="text-2xl font-bold">{selectedBroadcast.sentCount}</div><div className="text-xs text-white/60">Sent</div></div>
                <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3"><div className="text-2xl font-bold">{selectedBroadcast.deliveredCount}</div><div className="text-xs text-white/60">Delivered</div></div>
                <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3"><div className="text-2xl font-bold">{selectedBroadcast.failedCount}</div><div className="text-xs text-white/60">Failed</div></div>
                <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3"><div className="text-2xl font-bold">{selectedBroadcast.segment}</div><div className="text-xs text-white/60">Segment</div></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                    <tr><th className="p-3">Phone</th><th>Name</th><th>Status</th><th>Error</th><th>Sent At</th></tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.id} className="border-b border-white/5">
                        <td className="p-3 font-mono">{r.phone}</td>
                        <td className="text-white/70">{r.name}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'SENT' ? 'bg-emerald-400/10 text-emerald-300' : r.status === 'FAILED' ? 'bg-red-400/10 text-red-300' : 'bg-white/10 text-white/60'}`}>{r.status}</span></td>
                        <td className="text-red-300">{r.error}</td>
                        <td className="text-white/50">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="vc-card">
            <div className="border-b border-white/5 p-4"><h2 className="text-xl font-semibold">Broadcast History</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                  <tr><th className="p-4">Template</th><th>Segment</th><th>Status</th><th>Sent</th><th>Failed</th><th>Created</th><th className="p-4">Actions</th></tr>
                </thead>
                <tbody>
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="p-4 font-medium">{b.templateName}</td>
                      <td className="text-white/70">{b.segment}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${b.status === 'COMPLETED' ? 'bg-emerald-400/10 text-emerald-300' : b.status === 'FAILED' ? 'bg-red-400/10 text-red-300' : b.status === 'SENDING' ? 'bg-cyan-400/10 text-cyan-300' : 'bg-white/10 text-white/60'}`}>{b.status}</span></td>
                      <td className="text-white/70">{b.sentCount}</td>
                      <td className="text-red-300">{b.failedCount}</td>
                      <td className="text-white/50">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="p-4"><button onClick={() => viewRecipients(b)} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">View Recipients</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

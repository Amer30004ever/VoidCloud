/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { cloudWebhooks, type WebhookEndpoint, type WebhookDelivery } from "@/features/vps/cloud";

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[] });
  const [selected, setSelected] = useState<WebhookEndpoint | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    cloudWebhooks.events().then(setEvents).catch(() => setEvents([]));
    refresh();
  }, []);

  async function refresh() {
    try { setWebhooks(await cloudWebhooks.list()); } catch { setWebhooks([]); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url || form.events.length === 0) return;
    setBusy(true); setMsg(null);
    try {
      await cloudWebhooks.create(form);
      setForm({ name: "", url: "", events: [] });
      setMsg({ kind: "ok", text: "Webhook created" });
      refresh();
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  async function select(w: WebhookEndpoint) {
    setSelected(w);
    try { setDeliveries(await cloudWebhooks.deliveries(w.id)); } catch { setDeliveries([]); }
  }

  async function toggleEnabled(w: WebhookEndpoint) {
    try { await cloudWebhooks.update(w.id, { enabled: !w.enabled }); refresh(); if (selected?.id === w.id) select({ ...w, enabled: !w.enabled }); } catch { /* ignore */ }
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook?")) return;
    try { await cloudWebhooks.remove(id); if (selected?.id === id) { setSelected(null); setDeliveries([]); } refresh(); } catch { /* ignore */ }
  }

  async function resend(webhookId: string, deliveryId: string) {
    setBusy(true);
    try { await cloudWebhooks.resend(webhookId, deliveryId); setMsg({ kind: "ok", text: "Resent" }); select(selected!); } catch { setMsg({ kind: "err", text: "Resend failed" }); }
    setBusy(false);
  }

  const allEvents = [
    "lead.created", "vps.status_changed", "invoice.paid",
    "subscription.created", "subscription.cancelled",
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Webhooks</h1>
      {msg && <div className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Create webhook</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="My webhook" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="https://example.com/hook" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Events</label>
          <div className="flex flex-wrap gap-2">
            {allEvents.map((ev) => (
              <button key={ev} type="button" onClick={() => setForm({ ...form, events: form.events.includes(ev) ? form.events.filter((x) => x !== ev) : [...form.events, ev] })} className={`rounded-lg border px-3 py-1.5 text-xs ${form.events.includes(ev) ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-white/70"}`}>{ev}</button>
            ))}
          </div>
        </div>
        <button disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Create</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Your webhooks</h3>
          {webhooks.map((w) => (
            <div key={w.id} onClick={() => select(w)} className={`cursor-pointer rounded-xl border p-4 text-sm transition ${selected?.id === w.id ? "border-cyan-400 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium">{w.name}</div>
                <button onClick={(e) => { e.stopPropagation(); toggleEnabled(w); }} className={`text-xs ${w.enabled ? "text-emerald-300" : "text-red-300"}`}>{w.enabled ? "Enabled" : "Disabled"}</button>
              </div>
              <div className="mt-1 font-mono text-xs text-white/50">{w.url}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {w.events.map((ev) => <span key={ev} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{ev}</span>)}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); remove(w.id); }} className="text-xs text-red-300 hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {webhooks.length === 0 && <p className="text-center text-white/50 py-8">No webhooks yet.</p>}
        </div>

        <div>
          {selected && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Deliveries — {selected.name}</h3>
              <div className="space-y-2">
                {deliveries.map((d) => (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.eventType}</div>
                        <div className="text-xs text-white/60">{new Date(d.createdAt).toLocaleString()} · attempt {d.attempt} · status {d.responseStatus ?? "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${d.success ? "text-emerald-300" : "text-red-300"}`}>{d.success ? "OK" : "FAILED"}</span>
                        {!d.success && <button onClick={() => resend(selected.id, d.id)} disabled={busy} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50">Resend</button>}
                      </div>
                    </div>
                  </div>
                ))}
                {deliveries.length === 0 && <p className="text-center text-white/50 py-8">No deliveries yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

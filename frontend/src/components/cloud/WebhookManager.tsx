/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudWebhooks, type WebhookEndpoint, type WebhookDelivery } from "@/lib/cloud";

const FALLBACK_EVENTS = [
  "vps.created", "vps.deleted", "vps.started", "vps.stopped", "vps.restarted",
  "vps.resized", "vps.backup.created", "vps.backup.restored",
  "subscription.created", "subscription.cancelled", "invoice.paid",
  "domain.added", "ssl.issued", "ssl.expiring",
];

export function WebhookManager() {
  const [hooks, setHooks] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<string[]>(FALLBACK_EVENTS);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  async function refresh() {
    try { setHooks(await cloudWebhooks.list()); } catch { setHooks([]); }
  }
  useEffect(() => {
    refresh();
    cloudWebhooks.events().then((e) => e?.length && setEvents(e)).catch(() => {});
  }, []);

  function toggleEvent(ev: string) {
    setSelected((s) => (s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]));
  }

  async function create() {
    setError(null); setBusy(true);
    try {
      await cloudWebhooks.create({ name, url, events: selected });
      setName(""); setUrl(""); setSelected([]);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to create");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook? Future events will not be delivered.")) return;
    try { await cloudWebhooks.remove(id); await refresh(); } catch { /* ignore */ }
  }

  async function toggleEnabled(h: WebhookEndpoint) {
    try { await cloudWebhooks.update(h.id, { enabled: !h.enabled }); await refresh(); } catch { /* ignore */ }
  }

  async function regen(id: string) {
    if (!confirm("Regenerate signing secret? Existing receivers will fail until updated.")) return;
    try { await cloudWebhooks.update(id, { regenerateSecret: true }); await refresh(); } catch { /* ignore */ }
  }

  async function test(id: string) {
    try { await cloudWebhooks.test(id); await openDeliveries(id, true); } catch { /* ignore */ }
  }

  async function openDeliveries(id: string, force = false) {
    if (!force && openId === id) { setOpenId(null); return; }
    setOpenId(id);
    try { setDeliveries((d) => ({ ...d, [id]: [] }));
      const list = await cloudWebhooks.deliveries(id, 25);
      setDeliveries((d) => ({ ...d, [id]: list }));
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Webhooks</h1>
        <p className="text-sm text-white/60">
          Receive real-time HTTP callbacks when events happen in your account. Each delivery is signed with HMAC-SHA256
          using the endpoint secret — verify the <code className="rounded bg-slate-950/60 px-1 font-mono">X-AmerCloud-Signature</code> header.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="mb-3 font-semibold">Add endpoint</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2"
            placeholder="Name (e.g. CI pipeline)"
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2"
            placeholder="https://example.com/webhooks/amercloud"
            value={url} onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Subscribe to events</p>
          <div className="flex flex-wrap gap-2">
            {events.map((ev) => (
              <button
                key={ev}
                onClick={() => toggleEvent(ev)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected.includes(ev)
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          onClick={create}
          disabled={busy || !name || !url || selected.length === 0}
          className="mt-4 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create webhook"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {hooks.length === 0 ? (
          <p className="p-8 text-center text-white/50">No webhooks yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {hooks.map((h) => (
              <li key={h.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{h.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${h.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                        {h.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-white/60">{h.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.events.map((e) => (
                        <span key={e} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{e}</span>
                      ))}
                    </div>
                    {h.secret && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-white/40">Secret:</span>
                        <code className="rounded bg-slate-950/60 px-2 py-0.5 font-mono">
                          {showSecret[h.id] ? h.secret : "•".repeat(24)}
                        </code>
                        <button onClick={() => setShowSecret((s) => ({ ...s, [h.id]: !s[h.id] }))} className="text-cyan-300 hover:underline">
                          {showSecret[h.id] ? "Hide" : "Show"}
                        </button>
                        <button onClick={() => regen(h.id)} className="text-yellow-300 hover:underline">Regenerate</button>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button onClick={() => test(h.id)} className="rounded border border-white/10 px-3 py-1 hover:bg-white/5">Test</button>
                    <button onClick={() => toggleEnabled(h)} className="rounded border border-white/10 px-3 py-1 hover:bg-white/5">
                      {h.enabled ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => openDeliveries(h.id)} className="rounded border border-white/10 px-3 py-1 hover:bg-white/5">
                      {openId === h.id ? "Hide deliveries" : "Deliveries"}
                    </button>
                    <button onClick={() => remove(h.id)} className="rounded border border-red-500/30 px-3 py-1 text-red-300 hover:bg-red-500/10">Delete</button>
                  </div>
                </div>

                {openId === h.id && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-slate-950/40">
                    <table className="w-full text-xs">
                      <thead className="bg-white/5 text-left uppercase text-white/40">
                        <tr>
                          <th className="p-2">Event</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Attempt</th>
                          <th className="p-2">When</th>
                          <th className="p-2">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(deliveries[h.id] ?? []).length === 0 ? (
                          <tr><td colSpan={5} className="p-4 text-center text-white/40">No deliveries yet.</td></tr>
                        ) : (
                          (deliveries[h.id] ?? []).map((d) => (
                            <tr key={d.id} className="border-t border-white/5">
                              <td className="p-2 font-mono">{d.eventType}</td>
                              <td className="p-2">
                                <span className={`rounded px-2 py-0.5 ${d.success ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                                  {d.responseStatus ?? (d.success ? "OK" : "ERR")}
                                </span>
                              </td>
                              <td className="p-2">{d.attempt}</td>
                              <td className="p-2 text-white/50">{new Date(d.createdAt).toLocaleString()}</td>
                              <td className="p-2 text-white/60">{d.error ?? (d.responseBody ?? "").slice(0, 80)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { cloudWebhooks, type WebhookDelivery, type WebhookEndpoint } from "@/lib/cloud";
import { useLocale } from "@/contexts/LocaleContext";

export default function WebhookManager() {
  const { t } = useLocale();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], enabled: true });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [list, ev] = await Promise.all([cloudWebhooks.list(), cloudWebhooks.events()]);
      setEndpoints(list);
      setEvents(ev);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("webhooks.load_error", "Failed to load webhooks"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setDeliveries([]);
      return;
    }
    cloudWebhooks.deliveries(selectedId).then(setDeliveries).catch(() => setDeliveries([]));
  }, [selectedId]);

  async function createEndpoint() {
    if (!form.name.trim() || !form.url.trim() || !form.events.length) {
      setErr(t("webhooks.form_required", "Name, URL, and at least one event are required"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await cloudWebhooks.create(form);
      setShowForm(false);
      setForm({ name: "", url: "", events: [], enabled: true });
      await refresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setErr(msg ?? t("webhooks.create_error", "Failed to create webhook"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(ep: WebhookEndpoint) {
    await cloudWebhooks.update(ep.id, { enabled: !ep.enabled });
    await refresh();
  }

  async function removeEndpoint(id: string) {
    if (!confirm(t("webhooks.delete_confirm", "Delete this webhook endpoint?"))) return;
    await cloudWebhooks.remove(id);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  }

  async function testEndpoint(id: string) {
    setBusy(true);
    try {
      await cloudWebhooks.test(id);
      if (selectedId === id) setDeliveries(await cloudWebhooks.deliveries(id));
    } catch {
      setErr(t("webhooks.test_error", "Test delivery failed"));
    } finally {
      setBusy(false);
    }
  }

  function toggleEvent(ev: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : [...f.events, ev],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("webhooks.title", "Webhooks")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("webhooks.subtitle", "Send VPS and billing events to your own HTTPS endpoints.")}</p>
      </div>

      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {t("webhooks.add", "+ Add webhook")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">{t("webhooks.new", "New webhook")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-1">
              <span className="mb-1 block text-xs uppercase text-white/60">{t("webhooks.name", "Name")}</span>
              <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="deploy-notify" />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-1 block text-xs uppercase text-white/60">{t("webhooks.url", "URL")}</span>
              <input className={inp} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/hook" />
            </label>
          </div>
          <div className="mt-4">
            <span className="mb-2 block text-xs uppercase text-white/60">{t("webhooks.events", "Events")}</span>
            <div className="flex flex-wrap gap-2">
              {events.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  className={`rounded-full border px-3 py-1 text-xs ${form.events.includes(ev) ? "border-cyan-400 bg-cyan-400/20 text-cyan-200" : "border-white/10 bg-white/5 text-white/60"}`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm">{t("common.cancel", "Cancel")}</button>
            <button onClick={createEndpoint} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
              {t("common.create", "Create")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-white/50">{t("common.loading", "Loading…")}</p>
      ) : endpoints.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">{t("webhooks.empty", "No webhooks configured yet.")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                className={`rounded-2xl border p-4 backdrop-blur-xl ${selectedId === ep.id ? "border-cyan-400/50 bg-cyan-400/5" : "border-white/10 bg-white/5"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setSelectedId(ep.id)} className="text-start">
                    <div className="font-semibold">{ep.name}</div>
                    <div className="mt-1 truncate font-mono text-xs text-white/50">{ep.url}</div>
                    <div className="mt-2 text-xs text-white/40">{(ep.events ?? []).join(", ")}</div>
                  </button>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase ${ep.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"}`}>
                    {ep.enabled ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => testEndpoint(ep.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">{t("webhooks.test", "Test")}</button>
                  <button onClick={() => toggleEnabled(ep)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">{ep.enabled ? t("webhooks.disable", "Disable") : t("webhooks.enable", "Enable")}</button>
                  <button onClick={() => removeEndpoint(ep.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300">{t("common.delete", "Delete")}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <h3 className="mb-3 font-semibold">{t("webhooks.deliveries", "Recent deliveries")}</h3>
            {!selectedId ? (
              <p className="text-sm text-white/50">{t("webhooks.select_hint", "Select a webhook to view deliveries.")}</p>
            ) : deliveries.length === 0 ? (
              <p className="text-sm text-white/50">{t("webhooks.no_deliveries", "No deliveries yet.")}</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto text-xs">
                {deliveries.map((d) => (
                  <li key={d.id} className="rounded-lg border border-white/5 bg-slate-950/50 p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-cyan-300">{d.eventType}</span>
                      <span className={(d.responseStatus ?? 0) < 400 && d.success ? "text-emerald-400" : "text-red-400"}>{d.responseStatus ?? "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";

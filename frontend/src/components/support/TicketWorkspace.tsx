/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, MessageSquare, Plus, Send } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  supportApi,
  type SupportStats,
  type SupportTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/features/support/api";

const CATEGORIES: TicketCategory[] = ["GENERAL", "BILLING", "VPS", "ABUSE"];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const STATUSES: TicketStatus[] = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

interface Props {
  /** Staff mode exposes triage controls and internal notes. */
  staff?: boolean;
  title?: string;
  subtitle?: string;
}

export default function TicketWorkspace({ staff = false, title, subtitle }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<string>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({
    subject: "",
    body: "",
    category: "GENERAL" as TicketCategory,
    priority: "NORMAL" as TicketPriority,
  });
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const errText = (e: any) =>
    e?.response?.data?.message ?? e?.message ?? "Something went wrong. Please try again.";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([
        supportApi.list(filter === "all" ? undefined : filter),
        supportApi.stats().catch(() => null),
      ]);
      setTickets(list);
      if (s) setStats(s);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicket = async (id: string) => {
    try {
      setActive(await supportApi.get(id));
      setReply("");
    } catch (e) {
      setError(errText(e));
    }
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await supportApi.create(draft);
      setComposing(false);
      setDraft({ subject: "", body: "", category: "GENERAL", priority: "NORMAL" });
      await load();
      await openTicket(created.id);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setBusy(true);
    try {
      await supportApi.reply(active.id, reply, staff && internal);
      setReply("");
      await openTicket(active.id);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    if (!active) return;
    setBusy(true);
    try {
      await supportApi.updateStatus(active.id, status);
      await openTicket(active.id);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vc-page mx-auto max-w-6xl p-6" data-testid="support-workspace">
      <PageHeading
        title={title ?? (staff ? "Support queue" : "Support")}
        subtitle={
          subtitle ??
          (staff
            ? "Triage, assign and answer customer tickets."
            : "Open a ticket and track replies from the VoidCloud team.")
        }
        actions={
          !staff && (
            <button
              type="button"
              onClick={() => setComposing((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
            >
              <Plus className="h-4 w-4" /> New ticket
            </button>
          )
        }
      />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Open", stats.open],
              ["Pending", stats.pending],
              ["Resolved", stats.resolved],
              ["Closed", stats.closed],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="vc-meta">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {composing && (
        <form
          onSubmit={submitNew}
          className="mb-6 space-y-3 rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <input
            required
            minLength={3}
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Subject"
            aria-label="Subject"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={draft.category}
              aria-label="Category"
              onChange={(e) => setDraft({ ...draft, category: e.target.value as TicketCategory })}
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={draft.priority}
              aria-label="Priority"
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as TicketPriority })}
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            minLength={3}
            rows={4}
            value={draft.body}
            aria-label="Message"
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Describe the issue…"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit ticket"}
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section>
          <div className="mb-3 flex flex-wrap gap-2">
            {["open", "all", ...STATUSES].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === f
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
              <LifeBuoy className="mx-auto h-10 w-10 text-white/30" />
              <p className="mt-3 text-white/70">No tickets here.</p>
              <p className="text-sm text-white/40">
                {staff ? "The queue is clear." : "Open a ticket and we'll get back to you."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTicket(t.id)}
                    className={`w-full rounded-lg border p-3 text-left transition hover:bg-white/5 ${
                      active?.id === t.id ? "border-cyan-500/40 bg-white/5" : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-white">{t.subject}</span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLES[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="vc-meta mt-1 flex items-center gap-3">
                      <span>{t.category}</span>
                      <span className={PRIORITY_STYLES[t.priority]}>{t.priority}</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {t._count?.messages ?? t.messages?.length ?? 0}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          {!active ? (
            <p className="text-sm text-white/50">Select a ticket to read the conversation.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="vc-h2">{active.subject}</h2>
                <p className="vc-meta mt-1">
                  {active.category} · {active.priority} · opened{" "}
                  {new Date(active.createdAt).toLocaleDateString()}
                </p>
              </div>

              {staff && (
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || active.status === s}
                      onClick={() => changeStatus(s)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <ol className="space-y-3">
                {(active.messages ?? []).map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-lg border p-3 text-sm ${
                      m.internal
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-100"
                        : "border-white/10 bg-black/20 text-white/80"
                    }`}
                  >
                    <div className="vc-meta mb-1 flex items-center justify-between">
                      <span>{m.authorRole}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    {m.internal && (
                      <span className="mb-1 inline-block text-[11px] uppercase tracking-wide">
                        Internal note
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ol>

              {active.status !== "CLOSED" && (
                <form onSubmit={submitReply} className="space-y-2">
                  <textarea
                    rows={3}
                    value={reply}
                    aria-label="Reply"
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={busy || !reply.trim()}
                      className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Send
                    </button>
                    {staff && (
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <input
                          type="checkbox"
                          checked={internal}
                          onChange={(e) => setInternal(e.target.checked)}
                        />
                        Internal note (hidden from customer)
                      </label>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

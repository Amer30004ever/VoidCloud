"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import api from "@/lib/api";

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  status: "OPEN" | "CLOSED" | "PENDING" | "ESCALATED";
  lastMessage?: string;
  unreadCount?: number;
  updatedAt: string;
}

interface Message {
  id: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status?: string;
  createdAt: string;
  senderName?: string;
}

const QUICK_REPLIES = [
  "Hello! How can I help you today?",
  "Thank you for contacting us. I'll look into this right away.",
  "I understand your concern. Let me check that for you.",
  "Is there anything else I can help you with?",
  "We'll get back to you within 24 hours.",
];

const STATUS_PILL: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-300",
  PENDING: "bg-amber-500/10 text-amber-300",
  ESCALATED: "bg-red-500/10 text-red-300",
  CLOSED: "bg-slate-500/10 text-slate-400",
};

function ConversationsInner() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/crm/conversations?limit=100&sort=updatedAt_desc");
      const d = r.data;
      const list: Conversation[] = Array.isArray(d) ? d : (d?.conversations ?? []);
      setConversations(list);
      const preselect = searchParams.get("id");
      if (preselect && !selected) {
        const found = list.find((c) => c.id === preselect);
        if (found) setSelected(found);
      }
    } finally { setLoading(false); }
  }, [searchParams, selected]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selected) return;
    api.get(`/crm/conversations/${selected.id}/messages`).then((r) => {
      const d = r.data;
      setMessages(Array.isArray(d) ? d : (d?.messages ?? []));
    }).catch(() => setMessages([]));
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/crm/conversations/${selected.id}/messages`, { body: reply, direction: "OUTBOUND" });
      setReply("");
      const r = await api.get(`/crm/conversations/${selected.id}/messages`);
      const d = r.data;
      setMessages(Array.isArray(d) ? d : (d?.messages ?? []));
    } finally { setSending(false); }
  }

  async function updateStatus(id: string, status: string) {
    await api.patch(`/crm/conversations/${id}`, { status });
    loadConversations();
    if (selected?.id === id) setSelected({ ...selected, status: status as Conversation["status"] });
  }

  const filtered = conversations.filter((c) => {
    if (filter !== "ALL" && c.status !== filter) return false;
    if (search && !c.contactName.toLowerCase().includes(search.toLowerCase()) && !c.contactPhone.includes(search)) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10">
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/5 bg-slate-900/60">
        <div className="border-b border-white/5 p-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-400/50" />
          <div className="mt-2 flex gap-1">
            {["ALL", "OPEN", "PENDING", "ESCALATED", "CLOSED"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 rounded-lg py-1 text-[10px] font-medium transition ${filter === f ? "bg-white/10 text-white" : "text-white/30 hover:text-white"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-xs text-white/40">No conversations</p>
          ) : filtered.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className={`w-full px-3 py-3 text-left transition hover:bg-white/5 ${selected?.id === c.id ? "bg-violet-500/10" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-xs font-bold text-white">
                  {c.contactName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-white truncate">{c.contactName}</span>
                    {(c.unreadCount ?? 0) > 0 && <span className="shrink-0 rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{c.unreadCount}</span>}
                  </div>
                  <p className="truncate text-xs text-white/30">{c.lastMessage ?? c.contactPhone}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_PILL[c.status]}`}>{c.status}</span>
                    <span className="text-[10px] text-white/20">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-white/30">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-sm">Select a conversation to start replying</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{selected.contactName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_PILL[selected.status]}`}>{selected.status}</span>
                </div>
                <span className="font-mono text-xs text-white/40">{selected.contactPhone}</span>
              </div>
              <div className="flex gap-2">
                {selected.status !== "CLOSED" && <button onClick={() => updateStatus(selected.id, "CLOSED")} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white">Mark Closed</button>}
                {selected.status === "OPEN" && <button onClick={() => updateStatus(selected.id, "ESCALATED")} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400">Escalate</button>}
                {selected.status === "CLOSED" && <button onClick={() => updateStatus(selected.id, "OPEN")} className="rounded-lg border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400">Reopen</button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-white/30 pt-8">No messages yet</p>
              ) : messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${m.direction === "OUTBOUND" ? "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-white" : "bg-white/10 text-white"}`}>
                    {m.body}
                    <div className="mt-1 text-[10px] text-white/30 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/5 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((qr) => (
                  <button key={qr} onClick={() => setReply(qr)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition">
                    {qr.length > 40 ? qr.slice(0, 40) + "…" : qr}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  rows={2}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-400/50"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white disabled:opacity-40 self-end py-2">
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><ConversationsInner /></Suspense>;
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { ListSkeleton, Skeleton } from "@workspace/ui-kit/skeleton";
import api from "@/lib/api";

export default function AgentConversations() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      if (r.data?.role !== "AGENT") { router.replace("/voidcloud/dashboard"); return; }
      api.get("/whatsapp/contacts")
        .then((res) => setContacts(res.data ?? []))
        .catch(() => setContacts([]))
        .finally(() => setLoadingContacts(false));
    }).catch(() => router.replace("/voidcloud/dashboard"));
  }, [router]);

  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingMessages(true);
    api.get(`/whatsapp/messages/${encodeURIComponent(selectedPhone)}`)
      .then((r) => setMessages(r.data ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [selectedPhone]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text || !selectedPhone) return;
    setBusy(true);
    try {
      await api.post("/whatsapp/send", { phone: selectedPhone, message: text });
      setText("");
      api.get(`/whatsapp/messages/${encodeURIComponent(selectedPhone)}`).then((r) => setMessages(r.data ?? []));
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  if (role !== "AGENT") return null;

  return (
    <div>
      <h1 className="mb-6 vc-h1">Conversations</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          {loadingContacts ? (
            <ListSkeleton rows={5} />
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-6" />}
              title="No conversations"
              description="Incoming WhatsApp threads assigned to you will show up here."
              className="py-10"
            />
          ) : (
            contacts.map((c: any) => (
              <button key={c.phone || c.waId} onClick={() => setSelectedPhone(c.phone || c.waId)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedPhone === (c.phone || c.waId) ? "border-cyan-400 bg-white/10" : "border-white/10 bg-white/5"}`}>
                <div className="font-medium">{c.name || c.phone || c.waId}</div>
                <div className="text-xs text-white/50">{c.phone || c.waId}</div>
              </button>
            ))
          )}
        </div>
        <div className="md:col-span-2 vc-card p-4">
          {selectedPhone ? (
            <>
              <div className="mb-4 h-64 overflow-y-auto space-y-2">
                {loadingMessages ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="ml-auto h-8 w-1/2" />
                    <Skeleton className="h-8 w-3/5" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/50">No messages in this thread yet — say hello.</p>
                ) : (
                  messages.map((m: any) => (
                    <div key={m.id} className={`rounded-lg p-2 text-sm ${m.direction === "outbound" ? "ml-auto bg-cyan-500/20" : "bg-white/10"}`}>
                      {m.content}
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={send} className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reply..." className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                <button disabled={busy} className="vc-btn vc-btn-primary disabled:opacity-50">Send</button>
              </form>
            </>
          ) : (
            <p className="text-center text-white/50">Select a conversation.</p>
          )}
        </div>
      </div>
    </div>
  );
}

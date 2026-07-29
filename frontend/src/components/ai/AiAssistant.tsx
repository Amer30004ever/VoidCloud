"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string; requiresConfirmation?: boolean; toolCalls?: any[] };

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingTool, setPendingTool] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/notification/ai/chat", { message: userMsg });
      const assistantMsg: Message = {
        role: "assistant",
        content: data.content,
        requiresConfirmation: data.requiresConfirmation,
        toolCalls: data.toolCalls,
      };
      setMessages((m) => [...m, assistantMsg]);
      if (data.requiresConfirmation && data.toolCalls?.length) {
        setPendingTool(data.toolCalls[0]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: err?.response?.data?.message ?? "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmTool() {
    if (!pendingTool) return;
    setMessages((m) => [...m, { role: "assistant", content: "Executing action..." }]);
    try {
      const { data } = await api.post("/notification/ai/tools/execute", { toolName: pendingTool.name, arguments: pendingTool.arguments, confirmed: true });
      setMessages((m) => [...m, { role: "assistant", content: data.message || "Action completed." }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: err?.response?.data?.message ?? "Action failed." }]);
    } finally {
      setPendingTool(null);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 shadow-lg hover:scale-105 transition"
        >
          AI
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <div>
              <div className="text-sm font-semibold text-white">AI Assistant</div>
              <div className="text-xs text-white/50">Advisory · confirm before acting</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white">Close</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-xs text-white/50">Ask about your VPS, credits, invoices, or support.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "bg-cyan-500/10 text-cyan-100 ml-auto max-w-[85%]" : "bg-white/5 text-white/80 max-w-[85%]"}`}>
                {m.content}
                {m.requiresConfirmation && (
                  <button onClick={confirmTool} className="mt-2 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-slate-950">
                    Confirm action
                  </button>
                )}
              </div>
            ))}
            {loading && <div className="text-xs text-white/50">Thinking…</div>}
            <div ref={bottomRef} />
          </div>

          {pendingTool && (
            <div className="border-t border-white/5 p-3">
              <div className="text-xs text-white/60">This action requires confirmation</div>
              <button onClick={confirmTool} className="mt-2 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">
                Confirm
              </button>
            </div>
          )}

          <form onSubmit={send} className="flex gap-2 border-t border-white/5 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..." className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
            <button disabled={loading || !input.trim()} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Send</button>
          </form>
        </div>
      )}
    </>
  );
}

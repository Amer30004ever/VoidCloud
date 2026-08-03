"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useTrackPageView } from "@/hooks/useTrackPageView";

type Lead = { id: string; title: string; status: string; value?: number; createdAt: string };
type Task = { id: string; title: string; status: string; dueDate?: string; createdAt: string };

export default function CrmPage() {
  useTrackPageView();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"leads" | "tasks">("leads");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/crm/leads").then((r) => setLeads(r.data ?? [])).catch(() => setLeads([]));
    api.get("/crm/tasks").then((r) => setTasks(r.data ?? [])).catch(() => setTasks([]));
  }, []);

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setBusy(true);
    try {
      await api.post("/crm/leads", { title, status: "NEW" });
      setTitle("");
      api.get("/crm/leads").then((r) => setLeads(r.data ?? []));
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="mb-6 vc-h1">CRM</h1>
      <div className="mb-4 flex gap-2 border-b border-white/10">
        <button onClick={() => setTab("leads")} className={`px-4 py-2 text-sm ${tab === "leads" ? "border-b-2 border-cyan-400 text-cyan-300" : "text-white/60"}`}>Leads</button>
        <button onClick={() => setTab("tasks")} className={`px-4 py-2 text-sm ${tab === "tasks" ? "border-b-2 border-cyan-400 text-cyan-300" : "text-white/60"}`}>Tasks</button>
      </div>
      {tab === "leads" && (
        <>
          <form onSubmit={addLead} className="mb-4 flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New lead title" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
            <button disabled={busy} className="vc-btn vc-btn-primary disabled:opacity-50">Add Lead</button>
          </form>
          <div className="space-y-2">
            {leads.map((l) => (
              <div key={l.id} className="vc-card p-4 text-sm">
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-white/60">{l.status} {l.value ? `· $${l.value}` : ""}</div>
              </div>
            ))}
            {leads.length === 0 && <p className="text-center text-white/50 py-8">No leads.</p>}
          </div>
        </>
      )}
      {tab === "tasks" && (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="vc-card p-4 text-sm">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-white/60">{t.status} {t.dueDate ? `· due ${new Date(t.dueDate).toLocaleDateString()}` : ""}</div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center text-white/50 py-8">No tasks.</p>}
        </div>
      )}
    </div>
  );
}

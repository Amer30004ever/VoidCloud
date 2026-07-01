"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
  notes?: string;
  value?: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

const STAGES: Lead["stage"][] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

const STAGE_STYLES: Record<string, string> = {
  NEW: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  CONTACTED: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  QUALIFIED: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  PROPOSAL: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  WON: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  LOST: "bg-red-500/10 text-red-300 border-red-500/20",
};

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-violet-400/50";

export default function AgentLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editing, setEditing] = useState(false);
  const [editStage, setEditStage] = useState<Lead["stage"]>("NEW");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/crm/leads?limit=200&sort=updatedAt_desc");
      const d = r.data;
      setLeads(Array.isArray(d) ? d : (d?.leads ?? []));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateLead() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/crm/leads/${selected.id}`, { stage: editStage, notes: editNotes });
      setEditing(false);
      setSelected(null);
      load();
    } finally { setSaving(false); }
  }

  const filtered = leads.filter((l) => {
    if (stageFilter !== "ALL" && l.stage !== stageFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !(l.email ?? "").toLowerCase().includes(search.toLowerCase()) &&
      !(l.phone ?? "").includes(search)) return false;
    return true;
  });

  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.stage === s).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-white/40">Your assigned leads — follow up and convert</p>
        </div>
        <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setStageFilter(stageFilter === s ? "ALL" : s)}
            className={`rounded-xl border p-3 text-center transition ${stageFilter === s ? `${STAGE_STYLES[s]} ring-1` : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <p className="text-lg font-bold">{stageCounts[s] ?? 0}</p>
            <p className="text-[10px] uppercase text-white/50">{s}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone…" className="w-64 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-400/50" />
        {stageFilter !== "ALL" && <button onClick={() => setStageFilter("ALL")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40 hover:text-white">✕ {stageFilter}</button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">🎯</p>
            <p className="text-sm text-white/50">No leads found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Lead</th>
                <th className="py-3">Stage</th>
                <th className="hidden py-3 md:table-cell">Value</th>
                <th className="hidden py-3 md:table-cell">Source</th>
                <th className="py-3">Last Update</th>
                <th className="py-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-sm font-bold text-white">
                        {l.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{l.name}</p>
                        <p className="text-xs text-white/40">{l.email ?? l.phone ?? "—"}</p>
                        {l.notes && <p className="mt-0.5 text-xs text-white/30 truncate max-w-[180px]">{l.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`rounded border px-2.5 py-1 text-xs font-medium ${STAGE_STYLES[l.stage]}`}>{l.stage}</span>
                  </td>
                  <td className="hidden py-4 text-xs text-white/60 md:table-cell">{l.value ? `$${l.value.toLocaleString()}` : "—"}</td>
                  <td className="hidden py-4 text-xs text-white/40 md:table-cell">{l.source ?? "—"}</td>
                  <td className="py-4 text-xs text-white/40">{new Date(l.updatedAt).toLocaleDateString()}</td>
                  <td className="py-4 pr-5 text-right">
                    <button onClick={() => { setSelected(l); setEditStage(l.stage); setEditNotes(l.notes ?? ""); setEditing(true); }} className="text-xs text-violet-400 hover:underline">Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-xl font-bold">Update Lead</h2>
            <p className="mb-4 text-sm text-white/40">{selected.name}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Stage</label>
                <select className={inp} value={editStage} onChange={(e) => setEditStage(e.target.value as Lead["stage"])}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Notes</label>
                <textarea className={`${inp} resize-none`} rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add a note…" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={updateLead} disabled={saving} className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

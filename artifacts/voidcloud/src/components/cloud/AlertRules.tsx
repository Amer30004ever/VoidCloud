import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export interface AlertRule {
  id: string;
  vpsId: string | null;
  name: string;
  type: "CPU" | "RAM" | "DISK" | "BANDWIDTH" | "UPTIME";
  operator: "GREATER_THAN" | "LESS_THAN" | "EQUALS";
  threshold: number;
  cooldown: number;
  enabled: boolean;
  lastTriggeredAt: string | null;
  notifications?: Array<{ id: string; message: string; value: number; triggeredAt: string }>;
}

const TYPES: AlertRule["type"][] = ["CPU", "RAM", "DISK", "BANDWIDTH", "UPTIME"];
const OPS: Record<AlertRule["operator"], string> = {
  GREATER_THAN: ">",
  LESS_THAN: "<",
  EQUALS: "=",
};

export function AlertRules({ vpsId }: { vpsId?: string }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    name: "",
    type: "CPU" as AlertRule["type"],
    operator: "GREATER_THAN" as AlertRule["operator"],
    threshold: 80,
    cooldown: 30,
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<AlertRule[]>("/cloud/alerts", { params: vpsId ? { vpsId } : {} });
      setRules(r.data);
    } finally {
      setLoading(false);
    }
  }, [vpsId]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function create() {
    if (!draft.name.trim()) return;
    await api.post("/cloud/alerts", { ...draft, vpsId: vpsId ?? null });
    setDraft({ name: "", type: "CPU", operator: "GREATER_THAN", threshold: 80, cooldown: 30 });
    setCreating(false);
    load();
  }

  async function toggle(rule: AlertRule) {
    await api.put(`/cloud/alerts/${rule.id}`, { enabled: !rule.enabled });
    load();
  }

  async function remove(rule: AlertRule) {
    if (!confirm(`Delete alert rule "${rule.name}"?`)) return;
    await api.delete(`/cloud/alerts/${rule.id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Alert Rules</h2>
          <p className="text-xs text-white/50">Get notified when CPU, RAM, disk, bandwidth or uptime crosses a threshold.</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {creating ? "Cancel" : "+ New rule"}
        </button>
      </div>

      {creating && (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-6">
          <input
            className="md:col-span-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            placeholder="Rule name (e.g. High CPU)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <select
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as AlertRule["type"] })}
          >
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={draft.operator}
            onChange={(e) => setDraft({ ...draft, operator: e.target.value as AlertRule["operator"] })}
          >
            <option value="GREATER_THAN">&gt;</option>
            <option value="LESS_THAN">&lt;</option>
            <option value="EQUALS">=</option>
          </select>
          <input
            type="number" min={0} max={100}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            placeholder="Threshold %"
            value={draft.threshold}
            onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
          />
          <input
            type="number" min={1}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            placeholder="Cooldown (min)"
            value={draft.cooldown}
            onChange={(e) => setDraft({ ...draft, cooldown: Number(e.target.value) })}
          />
          <button
            onClick={create}
            className="md:col-span-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Create rule
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
            <tr><th className="p-3">Name</th><th>Condition</th><th>Cooldown</th><th>Last triggered</th><th>Status</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-white/50">Loading…</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-white/50">No alert rules yet.</td></tr>
            ) : rules.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="p-3 font-medium">{r.name}</td>
                <td>{r.type} {OPS[r.operator]} {r.threshold}{r.type === "UPTIME" ? "s" : "%"}</td>
                <td>{r.cooldown}m</td>
                <td className="text-white/60">{r.lastTriggeredAt ? new Date(r.lastTriggeredAt).toLocaleString() : "—"}</td>
                <td>
                  <button
                    onClick={() => toggle(r)}
                    className={`rounded-full border px-2 py-0.5 text-xs ${r.enabled ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-white/50"}`}
                  >
                    {r.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => remove(r)} className="text-xs text-red-300 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { cloudBackups, type VpsBackup, type BackupSchedule } from "@/features/vps/cloud";

const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-cyan-400/50";
const btn = "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10";
const btnDanger = "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20";
const btnPrimary = "rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-slate-950";

export function BackupManager({ vpsId }: { vpsId: string }) {
  const [list, setList] = useState<VpsBackup[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const [b, s] = await Promise.all([cloudBackups.listForVps(vpsId), cloudBackups.getSchedule(vpsId)]);
    setList(b); setSchedule(s);
  }, [vpsId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  async function run(fn: () => Promise<any>, label: string) {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(`${label} OK`); await refresh(); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? `${label} failed`); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Create backup</h3>
        <div className="flex gap-2">
          <input className={`${input} flex-1`} placeholder="Backup name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button disabled={busy} className={btnPrimary} onClick={() => run(async () => { await cloudBackups.create(vpsId, name); setName(""); }, "Backup created")}>+ Backup now</button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Schedule</h3>
        {schedule && (
          <div className="grid gap-3 md:grid-cols-5 rounded-lg border border-white/10 bg-white/5 p-3">
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={schedule.enabled} onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })} /> Enabled
            </label>
            <select className={input} value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as any })}>
              <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
            </select>
            <input className={input} type="number" min={1} max={60} value={schedule.retention} onChange={(e) => setSchedule({ ...schedule, retention: Number(e.target.value) })} placeholder="Retention" />
            <input className={input} type="number" min={0} max={23} value={schedule.hour ?? 2} onChange={(e) => setSchedule({ ...schedule, hour: Number(e.target.value) })} placeholder="Hour (0-23)" />
            {schedule.frequency === "WEEKLY" && (
              <select className={input} value={schedule.dayOfWeek ?? 0} onChange={(e) => setSchedule({ ...schedule, dayOfWeek: Number(e.target.value) })}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            )}
            {schedule.frequency === "MONTHLY" && (
              <input className={input} type="number" min={1} max={31} value={schedule.dayOfMonth ?? 1} onChange={(e) => setSchedule({ ...schedule, dayOfMonth: Number(e.target.value) })} placeholder="Day of month" />
            )}
            <div className="md:col-span-5"><button disabled={busy} className={btnPrimary} onClick={() => run(() => cloudBackups.updateSchedule(vpsId, schedule), "Schedule saved")}>Save schedule</button></div>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Backups ({list.length})</h3>
        {list.length === 0 ? (
          <p className="text-sm text-white/50">No backups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-white/50"><tr>
                <th className="py-2">Name</th><th>Type</th><th>Size</th><th>Status</th><th>Created</th><th className="text-right">Actions</th>
              </tr></thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-t border-white/5">
                    <td className="py-2 font-mono">{b.name || b.id.slice(0, 8)}</td>
                    <td><span className="rounded bg-white/10 px-2 py-0.5 text-xs">{b.type}</span></td>
                    <td>{b.sizeMB} MB</td>
                    <td className={b.status === "COMPLETED" ? "text-emerald-300" : b.status === "FAILED" ? "text-red-300" : "text-amber-300"}>{b.status}</td>
                    <td className="text-xs text-white/60">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="space-x-1 text-right">
                      <button className={btn} disabled={busy || b.status !== "COMPLETED"} onClick={() => { if (confirm("Restore this backup? VPS will be replaced.")) run(() => cloudBackups.restore(b.id), "Restore started"); }}>Restore</button>
                      <button className={btnDanger} disabled={busy} onClick={() => { if (confirm("Delete this backup?")) run(() => cloudBackups.remove(b.id), "Deleted"); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

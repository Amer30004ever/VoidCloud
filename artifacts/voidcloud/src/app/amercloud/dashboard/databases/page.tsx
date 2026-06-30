import { useEffect, useState } from "react";
import Link from "@/compat/next-link";
import { useRouter } from "@/compat/next-navigation";
import { cloudDatabases, type ManagedDb, type DbPlan, type DbEngine } from "@/lib/cloud";

export default function DatabasesPage() {
  const router = useRouter();
  const [dbs, setDbs] = useState<ManagedDb[]>([]);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<DbEngine>("POSTGRES");
  const [pitr, setPitr] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => cloudDatabases.list().then(setDbs);

  useEffect(() => {
    reload();
    cloudDatabases.plans().then(setPlans);
  }, []);

  const planForEngine = plans.find((p) => p.engine === engine);

  const create = async () => {
    if (!planForEngine) return;
    setBusy(true);
    try {
      const db = await cloudDatabases.create({ name, engine, planId: planForEngine.id, pitr });
      setCreating(false); setName(""); setPitr(false);
      router.push(`/amercloud/dashboard/databases/${db.id}`);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Managed Databases</h1>
          <p className="mt-1 text-sm text-white/60">Fully managed PostgreSQL, MySQL, and Redis with daily backups and PITR.</p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">
          + New Database
        </button>
      </div>

      {/* Pricing reference */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase text-white/50">{p.engine}</div>
            <div className="mt-1 font-semibold text-white">{p.name}</div>
            <div className="mt-1 text-xs text-white/60">{p.ramMB} MB RAM · {p.storageGB} GB storage</div>
            <div className="mt-3 text-2xl font-bold text-cyan-300">${p.priceUSD}<span className="text-sm font-normal text-white/50">/mo</span></div>
          </div>
        ))}
      </div>

      {creating && (
        <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-3">
          <h2 className="text-base font-semibold text-white">Create Database</h2>
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            placeholder="my-database" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={engine} onChange={(e) => setEngine(e.target.value as DbEngine)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="POSTGRES">PostgreSQL — $10/mo</option>
            <option value="MYSQL">MySQL — $10/mo</option>
            <option value="REDIS">Redis — $5/mo</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={pitr} onChange={(e) => setPitr(e.target.checked)} />
            Enable Point-in-Time Recovery (PITR)
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">Cancel</button>
            <button onClick={create} disabled={!name.trim() || busy}
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {dbs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/50">
          No databases yet.
        </div>
      ) : (
        <div className="space-y-2">
          {dbs.map((db) => (
            <Link key={db.id} href={`/amercloud/dashboard/databases/${db.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{db.name}</div>
                  <div className="text-xs text-white/50 mt-1">{db.engine} · {db.host}:{db.port}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${db.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {db.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

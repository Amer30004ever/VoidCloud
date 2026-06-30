import { useEffect, useState } from "react";
import { cloudLoadBalancers, cloudApi, type LoadBalancer, type CloudDeployment } from "@/lib/cloud";

export function LoadBalancerPanel() {
  const [lbs, setLbs] = useState<LoadBalancer[]>([]);
  const [vpses, setVpses] = useState<CloudDeployment[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [algo, setAlgo] = useState<"ROUND_ROBIN" | "LEAST_CONN">("ROUND_ROBIN");
  const [picked, setPicked] = useState<string[]>([]);

  const reload = () => cloudLoadBalancers.list().then(setLbs);

  useEffect(() => {
    reload();
    cloudApi.deployments.list().then((d) => setVpses(d as CloudDeployment[])).catch(() => {});
  }, []);

  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const create = async () => {
    await cloudLoadBalancers.create({ name, algorithm: algo, backends: picked });
    setCreating(false); setName(""); setPicked([]);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Load Balancers</h2>
          <p className="text-xs text-white/50">$5/mo per load balancer. Distributes traffic across multiple VPS instances.</p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-slate-950">
          + New Load Balancer
        </button>
      </div>

      {lbs.length === 0 && !creating && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
          No load balancers yet. Create one to distribute traffic across multiple VPS instances.
        </div>
      )}

      <div className="space-y-2">
        {lbs.map((lb) => (
          <div key={lb.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-white">{lb.name}</div>
                <div className="font-mono text-xs text-cyan-300">{lb.publicIp}</div>
                <div className="mt-1 text-xs text-white/50">{lb.algorithm} · {lb.backends.length} backends · ${lb.priceUSD}/mo</div>
              </div>
              <button onClick={async () => { await cloudLoadBalancers.remove(lb.id); reload(); }}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-3">
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            placeholder="Load balancer name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={algo} onChange={(e) => setAlgo(e.target.value as "ROUND_ROBIN" | "LEAST_CONN")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="LEAST_CONN">Least Connections</option>
          </select>
          <div>
            <div className="text-xs text-white/60 mb-1">Backend VPS instances</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {vpses.length === 0 && <p className="text-xs text-white/40">No VPS available.</p>}
              {vpses.map((v) => (
                <label key={v.id} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1 text-sm">
                  <input type="checkbox" checked={picked.includes(v.id)} onChange={() => toggle(v.id)} />
                  <span className="text-white">{v.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">Cancel</button>
            <button onClick={create} disabled={!name.trim() || picked.length === 0}
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

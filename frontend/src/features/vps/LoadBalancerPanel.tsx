"use client";
import { useEffect, useState } from "react";
import { cloudApi, type CloudDeployment } from "./cloud";
import { loadBalancerApi, type LbAlgorithm, type LoadBalancer } from "./devops";
import { CloneVpsModal } from "./CloneVpsModal";

const ALGOS: Array<{ v: LbAlgorithm; label: string }> = [
  { v: "ROUND_ROBIN", label: "Round robin" },
  { v: "LEAST_CONNECTIONS", label: "Least connections" },
  { v: "IP_HASH", label: "IP hash (sticky)" },
];
const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed";

export function LoadBalancerPanel({ vpsId, vpsName }: { vpsId: string; vpsName: string }) {
  const [lbs, setLbs] = useState<LoadBalancer[]>([]);
  const [fleet, setFleet] = useState<CloudDeployment[]>([]);
  const [name, setName] = useState(`${vpsName}-lb`.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  const [algo, setAlgo] = useState<LbAlgorithm>("ROUND_ROBIN");
  const [picked, setPicked] = useState<string[]>([vpsId]);
  const [msg, setMsg] = useState("");
  const [showNode, setShowNode] = useState(false);

  const load = async () => {
    try {
      setLbs(await loadBalancerApi.list(vpsId));
      setFleet((await cloudApi.deployments.list()).filter((d) => d.status !== "DELETED"));
    } catch (e) { setMsg(errMsg(e)); }
  };
  useEffect(() => { void load(); }, [vpsId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function create() {
    setMsg("");
    try { await loadBalancerApi.create({ name, vpsId, algorithm: algo, backendVpsIds: picked }); setMsg("Load balancer created"); await load(); }
    catch (e) { setMsg(errMsg(e)); }
  }

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 text-xs text-cyan-100">{msg}</div>}

      <section className="vc-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-semibold">Scale out</h3>
          <p className="text-sm text-white/60">Add a peer VPS on the same plan, then balance traffic across both. To scale up instead, use “Change Plan” above.</p>
        </div>
        <button onClick={() => setShowNode(true)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/20">+ Add cluster node</button>
      </section>

      {lbs.map((lb) => (
        <section key={lb.id} className="vc-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div><h3 className="font-semibold">{lb.name}</h3><p className="text-xs text-white/50">{lb.status} · :{lb.listenPort} → :{lb.targetPort} · ${lb.monthlyUsd}/mo</p></div>
            <div className="flex gap-2">
              <select value={lb.algorithm} onChange={async (e) => { await loadBalancerApi.update(lb.id, { algorithm: e.target.value as LbAlgorithm }).catch((x) => setMsg(errMsg(x))); void load(); }}
                className="rounded-lg border border-white/10 bg-white/5 px-2 text-xs">
                {ALGOS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
              </select>
              <button onClick={async () => { await loadBalancerApi.update(lb.id, { enabled: lb.status === "DISABLED" }); void load(); }} className="rounded-lg border border-white/10 px-3 py-1 text-xs">{lb.status === "DISABLED" ? "Enable" : "Disable"}</button>
              <button onClick={async () => { if (confirm(`Delete ${lb.name}?`)) { await loadBalancerApi.remove(lb.id); void load(); } }} className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-300">Delete</button>
            </div>
          </div>
          <ul className="space-y-1 text-sm">
            {lb.backends.map((b) => (
              <li key={b.id} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${b.healthy ? "bg-emerald-400" : "bg-red-400"}`} />{b.vps?.name ?? b.vpsId}<span className="font-mono text-xs text-white/50">{b.vps?.ipv4Address ?? ""}</span></li>
            ))}
          </ul>
        </section>
      ))}

      <section className="vc-card space-y-3 p-4">
        <h3 className="font-semibold">New load balancer <span className="text-xs font-normal text-white/50">$5/mo</span></h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-white/60">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" /></label>
          <label className="text-xs text-white/60">Algorithm
            <select value={algo} onChange={(e) => setAlgo(e.target.value as LbAlgorithm)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {ALGOS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-white/60">Backend servers</p>
        <div className="grid gap-1 md:grid-cols-2">
          {fleet.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(v.id)} onChange={() => toggle(v.id)} />{v.name}</label>
          ))}
        </div>
        <button onClick={create} disabled={picked.length === 0} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Create load balancer</button>
      </section>

      {showNode && <CloneVpsModal vpsId={vpsId} vpsName={vpsName} mode="cluster" onClose={() => setShowNode(false)} />}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, CloudDeployment } from "@/lib/cloud";
import { StatusBadge } from "../page";

export default function DeploymentsListPage() {
  const [items, setItems] = useState<CloudDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { cloudApi.deployments.list().then(setItems).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deployments</h1>
        <Link href="/amercloud/dashboard/deployments/new" className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">+ New</Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {loading ? <p className="p-6 text-white/50">Loading…</p>
          : items.length === 0 ? <p className="p-12 text-center text-white/50">No deployments yet.</p>
          : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                <tr><th className="p-4">Name</th><th>Type</th><th>URL</th><th>Resources</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-medium">{d.name}</td>
                    <td className="text-white/60">{d.type}</td>
                    <td className="text-cyan-300">{d.subdomain}.amercloud.cc.cd</td>
                    <td className="text-white/60">{d.cpu} CPU · {d.memory}MB</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="p-4"><Link href={`/amercloud/dashboard/deployments/${d.id}`} className="text-cyan-300 hover:underline">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, type CloudDeployment } from "@/lib/cloud";
import { VpsStatusBadge } from "@/components/cloud/VpsStatusBadge";
import { useLocale } from "@/contexts/LocaleContext";

type WithIp = CloudDeployment & { ipv4Address?: string };

export default function VpsListPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<WithIp[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { cloudApi.deployments.list().then((d) => setItems(d as WithIp[])).finally(() => setLoading(false)); }, []);
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("vps.title", "VPS Instances")}</h1>
        <Link href="/voidcloud/dashboard/vps/new" className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">{t("vps.new", "+ New VPS")}</Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {loading ? <p className="p-6 text-white/50">{t("vps.loading", "Loading…")}</p>
          : items.length === 0 ? <p className="p-12 text-center text-white/50">{t("vps.empty", "No VPS instances yet.")}</p>
          : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                <tr><th className="p-4">{t("vps.name", "Name")}</th><th>{t("vps.ip", "IP Address")}</th><th>{t("vps.resources", "Resources")}</th><th>{t("common.status", "Status")}</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-medium">{d.name}</td>
                    <td className="font-mono text-cyan-300">{d.ipv4Address ?? "—"}</td>
                    <td className="text-white/60">{d.cpu} CPU · {d.memory}MB · {Math.ceil(d.storage/1024)}GB</td>
                    <td><VpsStatusBadge status={d.status} /></td>
                    <td className="p-4"><Link href={`/voidcloud/dashboard/vps/${d.id}`} className="text-cyan-300 hover:underline">{t("vps.open", "Open")} →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

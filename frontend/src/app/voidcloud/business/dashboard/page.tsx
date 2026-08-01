"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloudApi, type CloudDeployment, type CloudInvoice } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type BusinessKpi = {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  href?: string;
};

export default function BusinessDashboardPage() {
  useTrackPageView();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vpsCount, setVpsCount] = useState(0);
  const [vpsByStatus, setVpsByStatus] = useState<Record<string, number>>({});
  const [mrr, setMrr] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [openLeads, setOpenLeads] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [whatsappThreads, setWhatsappThreads] = useState(0);
  const [whatsappSent, setWhatsappSent] = useState(0);
  const [whatsappDelivered, setWhatsappDelivered] = useState(0);
  const [whatsappFailed, setWhatsappFailed] = useState(0);
  const [invoices, setInvoices] = useState<CloudInvoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tok = localStorage.getItem("voidcloud_token") || sessionStorage.getItem("voidcloud_token");
    if (!tok) {
      router.replace("/voidcloud/login");
      return;
    }

    Promise.allSettled([
      cloudApi.deployments.list().then((deps) => {
        const running = deps.filter((d) => d.status === "RUNNING");
        setVpsCount(running.length);
        const byStatus: Record<string, number> = {};
        for (const d of deps) {
          byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
        }
        setVpsByStatus(byStatus);
      }),
      cloudApi.billing.current().then((sub) => {
        setMrr(sub?.plan?.priceUSD ?? 0);
        setPlanName(sub?.plan?.name ?? null);
      }),
       cloudApi.crm.leads().then((leads: any) => {
        const arr = Array.isArray(leads) ? leads : (leads?.leads ?? []);
        setTotalLeads(arr.length);
          setOpenLeads(arr.filter((l: any) => l?.status === "OPEN" || l?.status === "new").length);
      }),
       cloudApi.admin.whatsapp.broadcasts().then((bcasts: any) => {
        const arr = Array.isArray(bcasts) ? bcasts : [];
        setWhatsappThreads(arr.length);
        let sent = 0, delivered = 0, failed = 0;
        for (const b of arr) {
          sent += b?.sentCount ?? 0;
          delivered += b?.deliveredCount ?? 0;
          failed += b?.failedCount ?? 0;
        }
        setWhatsappSent(sent);
        setWhatsappDelivered(delivered);
        setWhatsappFailed(failed);
      }).catch(() => {}),
      cloudApi.billing.invoices().then(setInvoices).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white/60">
        Loading business dashboard...
      </div>
    );
  }

  const kpiCards: BusinessKpi[] = [
    {
      label: "Active VPS instances",
      value: vpsCount,
      change: Object.entries(vpsByStatus).map(([s, c]) => `${s}: ${c}`).join(", "),
      icon: "🖥️",
      href: "/voidcloud/dashboard/vps",
    },
    {
      label: "Monthly Recurring Revenue",
      value: mrr != null ? `$${mrr}/mo` : "—",
      change: planName ?? "",
      icon: "💰",
      href: "/voidcloud/dashboard/billing",
    },
    {
      label: "Open CRM leads",
      value: openLeads,
      change: `${totalLeads} total`,
      icon: "🎯",
      href: "/voidcloud/dashboard/crm",
    },
    {
      label: "WhatsApp threads",
      value: whatsappThreads,
      change: `${whatsappSent} sent · ${whatsappDelivered} delivered · ${whatsappFailed} failed`,
      icon: "💬",
      href: "/voidcloud/admin/whatsapp",
    },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen vc-page text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Business Dashboard</h1>
            <p className="mt-2 text-sm text-white/50">
              Tenant-level KPIs and operational metrics
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((k) => (
              <KpiCard key={k.label} kpi={k} />
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold">Recent invoices</h2>
              <div className="mt-4 space-y-3">
                {invoices.length === 0 ? (
                  <p className="text-sm text-white/50">No invoices yet.</p>
                ) : (
                  invoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{inv.number}</div>
                        <div className="text-xs text-white/40">{new Date(inv.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">${inv.amountUSD ?? inv.amountEGP ?? 0}</div>
                        <span className={`text-xs ${inv.status === "PAID" ? "text-green-300" : inv.status === "PENDING" ? "text-yellow-300" : "text-red-300"}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/voidcloud/dashboard/billing/invoices"
                className="mt-4 block text-center text-sm text-cyan-300 hover:underline"
              >
                View all invoices →
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold">VPS status breakdown</h2>
              <div className="mt-4 space-y-3">
                {Object.keys(vpsByStatus).length === 0 ? (
                  <p className="text-sm text-white/50">No VPS instances yet.</p>
                ) : (
                  Object.entries(vpsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-white/60">{status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/voidcloud/dashboard/vps"
                className="mt-4 block text-center text-sm text-cyan-300 hover:underline"
              >
                Manage VPS instances →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function KpiCard({ kpi }: { kpi: BusinessKpi }) {
  return (
    <Link
      href={kpi.href ?? "#"}
      className="group block rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl transition hover:border-cyan-400/30"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{kpi.icon}</span>
        <div>
          <p className="text-xs uppercase text-white/50">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
          {kpi.change && (
            <p className="mt-1 text-xs text-white/40 group-hover:text-white/60">
              {kpi.change}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

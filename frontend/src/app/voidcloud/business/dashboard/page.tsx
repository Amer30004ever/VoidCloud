"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloudApi, type CloudInvoice } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type WidgetState = "loading" | "ready" | "error";

type BusinessKpi = {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  href?: string;
  state: WidgetState;
  empty?: boolean;
  emptyMessage?: string;
};

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="kpi-skeleton">
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-3 w-32 animate-pulse rounded bg-white/10" />
    </div>
  );
}

function KpiCard({ kpi }: { kpi: BusinessKpi }) {
  if (kpi.state === "loading") return <KpiSkeleton />;

  const body = (
    <div className="flex items-center gap-3">
      <span className="text-2xl" aria-hidden>
        {kpi.icon}
      </span>
      <div>
        <p className="text-xs uppercase text-white/50">{kpi.label}</p>
        {kpi.state === "error" ? (
          <p className="mt-1 text-sm text-yellow-300">Couldn&apos;t load this metric</p>
        ) : kpi.empty ? (
          <p className="mt-1 text-sm text-white/50">{kpi.emptyMessage ?? "No data yet"}</p>
        ) : (
          <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
        )}
        {kpi.state === "ready" && !kpi.empty && kpi.change && (
          <p className="mt-1 text-xs text-white/40 group-hover:text-white/60">{kpi.change}</p>
        )}
      </div>
    </div>
  );

  return (
    <Link
      href={kpi.href ?? "#"}
      className="group block rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl transition hover:border-cyan-400/30"
    >
      {body}
    </Link>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3" data-testid="panel-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

export default function BusinessDashboardPage() {
  useTrackPageView();
  const router = useRouter();

  const [vpsState, setVpsState] = useState<WidgetState>("loading");
  const [billingState, setBillingState] = useState<WidgetState>("loading");
  const [crmState, setCrmState] = useState<WidgetState>("loading");
  const [waState, setWaState] = useState<WidgetState>("loading");
  const [invoiceState, setInvoiceState] = useState<WidgetState>("loading");

  const [vpsCount, setVpsCount] = useState(0);
  const [vpsTotal, setVpsTotal] = useState(0);
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

  const load = useCallback(() => {
    setVpsState("loading");
    setBillingState("loading");
    setCrmState("loading");
    setWaState("loading");
    setInvoiceState("loading");

    void cloudApi.deployments
      .list()
      .then((deps) => {
        setVpsTotal(deps.length);
        setVpsCount(deps.filter((d) => d.status === "RUNNING").length);
        const byStatus: Record<string, number> = {};
        for (const d of deps) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
        setVpsByStatus(byStatus);
        setVpsState("ready");
      })
      .catch(() => setVpsState("error"));

    void cloudApi.billing
      .current()
      .then((sub) => {
        setMrr(sub?.plan?.priceUSD ?? 0);
        setPlanName(sub?.plan?.name ?? null);
        setBillingState("ready");
      })
      .catch(() => setBillingState("error"));

    void cloudApi.crm
      .leads()
      .then((leads: unknown) => {
        const arr = (Array.isArray(leads)
          ? leads
          : ((leads as { leads?: unknown[] })?.leads ?? [])) as Array<{ status?: string }>;
        setTotalLeads(arr.length);
        setOpenLeads(arr.filter((l) => l?.status === "OPEN" || l?.status === "new").length);
        setCrmState("ready");
      })
      .catch(() => setCrmState("error"));

    void cloudApi.admin.whatsapp
      .broadcasts()
      .then((bcasts: unknown) => {
        const arr = (Array.isArray(bcasts) ? bcasts : []) as Array<{
          sentCount?: number;
          deliveredCount?: number;
          failedCount?: number;
        }>;
        setWhatsappThreads(arr.length);
        let sent = 0,
          delivered = 0,
          failed = 0;
        for (const b of arr) {
          sent += b?.sentCount ?? 0;
          delivered += b?.deliveredCount ?? 0;
          failed += b?.failedCount ?? 0;
        }
        setWhatsappSent(sent);
        setWhatsappDelivered(delivered);
        setWhatsappFailed(failed);
        setWaState("ready");
      })
      .catch(() => setWaState("error"));

    void cloudApi.billing
      .invoices()
      .then((inv) => {
        setInvoices(inv);
        setInvoiceState("ready");
      })
      .catch(() => setInvoiceState("error"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tok =
      localStorage.getItem("voidcloud_token") || sessionStorage.getItem("voidcloud_token");
    if (!tok) {
      router.replace("/voidcloud/login");
      return;
    }
    load();
  }, [router, load]);

  const kpiCards: BusinessKpi[] = [
    {
      label: "Active VPS instances",
      value: vpsCount,
      change: Object.entries(vpsByStatus)
        .map(([s, c]) => `${s}: ${c}`)
        .join(", "),
      icon: "🖥️",
      href: "/voidcloud/dashboard/vps",
      state: vpsState,
      empty: vpsTotal === 0,
      emptyMessage: "No VPS instances yet",
    },
    {
      label: "Monthly Recurring Revenue",
      value: mrr != null ? `$${mrr}/mo` : "—",
      change: planName ?? "",
      icon: "💰",
      href: "/voidcloud/dashboard/billing",
      state: billingState,
      empty: !planName,
      emptyMessage: "No active subscription",
    },
    {
      label: "Open CRM leads",
      value: openLeads,
      change: `${totalLeads} total`,
      icon: "🎯",
      href: "/voidcloud/dashboard/crm",
      state: crmState,
      empty: totalLeads === 0,
      emptyMessage: "No leads captured yet",
    },
    {
      label: "WhatsApp threads",
      value: whatsappThreads,
      change: `${whatsappSent} sent · ${whatsappDelivered} delivered · ${whatsappFailed} failed`,
      icon: "💬",
      href: "/voidcloud/admin/whatsapp",
      state: waState,
      empty: whatsappThreads === 0,
      emptyMessage: "No broadcasts sent yet",
    },
  ];

  const anyError = [vpsState, billingState, crmState, waState, invoiceState].includes("error");

  return (
    <ErrorBoundary>
      <div className="min-h-screen vc-page text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="section-title text-left">Business Dashboard</h1>
              <p className="mt-2 text-sm text-white/50">Tenant-level KPIs and operational metrics</p>
            </div>
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          {anyError && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
            >
              Some metrics could not be loaded. They will show again once the service responds.
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((k) => (
              <KpiCard key={k.label} kpi={k} />
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="card-title">Recent invoices</h2>
              <div className="mt-4 space-y-3">
                {invoiceState === "loading" ? (
                  <PanelSkeleton />
                ) : invoiceState === "error" ? (
                  <p className="text-sm text-yellow-300">Invoices are temporarily unavailable.</p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-white/50">
                    No invoices yet — they appear after your first billing cycle.
                  </p>
                ) : (
                  invoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium">{inv.number}</div>
                        <div className="text-xs text-white/40">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${inv.amountUSD ?? inv.amountEGP ?? 0}
                        </div>
                        <span
                          className={`text-xs ${
                            inv.status === "PAID"
                              ? "text-green-300"
                              : inv.status === "PENDING"
                              ? "text-yellow-300"
                              : "text-red-300"
                          }`}
                        >
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
              <h2 className="card-title">VPS status breakdown</h2>
              <div className="mt-4 space-y-3">
                {vpsState === "loading" ? (
                  <PanelSkeleton />
                ) : vpsState === "error" ? (
                  <p className="text-sm text-yellow-300">VPS data is temporarily unavailable.</p>
                ) : Object.keys(vpsByStatus).length === 0 ? (
                  <p className="text-sm text-white/50">
                    No VPS instances yet — deploy your first instance to see the breakdown.
                  </p>
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

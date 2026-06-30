
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";

type Tab = "overview" | "leads" | "contacts" | "companies" | "deals" | "tasks";

interface CrmStats {
  leads: number;
  contacts: number;
  companies: number;
  deals: number;
  pendingTasks: number;
  totalDealValue: number;
}

export default function CrmPage() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<CrmStats>("/crm/stats");
        setStats(r.data);
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load CRM stats";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {err}
      </div>
    );
  }

  if (loading) {
    return <p className="text-white/50">{t("common.loading", "Loading…")}</p>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("crm.overview", "Overview") },
    { id: "leads", label: t("crm.leads", "Leads") },
    { id: "contacts", label: t("crm.contacts", "Contacts") },
    { id: "companies", label: t("crm.companies", "Companies") },
    { id: "deals", label: t("crm.deals", "Deals") },
    { id: "tasks", label: t("crm.tasks", "Tasks") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("crm.title", "WhatsApp CRM")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("crm.subtitle", "Manage leads, contacts, deals, and tasks")}</p>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-3xl font-bold text-cyan-400">{stats.leads}</div>
            <div className="mt-2 text-sm text-white/60">{t("crm.total_leads", "Total Leads")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-3xl font-bold text-fuchsia-400">{stats.contacts}</div>
            <div className="mt-2 text-sm text-white/60">{t("crm.total_contacts", "Total Contacts")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-3xl font-bold text-green-400">{stats.companies}</div>
            <div className="mt-2 text-sm text-white/60">{t("crm.total_companies", "Total Companies")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-3xl font-bold text-amber-400">{stats.deals}</div>
            <div className="mt-2 text-sm text-white/60">{t("crm.total_deals", "Total Deals")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-3xl font-bold text-red-400">{stats.pendingTasks}</div>
            <div className="mt-2 text-sm text-white/60">{t("crm.pending_tasks", "Pending Tasks")}</div>
          </div>
        </div>
      )}

      {activeTab === "overview" && stats && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
          <h3 className="text-lg font-semibold text-green-300">{t("crm.pipeline_value", "Pipeline Value")}</h3>
          <p className="mt-2 text-4xl font-bold text-white">${stats.totalDealValue.toLocaleString()}</p>
        </div>
      )}

      {activeTab !== "overview" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/50">{t("crm.tab_coming_soon", "This section is coming soon.")}</p>
        </div>
      )}
    </div>
  );
}

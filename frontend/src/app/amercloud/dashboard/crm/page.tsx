"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";

interface CrmConfig {
  enabled: boolean;
  frontendUrl: string;
  apiUrl: string;
  features: string[];
}

export default function CrmPage() {
  const { t } = useLocale();
  const [cfg, setCfg] = useState<CrmConfig | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<CrmConfig>("/crm/config")
      .then((r) => setCfg(r.data))
      .catch((e: unknown) => {
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load CRM config";
        setErr(msg);
      });
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {err}
      </div>
    );
  }

  if (!cfg) {
    return <p className="text-white/50">{t("common.loading", "Loading…")}</p>;
  }

  if (!cfg.enabled || !cfg.frontendUrl) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h1 className="text-2xl font-bold">{t("crm.title", "WhatsApp CRM")}</h1>
        <p className="mt-3 text-white/70">{t("crm.not_configured", "WhatsApp CRM is not configured.")}</p>
        <p className="mt-4 text-sm text-white/50">
          Deploy MIP-WA-CRM on a VPS and set <code className="text-cyan-300">WA_CRM_FRONTEND_URL</code> on the AmerCloud backend.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("crm.title", "WhatsApp CRM")}</h1>
          <p className="mt-1 text-sm text-white/60">{t("crm.subtitle", "MIP-WA-CRM integrated with AmerCloud")}</p>
          <p className="mt-1 text-xs text-cyan-300/80">{t("crm.features", "Inbox · Leads · Deals")}</p>
        </div>
        <a
          href={cfg.frontendUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {t("crm.open_full", "Open CRM in new tab")}
        </a>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <iframe
          title="WhatsApp CRM"
          src={cfg.frontendUrl}
          className="h-full w-full border-0 bg-slate-950"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";

interface CrmFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export default function CrmPage() {
  const { t } = useLocale();
  const [features, setFeatures] = useState<CrmFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<CrmFeature[]>("/crm/features")
      .then((r) => {
        setFeatures(r.data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load CRM features";
        setErr(msg);
        setLoading(false);
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("crm.title", "WhatsApp CRM")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("crm.subtitle", "Integrated CRM features for managing WhatsApp communications")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-cyan-500/50 hover:bg-white/10"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{feature.name}</h3>
                <p className="mt-2 text-sm text-white/60">{feature.description}</p>
              </div>
              {feature.enabled ? (
                <span className="ml-3 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                  {t("crm.enabled", "Enabled")}
                </span>
              ) : (
                <span className="ml-3 rounded-full bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-400">
                  {t("crm.disabled", "Disabled")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
        <h3 className="text-lg font-semibold text-cyan-300">{t("crm.coming_soon", "Coming Soon")}</h3>
        <p className="mt-2 text-sm text-white/70">
          {t("crm.coming_soon_desc", "Full CRM interface with WhatsApp integration, lead management, and deal tracking will be available in future updates.")}
        </p>
      </div>
    </div>
  );
}

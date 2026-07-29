"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRecentViews } from "@/hooks/useRecentViews";

const PAGE_LABELS: Record<string, string> = {
  "/voidcloud/dashboard": "Dashboard",
  "/voidcloud/admin/users": "Users",
  "/voidcloud/admin/clusters": "Clusters",
  "/voidcloud/admin/monitoring": "Monitoring",
  "/voidcloud/dashboard/vps": "My VPS",
  "/voidcloud/dashboard/billing": "Billing",
  "/voidcloud/dashboard/billing/invoices": "Invoices",
  "/voidcloud/dashboard/crm": "CRM",
  "/voidcloud/admin/billing": "Billing Admin",
  "/voidcloud/admin/incidents": "Incidents",
  "/voidcloud/admin/security": "Security",
  "/voidcloud/admin/audit-log": "Audit Log",
  "/voidcloud/admin/abuse": "Abuse",
  "/voidcloud/admin/settings/secrets": "Secrets",
  "/voidcloud/dashboard/settings": "Settings",
  "/voidcloud/dashboard/settings/team": "Team Settings",
  "/voidcloud/dashboard/settings/business": "Business Settings",
  "/voidcloud/dashboard/settings/api-keys": "API Keys",
  "/voidcloud/dashboard/settings/delete-account": "Delete Account",
  "/settings": "Global Settings",
};

export function useTrackPageView() {
  const pathname = usePathname();
  const { push } = useRecentViews();

  useEffect(() => {
    const label = PAGE_LABELS[pathname] || document.title || pathname.split("/").pop() || "Page";
    push(label, pathname);
  }, [pathname, push]);
}

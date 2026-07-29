"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";

const SEGMENT_LABELS: Record<string, string> = {
  voidcloud: "VoidCloud",
  dashboard: "Dashboard",
  admin: "Admin",
  settings: "Settings",
  users: "Users",
  clusters: "Clusters",
  monitoring: "Monitoring",
  billing: "Billing",
  vps: "VPS",
  crm: "CRM",
  whatsapp: "WhatsApp",
  incidents: "Incidents",
  security: "Security",
  audit: "Audit",
  abuse: "Abuse",
  pods: "Pods",
  plans: "Plans",
  backups: "Backups",
  addons: "Addons",
  apps: "Apps",
  images: "Images",
  webhooks: "Webhooks",
  wallet: "Wallet",
  reports: "Reports",
  orgs: "Organizations",
  referrals: "Referrals",
  onboarding: "Onboarding",
  help: "Help",
  portal: "Portal",
  agent: "Agent",
  conversations: "Conversations",
  leads: "Leads",
  team: "Team",
  business: "Business",
  api: "API Keys",
  notifications: "Notifications",
  accounts: "Accounts",
  danger: "Danger Zone",
  ssh: "SSH Keys",
  profile: "Profile",
  new: "New",
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: { label: string; href: string }[] = [];
    let accum = "";
    for (let i = 0; i < segments.length; i++) {
      accum += `/${segments[i]}`;
      const label = SEGMENT_LABELS[segments[i]] || decodeURIComponent(segments[i]);
      items.push({ label, href: accum });
    }
    return items;
  }, [pathname]);
}

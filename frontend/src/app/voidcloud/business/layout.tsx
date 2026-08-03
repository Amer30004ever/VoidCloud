"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CreditCard, MessageSquare, Server, Settings, Users } from "lucide-react";
import { AppShell, type AppShellNavItem } from "@workspace/ui-kit/app-shell";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

const NAV: AppShellNavItem[] = [
  { href: "/voidcloud/business/dashboard", label: "Overview", icon: <BarChart3 /> },
  { href: "/voidcloud/dashboard/vps", label: "VPS Instances", icon: <Server /> },
  { href: "/voidcloud/dashboard/crm", label: "CRM", icon: <Users /> },
  { href: "/voidcloud/dashboard/whatsapp", label: "WhatsApp", icon: <MessageSquare /> },
  { href: "/voidcloud/dashboard/billing", label: "Billing", icon: <CreditCard /> },
  { href: "/voidcloud/dashboard/settings", label: "Settings", icon: <Settings /> },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("voidcloud_token");
    sessionStorage.removeItem("voidcloud_token");
    router.push("/voidcloud/login");
  }

  return (
    <AppShell
      linkComponent={Link}
      brand={{ href: "/voidcloud/business/dashboard", label: "VoidCloud" }}
      items={NAV.map((it) => ({ ...it, active: pathname === it.href }))}
      onSignOut={logout}
      topbarLeft={<Breadcrumbs />}
      topbarRight={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}

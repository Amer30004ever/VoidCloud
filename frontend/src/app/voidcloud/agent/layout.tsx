"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, MessageSquare, Users } from "lucide-react";
import { AppShell, type AppShellNavItem } from "@workspace/ui-kit/app-shell";
import { NotificationBell } from "@/components/ui/NotificationBell";

const NAV: AppShellNavItem[] = [
  { href: "/voidcloud/agent/dashboard", label: "Dashboard", icon: <BarChart3 /> },
  { href: "/voidcloud/agent/conversations", label: "Conversations", icon: <MessageSquare /> },
  { href: "/voidcloud/agent/leads", label: "Leads", icon: <Users /> },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
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
      brand={{ href: "/voidcloud/agent/dashboard", label: "VoidCloud" }}
      items={NAV.map((it) => ({ ...it, active: pathname === it.href }))}
      onSignOut={logout}
      topbarLeft="Agent Workspace"
      topbarRight={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}

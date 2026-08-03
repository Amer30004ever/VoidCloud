"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  Database,
  Disc,
  Gift,
  HardDriveDownload,
  Home,
  Languages,
  MessageSquare,
  Receipt,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Users,
  Wallet,
  Webhook,
  Gem,
} from "lucide-react";
import api from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { AppShell, type AppShellNavItem } from "@workspace/ui-kit/app-shell";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import { NotificationBell } from "@/components/ui/NotificationBell";
import AiAssistant from "@/components/ai/AiAssistant";

type Lang = "en" | "ar";

function t(dict: unknown, path: string, fallback: string) {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict) as string ?? fallback;
}

const CRUMB_LABELS: Record<string, string> = {
  voidcloud: "VoidCloud",
  admin: "Admin",
  dashboard: "Dashboard",
  vps: "VPS Instances",
  whatsapp: "WhatsApp",
  crm: "CRM",
};

function crumbs(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((seg) => CRUMB_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" / ");
}

export default function CloudDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("amer_lang") as Lang) || "en";
  });
  const [role, setRole] = useState<string | null>(null);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const isAdminArea = pathname.startsWith("/voidcloud/admin");
  const dict = lang === "ar" ? ar : en;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tok = localStorage.getItem("voidcloud_token") || sessionStorage.getItem("voidcloud_token");
    if (!tok) {
      setAuthChecking(false);
      if (!pathname.startsWith("/voidcloud/login")) {
        router.replace("/voidcloud/login");
      }
      return;
    }
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      setImpersonatedBy(r.data?.impersonatedBy ?? null);
      setOnboardingCompleted(r.data?.onboardingCompleted ?? false);
    }).catch(() => setRole(null)).finally(() => setAuthChecking(false));
  }, [router]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (typeof window !== "undefined") localStorage.setItem("amer_lang", lang);
  }, [lang]);

  useEffect(() => {
    if (role === "ADMIN" && !onboardingCompleted && (pathname.startsWith("/voidcloud/admin") || pathname.startsWith("/voidcloud/dashboard"))) {
      router.replace("/voidcloud/onboarding");
    }
  }, [role, onboardingCompleted, pathname, router]);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const NAV: AppShellNavItem[] = useMemo(() => [
    { href: "/voidcloud/user/dashboard", label: t(dict, "dashboard.welcome", "Dashboard").replace(", {{name}}", "").replace("Welcome", "Dashboard"), icon: <Home /> },
    { href: "/voidcloud/dashboard/vps", label: t(dict, "dashboard.deployments", "VPS Instances"), icon: <Server /> },
    { href: "/voidcloud/dashboard/images", label: "Images", icon: <Disc /> },
    { href: "/voidcloud/dashboard/analytics", label: "Analytics", icon: <BarChart3 /> },
    { href: "/voidcloud/dashboard/backups", label: "Backups", icon: <HardDriveDownload /> },
    { href: "/voidcloud/dashboard/webhooks", label: "Webhooks", icon: <Webhook /> },
    { href: "/voidcloud/dashboard/referral", label: "Referral", icon: <Gift /> },
    { href: "/voidcloud/dashboard/billing", label: t(dict, "dashboard.billing", "Billing"), icon: <CreditCard /> },
    { href: "/voidcloud/dashboard/wallet", label: "Wallet", icon: <Wallet /> },
    { href: "/voidcloud/dashboard/settings", label: t(dict, "dashboard.settings", "Settings"), icon: <Settings /> },
  ], [dict]);

  const ADMIN_NAV: AppShellNavItem[] = useMemo(() => [
    { href: "/voidcloud/admin/dashboard", label: t(dict, "admin.dashboard", "Dashboard"), icon: <BarChart3 /> },
    { href: "/voidcloud/admin/users", label: t(dict, "admin.users", "Users"), icon: <Users /> },
    { href: "/voidcloud/admin/plans", label: t(dict, "admin.plans", "Plans"), icon: <Gem /> },
    { href: "/voidcloud/dashboard/vps", label: t(dict, "dashboard.deployments", "VPS Instances"), icon: <Server /> },
    { href: "/voidcloud/admin/clusters", label: "Proxmox Clusters", icon: <Database /> },
    { href: "/voidcloud/admin/monitoring", label: "Monitoring", icon: <Activity /> },
    { href: "/voidcloud/admin/pods", label: "Pod Manager", icon: <Boxes /> },
    { href: "/voidcloud/admin/security", label: "Security", icon: <Shield /> },
    { href: "/voidcloud/admin/abuse", label: "Abuse & AUP", icon: <ShieldAlert /> },
    { href: "/voidcloud/admin/billing", label: t(dict, "dashboard.billing", "Billing"), icon: <CreditCard /> },
    { href: "/voidcloud/admin/whatsapp", label: "WhatsApp Broadcast", icon: <MessageSquare /> },
    { href: "/voidcloud/admin/transactions", label: t(dict, "admin.transactions", "Transactions"), icon: <Receipt /> },
    { href: "/voidcloud/dashboard/settings", label: t(dict, "dashboard.settings", "Settings"), icon: <Settings /> },
  ], [dict]);

  const logoHref = role
    ? (isAdmin ? "/voidcloud/admin/dashboard" : "/voidcloud/user/dashboard")
    : "/voidcloud";

  function stopImpersonating() {
    try {
      const token = localStorage.getItem("voidcloud_token") || sessionStorage.getItem("voidcloud_token");
      if (token) {
        fetch(`${API_BASE_URL}/auth/impersonate/exit`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }).catch(() => {});
      }
    } catch {
      // best-effort audit log; always clear locally
    }
    localStorage.removeItem("voidcloud_token");
    sessionStorage.removeItem("voidcloud_token");
    router.push("/voidcloud/login");
  }

  function logout() {
    localStorage.removeItem("voidcloud_token");
    sessionStorage.removeItem("voidcloud_token");
    router.push("/voidcloud/login");
  }

  if (authChecking) {
    return <LoadingState message="Loading dashboard..." />;
  }

  const items = (isAdminArea ? ADMIN_NAV : NAV).map((it) => ({ ...it, active: pathname === it.href }));
  const footerNav: AppShellNavItem[] | undefined = isAdmin
    ? [
        {
          href: isAdminArea ? "/voidcloud/user/dashboard" : "/voidcloud/admin/dashboard",
          label: isAdminArea ? "Back to user" : "Admin Panel",
          icon: isAdminArea ? <ArrowLeft /> : <Shield />,
        },
      ]
    : undefined;

  return (
    <AppShell
      linkComponent={Link}
      rtl={lang === "ar"}
      brand={{ href: logoHref, label: "VoidCloud" }}
      items={items}
      footerNav={footerNav}
      onSignOut={logout}
      signOutLabel={t(dict, "dashboard.logout", "Sign out")}
      topbarLeft={crumbs(pathname)}
      topbarRight={
        <>
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <Languages className="size-3.5" />
            {lang === "en" ? "العربية" : "EN"}
          </button>
          <NotificationBell />
        </>
      }
      banner={
        impersonatedBy ? (
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-2 text-white">
            <span className="flex min-w-0 items-center gap-2 text-xs font-medium sm:text-sm">
              <Search className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                Viewing as impersonated user — actions are logged with admin traceability
              </span>
            </span>
            <button onClick={stopImpersonating} className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
              Stop impersonating
            </button>
          </div>
        ) : null
      }
    >
      {children}
      <AiAssistant />
    </AppShell>
  );
}

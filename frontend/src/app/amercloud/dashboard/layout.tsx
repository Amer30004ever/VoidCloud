"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLocale } from "@/contexts/LocaleContext";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export default function CloudDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLocale();
  const [open, setOpen] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const isAdminArea = pathname.startsWith("/amercloud/admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tok = localStorage.getItem("amer_portal_token") || sessionStorage.getItem("amer_portal_token");
    if (!tok) {
      router.replace("/amercloud/login");
      return;
    }
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      setUserName(r.data?.name?.split(" ")[0] ?? "");
      setUserEmail(r.data?.email ?? "");
    }).catch(() => setRole(null));
  }, [router]);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const NAV: NavItem[] = useMemo(() => [
    { href: "/amercloud/user/dashboard", label: userName ? t("dashboard.welcome", "Home") : t("dashboard.home", "Home"), icon: "⬡" },
    { href: "/amercloud/dashboard/vps", label: t("dashboard.deployments", "VPS Instances"), icon: "⬡" },
    { href: "/amercloud/dashboard/monitoring", label: t("dashboard.monitoring", "Monitoring"), icon: "⬡" },
    { href: "/amercloud/dashboard/databases", label: t("dashboard.databases", "Databases"), icon: "⬡" },
    { href: "/amercloud/dashboard/images", label: t("dashboard.images", "Images"), icon: "⬡" },
    { href: "/amercloud/dashboard/analytics", label: t("dashboard.analytics", "Analytics"), icon: "⬡" },
    { href: "/amercloud/dashboard/backups", label: t("dashboard.backups", "Backups"), icon: "⬡" },
    { href: "/amercloud/dashboard/crm", label: t("dashboard.crm", "WhatsApp CRM"), icon: "⬡" },
    { href: "/amercloud/dashboard/webhooks", label: t("dashboard.webhooks", "Webhooks"), icon: "⬡" },
    { href: "/amercloud/dashboard/referral", label: t("dashboard.referral", "Referral"), icon: "⬡" },
    { href: "/amercloud/dashboard/billing", label: t("dashboard.billing", "Billing"), icon: "⬡" },
    { href: "/amercloud/dashboard/enterprise", label: t("dashboard.enterprise", "Enterprise"), icon: "⬡" },
    { href: "/amercloud/dashboard/settings", label: t("dashboard.settings", "Settings"), icon: "⬡" },
  ], [t, userName]);

  const ADMIN_NAV: NavItem[] = useMemo(() => [
    { href: "/amercloud/admin/dashboard", label: t("admin.dashboard", "Dashboard"), icon: "⬡" },
    { href: "/amercloud/admin/users", label: t("admin.users", "Users"), icon: "⬡" },
    { href: "/amercloud/admin/plans", label: t("admin.plans", "Plans"), icon: "⬡" },
    { href: "/amercloud/dashboard/vps", label: t("dashboard.deployments", "VPS Instances"), icon: "⬡" },
    { href: "/amercloud/dashboard/monitoring", label: t("dashboard.monitoring", "Monitoring"), icon: "⬡" },
    { href: "/amercloud/admin/billing", label: t("dashboard.billing", "Billing"), icon: "⬡" },
    { href: "/amercloud/admin/transactions", label: t("admin.transactions", "Transactions"), icon: "⬡" },
    { href: "/amercloud/dashboard/settings", label: t("dashboard.settings", "Settings"), icon: "⬡" },
  ], [t]);

  const NAV_ICONS: Record<string, string> = {
    Home: "󰋜",
    "VPS Instances": "󰟀",
    Monitoring: "󰕎",
    Databases: "󰆼",
    Images: "󰸉",
    Analytics: "󰄮",
    Backups: "󰅙",
    "WhatsApp CRM": "󰭻",
    Webhooks: "󱘖",
    Referral: "󰾨",
    Billing: "󰏗",
    Enterprise: "󱤵",
    Settings: "󰒓",
    Dashboard: "󰕮",
    Users: "󰀉",
    Plans: "󰑫",
    Transactions: "󱒃",
  };

  const ICON_FALLBACK: Record<string, string> = {
    "Home": "🏠",
    "VPS Instances": "🖥️",
    "Monitoring": "📡",
    "Databases": "🗄️",
    "Images": "💿",
    "Analytics": "📈",
    "Backups": "💾",
    "WhatsApp CRM": "💬",
    "Webhooks": "🪝",
    "Referral": "🎁",
    "Billing": "💳",
    "Enterprise": "🏢",
    "Settings": "⚙️",
    "Dashboard": "📊",
    "Users": "👤",
    "Plans": "💎",
    "Transactions": "🧾",
  };

  const logoHref = role
    ? (isAdmin ? "/amercloud/admin/dashboard" : "/amercloud/user/dashboard")
    : "/amercloud";

  function logout() {
    localStorage.removeItem("amer_portal_token");
    sessionStorage.removeItem("amer_portal_token");
    router.push("/amercloud/login");
  }

  const activeNav = (isAdminArea ? ADMIN_NAV : NAV);
  const initials = userName ? userName.slice(0, 2).toUpperCase() : "?";

  return (
    <div className={`flex min-h-screen bg-slate-950 text-white ${lang === "ar" ? "direction-rtl" : ""}`}>
      <aside
        className={`relative flex flex-col border-white/5 bg-slate-900/80 backdrop-blur-2xl transition-all duration-300 ${
          lang === "ar" ? "border-l" : "border-r"
        } ${open ? "w-60" : "w-[4.5rem]"}`}
      >
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent`} />

        <div className="flex items-center gap-3 px-4 py-5">
          <Link href={logoHref} className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              ☁
            </span>
            {open && (
              <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-sm font-bold tracking-wide text-transparent">
                VoidCloud
              </span>
            )}
          </Link>
          {open && <div className="ml-auto" />}
          <button
            onClick={() => setOpen(!open)}
            className="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
            aria-label="Toggle sidebar"
          >
            <svg className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="px-2">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/20">
            {open ? (isAdminArea ? "Admin" : "Platform") : ""}
          </div>
          <nav className="space-y-0.5">
            {activeNav.map((it) => {
              const isActive = pathname === it.href || (it.href !== "/amercloud/user/dashboard" && pathname.startsWith(it.href));
              const icon = ICON_FALLBACK[it.label] ?? "○";
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={!open ? it.label : undefined}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/10 text-white shadow-sm"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 h-6 w-0.5 rounded-r-full bg-gradient-to-b from-cyan-400 to-fuchsia-500" />
                  )}
                  <span className="shrink-0 text-base leading-none">{icon}</span>
                  {open && (
                    <>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {it.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="px-2 pt-3">
            <div className="mb-1 border-t border-white/5 pt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/20">
              {open ? "Switch" : ""}
            </div>
            <Link
              href={isAdminArea ? "/amercloud/user/dashboard" : "/amercloud/admin/dashboard"}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <span className="shrink-0">{isAdminArea ? "←" : "🛡️"}</span>
              {open && <span>{isAdminArea ? t("dashboard.back_to_user", "User view") : t("dashboard.admin_panel", "Admin Panel")}</span>}
            </Link>
          </div>
        )}

        <div className="mt-auto border-t border-white/5 p-3">
          {open ? (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{userName || "User"}</p>
                <p className="truncate text-[10px] text-white/30">{userEmail || role}</p>
              </div>
              <button onClick={logout} title="Sign out" className="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-xs font-bold text-white">
                {initials}
              </div>
              <button onClick={logout} title="Sign out" className="rounded-md p-1 text-white/30 hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-xs text-white/20 sm:flex">
              {pathname.split("/").filter(Boolean).map((seg, i, arr) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span>/</span>}
                  <span className={i === arr.length - 1 ? "text-white/60" : ""}>{seg}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
            >
              {lang === "en" ? "🇪🇬 العربية" : "🇬🇧 EN"}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

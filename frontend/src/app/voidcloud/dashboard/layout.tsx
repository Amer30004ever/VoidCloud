"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import { NotificationBell } from "@/components/ui/NotificationBell";


type Lang = "en" | "ar";

function t(dict: unknown, path: string, fallback: string) {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict) as string ?? fallback;
}

export default function CloudDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("amer_lang") as Lang) || "en";
  });
  const [role, setRole] = useState<string | null>(null);
  const isAdminArea = pathname.startsWith("/voidcloud/admin");
  const dict = lang === "ar" ? ar : en;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tok = localStorage.getItem("amer_portal_token") || sessionStorage.getItem("amer_portal_token");
    if (!tok) {
      router.replace("/voidcloud/login");
      return;
    }
    api.get("/auth/me").then((r) => setRole(r.data?.role ?? null)).catch(() => setRole(null));
  }, [router]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (typeof window !== "undefined") localStorage.setItem("amer_lang", lang);
  }, [lang]);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const NAV = useMemo(() => [
    { href: "/voidcloud/user/dashboard", label: t(dict, "dashboard.welcome", "Dashboard").replace(", {{name}}", "").replace("Welcome", "Dashboard"), icon: "ðŸ " },
    { href: "/voidcloud/dashboard/vps", label: t(dict, "dashboard.deployments", "VPS Instances"), icon: "ðŸ–¥ï¸" },
    { href: "/voidcloud/dashboard/images", label: "Images", icon: "ðŸ’¿" },
    { href: "/voidcloud/dashboard/analytics", label: "Analytics", icon: "ðŸ“ˆ" },
    { href: "/voidcloud/dashboard/backups", label: "Backups", icon: "ðŸ’¾" },
    { href: "/voidcloud/dashboard/webhooks", label: "Webhooks", icon: "ðŸª" },
    { href: "/voidcloud/dashboard/referral", label: "Referral", icon: "ðŸŽ" },
    { href: "/voidcloud/dashboard/billing", label: t(dict, "dashboard.billing", "Billing"), icon: "ðŸ’³" },
    { href: "/voidcloud/dashboard/settings", label: t(dict, "dashboard.settings", "Settings"), icon: "âš™ï¸" },
  ], [dict]);

  const ADMIN_NAV = useMemo(() => [
    { href: "/voidcloud/admin/dashboard", label: t(dict, "admin.dashboard", "Dashboard"), icon: "ðŸ“Š" },
    { href: "/voidcloud/admin/users", label: t(dict, "admin.users", "Users"), icon: "ðŸ‘¤" },
    { href: "/voidcloud/admin/plans", label: t(dict, "admin.plans", "Plans"), icon: "ðŸ’Ž" },
    { href: "/voidcloud/dashboard/vps", label: t(dict, "dashboard.deployments", "VPS Instances"), icon: "ðŸ–¥ï¸" },
    { href: "/voidcloud/admin/clusters", label: "Proxmox Clusters", icon: "🗄️" },
    { href: "/voidcloud/admin/monitoring", label: "Monitoring", icon: "❤️" },
    { href: "/voidcloud/admin/billing", label: t(dict, "dashboard.billing", "Billing"), icon: "ðŸ’°" },
    { href: "/voidcloud/admin/transactions", label: t(dict, "admin.transactions", "Transactions"), icon: "ðŸ§¾" },
    { href: "/voidcloud/dashboard/settings", label: t(dict, "dashboard.settings", "Settings"), icon: "âš™ï¸" },
  ], [dict]);

  const logoHref = role
    ? (isAdmin ? "/voidcloud/admin/dashboard" : "/voidcloud/user/dashboard")
    : "/voidcloud";

  function logout() {
    localStorage.removeItem("amer_portal_token");
    sessionStorage.removeItem("amer_portal_token");
    router.push("/voidcloud/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside
        className={`flex flex-col border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all ${
          lang === "ar" ? "border-l" : "border-r"
        } ${open ? "w-64" : "w-16"}`}
      >
        <div className="flex items-center justify-between p-4">
          <Link href={logoHref} className={`flex items-center gap-2 font-bold ${open ? "" : "hidden"}`}>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">â˜</span>
            VoidCloud
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-md p-1 text-white/60 hover:bg-white/10">
            {open ? (lang === "ar" ? "â–¶" : "â—€") : (lang === "ar" ? "â—€" : "â–¶")}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {(isAdminArea ? ADMIN_NAV : NAV).map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                pathname === it.href ? "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{it.icon}</span>
              {open && <span>{it.label}</span>}
            </Link>
          ))}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-white/5" />
              <Link
                href={isAdminArea ? "/voidcloud/user/dashboard" : "/voidcloud/admin/dashboard"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span>{isAdminArea ? "â†" : "ðŸ›¡ï¸"}</span>
                {open && <span>{isAdminArea ? "Back to user" : "Admin Panel"}</span>}
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-white/5 p-3">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-start text-sm text-white/60 hover:bg-white/5 hover:text-white">
            ðŸšª {open && (t(dict, "dashboard.logout", "Sign out"))}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-3 backdrop-blur-xl">
          <div className="text-sm text-white/50">{pathname}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="rounded-md border border-white/10 px-3 py-1 text-xs">
              {lang === "en" ? "ðŸ‡ªðŸ‡¬ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "ðŸ‡¬ðŸ‡§ EN"}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

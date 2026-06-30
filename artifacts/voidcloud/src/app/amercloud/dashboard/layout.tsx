
import Link from "@/compat/next-link";
import { usePathname, useRouter } from "@/compat/next-navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLocale } from "@/contexts/LocaleContext";

export default function CloudDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLocale();
  const [open, setOpen] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
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
    }).catch(() => setRole(null));
  }, [router]);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const NAV = useMemo(() => [
    { href: "/amercloud/user/dashboard", label: userName ? t("dashboard.welcome", "Welcome, {{name}}", { name: userName }) : t("dashboard.home", "Home"), icon: "🏠" },
    { href: "/amercloud/dashboard/vps", label: t("dashboard.deployments", "VPS Instances"), icon: "🖥️" },
    { href: "/amercloud/dashboard/crm", label: t("dashboard.crm", "WhatsApp CRM"), icon: "💬" },
    { href: "/amercloud/dashboard/images", label: t("dashboard.images", "Images"), icon: "💿" },
    { href: "/amercloud/dashboard/analytics", label: t("dashboard.analytics", "Analytics"), icon: "📈" },
    { href: "/amercloud/dashboard/backups", label: t("dashboard.backups", "Backups"), icon: "💾" },
    { href: "/amercloud/dashboard/databases", label: t("dashboard.databases", "Databases"), icon: "🗄️" },
    { href: "/amercloud/dashboard/webhooks", label: t("dashboard.webhooks", "Webhooks"), icon: "🪝" },
    { href: "/amercloud/dashboard/referral", label: t("dashboard.referral", "Referral"), icon: "🎁" },
    { href: "/amercloud/dashboard/billing", label: t("dashboard.billing", "Billing"), icon: "💳" },
    { href: "/amercloud/dashboard/enterprise", label: t("dashboard.enterprise", "Enterprise"), icon: "🏢" },
    { href: "/amercloud/dashboard/settings", label: t("dashboard.settings", "Settings"), icon: "⚙️" },
  ], [t, userName]);

  const ADMIN_NAV = useMemo(() => [
    { href: "/amercloud/admin/dashboard", label: t("admin.dashboard", "Dashboard"), icon: "📊" },
    { href: "/amercloud/admin/users", label: t("admin.users", "Users"), icon: "👤" },
    { href: "/amercloud/admin/plans", label: t("admin.plans", "Plans"), icon: "💎" },
    { href: "/amercloud/dashboard/vps", label: t("dashboard.deployments", "VPS Instances"), icon: "🖥️" },
    { href: "/amercloud/admin/billing", label: t("dashboard.billing", "Billing"), icon: "💰" },
    { href: "/amercloud/admin/transactions", label: t("admin.transactions", "Transactions"), icon: "🧾" },
    { href: "/amercloud/dashboard/settings", label: t("dashboard.settings", "Settings"), icon: "⚙️" },
  ], [t]);

  const logoHref = role
    ? (isAdmin ? "/amercloud/admin/dashboard" : "/amercloud/user/dashboard")
    : "/amercloud";

  function logout() {
    localStorage.removeItem("amer_portal_token");
    sessionStorage.removeItem("amer_portal_token");
    router.push("/amercloud/login");
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
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">☁</span>
            VoidCloud
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-md p-1 text-white/60 hover:bg-white/10">
            {open ? (lang === "ar" ? "▶" : "◀") : (lang === "ar" ? "◀" : "▶")}
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
                href={isAdminArea ? "/amercloud/user/dashboard" : "/amercloud/admin/dashboard"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span>{isAdminArea ? "←" : "🛡️"}</span>
                {open && <span>{isAdminArea ? t("dashboard.back_to_user", "Back to user") : t("dashboard.admin_panel", "Admin Panel")}</span>}
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-white/5 p-3">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-start text-sm text-white/60 hover:bg-white/5 hover:text-white">
            🚪 {open && t("dashboard.logout", "Sign out")}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm text-white/50">{pathname}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="rounded-md border border-white/10 px-3 py-1 text-xs">
              {lang === "en" ? "🇪🇬 العربية" : "🇬🇧 EN"}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

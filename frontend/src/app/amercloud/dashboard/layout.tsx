"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const NAV = [
  { href: "/amercloud/user/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/amercloud/dashboard/deployments", label: "Deployments", icon: "🚀" },
  { href: "/amercloud/dashboard/billing", label: "Billing", icon: "💳" },
  { href: "/amercloud/dashboard/settings", label: "Settings", icon: "⚙️" },
  { href: "/amercloud/dashboard/settings/api-keys", label: "API Keys", icon: "🔑" },
];

const ADMIN_NAV = [
  { href: "/amercloud/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/amercloud/admin/users", label: "Users", icon: "👤" },
  { href: "/amercloud/admin/plans", label: "Plans", icon: "💎" },
  { href: "/amercloud/dashboard/deployments", label: "Deployments", icon: "🚀" },
  { href: "/amercloud/admin/billing", label: "Billing", icon: "💰" },
  { href: "/amercloud/dashboard/settings", label: "Settings", icon: "⚙️" },
  { href: "/amercloud/dashboard/settings/api-keys", label: "API Keys", icon: "🔑" },
  { href: "/amercloud/dashboard/settings/team", label: "Team", icon: "👥" },
];

export default function CloudDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [role, setRole] = useState<string | null>(null);
  const isAdminArea = pathname.startsWith("/amercloud/admin");

  useEffect(() => {
    const t = typeof window !== "undefined" && (localStorage.getItem("amer_portal_token") || sessionStorage.getItem("amer_portal_token"));
    if (!t) {
      router.replace("/amercloud/login");
      return;
    }
    api.get("/auth/me").then((r) => setRole(r.data?.role ?? null)).catch(() => setRole(null));
  }, [router]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  function logout() {
    localStorage.removeItem("amer_portal_token");
    sessionStorage.removeItem("amer_portal_token");
    router.push("/amercloud/login");
  }

  const isAdmin = role === "ADMIN";

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside
        className={`flex flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all ${
          open ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <Link href="/amercloud/dashboard" className={`flex items-center gap-2 font-bold ${open ? "" : "hidden"}`}>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">☁</span>
            AmerCloud
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-md p-1 text-white/60 hover:bg-white/10">
            {open ? "◀" : "▶"}
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
                href={isAdminArea ? "/amercloud/dashboard" : "/amercloud/admin"}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span>{isAdminArea ? "←" : "🛡️"}</span>
                {open && <span>{isAdminArea ? "Back to user" : "Admin Panel"}</span>}
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-white/5 p-3">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white">
            🚪 {open && "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-3 backdrop-blur-xl">
          <div className="text-sm text-white/50">{pathname}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="rounded-md border border-white/10 px-3 py-1 text-xs">
              {lang === "en" ? "🇪🇬 AR" : "🇬🇧 EN"}
            </button>
            <button className="rounded-md border border-white/10 px-3 py-1 text-xs" title="Notifications">🔔</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

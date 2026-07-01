"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { NotificationBell } from "@/components/ui/NotificationBell";

const SA_NAV = [
  { href: "/voidcloud/admin/dashboard",    label: "Dashboard",          icon: "📊" },
  { href: "/voidcloud/admin/users",         label: "Users",              icon: "👤" },
  { href: "/voidcloud/admin/tenants",       label: "Tenants",            icon: "🏢" },
  { href: "/voidcloud/admin/quotas",        label: "Resource Quotas",    icon: "🎯" },
  { href: "/voidcloud/admin/vps",           label: "VPS Instances",      icon: "🖥️" },
  { href: "/voidcloud/admin/clusters",      label: "Proxmox Clusters",   icon: "⚡" },
  { href: "/voidcloud/admin/broadcast",     label: "WA Broadcast",       icon: "📢" },
  { href: "/voidcloud/admin/whatsapp",      label: "WhatsApp CRM",       icon: "💬" },
  { href: "/voidcloud/admin/plans",         label: "Plans",              icon: "💎" },
  { href: "/voidcloud/admin/billing",       label: "Revenue",            icon: "💳" },
  { href: "/voidcloud/admin/pods",          label: "K8s Pods",           icon: "☸️" },
  { href: "/voidcloud/admin/rate-limits",   label: "Rate Limits",        icon: "🛡️" },
  { href: "/voidcloud/admin/maintenance",   label: "Maintenance",        icon: "🔧" },
  { href: "/voidcloud/admin/audit",         label: "Audit Logs",         icon: "📋" },
  { href: "/voidcloud/admin/monitoring",    label: "Monitoring",         icon: "📡" },
  { href: "/voidcloud/admin/settings",      label: "Settings",           icon: "⚙️" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setSidebarOpen] = useState(true);
  const [name, setName] = useState("Super Admin");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tok = localStorage.getItem("amer_portal_token") || sessionStorage.getItem("amer_portal_token");
    if (!tok) { router.replace("/voidcloud/login"); return; }
    api.get("/auth/me").then((r) => {
      const userRole = r.data?.role ?? "";
      setRole(userRole);
      setName(r.data?.name?.split(" ")[0] ?? "Admin");
      setEmail(r.data?.email ?? "");
      if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
        router.replace("/voidcloud/login");
      } else {
        setReady(true);
      }
    }).catch(() => router.replace("/voidcloud/login"));
  }, [router]);

  function logout() {
    localStorage.removeItem("amer_portal_token");
    sessionStorage.removeItem("amer_portal_token");
    router.push("/voidcloud/login");
  }

  if (!ready) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className={`relative flex flex-col border-r border-white/5 bg-slate-900/90 backdrop-blur-2xl transition-all duration-300 ${open ? "w-60" : "w-[4.5rem]"}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
        <div className="flex items-center gap-3 px-4 py-5">
          <Link href="/voidcloud/admin/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-base font-black text-white shadow-lg shadow-red-500/20">
              🛡️
            </span>
            {open && (
              <span className="bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-sm font-bold tracking-wide text-transparent">
                Super Admin
              </span>
            )}
          </Link>
          {open && <div className="ml-auto" />}
          <button onClick={() => setSidebarOpen(!open)} className="shrink-0 rounded-md p-1 text-white/30 hover:bg-white/10 hover:text-white">
            <svg className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="mx-3 mb-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Full system access</p>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 px-2">
          {SA_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/voidcloud/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!open ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive ? "bg-gradient-to-r from-red-500/15 to-orange-500/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && <span className="absolute left-0 h-6 w-0.5 rounded-r-full bg-gradient-to-b from-red-400 to-orange-400" />}
                <span className="shrink-0 text-base leading-none">{item.icon}</span>
                {open && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {open && role === "SUPER_ADMIN" && (
          <div className="px-2 pt-2">
            <div className="border-t border-white/5 pt-2">
              <Link href="/voidcloud/user/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/5 hover:text-white">
                <span>👁️</span><span>View as User</span>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-auto border-t border-white/5 p-3">
          {open ? (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{name}</p>
                <p className="truncate text-[10px] text-red-300/70">{role}</p>
                <p className="truncate text-[10px] text-white/30">{email}</p>
              </div>
              <button onClick={logout} title="Sign out" className="shrink-0 rounded-md p-1 text-white/30 hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-xs font-bold">{initials}</div>
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
          <div className="flex items-center gap-2 text-xs text-white/20">
            {pathname.split("/").filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                <span className={i === arr.length - 1 ? "text-white/60" : ""}>{seg}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

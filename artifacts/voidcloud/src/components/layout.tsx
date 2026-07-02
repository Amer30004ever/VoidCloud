import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard, Users, Server, LogOut, Settings, MessageSquare,
  CreditCard, Building2, Shield, Activity, FileText, Cpu, Moon, Sun,
  ChevronLeft, ChevronRight, Bell, UserCog, Network, AlertTriangle,
  BookOpen, Phone, Layers, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

function useTheme() {
  const stored = localStorage.getItem("vc_theme") || "dark";
  const [theme, setThemeState] = useState<"dark" | "light">(stored as "dark" | "light");
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("vc_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    setThemeState(next);
  };
  return { theme, toggle };
}

const superAdminLinks = [
  { href: "/admin/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/users",      label: "Users",         icon: Users },
  { href: "/admin/tenants",    label: "Tenants",       icon: Building2 },
  { href: "/admin/vps",        label: "VPS Instances", icon: Server },
  { href: "/admin/clusters",   label: "Clusters",      icon: Network },
  { href: "/admin/whatsapp",   label: "WhatsApp CRM",  icon: MessageSquare },
  { href: "/admin/plans",      label: "Plans",         icon: Layers },
  { href: "/admin/billing",    label: "Billing",       icon: CreditCard },
  { href: "/admin/monitoring", label: "Monitoring",    icon: Activity },
  { href: "/admin/pods",       label: "Pod Manager",   icon: Cpu },
  { href: "/admin/security",   label: "Security",      icon: Shield },
  { href: "/admin/audit",      label: "Audit Logs",    icon: FileText },
  { href: "/admin/settings",   label: "Settings",      icon: Settings },
];

const adminLinks = [
  { href: "/business/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/business/team",      label: "Team",         icon: Users },
  { href: "/business/crm",       label: "WhatsApp CRM", icon: MessageSquare },
  { href: "/business/vps",       label: "VPS",          icon: Server },
  { href: "/business/billing",   label: "Billing",      icon: CreditCard },
  { href: "/business/settings",  label: "Settings",     icon: Settings },
];

const agentLinks = [
  { href: "/agent/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/agent/conversations",  label: "Conversations", icon: MessageSquare },
  { href: "/agent/leads",          label: "Leads",         icon: UserCog },
];

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vps",       label: "My VPS",    icon: Server },
  { href: "/billing",   label: "Billing",   icon: CreditCard },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

const roleBadgeColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
  ADMIN:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
  AGENT:       "bg-violet-500/20 text-violet-400 border-violet-500/30",
  USER:        "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => logout() });
  };

  const links =
    user?.role === "SUPER_ADMIN" ? superAdminLinks :
    user?.role === "ADMIN"       ? adminLinks :
    user?.role === "AGENT"       ? agentLinks : userLinks;

  const activeLink = links.find(l => location === l.href || location.startsWith(l.href + "/"));
  const initials = (user?.name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-border ${collapsed ? "justify-center px-3" : "px-5 gap-3"}`}>
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-black text-xs">VC</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-foreground">VoidCloud</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location === link.href || location.startsWith(link.href + "/");
          return (
            <Link key={link.href} href={link.href}>
              <a
                onClick={() => setMobileOpen(false)}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${collapsed ? "justify-center" : ""}
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`p-3 border-t border-border space-y-2`}>
        {/* User info */}
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${roleBadgeColors[user?.role || "USER"] || ""}`}>
                {user?.role}
              </span>
            </div>
          )}
        </div>

        {/* Theme + Logout */}
        <div className={`flex gap-1 ${collapsed ? "flex-col" : ""}`}>
          <button
            onClick={toggle}
            title="Toggle theme"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Logout
            </button>
          )}
          {collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 flex-shrink-0
          ${collapsed ? "w-14" : "w-56"}`}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute left-0 top-20 ml-[calc(var(--sidebar-w)-12px)] hidden md:flex items-center justify-center h-6 w-6 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-sm transition-colors z-10"
          style={{ marginLeft: collapsed ? "44px" : "208px" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Sidebar — mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-border bg-card md:hidden transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 md:px-6 bg-card/50 backdrop-blur gap-3">
          <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(o => !o)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">
            {activeLink?.label || "VoidCloud"}
          </h1>
          <div className="flex items-center gap-2">
            <button className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

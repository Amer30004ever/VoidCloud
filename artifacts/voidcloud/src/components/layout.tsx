import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { LayoutDashboard, Users, Server, LogOut, Settings, MessageSquare, CreditCard } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
      }
    });
  };

  const superAdminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/vps", label: "VPS Instances", icon: Server },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
    { href: "/admin/billing", label: "Billing", icon: CreditCard },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const adminLinks = [
    { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/business/team", label: "Team", icon: Users },
    { href: "/business/vps", label: "VPS", icon: Server },
  ];

  const agentLinks = [
    { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent/conversations", label: "Conversations", icon: MessageSquare },
  ];

  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vps", label: "My VPS", icon: Server },
  ];

  const links = user?.role === "SUPER_ADMIN" ? superAdminLinks :
                user?.role === "ADMIN" ? adminLinks :
                user?.role === "AGENT" ? agentLinks : userLinks;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-bold text-xl tracking-tight text-primary">VoidCloud</span>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <a className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground">{user?.role}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center px-8 bg-card/50 backdrop-blur">
          <h1 className="text-lg font-medium">{links.find(l => location.startsWith(l.href))?.label || "VoidCloud"}</h1>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

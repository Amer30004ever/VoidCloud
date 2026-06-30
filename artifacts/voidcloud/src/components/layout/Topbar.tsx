
import { usePathname } from "@/compat/next-navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, ChevronDown, Search } from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useState } from "react";
// import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/pipelines": "Pipelines",
  "/deployments": "Deployments",
  "/infrastructure": "Infrastructure",
  "/monitoring": "Monitoring",
  "/logs": "Logs",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const pageLabel =
    Object.entries(routeLabels).find(([route]) =>
      pathname.startsWith(route)
    )?.[1] ?? "Amer Portal";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Amer Portal</span>
          <ChevronDown className="h-3 w-3 rotate-[-90deg] text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{pageLabel}</span>
        </div>

        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`w-64 rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all ${isSearchFocused ? "w-96" : ""}`}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {user?.name ?? "Engineer"}
          </span>
          <button
            id="topbar-logout"
            onClick={logout}
            className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
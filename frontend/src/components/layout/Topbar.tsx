"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, User, ChevronDown, Search, Sun, Moon, Clock } from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useState, useMemo } from "react";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useRecentViews, RecentView } from "@/hooks/useRecentViews";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const breadcrumbs = useBreadcrumbs();
  const { views: recentViews, clear: clearRecent } = useRecentViews();

  const pageLabel = useMemo(() => {
    const last = breadcrumbs[breadcrumbs.length - 1];
    return last?.label ?? "VoidCloud";
  }, [breadcrumbs]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Breadcrumb items={breadcrumbs} />
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

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowRecent((s) => !s)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            title="Recently viewed"
          >
            <Clock className="h-4 w-4" />
          </button>
          {showRecent && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRecent(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently viewed</span>
                  <button onClick={clearRecent} className="text-[11px] text-primary hover:underline">Clear</button>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {recentViews.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-muted-foreground">No recent pages yet.</div>
                  ) : (
                    recentViews.map((v: RecentView) => (
                      <a key={v.href} href={v.href} onClick={() => setShowRecent(false)} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted">
                        <span className="truncate">{v.label}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          id="topbar-theme-toggle"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <NotificationBell />

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


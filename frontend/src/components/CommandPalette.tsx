"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, User, Server, Settings } from "lucide-react";
import { ALL_ROUTES } from "@/lib/routes";
import { cloudApi, CloudDeployment } from "@/features/vps/cloud";
import { useAuth } from "@/features/auth/AuthContext";
import { useRecentViews, RecentView } from "@/hooks/useRecentViews";

interface EntityItem {
  id: string;
  label: string;
  href: string;
  type: "user" | "vps" | "page";
  icon: "user" | "server" | "settings";
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (h.includes(n)) return true;
  let ni = 0;
  for (let i = 0; i < h.length && ni < n.length; i++) {
    if (h[i] === n[ni]) ni++;
  }
  return ni === n.length;
}

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [vps, setVps] = useState<CloudDeployment[]>([]);
  const { views: recentViews } = useRecentViews();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (isSuperAdmin) {
      cloudApi.admin.users().then((u) => { if (!cancelled) setUsers(u.slice(0, 20)); }).catch(() => {});
      cloudApi.deployments.list().then((v) => { if (!cancelled) setVps(v.slice(0, 20)); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [open, isSuperAdmin]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const items: EntityItem[] = [];

    if (!needle && recentViews.length) {
      recentViews.forEach((v: RecentView) => {
        items.push({ id: `recent-${v.href}`, label: v.label, href: v.href, type: "page", icon: "settings" });
      });
    }

    if (isSuperAdmin) {
      users.forEach((u) => {
        if (!needle || fuzzyMatch(needle, u.name) || fuzzyMatch(needle, u.email)) {
          items.push({ id: `user-${u.id}`, label: u.name, href: `/voidcloud/admin/users/${u.id}`, type: "user", icon: "user" });
        }
      });
      vps.forEach((v) => {
        if (!needle || fuzzyMatch(needle, v.name) || fuzzyMatch(needle, v.id)) {
          items.push({ id: `vps-${v.id}`, label: v.name, href: `/voidcloud/dashboard/vps/${v.id}`, type: "vps", icon: "server" });
        }
      });
    }

    const routes = ALL_ROUTES.filter((r) => {
      if (!needle) return true;
      return fuzzyMatch(needle, r.label) || fuzzyMatch(needle, r.href) || fuzzyMatch(needle, r.section);
    }).map((r) => ({ id: `route-${r.href}`, label: r.label, href: r.href, type: "page" as const, icon: "settings" as const }));

    items.push(...routes);
    return items.slice(0, 40);
  }, [q, users, vps, recentViews, isSuperAdmin]);

  useEffect(() => { setIdx(0); }, [q, open]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const iconFor = (icon: EntityItem["icon"]) => {
    if (icon === "user") return <User className="h-4 w-4 text-muted-foreground" />;
    if (icon === "server") return <Server className="h-4 w-4 text-muted-foreground" />;
    return <Settings className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[idx]) go(filtered[idx].href);
              }
            }}
            placeholder="Jump to page, user, or VPS…"
            className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <ul className="max-h-96 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(item.href)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    i === idx ? "bg-primary/10 text-foreground" : "text-foreground/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {iconFor(item.icon)}
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.type === "user" ? "User" : item.type === "vps" ? "VPS" : ""}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{item.href}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · ⌘K toggle</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface RecentView {
  label: string;
  href: string;
  timestamp: number;
}

const STORAGE_KEY = "recent_views";
const MAX_ITEMS = 10;

export function useRecentViews() {
  const pathname = usePathname();

  const views = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as RecentView[] : [];
    } catch {
      return [];
    }
  }, [pathname]);

  const push = useMemo(() => {
    return (label: string, href: string) => {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(STORAGE_KEY);
      let list: RecentView[] = raw ? JSON.parse(raw) : [];
      list = list.filter((v) => v.href !== href);
      list.unshift({ label, href, timestamp: Date.now() });
      if (list.length > MAX_ITEMS) list = list.slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    };
  }, []);

  const clear = useMemo(() => {
    return () => {
      if (typeof window === "undefined") return;
      localStorage.removeItem(STORAGE_KEY);
    };
  }, []);

  return { views, push, clear };
}

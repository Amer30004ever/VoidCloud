"use client";

import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
}

function getSystemTheme(): Theme {
  return "dark";
}

async function loadStoredTheme(): Promise<{ mode: string } | null> {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("voidcloud_token") || sessionStorage.getItem("voidcloud_token");
    if (!token) return null;
  }
  try {
    const { data } = await api.get("/auth/me");
    const pref = data?.themePreference;
    if (pref === "light" || pref === "dark" || pref === "system") return { mode: pref };
  } catch {
    if (typeof window !== "undefined") {
      localStorage.removeItem("voidcloud_token");
      sessionStorage.removeItem("voidcloud_token");
    }
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStoredTheme().then((stored) => {
      if (cancelled) return;
      const mode = stored?.mode ?? "system";
      const effective = mode === "system" ? getSystemTheme() : (mode as Theme);
      setTheme(effective);
      applyTheme(effective);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      const root = document.documentElement;
      const isLight = root.classList.contains("light");
      if (isLight && theme !== "light") setTheme("light");
      if (!isLight && theme !== "dark") setTheme("dark");
    };
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler);
    return () => window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", handler);
  }, [theme, ready]);

  const toggleTheme = async () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
      }
      api.patch("/auth/me/theme", { themePreference: next }).catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}


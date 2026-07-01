"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("vc_theme") as Theme | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(preferred);
    setThemeState(preferred);
  }, []);

  function applyTheme(t: Theme) {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.classList.toggle("light-mode", t === "light");
  }

  function setTheme(t: Theme) {
    localStorage.setItem("vc_theme", t);
    applyTheme(t);
    setThemeState(t);
  }

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggle };
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10 ${compact ? "px-2 py-2" : "px-3 py-2"}`}
    >
      <span className="text-base leading-none">{theme === "dark" ? "☀️" : "🌙"}</span>
      {!compact && <span className="text-xs text-white/60">{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}

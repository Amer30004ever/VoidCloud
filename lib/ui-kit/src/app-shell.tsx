"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import { cn } from "./utils";

export interface AppShellNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export interface AppShellProps {
  /** Link component (e.g. next/link). Defaults to a plain anchor. */
  linkComponent?: React.ElementType;
  brand: { href: string; label: string };
  items: AppShellNavItem[];
  /** Optional extra nav rendered under a divider (e.g. role switcher). */
  footerNav?: AppShellNavItem[];
  /** Rendered on the right side of the top bar. */
  topbarRight?: React.ReactNode;
  /** Rendered on the left side of the top bar (breadcrumb / title). */
  topbarLeft?: React.ReactNode;
  /** Full-width banner pinned above everything (e.g. impersonation notice). */
  banner?: React.ReactNode;
  onSignOut?: () => void;
  signOutLabel?: string;
  rtl?: boolean;
  children: React.ReactNode;
}

/**
 * Shared application shell: responsive sidebar (off-canvas drawer under `lg`,
 * collapsible rail above it), sticky top bar and a scrollable content area.
 * Every authenticated VoidCloud area should use this instead of a bespoke
 * layout so navigation, spacing and theme stay identical across roles.
 */
export function AppShell({
  linkComponent,
  brand,
  items,
  footerNav,
  topbarRight,
  topbarLeft,
  banner,
  onSignOut,
  signOutLabel = "Sign out",
  rtl = false,
  children,
}: AppShellProps) {
  const Link = (linkComponent ?? "a") as React.ElementType;
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const expanded = !collapsed;

  const navLink = (it: AppShellNavItem, showLabel: boolean) => (
    <Link
      key={it.href}
      href={it.href}
      title={it.label}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        showLabel ? "justify-start" : "justify-center",
        it.active
          ? "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/10 text-white"
          : "text-white/60 hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center [&>svg]:size-[18px]">{it.icon}</span>
      {showLabel && <span className="min-w-0 truncate">{it.label}</span>}
    </Link>
  );

  const sidebarBody = (showLabel: boolean, onClose?: () => void) => (
    <>
      <div className="flex items-center justify-between gap-2 p-4">
        <Link
          href={brand.href}
          className={cn("flex min-w-0 items-center gap-2 font-bold text-white", !showLabel && "hidden")}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-black text-slate-950">
            V
          </span>
          <span className="truncate">{brand.label}</span>
        </Link>
        {onClose ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={showLabel ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            {showLabel === !rtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {items.map((it) => navLink(it, showLabel))}
        {footerNav && footerNav.length > 0 && (
          <>
            <div className="my-3 border-t border-white/5" />
            {footerNav.map((it) => navLink(it, showLabel))}
          </>
        )}
      </nav>

      {onSignOut && (
        <div className="border-t border-white/5 p-3">
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white",
              showLabel ? "justify-start" : "justify-center",
            )}
          >
            <LogOut className="size-[18px] shrink-0" />
            {showLabel && <span className="min-w-0 truncate">{signOutLabel}</span>}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-white">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-slate-900/60 backdrop-blur-xl transition-[width] duration-200 lg:flex",
          rtl ? "border-l border-white/5" : "border-r border-white/5",
          expanded ? "w-64" : "w-16",
        )}
      >
        {sidebarBody(expanded)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={cn(
              "absolute inset-y-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 shadow-2xl",
              rtl ? "right-0 border-l border-white/10" : "left-0 border-r border-white/10",
            )}
          >
            {sidebarBody(true, () => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {banner}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-slate-900/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-white/50">{topbarLeft}</div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">{topbarRight}</div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/voidcloud/dashboard/deployments", label: "Deployments" },
  { href: "/docs", label: "Docs" },
  { href: "mailto:nova-cloud-2026@outlook.com", label: "Support" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">
            â˜
          </span>
          VoidCloud
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-white/70 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300 lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Live
          </span>
          <Link
            href="/voidcloud/login"
            className="rounded-lg px-4 py-2 text-sm text-white/80 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/voidcloud/register"
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Start Free
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          className="rounded-lg border border-white/10 p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-0.5 w-5 bg-white" />
          <span className="mt-1 block h-0.5 w-5 bg-white" />
          <span className="mt-1 block h-0.5 w-5 bg-white" />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-white/80"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-3">
              <Link
                href="/voidcloud/login"
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/voidcloud/register"
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

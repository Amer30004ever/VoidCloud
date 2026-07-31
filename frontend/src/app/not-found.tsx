import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "Page not found — VoidCloud",
  description: "The page you are looking for does not exist on VoidCloud.",
};

const links = [
  { href: "/", label: "Home", desc: "Product overview and pricing" },
  { href: "/help", label: "Help center", desc: "Guides and troubleshooting" },
  { href: "/status", label: "System status", desc: "Live platform health" },
  { href: "/voidcloud/login", label: "Sign in", desc: "Access your dashboard" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-28 text-center">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/50">
          Error 404
        </span>
        <h1 className="mt-6 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-7xl">
          Page not found
        </h1>
        <p className="mt-5 max-w-xl text-white/60">
          The page you requested doesn&apos;t exist, was moved, or you may not have access to it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950"
          >
            Back home
          </Link>
          <Link
            href="/voidcloud/login"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Go to dashboard
          </Link>
        </div>
        <div className="mt-14 grid w-full gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
            >
              <div className="font-semibold">{l.label}</div>
              <div className="mt-1 text-sm text-white/50">{l.desc}</div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

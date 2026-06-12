import Link from "next/link";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function MarketingPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <Link href="/" className="text-sm text-white/50 hover:text-white">← Back to home</Link>
        <h1 className="mt-4 bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-lg text-white/70">{subtitle}</p>}
        {updated && <p className="mt-2 text-xs uppercase tracking-wider text-white/40">Last updated: {updated}</p>}
        <div className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-2xl prose-h3:text-xl prose-a:text-cyan-300 prose-strong:text-white prose-li:text-white/80 prose-p:text-white/80">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

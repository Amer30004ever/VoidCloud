import Link from "@/compat/next-link";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Back home
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-white/60">{subtitle}</p>}
        <div className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-p:text-white/70 prose-a:text-cyan-400 prose-strong:text-white prose-li:text-white/70">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

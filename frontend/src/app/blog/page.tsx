import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Blog | AmerCloud",
  description: "Engineering posts, product updates, and Kubernetes tutorials from the AmerCloud team.",
};

const posts = [
  {
    date: "2026-06-12",
    title: "AmerCloud enters public beta",
    excerpt: "Managed Kubernetes hosting with Fawry, InstaPay, and Stripe is now open for sign-ups.",
  },
  {
    date: "2026-06-05",
    title: "Why we chose upstream Kubernetes over a managed fork",
    excerpt: "Portability matters. Here is the trade-off analysis behind running pure upstream control planes.",
  },
  {
    date: "2026-05-22",
    title: "Accepting Egyptian payments without a US merchant account",
    excerpt: "How we integrated Fawry and InstaPay so local developers can pay in EGP from day one.",
  },
];

export default function BlogPage() {
  return (
    <MarketingPage title="Blog" subtitle="Notes from the team building AmerCloud.">
      <div className="not-prose mt-6 space-y-4">
        {posts.map((p) => (
          <article key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-wider text-white/40">{p.date}</div>
            <h3 className="mt-2 text-xl font-semibold text-white">{p.title}</h3>
            <p className="mt-2 text-sm text-white/70">{p.excerpt}</p>
            <div className="mt-3 text-xs text-white/40">Full post coming soon.</div>
          </article>
        ))}
      </div>
    </MarketingPage>
  );
}

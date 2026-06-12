import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Documentation | AmerCloud",
  description: "Guides, API reference, and tutorials for deploying applications on AmerCloud managed Kubernetes.",
};

const sections = [
  { title: "Getting Started", desc: "Create your account, deploy your first container, and connect a custom domain.", href: "/amercloud/register" },
  { title: "Deployments", desc: "Push containers via Git, Docker images, or one-click templates.", href: "/deployments" },
  { title: "Payments", desc: "Add Fawry, InstaPay, Vodafone Cash, or Stripe as your billing method.", href: "/amercloud/billing" },
  { title: "Monitoring", desc: "CPU, memory, logs, and alerting for every workload.", href: "/monitoring" },
  { title: "Backups", desc: "Daily automated backups with one-click restore.", href: "/backups" },
  { title: "API Reference", desc: "REST API powered by our NestJS backend. OpenAPI spec available at /api/docs.", href: "https://api.amer-portal.cc.cd/api/docs" },
];

export default function DocsPage() {
  return (
    <MarketingPage
      title="Documentation"
      subtitle="Everything you need to ship on AmerCloud."
    >
      <p>
        Our full docs site is launching alongside general availability. In the meantime, the links below
        cover every feature available in beta.
      </p>
      <div className="not-prose mt-8 grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
          >
            <div className="font-semibold text-white">{s.title}</div>
            <div className="mt-1 text-sm text-white/60">{s.desc}</div>
          </Link>
        ))}
      </div>
      <h2>Need help?</h2>
      <p>
        Email <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a> — we reply within
        one business day during beta.
      </p>
    </MarketingPage>
  );
}

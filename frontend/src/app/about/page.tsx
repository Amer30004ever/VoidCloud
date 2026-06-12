import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "About — AmerCloud" };

export default function AboutPage() {
  return (
    <LegalPage
      title="About AmerCloud"
      subtitle="Kubernetes hosting built in Egypt, for the world."
    >
      <p>
        AmerCloud is an independent cloud platform founded by{" "}
        <strong>Amer Magdi</strong>, a DevOps engineer who built the entire stack — from
        bare-metal Proxmox nodes to the Kubernetes control plane — to give Egyptian
        developers a hosting option that accepts local payments and runs close to home.
      </p>
      <h2>Our mission</h2>
      <p>
        Make production-grade infrastructure boring and affordable for the next generation
        of Arabic-speaking builders. No credit-card hurdles. No 200ms transatlantic
        latency. Fawry, InstaPay, and Vodafone Cash on day one.
      </p>
      <h2>What we run</h2>
      <ul>
        <li>Kubernetes 1.30 on bare-metal Proxmox in Cairo</li>
        <li>Traefik ingress, cert-manager auto-SSL, Prometheus + Loki observability</li>
        <li>PostgreSQL 17 with daily encrypted backups</li>
        <li>NestJS API · Next.js dashboard · GitOps via Argo CD</li>
      </ul>
      <h2>Contact</h2>
      <p>
        Questions, partnerships, or press:{" "}
        <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>
      </p>
    </LegalPage>
  );
}

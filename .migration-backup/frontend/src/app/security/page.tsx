import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Security — Void Cloud" };

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      subtitle="How we protect your workloads and your data."
    >
      <h2>Platform</h2>
      <ul>
        <li>All traffic terminated with TLS 1.3 via cert-manager + Let&apos;s Encrypt</li>
        <li>Container isolation per namespace with NetworkPolicies and PodSecurity</li>
        <li>Image scanning (Trivy) on every push to the registry</li>
        <li>Argon2id password hashing, JWT auth, optional TOTP 2FA</li>
        <li>Daily encrypted PostgreSQL backups with 30-day retention</li>
      </ul>
      <h2>Operational</h2>
      <ul>
        <li>Principle of least privilege for all engineering access</li>
        <li>Hardware MFA on all admin accounts (cluster, registry, DNS)</li>
        <li>Centralised audit logs streamed to Loki, alerting through Alertmanager</li>
        <li>Quarterly disaster-recovery rehearsals</li>
      </ul>
      <h2>Responsible disclosure</h2>
      <p>
        Found a vulnerability? Email{" "}
        <a href="mailto:nova-cloud-2026@outlook.com?subject=Security%20Disclosure">
          nova-cloud-2026@outlook.com
        </a>{" "}
        with reproduction steps. We acknowledge reports within 48 hours and credit
        researchers in our changelog.
      </p>
    </LegalPage>
  );
}

import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Privacy Policy â€” VoidCloud" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" subtitle="Last updated: June 12, 2026">
      <p>
        VoidCloud respects your privacy. This page explains what we collect, why, and how
        we handle it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, hashed password.
        </li>
        <li>
          <strong>Billing data:</strong> handled by Stripe, Fawry, and InstaPay â€” we
          never store full card numbers.
        </li>
        <li>
          <strong>Operational data:</strong> deployment metadata, container logs, and
          resource usage required to run your workloads.
        </li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To operate the service, send transactional emails (verification, password reset,
        billing receipts), and improve product quality. We never sell personal data.
      </p>
      <h2>Where data lives</h2>
      <p>
        Primary infrastructure is hosted in Cairo, Egypt. Backups are encrypted at rest
        with AES-256. Email is sent through Microsoft 365 (Outlook SMTP).
      </p>
      <h2>Your rights</h2>
      <p>
        You can request export or deletion of your personal data at any time by emailing{" "}
        <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>. We
        respond within 30 days.
      </p>
    </LegalPage>
  );
}

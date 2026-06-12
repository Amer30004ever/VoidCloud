import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Privacy Policy | AmerCloud",
  description: "How AmerCloud collects, stores, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy" updated="June 12, 2026">
      <h2>1. Data we collect</h2>
      <p>Account data (name, email, hashed password), billing data processed by Stripe / Fawry / InstaPay,
        and operational telemetry from your workloads (CPU, memory, logs you choose to ship).</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>Operating and securing your account and deployments.</li>
        <li>Billing and fraud prevention.</li>
        <li>Service emails (sign-up confirmation, password reset, incident notifications).</li>
      </ul>

      <h2>3. Storage and security</h2>
      <p>Data is encrypted in transit (TLS 1.3) and at rest. Passwords are hashed with bcrypt. Reset tokens
        are stored only as SHA-256 hashes and expire in 30 minutes.</p>

      <h2>4. Sharing</h2>
      <p>We never sell your data. We share data only with the sub-processors required to operate the
        service: Stripe (payments), Fawry/InstaPay (payments), Microsoft Outlook SMTP (transactional email).</p>

      <h2>5. Your rights</h2>
      <p>You can request export or deletion of your data at any time by emailing
        <a href="mailto:nova-cloud-2026@outlook.com"> nova-cloud-2026@outlook.com</a>.</p>
    </MarketingPage>
  );
}

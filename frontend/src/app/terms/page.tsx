import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Terms of Service | AmerCloud",
  description: "The terms governing your use of AmerCloud managed Kubernetes hosting.",
};

export default function TermsPage() {
  return (
    <MarketingPage title="Terms of Service" updated="June 12, 2026">
      <h2>1. Acceptance</h2>
      <p>By creating an AmerCloud account you agree to these terms. If you are using AmerCloud on behalf
        of an organization, you confirm you have authority to bind that organization.</p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>No illegal content, malware, phishing, or unsolicited bulk email.</li>
        <li>No cryptocurrency mining on free trial workloads.</li>
        <li>No attempts to compromise other tenants or the AmerCloud platform.</li>
      </ul>

      <h2>3. Billing</h2>
      <p>Paid plans are billed monthly in advance. Free trial deployments pause after 7 days unless you
        upgrade — we never auto-charge a stored payment method without explicit consent.</p>

      <h2>4. SLA</h2>
      <p>Paid plans target 99.9% monthly uptime. Service credits are issued automatically on the next
        invoice for any month we fall below SLA.</p>

      <h2>5. Termination</h2>
      <p>You can delete your account at any time from <strong>Settings → Account</strong>. We may suspend
        accounts that violate Section 2 with at least 24 hours notice except in cases of active abuse.</p>

      <h2>6. Liability</h2>
      <p>AmerCloud is provided on an &ldquo;as is&rdquo; basis. Our maximum aggregate liability is limited
        to the fees you paid in the 12 months preceding the claim.</p>
    </MarketingPage>
  );
}

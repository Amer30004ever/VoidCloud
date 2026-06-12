import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "GDPR | AmerCloud",
  description: "AmerCloud GDPR compliance, data subject rights, and DPA information.",
};

export default function GdprPage() {
  return (
    <MarketingPage title="GDPR Compliance" updated="June 12, 2026">
      <p>
        AmerCloud serves customers worldwide, including the European Union. This page summarizes our GDPR
        posture and how to exercise your rights under the regulation.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><strong>Access</strong> — request a copy of every personal data point we hold about you.</li>
        <li><strong>Rectification</strong> — correct inaccurate data from <strong>Settings → Profile</strong>.</li>
        <li><strong>Erasure</strong> — delete your account and all associated data.</li>
        <li><strong>Portability</strong> — export your data as JSON.</li>
        <li><strong>Object</strong> — opt out of non-essential processing.</li>
      </ul>

      <h2>Data Processing Addendum</h2>
      <p>
        A signed DPA is available for all paid customers on request. Email
        <a href="mailto:nova-cloud-2026@outlook.com"> nova-cloud-2026@outlook.com</a> with subject line
        &ldquo;DPA request&rdquo; and we will return a counter-signed copy within two business days.
      </p>

      <h2>Sub-processors</h2>
      <ul>
        <li>Stripe — global card processing</li>
        <li>Fawry &amp; InstaPay — Egyptian payment rails</li>
        <li>Microsoft Outlook SMTP — transactional email delivery</li>
        <li>Cloudflare — DNS and DDoS protection</li>
      </ul>
    </MarketingPage>
  );
}

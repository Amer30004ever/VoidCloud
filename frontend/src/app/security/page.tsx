import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Security | AmerCloud",
  description: "How AmerCloud secures your workloads, data, and account.",
};

export default function SecurityPage() {
  return (
    <MarketingPage title="Security" subtitle="Defense in depth for every workload.">
      <h2>Account security</h2>
      <ul>
        <li>Bcrypt password hashing with per-user salt.</li>
        <li>Optional TOTP-based two-factor authentication.</li>
        <li>Password reset tokens are 32 bytes of CSPRNG entropy, hashed at rest, single-use, 30 min TTL.</li>
        <li>JWT access tokens with short expiry and rotating refresh tokens.</li>
      </ul>

      <h2>Platform security</h2>
      <ul>
        <li>TLS 1.3 everywhere — automatic Let&rsquo;s Encrypt certificates via cert-manager.</li>
        <li>Network policies isolate tenant namespaces.</li>
        <li>Container images scanned for CVEs at push time.</li>
        <li>Audit log of every privileged action, retained 90 days.</li>
      </ul>

      <h2>Data protection</h2>
      <ul>
        <li>Volumes encrypted at rest.</li>
        <li>Daily automated backups with point-in-time restore.</li>
        <li>Geographically distributed backup storage.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        Email <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a> with subject
        line &ldquo;Security report&rdquo;. We acknowledge within 24 hours and aim to patch critical
        issues within 72 hours. We do not currently run a paid bounty program but will publicly credit
        researchers who report responsibly.
      </p>
    </MarketingPage>
  );
}

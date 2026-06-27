import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Blog — Void Cloud" };

export default function BlogPage() {
  return (
    <LegalPage title="Blog" subtitle="Engineering notes and product updates.">
      <p>
        We&apos;re drafting our first posts on running Kubernetes in Egypt, accepting
        Fawry payments from a Nest.js backend, and building a multi-tenant ingress on
        Traefik. Subscribe by emailing{" "}
        <a href="mailto:nova-cloud-2026@outlook.com?subject=Subscribe%20to%20Void%20Cloud%20blog">
          nova-cloud-2026@outlook.com
        </a>{" "}
        and we&apos;ll send the first issue when it ships.
      </p>
      <h2>Coming soon</h2>
      <ul>
        <li>How we cut deploy times from 6 minutes to 38 seconds</li>
        <li>Fawry + InstaPay integration: the parts the docs don&apos;t cover</li>
        <li>Running cert-manager behind a Cloudflare Tunnel</li>
      </ul>
    </LegalPage>
  );
}

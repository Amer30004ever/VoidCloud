import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Documentation — Void Cloud" };

export default function DocsPage() {
  return (
    <LegalPage
      title="Documentation"
      subtitle="Guides, API reference, and deployment recipes."
    >
      <h2>Quick start</h2>
      <ol>
        <li>
          Create an account at <a href="/amercloud/register">/amercloud/register</a>.
        </li>
        <li>Connect your GitHub repo or push a Docker image.</li>
        <li>Pick a plan (free trial available for 7 days, no card required).</li>
        <li>Click <strong>Deploy</strong>. Your app is live with auto-SSL in &lt;60 s.</li>
      </ol>
      <h2>API reference</h2>
      <p>
        The full OpenAPI / Swagger spec is published at{" "}
        <a href="https://api.voidcloud.cc.cd/api/docs" target="_blank" rel="noreferrer">
          api.voidcloud.cc.cd/api/docs
        </a>
        . Authenticate with a Bearer JWT from <code>POST /api/v1/auth/login</code>.
      </p>
      <h2>Guides</h2>
      <ul>
        <li>Deploying a Next.js app</li>
        <li>Custom domains &amp; Let&apos;s Encrypt</li>
        <li>Connecting a PostgreSQL add-on</li>
        <li>Setting up Fawry / InstaPay billing</li>
      </ul>
      <p>
        Need help? Email{" "}
        <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>.
      </p>
    </LegalPage>
  );
}

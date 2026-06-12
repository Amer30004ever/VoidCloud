import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Careers — AmerCloud" };

export default function CareersPage() {
  return (
    <LegalPage
      title="Careers"
      subtitle="Help us build the cloud platform Egypt deserves."
    >
      <p>
        AmerCloud is a small, technical team. We don&apos;t have open roles posted right
        now, but we&apos;re always interested in talking to:
      </p>
      <ul>
        <li>Senior Kubernetes / platform engineers</li>
        <li>Full-stack engineers comfortable in TypeScript and NestJS</li>
        <li>SRE / observability specialists (Prometheus, Loki, Grafana)</li>
        <li>Product designers who care about Arabic / RTL UX</li>
      </ul>
      <p>
        Send your CV and a short note about what you&apos;d build here to{" "}
        <a href="mailto:nova-cloud-2026@outlook.com?subject=Careers">
          nova-cloud-2026@outlook.com
        </a>
        .
      </p>
    </LegalPage>
  );
}

import { LegalPage } from "@/components/landing/LegalPage";


export default function GdprPage() {
  return (
    <LegalPage
      title="GDPR Compliance"
      subtitle="Your rights under the EU General Data Protection Regulation."
    >
      <p>
        AmerCloud processes personal data on behalf of customers who may be located in
        the European Union. We act as a <strong>data processor</strong>; you are the
        controller of the data you deploy on our platform.
      </p>
      <h2>Your rights as a data subject</h2>
      <ul>
        <li>Right of access to your personal data</li>
        <li>Right to rectification and erasure</li>
        <li>Right to data portability (machine-readable export)</li>
        <li>Right to restrict or object to processing</li>
        <li>Right to lodge a complaint with a supervisory authority</li>
      </ul>
      <h2>Data Processing Agreement</h2>
      <p>
        A signed DPA is available on request for any paid plan. Email{" "}
        <a href="mailto:nova-cloud-2026@outlook.com?subject=DPA%20Request">
          nova-cloud-2026@outlook.com
        </a>
        .
      </p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Stripe (payments — global)</li>
        <li>Fawry &amp; InstaPay (payments — Egypt)</li>
        <li>Microsoft 365 (transactional email)</li>
        <li>Cloudflare (DNS &amp; DDoS protection)</li>
      </ul>
      <p>
        To exercise any GDPR right, email{" "}
        <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>. We
        respond within 30 days.
      </p>
    </LegalPage>
  );
}

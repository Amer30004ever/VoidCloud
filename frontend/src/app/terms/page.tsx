import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Terms of Service — AmerCloud" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" subtitle="Last updated: June 12, 2026">
      <p>
        By creating an account on AmerCloud you agree to these terms. Please read them
        carefully.
      </p>
      <h2>1. Service</h2>
      <p>
        AmerCloud provides managed Kubernetes hosting, related developer tooling, and
        billing in USD and EGP. The service is offered &quot;as is&quot; during the public
        beta.
      </p>
      <h2>2. Acceptable use</h2>
      <p>
        You agree not to use AmerCloud to host malware, phishing pages, content that
        infringes copyright, or material that violates Egyptian law or the laws of your
        own jurisdiction.
      </p>
      <h2>3. Billing</h2>
      <p>
        Paid plans renew monthly. The 7-day free trial does not auto-charge — at the end
        of the trial your deployments pause until you upgrade. Refunds are available
        within 30 days of any paid charge.
      </p>
      <h2>4. Data &amp; backups</h2>
      <p>
        You retain ownership of all code, data, and content you deploy. We take daily
        encrypted backups but you remain responsible for keeping independent copies of
        critical data.
      </p>
      <h2>5. Termination</h2>
      <p>
        You may cancel at any time from the dashboard. We may suspend accounts that
        violate these terms with notice except in cases of abuse or legal requirement.
      </p>
      <h2>6. Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>
      </p>
    </LegalPage>
  );
}

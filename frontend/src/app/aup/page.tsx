import { LegalPage } from "@/components/landing/LegalPage";

export const metadata = { title: "Acceptable Use Policy — VoidCloud" };

export default function AupPage() {
  return (
    <LegalPage title="Acceptable Use Policy" subtitle="Last updated: July 19, 2026">
      <p>
        This Acceptable Use Policy (&quot;AUP&quot;) governs how you may use VoidCloud&apos;s
        infrastructure, including any VPS, virtual machine, container, network, or IP address
        assigned to your account. By using VoidCloud you agree to this policy. Violations may
        result in suspension or termination of the affected resources and, in serious cases,
        your account — with or without prior notice where required to protect the platform,
        other customers, or third parties.
      </p>

      <h2>1. Prohibited Use</h2>
      <p>You may not use VoidCloud to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Operate spam relays, send unsolicited bulk email, or otherwise abuse email infrastructure.</li>
        <li>Host, distribute, or execute malware, ransomware, botnets, or other malicious software.</li>
        <li>Host phishing pages, fraudulent schemes, or impersonate other entities or brands.</li>
        <li>Launch, participate in, or amplify DDoS attacks, port scanning, or other network abuse against any third party.</li>
        <li>Run cryptocurrency mining without explicit prior disclosure and approval from VoidCloud.</li>
        <li>Host or distribute material that infringes copyright, trademarks, or other intellectual property rights.</li>
        <li>Violate applicable law in Egypt, your own jurisdiction, or the jurisdiction of any party affected by your traffic.</li>
      </ul>

      <h2>2. IP Reputation &amp; Outbound Mail</h2>
      <p>
        Your VPS IP address forms part of VoidCloud&apos;s shared IP reputation. Abusive outbound
        traffic from your instances can cause VoidCloud&apos;s entire IP range to be blacklisted by
        upstream providers and mail systems. To protect the platform:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Only send email from properly authenticated domains (SPF, DKIM, DMARC).</li>
        <li>Request a reverse DNS (PTR) record before running outbound mail servers (see your VPS dashboard).</li>
        <li>Do not proxy or relay traffic for parties outside your own verified infrastructure.</li>
      </ul>

      <h2>3. Reporting &amp; Response</h2>
      <p>
        Third parties may report suspected abuse through our public abuse form. Each report is
        logged with its source, the targeted IP/domain, the reported reason, and a timestamp.
        When a report or automated detection crosses a threshold, our team is notified and may
        suspend the affected instance&apos;s networking pending investigation — this preserves
        the instance and its evidence so you can respond.
      </p>

      <h2>4. Suspension &amp; Appeal</h2>
      <p>
        VoidCloud may suspend networking on, or terminate, any resource that violates this AUP.
        Where feasible we will notify you and provide a path to appeal or remediate. Repeated or
        severe violations, or activity that creates legal exposure, may result in immediate
        account termination without refund.
      </p>

      <h2>5. Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be announced via the
        dashboard and the policy linked in the site footer.
      </p>
    </LegalPage>
  );
}

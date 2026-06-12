import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "About AmerCloud | Egyptian Kubernetes Hosting",
  description: "AmerCloud is built in Egypt to give local developers and businesses managed Kubernetes hosting with Fawry, InstaPay, and Stripe payment support.",
};

export default function AboutPage() {
  return (
    <MarketingPage title="About AmerCloud" subtitle="Kubernetes hosting built in Egypt, for the world.">
      <h2>Our mission</h2>
      <p>
        AmerCloud was founded to remove the friction Egyptian developers and SMEs face when deploying modern
        cloud-native applications. We combine production-grade Kubernetes with local payment rails (Fawry,
        InstaPay, Vodafone Cash) and global Stripe support — so paying for infrastructure is as simple as
        deploying it.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li><strong>Local first.</strong> Low-latency hosting from regional points of presence, billed in EGP when you want.</li>
        <li><strong>Operational honesty.</strong> Real status pages, real SLAs, no inflated marketing stats.</li>
        <li><strong>Open standards.</strong> Pure upstream Kubernetes. Take your YAML with you any time.</li>
      </ul>

      <h2>Team</h2>
      <p>
        AmerCloud is currently in beta and is built by a small, focused engineering team led by Amer Magdi.
        Get in touch at <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>.
      </p>
    </MarketingPage>
  );
}

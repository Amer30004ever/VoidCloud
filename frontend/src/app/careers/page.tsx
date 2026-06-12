import type { Metadata } from "next";
import { MarketingPage } from "@/components/landing/MarketingPage";

export const metadata: Metadata = {
  title: "Careers | AmerCloud",
  description: "Join the AmerCloud team and help build the leading Kubernetes platform for Egypt and the MENA region.",
};

export default function CareersPage() {
  return (
    <MarketingPage title="Careers" subtitle="Build the cloud platform Egypt deserves.">
      <p>
        We are a small, distributed engineering team based in Cairo with remote contributors across MENA.
        We are not actively hiring full-time roles during beta, but we are always open to meeting strong
        engineers interested in Kubernetes, platform engineering, and payment infrastructure.
      </p>
      <h2>Roles we will open at GA</h2>
      <ul>
        <li>Senior Platform Engineer (Kubernetes / Go)</li>
        <li>Full-Stack Engineer (Next.js / NestJS)</li>
        <li>Site Reliability Engineer</li>
        <li>Developer Advocate (Arabic + English)</li>
      </ul>
      <h2>Get in touch</h2>
      <p>
        Send your CV and a short note to <a href="mailto:nova-cloud-2026@outlook.com">nova-cloud-2026@outlook.com</a>
        — we keep every introduction on file.
      </p>
    </MarketingPage>
  );
}

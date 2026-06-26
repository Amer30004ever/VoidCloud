import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Integrations } from "@/components/landing/Integrations";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { UseCases } from "@/components/landing/UseCases";
import { Pricing } from "@/components/landing/Pricing";
import { Stats } from "@/components/landing/Stats";
import { Testimonials } from "@/components/landing/Testimonials";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "AmerCloud | Egyptian Kubernetes Hosting with Fawry & InstaPay",
  description:
    "Deploy apps in seconds on managed Kubernetes. Pay with Fawry, InstaPay, or Stripe. Free trial, no credit card. Built for Egypt and the world.",
  keywords: [
    "kubernetes hosting",
    "egypt hosting",
    "fawry payment",
    "instapay",
    "cloud hosting egypt",
    "deploy apps",
    "devops platform",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%98%81%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
  alternates: { canonical: "https://voidcloud.cc.cd" },
  openGraph: {
    title: "AmerCloud | Egyptian Kubernetes Hosting",
    description:
      "Deploy apps in seconds on managed Kubernetes. Pay with Fawry, InstaPay, or Stripe.",
    url: "https://voidcloud.cc.cd",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AmerCloud",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Managed Kubernetes hosting with Egyptian local payment support (Fawry, InstaPay) and global Stripe.",
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <Navbar />
        <main>
          <Hero />
          <Integrations />
          <ProblemSolution />
          <Features />
          <HowItWorks />
          <UseCases />
          <Pricing />
          <Stats />
          <Testimonials />
          <ComparisonTable />
          <FAQ />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}

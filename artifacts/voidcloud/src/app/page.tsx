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


const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Void Cloud",
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

import Head from 'next/head';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Integrations } from '../components/landing/Integrations';
import { ProblemSolution } from '../components/landing/ProblemSolution';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { UseCases } from '../components/landing/UseCases';
import { Pricing } from '../components/landing/Pricing';
import { Stats } from '../components/landing/Stats';
import { Testimonials } from '../components/landing/Testimonials';
import { ComparisonTable } from '../components/landing/ComparisonTable';
import { FAQ } from '../components/landing/FAQ';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';

export default function HomePage() {
    return (
        <>
            <Head>
                <title>Void Cloud | Egyptian Kubernetes Hosting with Fawry & InstaPay</title>
                <meta name="description" content="Deploy apps in seconds on managed Kubernetes. Pay with Fawry, InstaPay, or Stripe. Free trial, no credit card. Built for Egypt and the world." />
                <meta name="keywords" content="kubernetes hosting, egypt hosting, fawry payment, instapay, cloud hosting egypt, deploy apps, devops platform" />
            </Head>
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

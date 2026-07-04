import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
    return (
        <>
            <Head>
                <title>VoidCloud | VPS Hosting & CRM</title>
                <meta name="description" content="VoidCloud is a modern VPS hosting and CRM platform for growing businesses." />
            </Head>
            <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #07111f 0%, #13253f 100%)', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
                    <section style={{ display: 'grid', gap: '2rem', alignItems: 'center', gridTemplateColumns: '1.1fr 0.9fr' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', letterSpacing: '0.3em', color: '#7dd3fc', fontSize: '0.8rem', marginBottom: '1rem' }}>VoidCloud Platform</p>
                            <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.3rem)', lineHeight: 1.1, marginBottom: '1rem' }}>Launch, manage, and grow your infrastructure from one place.</h1>
                            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', marginBottom: '1.6rem' }}>
                                Deploy VPS resources, manage tenants, automate billing, and run your CRM workflows through a unified portal designed for speed and reliability.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <Link href="/auth/login" style={{ background: '#38bdf8', color: '#07111f', padding: '0.85rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 700 }}>
                                    Sign in
                                </Link>
                                <Link href="/onboarding" style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#f8fafc', padding: '0.85rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>
                                    Start onboarding
                                </Link>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.78)', border: '1px solid rgba(125, 211, 252, 0.22)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(4, 15, 29, 0.35)' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>What you can do</h2>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem', color: '#e2e8f0' }}>
                                <li>• Provision and monitor VPS instances</li>
                                <li>• Manage tenants, users, and permissions</li>
                                <li>• Automate billing and subscriptions</li>
                                <li>• Run CRM, WhatsApp, and notification flows</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

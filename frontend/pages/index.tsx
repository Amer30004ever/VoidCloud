import Head from 'next/head';

export default function HomePage() {
    return (
        <>
            <Head>
                <title>VoidCloud</title>
                <meta name="description" content="VoidCloud portal" />
            </Head>
            <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
                <h1>VoidCloud</h1>
                <p>The portal is running.</p>
            </main>
        </>
    );
}

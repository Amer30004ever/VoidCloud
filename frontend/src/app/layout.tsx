import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// import { initSentry } from "@/lib/sentry";

// initSentry();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoidCloud — Managed Cloud Platform",
  description:
    "Manage your DevOps projects, CI/CD pipelines, deployments, and infrastructure in one unified platform.",
  manifest: "/manifest.json",
  keywords: ["DevOps", "CI/CD", "Kubernetes", "Docker", "Infrastructure", "Monitoring", "Projects", "VPS"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var isLight=t?t==="light":false;document.documentElement.classList.toggle("light",isLight);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
"use client";

import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";

const VERSION = "1.0";
const EFFECTIVE = "2026-07-24";

export default function PrivacyPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function accept() {
    setLoading(true);
    setErr("");
    try {
      await api.post("/auth/me/tos-accept", { tosVersion: "1.0", privacyVersion: VERSION });
      setDone(true);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setErr(error?.response?.data?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-white/60">Effective date: {EFFECTIVE} &middot; Version {VERSION}</p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-sm text-white/80">
        <h2 className="text-lg font-semibold">1. Information We Collect</h2>
        <p>We collect information you provide directly (name, email, phone), usage data (API calls, VPS metrics), and device information (IP address, user agent).</p>

        <h2 className="text-lg font-semibold">2. How We Use Information</h2>
        <p>We use data to provide and improve the service, process payments, send notifications, detect abuse, and comply with legal obligations.</p>

        <h2 className="text-lg font-semibold">3. Data Sharing</h2>
        <p>We do not sell personal data. We may share data with service providers (payment processors, infrastructure providers) and legal authorities when required.</p>

        <h2 className="text-lg font-semibold">4. Data Retention</h2>
        <p>We retain personal data for as long as your account is active or as needed to provide services. Some records (billing, audit logs) may be retained longer for legal compliance.</p>

        <h2 className="text-lg font-semibold">5. Your Rights (GDPR)</h2>
        <p>You may request access, correction, or deletion of your personal data. You may also object to processing or withdraw consent where applicable. Contact support to exercise these rights.</p>

        <h2 className="text-lg font-semibold">6. Security</h2>
        <p>We implement industry-standard security measures including encryption, access controls, and regular audits. However, no method of transmission or storage is 100% secure.</p>

        <h2 className="text-lg font-semibold">7. Children</h2>
        <p>VoidCloud is not intended for users under 16. We do not knowingly collect data from children.</p>

        <h2 className="text-lg font-semibold">8. Changes to This Policy</h2>
        <p>We may update this Privacy Policy periodically. Material changes will be communicated via email or platform notice.</p>
      </div>

      {err && <p className="text-sm text-red-300">{err}</p>}

      {!done ? (
        <button
          disabled={loading}
          onClick={accept}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "I Accept"}
        </button>
      ) : (
        <p className="text-sm text-emerald-300">You have accepted the Privacy Policy v{VERSION}.</p>
      )}

      <p className="text-sm text-white/60">
        Questions? <Link href="/voidcloud/dashboard/settings" className="text-cyan-300 hover:underline">Go to Settings</Link>
      </p>
    </div>
  );
}

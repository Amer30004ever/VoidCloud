"use client";

import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";

const VERSION = "1.0";
const EFFECTIVE = "2026-07-24";

export default function TosPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function accept() {
    setLoading(true);
    setErr("");
    try {
      await api.post("/auth/me/tos-accept", { tosVersion: VERSION, privacyVersion: VERSION });
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
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-sm text-white/60">Effective date: {EFFECTIVE} &middot; Version {VERSION}</p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-sm text-white/80">
        <h2 className="text-lg font-semibold">1. Acceptance</h2>
        <p>By accessing or using VoidCloud, you agree to be bound by these Terms. If you do not agree, do not use the service.</p>

        <h2 className="text-lg font-semibold">2. Description of Service</h2>
        <p>VoidCloud provides cloud hosting, VPS provisioning, billing, and related DevOps tools. We may update features, pricing, and availability at any time.</p>

        <h2 className="text-lg font-semibold">3. Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account and for all activities under it. You must provide accurate information and keep it updated.</p>

        <h2 className="text-lg font-semibold">4. Acceptable Use</h2>
        <p>You may not use VoidCloud to violate laws, distribute malware, send spam, abuse infrastructure, or infringe intellectual property. We may suspend or terminate accounts that violate these terms.</p>

        <h2 className="text-lg font-semibold">5. Payment</h2>
        <p>Fees are billed in advance on a recurring basis unless otherwise stated. Refunds are provided at our discretion unless required by law.</p>

        <h2 className="text-lg font-semibold">6. Data & Privacy</h2>
        <p>We process personal data in accordance with our Privacy Policy. By using the service, you consent to such processing.</p>

        <h2 className="text-lg font-semibold">7. Limitation of Liability</h2>
        <p>To the maximum extent permitted by applicable law, VoidCloud shall not be liable for indirect, incidental, or consequential damages arising from your use of the service.</p>

        <h2 className="text-lg font-semibold">8. Changes</h2>
        <p>We may modify these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.</p>
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
        <p className="text-sm text-emerald-300">You have accepted the Terms of Service v{VERSION}.</p>
      )}

      <p className="text-sm text-white/60">
        Questions? <Link href="/voidcloud/dashboard/settings" className="text-cyan-300 hover:underline">Go to Settings</Link>
      </p>
    </div>
  );
}

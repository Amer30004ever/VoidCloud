"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useTrackPageView } from "@/hooks/useTrackPageView";

type Step = "confirm" | "verify" | "finish";

export default function DeleteAccountPage() {
  useTrackPageView();
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm");
  const [pw, setPw] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function requestDelete() {
    setErr("");
    if (phrase !== "DELETE") return setErr('Type "DELETE" to confirm');
    if (!pw) return setErr("Enter your password");
    setBusy(true);
    try {
      const r = await api.post("/auth/me/delete-account", { password: pw });
      if (r.data?.ok) {
        setStep("finish");
        try { localStorage.removeItem("voidcloud_token"); } catch {}
      }
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setErr(error?.response?.data?.message ?? "Deletion failed");
    } finally {
      setBusy(false);
    }
  }

  if (step === "finish") {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="vc-h1">Account deletion requested</h1>
        <p className="text-sm text-white/80">Your account has been anonymized and all personal data has been removed where possible. Billing records may be retained for legal compliance.</p>
        <button
          onClick={() => router.replace("/voidcloud/register")}
          className="vc-btn vc-btn-secondary hover:bg-white/10"
        >
          Go to registration
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="vc-h1 text-red-200">Delete account</h1>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 space-y-3">
        <p className="font-semibold text-red-200">This action is irreversible.</p>
        <ul className="list-disc pl-5 text-red-200/90 space-y-1 text-sm">
          <li>All VPS instances will be marked as TERMINATED.</li>
          <li>Chats, CRM data, documents, and API keys will be deleted.</li>
          <li>Billing records are retained for legal compliance but personal info is removed.</li>
          <li>You will not be able to recover your account.</li>
        </ul>
      </div>

      {err && <p className="text-sm text-red-300">{err}</p>}

      {step === "confirm" && (
        <div className="vc-card p-6 space-y-4">
          <label className="block text-sm text-white/70">
            Type <code className="rounded bg-slate-900 px-2 py-1 text-red-300">DELETE</code> to confirm
          </label>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="vc-btn vc-btn-secondary"
            >
              Cancel
            </button>
            <button
              disabled={phrase !== "DELETE"}
              onClick={() => setStep("verify")}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="vc-card p-6 space-y-4">
          <p className="text-sm text-white/60">Re-authenticate to finalize deletion.</p>
          <label className="block text-sm text-white/70">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setStep("confirm"); setPw(""); }}
              className="vc-btn vc-btn-secondary"
            >
              Back
            </button>
            <button
              disabled={busy || !pw}
              onClick={requestDelete}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


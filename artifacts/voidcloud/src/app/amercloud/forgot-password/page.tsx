
import { useState } from "react";
import api from "@/lib/api";
import { AuthShell, Input } from "../login/page";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/auth/forgot-password", { email }); } catch { }
    setSent(true); setBusy(false);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link.">
      {sent ? (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm">
          If an account exists for <b>{email}</b>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" value={email} onValueChange={setEmail} required />
          <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

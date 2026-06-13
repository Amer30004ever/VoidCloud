/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudTwoFactor } from "@/lib/cloud";

export default function SettingsPage() {
  const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [setup, setSetup] = useState<{ qrCode: string; base32: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePw, setDisablePw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() { try { setStatus(await cloudTwoFactor.status()); } catch {} }
  useEffect(() => { refresh(); }, []);

  async function startEnable() {
    setErr(""); setBusy(true);
    try { setSetup(await cloudTwoFactor.enable()); } catch (e: any) { setErr(e?.response?.data?.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function verify() {
    setErr(""); setBusy(true);
    try {
      const r = await cloudTwoFactor.verify(code.trim());
      setRecoveryCodes(r.recoveryCodes); setSetup(null); setCode(""); await refresh();
    } catch (e: any) { setErr(e?.response?.data?.message ?? "Invalid code"); }
    finally { setBusy(false); }
  }
  async function disable() {
    setErr(""); setBusy(true);
    try { await cloudTwoFactor.disable({ password: disablePw }); setDisablePw(""); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function regenerate() {
    setErr(""); setBusy(true);
    try { const r = await cloudTwoFactor.regenerate(); setRecoveryCodes(r.recoveryCodes); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Section title="Two-factor authentication">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        {recoveryCodes && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <p className="mb-2 font-semibold text-amber-200">Save these recovery codes now — they will not be shown again.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-amber-100">
              {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
            </div>
            <button onClick={() => setRecoveryCodes(null)} className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">I&apos;ve saved them</button>
          </div>
        )}

        {!status?.enabled && !setup && (
          <>
            <p className="text-sm text-white/60">Add an extra layer of security with TOTP (Google Authenticator, Authy, 1Password).</p>
            <button disabled={busy} onClick={startEnable} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              Enable 2FA
            </button>
          </>
        )}

        {setup && (
          <div className="space-y-3">
            <p className="text-sm text-white/70">1. Scan the QR code in your authenticator app:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrCode} alt="2FA QR code" className="rounded-lg bg-white p-2" width={200} height={200} />
            <p className="text-xs text-white/50">Or enter this secret manually: <code className="rounded bg-slate-900 px-2 py-1">{setup.base32}</code></p>
            <p className="text-sm text-white/70">2. Enter the 6-digit code from your app:</p>
            <input className={input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            <button disabled={busy || code.length < 6} onClick={verify} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              Verify & activate
            </button>
          </div>
        )}

        {status?.enabled && !setup && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-300">✓ 2FA is enabled · {status.recoveryCodesRemaining} recovery codes remaining</p>
            <button disabled={busy} onClick={regenerate} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm">Regenerate recovery codes</button>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-sm font-semibold">Disable 2FA</p>
              <input className={input} type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} placeholder="Confirm with your password" />
              <button disabled={busy || !disablePw} onClick={disable} className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";
function Section({ title, children }: any) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl space-y-3"><h2 className="font-semibold">{title}</h2>{children}</div>;
}

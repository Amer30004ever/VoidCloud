/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { cloudTwoFactor, cloudAccount, type CloudProfile, type NotificationPrefs } from "@/features/vps/cloud";
import { SSHKeyManager } from "@/features/vps/SSHKeyManager";
import dynamic from "next/dynamic";
import { useTrackPageView } from "@/hooks/useTrackPageView";

const TeamPage = dynamic(() => import("./team/page"));
const BusinessSettingsPage = dynamic(() => import("./business/page"));

type Tab = "profile" | "security" | "ssh" | "notifications" | "api" | "accounts" | "danger" | "team" | "business";

export default function SettingsPage() {
  useTrackPageView();
  const [tab, setTab] = useState<Tab>("profile");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setRole(r.data?.role ?? null)).catch(() => setRole(null));
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "ssh", label: "SSH Keys" },
    { id: "notifications", label: "Notifications" },
    { id: "api", label: "API Keys" },
    { id: "accounts", label: "Linked Accounts" },
    { id: "danger", label: "Danger Zone" },
  ];

  const adminTabs = [
    { id: "team" as Tab, label: "Team" },
    { id: "business" as Tab, label: "Business" },
  ];

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const allTabs = isAdmin ? [...tabs, ...adminTabs] : tabs;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="vc-h1">Settings</h1>
      <div className="flex flex-wrap gap-2 border-b border-white/10">
        {allTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "ssh" && <SSHKeyManager />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "api" && <ApiKeysTab />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "danger" && <DangerTab />}
      {tab === "team" && <TeamPage />}
      {tab === "business" && <BusinessSettingsPage />}
    </div>
  );
}

/* ---------- Profile ---------- */
function ProfileTab() {
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    cloudAccount.getProfile().then((p) => {
      setProfile(p); setName(p.name); setPhone(p.phone || "");
    }).catch(() => {});
  }, []);

  async function saveProfile() {
    setMsg(null); setBusy(true);
    try {
      await cloudAccount.updateProfile({ displayName: name, phone });
      setMsg({ kind: "ok", text: "Profile updated" });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed to save" });
    } finally { setBusy(false); }
  }

  async function requestEmail() {
    setMsg(null); setBusy(true);
    try {
      const r = await cloudAccount.requestEmailChange({ currentPassword: emailPw, newEmail });
      setMsg({ kind: "ok", text: r.message || "Confirmation sent to your current email." });
      setEmailPw(""); setNewEmail("");
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
      <Section title="Profile">
        <Field label="Display name">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Phone (Egyptian: 01XXXXXXXXX)">
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} />
        </Field>
        <Field label="Current email">
          <div className="text-sm text-white/70">{profile?.email ?? "—"} {profile?.emailVerified ? <span className="text-emerald-400 ml-2">✓ verified</span> : <span className="text-amber-300 ml-2">unverified</span>}</div>
        </Field>
        <button disabled={busy} onClick={saveProfile} className={btnPrimary}>Save profile</button>
      </Section>

      <Section title="Change email address">
        <p className="text-xs text-white/60">We&apos;ll send a confirmation link to your <b>current</b> email. The change takes effect when you click it.</p>
        <Field label="New email">
          <input type="email" className={input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </Field>
        <Field label="Current password">
          <input type="password" className={input} value={emailPw} onChange={(e) => setEmailPw(e.target.value)} />
        </Field>
        <button disabled={busy || !newEmail || !emailPw} onClick={requestEmail} className={btnPrimary}>Request email change</button>
      </Section>
    </div>
  );
}

/* ---------- Security ---------- */
function SecurityTab() {
  // password
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 2FA state
  const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [setup, setSetup] = useState<{ qrCode: string; base32: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePw, setDisablePw] = useState("");

  async function refresh() { try { setStatus(await cloudTwoFactor.status()); } catch {} }
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { refresh(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function changePw() {
    setMsg(null);
    if (next.length < 8) return setMsg({ kind: "err", text: "New password must be at least 8 characters" });
    if (next !== confirm) return setMsg({ kind: "err", text: "Passwords do not match" });
    setBusy(true);
    try {
      await cloudAccount.changePassword({ currentPassword: cur, newPassword: next });
      setMsg({ kind: "ok", text: "Password updated" });
      setCur(""); setNext(""); setConfirm("");
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}

      <Section title="Change password">
        <Field label="Current password"><input type="password" className={input} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password"><input type="password" className={input} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Confirm new password"><input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <button disabled={busy || !cur || !next} onClick={changePw} className={btnPrimary}>Update password</button>
      </Section>

      <Section title="Two-factor authentication">
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
            <button disabled={busy} onClick={async () => { try { setSetup(await cloudTwoFactor.enable()); } catch {} }} className={btnPrimary}>Enable 2FA</button>
          </>
        )}

        {setup && (
          <div className="space-y-3">
            <p className="text-sm text-white/70">1. Scan the QR code in your authenticator app:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrCode} alt="2FA QR code" className="rounded-lg bg-white p-2" width={200} height={200} />
            <p className="text-xs text-white/50">Or enter this secret manually: <code className="rounded bg-slate-900 px-2 py-1">{setup.base32}</code></p>
            <p className="text-sm text-white/70">2. Enter the 6-digit code from your app:</p>
            <input className={input} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            <button
              disabled={busy || otp.length < 6}
              onClick={async () => {
                try {
                  const r = await cloudTwoFactor.verify(otp.trim());
                  setRecoveryCodes(r.recoveryCodes); setSetup(null); setOtp(""); await refresh();
                } catch (e: any) {
                  setMsg({ kind: "err", text: e?.response?.data?.message ?? "Invalid code" });
                }
              }}
              className={btnPrimary}
            >Verify &amp; activate</button>
          </div>
        )}

        {status?.enabled && !setup && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-300">✓ 2FA is enabled · {status.recoveryCodesRemaining} recovery codes remaining</p>
            <button
              disabled={busy}
              onClick={async () => { try { const r = await cloudTwoFactor.regenerate(); setRecoveryCodes(r.recoveryCodes); await refresh(); } catch {} }}
              className="vc-btn vc-btn-secondary"
            >Regenerate recovery codes</button>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-sm font-semibold">Disable 2FA</p>
              <input className={input} type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} placeholder="Confirm with your password" />
              <button
                disabled={busy || !disablePw}
                onClick={async () => {
                  try { await cloudTwoFactor.disable({ password: disablePw }); setDisablePw(""); await refresh(); }
                  catch (e: any) { setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed" }); }
                }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200"
              >Disable 2FA</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Active sessions">
        <p className="text-sm text-white/60">
          Session management (view active devices, sign out everywhere) is coming soon. For now,
          changing your password will keep existing sessions valid until they expire.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Notifications ---------- */
const NOTIF_FIELDS: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  { key: "vpsAlerts", label: "VPS status changes", desc: "Running, Stopped, Failed, restart finished." },
  { key: "usageAlerts", label: "Resource usage alerts", desc: "CPU >80%, RAM >80%, Disk >80%." },
  { key: "trialReminders", label: "Trial ending reminders", desc: "Sent 3 days, 1 day, and 0 days before trial ends." },
  { key: "paymentAlerts", label: "Payment & invoices", desc: "Successful payments, failed charges, new invoices." },
  { key: "securityAlerts", label: "Security alerts", desc: "New login, 2FA changes, password changes." },
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { cloudAccount.getNotificationPrefs().then(setPrefs).catch(() => {}); }, []);

  async function toggle(key: keyof NotificationPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setBusy(true); setMsg(null);
    try {
      const saved = await cloudAccount.updateNotificationPrefs({ [key]: next[key] });
      setPrefs(saved);
    } catch (e: any) {
      setPrefs(prefs); // revert
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed to save" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
      <Section title="Notification preferences">
        {!prefs && <p className="text-sm text-white/60">Loading…</p>}
        {prefs && (
          <div className="space-y-3">
            {NOTIF_FIELDS.map((f) => (
              <label key={f.key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[f.key]}
                  disabled={busy}
                  onChange={() => toggle(f.key)}
                  className="mt-1 h-4 w-4 accent-cyan-400"
                />
                <div>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-white/60">{f.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------- API Keys ---------- */
function ApiKeysTab() {
  return (
    <Section title="API Keys">
      <p className="text-sm text-white/60">Manage personal access tokens used to call the VoidCloud API.</p>
      <Link
        href="/voidcloud/dashboard/settings/api-keys"
        className="inline-block vc-btn vc-btn-primary"
      >
        Open API Keys →
      </Link>
    </Section>
  );
}

/* ---------- Danger Zone ---------- */
function DangerTab() {
  const router = useRouter();

  return (
    <Section title="Delete account" tone="danger">
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 space-y-2">
        <p className="font-semibold">This action is irreversible.</p>
        <ul className="list-disc pl-5 text-red-200/90 space-y-1">
          <li>All VPS instances will be marked as TERMINATED.</li>
          <li>Personal data, chats, CRM records, and API keys will be removed.</li>
          <li>Billing records may be retained for legal compliance but personal info is removed.</li>
          <li>You will not be able to recover your account.</li>
        </ul>
      </div>

      <Link
        href="/voidcloud/dashboard/settings/delete-account"
        className="inline-block rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20"
      >
        Delete my account →
      </Link>
    </Section>
  );
}

/* ---------- shared ---------- */
const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";
const btnPrimary = "vc-btn vc-btn-primary disabled:opacity-60";

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <div className={`rounded-2xl border p-6 backdrop-blur-xl space-y-3 ${
      tone === "danger" ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"
    }`}>
      <h2 className={`font-semibold ${tone === "danger" ? "text-red-200" : ""}`}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}

function Banner({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${
      kind === "ok"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-red-500/30 bg-red-500/10 text-red-300"
    }`}>{children}</div>
  );
}

function AccountsTab() {
  const [providers, setProviders] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/oauth/providers").then((r) => setProviders(r.data ?? [])).catch(() => setProviders([]));
  }, []);

  async function link(provider: string) {
    setMsg(null); setBusy(true);
    try {
      const url = provider === 'google'
        ? 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(window.location.origin + '/api/v1/auth/google/callback') + '&response_type=code&scope=email profile'
        : 'https://github.com/login/oauth/authorize?client_id=' + process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(window.location.origin + '/api/v1/auth/github/callback') + '&scope=user:email';
      window.location.href = url + '&state=' + encodeURIComponent(JSON.stringify({ context: 'link' }));
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed to link" });
    } finally { setBusy(false); }
  }

  async function unlink(provider: string) {
    setMsg(null); setBusy(true);
    try {
      await api.post("/auth/oauth/unlink", { provider });
      setProviders((p) => p.filter((x) => x !== provider));
      setMsg({ kind: "ok", text: "Unlinked" });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed to unlink" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
      <h3 className="text-sm font-semibold text-foreground">Linked accounts</h3>
      <p className="text-xs text-white/60">Link social accounts to sign in more conveniently. You must always keep at least one sign-in method.</p>
      <div className="space-y-3">
        {['google', 'github'].map((provider) => {
          const linked = providers.includes(provider);
          return (
            <div key={provider} className="flex items-center justify-between vc-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{provider}</p>
                <p className="text-xs text-white/60">{linked ? 'Linked' : 'Not linked'}</p>
              </div>
              {linked ? (
                <button disabled={busy || providers.length <= 1} onClick={() => unlink(provider)} className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 disabled:opacity-50">Unlink</button>
              ) : (
                <button disabled={busy} onClick={() => link(provider)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Link</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

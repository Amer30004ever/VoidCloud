/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */
"use client";
export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Section title="Profile">
        <Field label="Display name"><input className={input} defaultValue="" placeholder="Your name" /></Field>
        <Field label="Email"><input className={input} type="email" defaultValue="" /></Field>
        <button className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">Save</button>
      </Section>
      <Section title="Security">
        <Field label="Current password"><input className={input} type="password" /></Field>
        <Field label="New password"><input className={input} type="password" /></Field>
        <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm">Change password</button>
      </Section>
      <Section title="Two-factor authentication">
        <p className="text-sm text-white/60">Add an extra layer of security to your account using TOTP (Google Authenticator, Authy).</p>
        <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm">Enable 2FA</button>
      </Section>
    </div>
  );
}
const input = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50";
function Section({ title, children }: any) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl space-y-3"><h2 className="font-semibold">{title}</h2>{children}</div>;
}
function Field({ label, children }: any) {
  return <label className="block"><span className="mb-1 block text-xs uppercase text-white/60">{label}</span>{children}</label>;
}

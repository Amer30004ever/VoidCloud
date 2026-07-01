"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const STEPS = [
  { id: "welcome",   title: "Welcome to VoidCloud",       icon: "👋" },
  { id: "profile",   title: "Set up your profile",        icon: "👤" },
  { id: "whatsapp",  title: "Connect WhatsApp Business",  icon: "💬" },
  { id: "vps",       title: "Deploy your first VPS",      icon: "🖥️" },
  { id: "done",      title: "You&apos;re all set!",       icon: "🎉" },
];

interface ProfileForm { name: string; company: string; website: string; timezone: string }
interface WaForm { phoneNumber: string; businessName: string; apiKey: string }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>({ name: "", company: "", website: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [wa, setWa] = useState<WaForm>({ phoneNumber: "", businessName: "", apiKey: "" });
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [vpsCreated, setVpsCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true); setError(null);
    try { await api.patch("/users/me/profile", profile); setStep(2); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? "Failed to save profile"); }
    finally { setSaving(false); }
  }

  async function connectWhatsapp() {
    setSaving(true); setError(null);
    try { await api.post("/whatsapp/connect", wa); setStep(3); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? "Failed to connect WhatsApp"); }
    finally { setSaving(false); }
  }

  async function createDemoVps() {
    setSaving(true); setError(null);
    try {
      await api.post("/vps/provision", { name: "my-first-server", cpu: 2, memory: 2048, disk: 50, osTemplate: "ubuntu-22.04" });
      setVpsCreated(true);
      setTimeout(() => setStep(4), 1000);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Failed to create VPS");
    } finally { setSaving(false); }
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-400/40";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
                  i < step ? "bg-violet-500 text-white" : i === step ? "border-2 border-violet-500 bg-violet-500/20 text-violet-300" : "border border-white/10 bg-white/5 text-white/30"
                }`}>
                  {i < step ? "✓" : s.icon}
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-all ${i < step ? "bg-violet-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step].title}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-4">👋</div>
              <h1 className="text-2xl font-bold text-white">Welcome to VoidCloud!</h1>
              <p className="text-white/50 text-sm leading-relaxed">
                Let&apos;s get you set up in just a few steps. You&apos;ll configure your profile, connect WhatsApp Business, and optionally deploy your first VPS server.
              </p>
              <div className="grid gap-3 mt-6 text-left">
                {STEPS.slice(1, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-sm text-white/70">{s.title}</span>
                    <span className="ml-auto text-xs text-white/30">~2 min</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white">
                Get Started →
              </button>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Tell us about yourself</h2>
              <p className="text-sm text-white/40">This helps us personalize your dashboard and communications.</p>
              {[
                { key: "name" as const, label: "Your Name", placeholder: "John Smith" },
                { key: "company" as const, label: "Company Name", placeholder: "Acme Corp" },
                { key: "website" as const, label: "Website (optional)", placeholder: "https://acme.com" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-white/40">{f.label}</label>
                  <input className={inputCls} placeholder={f.placeholder} value={profile[f.key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-white/40">Timezone</label>
                <input className={inputCls} value={profile.timezone}
                  onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))} />
              </div>
              {error && <p className="text-xs text-red-300">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={saveProfile} disabled={saving || !profile.name}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white disabled:opacity-40">
                  {saving ? "Saving…" : "Continue →"}
                </button>
                <button onClick={() => setStep(2)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Step 2: WhatsApp */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Connect WhatsApp Business</h2>
              <p className="text-sm text-white/40">Connect your WhatsApp Business API to start managing customer conversations.</p>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-xs text-amber-300/80">
                💡 You&apos;ll need a WhatsApp Business Account and an approved Meta app. Get your credentials from <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a>.
              </div>
              {[
                { key: "phoneNumber" as const, label: "WhatsApp Phone Number", placeholder: "+1234567890" },
                { key: "businessName" as const, label: "Business Display Name", placeholder: "Acme Corp" },
                { key: "apiKey" as const, label: "Meta API Token", placeholder: "EAAxxxxxxxxxxxxxxx" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-white/40">{f.label}</label>
                  <input className={inputCls} placeholder={f.placeholder} value={wa[f.key]}
                    onChange={(e) => setWa((w) => ({ ...w, [f.key]: e.target.value }))} />
                </div>
              ))}
              {error && <p className="text-xs text-red-300">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={connectWhatsapp} disabled={saving || !wa.phoneNumber || !wa.apiKey}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-3 text-sm font-semibold text-white disabled:opacity-40">
                  {saving ? "Connecting…" : "Connect WhatsApp →"}
                </button>
                <button onClick={() => { setSkipping(true); setStep(3); setSkipping(false); }}
                  disabled={skipping} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Step 3: VPS */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🖥️</div>
              <h2 className="text-xl font-bold text-white">Deploy your first VPS</h2>
              <p className="text-sm text-white/40 leading-relaxed">
                We&apos;ll create a small Ubuntu 22.04 server (2 vCPU, 2GB RAM, 50GB SSD) on your best available Proxmox cluster.
              </p>
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-left space-y-2 text-xs text-white/50">
                <div className="flex justify-between"><span>OS</span><span className="text-white">Ubuntu 22.04 LTS</span></div>
                <div className="flex justify-between"><span>vCPU</span><span className="text-white">2 cores</span></div>
                <div className="flex justify-between"><span>RAM</span><span className="text-white">2 GB</span></div>
                <div className="flex justify-between"><span>Disk</span><span className="text-white">50 GB SSD</span></div>
              </div>
              {vpsCreated && <p className="text-sm text-emerald-400">✅ VPS creation queued!</p>}
              {error && <p className="text-xs text-red-300">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={createDemoVps} disabled={saving || vpsCreated}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-40">
                  {saving ? "Creating…" : "Deploy VPS →"}
                </button>
                <button onClick={() => setStep(4)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Your VoidCloud account is ready. Head to your dashboard to start managing VPS instances, WhatsApp conversations, and more.
              </p>
              <div className="grid gap-2 mt-4">
                <button onClick={() => router.push("/voidcloud/dashboard")}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white">
                  Go to Dashboard →
                </button>
                <button onClick={() => router.push("/voidcloud/dashboard/vps/new")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white/60 hover:text-white">
                  Create another VPS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

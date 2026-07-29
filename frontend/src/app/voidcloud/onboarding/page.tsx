/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { cloudAccount, cloudApi } from "@/features/vps/cloud";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from "lucide-react";

type Step = "whatsapp" | "profile" | "lead";

const STEPS: { id: Step; title: string; desc: string }[] = [
  { id: "whatsapp", title: "Connect WhatsApp", desc: "Link your WhatsApp business number to start messaging customers." },
  { id: "profile", title: "Business Profile", desc: "Confirm your business name, phone, and details." },
  { id: "lead", title: "Create First Lead", desc: "Add your first CRM lead to get started." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("whatsapp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

   useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let stop = false;
    setLoading(true);
    Promise.all([
      api.get("/auth/me").then((r: any) => r.data),
      cloudAccount.getOnboarding(),
    ])
      .then(([me, onboarding]) => {
        if (stop) return;
        if (me?.role !== "ADMIN") {
          router.replace("/voidcloud/dashboard");
          return;
        }
        if (onboarding?.onboardingCompleted || onboarding?.onboardingSkipped) {
          router.replace("/voidcloud/dashboard");
          return;
        }
        setProfileName(me?.name || "");
        setProfilePhone(me?.phone || "");
      })
      .catch(() => { if (!stop) router.replace("/voidcloud/dashboard"); })
      .finally(() => { if (!stop) setLoading(false); });
    return () => { stop = true; };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  async function next() {
    setErr(null);
    setSaving(true);
    try {
      if (step === "whatsapp") {
        if (!whatsapp.trim()) {
          setErr("Enter a WhatsApp number or skip this step.");
          setSaving(false);
          return;
        }
        await cloudAccount.updateProfile({ phone: whatsapp.trim() });
        setStep("profile");
      } else if (step === "profile") {
        if (!profileName.trim()) {
          setErr("Business name is required.");
          setSaving(false);
          return;
        }
        await cloudAccount.updateProfile({ displayName: profileName.trim(), phone: profilePhone || null });
        setStep("lead");
      } else if (step === "lead") {
        if (!leadName.trim()) {
          setErr("Lead name is required.");
          setSaving(false);
          return;
        }
        await cloudApi.crm.createLead({
          name: leadName.trim(),
          email: leadEmail || undefined,
          phone: leadPhone || undefined,
          source: "manual",
          status: "new",
        });
        await cloudAccount.completeOnboarding();
        setDone(true);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setErr(null);
    setSaving(true);
    try {
      await cloudAccount.skipOnboarding();
      router.replace("/voidcloud/dashboard");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Something went wrong.");
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-white/60">Loading onboarding…</div>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
        <p className="text-white/60">Your Void Cloud workspace is ready. Head to the dashboard to start managing your VPS and customers.</p>
        <button
          onClick={() => router.push("/voidcloud/dashboard")}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950"
        >
          Go to dashboard →
        </button>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Void Cloud</h1>
        <p className="mt-1 text-white/60">Let&apos;s get your workspace set up in 3 easy steps.</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${i <= currentIdx ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-white/40"}`}>
              {i < currentIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {s.title}
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-white/10" />}
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-lg font-semibold">{STEPS[currentIdx].title}</h2>
        <p className="text-sm text-white/60">{STEPS[currentIdx].desc}</p>

        {step === "whatsapp" && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">WhatsApp phone number</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="01XXXXXXXXX"
                maxLength={20}
              />
            </label>
            <p className="text-xs text-white/40">Used to send broadcasts and receive messages. You can change this later in settings.</p>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">Business name</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My Business"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">Phone</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                maxLength={20}
              />
            </label>
          </div>
        )}

        {step === "lead" && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">Lead name</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="John Doe"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">Email (optional)</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-white/50">Phone (optional)</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                maxLength={20}
              />
            </label>
          </div>
        )}

        {err && <p className="text-sm text-red-300">{err}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={skip}
            disabled={saving}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            Skip onboarding
          </button>

          <div className="flex gap-2">
            {currentIdx > 0 && (
              <button
                onClick={() => setStep(STEPS[currentIdx - 1].id)}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              onClick={next}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {currentIdx === STEPS.length - 1 ? "Finish" : <>Next <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

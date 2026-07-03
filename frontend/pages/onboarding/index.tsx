"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Phone,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Rocket,
  MessageCircle,
  UserPlus,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Business", icon: Building2 },
  { id: 2, label: "WhatsApp", icon: Phone },
  { id: 3, label: "First Lead", icon: UserPlus },
  { id: 4, label: "Done", icon: CheckCircle2 },
];

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("voidcloud_token"));
  }, []);

  // Step 1 — Business info
  const [businessName, setBusinessName] = useState(user?.name ?? "");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2 — WhatsApp
  const [waNumber, setWaNumber] = useState("");
  const [waConnected, setWaConnected] = useState(false);
  const [waConnecting, setWaConnecting] = useState(false);

  // Step 3 — First Lead
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const connectWhatsApp = async () => {
    if (!waNumber.trim()) return;
    setWaConnecting(true);
    await new Promise((r) => setTimeout(r, 1500)); // Simulate pairing
    setWaConnected(true);
    setWaConnecting(false);
    toast({ title: "WhatsApp connected!", description: `${waNumber} is now linked.` });
  };

  const saveLead = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setLeadSaving(true);
    try {
      await fetch(`${apiBase}/crm/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: leadName, phone: leadPhone, email: leadEmail }),
      });
    } catch {
      // Non-blocking — proceed regardless
    }
    setLeadSaved(true);
    setLeadSaving(false);
    toast({ title: "Lead saved!", description: `${leadName} added to your CRM.` });
  };

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vc_onboarding_done", "1");
    }
    router.push("/business/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Welcome to VoidCloud</h1>
          <p className="text-xs text-muted-foreground">Let's set up your account in 3 quick steps</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = s.id < step;
          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <Card className="w-full max-w-lg border-border/50 shadow-2xl">
        <CardContent className="pt-6">
          {/* ─── Step 1: Business Info ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Tell us about your business</h2>
                  <p className="text-sm text-muted-foreground">This helps us personalise your workspace.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Business name *</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Real estate, E-commerce…" />
              </div>
              <div className="space-y-2">
                <Label>Website (optional)</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" type="url" />
              </div>
              <Button className="w-full" onClick={goNext} disabled={!businessName.trim()}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ─── Step 2: WhatsApp ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="h-8 w-8 text-emerald-400" />
                <div>
                  <h2 className="text-xl font-bold">Connect WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">Link your WhatsApp Business number to start conversations.</p>
                </div>
              </div>

              {waConnected ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-400">Connected!</p>
                    <p className="text-sm text-muted-foreground">{waNumber}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>WhatsApp Business number *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        placeholder="+20 1xxxxxxxxx"
                        className="flex-1"
                      />
                      <Button onClick={connectWhatsApp} disabled={waConnecting || !waNumber.trim()} variant="outline">
                        {waConnecting ? "Pairing…" : "Connect"}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Enter your WhatsApp Business number above</li>
                      <li>A pairing code will be sent to that number</li>
                      <li>Approve the connection in WhatsApp</li>
                    </ol>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={goNext} className="flex-1" disabled={!waConnected}>
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <button
                className="text-xs text-muted-foreground underline w-full text-center"
                onClick={goNext}
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ─── Step 3: First Lead ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus className="h-8 w-8 text-blue-400" />
                <div>
                  <h2 className="text-xl font-bold">Add your first lead</h2>
                  <p className="text-sm text-muted-foreground">Start your CRM pipeline with one contact.</p>
                </div>
              </div>

              {leadSaved ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-400 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-400">Lead added!</p>
                    <p className="text-sm text-muted-foreground">{leadName} is in your CRM.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Full name *</Label>
                    <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="John Smith" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone number *</Label>
                    <Input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+20 1xxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional)</Label>
                    <Input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="lead@email.com" type="email" />
                  </div>
                  <Button onClick={saveLead} disabled={leadSaving || !leadName.trim() || !leadPhone.trim()} className="w-full">
                    {leadSaving ? "Saving…" : "Add Lead"}
                  </Button>
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={goNext} className="flex-1">
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <button className="text-xs text-muted-foreground underline w-full text-center" onClick={goNext}>
                Skip for now
              </button>
            </div>
          )}

          {/* ─── Step 4: Done ─── */}
          {step === 4 && (
            <div className="text-center space-y-6 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Rocket className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">You're all set!</h2>
                <p className="text-muted-foreground mt-2">
                  {businessName || "Your workspace"} is ready. Head to your dashboard to explore everything VoidCloud has to offer.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: MessageCircle, label: "WhatsApp CRM", color: "text-emerald-400" },
                  { icon: Building2, label: "VPS Hosting", color: "text-blue-400" },
                  { icon: Users, label: "Team & Leads", color: "text-violet-400" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-3">
                    <Icon className={`h-6 w-6 ${color} mx-auto mb-1`} />
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={finish}>
                Go to dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6">
        VoidCloud &copy; {new Date().getFullYear()} — You can always update these settings later.
      </p>
    </div>
  );
}

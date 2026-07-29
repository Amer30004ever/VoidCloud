"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sub2api } from "@/lib/api";
import { Button } from "@workspace/ui-kit/button";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan?: string;
  projectsCount?: number;
};

type Usage = {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
};

export default function Sub2ApiSettingsPage() {
  const qc = useQueryClient();
  const [supabaseToken, setSupabaseToken] = useState("");
  const [saved, setSaved] = useState(false);

  const profile = useQuery({
    queryKey: ["sub2api", "profile"],
    queryFn: () => sub2api.get<UserProfile>("/users/me").then((r) => r.data),
  });

  const usage = useQuery({
    queryKey: ["sub2api", "usage"],
    queryFn: () => sub2api.get<Usage>("/usage").then((r) => r.data),
  });

  const saveToken = useMutation({
    mutationFn: () => sub2api.post("/users/me/supabase-token", { token: supabaseToken }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub2api", "profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const upgrade = useMutation({
    mutationFn: () => sub2api.post("/billing/checkout").then((r) => r.data),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const p = profile.data;

  return (
    <AppLayout>
      <PageHeader title="Account settings" description="Manage your sub2api Studio account." />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Profile</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{p?.name || "Ã¯Â¿Â½"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{p?.email || "Ã¯Â¿Â½"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{p?.role || "Ã¯Â¿Â½"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="capitalize">{p?.plan || "free"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projects</span>
              <span>
                {p?.projectsCount ?? 0} / {p?.plan === "paid" ? "?" : "3"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">API usage</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests</span>
              <span>{usage.data?.totalRequests ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens</span>
              <span>{usage.data?.totalTokens ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated cost</span>
              <span>{(usage.data?.totalCost ?? 0).toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Billing</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Free tier includes up to 3 projects. Upgrade to paid for unlimited projects and priority support.
          </p>
          <div className="mt-3">
            <Button onClick={() => upgrade.mutate()} disabled={upgrade.isPending || p?.plan === "paid"}>
              {p?.plan === "paid" ? "Current plan" : upgrade.isPending ? "Redirecting..." : "Upgrade to paid"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Supabase organization</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect your Supabase organization access token to enable project provisioning.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={supabaseToken}
              onChange={(e) => setSupabaseToken(e.target.value)}
              placeholder="sbp_..."
              className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <Button onClick={() => saveToken.mutate()} disabled={!supabaseToken.trim() || saveToken.isPending}>
              {saved ? "Saved" : saveToken.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

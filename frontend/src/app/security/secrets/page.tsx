"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Key, Plus, Eye, EyeOff, Copy, Trash2, Search, Filter, Loader2, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { AddItemButton } from "@/components/ui/create-item-dialog";

export default function SecretsPage() {
  const [activeTab, setActiveTab] = useState<"secrets" | "keys" | "policies">("secrets");
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "secrets" as const, label: "Secrets", icon: Key },
    { id: "keys" as const, label: "API Keys", icon: Lock },
    { id: "policies" as const, label: "Policies", icon: Lock },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Secret Management"
        description="Manage your secrets, API keys, and access policies"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "secrets" && <SecretsTab isLoading={isLoading} />}
      {activeTab === "keys" && <KeysTab isLoading={isLoading} />}
      {activeTab === "policies" && <PoliciesTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function SecretsTab({ isLoading }: { isLoading: boolean }) {
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const toggleSecret = (id: string) => {
    setShowSecret((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <AddItemButton
            label="Add Secret"
            title="Add Secret"
            fields={[
              { name: "name", label: "Secret Name", placeholder: "database-password", required: true },
              { name: "namespace", label: "Namespace", placeholder: "default" },
              { name: "value", label: "Secret Value", placeholder: "••••••••", required: true },
            ]}
            onSubmit={() => Promise.resolve()}
          />
          <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search secrets..."
            className="w-64 rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">database-password</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Namespace: default • Created 30 days ago</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSecret("1")}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
                >
                  {showSecret["1"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {showSecret["1"] ? "••••••••••••••••" : "••••••••••••••••"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">api-secret-key</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Namespace: production • Created 7 days ago</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSecret("2")}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
                >
                  {showSecret["2"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {showSecret["2"] ? "••••••••••••••••" : "••••••••••••••••"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">redis-auth-token</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Expiring Soon</span>
                </div>
                <p className="text-xs text-muted-foreground">Namespace: monitoring • Expires in 5 days</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSecret("3")}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
                >
                  {showSecret["3"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {showSecret["3"] ? "••••••••••••••••" : "••••••••••••••••"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function KeysTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AddItemButton
          label="Generate API Key"
          title="Generate API Key"
          fields={[{ name: "name", label: "Key Name", placeholder: "Production API Key", required: true }]}
          onSubmit={() => Promise.resolve()}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Production API Key</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Created 30 days ago • Last used 2 hours ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">sk-prod-xxxxxxxxxxxxxxxxxxxxxxxx</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Development API Key</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Created 15 days ago • Last used 1 day ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">sk-dev-xxxxxxxxxxxxxxxxxxxxxxxx</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PoliciesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AddItemButton
          label="Create Policy"
          title="Create Access Policy"
          fields={[
            { name: "name", label: "Policy Name", placeholder: "Read-Only Access", required: true },
            { name: "scope", label: "Scope", placeholder: "namespace:default" },
          ]}
          onSubmit={() => Promise.resolve()}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Read-Only Access</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Allows read access to all secrets in default namespace</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Unlock className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">read</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">default</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Admin Access</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Full access to all secrets across all namespaces</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Unlock className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">read</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">write</span>
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">delete</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

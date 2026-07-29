"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { Users, Shield, History, Key, Bell, Trash2, Loader2, Palette, Sun, Moon, Download, Upload, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { AddItemButton } from "@workspace/ui-kit/create-item-dialog";
import { AddUserButton } from "@/features/admin/create-user-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, PortalUser } from "@/features/admin/settings";
import { useAuth } from "@/features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useTrackPageView } from "@/hooks/useTrackPageView";

export default function SettingsPage() {
  useTrackPageView();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "rbac" | "audit" | "security" | "integrations" | "api-keys" | "notifications" | "theme" | "backup">("users");

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const tabs = [
    { id: "users" as const, label: "User Management", icon: Users },
    { id: "rbac" as const, label: "RBAC", icon: Shield },
    { id: "audit" as const, label: "Audit Logs", icon: History },
    { id: "security" as const, label: "Security", icon: Lock },
    { id: "integrations" as const, label: "Integrations", icon: Key },
    { id: "api-keys" as const, label: "API Keys", icon: Key },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "theme" as const, label: "Theme", icon: Palette },
    { id: "backup" as const, label: "Backup & Restore", icon: Download },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Configure your VoidCloud workspace"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
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
      {activeTab === "users" && <UsersTab />}
      {activeTab === "rbac" && <RBACTab />}
      {activeTab === "audit" && <AuditTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "api-keys" && <APIKeysTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "theme" && <ThemeTab />}
      {activeTab === "backup" && <BackupTab />}
    </AppLayout>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: settingsApi.getUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-users"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">User Management</h3>
        <AddUserButton onCreated={() => queryClient.invalidateQueries({ queryKey: ["settings-users"] })} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user: PortalUser) => (
            <div key={user.id} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">{user.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {user.email} • {user.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20" onClick={() => deleteMutation.mutate(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-1 text-xs ${user.isActive ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">{user.role}</span>
                {user.mustChangePassword && (
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">Must change password</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RBACTab() {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["settings-roles"],
    queryFn: settingsApi.getRoles,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Role-Based Access Control</h3>
        <AddItemButton
          label="Add Role"
          title="Add Role"
          fields={[
            { name: "name", label: "Role Name", placeholder: "DevOps Engineer", required: true },
            { name: "description", label: "Description", placeholder: "Deploy and monitor" },
            { name: "permissions", label: "Permissions (comma-separated)", placeholder: "deploy, read-logs" },
          ]}
          onSubmit={async (values) => {
            await settingsApi.createRole({
              name: values.name,
              description: values.description ?? "",
              permissions: values.permissions ? values.permissions.split(",").map((p: string) => p.trim()) : [],
            });
            await queryClient.invalidateQueries({ queryKey: ["settings-roles"] });
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom roles yet.</p>
      ) : (
        <div className="space-y-3">
          {roles.map((role: Record<string, unknown>) => (
            <div key={String(role.id ?? role.name)} className="rounded-xl border border-border bg-card p-6">
              <h4 className="text-sm font-medium text-foreground">{String(role.name)}</h4>
              <p className="text-xs text-muted-foreground">{String(role.description ?? "")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTab() {
  const [actionFilter, setActionFilter] = useState("");
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["settings-audit-logs"],
    queryFn: () => settingsApi.getAuditLogs(100),
  });

  const filtered = logs.filter((log) => {
    if (!actionFilter) return true;
    return String(log.action ?? "").toLowerCase().includes(actionFilter.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">Audit Logs</h3>
        <input
          type="text"
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit logs found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((log: Record<string, unknown>) => (
            <div key={String(log.id)} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-foreground">{String(log.action)}</h4>
                  <p className="text-xs text-muted-foreground">
                    {String(log.userEmail ?? log.userId ?? "system")} •{" "}
                    {log.createdAt ? new Date(String(log.createdAt)).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              {log.resource != null && (
                <p className="text-xs text-muted-foreground">Resource: {String(log.resource)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [setup, setSetup] = useState<{ qrCode: string; base32: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePw, setDisablePw] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() { try { setStatus(await settingsApi.twoFactorStatus()); } catch {} }
  useEffect(() => { refresh(); }, []);

  async function enable2FA() {
    setMsg(null); setBusy(true);
    try {
      const res = await settingsApi.twoFactorEnable();
      setSetup(res); setOtp("");
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed to enable 2FA" });
    } finally { setBusy(false); }
  }

  async function verify2FA() {
    setMsg(null); setBusy(true);
    try {
      const res = await settingsApi.twoFactorVerify(otp.trim());
      setRecoveryCodes(res.recoveryCodes); setSetup(null); setOtp(""); await refresh();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Invalid code" });
    } finally { setBusy(false); }
  }

  async function regenerateCodes() {
    setMsg(null); setBusy(true);
    try {
      const res = await settingsApi.twoFactorRegenerate();
      setRecoveryCodes(res.recoveryCodes);
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  async function disable2FA() {
    setMsg(null); setBusy(true);
    try {
      await settingsApi.twoFactorDisable({ password: disablePw });
      setDisablePw(""); setRecoveryCodes(null); await refresh();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.response?.data?.message ?? "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <div className={`rounded-lg border p-3 text-sm ${msg.kind === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Two-factor authentication</h3>
        <p className="text-xs text-muted-foreground mt-1">Add an extra layer of security with TOTP (Google Authenticator, Authy, 1Password).</p>

        {recoveryCodes && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm mt-4">
            <p className="mb-2 font-semibold text-amber-200">Save these recovery codes now — they will not be shown again.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-amber-100">
              {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
            </div>
            <button onClick={() => setRecoveryCodes(null)} className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs">I&apos;ve saved them</button>
          </div>
        )}

        {!status?.enabled && !setup && (
          <div className="mt-4">
            <button disabled={busy} onClick={enable2FA} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Enable 2FA</button>
          </div>
        )}

        {setup && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/70">1. Scan the QR code in your authenticator app:</p>
            <img src={setup.qrCode} alt="2FA QR code" className="rounded-lg bg-white p-2" width={200} height={200} />
            <p className="text-xs text-white/50">Or enter this secret manually: <code className="rounded bg-slate-900 px-2 py-1">{setup.base32}</code></p>
            <p className="text-sm text-white/70">2. Enter the 6-digit code from your app:</p>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            <button disabled={busy || otp.length < 6} onClick={verify2FA} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Verify & activate</button>
          </div>
        )}

        {status?.enabled && !setup && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-emerald-300">2FA is enabled · {status.recoveryCodesRemaining} recovery codes remaining</p>
            <div className="flex gap-2">
              <button disabled={busy} onClick={regenerateCodes} className="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-accent disabled:opacity-60">Regenerate recovery codes</button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 mt-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Disable 2FA</h4>
              <input type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} placeholder="Confirm with your password" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <button disabled={busy || !disablePw} onClick={disable2FA} className="mt-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60">Disable 2FA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const isLoading = false;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">CI/CD Integrations</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { label: "GitHub Token", id: "settings-github-token", placeholder: "ghp_..." },
            { label: "GitLab Token", id: "settings-gitlab-token", placeholder: "glpat-..." },
            { label: "Kubeconfig Path", id: "settings-kubeconfig", placeholder: "~/.kube/config" },
          ].map(({ label, id, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
              </label>
              <input
                id={id}
                type="text"
                placeholder={placeholder}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <div className="flex justify-end">
            <button
              id="settings-save"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function APIKeysTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["settings-api-keys", user?.id],
    queryFn: () => settingsApi.getApiKeys(user?.id),
    enabled: Boolean(user?.id),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
        <AddItemButton
          label="Generate Key"
          title="Generate API Key"
          fields={[{ name: "name", label: "Key Name", placeholder: "CI/CD Pipeline Key", required: true }]}
          onSubmit={async (values) => {
            if (!user?.id) return;
            await settingsApi.generateApiKey({ name: values.name, userId: user.id });
            await queryClient.invalidateQueries({ queryKey: ["settings-api-keys"] });
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : apiKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key: Record<string, unknown>) => (
            <div key={String(key.id)} className="rounded-xl border border-border bg-card p-6">
              <h4 className="text-sm font-medium text-foreground">{String(key.name)}</h4>
              <p className="text-xs text-muted-foreground font-mono">
                {String(key.keyPrefix ?? "key")}••••
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const isLoading = false;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Notification Settings</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Email Notifications</h4>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Receive email notifications for important events</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Slack Notifications</h4>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Receive Slack notifications for deployments and alerts</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Alert Notifications</h4>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Receive notifications for critical alerts</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeTab() {
  const isLoading = false;
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [accentColor, setAccentColor] = useState("blue");

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Theme Customization</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-medium text-foreground">Color Mode</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${theme === "light" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
              >
                <Sun className="h-5 w-5 text-yellow-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Light</p>
                  <p className="text-xs text-muted-foreground">Always light mode</p>
                </div>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
              >
                <Moon className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Dark</p>
                  <p className="text-xs text-muted-foreground">Always dark mode</p>
                </div>
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${theme === "system" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
              >
                <Palette className="h-5 w-5 text-purple-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">System</p>
                  <p className="text-xs text-muted-foreground">Follow system preference</p>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-medium text-foreground">Accent Color</h4>
            <div className="flex gap-3">
              {["blue", "purple", "green", "orange", "red", "pink"].map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${accentColor === color
                      ? "border-primary scale-110"
                      : "border-border hover:border-primary/50"
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Compact Mode</h4>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Use more compact spacing throughout the interface</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BackupTab() {
  const isLoading = false;
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setTimeout(() => setIsBackingUp(false), 2000);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setTimeout(() => setIsRestoring(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Backup & Restore</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-medium text-foreground">Create Backup</h4>
            <p className="mb-4 text-xs text-muted-foreground">Create a full backup of your workspace configuration, including settings, users, and integrations.</p>
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isBackingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isBackingUp ? "Creating Backup..." : "Download Backup"}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-medium text-foreground">Restore Backup</h4>
            <p className="mb-4 text-xs text-muted-foreground">Restore your workspace from a previously created backup file. This will overwrite current settings.</p>
            <div className="flex gap-3">
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isRestoring ? "Restoring..." : "Upload Backup"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-medium text-foreground">Recent Backups</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">backup-2026-05-30.json</p>
                  <p className="text-xs text-muted-foreground">Created 2 hours ago • 2.4 MB</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">backup-2026-05-29.json</p>
                  <p className="text-xs text-muted-foreground">Created 1 day ago • 2.3 MB</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">backup-2026-05-28.json</p>
                  <p className="text-xs text-muted-foreground">Created 2 days ago • 2.3 MB</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

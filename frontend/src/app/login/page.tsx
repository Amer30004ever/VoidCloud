"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Terminal, Loader2, Eye, EyeOff, GitBranch, Rocket, Server, Layers, Cpu, HardDrive, Activity } from "lucide-react";
import { usePublicStats, useClusterHealth, useRecentDeployments, useRunningNamespaces, useSystemStatus, useServiceHealth } from "@/hooks/useStats";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const statsConfig = [
  { label: "Active Pipelines", key: "activePipelines" as const, icon: GitBranch, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { label: "Deployments Today", key: "deploymentsToday" as const, icon: Rocket, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Running Pods", key: "runningPods" as const, icon: Server, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Running Namespaces", key: "runningNamespaces" as const, icon: Layers, color: "text-green-400", bg: "bg-green-500/10" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: stats, isLoading: statsLoading, error: statsError } = usePublicStats();
  const { data: clusterHealth, isLoading: healthLoading } = useClusterHealth();
  const { data: recentDeployments, isLoading: deploymentsLoading } = useRecentDeployments(5);
  const { data: runningNamespaces, isLoading: namespacesLoading } = useRunningNamespaces();
  const { data: systemStatus, isLoading: systemStatusLoading } = useSystemStatus();
  const { data: serviceHealth, isLoading: serviceHealthLoading } = useServiceHealth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.replace("/dashboard");
    } catch {
      setServerError("Invalid credentials. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-6xl px-4">
        {/* Stats grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsConfig.map(({ label, key, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  {statsLoading ? (
                    <Loader2 className="mt-2 h-8 w-8 animate-spin text-muted-foreground" />
                  ) : statsError ? (
                    <p className="mt-2 text-3xl font-bold text-destructive">—</p>
                  ) : (
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {stats?.[key] ?? 0}
                    </p>
                  )}
                </div>
                <div className={`rounded-lg p-2.5 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cluster Health & Running Namespaces */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Cluster Health - Per Node */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Cluster Health
            </h2>
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clusterHealth?.nodes?.length ? (
              <div className="space-y-4">
                {clusterHealth.nodes.map((node) => (
                  <div key={node.name} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {node.name} ({node.role})
                      </span>
                      <span className="text-xs text-muted-foreground">{node.pods} pods</span>
                    </div>
                    {/* CPU */}
                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Cpu className="h-3 w-3" />
                          CPU
                        </span>
                        <span className="font-medium text-foreground">{node.cpu.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(node.cpu.usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Memory */}
                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          Memory
                        </span>
                        <span className="font-medium text-foreground">{node.memory.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${Math.min(node.memory.usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Disk */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          Disk
                        </span>
                        <span className="font-medium text-foreground">{node.disk.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${Math.min(node.disk.usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-xs text-muted-foreground">
                  {clusterHealth.nodes.length} Nodes, {clusterHealth.totalPods} Total Pods
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load cluster health</p>
            )}
          </div>

          {/* Running Namespaces */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Running Namespaces
            </h2>
            {namespacesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : runningNamespaces?.namespaces?.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {runningNamespaces.namespaces.map((ns) => (
                  <div key={ns.namespace} className="rounded-md border border-border p-3 text-sm">
                    <span className="font-medium text-foreground">{ns.namespace}</span>
                    <span className="ml-2 text-muted-foreground">
                      {ns.podCount} pods • {ns.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load namespaces</p>
            )}
            {systemStatus && (
              <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                API: {systemStatus.apiStatus ?? "unknown"} • Uptime: {systemStatus.uptime ?? "—"}s
              </div>
            )}
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Rocket className="h-4 w-4 text-primary" />
            Recent Deployments
          </h2>
          {deploymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentDeployments?.deployments && recentDeployments.deployments.length > 0 ? (
            <div className="space-y-3">
              {recentDeployments.deployments.map((deployment) => (
                <div
                  key={deployment.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{deployment.name}</p>
                    <p className="text-xs text-muted-foreground">{deployment.namespace}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDate(deployment.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {deployment.readyReplicas}/{deployment.replicas} ready
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent deployments</p>
          )}
        </div>

        {/* Card */}
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl glow-primary">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <Terminal className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">
                Welcome to Amer Portal
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to manage your DevOps projects
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="admin@amer.dev"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Amer Portal — DevOps Project Hub v1.0.0
        </p>
      </div>
    </div>
  );
}
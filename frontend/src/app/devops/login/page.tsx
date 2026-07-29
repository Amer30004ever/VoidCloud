"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Terminal,
  Loader2,
  Eye,
  EyeOff,
  GitBranch,
  Rocket,
  Server,
  Layers,
  Cpu,
  HardDrive,
  Activity,
  Code2 as Github,
  Briefcase as Linkedin,
  ShieldCheck,
  Globe2,
} from "lucide-react";
import {
  usePublicStats,
  useClusterHealth,
  useRecentDeployments,
  useRunningNamespaces,
  useSystemStatus,
} from "@/features/vps/useStats";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const statsConfig = [
  { label: "Active Pipelines", key: "activePipelines" as const, icon: GitBranch, accent: "from-cyan-500/30 to-cyan-500/0", iconColor: "text-cyan-300" },
  { label: "Deployments Today", key: "deploymentsToday" as const, icon: Rocket, accent: "from-purple-500/30 to-purple-500/0", iconColor: "text-purple-300" },
  { label: "Running Pods", key: "runningPods" as const, icon: Server, accent: "from-indigo-500/30 to-indigo-500/0", iconColor: "text-indigo-300" },
  { label: "Namespaces", key: "runningNamespaces" as const, icon: Layers, accent: "from-emerald-500/30 to-emerald-500/0", iconColor: "text-emerald-300" },
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
  const { data: systemStatus } = useSystemStatus();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.replace("/dashboard");
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      setServerError(
        status === 401
          ? "Invalid credentials. Please try again."
          : "Portal API is unreachable. Please check backend health and try again.",
      );
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  const apiOk = (systemStatus?.apiStatus ?? "").toLowerCase() === "ok" || (systemStatus?.apiStatus ?? "").toLowerCase() === "up";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0e17] text-slate-100 antialiased">
      {/* Backstage-inspired ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.5) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-40 left-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-12rem] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 lg:px-8">
        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Amer Platform Portal</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">HomeLab • DevOps Hub</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 text-xs text-slate-400 md:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${apiOk ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" : "bg-amber-400"}`} />
              API {systemStatus?.apiStatus ?? "checking"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" /> {systemStatus?.uptime ? `${Math.round(systemStatus.uptime)}s uptime` : "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" /> SSO ready
            </span>
          </div>
        </header>

        {/* Main grid: left = live cluster, right = sign-in */}
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* LEFT: live cluster snapshot */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statsConfig.map(({ label, key, icon: Icon, accent, iconColor }) => (
                <div
                  key={label}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 backdrop-blur transition hover:border-indigo-400/40"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
                      {statsLoading ? (
                        <Loader2 className="mt-2 h-7 w-7 animate-spin text-slate-500" />
                      ) : statsError ? (
                        <p className="mt-2 text-3xl font-bold text-rose-300">—</p>
                      ) : (
                        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{stats?.[key] ?? 0}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cluster + Namespaces */}
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Activity className="h-4 w-4 text-indigo-300" /> Cluster Health
                  </h2>
                  {clusterHealth?.nodes?.length ? (
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {clusterHealth.nodes.length} nodes • {clusterHealth.totalPods} pods
                    </span>
                  ) : null}
                </div>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                  </div>
                ) : clusterHealth?.nodes?.length ? (
                  <div className="space-y-4">
                    {clusterHealth.nodes.map((node) => (
                      <div key={node.name} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-100">
                            {node.name}{" "}
                            <span className="ml-1 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                              {node.role}
                            </span>
                          </span>
                          <span className="text-slate-400">{node.pods} pods</span>
                        </div>
                        <Bar icon={Cpu} label="CPU" value={node.cpu.usagePercent} color="bg-indigo-500" />
                        <Bar icon={Activity} label="Memory" value={node.memory.usagePercent} color="bg-violet-500" />
                        <Bar icon={HardDrive} label="Disk" value={node.disk.usagePercent} color="bg-emerald-500" last />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Unable to load cluster health</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-emerald-300" /> Running Namespaces
                </h2>
                {namespacesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                ) : runningNamespaces?.namespaces?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {runningNamespaces.namespaces.map((ns) => (
                      <div
                        key={ns.namespace}
                        className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium text-slate-100">{ns.namespace}</span>
                        <span className="ml-2 shrink-0 text-xs text-slate-400">
                          {ns.podCount} • {ns.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Unable to load namespaces</p>
                )}
              </section>
            </div>

            {/* Recent deployments */}
            <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Rocket className="h-4 w-4 text-fuchsia-300" /> Recent Deployments
              </h2>
              {deploymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                </div>
              ) : recentDeployments?.deployments?.length ? (
                <ul className="divide-y divide-slate-800">
                  {recentDeployments.deployments.map((d) => (
                    <li key={d.name} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{d.name}</p>
                        <p className="text-xs text-slate-400">{d.namespace}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{formatDate(d.createdAt)}</p>
                        <p className="text-xs text-slate-300">
                          {d.readyReplicas}/{d.replicas} ready
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No recent deployments</p>
              )}
            </section>
          </div>

          {/* RIGHT: sign-in card */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl shadow-indigo-950/40 backdrop-blur">
              <div className="border-b border-slate-800 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-6">
                <h1 className="text-lg font-semibold text-white">Sign in to your portal</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Authenticate to access clusters, pipelines, and platform tools.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@amer.dev"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-xs text-rose-300">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-rose-300">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                      {...register("remember")}
                    />
                    Keep me signed in
                  </label>
                  <a href="/forgot-password" className="text-indigo-300 hover:text-indigo-200">
                    Forgot password?
                  </a>
                </div>

                {serverError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {serverError}
                  </div>
                )}

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500">
                  Protected by JWT. Sessions are issued by the Amer Auth service.
                </p>
              </form>
            </div>

            {/* Footer: profile links */}
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur">
              <p className="mb-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Built by Amer Magdi · DevOps Engineer
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="https://github.com/Amer30004ever"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <Github className="h-4 w-4" /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/amer-magdi-devops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#0a66c2]/40 bg-[#0a66c2]/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:border-[#0a66c2] hover:text-white"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                VoidCloud · DevOps Project Hub v1.0.0
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Bar({
  icon: Icon,
  label,
  value,
  color,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-2"}>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-slate-400">
          <Icon className="h-3 w-3" /> {label}
        </span>
        <span className="font-medium tabular-nums text-slate-200">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}


"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { HomelabSections } from "@/components/dashboard/HomelabSections";
import { PageHeader } from "@/components/ui/page-header";
import { GitBranch, Rocket, Server, Layers, Loader2, AlertTriangle, FileText, Play, ArrowRight, Activity, Cpu, HardDrive, Scale, RefreshCw, Trash2, Settings, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { useStats, useFailedPods, useRecentDeployments, useRecentActivity, usePodStatus, useServiceStatus, useClusterHealth } from "@/hooks/useStats";
import type { ClusterHealthData } from "@/lib/stats";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { useMetricsWebSocket } from "@/hooks/useMetricsWebSocket";

function getClusterUsageAverages(clusterHealth?: ClusterHealthData) {
  const nodes = clusterHealth?.nodes ?? [];
  if (!nodes.length) return { cpu: 0, memory: 0, disk: 0 };
  const totals = nodes.reduce(
    (acc, node) => ({
      cpu: acc.cpu + node.cpu.usagePercent,
      memory: acc.memory + node.memory.usagePercent,
      disk: acc.disk + node.disk.usagePercent,
    }),
    { cpu: 0, memory: 0, disk: 0 },
  );
  return {
    cpu: totals.cpu / nodes.length,
    memory: totals.memory / nodes.length,
    disk: totals.disk / nodes.length,
  };
}

const statsConfig = [
  { label: "Active Pipelines", key: "activePipelines" as const, icon: GitBranch, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { label: "Deployments Today", key: "deploymentsToday" as const, icon: Rocket, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Running Pods", key: "runningPods" as const, icon: Server, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Running Namespaces", key: "runningNamespaces" as const, icon: Layers, color: "text-green-400", bg: "bg-green-500/10" },
];

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useStats();
  const { data: failedPods } = useFailedPods();
  const { data: recentDeployments, isLoading: deploymentsLoading } = useRecentDeployments(5);
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { data: podStatus, isLoading: podStatusLoading } = usePodStatus();
  const { data: serviceStatus, isLoading: serviceStatusLoading } = useServiceStatus();
  const { data: clusterHealth, isLoading: healthLoading } = useClusterHealth();
  const { metrics: liveMetrics, connected: metricsConnected } = useMetricsWebSocket(true);
  const clusterUsage = getClusterUsageAverages(clusterHealth);
  const router = useRouter();
  const [showAllQuickActions, setShowAllQuickActions] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleExportCsv = () => {
    const rows = [
      {
        metric: "Active Pipelines",
        value: stats?.activePipelines ?? 0,
      },
      {
        metric: "Deployments Today",
        value: stats?.deploymentsToday ?? 0,
      },
      {
        metric: "Running Pods",
        value: stats?.runningPods ?? 0,
      },
      {
        metric: "Running Namespaces",
        value: stats?.runningNamespaces ?? 0,
      },
      ...(recentDeployments?.deployments ?? []).map((deployment) => ({
        metric: `Deployment: ${deployment.name}`,
        value: `${deployment.namespace} | ${deployment.readyReplicas}/${deployment.replicas} ready`,
      })),
      ...(podStatus?.pods ?? []).slice(0, 20).map((pod) => ({
        metric: `Pod: ${pod.name}`,
        value: `${pod.namespace} | ${pod.status} | ${pod.restarts} restarts`,
      })),
    ];

    exportToCsv(`voidcloud-dashboard-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleExportPdf = () => {
    exportToPdf("Amer Portal Dashboard Report", [
      {
        heading: "KPI Summary",
        rows: [
          { Metric: "Active Pipelines", Value: stats?.activePipelines ?? 0 },
          { Metric: "Deployments Today", Value: stats?.deploymentsToday ?? 0 },
          { Metric: "Running Pods", Value: stats?.runningPods ?? 0 },
          { Metric: "Running Namespaces", Value: stats?.runningNamespaces ?? 0 },
        ],
      },
      {
        heading: "Cluster Health",
        rows: (clusterHealth?.nodes ?? []).map((node) => ({
          Node: node.name,
          Role: node.role,
          CPU: `${node.cpu.usagePercent.toFixed(1)}%`,
          Memory: `${node.memory.usagePercent.toFixed(1)}%`,
          Disk: `${node.disk.usagePercent.toFixed(1)}%`,
          Pods: node.pods,
        })),
      },
      {
        heading: "Recent Deployments",
        rows: (recentDeployments?.deployments ?? []).map((deployment) => ({
          Name: deployment.name,
          Namespace: deployment.namespace,
          Image: deployment.image,
          Ready: `${deployment.readyReplicas}/${deployment.replicas}`,
          Created: formatDate(deployment.createdAt),
        })),
      },
      {
        heading: "Pod Status",
        rows: (podStatus?.pods ?? []).slice(0, 25).map((pod) => ({
          Pod: pod.name,
          Namespace: pod.namespace,
          Status: pod.status,
          Restarts: pod.restarts,
        })),
      },
    ]);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          description="Overview of your DevOps projects and infrastructure"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map(({ label, key, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {isLoading ? (
                  <Loader2 className="mt-2 h-8 w-8 animate-spin text-muted-foreground" />
                ) : error ? (
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

      {/* Cluster Health - Per Node */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Cluster Health
        </h2>
        {healthLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clusterHealth?.nodes?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {clusterHealth.nodes.map((node) => (
              <div key={node.name} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {node.name} ({node.role})
                  </span>
                  <span className="text-xs text-muted-foreground">{node.pods} pods</span>
                </div>
                {/* CPU */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Cpu className="h-3 w-3" />
                      CPU
                    </span>
                    <span className="font-medium text-foreground">{node.cpu.usagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(node.cpu.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Memory */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      Memory
                    </span>
                    <span className="font-medium text-foreground">{node.memory.usagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(node.disk.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load cluster health</p>
        )}
      </div>

      {/* Failed Pods Alert */}
      {failedPods?.failedPods && failedPods.failedPods.length > 0 && (
        <div className="mt-6 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-sm font-semibold text-destructive">
                Failed Pods Alert ({failedPods.failedPods.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAllAlerts(!showAllAlerts)}
              className="text-xs text-destructive hover:underline"
            >
              {showAllAlerts ? 'Show less' : 'Show all'}
            </button>
          </div>
          <div className="space-y-2">
            {failedPods.failedPods.slice(0, showAllAlerts ? failedPods.failedPods.length : 3).map((pod) => (
              <div
                key={pod.name}
                className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background/50 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{pod.name}</p>
                  <p className="text-xs text-muted-foreground">{pod.namespace} • {pod.phase}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-destructive">{pod.restartCount} restarts</p>
                  <p className="text-xs text-muted-foreground">{formatDate(pod.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/logs')}
            className="mt-4 flex items-center gap-2 text-sm text-destructive hover:underline"
          >
            View all failed pods logs <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Resource Trends */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          Live Resource Metrics {metricsConnected && <span className="text-xs text-green-500">● Live</span>}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Cpu className="h-3 w-3" />
                CPU Usage
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Math.round(liveMetrics?.cpu ?? clusterUsage.cpu)}%</p>
            <p className="text-xs text-muted-foreground">Real-time via WebSocket</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                Memory Usage
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Math.round(liveMetrics?.memory ?? clusterUsage.memory)}%</p>
            <p className="text-xs text-muted-foreground">Real-time via WebSocket</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Disk Usage
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Math.round(liveMetrics?.disk ?? clusterUsage.disk)}%</p>
            <p className="text-xs text-muted-foreground">Real-time via WebSocket</p>
          </div>
        </div>
      </div>

      {/* Alerts Summary */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="h-4 w-4 text-primary" />
          Alerts Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{failedPods?.failedPods?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Warning</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">2</p>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Resolved</span>
            </div>
            <p className="text-2xl font-bold text-green-500">15</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Response</span>
            </div>
            <p className="text-2xl font-bold text-foreground">5m</p>
            <p className="text-xs text-muted-foreground">Time to resolve</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Play className="h-4 w-4 text-primary" />
            Quick Actions
          </h2>
          <button
            onClick={() => setShowAllQuickActions(!showAllQuickActions)}
            className="text-xs text-primary hover:underline"
          >
            {showAllQuickActions ? 'Show less' : 'Show all'}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => router.push('/infrastructure')}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Deploy</p>
              <p className="text-xs text-muted-foreground">New application</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/logs')}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">View Logs</p>
              <p className="text-xs text-muted-foreground">Check pod logs</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/pipelines')}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <GitBranch className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Pipelines</p>
              <p className="text-xs text-muted-foreground">Manage CI/CD</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/cluster')}
            className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Scale</p>
              <p className="text-xs text-muted-foreground">Adjust replicas</p>
            </div>
          </button>
          {showAllQuickActions && (
            <>
              <button
                onClick={() => router.push('/cluster')}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Restart</p>
                  <p className="text-xs text-muted-foreground">Restart pods</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/cluster')}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <Trash2 className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Delete</p>
                  <p className="text-xs text-muted-foreground">Remove resources</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Settings</p>
                  <p className="text-xs text-muted-foreground">Configure portal</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/monitoring')}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Monitor</p>
                  <p className="text-xs text-muted-foreground">View metrics</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
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
                  <p className="text-xs text-muted-foreground">{deployment.namespace} • {deployment.image}</p>
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

      {/* Recent Activity */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h2>
        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentActivity?.activities?.length ? (
          <div className="space-y-3">
            {recentActivity.activities.slice(0, 6).map((activity, index) => (
              <div key={`${activity.timestamp}-${index}`} className="flex items-center justify-between text-sm">
                <p className="text-foreground">{activity.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </div>

      {/* Service Status */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Service Status (Auto-refresh every 5s)
        </h2>
        {serviceStatusLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : serviceStatus?.services?.length ? (
          <div className="space-y-2">
            {serviceStatus.services.slice(0, 8).map((service) => (
              <div key={`${service.namespace}-${service.service}`} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{service.service}</p>
                  <p className="text-xs text-muted-foreground">{service.namespace}</p>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{service.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No service status data</p>
        )}
      </div>

      {/* Top Resource Consumers */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Cpu className="h-4 w-4 text-primary" />
          Top Resource Consumers
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-muted-foreground">Namespace</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Deployment</th>
                <th className="text-left p-2 font-medium text-muted-foreground">CPU</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Memory</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2 text-foreground">default</td>
                <td className="p-2 text-foreground">nginx-deployment</td>
                <td className="p-2 text-foreground">850m (42%)</td>
                <td className="p-2 text-foreground">1.2Gi (30%)</td>
                <td className="p-2"><span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Running</span></td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-foreground">default</td>
                <td className="p-2 text-foreground">redis-master</td>
                <td className="p-2 text-foreground">620m (31%)</td>
                <td className="p-2 text-foreground">2.1Gi (52%)</td>
                <td className="p-2"><span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Running</span></td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-foreground">monitoring</td>
                <td className="p-2 text-foreground">prometheus</td>
                <td className="p-2 text-foreground">1.2Gi (60%)</td>
                <td className="p-2 text-foreground">3.5Gi (87%)</td>
                <td className="p-2"><span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Warning</span></td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-foreground">logging</td>
                <td className="p-2 text-foreground">elasticsearch</td>
                <td className="p-2 text-foreground">1.8Gi (90%)</td>
                <td className="p-2 text-foreground">3.8Gi (95%)</td>
                <td className="p-2"><span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Critical</span></td>
              </tr>
              <tr>
                <td className="p-2 text-foreground">app</td>
                <td className="p-2 text-foreground">backend-api</td>
                <td className="p-2 text-foreground">450m (22%)</td>
                <td className="p-2 text-foreground">800Mi (20%)</td>
                <td className="p-2"><span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Running</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pod Status */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Pod Status (Auto-refresh every 10s)
        </h2>
        {podStatusLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : podStatus?.pods?.length ? (
          <div className="space-y-2">
            {podStatus.pods.slice(0, 10).map((pod) => (
              <div key={`${pod.namespace}-${pod.name}`} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{pod.name}</p>
                  <p className="text-xs text-muted-foreground">{pod.namespace}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{pod.status}</p>
                  <p className="text-xs text-muted-foreground">{pod.restarts} restarts</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pod status data</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentActivity?.activities?.length ? (
          <div className="space-y-3">
            {recentActivity.activities.slice(0, 5).map((activity, index) => (
              <div key={`${activity.type}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <div className="rounded-full bg-primary/10 p-2">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[activity.namespace, activity.timestamp].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </div>

      {/* HomeLab-style additional sections */}
      <HomelabSections />
    </AppLayout>
  );
}
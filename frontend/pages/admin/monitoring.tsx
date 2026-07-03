import { useState, useEffect } from "react";
import { useGetServiceHealth, useGetPlatformMetrics, useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Cpu, MemoryStick, HardDrive, Globe } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

function StatusIcon({ status }: { status: string }) {
  if (status === "UP") return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === "DEGRADED") return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
  return <XCircle className="h-5 w-5 text-red-400" />;
}

function GaugeChart({ value, label, color }: { value: number; label: string; color: string }) {
  const data = [{ value, fill: color }, { value: 100 - value, fill: "transparent" }];
  return (
    <div className="relative flex flex-col items-center">
      <div style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

export default function AdminMonitoring() {
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useGetServiceHealth({ query: { refetchInterval: 30000 } });
  const { data: metricsData, isLoading: isMetricsLoading } = useGetPlatformMetrics({ query: { refetchInterval: 30000 } });
  const { data: alertsData, isLoading: isAlertsLoading } = useListAlerts();
  const [podLogs, setPodLogs] = useState<{ pod: string; logs: string } | null>(null);
  const [pods, setPods] = useState<any[]>([]);
  const [podsLoading, setPodsLoading] = useState(false);
  const [grafanaTab, setGrafanaTab] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("voidcloud_token"));
  }, []);

  const loadPods = async () => {
    setPodsLoading(true);
    try {
      const res = await fetch(`${apiBase}/monitoring/pods`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPods(data);
    } catch { /* ignore */ }
    setPodsLoading(false);
  };

  const viewLogs = async (pod: any) => {
    try {
      const res = await fetch(`${apiBase}/monitoring/pods/${pod.namespace}/${pod.name}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPodLogs({ pod: pod.name, logs: data.logs });
    } catch { /* ignore */ }
  };

  const restartPod = async (pod: any) => {
    await fetch(`${apiBase}/monitoring/pods/${pod.namespace}/${pod.name}/restart`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const services = healthData?.services || [];
  const upCount = services.filter((s: any) => s.status === "UP").length;
  const degradedCount = services.filter((s: any) => s.status === "DEGRADED").length;
  const downCount = services.filter((s: any) => s.status === "DOWN").length;
  const platformHealth = healthData?.platformHealth ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">System Monitoring</h2>
        <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Platform health summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`border-2 ${platformHealth >= 90 ? "border-emerald-500/30" : platformHealth >= 70 ? "border-yellow-500/30" : "border-red-500/30"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className={`h-8 w-8 ${platformHealth >= 90 ? "text-emerald-400" : platformHealth >= 70 ? "text-yellow-400" : "text-red-400"}`} />
            <div>
              <p className="text-xs text-muted-foreground">Platform Health</p>
              <p className="text-2xl font-bold">{platformHealth}%</p>
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <div><p className="text-xs text-muted-foreground">UP</p><p className="text-2xl font-bold text-emerald-400">{upCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-yellow-400" />
          <div><p className="text-xs text-muted-foreground">DEGRADED</p><p className="text-2xl font-bold text-yellow-400">{degradedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-red-400" />
          <div><p className="text-xs text-muted-foreground">DOWN</p><p className="text-2xl font-bold text-red-400">{downCount}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="health">Service Health</TabsTrigger>
          <TabsTrigger value="metrics">Resource Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alertsData?.length || 0})</TabsTrigger>
          <TabsTrigger value="pods" onClick={loadPods}>Pod Manager</TabsTrigger>
          <TabsTrigger value="grafana">Grafana</TabsTrigger>
        </TabsList>

        {/* Service Health */}
        <TabsContent value="health" className="mt-6">
          {isHealthLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc: any) => (
                <Card key={svc.name} className={`border ${svc.status === "UP" ? "border-emerald-500/20" : svc.status === "DEGRADED" ? "border-yellow-500/30" : "border-red-500/30"}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={svc.status} />
                      <div>
                        <div className="font-medium text-sm">{svc.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {svc.responseTime != null ? `${svc.responseTime}ms` : svc.error || "Unreachable"}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={svc.status === "UP" ? "default" : svc.status === "DEGRADED" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {svc.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Metrics */}
        <TabsContent value="metrics" className="mt-6 space-y-6">
          {isMetricsLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
            <>
              <div className="flex justify-around flex-wrap gap-8 p-6 bg-card rounded-xl border border-border">
                <GaugeChart value={Math.round(metricsData?.cpuUsage || 0)} label="CPU Usage" color="#3b82f6" />
                <GaugeChart value={Math.round(metricsData?.ramUsage || 0)} label="RAM Usage" color="#a855f7" />
                <GaugeChart value={Math.round(metricsData?.diskUsage || 0)} label="Disk Usage" color="#f59e0b" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: metricsData?.totalUsers || 0, icon: Activity },
                  { label: "Total Tenants", value: metricsData?.totalTenants || 0, icon: Globe },
                  { label: "Total VPS", value: metricsData?.totalVPS || 0, icon: Cpu },
                  { label: "Active Alerts", value: metricsData?.activeAlerts || 0, icon: AlertTriangle },
                ].map(({ label, value, icon: Icon }) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Icon className="h-4 w-4" /><span className="text-xs">{label}</span>
                      </div>
                      <p className="text-2xl font-bold">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-6">
          {isAlertsLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
            <Card>
              <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(alertsData || []).map((alert: any) => (
                  <div key={alert.id} className="flex justify-between items-start p-3 rounded-lg border border-border bg-muted/20">
                    <div>
                      <div className="font-medium">{alert.title || alert.name}</div>
                      <div className="text-sm text-muted-foreground">{alert.message || alert.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(alert.createdAt).toLocaleString()}</div>
                    </div>
                    <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>{alert.severity}</Badge>
                  </div>
                ))}
                {!alertsData?.length && <p className="text-center py-8 text-muted-foreground">No active alerts 🎉</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pod Manager */}
        <TabsContent value="pods" className="mt-6">
          {podLogs ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Logs: {podLogs.pod}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setPodLogs(null)}>Close</Button>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-black/50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto text-green-400 whitespace-pre-wrap">
                  {podLogs.logs}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kubernetes Pods</CardTitle>
                <Button variant="outline" size="sm" onClick={loadPods} disabled={podsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${podsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-4 py-3">Pod</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Ready</th>
                        <th className="px-4 py-3">Restarts</th>
                        <th className="px-4 py-3">CPU</th>
                        <th className="px-4 py-3">Memory</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {podsLoading ? (
                        <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
                      ) : pods.map((pod: any) => (
                        <tr key={pod.name} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{pod.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={pod.status === "Running" ? "default" : pod.status === "Pending" ? "secondary" : "destructive"} className="text-xs">
                              {pod.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{pod.ready}</td>
                          <td className="px-4 py-3">
                            <span className={pod.restarts > 3 ? "text-red-400 font-bold" : "text-muted-foreground"}>{pod.restarts}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{pod.cpu}</td>
                          <td className="px-4 py-3 text-muted-foreground">{pod.memory}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => viewLogs(pod)}>Logs</Button>
                              <Button size="sm" variant="ghost" onClick={() => restartPod(pod)}>Restart</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!podsLoading && !pods.length && (
                        <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Click Refresh to load pods</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Grafana */}
        <TabsContent value="grafana" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Grafana Live Dashboards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Live Grafana dashboards embedded below. Configure your Grafana URL in Settings to enable.
              </p>
              <div className="bg-muted/30 rounded-lg border border-border overflow-hidden" style={{ height: 600 }}>
                <iframe
                  src={`${process.env.NEXT_PUBLIC_GRAFANA_URL || "https://grafana.voidcloud.cc.cd"}/d/kubernetes?orgId=1&kiosk=tv&theme=dark`}
                  className="w-full h-full border-0"
                  title="Grafana Dashboard"
                  onError={() => {}}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set <code className="bg-muted px-1 rounded">VITE_GRAFANA_URL</code> to your Grafana instance URL.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

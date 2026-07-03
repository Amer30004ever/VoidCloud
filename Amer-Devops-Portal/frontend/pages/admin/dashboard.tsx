import { useGetAdminDashboard, useGetServiceHealth } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Server, Activity, DollarSign, CheckCircle2, AlertTriangle, ArrowUpRight, Shield, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

const activityData = [
  { time: "00:00", requests: 120 }, { time: "04:00", requests: 85 },
  { time: "08:00", requests: 310 }, { time: "12:00", requests: 540 },
  { time: "16:00", requests: 480 }, { time: "20:00", requests: 290 },
  { time: "Now",   requests: 380 },
];

const recentActivity = [
  { action: "New tenant registered", detail: "Acme Corp (admin@acme.com)", time: "2 min ago", type: "create" },
  { action: "VPS provisioned", detail: "web-01 on Primary Cluster", time: "8 min ago", type: "vps" },
  { action: "Payment received", detail: "$2,400 from Enterprise plan", time: "23 min ago", type: "billing" },
  { action: "User impersonation", detail: "admin@voidcloud.com → user@acme.com", time: "1h ago", type: "security" },
  { action: "Maintenance enabled", detail: "Scheduled window: 02:00-04:00", time: "3h ago", type: "system" },
  { action: "IP blocked", detail: "185.220.101.42 — rate limit abuse", time: "5h ago", type: "security" },
];

const typeColors: Record<string, string> = {
  create:   "bg-emerald-500/20 text-emerald-400",
  vps:      "bg-blue-500/20 text-blue-400",
  billing:  "bg-yellow-500/20 text-yellow-400",
  security: "bg-red-500/20 text-red-400",
  system:   "bg-violet-500/20 text-violet-400",
};

function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: any; sub?: string; icon: any; trend?: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        {trend != null && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            <ArrowUpRight className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
            {Math.abs(trend)}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();
  const { data: healthData } = useGetServiceHealth({ query: { refetchInterval: 30000 } });
  const { user } = useAuth();

  const health = healthData?.platformHealth ?? 100;
  const services = healthData?.services || [];
  const downServices = services.filter((s: any) => s.status === "DOWN");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.name || "Admin"}. Here's your platform overview.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${health >= 90 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : health >= 70 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          <div className={`h-2 w-2 rounded-full animate-pulse ${health >= 90 ? "bg-emerald-500" : health >= 70 ? "bg-yellow-500" : "bg-red-500"}`} />
          Platform Health: {health}%
        </div>
      </div>

      {/* Down services alert */}
      {downServices.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{downServices.length} service{downServices.length > 1 ? "s" : ""} DOWN: {downServices.map((s: any) => s.name).join(", ")}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data?.totalUsers || 0} sub="All roles" icon={Users} trend={12} />
        <StatCard label="Active Tenants" value={data?.totalTenants || 0} sub="Business accounts" icon={Activity} trend={8} />
        <StatCard label="VPS Instances" value={data?.totalVps || 0} sub={`${Math.round((data?.totalVps || 0) * 0.85)} running`} icon={Server} trend={5} />
        <StatCard label="MRR" value={`$${((data?.totalRevenue || 15000)).toLocaleString()}`} sub="Monthly recurring" icon={DollarSign} trend={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Traffic (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="requests" stroke="#8b5cf6" fill="url(#trafficGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service health mini */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Service Health</CardTitle>
              <Badge variant={health >= 90 ? "default" : "destructive"}>{health}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.slice(0, 7).map((svc: any) => (
              <div key={svc.name} className="flex items-center justify-between text-sm">
                <span className="truncate text-muted-foreground">{svc.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {svc.responseTime != null && (
                    <span className="text-xs text-muted-foreground font-mono">{svc.responseTime}ms</span>
                  )}
                  <div className={`h-2 w-2 rounded-full ${svc.status === "UP" ? "bg-emerald-500" : svc.status === "DEGRADED" ? "bg-yellow-500" : "bg-red-500"}`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${typeColors[item.type] || "bg-muted text-muted-foreground"}`}>
                    {item.type === "create" ? "+" :
                     item.type === "vps" ? <Zap className="h-3.5 w-3.5" /> :
                     item.type === "billing" ? "$" :
                     item.type === "security" ? <Shield className="h-3.5 w-3.5" /> : "!"}
                  </div>
                  {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.action}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

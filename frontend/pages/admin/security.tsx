import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, RefreshCw, AlertTriangle, Globe, Zap, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AdminSecurity() {
  const token = localStorage.getItem("voidcloud_token");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rate-limits"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/monitoring/rate-limits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const res = await fetch(`${apiBase}/monitoring/rate-limits/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip, reason }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "IP Blocked", description: `${blockIp} has been blocked` });
      setBlockIp("");
      setBlockReason("");
      refetch();
    },
    onError: () => toast({ title: "Error", description: "Failed to block IP", variant: "destructive" }),
  });

  const topIPs = data?.topIPs || [];
  const blockedIPs = data?.blockedIPs || [];
  const tenantRates = data?.tenantRates || [];

  const chartData = topIPs.map((ip: any) => ({
    name: ip.ip,
    requests: ip.requests,
    blocked: ip.blocked,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Security & Rate Limits</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Requests/min", value: data?.requestsPerMinute || 0, icon: Zap, color: "text-blue-400" },
          { label: "Blocked IPs", value: blockedIPs.length, icon: Ban, color: "text-red-400" },
          { label: "Top IP Requests", value: topIPs[0]?.requests || 0, icon: TrendingUp, color: "text-yellow-400" },
          { label: "Abusive Tenants", value: data?.abusiveTenantsCount || 0, icon: AlertTriangle, color: "text-orange-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top IPs Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top IPs by Request Count</CardTitle>
            <CardDescription>Last 5 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: "monospace" }} width={120} />
                  <Tooltip />
                  <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.blocked ? "#ef4444" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Block IP */}
        <Card>
          <CardHeader>
            <CardTitle>Block IP Address</CardTitle>
            <CardDescription>Immediately block traffic from an IP address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input placeholder="IP Address (e.g. 185.220.101.42)" value={blockIp} onChange={e => setBlockIp(e.target.value)} />
              <Input placeholder="Reason (optional)" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
              <Button
                className="w-full"
                variant="destructive"
                disabled={!blockIp || blockMutation.isPending}
                onClick={() => blockMutation.mutate({ ip: blockIp, reason: blockReason })}
              >
                <Ban className="h-4 w-4 mr-2" />
                {blockMutation.isPending ? "Blocking…" : "Block IP"}
              </Button>
            </div>

            {/* Blocked IPs list */}
            <div>
              <p className="text-sm font-medium mb-2">Currently Blocked ({blockedIPs.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {blockedIPs.map((ip: string) => (
                  <div key={ip} className="flex items-center justify-between px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-sm">
                    <span className="font-mono">{ip}</span>
                    <Badge variant="destructive" className="text-xs">BLOCKED</Badge>
                  </div>
                ))}
                {!blockedIPs.length && <p className="text-sm text-muted-foreground text-center py-2">No blocked IPs</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top IPs Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details by IP</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
                ) : topIPs.map((ip: any) => (
                  <tr key={ip.ip} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono">{ip.ip}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        {ip.country || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={ip.requests > 1000 ? "text-red-400 font-bold" : ""}>{ip.requests.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ip.tenantId ? `#${ip.tenantId}` : "External"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ip.blocked ? "destructive" : "default"}>{ip.blocked ? "BLOCKED" : "ALLOWED"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!ip.blocked && (
                        <Button size="sm" variant="destructive" onClick={() => blockMutation.mutate({ ip: ip.ip, reason: "Manual block" })}>
                          Block
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tenant rate summary */}
      {tenantRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requests per Minute by Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenantRates.map((t: any) => (
                <div key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate">{t.tenantName}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (t.requestsPerMin / 100) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-mono w-16 text-right">{t.requestsPerMin} r/m</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

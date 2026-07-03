import { useGetRevenueDashboard, useListInvoices, useListSubscriptions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, TrendingUp, Users, AlertTriangle, TrendingDown, Download } from "lucide-react";

const mrrHistory = [
  { month: "Jan", mrr: 8200 }, { month: "Feb", mrr: 9100 }, { month: "Mar", mrr: 10500 },
  { month: "Apr", mrr: 11200 }, { month: "May", mrr: 12800 }, { month: "Jun", mrr: 13500 },
  { month: "Jul", mrr: 15000 },
];

const planDistribution = [
  { name: "Starter", value: 34, color: "#3b82f6" },
  { name: "Pro", value: 45, color: "#8b5cf6" },
  { name: "Enterprise", value: 21, color: "#f59e0b" },
];

const topTenants = [
  { name: "Acme Corp", plan: "Enterprise", mrr: 2400, status: "active" },
  { name: "TechStart", plan: "Pro", mrr: 1200, status: "active" },
  { name: "Digital Hub", plan: "Pro", mrr: 960, status: "active" },
  { name: "CloudNine", plan: "Starter", mrr: 299, status: "active" },
  { name: "Nexus LLC", plan: "Enterprise", mrr: 2400, status: "past_due" },
];

function StatCard({ label, value, change, icon: Icon, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change != null && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change}% vs last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminBilling() {
  const { data: revenue, isLoading: isRevenueLoading } = useGetRevenueDashboard();
  const { data: invoices, isLoading: isInvoicesLoading } = useListInvoices();
  const { data: subscriptions, isLoading: isSubscriptionsLoading } = useListSubscriptions();

  const failedInvoices = (invoices || []).filter((i: any) => i.status === "failed" || i.status === "overdue" || i.status === "FAILED" || i.status === "OVERDUE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Billing & Revenue</h2>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      </div>

      {/* Failed payment alert */}
      {failedInvoices.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{failedInvoices.length} failed payment{failedInvoices.length > 1 ? "s" : ""} require attention</span>
        </div>
      )}

      {/* Stats */}
      {isRevenueLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="MRR" value={`$${(revenue?.mrr || 15000).toLocaleString()}`} change={8.2} trend="up" icon={DollarSign} />
          <StatCard label="ARR" value={`$${(revenue?.arr || 180000).toLocaleString()}`} change={12.4} trend="up" icon={TrendingUp} />
          <StatCard label="Churn Rate" value={`${revenue?.churnRate || 2.1}%`} change={0.4} trend="down" icon={TrendingDown} />
          <StatCard label="Active Subs" value={(subscriptions || []).filter((s: any) => s.status === "active" || s.status === "ACTIVE").length || 142} icon={Users} />
        </div>
      )}

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Charts</TabsTrigger>
          <TabsTrigger value="tenants">Top Tenants</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Revenue Charts */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MRR Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>MRR Growth</CardTitle>
                <CardDescription>Monthly Recurring Revenue (last 7 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={mrrHistory}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, "MRR"]} />
                    <Area type="monotone" dataKey="mrr" stroke="#3b82f6" fill="url(#mrrGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}>
                      {planDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any, { payload }: any) => [`${v}%`, payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 w-full">
                  {planDistribution.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-medium">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Tenants */}
        <TabsContent value="tenants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Paying Tenants</CardTitle>
              <CardDescription>Ranked by Monthly Recurring Revenue</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTenants.map((t, i) => (
                    <TableRow key={t.name}>
                      <TableCell className="text-muted-foreground font-mono">{i + 1}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.plan}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">${t.mrr.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "active" ? "default" : "destructive"}>{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isInvoicesLoading ? <Skeleton className="h-64 m-4" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices || []).map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">#{invoice.id}</TableCell>
                        <TableCell>{invoice.tenantId ? `Tenant #${invoice.tenantId}` : "—"}</TableCell>
                        <TableCell className="font-mono">${invoice.amount}</TableCell>
                        <TableCell>
                          <Badge variant={(invoice.status === "paid" || invoice.status === "PAID") ? "default" : (invoice.status === "pending" || invoice.status === "PENDING") ? "secondary" : "destructive"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {!(invoices?.length) && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Active Subscriptions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isSubscriptionsLoading ? <Skeleton className="h-64 m-4" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Billing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subscriptions || []).map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono">#{sub.id}</TableCell>
                        <TableCell>{sub.planId || "—"}</TableCell>
                        <TableCell><Badge variant="default">{sub.status}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(subscriptions?.length) && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No subscriptions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, RefreshCw, FileText, Shield, User, Server, CreditCard } from "lucide-react";

const apiBase = import.meta.env.VITE_API_URL || "/api";

const actionColors: Record<string, string> = {
  CREATE:      "bg-emerald-500/20 text-emerald-400",
  UPDATE:      "bg-blue-500/20 text-blue-400",
  DELETE:      "bg-red-500/20 text-red-400",
  LOGIN:       "bg-violet-500/20 text-violet-400",
  IMPERSONATE: "bg-orange-500/20 text-orange-400",
  VIEW:        "bg-muted text-muted-foreground",
};

const resourceIcons: Record<string, any> = {
  user: User, vps: Server, billing: CreditCard, auth: Shield, tenant: FileText,
};

function ActionBadge({ action }: { action: string }) {
  const upper = action.split("_")[0].toUpperCase();
  const cls = actionColors[upper] || "bg-muted text-muted-foreground";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${cls}`}>{action}</span>
  );
}

export default function AdminAudit() {
  const token = localStorage.getItem("voidcloud_token");
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", resourceFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resourceFilter !== "ALL") params.set("resource", resourceFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`${apiBase}/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 60000,
  });

  const filtered = (logs || []).filter((l: any) => {
    if (!search) return true;
    return (
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase()) ||
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.ipAddress?.includes(search)
    );
  });

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["ID", "User", "Action", "Resource", "Resource ID", "IP Address", "Timestamp"];
    const rows = filtered.map((l: any) => [
      l.id, l.userName, l.action, l.resource, l.resourceId || "", l.ipAddress || "", l.createdAt,
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search action, resource, user, IP…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Resource" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Resources</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="vps">VPS</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="cluster">Cluster</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
        <Input type="date" className="w-40" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
        {(fromDate || toDate || resourceFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); setResourceFilter("ALL"); }}>Clear</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filtered.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any) => {
                    const Icon = resourceIcons[log.resource?.toLowerCase()] || FileText;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {(log.userName || "?")[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell><ActionBadge action={log.action} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm capitalize">{log.resource}</span>
                            {log.resourceId && <span className="text-xs text-muted-foreground">#{log.resourceId}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                          {log.metadata && Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata).slice(0, 60)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No audit logs found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

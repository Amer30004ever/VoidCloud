import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, RotateCcw, FileText, Cpu, MemoryStick, AlertTriangle } from "lucide-react";

const apiBase = import.meta.env.VITE_API_URL || "/api";

export default function AdminPods() {
  const token = localStorage.getItem("voidcloud_token");
  const { toast } = useToast();
  const [namespace, setNamespace] = useState("all");
  const [search, setSearch] = useState("");
  const [logDialog, setLogDialog] = useState<{ pod: string; logs: string } | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const { data: pods, isLoading, refetch } = useQuery({
    queryKey: ["pods", namespace],
    queryFn: async () => {
      const url = namespace === "all"
        ? `${apiBase}/monitoring/pods`
        : `${apiBase}/monitoring/pods?namespace=${namespace}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const filtered = (pods || []).filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.node?.toLowerCase().includes(search.toLowerCase())
  );

  const restart = async (pod: any) => {
    try {
      await fetch(`${apiBase}/monitoring/pods/${pod.namespace}/${pod.name}/restart`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Restart initiated", description: `${pod.name} is restarting…` });
      setTimeout(refetch, 3000);
    } catch {
      toast({ title: "Error", description: "Failed to restart pod", variant: "destructive" });
    }
  };

  const viewLogs = async (pod: any) => {
    setLogLoading(true);
    setLogDialog({ pod: pod.name, logs: "Loading…" });
    try {
      const res = await fetch(`${apiBase}/monitoring/pods/${pod.namespace}/${pod.name}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogDialog({ pod: pod.name, logs: data.logs });
    } catch {
      setLogDialog({ pod: pod.name, logs: "Failed to fetch logs." });
    } finally {
      setLogLoading(false);
    }
  };

  const namespaces = [...new Set((pods || []).map((p: any) => p.namespace))];
  const runningCount = filtered.filter((p: any) => p.status === "Running").length;
  const crashedCount = filtered.filter((p: any) => p.status === "CrashLoopBackOff" || p.status === "Error").length;
  const pendingCount = filtered.filter((p: any) => p.status === "Pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Kubernetes Pod Manager</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pods", value: filtered.length, color: "text-foreground" },
          { label: "Running", value: runningCount, color: "text-emerald-400" },
          { label: "CrashLooping", value: crashedCount, color: "text-red-400" },
          { label: "Pending", value: pendingCount, color: "text-yellow-400" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pods…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={namespace} onValueChange={setNamespace}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Namespace" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Namespaces</SelectItem>
            {namespaces.map((ns: any) => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pods ({filtered.length})</CardTitle>
          <CardDescription>Cluster: default-context · Namespace: {namespace === "all" ? "all" : namespace}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3">Pod Name</th>
                  <th className="px-4 py-3">Namespace</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ready</th>
                  <th className="px-4 py-3">Restarts</th>
                  <th className="px-4 py-3">Node</th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" />CPU</div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" />Mem</div>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Loading pods…</td></tr>
                ) : filtered.map((pod: any) => {
                  const isCrash = pod.status === "CrashLoopBackOff" || pod.status === "Error";
                  const isRunning = pod.status === "Running";
                  return (
                    <tr key={pod.name} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isCrash ? "bg-red-500/5" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs max-w-xs">
                        <div className="flex items-center gap-2">
                          {isCrash && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                          <span className="truncate">{pod.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{pod.namespace}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isRunning ? "default" : pod.status === "Pending" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {pod.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{pod.ready}</td>
                      <td className="px-4 py-3">
                        <span className={pod.restarts > 5 ? "text-red-400 font-bold" : pod.restarts > 2 ? "text-yellow-400" : "text-muted-foreground"}>
                          {pod.restarts}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{pod.node}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pod.cpu}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pod.memory}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => viewLogs(pod)} title="View logs">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => restart(pod)} title="Restart pod">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && !filtered.length && (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No pods found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={!!logDialog} onOpenChange={() => setLogDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">Logs: {logDialog?.pod}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <pre className="text-xs font-mono bg-black/70 text-green-400 p-4 rounded-lg whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
              {logDialog?.logs}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

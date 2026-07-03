import { useState } from "react";
import { useListClusters } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Server, Plus, Activity, HardDrive, Cpu, Zap, Network, RefreshCw } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

const OS_TEMPLATES = [
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "debian-12", label: "Debian 12 Bookworm" },
  { value: "centos-9", label: "CentOS Stream 9" },
  { value: "almalinux-9", label: "AlmaLinux 9" },
  { value: "rocky-9", label: "Rocky Linux 9" },
];

export default function AdminClusters() {
  const { data: clusters, isLoading, refetch } = useListClusters();
  const { toast } = useToast();
  const token = localStorage.getItem("voidcloud_token");

  const [showAddCluster, setShowAddCluster] = useState(false);
  const [showProvision, setShowProvision] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  // Add cluster form
  const [clusterForm, setClusterForm] = useState({ name: "", host: "", port: "8006", username: "root@pam", tokenId: "", tokenSecret: "" });

  // VPS provisioning form
  const [vpsForm, setVpsForm] = useState({
    name: "", cpu: "2", ram: "2048", disk: "20", os: "ubuntu-22.04",
    ip: "", gateway: "10.51.100.1", tenantId: "", clusterId: "",
  });

  const handleAddCluster = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/clusters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(clusterForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Cluster added", description: `${clusterForm.name} has been registered` });
      setShowAddCluster(false);
      setClusterForm({ name: "", host: "", port: "8006", username: "root@pam", tokenId: "", tokenSecret: "" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleProvisionVPS = async () => {
    setProvisioning(true);
    try {
      const res = await fetch(`${apiBase}/vps`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...vpsForm,
          cpu: parseInt(vpsForm.cpu),
          ram: parseInt(vpsForm.ram),
          disk: parseInt(vpsForm.disk),
          clusterId: vpsForm.clusterId || (selectedCluster?.id?.toString()),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Provision failed");
      toast({ title: "VPS Provisioned", description: `${vpsForm.name} is being created on Proxmox` });
      setShowProvision(false);
      setVpsForm({ name: "", cpu: "2", ram: "2048", disk: "20", os: "ubuntu-22.04", ip: "", gateway: "10.51.100.1", tenantId: "", clusterId: "" });
    } catch (err: any) {
      toast({ title: "Provision Failed", description: err.message, variant: "destructive" });
    } finally {
      setProvisioning(false);
    }
  };

  const cpuPct = (c: any) => c.usedCpu && c.totalCpu ? Math.round((c.usedCpu / c.totalCpu) * 100) : c.cpuUsage || 0;
  const ramPct = (c: any) => c.usedRam && c.totalRam ? Math.round((c.usedRam / c.totalRam) * 100) : c.ramUsage || 0;
  const diskPct = (c: any) => c.usedDisk && c.totalDisk ? Math.round((c.usedDisk / c.totalDisk) * 100) : c.diskUsage || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Proxmox Cluster Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowProvision(true)}>
            <Zap className="h-4 w-4 mr-2" /> Provision VPS
          </Button>
          <Button size="sm" onClick={() => setShowAddCluster(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Cluster
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clusters", value: clusters?.length || 0, icon: Network },
          { label: "Active Clusters", value: (clusters || []).filter((c: any) => c.status === "active" || c.status === "ACTIVE").length, icon: Activity },
          { label: "Total VMs", value: (clusters || []).reduce((s: number, c: any) => s + (c.vmCount || 0), 0), icon: Server },
          { label: "Total CPU Cores", value: (clusters || []).reduce((s: number, c: any) => s + (c.totalCpu || 0), 0), icon: Cpu },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cluster Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(clusters || []).map((cluster: any) => {
            const cpu = cpuPct(cluster);
            const ram = ramPct(cluster);
            const disk = diskPct(cluster);
            return (
              <Card key={cluster.id} className={`border ${(cluster.status === "ACTIVE" || cluster.status === "active") ? "border-emerald-500/20" : "border-red-500/30"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{cluster.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{cluster.host}:{cluster.port || 8006}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${(cluster.status === "ACTIVE" || cluster.status === "active") ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                      <Badge variant={(cluster.status === "ACTIVE" || cluster.status === "active") ? "default" : "destructive"} className="text-xs">
                        {cluster.status || "active"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "CPU", pct: cpu, icon: Cpu, color: "bg-blue-500" },
                    { label: "RAM", pct: ram, icon: Server, color: "bg-purple-500" },
                    { label: "Disk", pct: disk, icon: HardDrive, color: "bg-amber-500" },
                  ].map(({ label, pct, icon: Icon, color }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Icon className="h-3 w-3" /> {label}
                        </span>
                        <span className={pct > 80 ? "text-red-400 font-semibold" : pct > 60 ? "text-yellow-400" : ""}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>{cluster.vmCount || 0} VMs</span>
                    <span>{cluster.nodeCount || 1} nodes</span>
                  </div>
                  <Button
                    size="sm" variant="outline" className="w-full"
                    onClick={() => { setSelectedCluster(cluster); setVpsForm(f => ({ ...f, clusterId: cluster.id.toString() })); setShowProvision(true); }}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" /> Provision VPS here
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {!(clusters?.length) && (
            <div className="col-span-full text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No clusters registered yet</p>
              <p className="text-sm mt-1">Add your first Proxmox cluster to get started</p>
              <Button className="mt-4" onClick={() => setShowAddCluster(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Cluster
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Cluster Dialog */}
      <Dialog open={showAddCluster} onOpenChange={setShowAddCluster}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Proxmox Cluster</DialogTitle>
            <DialogDescription>Register a new Proxmox host to manage VPS instances from this panel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: "Cluster Name", key: "name", placeholder: "Primary Cluster" },
              { label: "Host / IP", key: "host", placeholder: "10.51.100.10" },
              { label: "Port", key: "port", placeholder: "8006" },
              { label: "Username", key: "username", placeholder: "root@pam" },
              { label: "Token ID", key: "tokenId", placeholder: "root@pam!token-name" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  placeholder={placeholder}
                  value={(clusterForm as any)[key]}
                  onChange={e => setClusterForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Token Secret</Label>
              <Input
                type="password"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={clusterForm.tokenSecret}
                onChange={e => setClusterForm(f => ({ ...f, tokenSecret: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCluster(false)}>Cancel</Button>
            <Button onClick={handleAddCluster} disabled={saving || !clusterForm.name || !clusterForm.host}>
              {saving ? "Adding…" : "Add Cluster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provision VPS Dialog */}
      <Dialog open={showProvision} onOpenChange={setShowProvision}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Provision New VPS</DialogTitle>
            <DialogDescription>
              Smart scheduler will place this VM on the best available cluster
              {selectedCluster ? ` (target: ${selectedCluster.name})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Hostname</Label>
              <Input placeholder="my-server-01" value={vpsForm.name} onChange={e => setVpsForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>CPU Cores</Label>
              <Select value={vpsForm.cpu} onValueChange={v => setVpsForm(f => ({ ...f, cpu: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1","2","4","8","16"].map(v => <SelectItem key={v} value={v}>{v} vCPU</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>RAM (MB)</Label>
              <Select value={vpsForm.ram} onValueChange={v => setVpsForm(f => ({ ...f, ram: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["1024","1 GB"],["2048","2 GB"],["4096","4 GB"],["8192","8 GB"],["16384","16 GB"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Disk (GB)</Label>
              <Select value={vpsForm.disk} onValueChange={v => setVpsForm(f => ({ ...f, disk: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["20","40","80","160","320"].map(v => <SelectItem key={v} value={v}>{v} GB</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>OS Template</Label>
              <Select value={vpsForm.os} onValueChange={v => setVpsForm(f => ({ ...f, os: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OS_TEMPLATES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>IP Address</Label>
              <Input placeholder="10.51.100.50" value={vpsForm.ip} onChange={e => setVpsForm(f => ({ ...f, ip: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Gateway</Label>
              <Input value={vpsForm.gateway} onChange={e => setVpsForm(f => ({ ...f, gateway: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tenant ID (optional)</Label>
              <Input placeholder="Assign to tenant…" value={vpsForm.tenantId} onChange={e => setVpsForm(f => ({ ...f, tenantId: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowProvision(false); setSelectedCluster(null); }}>Cancel</Button>
            <Button onClick={handleProvisionVPS} disabled={provisioning || !vpsForm.name}>
              {provisioning ? "Provisioning…" : "Provision VPS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

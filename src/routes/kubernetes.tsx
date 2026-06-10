import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { clusters, namespaces, nodes, pods, deployments } from "@/lib/mock-data";
import { Boxes, Cpu, MemoryStick, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kubernetes")({
  head: () => ({
    meta: [
      { title: "Kubernetes — Amer DevOps Portal" },
      { name: "description", content: "Clusters, nodes, pods, and deployments across your fleet." },
      { property: "og:title", content: "Kubernetes Ops — Amer DevOps Portal" },
      { property: "og:description", content: "Live cluster, node, pod and deployment views." },
    ],
  }),
  component: K8sPage,
});

function K8sPage() {
  const [clusterId, setClusterId] = useState(clusters[0].id);
  const [ns, setNs] = useState<string>("all");
  const cluster = clusters.find((c) => c.id === clusterId)!;
  const filteredPods = ns === "all" ? pods : pods.filter((p) => p.namespace === ns);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">control plane / kubernetes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Kubernetes operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inspect clusters, drill into nodes, pods, and deployments.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {clusters.map((c) => (
          <button
            key={c.id}
            onClick={() => setClusterId(c.id)}
            className={cn(
              "group flex items-center gap-2 rounded-md border px-3 py-2 text-left transition",
              clusterId === c.id
                ? "border-primary/60 bg-primary/10 shadow-glow"
                : "border-border/60 bg-card hover:border-border",
            )}
          >
            <div className={cn("h-2 w-2 rounded-full", c.status === "Healthy" ? "bg-success" : "bg-warning")} />
            <div>
              <div className="font-mono text-xs">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{c.provider} · {c.region} · {c.version}</div>
            </div>
          </button>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={Layers} label="Nodes" value={String(cluster.nodes)} sub={`${nodes.filter(n => n.status === "Ready").length} ready · ${nodes.filter(n => n.status !== "Ready").length} pressure`} />
        <MetricTile icon={Boxes} label="Pods" value={String(cluster.pods)} sub={`${pods.filter(p => p.status === "Running").length} running`} />
        <MetricTile icon={Cpu} label="Avg CPU" value="58%" sub="threshold 80%" />
        <MetricTile icon={MemoryStick} label="Avg MEM" value="67%" sub="threshold 85%" />
      </section>

      <Tabs defaultValue="pods" className="w-full">
        <TabsList className="bg-card border border-border/60">
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
        </TabsList>

        <TabsContent value="pods" className="mt-4">
          <Card className="border-border/60 p-0">
            <div className="flex items-center gap-2 border-b border-border/60 p-3">
              <span className="text-xs text-muted-foreground">Namespace:</span>
              <select
                value={ns}
                onChange={(e) => setNs(e.target.value)}
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-mono"
              >
                <option value="all">all</option>
                {namespaces.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{filteredPods.length} pods</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Restarts</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead className="text-right">CPU</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPods.map((p) => (
                  <TableRow key={p.name} className="font-mono text-xs">
                    <TableCell className="text-foreground">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.namespace}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className={cn("text-right", p.restarts > 5 && "text-destructive")}>{p.restarts}</TableCell>
                    <TableCell className="text-muted-foreground">{p.age}</TableCell>
                    <TableCell className="text-muted-foreground">{p.node}</TableCell>
                    <TableCell className="text-right">{p.cpu}</TableCell>
                    <TableCell className="text-right">{p.mem}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="mt-4">
          <Card className="border-border/60 p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Deployment</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Ready</TableHead>
                  <TableHead>Up-to-date</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.map((d) => {
                  const [ready, total] = d.ready.split("/").map(Number);
                  const healthy = ready === total;
                  return (
                    <TableRow key={d.name} className="font-mono text-xs">
                      <TableCell className="text-foreground">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.namespace}</TableCell>
                      <TableCell><StatusBadge status={healthy ? "Ready" : "Degraded"} /></TableCell>
                      <TableCell>{d.upToDate}</TableCell>
                      <TableCell>{d.available}</TableCell>
                      <TableCell className="text-muted-foreground">{d.age}</TableCell>
                      <TableCell className="text-accent">{d.image}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="nodes" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nodes.map((n) => (
              <Card key={n.name} className="border-border/60 bg-gradient-surface p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm">{n.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{n.role}</p>
                  </div>
                  <StatusBadge status={n.status} />
                </div>
                <div className="mt-4 space-y-2">
                  <Bar label="CPU" value={n.cpu} />
                  <Bar label="MEM" value={n.mem} />
                </div>
                <div className="mt-3 text-[11px] font-mono text-muted-foreground">{n.pods} pods</div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, sub }: { icon: typeof Cpu; label: string; value: string; sub: string }) {
  return (
    <Card className="border-border/60 bg-gradient-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const tone = value > 85 ? "bg-destructive" : value > 70 ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>{label}</span><span>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

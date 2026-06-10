import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { pipelines } from "@/lib/mock-data";
import { GitBranch, GitCommit, User, Clock, ChevronRight, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipelines")({
  head: () => ({
    meta: [
      { title: "Pipelines — Amer DevOps Portal" },
      { name: "description", content: "CI/CD pipeline runs, stages, and live logs across services." },
      { property: "og:title", content: "CI/CD Pipelines — Amer DevOps Portal" },
      { property: "og:description", content: "Inspect pipeline stages, durations, and outcomes." },
    ],
  }),
  component: PipelinesPage,
});

function PipelinesPage() {
  const [selectedId, setSelectedId] = useState(pipelines[1].id);
  const selected = pipelines.find((p) => p.id === selectedId)!;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">control plane / pipelines</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">CI/CD pipelines</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track every run from commit to deploy.</p>
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Today" value="142" />
          <Stat label="Success" value="98.6%" tone="success" />
          <Stat label="Avg time" value="6m 21s" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <Card className="border-border/60 p-0">
          <div className="border-b border-border/60 p-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Recent runs · {pipelines.length}
          </div>
          <ul className="divide-y divide-border/60">
            {pipelines.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/5",
                    selectedId === p.id && "bg-primary/5 border-l-2 border-primary",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{p.branch}</span>
                      <span className="flex items-center gap-1"><GitCommit className="h-3 w-3" />{p.commit}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.author}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.duration}</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-gradient-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selected.id}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{selected.branch}</span>
                  <span className="flex items-center gap-1"><GitCommit className="h-3 w-3" />{selected.commit}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{selected.author}</span>
                  <span>Started {selected.started}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs hover:border-primary/60">
                  <RotateCcw className="h-3 w-3" /> Re-run
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow">
                  <Play className="h-3 w-3" /> Trigger
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-stretch gap-1 overflow-x-auto pb-1">
              {selected.stages.map((s, i) => (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  <div className={cn(
                    "min-w-[140px] rounded-md border p-3",
                    s.status === "success" && "border-success/40 bg-success/5",
                    s.status === "running" && "border-info/40 bg-info/5",
                    s.status === "failed" && "border-destructive/40 bg-destructive/5",
                    s.status === "queued" && "border-border/60 bg-muted/30",
                    s.status === "cancelled" && "border-border/60 bg-muted/20 opacity-60",
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{s.name}</span>
                      <span className={cn("h-1.5 w-1.5 rounded-full",
                        s.status === "success" && "bg-success",
                        s.status === "running" && "bg-info animate-pulse",
                        s.status === "failed" && "bg-destructive",
                        s.status === "queued" && "bg-muted-foreground",
                        s.status === "cancelled" && "bg-muted-foreground",
                      )} />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{s.duration}</div>
                  </div>
                  {i < selected.stages.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 p-0">
            <div className="flex items-center justify-between border-b border-border/60 p-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Live log output</span>
              <span className="text-[11px] font-mono text-success">● streaming</span>
            </div>
            <pre className="max-h-80 overflow-auto bg-background/40 p-4 font-mono text-[11px] leading-relaxed">
{`[14:02:11] ▶ Stage "Build Image" started
[14:02:11] $ docker buildx build --platform linux/amd64 -t ${selected.name.split(" / ")[0]}:${selected.commit} .
[14:02:12] #1 [internal] load build definition from Dockerfile
[14:02:12] #1 transferring dockerfile: 1.42kB done
[14:02:13] #2 [internal] load .dockerignore
[14:02:14] #3 [internal] load metadata for node:20-alpine
[14:02:16] #4 [base 1/4] FROM node:20-alpine@sha256:9aafb1...
[14:02:19] #5 [base 2/4] WORKDIR /app
[14:02:19] #6 [base 3/4] COPY package*.json ./
[14:02:21] #7 [base 4/4] RUN npm ci --omit=dev
[14:02:38]   added 412 packages in 17s
[14:02:39] #8 [build 1/2] COPY . .
[14:02:40] #9 [build 2/2] RUN npm run build
[14:02:56]   ✓ built in 14.82s
[14:02:57] #10 exporting to image
[14:03:01]   pushing ${selected.name.split(" / ")[0]}:${selected.commit} → registry.amer.dev
[14:03:04]   layers: 8 pushed, 3 cached
[14:03:05] ✓ image pushed (84.2 MB)
[14:03:05] ▶ Stage "Scan" queued`}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold", tone === "success" && "text-success")}>{value}</div>
    </div>
  );
}

"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Server, Terminal, Shield, HardDrive, Layers, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Package } from "lucide-react";
import { useState } from "react";

export default function ClusterPage() {
  const [activeTab, setActiveTab] = useState<"nodes" | "pods" | "quotas" | "network-policies" | "storage" | "helm">("nodes");
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "nodes" as const, label: "Nodes", icon: Server },
    { id: "pods" as const, label: "Pods", icon: Layers },
    { id: "quotas" as const, label: "Resource Quotas", icon: HardDrive },
    { id: "network-policies" as const, label: "Network Policies", icon: Shield },
    { id: "storage" as const, label: "Storage", icon: HardDrive },
    { id: "helm" as const, label: "Helm Charts", icon: Package },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Cluster Management"
        description="Manage your Kubernetes cluster resources"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "nodes" && <NodesTab isLoading={isLoading} />}
      {activeTab === "pods" && <PodsTab isLoading={isLoading} />}
      {activeTab === "quotas" && <QuotasTab isLoading={isLoading} />}
      {activeTab === "network-policies" && <NetworkPoliciesTab isLoading={isLoading} />}
      {activeTab === "storage" && <StorageTab isLoading={isLoading} />}
      {activeTab === "helm" && <HelmChartsTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function NodesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Cluster Nodes</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">master-node-1</p>
                  <p className="text-xs text-muted-foreground">Control Plane • 192.168.1.10</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-500">Ready</p>
                <p className="text-xs text-muted-foreground">v1.28.0</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">worker-node-1</p>
                  <p className="text-xs text-muted-foreground">Worker • 192.168.1.11</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-500">Ready</p>
                <p className="text-xs text-muted-foreground">v1.28.0</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">worker-node-2</p>
                  <p className="text-xs text-muted-foreground">Worker • 192.168.1.12</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-yellow-500">NotReady</p>
                <p className="text-xs text-muted-foreground">v1.28.0</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Terminal className="h-4 w-4 text-primary" />
          Cluster Terminal
        </h3>
        <div className="rounded-lg bg-black p-4 font-mono text-sm">
          <p className="text-green-400">$ kubectl get nodes</p>
          <p className="text-muted-foreground">NAME            STATUS   ROLES           AGE   VERSION</p>
          <p className="text-muted-foreground">master-node-1    Ready    control-plane   30d   v1.28.0</p>
          <p className="text-muted-foreground">worker-node-1    Ready    worker          30d   v1.28.0</p>
          <p className="text-muted-foreground">worker-node-2    NotReady worker          15d   v1.28.0</p>
          <p className="text-green-400 mt-2">$ _</p>
        </div>
      </div>
    </div>
  );
}

function PodsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Cluster Pods</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">nginx-deployment-7d8c9b7f9</p>
                <p className="text-xs text-muted-foreground">default • 1/1 Running</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-500">Running</p>
              <p className="text-xs text-muted-foreground">2d</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">redis-master-0</p>
                <p className="text-xs text-muted-foreground">default • 1/1 Running</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-500">Running</p>
              <p className="text-xs text-muted-foreground">5d</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">postgres-deployment-5f8c9b7f9</p>
                <p className="text-xs text-muted-foreground">default • 0/1 CrashLoopBackOff</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-500">CrashLoopBackOff</p>
              <p className="text-xs text-muted-foreground">1h</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuotasTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Resource Quotas</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">default-quota</p>
              <p className="text-xs text-muted-foreground">default</p>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Requests:</span>
                <span className="text-foreground">2 / 4 cores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Requests:</span>
                <span className="text-foreground">4Gi / 8Gi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pods:</span>
                <span className="text-foreground">5 / 10</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">production-quota</p>
              <p className="text-xs text-muted-foreground">production</p>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Requests:</span>
                <span className="text-foreground">8 / 16 cores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Requests:</span>
                <span className="text-foreground">16Gi / 32Gi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pods:</span>
                <span className="text-foreground">20 / 50</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NetworkPoliciesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Network Policies</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">deny-all-ingress</p>
              <p className="text-xs text-muted-foreground">default</p>
            </div>
            <p className="text-xs text-muted-foreground">Denies all ingress traffic to pods in default namespace</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">allow-nginx-ingress</p>
              <p className="text-xs text-muted-foreground">default</p>
            </div>
            <p className="text-xs text-muted-foreground">Allows ingress traffic to nginx pods from specific sources</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">allow-database-egress</p>
              <p className="text-xs text-muted-foreground">production</p>
            </div>
            <p className="text-xs text-muted-foreground">Allows egress traffic from production pods to database</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StorageTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Storage Classes</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">standard</p>
              <p className="text-xs text-green-500">Default</p>
            </div>
            <p className="text-xs text-muted-foreground">kubernetes.io/aws-ebs • gp2</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">fast-ssd</p>
              <p className="text-xs text-muted-foreground">-</p>
            </div>
            <p className="text-xs text-muted-foreground">kubernetes.io/aws-ebs • io1</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">nfs-storage</p>
              <p className="text-xs text-muted-foreground">-</p>
            </div>
            <p className="text-xs text-muted-foreground">nfs • nfs</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HelmChartsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Helm Charts</h3>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          <Package className="h-4 w-4" />
          Install Chart
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">nginx-ingress</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Deployed</span>
                </div>
                <p className="text-xs text-muted-foreground">Version 1.12.2 • Namespace: ingress-nginx</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">ingress</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">networking</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">prometheus</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Deployed</span>
                </div>
                <p className="text-xs text-muted-foreground">Version 25.8.0 • Namespace: monitoring</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">monitoring</span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">metrics</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-foreground">redis-cluster</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Not Deployed</span>
                </div>
                <p className="text-xs text-muted-foreground">Version 18.5.1 • Available for deployment</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Install
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">database</span>
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">cache</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { Loader2, Plus, Server, Layers, FileText, Lock, Scale, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { infrastructureApi, Deployment } from "@/features/vps/infrastructure";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type ResourceType = "deployments" | "services" | "configmaps" | "secrets";

export default function InfrastructurePage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>("default");
  const [activeTab, setActiveTab] = useState<ResourceType>("deployments");
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: async () => {
      const response = await infrastructureApi.getNamespaces();
      return response.data;
    },
  });

  const { data: deployments, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments', selectedNamespace],
    queryFn: async () => {
      const response = await infrastructureApi.getDeployments(selectedNamespace);
      return response.data;
    },
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', selectedNamespace],
    queryFn: async () => {
      const response = await infrastructureApi.getServices(selectedNamespace);
      return response.data;
    },
    enabled: activeTab === 'services',
  });

  const { data: configmaps, isLoading: configmapsLoading } = useQuery({
    queryKey: ['configmaps', selectedNamespace],
    queryFn: async () => {
      const response = await infrastructureApi.getConfigMaps(selectedNamespace);
      return response.data;
    },
    enabled: activeTab === 'configmaps',
  });

  const { data: secrets, isLoading: secretsLoading } = useQuery({
    queryKey: ['secrets', selectedNamespace],
    queryFn: async () => {
      const response = await infrastructureApi.getSecrets(selectedNamespace);
      return response.data;
    },
    enabled: activeTab === 'secrets',
  });

  const scaleMutation = useMutation({
    mutationFn: async ({ namespace, name, replicas }: { namespace: string; name: string; replicas: number }) => {
      return infrastructureApi.updateDeployment(namespace, name, { replicas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setShowScaleModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ namespace, name }: { namespace: string; name: string }) => {
      return infrastructureApi.deleteDeployment(namespace, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const tabs = [
    { id: 'deployments' as ResourceType, label: 'Deployments', icon: Server },
    { id: 'services' as ResourceType, label: 'Services', icon: Layers },
    { id: 'configmaps' as ResourceType, label: 'ConfigMaps', icon: FileText },
    { id: 'secrets' as ResourceType, label: 'Secrets', icon: Lock },
  ];

  const renderDeployments = () => {
    if (deploymentsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!deployments || deployments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Server className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No deployments found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {deployments.map((deployment) => {
          const isExpanded = expandedItems.has(deployment.name);
          return (
            <div key={deployment.name} className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleExpand(deployment.name)}
                    className="rounded-lg p-2 hover:bg-muted"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-foreground">{deployment.name}</p>
                    <p className="text-xs text-muted-foreground">{deployment.namespace} • {deployment.image}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Replicas</p>
                    <p className="text-sm font-medium text-foreground">{deployment.readyReplicas}/{deployment.replicas}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDeployment(deployment);
                      setShowScaleModal(true);
                    }}
                    className="rounded-lg p-2 hover:bg-muted"
                    title="Scale"
                  >
                    <Scale className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete deployment ${deployment.name}?`)) {
                        deleteMutation.mutate({ namespace: deployment.namespace, name: deployment.name });
                      }
                    }}
                    className="rounded-lg p-2 hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm text-foreground">{formatDate(deployment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Image</p>
                      <p className="text-sm text-foreground">{deployment.image}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Labels</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(deployment.labels).map(([key, value]) => (
                          <span key={key} className="rounded-full bg-muted px-2 py-1 text-xs">
                            {key}={value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderServices = () => {
    if (servicesLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!services || services.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No services found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.namespace} • {service.type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Cluster IP</p>
                <p className="text-sm text-foreground">{service.clusterIP}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderConfigMaps = () => {
    if (configmapsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!configmaps || configmaps.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No configmaps found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {configmaps.map((cm) => (
          <div key={cm.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{cm.name}</p>
                <p className="text-xs text-muted-foreground">{cm.namespace} • {cm.keys.length} keys</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="text-sm text-foreground">{(cm.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSecrets = () => {
    if (secretsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!secrets || secrets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No secrets found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {secrets.map((secret) => (
          <div key={secret.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{secret.name}</p>
                <p className="text-xs text-muted-foreground">{secret.namespace} • {secret.type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Keys</p>
                <p className="text-sm text-foreground">{secret.keys.length}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Infrastructure"
        description="Resource Management Hub - Manage your Kubernetes resources"
        action={
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Deploy
          </button>
        }
      />

      {/* Namespace selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-foreground">Namespace</label>
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {namespacesLoading ? (
            <option>Loading...</option>
          ) : namespaces && namespaces.length > 0 ? (
            namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))
          ) : (
            <option value="default">default</option>
          )}
        </select>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Content */}
      <div>
        {activeTab === 'deployments' && renderDeployments()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'configmaps' && renderConfigMaps()}
        {activeTab === 'secrets' && renderSecrets()}
      </div>

      {/* Scale Modal */}
      {showScaleModal && selectedDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Scale Deployment</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Scale {selectedDeployment.name} from {selectedDeployment.replicas} replicas
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-foreground">Replicas</label>
              <input
                type="number"
                min="0"
                defaultValue={selectedDeployment.replicas}
                id="scale-replicas"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowScaleModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const replicas = parseInt((document.getElementById('scale-replicas') as HTMLInputElement).value);
                  scaleMutation.mutate({
                    namespace: selectedDeployment.namespace,
                    name: selectedDeployment.name,
                    replicas,
                  });
                }}
                disabled={scaleMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {scaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Deploy from Docker Image</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Namespace</label>
                <select
                  defaultValue={selectedNamespace}
                  id="deploy-namespace"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {namespaces && namespaces.map((ns) => (
                    <option key={ns} value={ns}>
                      {ns}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  id="deploy-name"
                  placeholder="my-app"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Docker Image</label>
                <input
                  type="text"
                  id="deploy-image"
                  placeholder="nginx:latest"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Replicas</label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  id="deploy-replicas"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Port</label>
                <input
                  type="number"
                  min="1"
                  defaultValue="3000"
                  id="deploy-port"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowDeployModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const namespace = (document.getElementById('deploy-namespace') as HTMLSelectElement).value;
                  const name = (document.getElementById('deploy-name') as HTMLInputElement).value;
                  const image = (document.getElementById('deploy-image') as HTMLInputElement).value;
                  const replicas = parseInt((document.getElementById('deploy-replicas') as HTMLInputElement).value);
                  const port = parseInt((document.getElementById('deploy-port') as HTMLInputElement).value);

                  await infrastructureApi.deployFromImage({ namespace, name, image, replicas, port });
                  queryClient.invalidateQueries({ queryKey: ['deployments'] });
                  setShowDeployModal(false);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
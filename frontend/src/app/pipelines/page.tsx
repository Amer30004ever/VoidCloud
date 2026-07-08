"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2, GitBranch, Plus, Play, RotateCcw, Settings, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { pipelinesApi, TriggerPipelineRequest, CreateCustomPipelineRequest } from "@/lib/pipelines";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PipelinesPage() {
  const [activeTab, setActiveTab] = useState<"history" | "workflows" | "custom">("history");
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [githubOwner, setGithubOwner] = useState<string>("");
  const [githubRepo, setGithubRepo] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: deploymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['deployment-history'],
    queryFn: async () => {
      const response = await pipelinesApi.getDeploymentHistory(20);
      return response.data.items;
    },
    enabled: activeTab === 'history',
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', githubOwner, githubRepo],
    queryFn: async () => {
      const response = await pipelinesApi.getRecentWorkflows(githubOwner, githubRepo, 10);
      return response.data.workflows;
    },
    enabled: activeTab === 'workflows' && !!githubOwner && !!githubRepo,
  });

  const triggerMutation = useMutation({
    mutationFn: async (data: TriggerPipelineRequest) => {
      return pipelinesApi.triggerPipeline(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-history'] });
      setShowTriggerModal(false);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return pipelinesApi.rollbackDeployment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-history'] });
    },
  });

  const customPipelineMutation = useMutation({
    mutationFn: async (data: CreateCustomPipelineRequest) => {
      return pipelinesApi.createCustomPipeline(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-history'] });
      setShowCustomModal(false);
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'failed': return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'pending': case 'triggered': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'running': case 'in_progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': case 'triggered': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'running': case 'in_progress': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <GitBranch className="h-4 w-4" />;
    }
  };

  const renderDeploymentHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!deploymentHistory || deploymentHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No deployment history</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {deploymentHistory.map((deployment) => {
          const isExpanded = expandedItems.has(deployment.id);
          return (
            <div key={deployment.id} className={`rounded-xl border ${getStatusColor(deployment.status)} bg-card`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleExpand(deployment.id)}
                    className="rounded-lg p-2 hover:bg-muted"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-foreground">{deployment.repo}</p>
                    <p className="text-xs text-muted-foreground">
                      {deployment.provider} • {deployment.ref || 'main'} • {deployment.initiatedBy || 'system'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(deployment.status)}
                      <p className="text-sm font-medium text-foreground capitalize">{deployment.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">{formatDate(deployment.createdAt)}</p>
                  </div>
                  {deployment.status === 'success' && (
                    <button
                      onClick={() => {
                        if (confirm(`Rollback to deployment ${deployment.id}?`)) {
                          rollbackMutation.mutate(deployment.id);
                        }
                      }}
                      disabled={rollbackMutation.isPending}
                      className="rounded-lg p-2 hover:bg-muted"
                      title="Rollback"
                    >
                      <RotateCcw className="h-4 w-4 text-amber-500" />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Provider</p>
                      <p className="text-sm text-foreground capitalize">{deployment.provider}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Repository</p>
                      <p className="text-sm text-foreground">{deployment.owner}/{deployment.repo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Workflow</p>
                      <p className="text-sm text-foreground">{deployment.workflowId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <p className="text-sm text-foreground">{deployment.ref || 'main'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Started At</p>
                      <p className="text-sm text-foreground">{deployment.startedAt ? formatDate(deployment.startedAt) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Finished At</p>
                      <p className="text-sm text-foreground">{deployment.finishedAt ? formatDate(deployment.finishedAt) : 'N/A'}</p>
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

  const renderWorkflows = () => {
    if (!githubOwner || !githubRepo) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Enter GitHub owner and repo to view workflows</p>
        </div>
      );
    }

    if (workflowsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!workflows || workflows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No workflow runs found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <div key={workflow.id} className={`rounded-xl border ${getStatusColor(workflow.status)} bg-card p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{workflow.name}</p>
                <p className="text-xs text-muted-foreground">
                  {workflow.head_branch} • {workflow.head_commit?.message?.substring(0, 50)}...
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(workflow.status)}
                    <p className="text-sm font-medium text-foreground capitalize">{workflow.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{formatDate(workflow.created_at)}</p>
                </div>
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
        title="Pipelines"
        description="Trigger CI/CD runs, view workflow status, rollback deployments, and define custom pipelines"
        action={
          <button
            onClick={() => setShowTriggerModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            Trigger Pipeline
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Deployment History
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'workflows'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitBranch className="h-4 w-4" />
          GitHub Workflows
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'custom'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Custom Pipelines
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'history' && renderDeploymentHistory()}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-foreground">GitHub Owner</label>
                <input
                  type="text"
                  value={githubOwner}
                  onChange={(e) => setGithubOwner(e.target.value)}
                  placeholder="owner"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-foreground">GitHub Repository</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="repo"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            {renderWorkflows()}
          </div>
        )}
        {activeTab === 'custom' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Custom pipelines feature coming soon</p>
            <button
              onClick={() => setShowCustomModal(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Custom Pipeline
            </button>
          </div>
        )}
      </div>

      {/* Trigger Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Trigger Pipeline</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Provider</label>
                <select
                  id="trigger-provider"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Owner</label>
                <input
                  type="text"
                  id="trigger-owner"
                  placeholder="owner"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Repository</label>
                <input
                  type="text"
                  id="trigger-repo"
                  placeholder="repo"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Workflow ID</label>
                <input
                  type="text"
                  id="trigger-workflow"
                  placeholder="workflow.yml"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Branch</label>
                <input
                  type="text"
                  id="trigger-ref"
                  placeholder="main"
                  defaultValue="main"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTriggerModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const provider = (document.getElementById('trigger-provider') as HTMLSelectElement).value;
                  const owner = (document.getElementById('trigger-owner') as HTMLInputElement).value;
                  const repo = (document.getElementById('trigger-repo') as HTMLInputElement).value;
                  const workflowId = (document.getElementById('trigger-workflow') as HTMLInputElement).value;
                  const ref = (document.getElementById('trigger-ref') as HTMLInputElement).value;

                  await triggerMutation.mutate({ provider, owner, repo, workflowId, ref, initiatedBy: 'user' });
                }}
                disabled={triggerMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {triggerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Trigger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Pipeline Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Create Custom Pipeline</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  id="custom-name"
                  placeholder="My Custom Pipeline"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  id="custom-description"
                  placeholder="Pipeline description"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Provider</label>
                <select
                  id="custom-provider"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Repository</label>
                <input
                  type="text"
                  id="custom-repo"
                  placeholder="owner/repo"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Workflow ID</label>
                <input
                  type="text"
                  id="custom-workflow"
                  placeholder="workflow.yml"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const name = (document.getElementById('custom-name') as HTMLInputElement).value;
                  const description = (document.getElementById('custom-description') as HTMLTextAreaElement).value;
                  const provider = (document.getElementById('custom-provider') as HTMLSelectElement).value;
                  const repo = (document.getElementById('custom-repo') as HTMLInputElement).value;
                  const workflowId = (document.getElementById('custom-workflow') as HTMLInputElement).value;

                  await customPipelineMutation.mutate({ name, description, provider, repo, workflowId });
                }}
                disabled={customPipelineMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {customPipelineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}